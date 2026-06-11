const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const isUserId = (value) => /^[A-Za-z0-9]{4,20}$/.test(String(value || ""));

exports.login = (req, res) => {
  const { user_id, password, role } = req.body;

  if (!isUserId(user_id)) {
    return res.status(400).json({ message: "User ID must be 4-20 letters/numbers." });
  }

  if (!["admin", "department"].includes(role)) {
    return res.status(400).json({ message: "Please select Admin or Department." });
  }

  db.query("SELECT * FROM users WHERE user_id = ? AND role = ? AND status = 'active'", [user_id, role], (err, rows) => {
    if (err) return res.status(500).json({ message: "Login failed." });
    if (rows.length === 0) return res.status(401).json({ message: "Invalid credentials." });

    const user = rows[0];
    const stored = user.password || "";
    const isHash = stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$");
    const valid = isHash ? bcrypt.compareSync(password, stored) : stored === password;

    if (!valid) return res.status(401).json({ message: "Invalid credentials." });

    if (!["admin", "department"].includes(user.role)) {
      return res.status(403).json({ message: "This user role is not allowed." });
    }

    const tokenRole = user.role === "department" ? "employee" : "admin";
    const token = jwt.sign(
      {
        id: user.role === "department" ? null : user.id,
        user_id: user.user_id,
        role: tokenRole,
        access_type: user.role === "department" ? "department" : undefined,
        department: user.department_name || undefined,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        user_id: user.user_id,
        role: user.role,
        department: user.department_name,
      },
    });
  });
};

exports.verify = (req, res) => {
  res.json({ valid: true, user: req.admin });
};

