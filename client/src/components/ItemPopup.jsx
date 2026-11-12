import { useContext, useEffect, useState } from "react";
import { CartContext } from "../context/CartContext";
import { DRINK_OPTIONS } from "../data/menuOptions";
import "../menu.css";

// Popup that opens when a customer clicks a menu item.
// Drinks get size / milk / shots / sugar / add-ons. Food only gets quantity.
function ItemPopup({ item, onClose, onAdded }) {
  const { addToCart } = useContext(CartContext);
  const o = DRINK_OPTIONS;

  const [size, setSize] = useState("regular");
  const [milk, setMilk] = useState("whole");
  const [shots, setShots] = useState(0);
  const [sugar, setSugar] = useState("normal");
  const [addons, setAddons] = useState([]);
  const [qty, setQty] = useState(1);

  // Esc closes the popup. The page behind it must not scroll.
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = oldOverflow;
    };
  }, [onClose]);

  const sizeOpt = o.sizes.find((s) => s.id === size);
  const milkOpt = o.milks.find((m) => m.id === milk);
  const sugarOpt = o.sugar.find((s) => s.id === sugar);
  const addonOpts = o.addons.filter((a) => addons.includes(a.id));

  // price of ONE item with the chosen options
  let unitPrice = item.price;
  if (item.isDrink) {
    unitPrice += sizeOpt.price + milkOpt.price + shots * o.shotPrice;
    for (const a of addonOpts) unitPrice += a.price;
  }

  function toggleAddon(id) {
    setAddons(addons.includes(id) ? addons.filter((a) => a !== id) : [...addons, id]);
  }

  function handleAdd() {
    let id = item.id;
    let details = "";

    if (item.isDrink) {
      // Different options = a different cart line, so the id includes them.
      id = [item.id, size, milk, shots, sugar, addons.slice().sort().join("+")].join("|");
      const parts = [sizeOpt.name, milkOpt.name];
      if (shots > 0) parts.push(shots + (shots === 1 ? " extra shot" : " extra shots"));
      parts.push("Sugar: " + sugarOpt.name);
      for (const a of addonOpts) parts.push(a.name);
      details = parts.join(" · ");
    }

    addToCart({ id, name: item.name, price: unitPrice, details }, qty);
    onAdded(qty + " × " + item.name + " added to cart");
    onClose();
  }

  return (
    <div className="mn-backdrop" onClick={onClose}>
      <div
        className="mn-modal"
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        data-lenis-prevent
        onClick={(e) => e.stopPropagation()}
      >
        <button className="mn-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <img className="mn-modal-img" src={item.image} alt={item.name} />

        <div className="mn-modal-body">
          <p className="mn-modal-cat">{item.category}</p>
          <h2>{item.name}</h2>
          <p className="mn-modal-price">Rs. {item.price}</p>
          {item.description && <p className="mn-modal-desc">{item.description}</p>}

          {item.isDrink && (
            <>
              <p className="group-title">Size</p>
              <div className="mn-chips">
                {o.sizes.map((s) => (
                  <label key={s.id} className={size === s.id ? "mn-chip on" : "mn-chip"}>
                    <input type="radio" name="size" checked={size === s.id} onChange={() => setSize(s.id)} />
                    {s.name}
                    {s.price !== 0 && ` (${s.price > 0 ? "+" : "-"}${Math.abs(s.price)})`}
                  </label>
                ))}
              </div>

              <p className="group-title">Milk</p>
              <div className="mn-chips">
                {o.milks.map((m) => (
                  <label key={m.id} className={milk === m.id ? "mn-chip on" : "mn-chip"}>
                    <input type="radio" name="milk" checked={milk === m.id} onChange={() => setMilk(m.id)} />
                    {m.name}
                    {m.price > 0 && ` (+${m.price})`}
                  </label>
                ))}
              </div>

              <p className="group-title">Extra shots (+{o.shotPrice} each)</p>
              <div className="qty">
                <button type="button" onClick={() => setShots(Math.max(0, shots - 1))} aria-label="Fewer shots">-</button>
                <span>{shots}</span>
                <button type="button" onClick={() => setShots(Math.min(o.maxShots, shots + 1))} aria-label="More shots">+</button>
              </div>

              <p className="group-title">Sugar</p>
              <div className="mn-chips">
                {o.sugar.map((s) => (
                  <label key={s.id} className={sugar === s.id ? "mn-chip on" : "mn-chip"}>
                    <input type="radio" name="sugar" checked={sugar === s.id} onChange={() => setSugar(s.id)} />
                    {s.name}
                  </label>
                ))}
              </div>

              <p className="group-title">Add-ons</p>
              <div className="mn-chips">
                {o.addons.map((a) => (
                  <label key={a.id} className={addons.includes(a.id) ? "mn-chip on" : "mn-chip"}>
                    <input type="checkbox" checked={addons.includes(a.id)} onChange={() => toggleAddon(a.id)} />
                    {a.name} (+{a.price})
                  </label>
                ))}
              </div>
            </>
          )}

          <div className="mn-modal-foot">
            <div className="qty">
              <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease quantity">-</button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty(qty + 1)} aria-label="Increase quantity">+</button>
            </div>
            <button type="button" className="place-btn mn-add" onClick={handleAdd}>
              ADD TO CART · Rs. {unitPrice * qty}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ItemPopup;
