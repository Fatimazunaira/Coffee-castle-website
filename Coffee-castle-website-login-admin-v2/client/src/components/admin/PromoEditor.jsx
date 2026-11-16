import { useEffect, useState } from "react";
import { api } from "../../api";

function PromoEditor() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [active, setActive] = useState(true);

  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Fill the form with what the home page shows right now.
  useEffect(() => {
    api("/api/promo")
      .then((data) => {
        if (data.promo) {
          setTitle(data.promo.title);
          setDescription(data.promo.description);
          setPrice(data.promo.price === null ? "" : String(data.promo.price));
          setActive(data.promo.active);
        }
        setLoaded(true);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function save(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await api("/api/admin/promo", {
        method: "PUT",
        body: { title, description, price, active },
      });
      setMessage("Saved. The home page now shows this banner.");
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  if (!loaded && !error) {
    return <p>Loading...</p>;
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Promo banner</h2>
      <p className="panel-help">This is the "Today's Special" banner on the home page.</p>

      <div className="two-col">
        <form className="admin-card" onSubmit={save}>
          <label className="field">
            Title
            <input
              type="text"
              required
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="field">
            Description
            <input
              type="text"
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label className="field">
            Price (Rs.) - leave empty to hide the price
            <input
              type="number"
              min="0"
              step="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>

          <label className="choice">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Show the
            banner on the home page
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="form-ok" role="status">
              {message}
            </p>
          )}

          <button type="submit" className="place-btn" disabled={busy}>
            {busy ? "SAVING..." : "SAVE BANNER"}
          </button>
        </form>

        <div>
          <p className="group-title">Preview</p>
          {active ? (
            <div className="promo promo-preview">
              <span className="promo-script">Today's Special</span>
              <div className="promo-info">
                <h2>{title || "Title"}</h2>
                <p>{description}</p>
              </div>
              {price !== "" && (
                <div className="promo-right">
                  <p className="promo-price">Rs. {price}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="panel-help">The banner is hidden, so visitors will not see it.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default PromoEditor;
