const { collection } = require("./db");
const { priceLine, lineKey } = require("./menuOptions");

async function checkLines(rawLines, { strict }) {
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
    } else if (!(item = await collection("menu_items").findOne(
      { id: itemId },
      { projection: { id: 1, name: 1, price: 1, is_drink: 1, sold_out: 1 } }
    ))) {
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

async function loadCart(userId) {
  const cart = await collection("carts").findOne({ user_id: userId });
  const raw = (cart ? cart.lines : []).map((line) => ({
    itemId: line.menu_item_id,
    options: line.options || null,
    qty: line.qty,
  }));
  return (await checkLines(raw, { strict: false })).lines;
}

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
