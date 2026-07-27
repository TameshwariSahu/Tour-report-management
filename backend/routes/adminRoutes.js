const express = require("express");
const {
  changePassword,
  createDepartment,
  createDepartmentUser,
  createEmployee,
  createUser,
  listDepartments,
  listDepartmentUsers,
  listEmployees,
  listUsers,
  login,
  updateDepartment,
  updateDepartmentStatus,
  updateDepartmentUser,
  updateDepartmentUserStatus,
  updateEmployee,
  updateEmployeeStatus,
  updateUser,
  updateUserStatus,
  verify,
} = require("../controllers/adminController");
const { verifyAdmin } = require("../middleware/auth");

const router = express.Router();

router.post("/login", login);
router.get("/verify", verifyAdmin, verify);
router.patch("/password", verifyAdmin, changePassword);
router.get("/employees", verifyAdmin, listEmployees);
router.post("/employees", verifyAdmin, createEmployee);
router.put("/employees/:id", verifyAdmin, updateEmployee);
router.patch("/employees/:id/status", verifyAdmin, updateEmployeeStatus);
router.get("/departments", verifyAdmin, listDepartments);
router.post("/departments", verifyAdmin, createDepartment);
router.put("/departments/:id", verifyAdmin, updateDepartment);
router.patch("/departments/:id/status", verifyAdmin, updateDepartmentStatus);
router.get("/users", verifyAdmin, listUsers);
router.post("/users", verifyAdmin, createUser);
router.put("/users/:id", verifyAdmin, updateUser);
router.patch("/users/:id/status", verifyAdmin, updateUserStatus);
router.get("/department-users", verifyAdmin, listDepartmentUsers);
router.post("/department-users", verifyAdmin, createDepartmentUser);
router.put("/department-users/:id", verifyAdmin, updateDepartmentUser);
router.patch("/department-users/:id/status", verifyAdmin, updateDepartmentUserStatus);

module.exports = router;
