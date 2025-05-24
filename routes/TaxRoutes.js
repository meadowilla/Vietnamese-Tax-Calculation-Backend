const express = require("express");
const router = express.Router();
const {
    calculateTaxWithoutAuthUser,
    calculateTaxWithAuthUser,
    getTaxRecordsByUserId,
} = require("../controllers/TaxController");

router.route("/calculate-tax") // tính thuế khi chưa đăng nhậpnhập
    .post(calculateTaxWithoutAuthUser);

router.route("/calculate-tax-auth") // tính thuế khi đã đăng nhập
    .post(calculateTaxWithAuthUser);

router.route("/storage") // truy xuất dữ liệu thuế của người dùng
    .get(getTaxRecordsByUserId);

module.exports = router;