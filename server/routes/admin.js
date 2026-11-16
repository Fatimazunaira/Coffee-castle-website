const express = require("express");
const { collection, nextId } = require("../db");
const { requireAdmin } = require("../middleware/auth");
const { CATEGORIES } = require("../menuOptions");
const { loadCart, showLine } = require("../cartLines");
const { showItem } = require("./public");

const router = express.Router();
router.use(requireAdmin);

function text(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function asId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.put("/promo", async (req, res) => {
  const title = text(req.body.title, 80);
  const description = text(req.body.description, 200);
  const active = req.body.active === false ? 0 : 1;

  let price = null;
  if (req.body.price !== "" && req.body.price !== null && req.body.price !== undefined) {
    price = Number(req.body.price);
    if (!Number.isInteger(price) || price < 0 || price > 100000) {
      return res.status(400).json({ error: "Price must be a whole number, like 450." });
    }
  }
  if (!title) return res.status(400).json({ error: "Please enter a title for the banner." });

  const promo = {
    title,
    description,
    price,
    active,
  };
  await collection("promo").updateOne({ _id: 1 }, { $set: promo }, { upsert: true });
  res.json({ promo: { ...promo, active: promo.active === 1 } });
});

router.get("/customers", async (req, res) => {
  const [users, orders, carts, tables] = await Promise.all([
    collection("users").find({ role: "customer" }, { projection: { _id: 0, password_hash: 0 } }).toArray(),
    collection("orders").find({}, { projection: { _id: 0, id: 1, user_id: 1 } }).toArray(),
    collection("carts").find({}, { projection: { _id: 0, user_id: 1, lines: 1 } }).toArray(),
    collection("cafe_tables").find({ order_id: { $ne: null } }, { projection: { _id: 0, number: 1, order_id: 1 } }).toArray(),
  ]);
  const orderCounts = new Map();
  for (const order of orders) orderCounts.set(order.user_id, (orderCounts.get(order.user_id) || 0) + 1);
  const cartCounts = new Map(carts.map((cart) => [
    cart.user_id,
    cart.lines.reduce((sum, line) => sum + line.qty, 0),
  ]));
  const orderOwners = new Map(orders.map((order) => [order.id, order.user_id]));
  const tableByUser = new Map();
  for (const table of tables) {
    const userId = orderOwners.get(table.order_id);
    if (userId && !tableByUser.has(userId)) tableByUser.set(userId, table.number);
  }

  const customers = users
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      created_at: user.created_at,
      order_count: orderCounts.get(user.id) || 0,
      cart_items: cartCounts.get(user.id) || 0,
      table_number: tableByUser.get(user.id) || null,
    }))
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
  res.json({ customers });
});

router.get("/customers/:id", async (req, res) => {
  const id = asId(req.params.id);
  const customer = id
    ? await collection("users").findOne(
        { id, role: "customer" },
        { projection: { _id: 0, id: 1, name: 1, email: 1, phone: 1, created_at: 1 } }
      )
    : null;

  if (!customer) return res.status(404).json({ error: "Customer not found." });

  const cart = (await loadCart(id)).map(showLine);
  const cartTotal = cart.reduce((sum, line) => sum + line.price * line.qty, 0);
  const [orders, tables] = await Promise.all([
    collection("orders").find({ user_id: id }, { projection: { _id: 0 } }).sort({ id: -1 }).limit(50).toArray(),
    collection("cafe_tables").find({}, { projection: { _id: 0, id: 1, number: 1, order_id: 1 } }).toArray(),
  ]);
  const tableById = new Map(tables.map((table) => [table.id, table]));
  const customerOrders = orders.map((order) => {
    const table = tableById.get(order.table_id);
    return {
      id: order.id,
      created_at: order.created_at,
      order_type: order.order_type,
      payment: order.payment,
      total: order.total,
      status: order.status,
      table_number: table ? table.number : null,
      at_table_now: Boolean(table && table.order_id === order.id),
      items: order.items || [],
    };
  });
  res.json({ customer, cart, cartTotal, orders: customerOrders });
});

const listTables = async () => {
  const [tables, orders] = await Promise.all([
    collection("cafe_tables").find({}, { projection: { _id: 0 } }).sort({ number: 1 }).toArray(),
    collection("orders").find({}, { projection: { _id: 0, id: 1, customer_name: 1, user_id: 1, created_at: 1 } }).toArray(),
  ]);
  const ordersById = new Map(orders.map((order) => [order.id, order]));
  return tables.map((table) => {
    const order = ordersById.get(table.order_id);
    return {
      id: table.id,
      number: table.number,
      seats: table.seats,
      status: table.order_id == null ? "free" : "occupied",
      order_id: order ? order.id : null,
      customer_name: order ? order.customer_name : null,
      user_id: order ? order.user_id : null,
      seated_at: order ? order.created_at : null,
    };
  });
};

const countWaiting = () =>
  collection("orders").countDocuments({
    order_type: "dine-in",
    table_id: null,
    status: { $ne: "completed" },
  });

router.get("/tables", async (req, res) => {
  const [tables, waiting] = await Promise.all([listTables(), countWaiting()]);
  res.json({ tables, waiting });
});

async function freeTable(tableId) {
  const tables = collection("cafe_tables");
  const table = await tables.findOne({ id: tableId });
  if (!table) return false;

  if (table.order_id != null) {
    await collection("orders").updateOne(
      { id: table.order_id },
      { $set: { status: "completed" } }
    );
  }
  const released = await tables.updateOne(
    { id: tableId, order_id: table.order_id },
    { $set: { order_id: null } }
  );
  if (!released.matchedCount) return true;

  const next = await collection("orders").findOneAndUpdate(
    { order_type: "dine-in", table_id: null, status: { $ne: "completed" } },
    { $set: { table_id: tableId } },
    { sort: { id: 1 }, returnDocument: "after" }
  );
  if (next) {
    const assigned = await tables.updateOne(
      { id: tableId, order_id: null },
      { $set: { order_id: next.id } }
    );
    if (!assigned.matchedCount) {
      await collection("orders").updateOne(
        { id: next.id, table_id: tableId },
        { $set: { table_id: null } }
      );
    }
  }
  return true;
}

router.post("/tables/:id/free", async (req, res) => {
  const id = asId(req.params.id);
  if (!id || !(await freeTable(id))) {
    return res.status(404).json({ error: "Table not found." });
  }
  const [tables, waiting] = await Promise.all([listTables(), countWaiting()]);
  res.json({ tables, waiting });
});

const IMAGE_PATH = /^\/[\w\-./]{1,200}$/;
const IMAGE_URL = /^https:\/\/[^\s"'<>]{1,300}$/;
const IMAGE_DATA = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_DATA_IMAGE = 700 * 1024;

function readMenuBody(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = text(body.description, 200);
  const image = typeof body.image === "string" ? body.image.trim() : "";
  const price = Number(body.price);

  if (!name) return { error: "Please enter the name of the food." };
  if (name.length > 60) return { error: "The name is too long (60 characters max)." };
  if (!Number.isInteger(price) || price <= 0 || price > 100000) {
    return { error: "Price must be a whole number greater than 0, like 450." };
  }
  if (!image) return { error: "A picture of the food is required." };

  const okImage =
    IMAGE_PATH.test(image) ||
    IMAGE_URL.test(image) ||
    (IMAGE_DATA.test(image) && image.length <= MAX_DATA_IMAGE);
  if (!okImage) {
    return { error: "That picture cannot be used. Choose a JPG, PNG or WebP photo (not too large)." };
  }

  return {
    value: {
      name,
      description,
      image,
      price,
      category: CATEGORIES.includes(body.category) ? body.category : CATEGORIES[0],
      is_drink: body.isDrink === true ? 1 : 0,
      sold_out: body.soldOut === true ? 1 : 0,
    },
  };
}

const getItem = (id) =>
  collection("menu_items").findOne({ id }, { projection: { _id: 0 } });

router.post("/menu", async (req, res) => {
  const { error, value } = readMenuBody(req.body);
  if (error) return res.status(400).json({ error });

  const item = { id: await nextId("menu_items"), ...value };
  await collection("menu_items").insertOne(item);
  res.status(201).json({ item: showItem(item) });
});

router.put("/menu/:id", async (req, res) => {
  const id = asId(req.params.id);
  if (!id || !(await getItem(id))) {
    return res.status(404).json({ error: "That item no longer exists." });
  }

  const { error, value } = readMenuBody(req.body);
  if (error) return res.status(400).json({ error });

  await collection("menu_items").updateOne({ id }, { $set: value });
  res.json({ item: showItem(await getItem(id)) });
});

router.delete("/menu/:id", async (req, res) => {
  const id = asId(req.params.id);
  if (!id || !(await getItem(id))) {
    return res.status(404).json({ error: "That item no longer exists." });
  }

  await collection("carts").deleteMany({ "lines.menu_item_id": id });
  await collection("menu_items").deleteOne({ id });
  res.json({ ok: true });
});

module.exports = router;
