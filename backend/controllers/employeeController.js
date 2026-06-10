const jwt = require("jsonwebtoken");
const db = require("../config/db");

const isEightDigitSap = (value) => /^\d{8}$/.test(String(value || ""));
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));

const employeePayload = (employee) => ({
  id: employee.id,
  sap_id: employee.sap_id,
  name: employee.name,
  email: employee.email,
  designation: employee.designation,
  grade: employee.grade,
  department: employee.department,
});

exports.login = (req, res) => {
  const { sap_id, email } = req.body;

  if (!isEightDigitSap(sap_id)) {
    return res.status(400).json({ message: "SAP ID must be exactly 8 digits." });
  }

  if (!isEmail(email)) {
    return res.status(400).json({ message: "Please enter a valid email." });
  }

  db.query(
    "SELECT * FROM employees WHERE sap_id = ? AND email = ? AND status = 'active'",
    [sap_id, email],
    (err, rows) => {
      if (err) {
        console.error("Employee login lookup failed:", err.message);
        return res.status(500).json({ message: "Employee login failed." });
      }

      if (rows.length === 0) {
        return res.status(401).json({ message: "SAP ID and email are not registered." });
      }

      const employee = rows[0];
      const token = jwt.sign(
        {
          id: employee.id,
          sap_id: employee.sap_id,
          email: employee.email,
          role: "employee",
        },
        process.env.JWT_SECRET,
        { expiresIn: "8h" }
      );

      res.json({ token, employee: employeePayload(employee) });
    }
  );
};
