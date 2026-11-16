import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useMenu from "../data/useMenu";
import { CATEGORIES } from "../data/menuOptions";
import ItemPopup from "../components/ItemPopup";
import "../menu.css";

// Customer menu page (/menu).
// Hover a row: the food photo follows the cursor. Click a row: popup, then cart.
function Menu() {
  const { items, loading, error } = useMenu();

  const [selected, setSelected] = useState(null); // item shown in the popup
  const [active, setActive] = useState(null); // item whose photo is previewed
  const [show, setShow] = useState(false); // is the mouse on the board
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [toast, setToast] = useState("");

  // hide the "added to cart" message after 2.5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  function handleMove(e) {
    const box = e.currentTarget.getBoundingClientRect();
    const x = Math.min(e.clientX - box.left + 20, box.width - 260);
    const y = e.clientY - box.top - 90;
    setPos({ x: x, y: y });
  }

  function openItem(item) {
    if (item.soldOut) return;
    setSelected(item);
  }

  // group items by category, in the same order as the admin dropdown
  const groups = CATEGORIES.map((name) => ({
    name,
    list: items.filter((i) => i.category === name),
  })).filter((g) => g.list.length > 0);

  return (
    <section className="mn-page">
      <div className="mn-heading">
        <span className="mn-script">Our</span>
        <h1>Menu</h1>
        <p>Point at a dish to see it. Click to order.</p>
      </div>

      {loading ? (
        <p className="mn-empty">Loading the menu…</p>
      ) : error ? (
        <p className="mn-empty" role="alert">
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className="mn-empty">No items on the menu yet. Please check back soon.</p>
      ) : (
        <div
          className="mn-board"
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
          onMouseMove={handleMove}
        >
          <div
            className={show && active ? "mn-preview show" : "mn-preview"}
            style={{
              left: pos.x,
              top: pos.y,
              backgroundImage: active ? `url("${active.image}")` : "none",
            }}
          ></div>

          <h3 className="mn-board-title">COFFEE CASTLE</h3>

          {groups.map((group) => (
            <div key={group.name}>
              <h4 className="mn-cat">{group.name}</h4>
              {group.list.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={
                    (active && active.id === item.id ? "mn-row active" : "mn-row") +
                    (item.soldOut ? " sold" : "")
                  }
                  aria-disabled={item.soldOut}
                  onMouseEnter={() => setActive(item)}
                  onFocus={() => setActive(item)}
                  onClick={() => openItem(item)}
                >
                  <img className="mn-thumb" src={item.image} alt="" />
                  <span>{item.name}</span>
                  {item.soldOut && <span className="mn-tag">SOLD OUT</span>}
                  <span className="mn-dots"></span>
                  <span className="mn-price">Rs. {item.price}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <p className="mn-cartlink">
        <Link to="/cart" className="order-btn">
          GO TO CART
        </Link>
      </p>

      {selected && (
        <ItemPopup item={selected} onClose={() => setSelected(null)} onAdded={setToast} />
      )}

      {toast && (
        <div className="mn-toast" role="status">
          {toast}
        </div>
      )}
    </section>
  );
}

export default Menu;
