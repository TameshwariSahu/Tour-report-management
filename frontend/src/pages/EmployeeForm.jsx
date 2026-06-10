import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, employeeAuthHeaders } from "../api";
import Toast from "../components/Toast";

const initialForm = {
  name: "",
  designation: "",
  grade: "",
  department: "",
  tour_type: "",
  purpose: "",
  referred_hospital_name: "",
  medical_reference_no: "",
  medical_reference_date: "",
  patient_name: "",
  patient_relation: "",
  escort_employee_sap_id: "",
  return_vehicle_required: "",
  railway_availability: "",
  leave_availed: "",
  leave_details: "",
  start_date: "",
  start_time: "",
  start_period: "AM",
  start_place: "",
  end_date: "",
  end_time: "",
  end_period: "AM",
  destination: "",
  mode_of_travel: "",
  weekly_off: "",
  approving_authority: "",
};

const toDateInput = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const toTimeInput = (value) => {
  if (!value) return "";
  return String(value).slice(0, 5);
};

const normalizeTime = (value, period = "") => {
  let raw = String(value || "").trim().toUpperCase();
  if (!raw) return "";

  const suffixMatch = raw.match(/\s*(AM|PM)$/);
  const effectivePeriod = suffixMatch ? suffixMatch[1] : period;
  if (suffixMatch) {
    raw = raw.replace(/\s*(AM|PM)$/, "").trim();
  }

  let hours;
  let minutes;

  if (/^\d{1,2}$/.test(raw)) {
    hours = Number(raw);
    minutes = 0;
  } else if (/^\d{3,4}$/.test(raw)) {
    const padded = raw.padStart(4, "0");
    hours = Number(padded.slice(0, 2));
    minutes = Number(padded.slice(2));
  } else {
    const match = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return "";
    hours = Number(match[1]);
    minutes = Number(match[2]);
  }

  if (effectivePeriod) {
    if (hours < 1 || hours > 12) return "";
    if (effectivePeriod === "AM") {
      hours = hours === 12 ? 0 : hours;
    } else {
      hours = hours === 12 ? 12 : hours + 12;
    }
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return "";
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

export default function EmployeeForm() {
  const [form, setForm] = useState(initialForm);
  const [employee, setEmployee] = useState(null);
  const [reports, setReports] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [approvalNote, setApprovalNote] = useState(null);
  const [supportingDocs, setSupportingDocs] = useState([]);
  const [masters, setMasters] = useState({ grades: [], departments: [], destinations: [] });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const navigate = useNavigate();

  const locked = activeReport?.status === "Approved" || activeReport?.status === "Pending";
  const canSubmit = !activeReport || ["Draft", "Rejected"].includes(activeReport.status);
  const hasExistingApprovalNote = Boolean(activeReport?.approval_note_path);
  const activeOpenReport = reports.find((report) => ["Draft", "Pending", "Rejected"].includes(report.status));
  const isMedicalSelf = form.tour_type === "Medical(Self)";
  const isEscortDuty = form.tour_type === "Medical (Escort Duty)";
  const isMedicalTour = isMedicalSelf || isEscortDuty;

  const latestEditable = useMemo(
    () => reports.find((report) => ["Draft", "Rejected"].includes(report.status)),
    [reports]
  );

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast({ message: "", type }), 3500);
  };

  const fillFromEmployee = (data) => {
    setForm((current) => ({
      ...current,
      name: data.name || "",
      designation: data.designation || "",
      grade: data.grade || "",
      department: data.department || "",
    }));
  };

  const fillFromReport = (report) => {
    setActiveReport(report);
    setForm({
      name: report.name || "",
      designation: report.designation || "",
      grade: report.grade || "",
      department: report.department || "",
      tour_type: report.tour_type || "",
      purpose: report.purpose || "",
      referred_hospital_name: report.referred_hospital_name || "",
      medical_reference_no: report.medical_reference_no || "",
      medical_reference_date: toDateInput(report.medical_reference_date),
      patient_name: report.patient_name || "",
      patient_relation: report.patient_relation || "",
      escort_employee_sap_id: report.escort_employee_sap_id || "",
      return_vehicle_required: report.return_vehicle_required || "",
      railway_availability: report.railway_availability || "",
      leave_availed: report.leave_availed || "",
      leave_details: report.leave_details || "",
      start_date: toDateInput(report.start_date),
      start_time: toTimeInput(report.start_time),
      start_period: "",
      start_place: report.start_place || "",
      end_date: toDateInput(report.end_date),
      end_time: toTimeInput(report.end_time),
      end_period: "",
      destination: report.destination || "",
      mode_of_travel: report.mode_of_travel || "",
      weekly_off: report.weekly_off || "",
      approving_authority: report.approving_authority || "",
    });
    setApprovalNote(null);
    setSupportingDocs([]);
  };

  const update = (field, value) => {
    if (field === "tour_type") {
      setForm((current) => ({
        ...current,
        tour_type: value,
        patient_name: value === "Medical (Escort Duty)" ? current.patient_name : "",
        patient_relation: value === "Medical (Escort Duty)" ? current.patient_relation : "",
        escort_employee_sap_id: value === "Medical (Escort Duty)" ? current.escort_employee_sap_id : "",
        referred_hospital_name: value === "Medical(Self)" || value === "Medical (Escort Duty)" ? current.referred_hospital_name : "",
        medical_reference_no: value === "Medical(Self)" || value === "Medical (Escort Duty)" ? current.medical_reference_no : "",
        medical_reference_date: value === "Medical(Self)" || value === "Medical (Escort Duty)" ? current.medical_reference_date : "",
        return_vehicle_required: value === "Medical(Self)" || value === "Medical (Escort Duty)" ? current.return_vehicle_required : "",
        railway_availability: value === "Medical(Self)" || value === "Medical (Escort Duty)" ? current.railway_availability : "",
        leave_availed: value === "Medical(Self)" || value === "Medical (Escort Duty)" ? current.leave_availed : "",
        leave_details: value === "Medical(Self)" || value === "Medical (Escort Duty)" ? current.leave_details : "",
      }));
      return;
    }

    setForm({ ...form, [field]: value });
  };

  const logout = () => {
    localStorage.removeItem("tour_employee_token");
    localStorage.removeItem("tour_employee");
    navigate("/");
  };

  const loadReports = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/reports/employee`, {
      headers: employeeAuthHeaders(),
    });
    setReports(res.data);
    return res.data;
  };

  useEffect(() => {
    const token = localStorage.getItem("tour_employee_token");
    const storedEmployee = localStorage.getItem("tour_employee");
    if (!token || !storedEmployee) {
      navigate("/");
      return;
    }

    const parsedEmployee = JSON.parse(storedEmployee);
    setEmployee(parsedEmployee);
    fillFromEmployee(parsedEmployee);

    const loadInitialData = async () => {
      try {
        const [masterRes, reportRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/masters`),
          axios.get(`${API_BASE_URL}/api/reports/employee`, { headers: employeeAuthHeaders() }),
        ]);
        setMasters(masterRes.data);
        setReports(reportRes.data);
      } catch (err) {
        if (err.response?.status === 401) {
          logout();
          return;
        }
        showToast("Initial data could not be loaded.", "error");
      }
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeReport && latestEditable) {
      fillFromReport(latestEditable);
    }
  }, [latestEditable, activeReport]);

  const validateBeforeSubmit = () => {
    if (form.start_date && form.end_date && new Date(form.start_date) > new Date(form.end_date)) {
      showToast("End date cannot be before start date.", "error");
      return false;
    }

    if ((form.start_time && !normalizeTime(form.start_time)) || (form.end_time && !normalizeTime(form.end_time))) {
      showToast("Please enter valid time.", "error");
      return false;
    }

    const startTime = normalizeTime(form.start_time);
    const endTime = normalizeTime(form.end_time);

    if (form.start_date === form.end_date && startTime && endTime && startTime >= endTime) {
      showToast("End time must be after start time for same-day tour.", "error");
      return false;
    }

    if (form.start_date && form.end_date && startTime && endTime) {
      const start = new Date(`${form.start_date}T${startTime}`);
      const end = new Date(`${form.end_date}T${endTime}`);
      const durationHours = (end - start) / (1000 * 60 * 60);

      if (durationHours <= 0) {
      showToast("End date/time must be after start date/time.", "error");
      return false;
    }
    }

    if (!approvalNote && !hasExistingApprovalNote) {
      showToast("Approval note is required.", "error");
      return false;
    }

    return true;
  };

  const payload = () => {
    const data = new FormData();
    const formFields = { ...form };
    delete formFields.start_period;
    delete formFields.end_period;
    Object.entries({
      ...formFields,
      start_time: normalizeTime(form.start_time),
      end_time: normalizeTime(form.end_time),
    }).forEach(([key, value]) => data.append(key, value ?? ""));

    if (approvalNote) data.append("approval_note", approvalNote);
    supportingDocs.forEach((file) => data.append("supporting_documents", file));
    return data;
  };

  const saveDraft = async () => {
    if (locked) return;

    try {
      setLoading(true);
      const body = payload();
      const url = activeReport ? `${API_BASE_URL}/api/reports/${activeReport.id}/draft` : `${API_BASE_URL}/api/reports/draft`;
      const method = activeReport ? "put" : "post";
      await axios[method](url, body, { headers: employeeAuthHeaders() });
      showToast("Draft saved successfully.");
      const updatedReports = await loadReports();
      const current = updatedReports.find((report) => report.id === activeReport?.id) || updatedReports[0];
      if (current) fillFromReport(current);
    } catch (err) {
      showToast(err.response?.data?.message || "Draft could not be saved.", "error");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit || !validateBeforeSubmit()) return;

    try {
      setLoading(true);
      const body = payload();
      const url = activeReport ? `${API_BASE_URL}/api/reports/${activeReport.id}/submit` : `${API_BASE_URL}/api/reports/submit`;
      const method = activeReport ? "put" : "post";
      await axios[method](url, body, { headers: employeeAuthHeaders() });
      showToast("Tour report submitted successfully.");
      const updatedReports = await loadReports();
      const current = updatedReports.find((report) => report.id === activeReport?.id) || updatedReports[0];
      if (current) fillFromReport(current);
    } catch (err) {
      showToast(err.response?.data?.message || "Submission failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <Toast toast={toast} onClose={() => setToast({ message: "", type: toast.type })} />
      <div className="form-shell">
        <div className="topbar">
          <div>
            <div className="brand-heading">
              <img className="brand-logo" src="/logo.svg" alt="Tour Report Management" />
              <h1>Tour Program Details</h1>
            </div>
            <p style={{ margin: "5px 0 0", color: "#64748b" }}>
              {employee ? `${employee.name} | SAP ${employee.sap_id}` : "Employee form"}
            </p>
          </div>
          <div className="actions">
            <button className="btn btn-danger" type="button" onClick={logout}><span className="btn-icon" aria-hidden="true">-&gt;</span> Logout</button>
          </div>
        </div>

        {activeReport && (
          <div className="card">
            <strong>Status: </strong><span className={`badge ${activeReport.status}`}>{activeReport.status}</span>
            {activeReport.status === "Rejected" && (
              <p style={{ marginBottom: 0, color: "#991b1b" }}>Reason: {activeReport.rejection_reason}</p>
            )}
            {locked && (
              <p style={{ marginBottom: 0, color: "#64748b" }}>This report is locked for editing.</p>
            )}
          </div>
        )}

        {activeOpenReport && !activeReport && (
          <div className="card">
            <p style={{ margin: 0, color: "#64748b" }}>
              Continue your existing {activeOpenReport.status.toLowerCase()} report before creating a new one.
            </p>
          </div>
        )}

        <form onSubmit={submit}>
          <div className="section-title">Employee Details</div>
          <div className="card employee-details-card">
            <div className="grid">
              <div>
                <label>SAP ID</label>
                <input className="db-field" value={employee?.sap_id || ""} disabled />
              </div>
              <div>
                <label>Name *</label>
                <input className="db-field" value={form.name} onChange={(e) => update("name", e.target.value)} required disabled />
              </div>
              <div>
                <label>Designation *</label>
                <input className="db-field" value={form.designation} onChange={(e) => update("designation", e.target.value)} required disabled />
              </div>
              <div>
                <label>Grade *</label>
                <select className="db-field" value={form.grade} onChange={(e) => update("grade", e.target.value)} required disabled>
                  <option value="">Choose</option>
                  {masters.grades.map((grade) => (
                    <option key={grade.id} value={grade.grade_name}>{grade.grade_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Department *</label>
                <select className="db-field" value={form.department} onChange={(e) => update("department", e.target.value)} required disabled>
                  <option value="">Choose</option>
                  {masters.departments.map((department) => (
                    <option key={department.id} value={department.department_name}>{department.department_name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="section-title">Official Tour Details</div>
          <div className="card">
            <div className="form-subsection">
              <h3>Tour Information</h3>
              <div className="grid">
                <div>
                  <label>Type of Tour *</label>
                  <select value={form.tour_type} onChange={(e) => update("tour_type", e.target.value)} required disabled={locked}>
                    <option value="">Choose</option>
                    <option value="Official">Official</option>
                    <option value="Medical(Self)">Medical(Self)</option>
                    <option value="Medical (Escort Duty)">Medical (Escort Duty)</option>
                  </select>
                </div>
                <div>
                  <label>Purpose of Official Tour *</label>
                  <input value={form.purpose} onChange={(e) => update("purpose", e.target.value)} required disabled={locked} />
                </div>
              </div>
            </div>

            {isMedicalTour && (
              <div className="form-subsection medical-tour-details">
                <h3>{isEscortDuty ? "Escort Duty Details" : "Self Medical Tour Details"}</h3>
                {isMedicalSelf && <p className="section-hint">Enter details for self-treatment availed at referred hospital.</p>}
                <div className="grid">
                  {isEscortDuty && (
                    <>
                      <div>
                        <label>Name of Patient *</label>
                        <input value={form.patient_name} onChange={(e) => update("patient_name", e.target.value)} required={isEscortDuty} disabled={locked} />
                      </div>
                      <div>
                        <label>Relation with Patient *</label>
                        <select value={form.patient_relation} onChange={(e) => update("patient_relation", e.target.value)} required={isEscortDuty} disabled={locked}>
                          <option value="">Choose</option>
                          {["Self", "Spouse", "Father", "Mother", "Son", "Daughter", "Dependent", "Other"].map((relation) => (
                            <option key={relation} value={relation}>{relation}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label>Escort Employee SAP ID</label>
                        <input value={form.escort_employee_sap_id} onChange={(e) => update("escort_employee_sap_id", e.target.value.replace(/\D/g, "").slice(0, 8))} disabled={locked} placeholder="8-digit SAP ID" />
                      </div>
                    </>
                  )}
                  <div>
                    <label>Referred Hospital Name *</label>
                    <input value={form.referred_hospital_name} onChange={(e) => update("referred_hospital_name", e.target.value)} required={isMedicalTour} disabled={locked} />
                  </div>
                  <div>
                    <label>Reference letter no. *</label>
                    <input value={form.medical_reference_no} onChange={(e) => update("medical_reference_no", e.target.value)} required={isMedicalTour} disabled={locked} />
                  </div>
                  <div>
                    <label>Reference letter date *</label>
                    <input type="date" value={form.medical_reference_date} onChange={(e) => update("medical_reference_date", e.target.value)} required={isMedicalTour} disabled={locked} />
                  </div>
                  <div>
                    <label>Trip Start Date *</label>
                    <input type="date" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} required={isMedicalTour} disabled={locked} />
                  </div>
                  <div>
                    <label>Trip begins at (hh:mm) *</label>
                    <input type="time" value={form.start_time} onChange={(e) => update("start_time", e.target.value)} required={isMedicalTour} disabled={locked} />
                  </div>
                  <div>
                    <label>Trip Started from *</label>
                    <input value={form.start_place} onChange={(e) => update("start_place", e.target.value)} required={isMedicalTour} disabled={locked} />
                  </div>
                  <div>
                    <label>Trip End Date *</label>
                    <input type="date" value={form.end_date} onChange={(e) => update("end_date", e.target.value)} required={isMedicalTour} disabled={locked} />
                  </div>
                  <div>
                    <label>Trip ends at (hh:mm) *</label>
                    <input type="time" value={form.end_time} onChange={(e) => update("end_time", e.target.value)} required={isMedicalTour} disabled={locked} />
                  </div>
                  <div>
                    <label>Destination *</label>
                    <input value={form.destination} onChange={(e) => update("destination", e.target.value)} required={isMedicalTour} disabled={locked} placeholder="Enter destination" />
                  </div>
                  <div>
                    <label>Mode of Travel *</label>
                    <select value={form.mode_of_travel} onChange={(e) => update("mode_of_travel", e.target.value)} required={isMedicalTour} disabled={locked}>
                      <option value="">Choose</option>
                      {["Flight", "Hired Vehicle + Flight", "Hired Vehicle", "Train", "Bus"].map((mode) => (
                        <option key={mode} value={mode}>{mode}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Weekly off on *</label>
                    <select value={form.weekly_off} onChange={(e) => update("weekly_off", e.target.value)} required={isMedicalTour} disabled={locked}>
                      <option value="">Choose</option>
                      {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                        <option key={day} value={day}>{day}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label>Any leaves availed in between *</label>
                    <select value={form.leave_availed} onChange={(e) => update("leave_availed", e.target.value)} required={isMedicalTour} disabled={locked}>
                      <option value="">Choose</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  {form.leave_availed === "Yes" && (
                    <div>
                      <label>If any leaves availed in between, write the start date and end date</label>
                      <input value={form.leave_details} onChange={(e) => update("leave_details", e.target.value)} disabled={locked} placeholder="Example: 10.06.2026 to 12.06.2026" />
                    </div>
                  )}
                  <div>
                    <label>Any return vehicle to be taken? *</label>
                    <select value={form.return_vehicle_required} onChange={(e) => update("return_vehicle_required", e.target.value)} required={isMedicalTour} disabled={locked}>
                      <option value="">Choose</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <label>If by railway, mention waitlist/available train details</label>
                    <input value={form.railway_availability} onChange={(e) => update("railway_availability", e.target.value)} disabled={locked} />
                  </div>
                </div>
              </div>
            )}
            <div className="form-subsection">
              <h3>Route and Travel</h3>
              <div className="grid">
                <div>
                  <label>Trip Started From *</label>
                  <input value={form.start_place} onChange={(e) => update("start_place", e.target.value)} required disabled={locked} />
                </div>
                <div>
                  <label>Destination *</label>
                  <input value={form.destination} onChange={(e) => update("destination", e.target.value)} required disabled={locked} placeholder="Enter destination" />
                </div>
                <div>
                  <label>Mode of Travel *</label>
                  <select value={form.mode_of_travel} onChange={(e) => update("mode_of_travel", e.target.value)} required disabled={locked}>
                    <option value="">Choose</option>
                    {["Flight", "Hired Vehicle + Flight", "Hired Vehicle", "Train", "Bus"].map((mode) => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Weekly Off On *</label>
                  <select value={form.weekly_off} onChange={(e) => update("weekly_off", e.target.value)} required disabled={locked}>
                    <option value="">Choose</option>
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-subsection">
              <h3>Trip Schedule</h3>
              <div className="grid">
                <div>
                  <label>Start Date *</label>
                  <input type="date" value={form.start_date} onChange={(e) => update("start_date", e.target.value)} required disabled={locked} />
                </div>
                <div>
                  <label>Trip begins at</label>
                  <input type="time" value={form.start_time} onChange={(e) => update("start_time", e.target.value)} required disabled={locked} />
                </div>
                <div>
                  <label>End Date *</label>
                  <input type="date" value={form.end_date} onChange={(e) => update("end_date", e.target.value)} required disabled={locked} />
                </div>
                <div>
                  <label>Trip ends at</label>
                  <input type="time" value={form.end_time} onChange={(e) => update("end_time", e.target.value)} required disabled={locked} />
                </div>
              </div>
            </div>
          </div>

          <div className="section-title">Approved Tour Program</div>
          <div className="card">
            <div className="grid">
              <div>
                <label>Approving Authority *</label>
                <select value={form.approving_authority} onChange={(e) => update("approving_authority", e.target.value)} required disabled={locked}>
                  <option value="">Choose</option>
                  <option value="Head of Department">Head of Department</option>
                  <option value="Head of Projec">Head of Project</option>
                </select>
              </div>
              <div>
                <label>Upload Approval Note * PDF/JPG/PNG</label>
                {hasExistingApprovalNote && <p style={{ marginTop: 0, color: "#64748b" }}>Existing file saved. Upload again only if replacing.</p>}
                <input type="file" accept=".pdf,image/png,image/jpeg" onChange={(e) => setApprovalNote(e.target.files?.[0] || null)} disabled={locked} />
              </div>
              <div>
                <label>Supporting Documents PDF/JPG/PNG, max 3</label>
                <input type="file" accept=".pdf,image/png,image/jpeg" multiple onChange={(e) => setSupportingDocs(Array.from(e.target.files || []).slice(0, 3))} disabled={locked} />
              </div>
            </div>
          </div>

          <div className="actions">
            <button className="btn btn-muted" disabled={loading || locked} type="button" onClick={saveDraft}>Save Draft</button>
            <button className="btn btn-primary" disabled={loading || !canSubmit} type="submit">
              {loading ? "Saving..." : activeReport?.status === "Rejected" ? "Resubmit" : "Submit"}
            </button>
          </div>
        </form>

        <div className="card" style={{ marginTop: 14 }}>
          <h3 style={{ marginTop: 0 }}>My Reports</h3>
          {reports.length === 0 ? (
            <p style={{ color: "#64748b" }}>No reports yet.</p>
          ) : (
            <div className="mini-list">
              {reports.map((report) => (
                <button className="mini-item" key={report.id} type="button" onClick={() => fillFromReport(report)}>
                  <span>{report.destination || "Draft report"}</span>
                  <span className={`badge ${report.status}`}>{report.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
















