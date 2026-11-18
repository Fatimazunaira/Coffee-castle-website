const express = require("express");
const { client, collection, nextId } = require("../db");
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
  let orderId;
  let table = null;
  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      orderId = await nextId("orders", session);
      table = null;

      if (body.orderType === "dine-in") {
        table = await collection("cafe_tables").findOneAndUpdate(
          {
            $or: [{ order_id: null }, { order_id: { $exists: false } }],
          },
          { $set: { order_id: orderId } },
          { sort: { number: 1 }, returnDocument: "after", session }
        );
      }

      const order = {
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
      };

      await collection("orders").insertOne(order, { session });
      await collection("carts").deleteOne({ user_id: req.user.id }, { session });
    });
  } finally {
    await session.endSession();
  }

  res.status(201).json({
    orderId,
    total,
    orderType: body.orderType,
    table: table ? { id: table.id, number: table.number } : null,
    waiting: body.orderType === "dine-in" && !table,
  });
});

module.exports = router;
