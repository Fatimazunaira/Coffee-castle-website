const db = require("./db");
const { priceLine, lineKey } = require("./menuOptions");

// Checks cart lines sent by the browser: [{ itemId, options, qty }].
// Prices and names are NEVER taken from the browser: they are looked up here.
//
// Returns { lines, problem }.
//   lines   = the good lines, each { key, itemId, name, details, price, qty, choices, soldOut }
//   problem = text for the first bad line (or null)
// With strict = false, bad lines are dropped quietly instead of stopping the order.
function checkLines(rawLines, { strict }) {
  const find = db.prepare("SELECT id, name, price, is_drink, sold_out FROM menu_items WHERE id = ?");
  const byKey = new Map();
  let problem = null;

  const list = Array.isArray(rawLines) ? rawLines.slice(0, 50) : [];
  for (const raw of list) {
    const itemId = Number(raw && raw.itemId);
    const qty = Number(raw && raw.qty);

    let reason = null;
    let item = null;
    let priced = null;

    if (!Number.isInteger(itemId) || !Number.isInteger(qty) || qty < 1 || qty > 50) {
      reason = "Something is wrong with an item in your cart.";
    } else if (!(item = find.get(itemId))) {
      reason = "An item in your cart is no longer on the menu.";
    } else if (!(priced = priceLine(item, raw.options))) {
      reason = `The choices for ${item.name} are not valid.`;
    }

    if (reason) {
      if (strict) return { lines: [], problem: reason };
      problem = problem || reason;
      continue;
    }

    const key = lineKey(itemId, priced.choices);
    const existing = byKey.get(key);
    byKey.set(key, {
      key,
      itemId,
      name: item.name,
      details: priced.details,
      price: priced.unitPrice,
      qty: Math.min((existing ? existing.qty : 0) + qty, 50),
      choices: priced.choices,
      soldOut: item.sold_out === 1,
    });
  }

  return { lines: [...byKey.values()], problem };
}

// The saved cart of one customer, with real names and prices.
function loadCart(userId) {
  const rows = db
    .prepare("SELECT menu_item_id AS itemId, options, qty FROM carts WHERE user_id = ? ORDER BY rowid")
    .all(userId);

  const raw = rows.map((row) => {
    let options = null;
    try {
      options = row.options ? JSON.parse(row.options) : null;
    } catch {
      options = null;
    }
    return { itemId: row.itemId, options, qty: row.qty };
  });
  return checkLines(raw, { strict: false }).lines;
}

// What the browser needs for one line. id matches the id the menu popup makes:
// a plain number for food, the long "5|large|oat|1|normal|whip" text for drinks.
function showLine(line) {
  return {
    id: line.choices ? line.key : line.itemId,
    itemId: line.itemId,
    options: line.choices,
    name: line.name,
    details: line.details,
    price: line.price,
    qty: line.qty,
    soldOut: line.soldOut,
  };
}

module.exports = { checkLines, loadCart, showLine };
