import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";
import { AuthContext } from "./AuthContext";

export const CartContext = createContext();

export function CartProvider({ children }) {
  const { user } = useContext(AuthContext);

  // Two sample items so you can see the page.
  // When the Menu page is ready, change this to useState([])
  const [items, setItems] = useState([
    { id: 1, name: "Caramel Latte", price: 450, qty: 1 },
    { id: 2, name: "Chicken Club Sandwich", price: 650, qty: 2 },
  ]);

  // syncedFor = the id of the logged-in user whose saved cart we have loaded.
  // Until then we do not save anything, so we never wipe a saved cart by mistake.
  const [syncedFor, setSyncedFor] = useState(null);
  const userId = user ? user.id : null;

  // When someone logs in, load the cart they saved last time (if any).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    api("/api/cart")
      .then((data) => {
        if (cancelled) return;
        if (data.items.length > 0) {
          setItems(data.items);
        }
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
        body: { items: items.map((item) => ({ id: item.id, qty: item.qty })) },
      }).catch(() => {});
    }, 500);

    return () => clearTimeout(timer);
  }, [items, userId, syncedFor]);

  // Add one item to the cart (used later by the Menu page)
  function addToCart(newItem) {
    const found = items.find((item) => item.id === newItem.id);
    if (found) {
      changeQty(newItem.id, 1);
    } else {
      setItems([...items, { ...newItem, qty: 1 }]);
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
