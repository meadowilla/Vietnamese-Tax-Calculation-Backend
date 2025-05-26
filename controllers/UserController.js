const UserModel = require('../models/RegisteredUser');
const dotenv = require('dotenv');
const crypto = require('crypto');
dotenv.config();

// imports to allow authentication
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// implement ơn SMTP server by using 'nodemailer' library
const nodemailer = require('nodemailer');

// function to createUser in the database
// can be called by anyone 
// should avoid bot attacks => use captcha
// all response messages should be generic after deployment
// how many usernames/accounts can be created per email?
exports.createUser = async (req, res) => {
    try {
        const {username:_username, email: _email, password: _password} = req.body;
        
        // Check if user already exists
        const existingUser = await UserModel.findOne({ username: _username });
        if (existingUser) {
            return res.status(400).json({ message: "Username already exists", status: "error" });
        }
        
        // Encrypt password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(_password, salt);
        
        // Save user to database
        const user = new UserModel({
            username: _username,
            email: _email,
            password: hashedPassword
        });
        const newUser = await user.save();
        // console.log("New user created: ", newUser);
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.json({ 
            success: true, 
            message: "User successfully registered" 
        }); // Does this need to include data field in response?
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
}

exports.login = async (req, res) => {
    try{
        const {email, password} = req.body;
        const user = await UserModel.findOne({email : email});
        if (user == null || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ 
                message: `Invalid credentials`, 
                success: false 
            }); // For security purposes, do not specify the error message
        }
        
        // Generate token
        const accessToken = jwt.sign(
            { id: user._id }, 
            process.env.ACCESS_TOKEN_SECRET, 
            { expiresIn: "1h" }
        );
        const refreshToken = jwt.sign(
            { id: user._id }, 
            process.env.REFRESH_TOKEN_SECRET, 
            { expiresIn: "1d" }
        );
        // Optional
        user.refreshToken = refreshToken;
        await user.save();
        
        // Set cookie marked as httpOnly 
        // => protect against XSS (Cross-Site Scripting) attacks
        res.cookie(
            "jwt", 
            refreshToken, 
            { 
                httpOnly: true, 
                sameSite: "None", 
                maxAge: 3 * 24 * 60 * 60 
            }
        ); 
        res.json({
            accessToken,
            userId: user._id,
            message: "User successfully logged in",
            success: true
        });
        // res.setHeader('Access-Control-Allow-Origin', '*');
    } catch (error) {
        res.status(500).json({
            message: error.message,
            success: false
        });
    }
}

exports.logout = async (req, res) => {
    try {
        console.log("Clearing cookie...");
        // Clear the cookie
        res.clearCookie(
            "jwt",
            { 
                httpOnly: true, 
                sameSite: "None", 
            }
        );
        console.log("Cookie cleared");
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.json({ 
            message: "User successfully logged out", 
            success: true
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
            success: false
        });
    }
}

/*GENERATE AND SEND OTP*/
// when a user has forgotten their pwd, sends their email -> check if email exits in system or not
// if exits -> an OTP is generated with an expiration time, stored in DB, and sent to email
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        // Tìm user trong DB
        const user = await UserModel.findOne({ email });
        console.log("User found: ", user);
        if (!user) {
            return res.status(400).json({ message: "User not found", status: "error" });
        }

        // Tạo OTP ngẫu nhiên và hash
        const otp = crypto.randomInt(100000, 999999).toString();
        const hashedOtp = await bcrypt.hash(otp, 10);

        // Lưu OTP hash + thời gian hết hạn
        user.resetOtp = hashedOtp;
        user.otpExpiry = Date.now() + 5 * 60 * 1000; // 5 phút
        user.failedAttempts = 0; // Reset lại số lần nhập sai OTP
        await user.save();

        // Cấu hình SMTP: user send email -> SMTP client -> Gmail SMTP server via Internet -> send to users via POP/IMP protocol
        const transporter = nodemailer.createTransport({
            service: "gmail", // email will be sent using Gmail SMTP server
            auth: {
                user: process.env.EMAIL_USER, // the email address of the our app
                pass: process.env.EMAIL_PASS, // developer setup an email password for the app
            }
        });

        // Kiểm tra SMTP trước khi gửi email
        await transporter.verify();

        // Gửi email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset OTP",
            text: `Your OTP for password reset is: ${otp}. This OTP is valid for 5 minutes.`,
        });

        return res.status(200).json({
            message: "OTP sent to your email",
            success: true,
        });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({
            message: "Internal Server Error",
            success: false,
        });
    }
};

/*VALIDATE OTP AND UPDATE PASSWORD */
// user send his new pwd + valid OTP
// check if the OTP is valid -> allow to reset the password only if it is valid
exports.resetPassword = async (req, res) => {
    const { email, otp, newPassword, confirmNewPassword } = req.body;

    try {
        // Tìm user trong DB
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.status(400).json({
                message: "User not found",
                success: false
            });
        }

        // Kiểm tra số lần nhập OTP sai
        if (user.failedAttempts >= 5) {
            return res.status(403).json({ 
                message: "Too many failed attempts, try again later", 
                success: false
            });
        }

        // Kiểm tra OTP hết hạn
        if (!user.otpExpiry || Date.now() > user.otpExpiry) {
            return res.status(400).json({ 
                message: "OTP has expired", 
                success: false 
            });
        }

        // Kiểm tra OTP có đúng không
        const isOtpValid = await bcrypt.compare(otp, user.resetOtp);
        if (!isOtpValid) {
            user.failedAttempts += 1; // Tăng số lần nhập sai
            await user.save();
            return res.status(400).json({ 
                message: "Incorrect OTP", 
                success: false 
            });
        }

        // Kiểm tra mật khẩu nhập lại có trùng không
        if (newPassword !== confirmNewPassword) {
            console.log("newPassword:", newPassword);
            console.log("confirmNewPassword:", confirmNewPassword);
            return res.status(400).json({ 
                message: "Passwords do not match", 
                success: false 
            });
        }

        // Hash mật khẩu mới
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Lưu mật khẩu mới và xóa OTP
        user.password = hashedPassword;
        user.resetOtp = undefined;
        user.otpExpiry = undefined;
        user.failedAttempts = 0; // Reset bộ đếm nhập sai
        await user.save();

        return res.status(200).json({ 
            message: "Password reset successfully", 
            success: true 
        });

    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ 
            message: "Internal Server Error",
            success: false
        });
    }
}; 
// exports.getUserByEmail = async (req, res) => {
    //     try {
        //         const email = req.params.email;
        //         const user = await UserModel.findOne({email: email});
        //         res.setHeader('Access-Control-Allow-Origin', '*');
        //         res.json({ data: user, status: "success" });
        //     } catch (error) {
//         res.status(500).json({ message: error.message });
//     }
// }

// exports.updateUser = async (req, res) => {
    //     try {
        //         const username = req.params.username;
        //         const user = req.body;
        //         res.setHeader('Access-Control-Allow-Origin', '*');
        //         if (user == null) {
            //             res.status(400).json({ message: `Cannot find username ${username}}`, status: "error" });
            //         }
            //         const updatedUser = await UserModel.findByIdAndUpdate(username, user);
            //         res.json({ data: updatedUser, status: "success" });
            //     } catch (error) {
                //         res.status(500).json({ message: error.message });
                //     }
                // }
                
// exports.deleteUser = async (req, res) => {
//     try {
//         const { username } = req.params;

//         // Find and delete the user by username
//         const deletedUser = await UserModel.findOneAndDelete({ username });
//         if (!deletedUser) {
//             return res.status(404).json({ message: "User not found", status: "error" });
//         }

//         // Respond with success
//         res.setHeader('Access-Control-Allow-Origin', '*');
//         res.json({ message: "User deleted successfully", status: "success" });
//     } catch (error) {
//         console.error("Delete User Error:", error);
//         res.status(500).json({ message: error.message });
//     }
// }
    
            
// function to getAllUsers from the database 
// should be called by ???
exports.getAllUsers = async (req, res) => {
    try {
        const users = await UserModel.find();
        // console.log("All users: ", users);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.json({data: users, status: "success"});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}