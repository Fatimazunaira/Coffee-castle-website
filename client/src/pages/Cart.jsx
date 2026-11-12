import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import { CartContext } from "../context/CartContext";

function Cart() {
  const { items, total, changeQty, removeItem, clearCart } =
    useContext(CartContext);

  const [orderType, setOrderType] = useState("dine-in");
  const [payment, setPayment] = useState("counter");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [placed, setPlaced] = useState(false);

  function placeOrder(e) {
    e.preventDefault();
    // Later this will send the order to the server and to Stripe.
    // For now it only shows the thank you message.
    setPlaced(true);
    clearCart();
  }

  // After the order is placed
  if (placed) {
    return (
      <section className="cart-page">
        <div className="cart-done">
          <h2>Thank you, {name}!</h2>
          <p>Your order has been placed.</p>
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

          <button type="submit" className="place-btn">
            PLACE ORDER
          </button>
        </form>
      </div>
    </section>
  );
}

export default Cart;