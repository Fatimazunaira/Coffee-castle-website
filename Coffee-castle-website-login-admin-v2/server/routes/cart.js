const express = require("express");
const db = require("../db");
const { requireLogin } = require("../middleware/auth");
const { checkLines, loadCart, showLine } = require("../cartLines");

const router = express.Router();
router.use(requireLogin);

// GET /api/cart
router.get("/", (req, res) => {
  res.json({ items: loadCart(req.user.id).map(showLine) });
});

// PUT /api/cart  body: { items: [{ itemId, options, qty }] }  (replaces the whole cart)
router.put("/", (req, res) => {
  const { lines } = checkLines(req.body.items, { strict: false });

  const clear = db.prepare("DELETE FROM carts WHERE user_id = ?");
  const insert = db.prepare(
    "INSERT INTO carts (user_id, line_key, menu_item_id, options, qty) VALUES (?, ?, ?, ?, ?)"
  );

  db.transaction(() => {
    clear.run(req.user.id);
    for (const line of lines) {
      insert.run(
        req.user.id,
        line.key,
        line.itemId,
        line.choices ? JSON.stringify(line.choices) : null,
        line.qty
      );
    }
  })();

  res.json({ items: loadCart(req.user.id).map(showLine) });
});

module.exports = router;
