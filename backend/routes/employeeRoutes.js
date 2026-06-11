const express = require("express");
const { departmentLogin, login, requestOtp, verifyOtp } = require("../controllers/employeeController");

const router = express.Router();

router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);
router.post("/department-login", departmentLogin);
router.post("/login", login);

module.exports = router;
