export const API_BASE_URL = import.meta.env.VITE_API_URL;

export const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("tour_admin_token") || ""}`,
});

export const employeeAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("tour_employee_token") || ""}`,
});
