## Steps to run this web app:
1. Clone: ```git clone https://github.com/meadowilla/Vietnamese-Tax-Calculation-Backend.git```
2. Install packages, and dependencies: ```npm i```
3. Add a new file .env and ask me for the secrets
4. Run: ```npm run start```
5. You can use Thunder Client for sending requests:
* GET all users: ```http://localhost:3000/auth/```
* POST signup: ```http://localhost:3000/auth/signup/``` with body: ```{"username": ..., "email": ..., "password": ...}```
* POST login: ```http://localhost:3000/auth/login``` with body: ```{"username": ..., "password":...}``` 
* POST logout: ```http://localhost:3000/auth/logout```
* POST forgotPassword: ```http://localhost:3000/auth/forgotPassword``` with body ```{"email": ...}```
* POST resetPassword: ```http://localhost:3000/auth/resetPassword``` with body ```{"email": ..., "otp": ..., "newPassword": ..., "oldPassword": ...}```
