const express = require("express");
const { collection } = require("../db");

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
router.get("/promo", async (req, res) => {
  const row = await collection("promo").findOne(
    { _id: 1 },
    { projection: { _id: 0, title: 1, description: 1, price: 1, active: 1 } }
  );
  if (!row) return res.json({ promo: null, text: "" });

  const promo = { ...row, active: row.active === 1 };
  const text = promo.active ? [promo.title, promo.description].filter(Boolean).join(": ") : "";
  res.json({ promo, text });
});

// GET /api/menu  -> every menu item (sold-out ones have soldOut: true)
router.get("/menu", async (req, res) => {
  const rows = await collection("menu_items")
    .find({}, { projection: { _id: 0 } })
    .sort({ id: 1 })
    .toArray();
  res.json({ items: rows.map(showItem) });
});

module.exports = { router, showItem };
