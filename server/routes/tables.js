const express = require("express");
const { collection } = require("../db");
const { optionalLogin } = require("../middleware/auth");
const { FLOOR } = require("../tableLayout");

const router = express.Router();

// GET /api/tables
// The floor plan for the "choose a table" page. Anyone may look.
// Each table is "free" (green) or "booked" (red). A table is booked only while a placed,
// not-yet-completed dine-in order sits on it: looking at the menu never holds a table.
// If a guest is logged in, the reply also says which table (if any) is already theirs.
router.get("/", optionalLogin, async (req, res) => {
  const rows = await collection("cafe_tables")
    .find({ shape: { $exists: true } }, { projection: { _id: 0 } })
    .sort({ number: 1 })
    .toArray();

  let mine = null;
  if (req.user) {
    const order = await collection("orders").findOne(
      { user_id: req.user.id, order_type: "dine-in", status: "received", table_id: { $type: "number" } },
      { projection: { _id: 0, id: 1, table_id: 1 } }
    );
    if (order) {
      const table = rows.find((row) => row.id === order.table_id);
      mine = { orderId: order.id, tableId: order.table_id, tableNumber: table ? table.number : null };
    }
  }

  res.set("Cache-Control", "no-store");
  res.json({
    floor: FLOOR,
    mine,
    tables: rows.map((row) => ({
      id: row.id,
      number: row.number,
      seats: row.seats,
      shape: row.shape,
      x: row.x,
      y: row.y,
      w: row.w,
      h: row.h,
      status: row.order_id == null ? "free" : "booked",
      mine: Boolean(mine && mine.tableId === row.id),
    })),
  });
});

module.exports = router;
