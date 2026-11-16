import { useState } from "react";
import { formatPrice } from "../api";

// FR-2: personalize an item (size, milk, extra shots, sugar level, add-ons)
export default function ItemModal({ item, options, onAdd, onClose }) {
  const [size, setSize] = useState("regular");
  const [milk, setMilk] = useState("whole");
  const [shots, setShots] = useState(0);
  const [sugar, setSugar] = useState("normal");
  const [addons, setAddons] = useState([]);
  const [qty, setQty] = useState(1);

  const sizeOpt = options.sizes.find((o) => o.id === size);
  const milkOpt = options.milks.find((o) => o.id === milk);
  const addonOpts = options.addons.filter((a) => addons.includes(a.id));

  const unitPrice =
    item.price +
    sizeOpt.price +
    milkOpt.price +
    shots * options.shotPrice +
    addonOpts.reduce((sum, a) => sum + a.price, 0);

  const toggleAddon = (id) =>
    setAddons((cur) => (cur.includes(id) ? cur.filter((a) => a !== id) : [...cur, id]));

  const submit = () => {
    onAdd({
      item,
      qty,
      unitPrice,
      choices: {
        size: sizeOpt.name,
        milk: milkOpt.name,
        shots,
        sugar: options.sugar.find((s) => s.id === sugar).name,
        addons: addonOpts.map((a) => a.name),
      },
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Customize ${item.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2>
          {item.emoji} {item.name}
        </h2>
        <p className="muted">{item.description}</p>

        <fieldset>
          <legend>Size</legend>
          <div className="chips">
            {options.sizes.map((o) => (
              <label key={o.id} className={`chip ${size === o.id ? "on" : ""}`}>
                <input type="radio" name="size" checked={size === o.id} onChange={() => setSize(o.id)} />
                {o.name}
                {o.price !== 0 && <small> {o.price > 0 ? "+" : "−"}{Math.abs(o.price)}</small>}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Milk</legend>
          <div className="chips">
            {options.milks.map((o) => (
              <label key={o.id} className={`chip ${milk === o.id ? "on" : ""}`}>
                <input type="radio" name="milk" checked={milk === o.id} onChange={() => setMilk(o.id)} />
                {o.name}
                {o.price > 0 && <small> +{o.price}</small>}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Extra shots (+{options.shotPrice} each)</legend>
          <div className="qty">
            <button onClick={() => setShots((s) => Math.max(0, s - 1))} aria-label="Fewer shots">−</button>
            <span>{shots}</span>
            <button onClick={() => setShots((s) => Math.min(options.maxShots, s + 1))} aria-label="More shots">+</button>
          </div>
        </fieldset>

        <fieldset>
          <legend>Sugar level</legend>
          <div className="chips">
            {options.sugar.map((o) => (
              <label key={o.id} className={`chip ${sugar === o.id ? "on" : ""}`}>
                <input type="radio" name="sugar" checked={sugar === o.id} onChange={() => setSugar(o.id)} />
                {o.name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Add-ons</legend>
          <div className="chips">
            {options.addons.map((o) => (
              <label key={o.id} className={`chip ${addons.includes(o.id) ? "on" : ""}`}>
                <input type="checkbox" checked={addons.includes(o.id)} onChange={() => toggleAddon(o.id)} />
                {o.name}
                <small> +{o.price}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="modal-footer">
          <div className="qty">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">−</button>
            <span>{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity">+</button>
          </div>
          <button className="btn primary" onClick={submit}>
            Add to cart · {formatPrice(unitPrice * qty)}
          </button>
        </div>
      </div>
    </div>
  );
}
