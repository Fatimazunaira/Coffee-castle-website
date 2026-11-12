const express = require("express");
const db = require("../db");

const router = express.Router();

// GET /api/promo  -> the banner shown on the home page
router.get("/promo", (req, res) => {
  const promo = db.prepare("SELECT title, description, price, active FROM promo WHERE id = 1").get();
  res.json({ promo: promo ? { ...promo, active: promo.active === 1 } : null });
});

// GET /api/menu  -> every menu item (sold-out ones have available: false)
router.get("/menu", (req, res) => {
  const items = db
    .prepare("SELECT id, name, description, category, price, image, available FROM menu_items ORDER BY category, name")
    .all()
    .map((item) => ({ ...item, available: item.available === 1 }));
  res.json({ items });
});

module.exports = router;
