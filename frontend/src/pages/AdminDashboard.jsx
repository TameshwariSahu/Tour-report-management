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

const medicalSummary = (report) => {
  const details = [];
  if (report.medical_reference_no) details.push(`Ref: ${report.medical_reference_no}`);
  if (report.medical_reference_date) details.push(`Ref date: ${formatDate(report.medical_reference_date)}`);
  if (report.patient_name) details.push(`Patient: ${report.patient_name}`);
  if (report.patient_relation) details.push(`Relation: ${report.patient_relation}`);
  if (report.escort_employee_sap_id) details.push(`Escort SAP: ${report.escort_employee_sap_id}`);
  if (report.return_vehicle_required) details.push(`Return vehicle: ${report.return_vehicle_required}`);
  if (report.railway_availability) details.push(`Railway: ${report.railway_availability}`);
  return details;
};

const reportToExcelRow = (report) => [
  excelDate(report.created_at),
  report.sap_id,
  report.name,
  report.designation,
  report.grade,
  report.department,
  report.tour_type,
  report.purpose,
  report.medical_reference_no || "-",
  excelDate(report.medical_reference_date),
  report.patient_name || "-",
  report.patient_relation || "-",
  report.escort_employee_sap_id || "-",
  report.return_vehicle_required || "-",
  report.railway_availability || "-",
  excelDate(report.start_date),
  report.start_time || "-",
  report.start_place,
  excelDate(report.end_date),
  report.end_time || "-",
  report.destination,
  report.mode_of_travel,
  report.weekly_off,
  report.approving_authority,
  report.status,
  report.rejection_reason || "-",
];

const excelHeaders = [
  "Submitted Date",
  "SAP ID",
  "Employee Name",
  "Designation",
  "Grade",
  "Department",
  "Type of Tour",
  "Purpose",
  "Reference Letter No.",
  "Reference Letter Date",
  "Patient Name",
  "Patient Relation",
  "Escort Employee SAP ID",
  "Return Vehicle Required",
  "Railway Availability",
  "Start Date",
  "Start Time",
  "Started From",
  "End Date",
  "End Time",
  "Destination",
  "Mode of Travel",
  "Weekly Off",
  "Approving Authority",
  "Status",
  "Rejection Reason",
];

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

    const rows = [excelHeaders, ...reports.map(reportToExcelRow)];
    const tableRows = rows.map((row) => (
      `<tr>${row.map((cell) => `<td>${excelValue(cell)}</td>`).join("")}</tr>`
    )).join("");
    const workbook = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8"></head>
        <body><table>${tableRows}</table></body>
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
              <img className="brand-logo" src="/logo.svg" alt="Tour Report Management" />
              <h1>Admin Dashboard</h1>
            </div>
            <p style={{ margin: "5px 0 0", color: "#64748b" }}>Review tour program reports</p>
          </div>
          <div className="actions">
            <button className="btn btn-danger" onClick={logout} type="button"><span className="btn-icon" aria-hidden="true">-&gt;</span> Logout</button>
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
                  <td>{formatDate(report.created_at)}</td>
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










