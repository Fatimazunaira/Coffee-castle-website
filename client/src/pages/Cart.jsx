import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CartContext } from "../context/CartContext";
import { AuthContext } from "../context/AuthContext";
import { api } from "../api";

function Cart() {
  const { items, total, changeQty, removeItem, clearCart } =
    useContext(CartContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [orderType, setOrderType] = useState("dine-in");
  const [payment, setPayment] = useState("counter");
  const [name, setName] = useState(user ? user.name : "");
  const [phone, setPhone] = useState(user && user.phone ? user.phone : "");
  // placed = the server's answer after a successful order (or null)
  const [placed, setPlaced] = useState(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function placeOrder(e) {
    e.preventDefault();

    // You need an account to order, so the café knows who you are.
    if (!user) {
      navigate("/login", { state: { from: "/cart" } });
      return;
    }

    setError("");
    setSending(true);
    try {
      // The server works out the real prices and picks your table.
      // Paying with Stripe will be added later.
      const result = await api("/api/orders", {
        method: "POST",
        body: {
          name,
          phone,
          orderType,
          payment,
          items: items.map((item) => ({ id: item.id, qty: item.qty })),
        },
      });
      setPlaced(result);
      clearCart();
    } catch (err) {
      setError(err.message);
    }
    setSending(false);
  }

  // After the order is placed
  if (placed) {
    return (
      <section className="cart-page">
        <div className="cart-done">
          <h2>Thank you, {name}!</h2>
          <p>Your order has been placed.</p>
          {placed.table && <p>Your table is number {placed.table.number}.</p>}
          {placed.waiting && (
            <p>All tables are taken right now. We will give you one as soon as it is free.</p>
          )}
          {placed.orderType === "takeaway" && <p>We will have your order ready to take away.</p>}
          <Link to="/" className="order-btn">
            BACK TO HOME
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

          {!user && (
            <p className="form-note">
              Please <Link to="/login" state={{ from: "/cart" }}>log in or sign up</Link> to place your order.
            </p>
          )}

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

          <button type="submit" className="place-btn" disabled={sending}>
            {sending ? "PLEASE WAIT..." : user ? "PLACE ORDER" : "LOG IN TO ORDER"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default Cart;