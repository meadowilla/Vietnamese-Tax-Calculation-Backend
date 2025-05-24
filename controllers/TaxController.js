/*
TaxController is for handling tax-related operations.
It includes methods to calculate tax for a given amount and to get the tax rate.
*/

const axios = require('axios');
const authenticateToken = require('../middleware/auth');
const TaxRecordModel = require('../models/TaxRecord');

exports.calculateTaxWithoutAuthUser = async (req, res) => {
    try {
        const response = await axios.post(
            'http://localhost:5000/api/calculate-tax', 
            req.body,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
        res.status(200).json({
            success: true,
            message: "Tax calculated successfully",
            data: response.data,
        });

    } catch (error) {
        console.error('Error calculating tax:', error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}

exports.calculateTaxWithAuthUser = [
    authenticateToken, // dùng middleware kiểm tra token trước khi vào hàm
    async (req, res) => {
        try {
            const response = await axios.post('http://localhost:5000/api/calculate-tax', req.body, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            // Lưu thông tin vào cơ sở dữ liệu
            const taxRecord = new TaxRecordModel({
                userId: req.user.id, // Lấy userId từ token
                input: req.body,
                output: response.data,
                date: new Date(),
            });
            await taxRecord.save();

            res.status(200).json({
                success: true,
                message: "Tax calculated successfully",
                data: response.data,
            }); 

        } catch (error) {
            console.error('Error calculating tax:', error);
            res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }
]

exports.getTaxRecordsByUserId = [
    authenticateToken, // dùng middleware kiểm tra token trước khi vào hàm
    async (req, res) => {
        try {
            const taxRecords = await TaxRecordModel.find({ userId: req.query.userId });
            res.status(200).json({
                success: true,
                message: "Tax records retrieved successfully",
                data: taxRecords,
            });
        } catch (error) {
            console.error('Error retrieving tax records:', error);
            res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }
]
