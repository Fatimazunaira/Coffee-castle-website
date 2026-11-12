const jwt = require("jsonwebtoken");
const db = require("../db");

// Make a login token for a user (valid for 7 days).
function signToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "7d",
  });
}

// Runs before any route that needs a logged-in user.
// The browser sends:  Authorization: Bearer <token>
function requireLogin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ error: "Please log in first." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    // Look the user up every time, so a changed role takes effect straight away.
    const user = db
      .prepare("SELECT id, name, email, phone, role FROM users WHERE id = ?")
      .get(payload.id);

    if (!user) {
      return res.status(401).json({ error: "Please log in again." });
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Your login has expired. Please log in again." });
  }
}

// Same as requireLogin, but the user must also be an admin.
function requireAdmin(req, res, next) {
  requireLogin(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Admins only." });
    }
    next();
  });
}

module.exports = { signToken, requireLogin, requireAdmin };
