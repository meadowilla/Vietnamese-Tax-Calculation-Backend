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
        res.json({ data: newUser, status: "User successfully registered" }); // Does this need to include data field in response?
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

exports.login = async (req, res) => {
    try{
        const {username, password} = req.body;
        const user = await UserModel.findOne({username : username});
        if (user == null) {
            return res.status(400).json({ message: `Wrong username`, status: "error" }); // For security purposes, do not specify the error message
        }
        
        // Check if password is correct
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Wrong password", status: "error" });
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
        res.json({accessToken, message: "User successfully logged in", status: "success"});
        // res.setHeader('Access-Control-Allow-Origin', '*');
    } catch (error) {
        res.status(500).json({ message: error.message });
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
        res.json({ message: "User successfully logged out", status: "success" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

/*GENERATE AND SEND OTP*/
exports.requestReset = async (req, res) => {
  try {
    const { email, newPassword, confirmNewPassword } = req.body;

    // Validate inputs
    if (!email || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Find user
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Email does not exist!" });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Save OTP and new password temporarily
    user.resetOtp = hashedOtp;
    user.otpExpiry = Date.now() + 5 * 60 * 1000;  // 5 minutes expiry
    user.pendingNewPassword = hashedNewPassword;
    user.failedAttempts = 0;
    await user.save();

    // Setup email transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Verify transporter configuration
    await transporter.verify();

    // Send OTP email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    });

    return res.status(200).json({ message: "OTP sent to your email" });

  } catch (err) {
    console.error("Request Reset Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.verifyOtpAndReset = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid request" });
    }

    // Too many failed attempts
    if (user.failedAttempts >= 5) {
      return res.status(403).json({ message: "Too many failed attempts. Try again later." });
    }

    // Check OTP expiry and validity
    if (!user.resetOtp || !user.otpExpiry || Date.now() > user.otpExpiry) {
      return res.status(400).json({ message: "OTP has expired. Please request again." });
    }

    // Validate OTP
    const isOtpValid = await bcrypt.compare(otp, user.resetOtp);
    if (!isOtpValid) {
      user.failedAttempts += 1;
      await user.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Ensure password change is pending
    if (!user.pendingNewPassword) {
      return res.status(400).json({ message: "No pending password change found." });
    }

    // Reset password
    user.password = user.pendingNewPassword;
    user.resetOtp = undefined;
    user.otpExpiry = undefined;
    user.pendingNewPassword = undefined;
    user.failedAttempts = 0;
    await user.save();

    return res.status(200).json({ message: "Password reset successfully" });

  } catch (err) {
    console.error("Verify OTP Error:", err);
    res.status(500).json({ message: "Internal Server Error" });
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
        console.log("All users: ", users);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.json({data: users, status: "success"});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}