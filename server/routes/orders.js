const express = require("express");
const db = require("../db");
const { requireLogin } = require("../middleware/auth");
const { checkLines } = require("../cartLines");

const router = express.Router();

// Everything inside db.transaction() happens as ONE step: either all of it
// is saved or none of it is. The server also runs this code one request at a
// time, so two customers can never be given the same table.
const placeOrder = db.transaction((user, form, lines) => {
  let total = 0;
  for (const line of lines) {
    total += line.price * line.qty;
  }

  const order = db
    .prepare(
      "INSERT INTO orders (user_id, customer_name, phone, order_type, payment, total) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(user.id, form.name, form.phone, form.orderType, form.payment, total);
  const orderId = Number(order.lastInsertRowid);

  const insertLine = db.prepare(
    "INSERT INTO order_items (order_id, menu_item_id, name, details, price, qty) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const line of lines) {
    insertLine.run(orderId, line.itemId, line.name, line.details, line.price, line.qty);
  }

  // Dine-in orders get the lowest-numbered free table.
  let table = null;
  if (form.orderType === "dine-in") {
    table = db
      .prepare("SELECT id, number FROM cafe_tables WHERE order_id IS NULL ORDER BY number LIMIT 1")
      .get();
    if (table) {
      db.prepare("UPDATE cafe_tables SET order_id = ? WHERE id = ?").run(orderId, table.id);
      db.prepare("UPDATE orders SET table_id = ? WHERE id = ?").run(table.id, orderId);
    }
  }

  db.prepare("DELETE FROM carts WHERE user_id = ?").run(user.id);

  return {
    orderId,
    total,
    orderType: form.orderType,
    table: table ? { id: table.id, number: table.number } : null,
    waiting: form.orderType === "dine-in" && !table,
  };
});

// POST /api/orders
// body: { name, phone, orderType, payment, items: [{ itemId, options, qty }] }
router.post("/", requireLogin, (req, res) => {
  const body = req.body || {};
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const phone = typeof body.phone === "string" ? body.phone.trim().slice(0, 20) : "";

  if (!name || !phone) {
    return res.status(400).json({ error: "Please enter your name and phone number." });
  }
  if (!["dine-in", "takeaway"].includes(body.orderType)) {
    return res.status(400).json({ error: "Choose dine-in or takeaway." });
  }
  if (!["counter", "stripe"].includes(body.payment)) {
    return res.status(400).json({ error: "Choose how you will pay." });
  }
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 50) {
    return res.status(400).json({ error: "Your cart is empty." });
  }

  // Look every item up in the menu: the price comes from the database.
  const { lines, problem } = checkLines(body.items, { strict: true });
  if (problem) {
    return res.status(400).json({ error: problem });
  }
  const soldOut = lines.find((line) => line.soldOut);
  if (soldOut) {
    return res.status(400).json({ error: `${soldOut.name} is sold out. Please remove it from your cart.` });
  }

  const result = placeOrder(req.user, { name, phone, orderType: body.orderType, payment: body.payment }, lines);
  res.status(201).json(result);
});

module.exports = router;
