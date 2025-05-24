const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetOtp: {type: String},
    otpExpiry: {type: Date},
    refreshToken: { type: String },
});

module.exports = mongoose.model("User", UserSchema, "User");