import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, employeeAuthHeaders } from "../api";
import Toast from "../components/Toast";

const REPORTS_PAGE_SIZE = 6;
const reportStatusPriority = { Pending: 0, Rejected: 1, Draft: 2, Approved: 3 };

const filters = [
  { label: "All", value: "all" },
  { label: "Official", value: "Official" },
  { label: "Medical", value: "Medical(Self)" },
  { label: "Escort", value: "Medical (Escort Duty)" },
];

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const valueOrDash = (value) => value || "-";

const reportTitle = (report) => {
  if (report.tour_type === "Official") return report.purpose || report.destination || "Official tour";
  if (report.tour_type === "Medical(Self)") return report.referred_hospital_name || "Self medical tour";
  if (report.tour_type === "Medical (Escort Duty)") return report.patient_name || report.referred_hospital_name || "Escort duty";
  return report.destination || report.tour_type || "Report";
};

const reportFields = (report) => [
  ["SAP ID", report.sap_id],
  ["Destination", report.destination],
  ["Start Date", formatDate(report.start_date)],
];

const DetailGrid = ({ fields }) => (
  <div className="report-detail-grid">
    {fields.map(([label, value]) => (
      <div className="report-detail" key={label}>
        <span>{label}</span>
        <strong>{valueOrDash(value)}</strong>
      </div>
    ))}
  </div>
);

export default function EmployeeReports() {
  const [employee, setEmployee] = useState(null);
  const [reports, setReports] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [reportsPage, setReportsPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const navigate = useNavigate();

  const isDepartmentAccess = employee?.access_type === "department";

  const logout = () => {
    localStorage.removeItem("tour_employee_token");
    localStorage.removeItem("tour_employee");
    navigate("/");
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast({ message: "", type }), 3500);
  };

  useEffect(() => {
    const token = localStorage.getItem("tour_employee_token");
    const storedEmployee = localStorage.getItem("tour_employee");
    if (!token || !storedEmployee) {
      navigate("/");
      return;
    }

    setEmployee(JSON.parse(storedEmployee));

    const loadReports = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE_URL}/api/reports/employee`, {
          headers: employeeAuthHeaders(),
        });
        setReports(res.data);
      } catch (err) {
        if (err.response?.status === 401) {
          logout();
          return;
        }
        showToast(err.response?.data?.message || "Reports could not be loaded.", "error");
      } finally {
        setLoading(false);
      }
    };

    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => {
      const priorityDiff = (reportStatusPriority[a.status] ?? 99) - (reportStatusPriority[b.status] ?? 99);
      if (priorityDiff !== 0) return priorityDiff;
      return Number(b.id || 0) - Number(a.id || 0);
    }),
    [reports]
  );

  const approvedReports = useMemo(
    () => sortedReports.filter((report) => report.status === "Approved"),
    [sortedReports]
  );

  const filteredReports = useMemo(
    () => approvedReports.filter((report) => activeFilter === "all" || report.tour_type === activeFilter),
    [activeFilter, approvedReports]
  );

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / REPORTS_PAGE_SIZE));
  const pageStart = (reportsPage - 1) * REPORTS_PAGE_SIZE;
  const visibleReports = filteredReports.slice(pageStart, pageStart + REPORTS_PAGE_SIZE);

  useEffect(() => {
    setReportsPage(1);
  }, [activeFilter]);

  useEffect(() => {
    setReportsPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const goToReportsPage = (page) => {
    setReportsPage(Math.min(Math.max(page, 1), totalPages));
  };

  return (
    <main className="page">
      <Toast toast={toast} onClose={() => setToast({ message: "", type: toast.type })} />
      <div className="shell">
        <div className="topbar">
          <div>
            <div className="brand-heading">
              <img className="brand-logo" src="/nmdc.png" alt="NMDC" />
              <h1>Approved Reports</h1>
            </div>
            <p style={{ margin: "5px 0 0", color: "#64748b" }}>
              {employee ? (isDepartmentAccess ? `Department Login | User ID ${employee.user_id}` : `${employee.name} | SAP ${employee.sap_id}`) : "Report list"}
            </p>
          </div>
          <div className="actions">
            <button className="btn btn-muted" type="button" onClick={() => navigate("/form")}>Back to Form</button>
            <button className="btn btn-danger" type="button" onClick={logout}><span className="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M10 17v2H5V5h5v2H7v10h3Zm4.6-1.4-1.4-1.4 2.2-2.2H10v-2h5.4l-2.2-2.2 1.4-1.4L19.4 11l-4.8 4.6Z" /></svg></span> Logout</button>
          </div>
        </div>

        <div className="card">
          <div className="report-filter-bar" aria-label="Report filters">
            {filters.map((filter) => (
              <button
                className={activeFilter === filter.value ? "active" : ""}
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="card">
            <p style={{ margin: 0, color: "#64748b" }}>Loading reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="card">
            <p style={{ margin: 0, color: "#64748b" }}>No reports found.</p>
          </div>
        ) : (
          <>
            <div className="report-list">
              {visibleReports.map((report) => {
                return (
                  <article className="card report-card" key={report.id}>
                    <div className="report-card-header">
                      <div>
                        <h2>{reportTitle(report)}</h2>
                        <p>{formatDate(report.created_at)} | Report #{report.id}</p>
                      </div>
                      <span className={`badge ${report.status}`}>{report.status}</span>
                    </div>
                    <DetailGrid fields={reportFields(report)} />
                  </article>
                );
              })}
            </div>

            <div className="pagination-bar">
              <span>
                Showing {pageStart + 1}-{Math.min(pageStart + REPORTS_PAGE_SIZE, filteredReports.length)} of {filteredReports.length}
              </span>
              <div className="pagination-actions">
                <button className="btn btn-muted" type="button" onClick={() => goToReportsPage(reportsPage - 1)} disabled={reportsPage === 1}>
                  Previous
                </button>
                <span>Page {reportsPage} of {totalPages}</span>
                <button className="btn btn-muted" type="button" onClick={() => goToReportsPage(reportsPage + 1)} disabled={reportsPage === totalPages}>
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
