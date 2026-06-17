import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";
import Toast from "../components/Toast";

export default function EmployeeLogin() {
  const [form, setForm] = useState({ sap_id: "", email: "", otp: "", access_type: "employee" });
  const [otpSent, setOtpSent] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const navigate = useNavigate();

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast({ message: "", type }), 3500);
  };

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const update = (field, value) => {
    if (field === "sap_id") {
      setForm({ ...form, [field]: value.replace(/\D/g, "").slice(0, 8), otp: "" });
      setOtpSent(false);
      setResendSeconds(0);
      return;
    }
    if (field === "otp") {
      setForm({ ...form, [field]: value.replace(/\D/g, "").slice(0, 6) });
      return;
    }
    if (field === "email" || field === "access_type") {
      setForm({ ...form, [field]: value, otp: "" });
      setOtpSent(false);
      setResendSeconds(0);
      return;
    }
    setForm({ ...form, [field]: value });
  };

  const requestOtp = async (e) => {
    e?.preventDefault();
    if (form.sap_id.length !== 8) {
      showToast("SAP ID must be exactly 8 digits.", "error");
      return;
    }

    if (resendSeconds > 0) {
      showToast(`Please wait ${resendSeconds} seconds before requesting another OTP.`, "error");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/employee/request-otp`, {
        sap_id: form.sap_id,
        email: form.email,
        access_type: form.access_type,
      });
      setOtpSent(true);
      setResendSeconds(Number(res.data?.retry_after || 60));
      showToast("OTP sent to registered email.");
    } catch (err) {
      if (err.response?.status === 429 && err.response?.data?.retry_after) {
        setResendSeconds(Number(err.response.data.retry_after));
      }
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

  const login = async (e) => {
    e.preventDefault();
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
            <img className="brand-logo" src="/nmdc.png" alt="NMDC" />
            <h1>Employee Login</h1>
          </div>
          <p>Enter registered SAP ID and email to continue your tour report.</p>
          <div className="login-switch" aria-label="Login type">
            <button className={form.access_type === "employee" ? "active" : ""} type="button" onClick={() => update("access_type", "employee")}><span className="ui-icon" aria-hidden="true">E</span> Employee</button>
            <button type="button" onClick={() => navigate("/admin")}><span className="ui-icon" aria-hidden="true">U</span> User</button>
          </div>
        </div>

        <form className="card" onSubmit={login}>
          <div className="grid">
            <div>
              <label>SAP ID *</label>
              <input value={form.sap_id} onChange={(e) => update("sap_id", e.target.value)} autoComplete="username" required placeholder="8-digit SAP ID" />
            </div>
            <div>
              <label>Email *</label>
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} autoComplete="email" required placeholder="registered email" />
            </div>
            {otpSent && (
              <div>
                <label>OTP *</label>
                <input value={form.otp} onChange={(e) => update("otp", e.target.value)} autoComplete="one-time-code" required placeholder="6-digit OTP" />
              </div>
            )}
          </div>

          <div className="actions" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" disabled={loading} type="submit">
              {loading ? "Please wait..." : otpSent ? "Verify & Sign In" : "Send OTP"}
            </button>
            {otpSent && (
              <button className="btn btn-muted" disabled={loading || resendSeconds > 0} type="button" onClick={requestOtp}>
                {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend OTP"}
              </button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
