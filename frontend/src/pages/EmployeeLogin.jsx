import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";
import Toast from "../components/Toast";

export default function EmployeeLogin() {
  const [form, setForm] = useState({ sap_id: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const navigate = useNavigate();

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast({ message: "", type }), 3500);
  };

  const update = (field, value) => {
    if (field === "sap_id") {
      setForm({ ...form, [field]: value.replace(/\D/g, "").slice(0, 8) });
      return;
    }
    setForm({ ...form, [field]: value });
  };

  const login = async (e) => {
    e.preventDefault();
    if (form.sap_id.length !== 8) {
      showToast("SAP ID must be exactly 8 digits.", "error");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/employee/login`, form);
      localStorage.setItem("tour_employee_token", res.data.token);
      localStorage.setItem("tour_employee", JSON.stringify(res.data.employee));
      navigate("/form");
    } catch (err) {
      showToast(err.response?.data?.message || "Employee login failed.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <Toast toast={toast} onClose={() => setToast({ message: "", type: toast.type })} />
      <div className="form-shell">
        <div className="header">
          <div className="brand-heading">
            <img className="brand-logo" src="/logo.svg" alt="Tour Report Management" />
            <h1>Employee Login</h1>
          </div>
          <p>Enter registered SAP ID and email to continue your tour report.</p>
          <div className="login-switch" aria-label="Login type">
            <button className="active" type="button"><span className="ui-icon" aria-hidden="true">E</span> Employee</button>
            <button type="button" onClick={() => navigate("/admin")}><span className="ui-icon" aria-hidden="true">A</span> Admin</button>
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
          </div>

          <div className="actions" style={{ marginTop: 16 }}>
            <button className="btn btn-primary" disabled={loading} type="submit">
              {loading ? "Please wait..." : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
