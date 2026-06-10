const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const isEightDigitSap = (value) => /^\d{8}$/.test(String(value || ""));

exports.login = (req, res) => {
  const { sap_id, password } = req.body;

  if (!isEightDigitSap(sap_id)) {
    return res.status(400).json({ message: "SAP ID must be exactly 8 digits." });
  }

  db.query("SELECT * FROM users WHERE sap_id = ?", [sap_id], (err, rows) => {
    if (err) return res.status(500).json({ message: "Login failed." });
    if (rows.length === 0) return res.status(401).json({ message: "Invalid credentials." });

    const user = rows[0];
    const stored = user.password || "";
    const isHash = stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$");
    const valid = isHash ? bcrypt.compareSync(password, stored) : stored === password;

    if (!valid) return res.status(401).json({ message: "Invalid credentials." });

    const token = jwt.sign(
      { id: user.id, sap_id: user.sap_id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ token, user: { id: user.id, sap_id: user.sap_id } });
  });
};

exports.verify = (req, res) => {
  res.json({ valid: true, user: req.admin });
};

