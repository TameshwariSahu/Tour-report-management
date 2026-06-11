const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("../config/db");
const { emailShell, sendMail } = require("../utils/mailer");

const isEightDigitSap = (value) => /^\d{8}$/.test(String(value || ""));
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
const isUserId = (value) => /^[A-Za-z0-9]{4,20}$/.test(String(value || ""));

const employeePayload = (employee, accessType = "employee") => ({
  id: employee.id,
  sap_id: employee.sap_id,
  name: employee.name,
  email: employee.email,
  designation: employee.designation,
  grade: employee.grade,
  department: employee.department,
  access_type: accessType,
});

const createToken = (employee) =>
  jwt.sign(
    {
      id: employee.id,
      sap_id: employee.sap_id,
      email: employee.email,
      role: "employee",
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

const createDepartmentToken = (department) =>
  jwt.sign(
    {
      id: null,
      department_login_id: department.id,
      user_id: department.user_id,
      department: department.department_name,
      role: "employee",
      access_type: "department",
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

const departmentPayload = (department) => ({
  id: null,
  department_login_id: department.id,
  user_id: department.user_id,
  name: "",
  email: "",
  designation: "",
  grade: "",
  department: department.department_name,
  access_type: "department",
});

const findEmployee = ({ sap_id, email }, callback) => {
  if (!isEightDigitSap(sap_id)) {
    callback({ status: 400, message: "SAP ID must be exactly 8 digits." });
    return;
  }

  if (!isEmail(email)) {
    callback({ status: 400, message: "Please enter a valid email." });
    return;
  }

  db.query(
    "SELECT * FROM employees WHERE sap_id = ? AND email = ? AND status = 'active'",
    [sap_id, email],
    (err, rows) => {
      if (err) {
        console.error("Employee login lookup failed:", err.message);
        callback({ status: 500, message: "Employee login failed." });
        return;
      }

      if (rows.length === 0) {
        callback({ status: 401, message: "SAP ID and email are not registered." });
        return;
      }

      callback(null, rows[0]);
    }
  );
};

exports.requestOtp = (req, res) => {
  const { sap_id, email, access_type } = req.body;

  findEmployee({ sap_id, email }, (lookupErr, employee) => {
    if (lookupErr) return res.status(lookupErr.status).json({ message: lookupErr.message });

    const otp = String(crypto.randomInt(100000, 1000000));
    const accessType = access_type === "department" ? "department" : "employee";

    db.query(
      "INSERT INTO employee_otps (employee_id, otp_code, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))",
      [employee.id, otp],
      async (err) => {
        if (err) {
          console.error("OTP save failed:", err.message);
          return res.status(500).json({ message: "OTP could not be created." });
        }

        try {
          const sent = await sendMail({
            to: employee.email,
            subject: "Tour Report Login OTP",
            text: `Your Tour Report Management OTP is ${otp}. It is valid for 10 minutes.`,
            html: emailShell({
              title: "Login OTP",
              preview: `Hello ${employee.name}, use this OTP to continue your tour report login.`,
              children: `
                <p style="margin:0 0 14px;color:#172033;font-size:15px;line-height:1.6;">Use the OTP below to continue as <strong>${accessType === "department" ? "Department" : "Employee"}</strong>.</p>
                <div style="font-size:28px;letter-spacing:8px;font-weight:800;color:#5b4ce6;background:#eef2ff;border-radius:10px;padding:16px 18px;text-align:center;">${otp}</div>
                <p style="margin:14px 0 0;color:#64748b;font-size:13px;line-height:1.5;">This OTP is valid for 10 minutes.</p>
              `,
            }),
          });

          if (!sent) throw new Error("Email service is not configured.");
          res.json({ message: "OTP sent to registered email." });
        } catch (mailErr) {
          console.error("OTP email failed:", mailErr.message);
          res.status(500).json({ message: "OTP email could not be sent." });
        }
      }
    );
  });
};

exports.verifyOtp = (req, res) => {
  const { sap_id, email, otp, access_type } = req.body;

  if (!/^\d{6}$/.test(String(otp || ""))) {
    return res.status(400).json({ message: "Please enter the 6-digit OTP." });
  }

  findEmployee({ sap_id, email }, (lookupErr, employee) => {
    if (lookupErr) return res.status(lookupErr.status).json({ message: lookupErr.message });

    db.query(
      `SELECT id FROM employee_otps
       WHERE employee_id = ? AND otp_code = ? AND used_at IS NULL AND expires_at > NOW()
       ORDER BY id DESC LIMIT 1`,
      [employee.id, otp],
      (err, rows) => {
        if (err) return res.status(500).json({ message: "OTP could not be verified." });
        if (rows.length === 0) return res.status(401).json({ message: "Invalid or expired OTP." });

        db.query("UPDATE employee_otps SET used_at = NOW() WHERE id = ?", [rows[0].id], (updateErr) => {
          if (updateErr) return res.status(500).json({ message: "OTP could not be completed." });

          const accessType = access_type === "department" ? "department" : "employee";
          res.json({ token: createToken(employee), employee: employeePayload(employee, accessType) });
        });
      }
    );
  });
};

exports.login = exports.verifyOtp;

exports.departmentLogin = (req, res) => {
  const { user_id, password } = req.body;

  if (!isUserId(user_id)) {
    return res.status(400).json({ message: "User ID must be 4-20 letters/numbers." });
  }

  if (!password) {
    return res.status(400).json({ message: "Password is required." });
  }

  db.query(
    "SELECT * FROM users WHERE user_id = ? AND role = 'department' AND status = 'active'",
    [user_id],
    (err, rows) => {
      if (err) {
        console.error("Department login lookup failed:", err.message);
        return res.status(500).json({ message: "Department login failed." });
      }

      if (rows.length === 0) {
        return res.status(401).json({ message: "Invalid department credentials." });
      }

      const department = rows[0];
      const stored = department.password || "";
      const isHash = stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$");
      const valid = isHash ? bcrypt.compareSync(password, stored) : stored === password;

      if (!valid) {
        return res.status(401).json({ message: "Invalid department credentials." });
      }

      res.json({
        token: createDepartmentToken(department),
        employee: departmentPayload(department),
      });
    }
  );
};

