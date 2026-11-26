const express = require("express");
const { collection, nextId } = require("../db");
const { requireLogin } = require("../middleware/auth");
const { checkLines } = require("../cartLines");

const router = express.Router();

// The guest's dine-in order that still holds a table, if any.
function findActiveDineIn(userId) {
  return collection("orders").findOne(
    { user_id: userId, order_type: "dine-in", status: "received", table_id: { $type: "number" } },
    { projection: { _id: 0, id: 1, table_id: 1 } }
  );
}

// Gives a claimed table back (only if it is still held by this very order).
function releaseTable(tableId, orderId) {
  return collection("cafe_tables")
    .updateOne({ id: tableId, order_id: orderId }, { $set: { order_id: null } })
    .catch((err) => console.error("Could not release table:", err));
}

function activeOrderReply(active) {
  return {
    error:
      "You already have a table with an order in progress" +
      (active ? ` (order #${active.id})` : "") +
      ". Please ask our staff once you are finished, then you can choose another table.",
    code: "ACTIVE_ORDER",
  };
}

// POST /api/orders
// body: { name, phone, orderType, payment, tableId (dine-in only), items: [{ itemId, options, qty }] }
//
// Dine-in rules (there are no reservations):
//  - A table is booked only by placing the order. Choosing a table on the website does not hold it.
//  - The table is claimed with ONE atomic MongoDB update ("set order_id, but only if it is still null"),
//    so when two guests order the same table at the same moment exactly one wins.
//    The other gets a 409 and is asked to pick another table; their cart is kept.
//  - One guest, one table: a guest with an active dine-in order cannot order dine-in again
//    until the admin frees their table. A unique partial index in MongoDB backs this up.
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

  let tableId = null;
  if (body.orderType === "dine-in") {
    tableId = Number(body.tableId);
    if (!Number.isInteger(tableId) || tableId <= 0) {
      return res.status(400).json({ error: "Please choose a table first.", code: "NO_TABLE" });
    }
    const active = await findActiveDineIn(req.user.id);
    if (active) return res.status(409).json(activeOrderReply(active));
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
      { id: tableId, order_id: null, shape: { $exists: true } },
      { $set: { order_id: orderId } },
      { returnDocument: "after" }
    );
    if (!table) {
      const exists = await collection("cafe_tables").findOne({ id: tableId }, { projection: { number: 1 } });
      if (!exists) return res.status(404).json({ error: "That table does not exist.", code: "NO_TABLE" });
      return res.status(409).json({
        error: `Table ${exists.number} was just taken by another guest. Your cart is saved: please choose another table.`,
        code: "TABLE_TAKEN",
      });
    }
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
    if (table) await releaseTable(table.id, orderId);
    if (err.code === 11000) {
      // The same guest sent two dine-in orders at once and the other one won.
      const active = await findActiveDineIn(req.user.id);
      return res.status(409).json(activeOrderReply(active));
    }
    throw err;
  }

  // Second safety net for "one guest, one table" (it also works where the unique index could not
  // be created). Whoever saves LAST always sees the other order, so it undoes itself. If two
  // orders save at the very same moment both may undo; the guest just tries again.
  if (table) {
    const activeCount = await collection("orders").countDocuments({
      user_id: req.user.id,
      order_type: "dine-in",
      status: "received",
      table_id: { $type: "number" },
    });
    if (activeCount > 1) {
      await collection("orders").deleteOne({ id: orderId });
      await releaseTable(table.id, orderId);
      const other = await findActiveDineIn(req.user.id);
      return res.status(409).json(activeOrderReply(other));
    }
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
  });
});

module.exports = router;