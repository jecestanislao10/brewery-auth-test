const express = require('express');
const app = express();
const cors = require('cors');
const auth = require('./index');
const bodyParser = require('body-parser');

app
.use(bodyParser.urlencoded({ extended: false }))
.use(bodyParser.json())
.use(cors())
.use(auth.initialize());

app.use('/api', auth.authenticate(), async () => {
    const profile = await auth.profile();
    console.log(profile);
    const mfaData = await auth.getMfa();
    console.log(mfaData);
    const setMfa = await auth.setMfa({
        mfa: false
    });
    console.log(setMfa);
    const updated = await auth.profileEdit({
        username: 'jericooo11'
    });
    console.log(updated);
    const newPassword = await auth.passwordChange(profile.password, Math.random());
    console.log(newPassword);
})

app.listen(3000, async () => {
    try{
        //configure
        await auth.configure({database:{
            databaseName: 'yourdatabase',
            username: 'root',
            password: 'root',
            dialect: 'mysql',
            host: 'localhost',
        },
        attributes: ['email']
    });

        //signup
        const user = await auth.signup({
        username: 'jerico',
        password: "111111",
        email: 'jestanislao@stratpoint.com',
        MFA: true,
        registered: 0
        });
        console.log(user);
        
        //forgotPassword
        const forgot = await auth.passwordForgot(user.clientId);
        console.log(forgot);

        //passwordReset
        const reset = await auth.passwordReset(user.clientId, forgot.code, '111111' );
        console.log(reset);
        //register
        const registeredUser = await auth.register({
            username: 'jerico',
            email: 'jestanislao@stratpoint.com',
            registered: true
            });
            console.log('register');
            console.log(registeredUser);
          
         //confirmuser   
         const confirmUser = await auth.signupConfirm({
             clientId: user.clientId,
             confirmationCode: user.confirmationCode
         });

         console.log('confirm user');
         console.log(confirmUser);  
         
         //resendcode
         const resendData = await auth.sigupResend({
             clientId: registeredUser.clientId
         });
         console.log('signupResend');
         console.log(resendData);

         //confrm user
         const confirmUser2 = await auth.signupConfirm({
            clientId: registeredUser.clientId,
            confirmationCode: resendData.confirmationCode
        });

        console.log('confirm user');
        console.log(confirmUser2); 
        
        //login
        const loginData = await auth.login({
            clientId: user.clientId,
            clientSecret: user.password
        });
        console.log('login');
        console.log(loginData);

        const mfaLogin = await auth.loginMfa(loginData.clientId, loginData.code);
        console.log(mfaLogin);
        
        const loginRegistered = await auth.login({
            clientId: registeredUser.clientId,
            clientSecret: registeredUser.password
        });
        console.log('login');
        console.log(loginRegistered);

        const newPassLogin = await auth.loginNewPasswordRequired(loginRegistered.clientId,'New password');
        console.log(newPassLogin);
        //delete

        // const deleteData = await auth.deleteUser({
        //     clientId: user.clientId,
        //     clientSecret: user.password
        // });

        // console.log(deleteData);

    }catch(err){
        throw err;
    };

})
