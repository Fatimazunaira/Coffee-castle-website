import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

// Shown only if the server cannot be reached.
const fallback = {
  title: "Caramel Latte",
  description: "Buy one, get 20% off the second. Today only.",
  price: 450,
  active: true,
};

function PromoBanner() {
  // The admin changes these words from the admin panel.
  const [promo, setPromo] = useState(null);

  useEffect(() => {
    api("/api/promo")
      .then((data) => setPromo(data.promo || fallback))
      .catch(() => setPromo(fallback));
  }, []);

  // Still loading, or the admin switched the banner off
  if (!promo || !promo.active) {
    return null;
  }

  return (
    <section className="promo">
      <span className="promo-script">Today's Special</span>

      <div className="promo-info">
        <h2>{promo.title}</h2>
        <p>{promo.description}</p>
      </div>

      <div className="promo-right">
        {promo.price !== null && <p className="promo-price">Rs. {promo.price}</p>}
        <Link to="/menu" className="order-btn">
          ORDER NOW
        </Link>
      </div>
    </section>
  );
}

export default PromoBanner;
