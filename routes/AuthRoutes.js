const express = require("express");
const {
    getAllUsers,
    createUser,
    login,
    logout,
    forgotPassword,
    resetPassword
} = require("../controllers/UserController");

const router = express.Router();

router.route("/").get(getAllUsers); // for debugging purposes
router.route("/signup").post(createUser); // done
router.route("/login").post(login); // done
router.route("/logout").post(logout); // done

router.route("/forgotPassword").post(forgotPassword);
router.route("/resetPassword").post(resetPassword);

module.exports = router;