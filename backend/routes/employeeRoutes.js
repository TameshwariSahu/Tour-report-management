const express = require("express");
const { changeDepartmentPassword, departmentLogin, login, requestOtp, verifyOtp } = require("../controllers/employeeController");
const { verifyEmployee } = require("../middleware/auth");

const router = express.Router();

router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);
router.post("/department-login", departmentLogin);
router.patch("/department-password", verifyEmployee, changeDepartmentPassword);
router.post("/login", login);

module.exports = router;
