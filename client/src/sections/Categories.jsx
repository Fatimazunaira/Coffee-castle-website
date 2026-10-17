import { useState } from "react";
import { Link } from "react-router-dom";

function Categories() {
  const items = [
    { name: "Coffee", icon: "☕" },
    { name: "Snacks", icon: "🥪" },
    { name: "Desserts", icon: "🍰" },
    { name: "Cold Drinks", icon: "🥤" },
  ];

  // active remembers which oval is selected (0 = the first one)
  const [active, setActive] = useState(0);

  return (
    <section className="categories">
      <h2>What are you craving?</h2>
      <p className="categories-hint">Click an oval to explore</p>

      <div className="oval-row">
        {items.map((item, index) => (
          <div
            key={item.name}
            className={index === active ? "oval-box active" : "oval-box"}
            onClick={() => setActive(index)}
          >
            <div className="oval">{item.icon}</div>
            <p>{item.name}</p>
          </div>
        ))}
      </div>

      <Link to="/menu" className="order-btn">
        SEE FULL MENU
      </Link>
    </section>
  );
}

export default Categories;