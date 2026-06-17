import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api";
import Toast from "../components/Toast";

export default function AdminLogin() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });
  const navigate = useNavigate();

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast({ message: "", type }), 3000);
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!/^[A-Za-z0-9]{4,20}$/.test(userId)) {
      showToast("User ID must be 4-20 letters/numbers.", "error");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/admin/login`, {
        user_id: userId,
        password,
      });

      if (res.data.user.role === "department") {
        localStorage.setItem("tour_employee_token", res.data.token);
        localStorage.setItem("tour_employee", JSON.stringify({
          id: null,
          user_id: res.data.user.user_id,
          name: "",
          email: "",
          designation: "",
          grade: "",
          department: res.data.user.department,
          access_type: "department",
        }));
        navigate("/form");
        return;
      }

      localStorage.setItem("tour_admin_token", res.data.token);
      localStorage.setItem("tour_admin", JSON.stringify(res.data.user));
      navigate("/admin/dashboard");
    } catch (err) {
      showToast(err.response?.data?.message || "Login failed.", "error");
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
            <img className="brand-logo" src="/nmdc.png" alt="NMDC" />
            <h1>User Login</h1>
          </div>
          <p>Sign in with your User ID and password.</p>
          <div className="login-switch" aria-label="Login type">
            <button type="button" onClick={() => navigate("/")}><span className="ui-icon" aria-hidden="true">E</span> Employee</button>
            <button className="active" type="button"><span className="ui-icon" aria-hidden="true">U</span> User</button>
          </div>
        </div>

        <form className="card" onSubmit={submit}>
          <div className="grid">
            <div>
              <label>User ID *</label>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 20))}
                placeholder="User ID"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label>Password *</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </div>
          </div>
          <div className="actions" style={{ marginTop: 18 }}>
            <button className="btn btn-primary" disabled={loading} type="submit">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}





