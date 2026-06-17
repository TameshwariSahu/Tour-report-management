import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./styles.css";
import ErrorBoundary from "./components/ErrorBoundary";
import EmployeeLogin from "./pages/EmployeeLogin";
import EmployeeForm from "./pages/EmployeeForm";
import EmployeeReports from "./pages/EmployeeReports";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<EmployeeLogin />} />
          <Route path="/form" element={<EmployeeForm />} />
          <Route path="/reports" element={<EmployeeReports />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
