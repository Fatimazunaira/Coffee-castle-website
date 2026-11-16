const express = require("express");
const bcrypt = require("bcryptjs");
const { collection, nextId } = require("../db");
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

  const users = collection("users");
  if (await users.findOne({ email }, { projection: { _id: 1 } })) {
    return res.status(409).json({ error: "That email already has an account. Try logging in." });
  }

  const hash = await bcrypt.hash(password, 10);

  try {
    // The role is always "customer" here. Nobody can sign up as admin.
    const user = {
      id: await nextId("users"),
      name,
      email,
      phone: phone || null,
      password_hash: hash,
      role: "customer",
      created_at: new Date().toISOString(),
    };
    await users.insertOne(user);
    res.status(201).json({
      token: signToken(user),
      user: { id: user.id, name, email, phone: user.phone, role: "customer" },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "That email already has an account. Try logging in." });
    }
    throw err;
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const email = cleanText(req.body.email, 120).toLowerCase();
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (isLocked(email)) {
    return res.status(429).json({ error: "Too many wrong tries. Please wait 15 minutes." });
  }

  const row = await collection("users").findOne({ email });
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
