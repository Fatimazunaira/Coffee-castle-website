const express = require("express");
const db = require("../db");
const { requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Every route in this file is for admins only.
router.use(requireAdmin);

function text(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function asId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// ---------------------------------------------------------------
// Promo banner
// ---------------------------------------------------------------

// PUT /api/admin/promo   body: { title, description, price, active }
router.put("/promo", (req, res) => {
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

  if (!title) {
    return res.status(400).json({ error: "Please enter a title for the banner." });
  }

  db.prepare(
    `INSERT INTO promo (id, title, description, price, active) VALUES (1, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET title = excluded.title, description = excluded.description,
       price = excluded.price, active = excluded.active`
  ).run(title, description, price, active);

  const promo = db.prepare("SELECT title, description, price, active FROM promo WHERE id = 1").get();
  res.json({ promo: { ...promo, active: promo.active === 1 } });
});

// ---------------------------------------------------------------
// Customers (info + cart + orders + table)
// ---------------------------------------------------------------

// GET /api/admin/customers
router.get("/customers", (req, res) => {
  const customers = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.phone, u.created_at,
         (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count,
         (SELECT COALESCE(SUM(c.qty), 0) FROM carts c WHERE c.user_id = u.id) AS cart_items,
         (SELECT t.number FROM cafe_tables t JOIN orders o ON o.id = t.order_id
            WHERE o.user_id = u.id LIMIT 1) AS table_number
       FROM users u
       WHERE u.role = 'customer'
       ORDER BY u.created_at DESC, u.id DESC`
    )
    .all();
  res.json({ customers });
});

// GET /api/admin/customers/:id
router.get("/customers/:id", (req, res) => {
  const id = asId(req.params.id);
  const customer = id
    ? db
        .prepare("SELECT id, name, email, phone, created_at FROM users WHERE id = ? AND role = 'customer'")
        .get(id)
    : null;

  if (!customer) {
    return res.status(404).json({ error: "Customer not found." });
  }

  const cart = db
    .prepare(
      `SELECT m.id, m.name, m.price, m.available, c.qty
       FROM carts c JOIN menu_items m ON m.id = c.menu_item_id
       WHERE c.user_id = ? ORDER BY m.name`
    )
    .all(id)
    .map((item) => ({ ...item, available: item.available === 1 }));
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const orders = db
    .prepare(
      `SELECT o.id, o.created_at, o.order_type, o.payment, o.total, o.status,
              t.number AS table_number,
              (t.order_id = o.id) AS at_table_now
       FROM orders o LEFT JOIN cafe_tables t ON t.id = o.table_id
       WHERE o.user_id = ? ORDER BY o.id DESC LIMIT 50`
    )
    .all(id);

  const itemsFor = db.prepare("SELECT name, price, qty FROM order_items WHERE order_id = ?");
  for (const order of orders) {
    order.at_table_now = order.at_table_now === 1;
    order.items = itemsFor.all(order.id);
  }

  res.json({ customer, cart, cartTotal, orders });
});

// ---------------------------------------------------------------
// Tables
// ---------------------------------------------------------------

const listTables = () =>
  db
    .prepare(
      `SELECT t.id, t.number, t.seats,
              CASE WHEN t.order_id IS NULL THEN 'free' ELSE 'occupied' END AS status,
              o.id AS order_id, o.customer_name, o.user_id, o.created_at AS seated_at
       FROM cafe_tables t LEFT JOIN orders o ON o.id = t.order_id
       ORDER BY t.number`
    )
    .all();

// How many dine-in customers are waiting for a table?
const countWaiting = () =>
  db
    .prepare(
      "SELECT COUNT(*) AS n FROM orders WHERE order_type = 'dine-in' AND table_id IS NULL AND status != 'completed'"
    )
    .get().n;

// GET /api/admin/tables
router.get("/tables", (req, res) => {
  res.json({ tables: listTables(), waiting: countWaiting() });
});

// POST /api/admin/tables/:id/free
// The customer has left. Free the table, and give it to whoever has waited longest.
const freeTable = db.transaction((tableId) => {
  const table = db.prepare("SELECT id, order_id FROM cafe_tables WHERE id = ?").get(tableId);
  if (!table) return false;

  if (table.order_id) {
    db.prepare("UPDATE orders SET status = 'completed' WHERE id = ?").run(table.order_id);
  }
  db.prepare("UPDATE cafe_tables SET order_id = NULL WHERE id = ?").run(tableId);

  const next = db
    .prepare(
      `SELECT id FROM orders
       WHERE order_type = 'dine-in' AND table_id IS NULL AND status != 'completed'
       ORDER BY id LIMIT 1`
    )
    .get();
  if (next) {
    db.prepare("UPDATE cafe_tables SET order_id = ? WHERE id = ?").run(next.id, tableId);
    db.prepare("UPDATE orders SET table_id = ? WHERE id = ?").run(tableId, next.id);
  }
  return true;
});

router.post("/tables/:id/free", (req, res) => {
  const id = asId(req.params.id);
  if (!id || !freeTable(id)) {
    return res.status(404).json({ error: "Table not found." });
  }
  res.json({ tables: listTables(), waiting: countWaiting() });
});

// ---------------------------------------------------------------
// Menu
// ---------------------------------------------------------------

// Checks the form data for a menu item. Returns { error } or { value }.
function readMenuBody(body) {
  const name = text(body.name, 80);
  const description = text(body.description, 300);
  const category = text(body.category, 30) || "Coffee";
  const image = text(body.image, 200);
  const price = Number(body.price);

  if (!name) return { error: "Please enter a name." };
  if (!Number.isInteger(price) || price < 0 || price > 100000) {
    return { error: "Price must be a whole number, like 450." };
  }
  // Pictures must live in the site (/images/...) or be an https link.
  if (image && !/^(\/[\w\-./]+|https:\/\/[^\s]+)$/.test(image)) {
    return { error: "Image must look like /images/menu1.jpg or start with https://" };
  }

  return {
    value: { name, description, category, price, image, available: body.available === false ? 0 : 1 },
  };
}

const getItem = db.prepare(
  "SELECT id, name, description, category, price, image, available FROM menu_items WHERE id = ?"
);
const showItem = (row) => ({ ...row, available: row.available === 1 });

// POST /api/admin/menu
router.post("/menu", (req, res) => {
  const { error, value } = readMenuBody(req.body);
  if (error) return res.status(400).json({ error });

  const result = db
    .prepare(
      "INSERT INTO menu_items (name, description, category, price, image, available) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(value.name, value.description, value.category, value.price, value.image, value.available);

  res.status(201).json({ item: showItem(getItem.get(result.lastInsertRowid)) });
});

// PUT /api/admin/menu/:id   (edit an item, or mark it sold out with available: false)
router.put("/menu/:id", (req, res) => {
  const id = asId(req.params.id);
  if (!id || !getItem.get(id)) {
    return res.status(404).json({ error: "Menu item not found." });
  }

  const { error, value } = readMenuBody(req.body);
  if (error) return res.status(400).json({ error });

  db.prepare(
    "UPDATE menu_items SET name = ?, description = ?, category = ?, price = ?, image = ?, available = ? WHERE id = ?"
  ).run(value.name, value.description, value.category, value.price, value.image, value.available, id);

  res.json({ item: showItem(getItem.get(id)) });
});

// DELETE /api/admin/menu/:id
router.delete("/menu/:id", (req, res) => {
  const id = asId(req.params.id);
  if (!id || !getItem.get(id)) {
    return res.status(404).json({ error: "Menu item not found." });
  }
  db.transaction(() => {
    db.prepare("DELETE FROM carts WHERE menu_item_id = ?").run(id);
    db.prepare("DELETE FROM menu_items WHERE id = ?").run(id);
  })();
  res.json({ ok: true });
});

module.exports = router;
