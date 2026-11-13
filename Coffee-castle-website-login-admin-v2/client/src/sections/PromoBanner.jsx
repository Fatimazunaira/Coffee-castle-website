import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

// Shown if the server cannot be reached.
const FALLBACK = {
  title: "Caramel Latte",
  description: "Buy one, get 20% off the second. Today only.",
  price: 450,
  active: true,
};

// The banner text comes from the database; the admin changes it in /admin.
function PromoBanner() {
  const [promo, setPromo] = useState(FALLBACK);

  useEffect(() => {
    api("/api/promo")
      .then((data) => setPromo(data.promo))
      .catch(() => {}); // keep the fallback text
  }, []);

  // the admin can switch the banner off
  if (!promo.active) return null;

  return (
    <section className="promo">
      <span className="promo-script">Today's Special</span>

      <div className="promo-info">
        <h2>{promo.title}</h2>
        <p>{promo.description}</p>
      </div>

      <div className="promo-right">
        {promo.price !== null && promo.price !== undefined && (
          <p className="promo-price">Rs. {promo.price}</p>
        )}
        <Link to="/menu" className="order-btn">
          ORDER NOW
        </Link>
      </div>
    </section>
  );
}

export default PromoBanner;
