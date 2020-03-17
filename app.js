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
    const updated = await auth.profileEdit({
        username: 'jericooo11'
    });
    console.log(updated);
})

app.listen(3000, async () => {
    try{
        //configure
        await auth.configure({
            databaseName: 'yourdatabase',
            username: 'root',
            password: 'root',
            dialect: 'mysql',
            host: 'localhost',
        });

        //signup
        const user = await auth.signup({
        username: 'jerico',
        password: "111111",
        email: 'jestanislao@stratpoint.com'
        });
        console.log(user);

        //register
        const registeredUser = await auth.register({
            username: 'jerico',
            email: 'jestanislao@stratpoint.com'
            });
            console.log('register');
            console.log(registeredUser);
          
         //confirmuser   
         const confirmUser = await auth.signupConfirm({
             clientId: registeredUser.clientId,
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
        
        //delete

        const deleteData = await auth.deleteUser({
            clientId: user.clientId,
            clientSecret: user.password
        });

        console.log(deleteData);

    }catch(err){
        throw err;
    };

})
