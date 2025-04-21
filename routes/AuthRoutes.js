const express = require("express");
const {
    getAllUsers,
    createUser,
    login,
    logout,
    requestReset,
    verifyOtpAndReset
} = require("../controllers/UserController");

const router = express.Router();

router.route("/").get(getAllUsers); // for debugging purposes
router.route("/signup").post(createUser); // done
router.route("/login").post(login); // done
router.route("/logout").post(logout); // done

router.route("/resetPassword").post(requestReset);
router.route("/verify").post(verifyOtpAndReset);

module.exports = router;