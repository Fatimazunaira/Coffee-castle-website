// ---------------------------------------------------------------------------
// MENU STORE: the ONLY file that knows where menu items are saved.
//
// Right now items live in the browser's localStorage (no database yet).
// Every function is async and returns a Promise, so when the database is
// ready you only rewrite the bodies of these functions to call the server,
// for example:   getMenu()  ->  fetch("/api/menu").then(r => r.json())
// Nothing in the Menu page, Admin page or popup has to change.
//
// An item looks like:
// { id, name, price, image, category, description, isDrink, soldOut }
//   image = a data URL (admin upload) or a path like "/images/menu1.jpg"
// ---------------------------------------------------------------------------
import { CATEGORIES } from "./menuOptions";

const KEY = "coffee-castle-menu";
const CHANGED = "coffee-castle-menu-changed";

// Items shown the first time, before the admin changes anything.
// Prices are placeholders: edit them from /admin.
const SEED_ITEMS = [
  { id: "seed-1", name: "Caramel Latte", price: 450, image: "/images/menu1.jpg", category: "Hot Coffee", description: "Espresso, steamed milk and a ribbon of caramel.", isDrink: true, soldOut: false },
  { id: "seed-2", name: "Chicken Club Sandwich", price: 650, image: "/images/menu2.jpg", category: "Snacks", description: "Grilled chicken, egg and lettuce on toasted bread.", isDrink: false, soldOut: false },
  { id: "seed-3", name: "Cheese Omelette", price: 400, image: "/images/menu3.jpg", category: "Snacks", description: "Fluffy eggs folded around melted cheese.", isDrink: false, soldOut: false },
  { id: "seed-4", name: "Chocolate Brownie", price: 320, image: "/images/menu4.jpg", category: "Bakery", description: "Fudgy brownie with a crisp top.", isDrink: false, soldOut: false },
  { id: "seed-5", name: "Cold Coffee", price: 480, image: "/images/menu5.jpg", category: "Cold Drinks", description: "Chilled coffee blended smooth with ice and milk.", isDrink: true, soldOut: false },
  { id: "seed-6", name: "Loaded Fries", price: 450, image: "/images/menu6.jpg", category: "Snacks", description: "Crispy fries with cheese sauce and jalapeños.", isDrink: false, soldOut: false },
];

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch {
    /* storage blocked or data corrupted: fall through to the sample menu */
  }
  return null;
}

function save(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    throw new Error(
      "Could not save: browser storage is full. Try a smaller photo or delete an item."
    );
  }
}

function announceChange() {
  window.dispatchEvent(new Event(CHANGED));
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Checks one item and returns a clean copy. Throws an Error with a message
// the admin form can show. (The server should repeat these checks later.)
function clean(data) {
  const name = String(data.name ?? "").trim();
  const price = Number(data.price);
  const image = String(data.image ?? "");

  if (!name) throw new Error("Please enter the name of the food.");
  if (name.length > 60) throw new Error("The name is too long (60 characters max).");
  if (!Number.isFinite(price) || price <= 0) throw new Error("Please enter a price greater than 0.");
  if (!image) throw new Error("A picture of the food is required.");

  return {
    name,
    price: Math.round(price),
    image,
    category: CATEGORIES.includes(data.category) ? data.category : CATEGORIES[0],
    description: String(data.description ?? "").trim().slice(0, 200),
    isDrink: Boolean(data.isDrink),
    soldOut: Boolean(data.soldOut),
  };
}

// ----- the functions the rest of the app uses -----

export async function getMenu() {
  let items = read();
  if (!items) {
    items = SEED_ITEMS;
    try {
      save(items);
    } catch {
      /* not fatal: the sample menu is still shown */
    }
  }
  return items;
}

export async function addItem(data) {
  const items = (await getMenu()).slice();
  const item = { id: newId(), ...clean(data) };
  items.push(item);
  save(items);
  announceChange();
  return item;
}

export async function updateItem(id, data) {
  const items = await getMenu();
  if (!items.some((i) => i.id === id)) throw new Error("That item no longer exists.");
  const updated = items.map((i) => (i.id === id ? { id, ...clean({ ...i, ...data }) } : i));
  save(updated);
  announceChange();
}

export async function deleteItem(id) {
  const items = await getMenu();
  save(items.filter((i) => i.id !== id));
  announceChange();
}

// Calls `callback` whenever the menu changes: in this tab (admin saved)
// or in another tab. Returns a function that stops listening.
export function subscribe(callback) {
  const onStorage = (e) => {
    if (e.key === KEY || e.key === null) callback();
  };
  window.addEventListener(CHANGED, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGED, callback);
    window.removeEventListener("storage", onStorage);
  };
}
