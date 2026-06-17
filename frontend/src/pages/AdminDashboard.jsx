import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, authHeaders } from "../api";
import Toast from "../components/Toast";

const currentYear = new Date().getFullYear();
const PAGE_SIZE = 10;

const fileUrl = (path, mode = "preview") => {
  if (/^https?:\/\//i.test(path || "")) return path;

  const token = encodeURIComponent(localStorage.getItem("tour_admin_token") || "");
  return `${API_BASE_URL}/api/reports/file?mode=${mode}&path=${encodeURIComponent(path)}&token=${token}`;
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const excelValue = (value) => String(value ?? "-")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const excelDate = (value) => (value ? formatDate(value) : "-");
const reportDate = (report) => report.submitted_at || report.created_at;

const medicalSummary = (report) => {
  const details = [];
  if (report.referred_hospital_name) details.push(`Hospital: ${report.referred_hospital_name}`);
  if (report.medical_reference_no) details.push(`Ref: ${report.medical_reference_no}`);
  if (report.medical_reference_date) details.push(`Ref date: ${formatDate(report.medical_reference_date)}`);
  if (report.patient_name) details.push(`Patient: ${report.patient_name}`);
  if (report.patient_relation) details.push(`Relation: ${report.patient_relation}`);
  if (report.escort_employee_sap_id) details.push(`Escort SAP: ${report.escort_employee_sap_id}`);
  if (report.return_vehicle_required) details.push(`Return vehicle: ${report.return_vehicle_required}`);
  if (report.railway_availability) details.push(`Railway: ${report.railway_availability}`);
  if (report.leave_availed) details.push(`Leaves availed: ${report.leave_availed}`);
  if (report.leave_start_date || report.leave_end_date) details.push(`Leave dates: ${excelDate(report.leave_start_date)} to ${excelDate(report.leave_end_date)}`);
  return details;
};

const employeeExcelColumns = [
  { group: "Employee Details", label: "SAP ID", value: (report) => report.sap_id, width: 90 },
  { group: "Employee Details", label: "Employee Name", value: (report) => report.name, width: 170 },
  { group: "Employee Details", label: "Designation", value: (report) => report.designation, width: 130 },
  { group: "Employee Details", label: "Grade", value: (report) => report.grade, width: 70 },
  { group: "Employee Details", label: "Department", value: (report) => report.department, width: 110 },
];

const reportDateExcelColumns = [
  { group: "Report Dates", label: "Created At", value: (report) => excelDate(report.created_at), width: 110 },
  { group: "Report Dates", label: "Modified At", value: (report) => excelDate(report.updated_at), width: 110 },
];

const approvalExcelColumns = [
  { group: "Approval Details", label: "Approving Authority", value: (report) => report.approving_authority || "-", width: 170 },
  { group: "Approval Details", label: "Status", value: (report) => report.status, width: 100 },
  { group: "Approval Details", label: "Rejection Reason", value: (report) => report.rejection_reason || "-", width: 220 },
];

const officialExcelColumns = [
  ...employeeExcelColumns,
  ...reportDateExcelColumns,
  { group: "Official Tour Details", label: "Submitted Date", value: (report) => excelDate(reportDate(report)), width: 110 },
  { group: "Official Tour Details", label: "Purpose of Official Tour", value: (report) => report.purpose || "-", width: 190 },
  { group: "Official Tour Details", label: "Start Date", value: (report) => excelDate(report.start_date), width: 110 },
  { group: "Official Tour Details", label: "Trip Begins At", value: (report) => report.start_time || "-", width: 100 },
  { group: "Official Tour Details", label: "Trip Started From", value: (report) => report.start_place || "-", width: 150 },
  { group: "Official Tour Details", label: "End Date", value: (report) => excelDate(report.end_date), width: 110 },
  { group: "Official Tour Details", label: "Trip Ends At", value: (report) => report.end_time || "-", width: 100 },
  { group: "Official Tour Details", label: "Destination", value: (report) => report.destination || "-", width: 150 },
  { group: "Official Tour Details", label: "Mode of Travel", value: (report) => report.mode_of_travel || "-", width: 150 },
  { group: "Official Tour Details", label: "Weekly Off On", value: (report) => report.weekly_off || "-", width: 120 },
  ...approvalExcelColumns,
];

const selfMedicalExcelColumns = [
  ...employeeExcelColumns,
  ...reportDateExcelColumns,
  { group: "Self Medical Tour Details", label: "Submitted Date", value: (report) => excelDate(reportDate(report)), width: 110 },
  { group: "Self Medical Tour Details", label: "Referred Hospital Name", value: (report) => report.referred_hospital_name || "-", width: 190 },
  { group: "Self Medical Tour Details", label: "Reference Letter No.", value: (report) => report.medical_reference_no || "-", width: 140 },
  { group: "Self Medical Tour Details", label: "Reference Letter Date", value: (report) => excelDate(report.medical_reference_date), width: 150 },
  { group: "Self Medical Tour Details", label: "Trip Start Date", value: (report) => excelDate(report.start_date), width: 120 },
  { group: "Self Medical Tour Details", label: "Trip Begins At", value: (report) => report.start_time || "-", width: 100 },
  { group: "Self Medical Tour Details", label: "Trip Started From", value: (report) => report.start_place || "-", width: 150 },
  { group: "Self Medical Tour Details", label: "Trip End Date", value: (report) => excelDate(report.end_date), width: 120 },
  { group: "Self Medical Tour Details", label: "Trip Ends At", value: (report) => report.end_time || "-", width: 100 },
  { group: "Self Medical Tour Details", label: "Destination", value: (report) => report.destination || "-", width: 150 },
  { group: "Self Medical Tour Details", label: "Mode of Travel", value: (report) => report.mode_of_travel || "-", width: 140 },
  { group: "Self Medical Tour Details", label: "Weekly Off On", value: (report) => report.weekly_off || "-", width: 120 },
  { group: "Self Medical Tour Details", label: "Any Leaves Availed In Between", value: (report) => report.leave_availed || "-", width: 180 },
  { group: "Self Medical Tour Details", label: "Leave Start Date", value: (report) => excelDate(report.leave_start_date), width: 130 },
  { group: "Self Medical Tour Details", label: "Leave End Date", value: (report) => excelDate(report.leave_end_date), width: 130 },
  ...approvalExcelColumns,
];

const escortDutyExcelColumns = [
  ...employeeExcelColumns,
  ...reportDateExcelColumns,
  { group: "Escort Duty Details", label: "Submitted Date", value: (report) => excelDate(reportDate(report)), width: 110 },
  { group: "Escort Duty Details", label: "Name of Patient", value: (report) => report.patient_name || "-", width: 150 },
  { group: "Escort Duty Details", label: "Relation With Patient", value: (report) => report.patient_relation || "-", width: 150 },
  { group: "Escort Duty Details", label: "Escort Employee SAP ID", value: (report) => report.escort_employee_sap_id || "-", width: 150 },
  { group: "Escort Duty Details", label: "Referred Hospital Name", value: (report) => report.referred_hospital_name || "-", width: 190 },
  { group: "Escort Duty Details", label: "Reference Letter No.", value: (report) => report.medical_reference_no || "-", width: 140 },
  { group: "Escort Duty Details", label: "Reference Letter Date", value: (report) => excelDate(report.medical_reference_date), width: 150 },
  { group: "Escort Duty Details", label: "Trip Start Date", value: (report) => excelDate(report.start_date), width: 120 },
  { group: "Escort Duty Details", label: "Trip Begins At", value: (report) => report.start_time || "-", width: 100 },
  { group: "Escort Duty Details", label: "Trip Started From", value: (report) => report.start_place || "-", width: 150 },
  { group: "Escort Duty Details", label: "Trip End Date", value: (report) => excelDate(report.end_date), width: 120 },
  { group: "Escort Duty Details", label: "Trip Ends At", value: (report) => report.end_time || "-", width: 100 },
  { group: "Escort Duty Details", label: "Employee's Weekly Off On", value: (report) => report.weekly_off || "-", width: 150 },
  { group: "Escort Duty Details", label: "Mode of Travel", value: (report) => report.mode_of_travel || "-", width: 140 },
  { group: "Escort Duty Details", label: "Any Leaves Availed In Between", value: (report) => report.leave_availed || "-", width: 180 },
  { group: "Escort Duty Details", label: "Leave Start Date", value: (report) => excelDate(report.leave_start_date), width: 130 },
  { group: "Escort Duty Details", label: "Leave End Date", value: (report) => excelDate(report.leave_end_date), width: 130 },
  ...approvalExcelColumns,
];

const mixedExcelColumns = [
  ...employeeExcelColumns,
  ...reportDateExcelColumns,
  { group: "Report Summary", label: "Submitted Date", value: (report) => excelDate(reportDate(report)), width: 110 },
  { group: "Report Summary", label: "Type of Tour", value: (report) => report.tour_type, width: 140 },
  { group: "Report Summary", label: "Main Purpose / Hospital", value: (report) => report.purpose || report.referred_hospital_name || "-", width: 220 },
  { group: "Report Summary", label: "Journey", value: (report) => `${excelDate(report.start_date)} ${report.start_time || "-"} to ${excelDate(report.end_date)} ${report.end_time || "-"}`, width: 230 },
  { group: "Report Summary", label: "Route", value: (report) => `${report.start_place || "-"} to ${report.destination || "-"}`, width: 220 },
  { group: "Report Summary", label: "Mode of Travel", value: (report) => report.mode_of_travel || "-", width: 140 },
  { group: "Report Summary", label: "Type Specific Details", value: (report) => medicalSummary(report).join(" | ") || "-", width: 320 },
  ...approvalExcelColumns,
];

const getExcelColumns = (reportList) => {
  const types = [...new Set(reportList.map((report) => report.tour_type))];
  if (types.length === 1 && types[0] === "Official") return officialExcelColumns;
  if (types.length === 1 && types[0] === "Medical(Self)") return selfMedicalExcelColumns;
  if (types.length === 1 && types[0] === "Medical (Escort Duty)") return escortDutyExcelColumns;
  return mixedExcelColumns;
};

const reportToExcelRow = (report, columns) => columns.map((column) => column.value(report));

const excelGroupHeaders = (columns) => {
  const groups = [];
  columns.forEach((column) => {
    const last = groups[groups.length - 1];
    if (last && last.name === column.group) {
      last.count += 1;
    } else {
      groups.push({ name: column.group, count: 1 });
    }
  });
  return groups;
};
const fileLink = (filePath, label) => (
  <span style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
    <span>{label}</span>
    <a href={fileUrl(filePath, "preview")} target="_blank" rel="noreferrer">Preview</a>
    <a href={fileUrl(filePath, "download")} target="_blank" rel="noreferrer">Download</a>
  </span>
);

const reportFiles = (report) => {
  const primaryFile = report.combined_pdf_path || report.approval_note_path || report.supporting_documents[0]?.file_path;
  if (!primaryFile) return "-";
  return fileLink(primaryFile, "Report");
};

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [filters, setFilters] = useState({
    year: String(currentYear),
    status: "all",
    fromDate: "",
    toDate: "",
  });
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const navigate = useNavigate();

  const totalPages = Math.max(1, Math.ceil(reports.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleReports = reports.slice(pageStart, pageStart + PAGE_SIZE);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast({ message: "", type }), 3000);
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/reports`, {
        headers: authHeaders(),
        params: {
          year: filters.year || undefined,
          status: filters.status,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
        },
      });
      setReports(res.data);
      setCurrentPage(1);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("tour_admin_token");
        navigate("/admin");
        return;
      }
      showToast(err.response?.data?.message || "Reports could not be loaded.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem("tour_admin_token")) {
      navigate("/admin");
      return;
    }
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (id, status, rejection_reason = "") => {
    try {
      await axios.put(
        `${API_BASE_URL}/api/reports/${id}/status`,
        { status, rejection_reason },
        { headers: authHeaders() }
      );
      showToast(`Report ${status.toLowerCase()} successfully.`);
      loadReports();
    } catch (err) {
      showToast(err.response?.data?.message || "Status update failed.", "error");
    }
  };

  const submitRejection = async (e) => {
    e.preventDefault();
    const reason = rejectReason.trim();
    if (!reason) {
      showToast("Please enter rejection reason.", "error");
      return;
    }
    await updateStatus(rejectTarget.id, "Rejected", reason);
    setRejectTarget(null);
    setRejectReason("");
  };

  const logout = () => {
    localStorage.removeItem("tour_admin_token");
    localStorage.removeItem("tour_admin");
    navigate("/admin");
  };

  const goToPage = (page) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };
  const downloadExcel = () => {
    if (reports.length === 0) {
      showToast("No filtered reports available to download.", "error");
      return;
    }

    const columns = getExcelColumns(reports);
    const excelHeaders = columns.map((column) => column.label);
    const groupHeader = `<tr>${excelGroupHeaders(columns).map((group) => (
      `<th class="group" colspan="${group.count}">${excelValue(group.name)}</th>`
    )).join("")}</tr>`;
    const headerRow = `<tr>${excelHeaders.map((header) => `<th>${excelValue(header)}</th>`).join("")}</tr>`;
    const dataRows = reports.map((report) => (
      `<tr>${reportToExcelRow(report, columns).map((cell) => `<td>${excelValue(cell)}</td>`).join("")}</tr>`
    )).join("");
    const colGroup = `<colgroup>${columns.map((column) => `<col style="width:${column.width}px">`).join("")}</colgroup>`;
    const workbook = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8">
          <style>
            table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; vertical-align: top; white-space: normal; }
            th { background: #e2e8f0; color: #0f172a; font-weight: 700; text-align: center; }
            th.group { background: #4f46e5; color: #ffffff; font-size: 13px; }
            td { color: #1f2937; }
          </style>
        </head>
        <body>
          <table>${colGroup}<thead>${groupHeader}${headerRow}</thead><tbody>${dataRows}</tbody></table>
        </body>
      </html>
    `;
    const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tour-reports-${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Filtered reports downloaded.");
  };

  return (
    <main className="page">
      <Toast toast={toast} onClose={() => setToast({ message: "", type: toast.type })} />
      <div className="shell">
        <div className="topbar">
          <div>
            <div className="brand-heading">
              <img className="brand-logo" src="/nmdc.png" alt="NMDC" />
              <h1>Admin Dashboard</h1>
            </div>
            <p style={{ margin: "5px 0 0", color: "#64748b" }}>Review tour program reports</p>
          </div>
          <div className="actions">
            <button className="btn btn-danger" onClick={logout} type="button"><span className="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M10 17v2H5V5h5v2H7v10h3Zm4.6-1.4-1.4-1.4 2.2-2.2H10v-2h5.4l-2.2-2.2 1.4-1.4L19.4 11l-4.8 4.6Z" /></svg></span> Logout</button>
          </div>
        </div>

        <div className="card">
          <div className="filters">
            <div>
              <label>Year</label>
              <input value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
            </div>
            <div>
              <label>Status</label>
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="all">All</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label>From Date</label>
              <input type="date" value={filters.fromDate} onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })} />
            </div>
            <div>
              <label>To Date</label>
              <input type="date" value={filters.toDate} onChange={(e) => setFilters({ ...filters, toDate: e.target.value })} />
            </div>
          </div>
          <div className="actions">
            <button className="btn btn-muted" type="button" onClick={() => setFilters({ year: "", status: "all", fromDate: "", toDate: "" })}>Clear</button>
            <button className="btn btn-muted" type="button" onClick={downloadExcel} disabled={loading || reports.length === 0}>Download Excel</button>
            <button className="btn btn-primary" type="button" onClick={loadReports}>Apply</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Tour</th>
                <th>Travel</th>
                <th>Files</th>
                <th>Status</th>
                <th>Reason</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8">Loading...</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan="8">No reports found.</td></tr>
              ) : visibleReports.map((report) => (
                <tr key={report.id}>
                  <td>{formatDate(reportDate(report))}</td>
                  <td>
                    <strong>{report.name}</strong><br />
                    SAP: {report.sap_id}<br />
                    {report.designation}, {report.grade}<br />
                    Dept: {report.department}
                  </td>
                  <td>
                    <strong>{report.purpose}</strong><br />
                    {medicalSummary(report).map((item) => (<span key={item}>{item}<br /></span>))}
                    {formatDate(report.start_date)} to {formatDate(report.end_date)}<br />
                    {report.start_place} to {report.destination}
                  </td>
                  <td>
                    {report.mode_of_travel}<br />
                    Weekly off: {report.weekly_off}<br />
                    Authority: {report.approving_authority}
                  </td>
                  <td>
                    {reportFiles(report)}
                  </td>
                  <td><span className={`badge ${report.status}`}>{report.status}</span></td>
                  <td>{report.rejection_reason || "-"}</td>
                  <td>
                    {report.status === "Pending" ? (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button className="btn btn-success" type="button" onClick={() => updateStatus(report.id, "Approved")}>Approve</button>
                        <button className="btn btn-danger" type="button" onClick={() => setRejectTarget(report)}>Reject</button>
                      </div>
                    ) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && reports.length > 0 && (
          <div className="pagination-bar">
            <span>
              Showing {pageStart + 1}-{Math.min(pageStart + PAGE_SIZE, reports.length)} of {reports.length}
            </span>
            <div className="pagination-actions">
              <button className="btn btn-muted" type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
                Previous
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button className="btn btn-muted" type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {rejectTarget && (
        <div className="modal-backdrop">
          <form className="modal" onSubmit={submitRejection}>
            <h3>Rejection Reason</h3>
            <p style={{ color: "#64748b", marginTop: 0 }}>{rejectTarget.name} - {rejectTarget.destination}</p>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection"
              autoFocus
            />
            <div className="actions" style={{ marginTop: 14 }}>
              <button className="btn btn-muted" type="button" onClick={() => setRejectTarget(null)}>Cancel</button>
              <button className="btn btn-danger" type="submit">Reject Report</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}



















