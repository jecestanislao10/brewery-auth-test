const config = require('./dbconfig');
const {DataTypes} =  require('sequelize');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const {ExtractJwt, Strategy} = require('passport-jwt');
const secretKey = 'supersecretkey';
const Crypto = require('crypto');

let signupCode, repository, payloadId, forgotPasswordCode, mfaCode, loginId;

exports.configure = async (configData) => {
        try {            
            const db = await config(configData.database);
            const attributes = () => {
              const columns = {
                // Model attributes are defined here
                id:{
                  allowNull: false,
                  primaryKey: true,
                  type: DataTypes.UUID,
                  defaultValue: DataTypes.UUIDV4
                },
                username: {
                  type: DataTypes.STRING,
                  allowNull: false
                },
                password: {
                  type: DataTypes.STRING,
                  allowNull: false
                },
                MFA: {
                  type: DataTypes.BOOLEAN
                },
                registered: {
                  type: DataTypes.BOOLEAN
                }
              };
              if(configData.attributes.includes('Email'.toLowerCase())) {
                columns.email = {
                    type: DataTypes.STRING,
                    allowNull: false
                }
              }
              return (columns)
            }
            repository = await db.define('clients', attributes(), {
                // Other model options go here
              });
            await repository.sync();

        } catch(err){
            throw err;
        }
    }

exports.signup = (body) => {
        return new Promise((resolve, reject) => {
            repository.create(body , {raw: true}).then(user => {
              signupCode = {
                clientId: user.id,
                code: Math.random()
              }
              const response = {
                clientId: user.id,
                password: user.password,
                confirmationCode: signupCode.code
              }
// must send a confirmation code either email, or mobile
              resolve(response)
            })
            .catch(err => reject(err));        
        })
    }

exports.login = (body) => {
  const { clientId, clientSecret } = body;

  return new Promise((resolve, reject) => {
    repository.findByPk(clientId, {raw: true}).then(user => {
      if(user.password == clientSecret){
        if(user.registered === 1){
          loginId= user.id;
          const response = {
            clientId: user.id,
            message: 'Use loginNewPasswordRequired function'
          };
          resolve(response);
        }
        if (user.MFA === 1){
          mfaCode = {
            clientId: user.id,
            code: Math.random()
          }
          resolve(mfaCode);
        }
        else {
          const token = jwt.sign({clientId: user.id}, secretKey, {
            expiresIn: '1h'
          })
          const refreshToken = jwt.sign({accessToken: token}, secretKey, {
            expiresIn: '24h'
          })
          const response = {
            clientId: user.id,
            token: token,
            refreshToken: refreshToken
          }
          resolve(response);
        }
      }
    }).catch(err => reject(err));
  })
}

exports.loginNewPasswordRequired = (clientId, newPassword) => {
  return new Promise((resolve, reject) => {
    if(loginId !== clientId){
      reject(null);
    }
    repository.findByPk(clientId).then(user => {
      user.update({registered: 0, password: newPassword});
    }).then( result => {
      const token = jwt.sign({clientId: clientId}, secretKey, {
        expiresIn: '1h'
      })
      const refreshToken = jwt.sign({accessToken: token}, secretKey, {
        expiresIn: '24h'
      })
      const response = {
        clientId: clientId,
        token: token,
        refreshToken: refreshToken
      }
      resolve(response);
    }).catch(err => resolve(err));
  })

}

exports.loginMfa = (clientId, code) => {
    return new Promise((resolve, reject) => {
      if(mfaCode.clientId === clientId && mfaCode.code === code){
        const token = jwt.sign({clientId: clientId}, secretKey, {
          expiresIn: '1h'
        })
        const refreshToken = jwt.sign({accessToken: token}, secretKey, {
          expiresIn: '24h'
        })
        const response = {
          clientId: clientId,
          token: token,
          refreshToken: refreshToken
        }
        resolve(response);
      }else{
        reject('invalid code');
      }
    })
}

exports.register = (body) => {
      const { email, username } = body;
      const password = Crypto.createHash('SHA256').update(new Date().getTime() + username).digest('hex');
      return new Promise((resolve, reject) => {
          repository.create({
              email: email,
              password: password,
              username: username,
              MFA: false,
              registered: true
          }, {raw: true}).then(user => {
            const response = {
              clientId: user.id,
              password: user.password
            }
//must send an email for password reset link
            resolve(response)
          })
          .catch(err => reject(err));        
      })
  }

exports.signupConfirm = (body) => {

    const { clientId, confirmationCode } = body;

    return new Promise((resolve, reject) => {
      if (signupCode.clientId !== clientId || signupCode.code !== confirmationCode){
        reject(null);
      }
      repository.findByPk(clientId, {raw: true}).then(user => {
        resolve(user);
      }).catch(err => reject(err.message));
    });
}

exports.sigupResend = (body) => {
    const { clientId } = body;

    return new Promise((resolve, reject) => {
      repository.findByPk(clientId).then(user => {
        signupCode = {
          clientId: clientId,
          code: Math.random()
        }
// sends new confirmation code, through sms or email,
        const response = {
          clientId: signupCode.clientId,
          confirmationCode: signupCode.code
        }
        resolve(response);
      }).catch(err => reject(err.message));
    });
}

exports.passwordForgot = (clientId) => {

  return new Promise((resolve, reject) => {
    repository.findByPk(clientId).then(result => {
      forgotPasswordCode = {
        clientId: clientId,
        code: Math.random()
      }

      // must send an email for password link
      resolve(forgotPasswordCode);
    }).catch(err => reject(err));
  })

};

exports.passwordReset = (clientId, clientCode, newPassword) => {
  return new Promise ((resolve, reject) => {
    if (clientId === forgotPasswordCode.clientId && clientCode === forgotPasswordCode.code){
      repository.update({password: newPassword}, {where: { id: clientId}}).then(result => {
        resolve(result);
      }).catch(err => reject(err));
    }else{
      reject(null);
    }
  })
}

exports.initialize = ()  => {
  return passport.initialize();
}

exports.authenticate = () => {
  {
    return [
      (req, res, next) => {
  
        const jwtOptions = {};
        jwtOptions.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
        jwtOptions.secretOrKey = secretKey;  
        
  
        passport.use(new Strategy(jwtOptions, (jwt_payload, done) => {
          console.log('payload', jwt_payload);
          repository.findByPk(jwt_payload.clientId, {raw: true})
            .then((user) => {
              done(null, user);
            })
            .catch((error) =>  done(error, null));
        }));
    
        passport.serializeUser(function (user, done) {
          done(null, user);
        });
    
        passport.deserializeUser(function (user, done) {
          done(null, user);
        });
    
        return passport.authenticate('jwt', (err, user, info)=> {
          if(!user){
            return res.status(401).json({
              status: 401,
              message: 'Not Authenticated'
            });
          }
          payloadId = user.id;
          return next();
        })(req, res, next);
      }
    ];
  };
  
}

exports.profile = () => {
    return new Promise((resolve, reject) => {
      repository.findByPk(payloadId, {raw: true}).then(user => {
        const response = {
          username: user.username,
          email: user.email,
          password: user.password
        }
        resolve(response);
      }).catch(err => reject(err));
    });
}


exports.profileEdit = (body) => {
    return new Promise((resolve, reject) => {
      repository.update(body, {returning: true,
        plain: true,
        where: {
        id: payloadId
      }
    }).then(user => {
          resolve(body);
      }).catch(err => reject(err));
    })
};

exports.passwordChange = (oldPassword, newPassword) => {
  return new Promise((resolve, reject) => {
    repository.findByPk(payloadId).then(user => {
      if(user.dataValues.password === oldPassword && user.dataValues.password !== newPassword){
        user.update({password: newPassword});
      }else{
        reject(null);
      }
    }).then(result => {
      resolve({
        newPassword: newPassword
      });
    }).catch(err => reject(err));
  })
}

exports.deleteUser = (body) => {
  const { clientId, clientSecret } = body;
  
  return new Promise((resolve, reject) => {
      repository.findByPk(clientId).then(user => {
        if(user.password === clientSecret){
          user.destroy();
        }
      }).then(user => {
          const response = {
            status: 'deleted',
            clientId: clientId
          }
          resolve(response);
      }).catch(err => reject(err));
  })
}

exports.getMfa = () => {
  return new Promise((resolve, reject) => {
    repository.findByPk(payloadId, {raw: true}).then( user => {
      const response = {
        MFA: user.MFA
      }
      resolve(response);
    }).catch(err => reject(err));
  })
}

exports.setMfa = (body) => {
  return new Promise((resolve, reject) => {
    if (body.mfa !== true && body.mfa !== false){
      reject('parameter must be boolean(true/false)');
    }
    repository.findByPk(payloadId).then( user => {
      user.update({mfa: body.mfa});
    }).then(result => {
      resolve(body);
    })
    .catch(err => reject(err));
  })
}
// signup(body) {
    //     const { username, password, attributes } = body;
    //     const attributesList = [];
    
    //     if (attributes) {
    //       attributes.forEach((item) => {
    //         const attribute = new AmazonCognitoIdentity.CognitoUserAttribute(item);
    //         attributesList.push(attribute);
    //       });
    //     }
    
    //     return new Promise((resolve, reject) => {
    //       this.userPool.signUp(username, password, attributesList, null, (err, res) => {
    //         if (err) {
    //           reject(err);
    //         } else {
    //           const response = {
    //             clientId: res.userSub,
    //             clientSecret: password,
    //           };
    //           resolve(response);
    //         }
    //       });
    //     });
    //   }