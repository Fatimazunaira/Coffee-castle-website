// The menu choices, and the price maths for one cart line.
//
// IMPORTANT: DRINK_OPTIONS and CATEGORIES must stay the same as in
// client/src/data/menuOptions.js. The browser uses its copy to SHOW the
// choices; the server uses this copy to work out the REAL price, so a
// customer cannot change a price by editing the page.

const CATEGORIES = ["Hot Coffee", "Cold Drinks", "Tea", "Bakery", "Snacks"];

const DRINK_OPTIONS = {
  sizes: [
    { id: "small", name: "Small", price: -50 },
    { id: "regular", name: "Regular", price: 0 },
    { id: "large", name: "Large", price: 80 },
  ],
  milks: [
    { id: "whole", name: "Whole milk", price: 0 },
    { id: "skim", name: "Skim milk", price: 0 },
    { id: "oat", name: "Oat milk", price: 100 },
    { id: "almond", name: "Almond milk", price: 100 },
  ],
  shotPrice: 100,
  maxShots: 3,
  sugar: [
    { id: "none", name: "No sugar" },
    { id: "low", name: "Low" },
    { id: "normal", name: "Normal" },
    { id: "high", name: "Extra sweet" },
  ],
  addons: [
    { id: "whip", name: "Whipped cream", price: 60 },
    { id: "caramel", name: "Caramel syrup", price: 70 },
    { id: "vanilla", name: "Vanilla syrup", price: 70 },
    { id: "hazelnut", name: "Hazelnut syrup", price: 70 },
  ],
};

const DEFAULT_CHOICES = { size: "regular", milk: "whole", shots: 0, sugar: "normal", addons: [] };

// Turns whatever the browser sent into clean, valid choices (or null if it is invalid).
function cleanChoices(raw) {
  const o = DRINK_OPTIONS;
  const input = raw && typeof raw === "object" ? raw : {};
  const choices = { ...DEFAULT_CHOICES, ...input };

  if (!o.sizes.some((s) => s.id === choices.size)) return null;
  if (!o.milks.some((m) => m.id === choices.milk)) return null;
  if (!o.sugar.some((s) => s.id === choices.sugar)) return null;
  if (!Number.isInteger(choices.shots) || choices.shots < 0 || choices.shots > o.maxShots) return null;
  if (!Array.isArray(choices.addons)) return null;

  const addons = [...new Set(choices.addons)];
  if (!addons.every((id) => o.addons.some((a) => a.id === id))) return null;

  return { size: choices.size, milk: choices.milk, shots: choices.shots, sugar: choices.sugar, addons: addons.sort() };
}

// The price of ONE item, and the line of text shown under it in the cart.
// menuItem comes from the database: { price, is_drink }.
// Returns { unitPrice, details, choices } or null if the choices are invalid.
function priceLine(menuItem, rawChoices) {
  if (!menuItem.is_drink) {
    return { unitPrice: menuItem.price, details: "", choices: null };
  }

  const choices = cleanChoices(rawChoices);
  if (!choices) return null;

  const o = DRINK_OPTIONS;
  const size = o.sizes.find((s) => s.id === choices.size);
  const milk = o.milks.find((m) => m.id === choices.milk);
  const sugar = o.sugar.find((s) => s.id === choices.sugar);
  const addons = o.addons.filter((a) => choices.addons.includes(a.id));

  let unitPrice = menuItem.price + size.price + milk.price + choices.shots * o.shotPrice;
  for (const addon of addons) unitPrice += addon.price;

  const parts = [size.name, milk.name];
  if (choices.shots > 0) parts.push(choices.shots + (choices.shots === 1 ? " extra shot" : " extra shots"));
  parts.push("Sugar: " + sugar.name);
  for (const addon of addons) parts.push(addon.name);

  return { unitPrice: Math.max(0, unitPrice), details: parts.join(" · "), choices };
}

// One cart line is the dish PLUS its choices. Two lines with different choices
// are different lines. This key is what tells them apart.
function lineKey(menuItemId, choices) {
  if (!choices) return String(menuItemId);
  return [menuItemId, choices.size, choices.milk, choices.shots, choices.sugar, choices.addons.join("+")].join("|");
}

module.exports = { CATEGORIES, DRINK_OPTIONS, priceLine, lineKey, cleanChoices };
