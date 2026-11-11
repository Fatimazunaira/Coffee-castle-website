import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import useMenu from "../data/useMenu";
import { addItem, updateItem, deleteItem } from "../data/menuStore";
import { CATEGORIES } from "../data/menuOptions";
import resizeImage from "../data/resizeImage";
import "../menu.css";

const EMPTY_FORM = {
  name: "",
  price: "",
  category: CATEGORIES[0],
  description: "",
  isDrink: false,
  soldOut: false,
  image: "", // the picture is required
};

// Admin menu page (/admin): add, edit and delete menu items.
// No password for now. Protect this route when Login is built.
function Admin() {
  const { items, loading } = useMenu();

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null); // null = adding a new item
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [fileKey, setFileKey] = useState(0); // changing it clears the file input
  const formRef = useRef(null);

  function change(field, value) {
    setForm({ ...form, [field]: value });
  }

  async function handlePicture(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    try {
      const image = await resizeImage(file);
      setForm((f) => ({ ...f, image }));
    } catch (err) {
      setError(err.message);
      setFileKey(fileKey + 1);
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFileKey(fileKey + 1);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (editingId) {
        await updateItem(editingId, form);
        setNotice(`Saved changes to "${form.name.trim()}".`);
      } else {
        await addItem(form);
        setNotice(`Added "${form.name.trim()}" to the menu.`);
      }
      resetForm();
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  function startEdit(item) {
    setForm({
      name: item.name,
      price: String(item.price),
      category: item.category,
      description: item.description || "",
      isDrink: item.isDrink,
      soldOut: item.soldOut,
      image: item.image,
    });
    setEditingId(item.id);
    setFileKey(fileKey + 1);
    setError("");
    setNotice("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete "${item.name}" from the menu?`)) return;
    setError("");
    setNotice("");
    try {
      await deleteItem(item.id);
      if (editingId === item.id) resetForm();
      setNotice(`Deleted "${item.name}".`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="mn-page">
      <div className="mn-heading">
        <span className="mn-script">Admin</span>
        <h1>Menu</h1>
        <p>
          Add, edit or remove dishes. Changes show on the{" "}
          <Link to="/menu" className="ad-link">customer menu</Link> straight away.
        </p>
      </div>

      <div className="ad-layout">
        <form className="checkout ad-form" onSubmit={handleSubmit} ref={formRef} noValidate>
          <h2>{editingId ? "Edit item" : "Add item"}</h2>

          <label className="field">
            Name of the food *
            <input
              type="text"
              value={form.name}
              maxLength={60}
              onChange={(e) => change("name", e.target.value)}
            />
          </label>

          <label className="field">
            Price (Rs.) *
            <input
              type="number"
              min="1"
              step="1"
              value={form.price}
              onChange={(e) => change("price", e.target.value)}
            />
          </label>

          <label className="field">
            Picture of the food *
            <input key={fileKey} type="file" accept="image/*" onChange={handlePicture} />
          </label>
          {form.image ? (
            <img className="ad-preview" src={form.image} alt="Preview of the food" />
          ) : (
            <p className="ad-hint">No picture chosen yet.</p>
          )}

          <label className="field">
            Category
            <select value={form.category} onChange={(e) => change("category", e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Description (optional)
            <textarea
              rows={3}
              maxLength={200}
              value={form.description}
              onChange={(e) => change("description", e.target.value)}
            />
          </label>

          <label className="choice">
            <input
              type="checkbox"
              checked={form.isDrink}
              onChange={(e) => change("isDrink", e.target.checked)}
            />{" "}
            This is a drink (customers can pick size, milk, shots, sugar, add-ons)
          </label>
          <label className="choice">
            <input
              type="checkbox"
              checked={form.soldOut}
              onChange={(e) => change("soldOut", e.target.checked)}
            />{" "}
            Sold out (visible but cannot be ordered)
          </label>

          {error && (
            <p className="ad-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="ad-notice" role="status">
              {notice}
            </p>
          )}

          <button type="submit" className="place-btn" disabled={busy}>
            {busy ? "SAVING…" : editingId ? "SAVE CHANGES" : "ADD TO MENU"}
          </button>
          {editingId && (
            <button type="button" className="ad-cancel" onClick={resetForm}>
              CANCEL EDIT
            </button>
          )}
        </form>

        <div className="ad-list">
          <h2>On the menu ({items.length})</h2>
          {loading ? (
            <p className="ad-hint">Loading…</p>
          ) : items.length === 0 ? (
            <p className="ad-hint">The menu is empty. Add your first item.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className={editingId === item.id ? "ad-row editing" : "ad-row"}>
                <img src={item.image} alt="" />
                <div className="ad-info">
                  <strong>{item.name}</strong>
                  <small>
                    {item.category} · Rs. {item.price}
                    {item.isDrink && " · drink"}
                    {item.soldOut && " · SOLD OUT"}
                  </small>
                </div>
                <button type="button" className="remove-btn" onClick={() => startEdit(item)}>
                  EDIT
                </button>
                <button type="button" className="remove-btn" onClick={() => handleDelete(item)}>
                  DELETE
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default Admin;
