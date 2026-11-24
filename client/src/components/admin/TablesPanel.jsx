import { useEffect, useState } from "react";
import { api } from "../../api";
import { formatDate } from "./format";

function TablesPanel() {
  const [tables, setTables] = useState(null);
  const [error, setError] = useState("");

  function load() {
    api("/api/admin/tables")
      .then((data) => {
        setTables(data.tables);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function freeTable(table) {
    const ok = window.confirm(
      `Free table ${table.number}? ${table.customer_name}'s order will be marked completed.`
    );
    if (!ok) return;
    setError("");
    try {
      const data = await api("/api/admin/tables/" + table.id + "/free", { method: "POST" });
      setTables(data.tables);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!tables && !error) {
    return <p>Loading...</p>;
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Tables</h2>
      <p className="panel-help">
        Guests choose their own table on the website; it is booked when they place the order. Press
        "Free" when they leave so the next guest can choose it.
      </p>
      <div className="toolbar">
        <p className="group-title">
          {tables ? tables.filter((t) => t.status === "free").length + " of " + tables.length + " tables free." : ""}
        </p>
        <button className="btn-small" onClick={load}>
          REFRESH
        </button>
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {tables && (
        <div className="table-grid">
          {tables.map((table) => {
            const busy = table.status === "occupied";
            return (
              <div key={table.id} className={busy ? "table-card busy" : "table-card free"}>
                <p className="table-number">Table {table.number}</p>
                <p className="table-meta">{table.seats} seats</p>
                <p className="table-status">{busy ? "Occupied" : "Free"}</p>
                {busy && (
                  <>
                    <p className="table-meta">
                      {table.customer_name} (order #{table.order_id})
                    </p>
                    <p className="table-meta">since {formatDate(table.seated_at)}</p>
                    <button className="btn-small" onClick={() => freeTable(table)}>
                      FREE
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TablesPanel;
