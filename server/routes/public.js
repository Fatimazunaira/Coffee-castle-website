const express = require("express");
const db = require("../db");

const router = express.Router();

// A menu row from the database, in the same shape the website already uses.
function showItem(row) {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    image: row.image,
    category: row.category,
    description: row.description,
    isDrink: row.is_drink === 1,
    soldOut: row.sold_out === 1,
  };
}

// GET /api/promo  -> the banner shown on the home page.
// "text" is one line of words, for the small Promo component.
router.get("/promo", (req, res) => {
  const row = db.prepare("SELECT title, description, price, active FROM promo WHERE id = 1").get();
  if (!row) return res.json({ promo: null, text: "" });

  const promo = { ...row, active: row.active === 1 };
  const text = promo.active ? [promo.title, promo.description].filter(Boolean).join(": ") : "";
  res.json({ promo, text });
});

// GET /api/menu  -> every menu item (sold-out ones have soldOut: true)
router.get("/menu", (req, res) => {
  const rows = db
    .prepare(
      "SELECT id, name, description, category, price, image, is_drink, sold_out FROM menu_items ORDER BY id"
    )
    .all();
  res.json({ items: rows.map(showItem) });
});

module.exports = { router, showItem };
