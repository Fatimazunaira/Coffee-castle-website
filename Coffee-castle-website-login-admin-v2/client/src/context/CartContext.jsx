import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";
import { AuthContext } from "./AuthContext";

export const CartContext = createContext();

export function CartProvider({ children }) {
  const { user } = useContext(AuthContext);

  // The cart starts empty. The Menu page fills it.
  const [items, setItems] = useState([]);

  // syncedFor = the id of the logged-in user whose saved cart we have loaded.
  // Until then we do not save anything, so we never wipe a saved cart by mistake.
  const [syncedFor, setSyncedFor] = useState(null);
  const userId = user ? user.id : null;

  // When someone logs in, load the cart they saved last time and join it with
  // anything they already put in the cart before logging in.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    api("/api/cart")
      .then((data) => {
        if (cancelled) return;
        setItems((current) => {
          const merged = current.map((item) => ({ ...item }));
          for (const saved of data.items) {
            const same = merged.find((item) => item.id === saved.id);
            if (same) {
              same.qty = Math.min(same.qty + saved.qty, 50);
            } else {
              merged.push(saved);
            }
          }
          return merged;
        });
        setSyncedFor(userId);
      })
      .catch(() => {
        // server not reachable: keep the local cart, don't save
      });

    return () => {
      cancelled = true;
      setSyncedFor(null);
    };
  }, [userId]);

  // While logged in, save the cart on the server half a second after it changes.
  // This is what lets the admin see each customer's cart.
  useEffect(() => {
    if (!userId || syncedFor !== userId) return;

    const timer = setTimeout(() => {
      api("/api/cart", {
        method: "PUT",
        body: {
          items: items
            .filter((item) => item.itemId !== undefined)
            .map((item) => ({ itemId: item.itemId, options: item.options || null, qty: item.qty })),
        },
      }).catch(() => {});
    }, 500);

    return () => clearTimeout(timer);
  }, [items, userId, syncedFor]);

  // Add an item to the cart (used by the Menu popup).
  // newItem = { id, name, price, details, itemId, options }   amount = how many (default 1)
  // "details" is an optional line such as "Large · Oat milk" shown in the cart.
  // "itemId" and "options" tell the server which dish and which choices this is:
  // the server works out the real price itself.
  function addToCart(newItem, amount = 1) {
    const found = items.find((item) => item.id === newItem.id);
    if (found) {
      changeQty(newItem.id, amount);
    } else {
      setItems([...items, { ...newItem, qty: amount }]);
    }
  }

  // Make the quantity bigger (+1) or smaller (-1)
  function changeQty(id, amount) {
    const updated = items.map((item) => {
      if (item.id === id) {
        return { ...item, qty: item.qty + amount };
      }
      return item;
    });
    // remove items whose quantity reached 0
    setItems(updated.filter((item) => item.qty > 0));
  }

  function removeItem(id) {
    setItems(items.filter((item) => item.id !== id));
  }

  function clearCart() {
    setItems([]);
  }

  // Add up the total price and the number of items
  let total = 0;
  let count = 0;
  for (const item of items) {
    total = total + item.price * item.qty;
    count = count + item.qty;
  }

  const value = {
    items,
    total,
    count,
    addToCart,
    changeQty,
    removeItem,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
