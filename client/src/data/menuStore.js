// ---------------------------------------------------------------------------
// MENU STORE: the ONLY file that knows where menu items are saved.
//
// Items are saved in the database, through the server. (Before the database
// existed they lived in the browser's localStorage; the functions below have
// the same names and the same results, so the Menu page, Admin page and popup
// did not need to change.)
//
// Reading the menu is open to everybody. Adding, editing and deleting only
// work when an admin is logged in: the server checks that on every request.
//
// An item looks like:
// { id, name, price, image, category, description, isDrink, soldOut }
//   image = a data URL (admin upload) or a path like "/images/menu1.jpg"
// ---------------------------------------------------------------------------
import { api } from "../api";
import { CATEGORIES } from "./menuOptions";

const CHANGED = "coffee-castle-menu-changed";

function announceChange() {
  window.dispatchEvent(new Event(CHANGED));
}

// Checks one item and returns a clean copy. Throws an Error with a message
// the admin form can show. (The server repeats these checks.)
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
  const data = await api("/api/menu");
  return data.items;
}

export async function addItem(data) {
  const result = await api("/api/admin/menu", { method: "POST", body: clean(data) });
  announceChange();
  return result.item;
}

export async function updateItem(id, data) {
  // merge with the existing item, like the old version did, so a partial
  // change (for example only soldOut) keeps the other fields
  const items = await getMenu();
  const current = items.find((i) => i.id === id);
  if (!current) throw new Error("That item no longer exists.");
  await api("/api/admin/menu/" + id, { method: "PUT", body: clean({ ...current, ...data }) });
  announceChange();
}

export async function deleteItem(id) {
  await api("/api/admin/menu/" + id, { method: "DELETE" });
  announceChange();
}

// Calls `callback` whenever the menu changes: in this tab (admin saved), or
// when you come back to this tab after being away. Returns a function that
// stops listening.
export function subscribe(callback) {
  window.addEventListener(CHANGED, callback);
  window.addEventListener("focus", callback);
  return () => {
    window.removeEventListener(CHANGED, callback);
    window.removeEventListener("focus", callback);
  };
}
