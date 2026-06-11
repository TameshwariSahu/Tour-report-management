import { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";
import Toast from "../components/Toast";

export default function EmployeeLogin() {
  const [form, setForm] = useState({ sap_id: "", user_id: "", email: "", password: "", otp: "", access_type: "employee" });
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const location = useLocation();
  const navigate = useNavigate();

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast({ message: "", type }), 3500);
  };

  const update = (field, value) => {
    if (field === "sap_id") {
      setForm({ ...form, [field]: value.replace(/\D/g, "").slice(0, 8), otp: "" });
      setOtpSent(false);
      return;
    }
    if (field === "user_id") {
      setForm({ ...form, [field]: value.replace(/[^A-Za-z0-9]/g, "").slice(0, 20) });
      return;
    }
    if (field === "otp") {
      setForm({ ...form, [field]: value.replace(/\D/g, "").slice(0, 6) });
      return;
    }
    if (field === "email" || field === "access_type") {
      setForm({ ...form, [field]: value, otp: "", password: field === "access_type" ? "" : form.password });
      setOtpSent(false);
      return;
    }
    setForm({ ...form, [field]: value });
  };

  useEffect(() => {
    if (location.state?.accessType === "department") {
      update("access_type", "department");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const requestOtp = async (e) => {
    e?.preventDefault();
    if (form.sap_id.length !== 8) {
      showToast("SAP ID must be exactly 8 digits.", "error");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_BASE_URL}/api/employee/request-otp`, {
        sap_id: form.sap_id,
        email: form.email,
        access_type: form.access_type,
      });
      setOtpSent(true);
      showToast("OTP sent to registered email.");
    } catch (err) {
      showToast(err.response?.data?.message || "OTP could not be sent.", "error");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (form.otp.length !== 6) {
      showToast("Please enter the 6-digit OTP.", "error");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/employee/verify-otp`, form);
      localStorage.setItem("tour_employee_token", res.data.token);
      localStorage.setItem("tour_employee", JSON.stringify(res.data.employee));
      navigate("/form");
    } catch (err) {
      showToast(err.response?.data?.message || "Login failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const departmentLogin = async () => {
    if (!/^[A-Za-z0-9]{4,20}$/.test(form.user_id)) {
      showToast("User ID must be 4-20 letters/numbers.", "error");
      return;
    }
    if (!form.password) {
      showToast("Password is required.", "error");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/employee/department-login`, {
        user_id: form.user_id,
        password: form.password,
      });
      localStorage.setItem("tour_employee_token", res.data.token);
      localStorage.setItem("tour_employee", JSON.stringify(res.data.employee));
      navigate("/form");
    } catch (err) {
      showToast(err.response?.data?.message || "Department login failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  const login = async (e) => {
    e.preventDefault();
    if (form.access_type === "department") {
      await departmentLogin();
      return;
    }
    if (otpSent) {
      await verifyOtp();
      return;
    }
    await requestOtp();
  };

  return (
    <main className="page">
      <Toast toast={toast} onClose={() => setToast({ message: "", type: toast.type })} />
      <div className="form-shell">
        <div className="header">
          <div className="brand-heading">
            <img className="brand-logo" src="/logo.svg" alt="Tour Report Management" />
            <h1>{form.access_type === "department" ? "Department Login" : "Employee Login"}</h1>
          </div>
          <p>{form.access_type === "department" ? "Enter department User ID and password to open a department form." : "Enter registered SAP ID and email to continue your tour report."}</p>
          <div className="login-switch" aria-label="Login type">
            <button className={form.access_type === "employee" ? "active" : ""} type="button" onClick={() => update("access_type", "employee")}><span className="ui-icon" aria-hidden="true">E</span> Employee</button>
            <button className={form.access_type === "department" ? "active" : ""} type="button" onClick={() => update("access_type", "department")}><span className="ui-icon" aria-hidden="true">D</span> Department</button>
            <button type="button" onClick={() => navigate("/admin")}><span className="ui-icon" aria-hidden="true">U</span> User</button>
          </div>
        </div>

        <form className="card" onSubmit={login}>
          <div className="grid">
            <div>
              <label>{form.access_type === "department" ? "User ID *" : "SAP ID *"}</label>
              <input value={form.access_type === "department" ? form.user_id : form.sap_id} onChange={(e) => update(form.access_type === "department" ? "user_id" : "sap_id", e.target.value)} autoComplete="username" required placeholder={form.access_type === "department" ? "User ID" : "8-digit SAP ID"} />
            </div>
            {form.access_type === "department" ? (
              <div>
                <label>Password *</label>
                <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} autoComplete="current-password" required placeholder="department password" />
              </div>
            ) : (
              <div>
                <label>Email *</label>
                <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" required placeholder="registered email" />
              </div>
            )}
            {form.access_type !== "department" && otpSent && (
              <div>
                <label>OTP *</label>
                <input value={form.otp} onChange={(e) => update("otp", e.target.value)} autoComplete="one-time-code" required placeholder="6-digit OTP" />
              </div>
            )}
          </div>

          <div className="actions" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" disabled={loading} type="submit">
              {loading ? "Please wait..." : form.access_type === "department" ? "Sign In" : otpSent ? "Verify & Sign In" : "Send OTP"}
            </button>
            {form.access_type !== "department" && otpSent && (
              <button className="btn btn-muted" disabled={loading} type="button" onClick={requestOtp}>
                Resend OTP
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
