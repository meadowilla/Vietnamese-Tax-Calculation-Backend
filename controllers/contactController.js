const UserModel = require('../models/RegisteredUser');
const dotenv = require('dotenv');
dotenv.config();
const nodemailer = require('nodemailer');

exports.contactController = async(req, res) => {
    try{
        const {username, phoneNumber, email, date, content} = req.body;

        // validate the input
        if (!username || !phoneNumber || !email || !date) {
            return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin" , status: "error"});
        }
        if (!/^\d{10}$/.test(phoneNumber)) {
            return res.status(400).json({ message: "Số điện thoại không hợp lệ", status: "error" });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: "Email không hợp lệ", status: "error" });
        }
        if (new Date(date) < new Date()) {
            return res.status(400).json({ message: "Ngày hẹn không được là quá khứ", status: "error" });
        }
        
        // create a transporter for nodemailer
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        // setup email data
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: 
                `Yêu cầu tư vấn từ ${username}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 10px; border: 1px solid #ddd; border-radius: 6px; max-width: 500px;">
                <h2 style="color: #2c3e50;">📌 Thông tin yêu cầu tư vấn</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                    <td style="padding: 6px 0;"><strong>Họ và tên:</strong></td>
                    <td>${username}</td>
                    </tr>
                    <tr>
                    <td style="padding: 6px 0;"><strong>Số điện thoại:</strong></td>
                    <td>${phoneNumber}</td>
                    </tr>
                    <tr>
                    <td style="padding: 6px 0;"><strong>Email:</strong></td>
                    <td><a href="mailto:${email}">${email}</a></td>
                    </tr>
                    <tr>
                    <td style="padding: 6px 0;"><strong>Ngày hẹn:</strong></td>
                    <td>${date}</td>
                    </tr>
                    <tr>
                    <td style="padding: 6px 0;"><strong>Nội dung tư vấn:</strong></td>
                    <td style="white-space: pre-wrap;">${content}</td>
                    </tr>
                </table>
                </div>
            `
        };
        // send mail
        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "Gửi yêu cầu tư vấn thành công!", success: true, });

    }catch(error){
        console.error("Error in contactController:", error);
        res.status(500).json({ message: "Internal Server Error", success: false });
    }
}