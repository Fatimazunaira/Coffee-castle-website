import { useEffect, useState } from "react";
import { api } from "../../api";
import { money } from "./format";

const emptyForm = {
  name: "",
  description: "",
  category: "Coffee",
  price: "",
  image: "",
  available: true,
};

// The add / edit form. "item" is null when adding a new one.
function ItemForm({ item, onSaved, onCancel }) {
  const [form, setForm] = useState(
    item
      ? {
          name: item.name,
          description: item.description,
          category: item.category,
          price: String(item.price),
          image: item.image,
          available: item.available,
        }
      : emptyForm
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function change(field, value) {
    setForm({ ...form, [field]: value });
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const path = item ? "/api/admin/menu/" + item.id : "/api/admin/menu";
      await api(path, { method: item ? "PUT" : "POST", body: form });
      onSaved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form className="admin-card" onSubmit={save}>
      <h3 className="panel-subtitle">{item ? "Edit " + item.name : "Add a menu item"}</h3>

      <div className="form-grid">
        <label className="field">
          Name
          <input
            type="text"
            required
            maxLength={80}
            value={form.name}
            onChange={(e) => change("name", e.target.value)}
          />
        </label>

        <label className="field">
          Category
          <input
            type="text"
            list="menu-categories"
            maxLength={30}
            value={form.category}
            onChange={(e) => change("category", e.target.value)}
          />
          <datalist id="menu-categories">
            <option value="Coffee" />
            <option value="Food" />
            <option value="Dessert" />
          </datalist>
        </label>

        <label className="field">
          Price (Rs.)
          <input
            type="number"
            required
            min="0"
            step="1"
            value={form.price}
            onChange={(e) => change("price", e.target.value)}
          />
        </label>

        <label className="field">
          Image (like /images/menu1.jpg)
          <input
            type="text"
            maxLength={200}
            value={form.image}
            onChange={(e) => change("image", e.target.value)}
          />
        </label>
      </div>

      <label className="field">
        Description
        <input
          type="text"
          maxLength={300}
          value={form.description}
          onChange={(e) => change("description", e.target.value)}
        />
      </label>

      <label className="choice">
        <input
          type="checkbox"
          checked={form.available}
          onChange={(e) => change("available", e.target.checked)}
        />{" "}
        Available (untick to mark as sold out)
      </label>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-buttons">
        <button type="submit" className="place-btn" disabled={busy}>
          {busy ? "SAVING..." : "SAVE"}
        </button>
        <button type="button" className="btn-small" onClick={onCancel}>
          CANCEL
        </button>
      </div>
    </form>
  );
}

function MenuPanel() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  // editing: null = just the list, "new" = add form, or the item being edited
  const [editing, setEditing] = useState(null);

  function load() {
    api("/api/menu")
      .then((data) => setItems(data.items))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function toggleSoldOut(item) {
    setError("");
    try {
      await api("/api/admin/menu/" + item.id, {
        method: "PUT",
        body: { ...item, available: !item.available },
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(item) {
    if (!window.confirm(`Delete "${item.name}" from the menu? This cannot be undone.`)) return;
    setError("");
    try {
      await api("/api/admin/menu/" + item.id, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!items && !error) {
    return <p>Loading...</p>;
  }

  if (editing) {
    return (
      <div className="panel">
        <h2 className="panel-title">Menu</h2>
        <ItemForm
          item={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      </div>
    );
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Menu</h2>
      <div className="toolbar">
        <p className="panel-help">Change prices, add dishes, or mark things as sold out.</p>
        <button className="btn-small" onClick={() => setEditing("new")}>
          + ADD ITEM
        </button>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {items && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.name}
                    {item.description && <small className="cell-note">{item.description}</small>}
                  </td>
                  <td>{item.category}</td>
                  <td>{money(item.price)}</td>
                  <td>
                    <span className={item.available ? "badge ok" : "badge no"}>
                      {item.available ? "Available" : "Sold out"}
                    </span>
                  </td>
                  <td className="row-buttons">
                    <button className="btn-small" onClick={() => toggleSoldOut(item)}>
                      {item.available ? "MARK SOLD OUT" : "MARK AVAILABLE"}
                    </button>
                    <button className="btn-small" onClick={() => setEditing(item)}>
                      EDIT
                    </button>
                    <button className="btn-small danger" onClick={() => remove(item)}>
                      DELETE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MenuPanel;
