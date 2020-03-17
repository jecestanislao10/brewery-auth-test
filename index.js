const config = require('./dbconfig');
const {DataTypes} =  require('sequelize');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const {ExtractJwt, Strategy} = require('passport-jwt');
const secretKey = 'supersecretkey';
const Crypto = require('crypto');

let code, repository, payloadId;

exports.configure = async (configData) => {
        try {            
            const db = await config(configData);
            repository = await db.define('clients', {
                // Model attributes are defined here
                id:{
                  allowNull: false,
                  primaryKey: true,
                  type: DataTypes.UUID,
                  defaultValue: DataTypes.UUIDV4
                },
                email: {
                  type: DataTypes.STRING,
                  allowNull: false
                },
                username: {
                  type: DataTypes.STRING,
                  allowNull: false
                },
                password: {
                  type: DataTypes.STRING,
                  allowNull: false
                }
              }, {
                // Other model options go here
              });
            await repository.sync();

        } catch(err){
            throw err;
        }
    }

exports.signup = (body) => {
        const { email, username, password } = body;
        return new Promise((resolve, reject) => {
            repository.create({
                email: email,
                password: password,
                username: username
            }).then(user => {
              code = Math.random();
              const response = {
                clientId: user.dataValues.id,
                password: user.dataValues.password,
                confirmationCode: code
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
    repository.findByPk(clientId).then(user => {
      if(user.dataValues.password == clientSecret){
        const token = jwt.sign({clientId: user.dataValues.id}, secretKey, {
          expiresIn: '1h'
        })
        const refreshToken = jwt.sign({accessToken: token}, secretKey, {
          expiresIn: '24h'
        })
        const response = {
          clientId: user.dataValues.id,
          token: token,
          refreshToken: refreshToken
        }
        resolve(response);
      }
    }).catch(err => reject(err));
  })
}

exports.register = (body) => {
      const { email, username } = body;
      const password = Crypto.createHash('SHA256').update(new Date().getTime() + username).digest('hex');
      return new Promise((resolve, reject) => {
          repository.create({
              email: email,
              password: password,
              username: username
          }).then(user => {
            const response = {
              clientId: user.dataValues.id,
              password: user.dataValues.password
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
      repository.findByPk(clientId).then(user => {
        if (confirmationCode === code) {
          resolve(user.dataValues);
        }else {
          const error = new Error();
          error.message = 'Wrong code';
          throw error;
        }
        
      }).catch(err => reject(err.message));
    });
}

exports.sigupResend = (body) => {
    const { clientId } = body;

    return new Promise((resolve, reject) => {
      repository.findByPk(clientId).then(user => {
        code = Math.random();
// sends new confirmation code, through sms or email,
        const response = {
          clientId: clientId,
          confirmationCode: code
        }
        resolve(response);
      }).catch(err => reject(err.message));
    });
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