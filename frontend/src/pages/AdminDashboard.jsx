import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, authHeaders } from "../api";
import Toast from "../components/Toast";

const currentYear = new Date().getFullYear();
const PAGE_SIZE = 10;
const emptyEmployeeForm = {
  sap_id: "",
  name: "",
  email: "",
  designation: "",
  grade: "",
  department: "",
  status: "active",
};
const emptyDepartmentForm = {
  department_name: "",
  status: "active",
};
const emptyDepartmentUserForm = {
  user_id: "",
  password: "",
  department_name: "",
  status: "active",
};

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
  const [activeTab, setActiveTab] = useState("reports");
  const [reports, setReports] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [departmentUsers, setDepartmentUsers] = useState([]);
  const [masterData, setMasterData] = useState({ grades: [], departments: [] });
  const [employeeForm, setEmployeeForm] = useState(emptyEmployeeForm);
  const [departmentForm, setDepartmentForm] = useState(emptyDepartmentForm);
  const [departmentUserForm, setDepartmentUserForm] = useState(emptyDepartmentUserForm);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [editingDepartmentUserId, setEditingDepartmentUserId] = useState(null);
  const [filters, setFilters] = useState({
    year: String(currentYear),
    status: "all",
    fromDate: "",
    toDate: "",
  });
  const [loading, setLoading] = useState(true);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [departmentLoading, setDepartmentLoading] = useState(false);
  const [departmentUserLoading, setDepartmentUserLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const navigate = useNavigate();

  const totalPages = Math.max(1, Math.ceil(reports.length / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleReports = reports.slice(pageStart, pageStart + PAGE_SIZE);
  const departmentOptions = masterData.departments.some((department) => department.department_name === employeeForm.department)
    ? masterData.departments
    : [
      ...masterData.departments,
      ...(employeeForm.department ? [{ id: "current", department_name: employeeForm.department }] : []),
    ];
  const departmentUserOptions = masterData.departments.some((department) => department.department_name === departmentUserForm.department_name)
    ? masterData.departments
    : [
      ...masterData.departments,
      ...(departmentUserForm.department_name ? [{ id: "current-user-dept", department_name: departmentUserForm.department_name }] : []),
    ];

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

  const loadMasters = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/masters`);
      setMasterData({
        grades: res.data.grades || [],
        departments: res.data.departments || [],
      });
    } catch {
      setMasterData({ grades: [], departments: [] });
    }
  };

  const loadEmployees = async () => {
    try {
      setEmployeeLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/admin/employees`, { headers: authHeaders() });
      setEmployees(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("tour_admin_token");
        navigate("/admin");
        return;
      }
      showToast(err.response?.data?.message || "Employees could not be loaded.", "error");
    } finally {
      setEmployeeLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      setDepartmentLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/admin/departments`, { headers: authHeaders() });
      setDepartments(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("tour_admin_token");
        navigate("/admin");
        return;
      }
      showToast(err.response?.data?.message || "Departments could not be loaded.", "error");
    } finally {
      setDepartmentLoading(false);
    }
  };

  const loadDepartmentUsers = async () => {
    try {
      setDepartmentUserLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/admin/department-users`, { headers: authHeaders() });
      setDepartmentUsers(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("tour_admin_token");
        navigate("/admin");
        return;
      }
      showToast(err.response?.data?.message || "Department users could not be loaded.", "error");
    } finally {
      setDepartmentUserLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem("tour_admin_token")) {
      navigate("/admin");
      return;
    }
    loadReports();
    loadMasters();
    loadEmployees();
    loadDepartments();
    loadDepartmentUsers();
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

  const saveEmployee = async (e) => {
    e.preventDefault();
    const payload = {
      ...employeeForm,
      sap_id: employeeForm.sap_id.trim(),
      name: employeeForm.name.trim(),
      email: employeeForm.email.trim(),
      designation: employeeForm.designation.trim(),
    };

    try {
      if (editingEmployeeId) {
        await axios.put(`${API_BASE_URL}/api/admin/employees/${editingEmployeeId}`, payload, { headers: authHeaders() });
        showToast("Employee updated successfully.");
      } else {
        await axios.post(`${API_BASE_URL}/api/admin/employees`, payload, { headers: authHeaders() });
        showToast("Employee added successfully.");
      }
      setEmployeeForm(emptyEmployeeForm);
      setEditingEmployeeId(null);
      loadEmployees();
    } catch (err) {
      showToast(err.response?.data?.message || "Employee could not be saved.", "error");
    }
  };

  const editEmployee = (employee) => {
    setEmployeeForm({
      sap_id: employee.sap_id || "",
      name: employee.name || "",
      email: employee.email || "",
      designation: employee.designation || "",
      grade: employee.grade || "",
      department: employee.department || "",
      status: employee.status || "active",
    });
    setEditingEmployeeId(employee.id);
    setActiveTab("employees");
  };

  const changeEmployeeStatus = async (employee) => {
    const nextStatus = employee.status === "active" ? "inactive" : "active";
    const confirmed = window.confirm(`Are you sure you want to mark ${employee.name} as ${nextStatus}?`);
    if (!confirmed) return;

    try {
      await axios.patch(
        `${API_BASE_URL}/api/admin/employees/${employee.id}/status`,
        { status: nextStatus },
        { headers: authHeaders() }
      );
      showToast(`Employee marked ${nextStatus}.`);
      loadEmployees();
    } catch (err) {
      showToast(err.response?.data?.message || "Employee status could not be changed.", "error");
    }
  };

  const saveDepartment = async (e) => {
    e.preventDefault();
    const payload = {
      ...departmentForm,
      department_name: departmentForm.department_name.trim(),
    };

    try {
      if (editingDepartmentId) {
        await axios.put(`${API_BASE_URL}/api/admin/departments/${editingDepartmentId}`, payload, { headers: authHeaders() });
        showToast("Department updated successfully.");
      } else {
        await axios.post(`${API_BASE_URL}/api/admin/departments`, payload, { headers: authHeaders() });
        showToast("Department added successfully.");
      }
      setDepartmentForm(emptyDepartmentForm);
      setEditingDepartmentId(null);
      loadDepartments();
      loadMasters();
    } catch (err) {
      showToast(err.response?.data?.message || "Department could not be saved.", "error");
    }
  };

  const editDepartment = (department) => {
    setDepartmentForm({
      department_name: department.department_name || "",
      status: department.status || "active",
    });
    setEditingDepartmentId(department.id);
    setActiveTab("departments");
  };

  const changeDepartmentStatus = async (department) => {
    const nextStatus = department.status === "active" ? "inactive" : "active";
    const confirmed = window.confirm(`Are you sure you want to mark ${department.department_name} as ${nextStatus}?`);
    if (!confirmed) return;

    try {
      await axios.patch(
        `${API_BASE_URL}/api/admin/departments/${department.id}/status`,
        { status: nextStatus },
        { headers: authHeaders() }
      );
      showToast(`Department marked ${nextStatus}.`);
      loadDepartments();
      loadMasters();
    } catch (err) {
      showToast(err.response?.data?.message || "Department status could not be changed.", "error");
    }
  };

  const saveDepartmentUser = async (e) => {
    e.preventDefault();
    const payload = {
      ...departmentUserForm,
      user_id: departmentUserForm.user_id.trim(),
      password: departmentUserForm.password,
      department_name: departmentUserForm.department_name.trim(),
    };

    try {
      if (editingDepartmentUserId) {
        await axios.put(`${API_BASE_URL}/api/admin/department-users/${editingDepartmentUserId}`, payload, { headers: authHeaders() });
        showToast("Department user updated successfully.");
      } else {
        await axios.post(`${API_BASE_URL}/api/admin/department-users`, payload, { headers: authHeaders() });
        showToast("Department user added successfully.");
      }
      setDepartmentUserForm(emptyDepartmentUserForm);
      setEditingDepartmentUserId(null);
      loadDepartmentUsers();
    } catch (err) {
      showToast(err.response?.data?.message || "Department user could not be saved.", "error");
    }
  };

  const editDepartmentUser = (user) => {
    setDepartmentUserForm({
      user_id: user.user_id || "",
      password: "",
      department_name: user.department_name || "",
      status: user.status || "active",
    });
    setEditingDepartmentUserId(user.id);
    setActiveTab("departmentUsers");
  };

  const changeDepartmentUserStatus = async (user) => {
    const nextStatus = user.status === "active" ? "inactive" : "active";
    const confirmed = window.confirm(`Are you sure you want to mark ${user.user_id} as ${nextStatus}?`);
    if (!confirmed) return;

    try {
      await axios.patch(
        `${API_BASE_URL}/api/admin/department-users/${user.id}/status`,
        { status: nextStatus },
        { headers: authHeaders() }
      );
      showToast(`Department user marked ${nextStatus}.`);
      loadDepartmentUsers();
    } catch (err) {
      showToast(err.response?.data?.message || "Department user status could not be changed.", "error");
    }
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
            <p style={{ margin: "5px 0 0", color: "#64748b" }}>Review reports and manage master data</p>
          </div>
          <div className="actions">
            <button className="btn btn-danger" onClick={logout} type="button"><span className="btn-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M10 17v2H5V5h5v2H7v10h3Zm4.6-1.4-1.4-1.4 2.2-2.2H10v-2h5.4l-2.2-2.2 1.4-1.4L19.4 11l-4.8 4.6Z" /></svg></span> Logout</button>
          </div>
        </div>

        <div className="admin-tabs" role="tablist" aria-label="Admin dashboard sections">
          <button className={activeTab === "reports" ? "active" : ""} type="button" onClick={() => setActiveTab("reports")}>Reports</button>
          <button className={activeTab === "employees" ? "active" : ""} type="button" onClick={() => setActiveTab("employees")}>Employees</button>
          <button className={activeTab === "departments" ? "active" : ""} type="button" onClick={() => setActiveTab("departments")}>Departments</button>
          <button className={activeTab === "departmentUsers" ? "active" : ""} type="button" onClick={() => setActiveTab("departmentUsers")}>Department Users</button>
        </div>

        {activeTab === "reports" && (
          <>
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
          </>
        )}

        {activeTab === "employees" && (
          <>
            <form className="card" onSubmit={saveEmployee}>
              <div className="section-head">
                <div>
                  <h2>{editingEmployeeId ? "Edit Employee" : "Add New Employee"}</h2>
                  <p>Maintain employee access data used for tour report login.</p>
                </div>
                {editingEmployeeId && (
                  <button
                    className="btn btn-muted"
                    type="button"
                    onClick={() => {
                      setEmployeeForm(emptyEmployeeForm);
                      setEditingEmployeeId(null);
                    }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              <div className="grid-3">
                <div>
                  <label>SAP ID</label>
                  <input
                    value={employeeForm.sap_id}
                    onChange={(e) => setEmployeeForm({ ...employeeForm, sap_id: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                    placeholder="8 digit SAP ID"
                    required
                  />
                </div>
                <div>
                  <label>Name</label>
                  <input value={employeeForm.name} onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })} required />
                </div>
                <div>
                  <label>Email</label>
                  <input type="email" value={employeeForm.email} onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })} required />
                </div>
                <div>
                  <label>Designation</label>
                  <input value={employeeForm.designation} onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })} required />
                </div>
                <div>
                  <label>Grade</label>
                  <select value={employeeForm.grade} onChange={(e) => setEmployeeForm({ ...employeeForm, grade: e.target.value })} required>
                    <option value="">Select grade</option>
                    {masterData.grades.map((grade) => (
                      <option key={grade.id} value={grade.grade_name}>{grade.grade_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Department</label>
                  <select value={employeeForm.department} onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })} required>
                    <option value="">Select department</option>
                    {departmentOptions.map((department) => (
                      <option key={department.id} value={department.department_name}>{department.department_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Status</label>
                  <select value={employeeForm.status} onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="actions form-actions">
                <button className="btn btn-primary" type="submit">{editingEmployeeId ? "Update Employee" : "Add Employee"}</button>
              </div>
            </form>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>SAP ID</th>
                    <th>Employee</th>
                    <th>Designation</th>
                    <th>Grade</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeLoading ? (
                    <tr><td colSpan="7">Loading...</td></tr>
                  ) : employees.length === 0 ? (
                    <tr><td colSpan="7">No employees found.</td></tr>
                  ) : employees.map((employee) => (
                    <tr key={employee.id}>
                      <td>{employee.sap_id}</td>
                      <td>
                        <strong>{employee.name}</strong><br />
                        {employee.email}
                      </td>
                      <td>{employee.designation}</td>
                      <td>{employee.grade}</td>
                      <td>{employee.department}</td>
                      <td><span className={`status-pill ${employee.status}`}>{employee.status}</span></td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-muted" type="button" onClick={() => editEmployee(employee)}>Edit</button>
                          <button
                            className={employee.status === "active" ? "btn btn-danger" : "btn btn-success"}
                            type="button"
                            onClick={() => changeEmployeeStatus(employee)}
                          >
                            {employee.status === "active" ? "Inactive" : "Active"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "departments" && (
          <>
            <form className="card" onSubmit={saveDepartment}>
              <div className="section-head">
                <div>
                  <h2>{editingDepartmentId ? "Edit Department" : "Add New Department"}</h2>
                  <p>Manage departments shown in employee and report forms.</p>
                </div>
                {editingDepartmentId && (
                  <button
                    className="btn btn-muted"
                    type="button"
                    onClick={() => {
                      setDepartmentForm(emptyDepartmentForm);
                      setEditingDepartmentId(null);
                    }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              <div className="grid">
                <div>
                  <label>Department Name</label>
                  <input
                    value={departmentForm.department_name}
                    onChange={(e) => setDepartmentForm({ ...departmentForm, department_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label>Status</label>
                  <select value={departmentForm.status} onChange={(e) => setDepartmentForm({ ...departmentForm, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="actions form-actions">
                <button className="btn btn-primary" type="submit">{editingDepartmentId ? "Update Department" : "Add Department"}</button>
              </div>
            </form>

            <div className="table-wrap">
              <table className="compact-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentLoading ? (
                    <tr><td colSpan="3">Loading...</td></tr>
                  ) : departments.length === 0 ? (
                    <tr><td colSpan="3">No departments found.</td></tr>
                  ) : departments.map((department) => (
                    <tr key={department.id}>
                      <td><strong>{department.department_name}</strong></td>
                      <td><span className={`status-pill ${department.status}`}>{department.status}</span></td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-muted" type="button" onClick={() => editDepartment(department)}>Edit</button>
                          <button
                            className={department.status === "active" ? "btn btn-danger" : "btn btn-success"}
                            type="button"
                            onClick={() => changeDepartmentStatus(department)}
                          >
                            {department.status === "active" ? "Inactive" : "Active"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "departmentUsers" && (
          <>
            <form className="card" onSubmit={saveDepartmentUser}>
              <div className="section-head">
                <div>
                  <h2>{editingDepartmentUserId ? "Edit Department User" : "Add New Department User"}</h2>
                  <p>Create and manage department login accounts.</p>
                </div>
                {editingDepartmentUserId && (
                  <button
                    className="btn btn-muted"
                    type="button"
                    onClick={() => {
                      setDepartmentUserForm(emptyDepartmentUserForm);
                      setEditingDepartmentUserId(null);
                    }}
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
              <div className="grid-3">
                <div>
                  <label>User ID</label>
                  <input
                    value={departmentUserForm.user_id}
                    onChange={(e) => setDepartmentUserForm({ ...departmentUserForm, user_id: e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 20).toUpperCase() })}
                    placeholder="DEPTCIT01"
                    required
                  />
                </div>
                <div>
                  <label>{editingDepartmentUserId ? "New Password" : "Password"}</label>
                  <input
                    type="password"
                    value={departmentUserForm.password}
                    onChange={(e) => setDepartmentUserForm({ ...departmentUserForm, password: e.target.value })}
                    placeholder={editingDepartmentUserId ? "Leave blank to keep same" : "Minimum 6 characters"}
                    required={!editingDepartmentUserId}
                  />
                </div>
                <div>
                  <label>Department</label>
                  <select
                    value={departmentUserForm.department_name}
                    onChange={(e) => setDepartmentUserForm({ ...departmentUserForm, department_name: e.target.value })}
                    required
                  >
                    <option value="">Select department</option>
                    {departmentUserOptions.map((department) => (
                      <option key={department.id} value={department.department_name}>{department.department_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Status</label>
                  <select value={departmentUserForm.status} onChange={(e) => setDepartmentUserForm({ ...departmentUserForm, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="actions form-actions">
                <button className="btn btn-primary" type="submit">{editingDepartmentUserId ? "Update Department User" : "Add Department User"}</button>
              </div>
            </form>

            <div className="table-wrap">
              <table className="compact-table">
                <thead>
                  <tr>
                    <th>User ID</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentUserLoading ? (
                    <tr><td colSpan="4">Loading...</td></tr>
                  ) : departmentUsers.length === 0 ? (
                    <tr><td colSpan="4">No department users found.</td></tr>
                  ) : departmentUsers.map((user) => (
                    <tr key={user.id}>
                      <td><strong>{user.user_id}</strong></td>
                      <td>{user.department_name}</td>
                      <td><span className={`status-pill ${user.status}`}>{user.status}</span></td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-muted" type="button" onClick={() => editDepartmentUser(user)}>Edit</button>
                          <button
                            className={user.status === "active" ? "btn btn-danger" : "btn btn-success"}
                            type="button"
                            onClick={() => changeDepartmentUserStatus(user)}
                          >
                            {user.status === "active" ? "Inactive" : "Active"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
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



















