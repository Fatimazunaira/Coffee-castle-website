const express = require("express");
const mongoose = require("mongoose");
const MenuItem = require("../models/MenuItem");

const router = express.Router();

const FIELDS = ["name", "price", "image", "category", "description", "isDrink", "soldOut"];

// Keep only the fields we allow, and drop the ones that were not sent.
function pickFields(body = {}) {
  const out = {};
  for (const key of FIELDS) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

function checkId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: "That item no longer exists." });
  }
  next();
}

// GET /api/menu  -> all items
router.get("/", async (req, res) => {
  const items = await MenuItem.find().sort({ createdAt: 1, _id: 1 });
  res.json(items);
});

// POST /api/menu  -> add an item (admin)
router.post("/", async (req, res) => {
  const item = await MenuItem.create(pickFields(req.body));
  res.status(201).json(item);
});

// PUT /api/menu/:id  -> edit an item (admin)
router.put("/:id", checkId, async (req, res) => {
  const item = await MenuItem.findById(req.params.id);
  if (!item) return res.status(404).json({ error: "That item no longer exists." });
  item.set(pickFields(req.body));
  await item.save(); // runs all validation again
  res.json(item);
});

// DELETE /api/menu/:id  -> remove an item (admin)
router.delete("/:id", checkId, async (req, res) => {
  await MenuItem.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
