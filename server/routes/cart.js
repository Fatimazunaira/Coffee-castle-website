const express = require("express");
const { collection } = require("../db");
const { requireLogin } = require("../middleware/auth");
const { checkLines, loadCart, showLine } = require("../cartLines");

const router = express.Router();
router.use(requireLogin);

// GET /api/cart
router.get("/", async (req, res) => {
  res.json({ items: (await loadCart(req.user.id)).map(showLine) });
});

// PUT /api/cart  body: { items: [{ itemId, options, qty }] }  (replaces the whole cart)
router.put("/", async (req, res) => {
  const { lines } = await checkLines(req.body.items, { strict: false });

  await collection("carts").updateOne(
    { user_id: req.user.id },
    {
      $set: {
        lines: lines.map((line) => ({
          line_key: line.key,
          menu_item_id: line.itemId,
          options: line.choices || null,
          qty: line.qty,
        })),
      },
    },
    { upsert: true }
  );

  res.json({ items: (await loadCart(req.user.id)).map(showLine) });
});

module.exports = router;
