import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";
import { api } from "../api";

function Cart() {
  const { items, total, changeQty, removeItem, clearCart } =
    useContext(CartContext);
  const { user, loading } = useContext(AuthContext);

  const [orderType, setOrderType] = useState("dine-in");
  const [payment, setPayment] = useState("counter");
  // null = the customer has not typed anything: use the name and phone of their account
  const [typedName, setName] = useState(null);
  const [typedPhone, setPhone] = useState(null);
  const name = typedName ?? (user ? user.name : "");
  const phone = typedPhone ?? (user ? user.phone || "" : "");
  const [placed, setPlaced] = useState(null); // the server's answer, once the order is saved
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function placeOrder(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      // We send only WHICH dishes and choices. The server works out the prices.
      // (Paying by card is not connected yet: for now the order is only saved.)
      const result = await api("/api/orders", {
        method: "POST",
        body: {
          name,
          phone,
          orderType,
          payment,
          items: items.map((item) => ({
            itemId: item.itemId,
            options: item.options || null,
            qty: item.qty,
          })),
        },
      });
      setPlaced(result);
      clearCart();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  // After the order is placed
  if (placed) {
    return (
      <section className="cart-page">
        <div className="cart-done">
          <h2>Thank you, {name}!</h2>
          <p>Your order #{placed.orderId} has been placed. Total: Rs. {placed.total}.</p>
          {placed.table && <p>Your table is number {placed.table.number}.</p>}
          {placed.waiting && (
            <p>All tables are taken right now. We will give you one as soon as it is free.</p>
          )}
          <Link to="/" className="order-btn">
            BACK TO HOME
          </Link>
        </div>
      </section>
    );
  }

  // Wait while we check the saved login, then ask guests to log in
  if (loading) return null;
  if (!user) {
    return (
      <section className="cart-page">
        <div className="cart-done">
          <h2>Please log in to order</h2>
          <p>Log in or sign up so we can save your cart and give you a table.</p>
          <Link to="/login" state={{ from: "/cart" }} className="order-btn">
            LOG IN
          </Link>
        </div>
      </section>
    );
  }

  // If the cart is empty
  if (items.length === 0) {
    return (
      <section className="cart-page">
        <div className="cart-done">
          <h2>Your cart is empty</h2>
          <p>Add something tasty from the menu.</p>
          <Link to="/menu" className="order-btn">
            GO TO MENU
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="cart-page">
      <div className="cart-heading">
        <span className="cart-script">Your</span>
        <h1>Cart</h1>
      </div>

      <div className="cart-layout">
        <div className="cart-items">
          {items.map((item) => (
            <div key={item.id} className="cart-row">
              <div className="cart-name">
                {item.name}
                {item.details && <small>{item.details}</small>}
                <small>Rs. {item.price} each</small>
              </div>

              <div className="qty">
                <button onClick={() => changeQty(item.id, -1)}>-</button>
                <span>{item.qty}</span>
                <button onClick={() => changeQty(item.id, 1)}>+</button>
              </div>

              <div className="cart-price">Rs. {item.price * item.qty}</div>

              <button className="remove-btn" onClick={() => removeItem(item.id)}>
                REMOVE
              </button>
            </div>
          ))}
        </div>

        <form className="checkout" onSubmit={placeOrder}>
          <h2>Checkout</h2>

          <label className="field">
            Your name
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="field">
            Phone number
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <p className="group-title">How will you eat?</p>
          <label className="choice">
            <input
              type="radio"
              name="orderType"
              checked={orderType === "dine-in"}
              onChange={() => setOrderType("dine-in")}
            />{" "}
            Dine-in
          </label>
          <label className="choice">
            <input
              type="radio"
              name="orderType"
              checked={orderType === "takeaway"}
              onChange={() => setOrderType("takeaway")}
            />{" "}
            Takeaway
          </label>

          <p className="group-title">How will you pay?</p>
          <label className="choice">
            <input
              type="radio"
              name="payment"
              checked={payment === "counter"}
              onChange={() => setPayment("counter")}
            />{" "}
            Pay at the counter
          </label>
          <label className="choice">
            <input
              type="radio"
              name="payment"
              checked={payment === "stripe"}
              onChange={() => setPayment("stripe")}
            />{" "}
            Pay by card (Stripe)
          </label>

          <div className="total-row">
            <span>Total</span>
            <span>Rs. {total}</span>
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="place-btn" disabled={busy}>
            {busy ? "PLACING…" : "PLACE ORDER"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default Cart;