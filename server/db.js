const path = require("path");
// SQLite is built into Node.js (version 22.13 or newer), so there is nothing to install.
const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");

// The whole database is ONE file. Delete the file to start again from zero.
const dbFile = process.env.DB_FILE || path.join(__dirname, "coffee-castle.db");
const db = new DatabaseSync(dbFile);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// db.transaction(fn) returns a new function. Calling it runs fn as ONE step:
// if anything inside throws an error, every change it made is undone.
db.transaction = (fn) => (...args) => {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn(...args);
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
};

// ---------- Tables ----------
// "CREATE TABLE IF NOT EXISTS" is safe to run every time the server starts.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    phone         TEXT,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    category    TEXT    NOT NULL DEFAULT 'Coffee',
    price       INTEGER NOT NULL CHECK (price >= 0),
    image       TEXT    NOT NULL DEFAULT '',
    available   INTEGER NOT NULL DEFAULT 1
  );

  -- The promo banner on the home page. Only ever ONE row (id = 1).
  CREATE TABLE IF NOT EXISTS promo (
    id          INTEGER PRIMARY KEY CHECK (id = 1),
    title       TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    price       INTEGER,
    active      INTEGER NOT NULL DEFAULT 1
  );

  -- A table in the cafe. order_id is the order sitting there right now
  -- (NULL means the table is free).
  CREATE TABLE IF NOT EXISTS cafe_tables (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    number   INTEGER NOT NULL UNIQUE,
    seats    INTEGER NOT NULL DEFAULT 4,
    order_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL REFERENCES users(id),
    customer_name TEXT    NOT NULL,
    phone         TEXT    NOT NULL,
    order_type    TEXT    NOT NULL CHECK (order_type IN ('dine-in', 'takeaway')),
    payment       TEXT    NOT NULL CHECK (payment IN ('counter', 'stripe')),
    total         INTEGER NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'received'
                  CHECK (status IN ('received', 'preparing', 'ready', 'completed')),
    table_id      INTEGER REFERENCES cafe_tables(id),
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- name and price are copied from the menu at the moment of ordering,
  -- so old receipts stay correct even if the menu changes later.
  CREATE TABLE IF NOT EXISTS order_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER,
    name         TEXT    NOT NULL,
    price        INTEGER NOT NULL,
    qty          INTEGER NOT NULL
  );

  -- Each logged-in customer's current cart (so the admin can see it).
  CREATE TABLE IF NOT EXISTS carts (
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    menu_item_id INTEGER NOT NULL,
    qty          INTEGER NOT NULL CHECK (qty > 0),
    PRIMARY KEY (user_id, menu_item_id)
  );
`);

// ---------- Starter data (only the very first time) ----------
// PRAGMA user_version is a number stored inside the database file.
// 0 = brand new file, so we add the starter data once and set it to 1.
function addStarterData() {
  const insertItem = db.prepare(
    "INSERT INTO menu_items (name, description, category, price, image) VALUES (?, ?, ?, ?, ?)"
  );
  // The first two match the sample items already in CartContext.jsx.
  // The other prices are placeholders: change them from the admin panel.
  const items = [
    ["Caramel Latte", "Espresso, steamed milk and caramel.", "Coffee", 450, "/images/menu1.jpg"],
    ["Chicken Club Sandwich", "Grilled chicken, egg and fresh veggies.", "Food", 650, "/images/menu2.jpg"],
    ["Cheese Omelette", "Three eggs, melted cheese, toast.", "Food", 500, "/images/menu3.jpg"],
    ["Chocolate Brownie", "Warm, gooey and rich.", "Dessert", 350, "/images/menu4.jpg"],
    ["Cold Coffee", "Iced, sweet and strong.", "Coffee", 400, "/images/menu5.jpg"],
    ["Loaded Fries", "Fries with cheese sauce and toppings.", "Food", 450, "/images/menu6.jpg"],
  ];
  for (const item of items) {
    insertItem.run(...item);
  }

  db.prepare(
    "INSERT INTO promo (id, title, description, price, active) VALUES (1, ?, ?, ?, 1)"
  ).run("Caramel Latte", "Buy one, get 20% off the second. Today only.", 450);

  // 10 tables: numbers 1 to 10 (1-4 seat two people, the rest seat four)
  const insertTable = db.prepare("INSERT INTO cafe_tables (number, seats) VALUES (?, ?)");
  for (let n = 1; n <= 10; n++) {
    insertTable.run(n, n <= 4 ? 2 : 4);
  }
}

if (db.prepare("PRAGMA user_version").get().user_version === 0) {
  db.transaction(() => {
    addStarterData();
    db.exec("PRAGMA user_version = 1");
  })();
}

// ---------- First admin account ----------
// The admin login comes from server/.env (ADMIN_EMAIL and ADMIN_PASSWORD).
// It is created only if there is no admin yet.
function ensureAdmin() {
  const exists = db.prepare("SELECT 1 FROM users WHERE role = 'admin'").get();
  if (exists) return;

  const email = (process.env.ADMIN_EMAIL || "admin@coffeecastle.pk").toLowerCase();
  let password = process.env.ADMIN_PASSWORD;

  if (!password) {
    if (process.env.NODE_ENV === "production") {
      console.warn("No ADMIN_PASSWORD set, so no admin account was created.");
      return;
    }
    // Development only: a well-known password. Never use this online.
    password = "admin12345";
    console.warn(`Created a development admin: ${email} / ${password}  (set ADMIN_PASSWORD in .env)`);
  }

  db.prepare(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')"
  ).run("Café Admin", email, bcrypt.hashSync(password, 10));
}

ensureAdmin();

module.exports = db;
