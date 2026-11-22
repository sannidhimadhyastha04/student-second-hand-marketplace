const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, email, password, phone, department } = req.body;

  if (!name || !email || !password || !department) {
    return res.status(400).json({ message: "Name, email, password and department are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: "Password must contain at least 6 characters." });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, phone, department)
       VALUES ($1, LOWER($2), $3, $4, $5)
       RETURNING user_id, name, email, phone, department`,
      [name.trim(), email.trim(), passwordHash, phone || null, department.trim()]
    );
    res.status(201).json({ message: "Registration successful.", user: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "Email or phone number is already registered." });
    console.error(err);
    res.status(500).json({ message: "Could not register user." });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

  try {
    const result = await pool.query(
      "SELECT user_id, name, email, password_hash, department FROM users WHERE email = LOWER($1)",
      [email.trim()]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { user_id: user.user_id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );
    delete user.password_hash;
    res.json({ message: "Login successful.", token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Could not log in." });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT user_id, name, email, phone, department, created_at FROM users WHERE user_id = $1",
    [req.user.user_id]
  );
  res.json(result.rows[0] || null);
});

module.exports = router;
