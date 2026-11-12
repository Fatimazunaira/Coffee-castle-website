import { createContext, useState } from "react";

export const CartContext = createContext();

export function CartProvider({ children }) {
  // The cart starts empty. The Menu page fills it.
  const [items, setItems] = useState([]);

  // Add an item to the cart (used by the Menu popup).
  // newItem = { id, name, price, details }   amount = how many (default 1)
  // "details" is an optional line such as "Large · Oat milk" shown in the cart.
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