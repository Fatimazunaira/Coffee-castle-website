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

// PRAGMA user_version is a number stored inside the database file.
// 0 = brand new file, 2 = this layout. (1 was an earlier test layout.)
const version = db.prepare("PRAGMA user_version").get().user_version;
if (version === 1) {
  console.error(
    "Your server/coffee-castle.db was made by an older test version of this project.\n" +
      "Stop the server, delete server/coffee-castle.db (and the .db-shm / .db-wal files next to it),\n" +
      "then start the server again. See DATABASE.md."
  );
  process.exit(1);
}

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

  -- image is a link like /images/menu1.jpg, or a small picture saved as text (a data URL).
  CREATE TABLE IF NOT EXISTS menu_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    category    TEXT    NOT NULL,
    price       INTEGER NOT NULL CHECK (price > 0),
    image       TEXT    NOT NULL,
    is_drink    INTEGER NOT NULL DEFAULT 0,
    sold_out    INTEGER NOT NULL DEFAULT 0
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

  -- name, price and details are copied from the menu at the moment of ordering,
  -- so old receipts stay correct even if the menu changes later.
  -- price is the price of ONE item including the customer's choices.
  CREATE TABLE IF NOT EXISTS order_items (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INTEGER,
    name         TEXT    NOT NULL,
    details      TEXT    NOT NULL DEFAULT '',
    price        INTEGER NOT NULL,
    qty          INTEGER NOT NULL
  );

  -- Each logged-in customer's current cart (so the admin can see it).
  -- One row per cart line. options holds the drink choices as JSON text
  -- (or NULL for food). line_key tells apart the same drink with different choices.
  CREATE TABLE IF NOT EXISTS carts (
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    line_key     TEXT    NOT NULL,
    menu_item_id INTEGER NOT NULL,
    options      TEXT,
    qty          INTEGER NOT NULL CHECK (qty > 0),
    PRIMARY KEY (user_id, line_key)
  );
`);

// ---------- Starter data (only the very first time) ----------
function addMenuItems() {
  const insertItem = db.prepare(
    "INSERT INTO menu_items (name, description, category, price, image, is_drink) VALUES (?, ?, ?, ?, ?, ?)"
  );
  // The same six dishes the site showed before the database existed.
  // Prices are placeholders: change them from the admin panel.
  const items = [
    ["Caramel Latte", "Espresso, steamed milk and a ribbon of caramel.", "Hot Coffee", 450, "/images/menu1.jpg", 1],
    ["Chicken Club Sandwich", "Grilled chicken, egg and lettuce on toasted bread.", "Snacks", 650, "/images/menu2.jpg", 0],
    ["Cheese Omelette", "Fluffy eggs folded around melted cheese.", "Snacks", 400, "/images/menu3.jpg", 0],
    ["Chocolate Brownie", "Fudgy brownie with a crisp top.", "Bakery", 320, "/images/menu4.jpg", 0],
    ["Cold Coffee", "Chilled coffee blended smooth with ice and milk.", "Cold Drinks", 480, "/images/menu5.jpg", 1],
    ["Loaded Fries", "Crispy fries with cheese sauce and jalapeños.", "Snacks", 450, "/images/menu6.jpg", 0],
  ];
  for (const item of items) {
    insertItem.run(...item);
  }
}

function addStarterData() {
  addMenuItems();

  db.prepare(
    "INSERT INTO promo (id, title, description, price, active) VALUES (1, ?, ?, ?, 1)"
  ).run("Caramel Latte", "Buy one, get 20% off the second. Today only.", 450);

  // 10 tables: numbers 1 to 10 (1-4 seat two people, the rest seat four)
  const insertTable = db.prepare("INSERT INTO cafe_tables (number, seats) VALUES (?, ?)");
  for (let n = 1; n <= 10; n++) {
    insertTable.run(n, n <= 4 ? 2 : 4);
  }
}

if (version === 0) {
  db.transaction(() => {
    addStarterData();
    db.exec("PRAGMA user_version = 2");
  })();
} else if (db.prepare("SELECT COUNT(*) AS n FROM menu_items").get().n === 0) {
  // The menu is empty (for example every item was deleted): put the six
  // starter dishes back so the Menu page is never blank after a restart.
  addMenuItems();
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
