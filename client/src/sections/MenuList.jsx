import { useState } from "react";
import { Link } from "react-router-dom";

function MenuList() {
  const items = [
    { name: "Caramel Latte", image: "/images/menu1.jpg" },
    { name: "Chicken Club Sandwich", image: "/images/menu2.jpg" },
    { name: "Cheese Omelette", image: "/images/menu3.jpg" },
    { name: "Chocolate Brownie", image: "/images/menu4.jpg" },
    { name: "Cold Coffee", image: "/images/menu5.jpg" },
    { name: "Loaded Fries", image: "/images/menu6.jpg" },
  ];

  // active = which row is highlighted
  const [active, setActive] = useState(0);
  // show = is the mouse on the card
  const [show, setShow] = useState(false);
  // pos = where the small picture should be
  const [pos, setPos] = useState({ x: 0, y: 0 });

  function handleMove(e) {
    const box = e.currentTarget.getBoundingClientRect();
    const x = Math.min(e.clientX - box.left + 20, box.width - 180);
    const y = e.clientY - box.top - 70;
    setPos({ x: x, y: y });
  }

  return (
    <section className="signature">
      <div className="signature-text">
        <p>
          The menu at Coffee Castle blends comfort classics with modern tastes.
          Every dish is made fresh, and you can order it before you even walk
          in.
        </p>
        <div className="dotted-line"></div>
        <p>
          Whether it is a coffee between classes or a long lunch with friends,
          the food here keeps things simple and tasty.
        </p>
        <Link to="/menu" className="order-btn">
          SEE FULL MENU
        </Link>
      </div>

      <div
        className="menu-card"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onMouseMove={handleMove}
      >
        <div
          className={show ? "menu-preview show" : "menu-preview"}
          style={{
            left: pos.x,
            top: pos.y,
            backgroundImage: `url(${items[active].image})`,
          }}
        ></div>

        <h3 className="menu-card-title">COFFEE CASTLE</h3>

        {items.map((item, index) => (
          <div
            key={item.name}
            className={index === active ? "menu-row active" : "menu-row"}
            onMouseEnter={() => setActive(index)}
          >
            <span>{item.name}</span>
            <span className="menu-dots"></span>
            <span>0{index + 1}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default MenuList;