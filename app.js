const express = require('express');
const app = express();

const auth = require('./index');

app.listen(3000, async () => {
    try{
        await auth.initialize({
            databaseName: 'yourdatabase',
            username: 'root',
            password: 'root',
            dialect: 'mysql',
            host: 'localhost',
        });
        const user = await auth.signup({
        username: 'jerico',
        password: "111111",
        email: 'jestanislao@stratpoint.com'
        });
        console.log(user);
        const registeredUser = await auth.register({
            username: 'jerico',
            email: 'jestanislao@stratpoint.com'
            });
            console.log(registeredUser);
         const confirmUser = await auth.signupConfirm({
             clientId: 1,
             confirmationCode: user.confirmationCode
         });
         console.log(confirmUser);  
         const resendData = await auth.sigupResend({
             clientId: 1
         });
         console.log(resendData);
         const confirmUser2 = await auth.signupConfirm({
            clientId: 1,
            confirmationCode: resendData.confirmationCode
        });
        console.log(confirmUser2); 
        const loginData = await auth.login({
            clientId: user.clientId,
            clientSecret: user.password
        });
        console.log(loginData);
    }catch(err){
        throw err;
    };

})
