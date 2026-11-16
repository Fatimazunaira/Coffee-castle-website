const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { signToken, requireLogin } = require("../middleware/auth");

const router = express.Router();

// A fake hash, used so a wrong email takes as long as a wrong password.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

// Very small brute-force guard: 10 wrong tries per email every 15 minutes.
const failed = new Map(); // email -> { count, since }
const MAX_TRIES = 10;
const WINDOW_MS = 15 * 60 * 1000;

function isLocked(email) {
  const entry = failed.get(email);
  if (!entry) return false;
  if (Date.now() - entry.since > WINDOW_MS) {
    failed.delete(email);
    return false;
  }
  return entry.count >= MAX_TRIES;
}

function recordFailure(email) {
  const entry = failed.get(email);
  if (!entry || Date.now() - entry.since > WINDOW_MS) {
    failed.set(email, { count: 1, since: Date.now() });
  } else {
    entry.count += 1;
  }
}

function cleanText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const name = cleanText(req.body.name, 80);
  const email = cleanText(req.body.email, 120).toLowerCase();
  const phone = cleanText(req.body.phone, 20);
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!name) return res.status(400).json({ error: "Please enter your name." });
  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }
  if (password.length < 8 || password.length > 72) {
    return res.status(400).json({ error: "Password must be 8 to 72 characters." });
  }

  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
    return res.status(409).json({ error: "That email already has an account. Try logging in." });
  }

  const hash = await bcrypt.hash(password, 10);

  let result;
  try {
    // The role is always "customer" here. Nobody can sign up as admin.
    result = db
      .prepare("INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)")
      .run(name, email, phone || null, hash);
  } catch (err) {
    // Someone else signed up with this email while we were hashing the password
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "That email already has an account. Try logging in." });
    }
    throw err;
  }

  const user = { id: Number(result.lastInsertRowid), name, email, phone, role: "customer" };
  res.status(201).json({ token: signToken(user), user });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const email = cleanText(req.body.email, 120).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (isLocked(email)) {
    return res.status(429).json({ error: "Too many wrong tries. Please wait 15 minutes." });
  }

  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  const matches = await bcrypt.compare(password, row ? row.password_hash : DUMMY_HASH);

  if (!row || !matches) {
    recordFailure(email);
    return res.status(401).json({ error: "Wrong email or password." });
  }

  failed.delete(email);
  const user = { id: row.id, name: row.name, email: row.email, phone: row.phone, role: row.role };
  res.json({ token: signToken(user), user });
});

// GET /api/auth/me  (who is logged in?)
router.get("/me", requireLogin, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
