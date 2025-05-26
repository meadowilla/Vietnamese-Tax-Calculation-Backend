const express = require("express");
const {
    getAllUsers,
    createUser,
    login,
    logout,
    forgotPassword,
    resetPassword
} = require("../controllers/UserController");

const {contactController} = require("../controllers/contactController");
const router = express.Router();

router.route("/").get(getAllUsers); // for debugging purposes
router.route("/signup").post(createUser); // done
router.route("/login").post(login); // done
router.route("/logout").post(logout); // done

router.route("/forgotPassword").post(forgotPassword); // done
router.route("/resetPassword").post(resetPassword); // done
router.route("/contact").post(contactController); 

module.exports = router;