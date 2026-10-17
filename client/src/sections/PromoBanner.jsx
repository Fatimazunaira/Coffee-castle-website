import { Link } from "react-router-dom";

function PromoBanner() {
  // For now these are fixed words. Later the admin will change them.
  const promo = {
    title: "Caramel Latte",
    description: "Buy one, get 20% off the second. Today only.",
    price: "Rs. 450",
  };

  return (
    <section className="promo">
      <span className="promo-script">Today's Special</span>

      <div className="promo-info">
        <h2>{promo.title}</h2>
        <p>{promo.description}</p>
      </div>

      <div className="promo-right">
        <p className="promo-price">{promo.price}</p>
        <Link to="/menu" className="order-btn">
          ORDER NOW
        </Link>
      </div>
    </section>
  );
}

export default PromoBanner;