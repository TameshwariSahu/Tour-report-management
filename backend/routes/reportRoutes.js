const express = require("express");
const {
  saveDraft,
  saveAdminDraft,
  submitReport,
  submitAdminReport,
  getEmployeeReports,
  getAdminTargetReports,
  getReports,
  updateStatus,
  fileResponse,
} = require("../controllers/reportController");
const { verifyAdmin, verifyAdminFileAccess, verifyEmployee } = require("../middleware/auth");
const { handleUploadError } = require("../middleware/upload");

const router = express.Router();

router.get("/employee", verifyEmployee, getEmployeeReports);
router.post("/draft", verifyEmployee, handleUploadError, saveDraft);
router.put("/:id/draft", verifyEmployee, handleUploadError, saveDraft);
router.post("/submit", verifyEmployee, handleUploadError, submitReport);
router.put("/:id/submit", verifyEmployee, handleUploadError, submitReport);
router.get("/admin-target", verifyAdmin, getAdminTargetReports);
router.post("/admin/draft", verifyAdmin, handleUploadError, saveAdminDraft);
router.put("/admin/:id/draft", verifyAdmin, handleUploadError, saveAdminDraft);
router.post("/admin/submit", verifyAdmin, handleUploadError, submitAdminReport);
router.put("/admin/:id/submit", verifyAdmin, handleUploadError, submitAdminReport);
router.get("/", verifyAdmin, getReports);
router.put("/:id/status", verifyAdmin, updateStatus);
router.get("/file", verifyAdminFileAccess, fileResponse);

module.exports = router;


