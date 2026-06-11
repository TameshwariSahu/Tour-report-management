const db = require("../config/db");
const { emailShell, sendMail } = require("../utils/mailer");
const {
  MAX_SUPPORTING_DOCUMENTS,
  attachSupportDocs,
  generateCombinedReportPdf,
  resolveReportFile,
  saveUploadedFile,
  saveSupportFiles,
} = require("../utils/reportFiles");
const { normalizeTime, validateSubmittedReport } = require("../utils/reportValidation");

const queueCombinedReportPdf = (reportId) => {
  setTimeout(() => {
    generateCombinedReportPdf(reportId, (err) => {
      if (err) console.error("Combined PDF failed:", err.message);
    });
  }, 0);
};

const finishReportSave = (reportId, res, message = "Report saved successfully.") => {
  res.json({ message, id: reportId, combined_pdf_status: "processing" });
  queueCombinedReportPdf(reportId);
};

const reportValues = (body, employee, approvalFile, status) => [
  employee.id,
  employee.sap_id,
  body.name || employee.name,
  body.designation || employee.designation,
  body.grade || employee.grade,
  body.department || employee.department,
  body.tour_type || null,
  body.purpose || null,
  body.referred_hospital_name || null,
  body.medical_reference_no || null,
  body.medical_reference_date || null,
  body.patient_name || null,
  body.patient_relation || null,
  body.escort_employee_sap_id || null,
  body.return_vehicle_required || null,
  body.railway_availability || null,
  body.leave_availed || null,
  body.leave_details || null,
  body.leave_start_date || null,
  body.leave_end_date || null,
  body.start_date || null,
  normalizeTime(body.start_time, body.start_period),
  body.start_place || null,
  body.end_date || null,
  normalizeTime(body.end_time, body.end_period),
  body.destination || null,
  body.mode_of_travel || null,
  body.weekly_off || null,
  body.approving_authority || null,
  approvalFile?.filePath || null,
  approvalFile?.fileName || null,
  status,
];

const reportUpdateValues = (body, employee, approvalFile, status, existingReport) => [
  body.name || employee.name,
  body.designation || employee.designation,
  body.grade || employee.grade,
  body.department || employee.department,
  body.tour_type || null,
  body.purpose || null,
  body.referred_hospital_name || null,
  body.medical_reference_no || null,
  body.medical_reference_date || null,
  body.patient_name || null,
  body.patient_relation || null,
  body.escort_employee_sap_id || null,
  body.return_vehicle_required || null,
  body.railway_availability || null,
  body.leave_availed || null,
  body.leave_details || null,
  body.leave_start_date || null,
  body.leave_end_date || null,
  body.start_date || null,
  normalizeTime(body.start_time, body.start_period),
  body.start_place || null,
  body.end_date || null,
  normalizeTime(body.end_time, body.end_period),
  body.destination || null,
  body.mode_of_travel || null,
  body.weekly_off || null,
  body.approving_authority || null,
  approvalFile.filePath,
  approvalFile.fileName,
  status,
  existingReport.id,
  employee.id,
];

const saveReportDocuments = (reportId, supportFiles, res, done) => {
  if (supportFiles.length === 0) return done();
  db.query("DELETE FROM tour_supporting_documents WHERE tour_report_id = ?", [reportId], (err) => {
    if (err) return res.status(500).json({ message: "Old supporting documents could not be replaced." });
    saveSupportFiles(reportId, supportFiles, res, done);
  });
};

const saveExistingReport = ({ req, res, status, employee, existingReport, approvalFile, supportFiles }) => {
  if (existingReport.status === "Approved") {
    return res.status(403).json({ message: "Approved reports cannot be edited." });
  }

  const finalApprovalFile = approvalFile || {
    filePath: existingReport.approval_note_path || null,
    fileName: existingReport.approval_note_name || null,
  };

  if (status === "Pending") {
    const validationMessage = validateSubmittedReport(req.body, Boolean(finalApprovalFile.filePath));
    if (validationMessage) return res.status(400).json({ message: validationMessage });
  }

  db.query(
    `UPDATE tour_reports
     SET name = ?, designation = ?, grade = ?, department = ?, tour_type = ?, purpose = ?,
         referred_hospital_name = ?, medical_reference_no = ?, medical_reference_date = ?, patient_name = ?, patient_relation = ?,
         escort_employee_sap_id = ?, return_vehicle_required = ?, railway_availability = ?, leave_availed = ?, leave_details = ?, leave_start_date = ?, leave_end_date = ?,
         start_date = ?, start_time = ?, start_place = ?, end_date = ?, end_time = ?,
         destination = ?, mode_of_travel = ?, weekly_off = ?, approving_authority = ?,
         approval_note_path = ?, approval_note_name = ?, status = ?,
         combined_pdf_path = NULL, combined_pdf_name = NULL,
         submitted_at = ${status === "Pending" ? "NOW()" : "submitted_at"},
         rejection_reason = ${status === "Pending" ? "NULL" : "rejection_reason"}
     WHERE id = ? AND employee_id = ?`,
    reportUpdateValues(req.body, employee, finalApprovalFile, status, existingReport),
    (err) => {
      if (err) return res.status(500).json({ message: "Report could not be saved." });
      saveReportDocuments(existingReport.id, supportFiles, res, () => finishReportSave(existingReport.id, res));
    }
  );
};

const createReport = ({ req, res, status, employee, approvalFile, supportFiles }) => {
  if (status === "Pending") {
    const validationMessage = validateSubmittedReport(req.body, Boolean(approvalFile?.filePath));
    if (validationMessage) return res.status(400).json({ message: validationMessage });
  }

  db.query(
    `INSERT INTO tour_reports
     (employee_id, sap_id, name, designation, grade, department, tour_type, purpose,
      referred_hospital_name, medical_reference_no, medical_reference_date, patient_name, patient_relation, escort_employee_sap_id,
      return_vehicle_required, railway_availability, leave_availed, leave_details, leave_start_date, leave_end_date, start_date,
      start_time, start_place, end_date, end_time, destination, mode_of_travel, weekly_off,
      approving_authority, approval_note_path, approval_note_name, status, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${status === "Pending" ? "NOW()" : "NULL"})`,
    reportValues(req.body, employee, approvalFile, status),
    (err, result) => {
      if (err) return res.status(500).json({ message: "Report could not be saved." });
      saveSupportFiles(result.insertId, supportFiles, res, () => finishReportSave(result.insertId, res));
    }
  );
};

const loadOrCreateReport = (req, res, status, employee, approvalFile, supportFiles) => {
  if (req.params.id) {
    db.query("SELECT * FROM tour_reports WHERE id = ? AND employee_id = ?", [req.params.id, employee.id], (err, rows) => {
      if (err) return res.status(500).json({ message: "Report could not be loaded." });
      if (rows.length === 0) return res.status(404).json({ message: "Report not found." });
      saveExistingReport({ req, res, status, employee, existingReport: rows[0], approvalFile, supportFiles });
    });
    return;
  }

  db.query(
    "SELECT id, status FROM tour_reports WHERE employee_id = ? AND status IN ('Draft', 'Pending', 'Rejected') ORDER BY id DESC LIMIT 1",
    [employee.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Report could not be checked." });
      if (rows.length > 0) {
        const current = rows[0];
        return res.status(409).json({
          message: `You already have a ${current.status.toLowerCase()} report. Please continue that report.`,
          report_id: current.id,
          status: current.status,
        });
      }

      createReport({ req, res, status, employee, approvalFile, supportFiles });
    }
  );
};

const saveEmployeeReport = async (req, res, status) => {
  const approvalNote = req.files?.approval_note?.[0] || null;
  const supportingDocuments = req.files?.supporting_documents || [];
  req.body.start_time = normalizeTime(req.body.start_time, req.body.start_period) || req.body.start_time;
  req.body.end_time = normalizeTime(req.body.end_time, req.body.end_period) || req.body.end_time;

  if (supportingDocuments.length > MAX_SUPPORTING_DOCUMENTS) {
    return res.status(400).json({ message: `Only ${MAX_SUPPORTING_DOCUMENTS} supporting documents are allowed.` });
  }

  try {
    const approvalFile = approvalNote ? await saveUploadedFile(approvalNote, "approval-note") : null;
    const supportFiles = await Promise.all(supportingDocuments.map((file) => saveUploadedFile(file, "support")));
    loadOrCreateReport(req, res, status, req.employee, approvalFile, supportFiles);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.saveDraft = (req, res) => saveEmployeeReport(req, res, "Draft");

exports.submitReport = (req, res) => saveEmployeeReport(req, res, "Pending");

exports.getEmployeeReports = (req, res) => {
  db.query("SELECT * FROM tour_reports WHERE employee_id = ? ORDER BY created_at DESC, id DESC", [req.employee.id], (err, reports) => {
    if (err) return res.status(500).json({ message: "Reports could not be loaded." });
    attachSupportDocs(reports, res);
  });
};

exports.getReports = (req, res) => {
  const { year, status, fromDate, toDate } = req.query;
  const where = [];
  const params = [];

  if (year) {
    where.push("YEAR(tr.start_date) = ?");
    params.push(year);
  }

  if (status && status !== "all") {
    where.push("tr.status = ?");
    params.push(status);
  } else {
    where.push("tr.status <> 'Draft'");
  }

  if (fromDate) {
    where.push("tr.start_date >= ?");
    params.push(fromDate);
  }

  if (toDate) {
    where.push("tr.start_date <= ?");
    params.push(toDate);
  }

  const sql = `
    SELECT tr.*, a.sap_id AS approved_by_sap, e.email AS employee_email
    FROM tour_reports tr
    LEFT JOIN users a ON tr.approved_by = a.id
    LEFT JOIN employees e ON tr.employee_id = e.id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY COALESCE(tr.submitted_at, tr.created_at) DESC, tr.id DESC
  `;

  db.query(sql, params, (err, reports) => {
    if (err) return res.status(500).json({ message: "Reports could not be loaded." });
    attachSupportDocs(reports, res);
  });
};

exports.updateStatus = (req, res) => {
  const { status, rejection_reason } = req.body;
  const { id } = req.params;

  if (!["Approved", "Rejected"].includes(status)) return res.status(400).json({ message: "Invalid status." });
  if (status === "Rejected" && !String(rejection_reason || "").trim()) {
    return res.status(400).json({ message: "Rejection reason is required." });
  }

  db.query(
    "UPDATE tour_reports SET status = ?, rejection_reason = ?, approved_by = ?, approved_at = NOW() WHERE id = ? AND status = 'Pending'",
    [status, status === "Rejected" ? rejection_reason.trim() : null, req.admin.id, id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Status update failed." });
      if (result.affectedRows === 0) return res.status(400).json({ message: "Only pending reports can be updated." });

      sendStatusEmail(id, status);
      res.json({ message: `Report ${status.toLowerCase()} successfully.` });
    }
  );
};

const sendStatusEmail = (reportId, status) => {
  db.query(
    `SELECT tr.*, e.email
     FROM tour_reports tr
     LEFT JOIN employees e ON tr.employee_id = e.id
     WHERE tr.id = ?`,
    [reportId],
    async (err, rows) => {
      if (err || !rows[0]?.email) return;

      const report = rows[0];
      const reasonText = status === "Rejected" ? `\nReason: ${report.rejection_reason}` : "";
      const statusColor = status === "Approved" ? "#166534" : "#991b1b";
      const statusBg = status === "Approved" ? "#dcfce7" : "#fee2e2";
      const reasonHtml = status === "Rejected"
        ? `<div style="margin-top:16px;padding:14px;background:#fff7ed;border-left:4px solid #f97316;border-radius:6px;"><strong>Reason:</strong><br>${report.rejection_reason}</div>`
        : "";

      try {
        await sendMail({
          to: report.email,
          subject: `Tour Report ${status}`,
          text: `Your tour report for ${report.destination || "your tour"} has been ${status}.${reasonText}`,
          html: emailShell({
            title: `Tour Report ${status}`,
            preview: `Hello ${report.name}, your tour report status has been updated.`,
            children: `
              <div style="display:inline-block;padding:8px 12px;border-radius:999px;background:${statusBg};color:${statusColor};font-weight:800;margin-bottom:14px;">${status}</div>
              <p style="margin:0;color:#172033;font-size:15px;line-height:1.6;">Your tour report for <strong>${report.destination || "your tour"}</strong> has been <strong>${status}</strong>.</p>
              ${reasonHtml}
            `,
          }),
        });
      } catch (mailErr) {
        console.log("[email failed] status notification", { reportId, status, error: mailErr.message });
      }
    }
  );
};

exports.fileResponse = (req, res) => {
  const file = resolveReportFile(req.query.path);
  if (!file) return res.status(404).json({ message: "File not found." });

  if (file.type === "url") return res.redirect(file.value);
  if (req.query.mode === "download") return res.download(file.value);
  res.sendFile(file.value);
};





