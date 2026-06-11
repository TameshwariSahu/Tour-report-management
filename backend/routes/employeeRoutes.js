const express = require("express");
const { login, requestOtp, verifyOtp } = require("../controllers/employeeController");

const router = express.Router();

router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);

module.exports = router;
