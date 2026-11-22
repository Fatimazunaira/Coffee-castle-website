const express = require("express");
const { collection, nextId } = require("../db");
const { requireLogin } = require("../middleware/auth");
const { checkLines } = require("../cartLines");

const router = express.Router();

// POST /api/orders
// body: { name, phone, orderType, payment, items: [{ itemId, options, qty }] }
router.post("/", requireLogin, async (req, res) => {
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

  const { lines, problem } = await checkLines(body.items, { strict: true });
  if (problem) return res.status(400).json({ error: problem });

  const soldOut = lines.find((line) => line.soldOut);
  if (soldOut) {
    return res.status(400).json({ error: `${soldOut.name} is sold out. Please remove it from your cart.` });
  }

  const total = lines.reduce((sum, line) => sum + line.price * line.qty, 0);

  // No transaction here on purpose: transactions need a replica set, and a plain
  // local MongoDB does not have one. Every step below is a single atomic write,
  // and if the order cannot be saved we give the table back.
  const orderId = await nextId("orders");
  let table = null;

  if (body.orderType === "dine-in") {
    // Atomic: only one request can claim a given free table.
    table = await collection("cafe_tables").findOneAndUpdate(
      { order_id: null },
      { $set: { order_id: orderId } },
      { sort: { number: 1 }, returnDocument: "after" }
    );
  }

  try {
    await collection("orders").insertOne({
      id: orderId,
      user_id: req.user.id,
      customer_name: name,
      phone,
      order_type: body.orderType,
      payment: body.payment,
      total,
      status: "received",
      table_id: table ? table.id : null,
      created_at: new Date().toISOString(),
      items: lines.map((line) => ({
        menu_item_id: line.itemId,
        name: line.name,
        details: line.details,
        price: line.price,
        qty: line.qty,
      })),
    });
  } catch (err) {
    if (table) {
      await collection("cafe_tables")
        .updateOne({ id: table.id, order_id: orderId }, { $set: { order_id: null } })
        .catch((undoError) => console.error("Could not release table:", undoError));
    }
    throw err;
  }

  // The order is saved. Clearing the cart is best-effort: if it fails, the order still stands.
  await collection("carts")
    .deleteOne({ user_id: req.user.id })
    .catch((err) => console.error("Could not clear cart:", err));

  res.status(201).json({
    orderId,
    total,
    orderType: body.orderType,
    table: table ? { id: table.id, number: table.number } : null,
    waiting: body.orderType === "dine-in" && !table,
  });
});

module.exports = router;