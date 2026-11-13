import { useEffect, useState } from "react";
import { api } from "../../api";
import { formatDate, money } from "./format";

// One customer: their details, what is in their cart, and their orders.
function CustomerDetail({ customerId, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/admin/customers/" + customerId)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [customerId]);

  if (error) {
    return (
      <div className="panel">
        <button className="btn-small" onClick={onBack}>
          &larr; BACK
        </button>
        <p className="form-error" role="alert">
          {error}
        </p>
      </div>
    );
  }
  if (!data) {
    return <p>Loading...</p>;
  }

  const { customer, cart, cartTotal, orders } = data;
  const tableNow = orders.find((order) => order.at_table_now);

  return (
    <div className="panel">
      <button className="btn-small" onClick={onBack}>
        &larr; ALL CUSTOMERS
      </button>

      <h2 className="panel-title">{customer.name}</h2>

      <div className="info-grid">
        <p>
          <strong>Email</strong>
          <br />
          {customer.email}
        </p>
        <p>
          <strong>Phone</strong>
          <br />
          {customer.phone || "-"}
        </p>
        <p>
          <strong>Joined</strong>
          <br />
          {formatDate(customer.created_at)}
        </p>
        <p>
          <strong>Table right now</strong>
          <br />
          {tableNow ? "Table " + tableNow.table_number : "None"}
        </p>
      </div>

      <h3 className="panel-subtitle">Cart (not ordered yet)</h3>
      {cart.length === 0 ? (
        <p className="panel-help">The cart is empty.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.name}
                    {item.details && <small className="cell-note">{item.details}</small>}
                    {item.soldOut && <span className="badge"> sold out</span>}
                  </td>
                  <td>{item.qty}</td>
                  <td>{money(item.price)}</td>
                  <td>{money(item.price * item.qty)}</td>
                </tr>
              ))}
              <tr className="total-line">
                <td colSpan={3}>Cart total</td>
                <td>{money(cartTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <h3 className="panel-subtitle">Orders</h3>
      {orders.length === 0 ? (
        <p className="panel-help">No orders yet.</p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Placed</th>
                <th>Type</th>
                <th>Table</th>
                <th>Status</th>
                <th>Items</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>#{order.id}</td>
                  <td>{formatDate(order.created_at)}</td>
                  <td>{order.order_type}</td>
                  <td>
                    {order.order_type === "takeaway"
                      ? "-"
                      : order.table_number
                        ? "Table " + order.table_number
                        : order.status === "completed"
                          ? "-"
                          : "Waiting"}
                  </td>
                  <td>{order.status}</td>
                  <td>{order.items.map((item) => item.qty + " x " + item.name + (item.details ? " (" + item.details + ")" : "")).join(", ")}</td>
                  <td>{money(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CustomersPanel() {
  const [customers, setCustomers] = useState(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);

  function load() {
    api("/api/admin/customers")
      .then((data) => setCustomers(data.customers))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  if (openId) {
    return (
      <CustomerDetail
        customerId={openId}
        onBack={() => {
          setOpenId(null);
          load();
        }}
      />
    );
  }

  if (error) {
    return (
      <p className="form-error" role="alert">
        {error}
      </p>
    );
  }
  if (!customers) {
    return <p>Loading...</p>;
  }

  const words = search.trim().toLowerCase();
  const shown = customers.filter(
    (c) => c.name.toLowerCase().includes(words) || c.email.toLowerCase().includes(words)
  );

  return (
    <div className="panel">
      <h2 className="panel-title">Customers</h2>
      <div className="toolbar">
        <label className="field search-field">
          Search by name or email
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <button className="btn-small" onClick={load}>
          REFRESH
        </button>
      </div>

      {shown.length === 0 ? (
        <p className="panel-help">
          {customers.length === 0 ? "Nobody has signed up yet." : "No customer matches your search."}
        </p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Cart items</th>
                <th>Orders</th>
                <th>Table</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.email}</td>
                  <td>{c.phone || "-"}</td>
                  <td>{c.cart_items}</td>
                  <td>{c.order_count}</td>
                  <td>{c.table_number ? "Table " + c.table_number : "-"}</td>
                  <td>
                    <button className="btn-small" onClick={() => setOpenId(c.id)}>
                      VIEW
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

export default CustomersPanel;
