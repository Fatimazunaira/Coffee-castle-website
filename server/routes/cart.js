const express = require("express");
const db = require("../db");
const { requireLogin } = require("../middleware/auth");

const router = express.Router();
router.use(requireLogin);

// Names and prices always come from the menu table, never from the browser.
const getCart = db.prepare(`
  SELECT m.id, m.name, m.price, c.qty
  FROM carts c
  JOIN menu_items m ON m.id = c.menu_item_id
  WHERE c.user_id = ?
  ORDER BY m.name
`);

// GET /api/cart
router.get("/", (req, res) => {
  res.json({ items: getCart.all(req.user.id) });
});

// PUT /api/cart  body: { items: [{ id, qty }] }  (replaces the whole cart)
router.put("/", (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 50) : [];

  const menuExists = db.prepare("SELECT 1 FROM menu_items WHERE id = ?");
  const clear = db.prepare("DELETE FROM carts WHERE user_id = ?");
  const insert = db.prepare(
    "INSERT INTO carts (user_id, menu_item_id, qty) VALUES (?, ?, ?) " +
      "ON CONFLICT (user_id, menu_item_id) DO UPDATE SET qty = MIN(qty + excluded.qty, 50)"
  );

  db.transaction(() => {
    clear.run(req.user.id);
    for (const item of items) {
      const id = Number(item.id);
      const qty = Number(item.qty);
      if (Number.isInteger(id) && Number.isInteger(qty) && qty > 0 && qty <= 50 && menuExists.get(id)) {
        insert.run(req.user.id, id, qty);
      }
    }
  })();

  res.json({ items: getCart.all(req.user.id) });
});

module.exports = router;
