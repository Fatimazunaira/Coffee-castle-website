import { useCallback, useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FloorPlan from "../components/FloorPlan";
import { AuthContext } from "../context/AuthContext";
import { TableChoiceContext } from "../context/TableChoiceContext";
import { api } from "../api";

// Choose-a-table page (/tables). Dine-in only, no reservations.
// Choosing a table does NOT hold it: it is booked only when the guest places their order.
function Tables() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { chosen, choose, clear } = useContext(TableChoiceContext);
  const userId = user ? user.id : null;

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(() => {
    api("/api/tables")
      .then((reply) => {
        setData(reply);
        setError("");
      })
      .catch((err) => setError(err.message));
  }, []);

  // Fresh data on arrival (and after logging in), then every 5 seconds, and when the tab comes back.
  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, userId]);

  const tables = data ? data.tables : [];
  const mine = data ? data.mine : null;
  const activeId = selectedId ?? (chosen ? chosen.id : null);
  const selected = tables.find((t) => t.id === activeId) || null;
  const chosenTable = chosen ? tables.find((t) => t.id === chosen.id) : null;
  const chosenTaken = Boolean(chosenTable && chosenTable.status === "booked" && !chosenTable.mine);
  const freeCount = tables.filter((t) => t.status === "free").length;

  // If somebody else orders the table we had picked, forget our pick.
  useEffect(() => {
    if (chosenTaken) clear();
  }, [chosenTaken, clear]);

  function chooseSelected() {
    if (!userId) {
      navigate("/login", { state: { from: "/tables" } });
      return;
    }
    choose(selected);
    navigate("/menu");
  }

  let card;
  if (mine) {
    card = (
      <>
        <p className="tb-card-title">You have table {mine.tableNumber}</p>
        <p>
          Your order #{mine.orderId} is in progress. Each guest can have one table at a time. Our staff
          free it when you leave, then you can choose another.
        </p>
      </>
    );
  } else if (!selected) {
    card = (
      <>
        <p className="tb-card-title">Tap a green table</p>
        <p>
          {data && freeCount === 0
            ? "All tables are taken right now. Takeaway is still available."
            : "Pick the table you like, then choose your food."}
        </p>
      </>
    );
  } else if (selected.status === "booked") {
    card = (
      <>
        <p className="tb-card-title">Table {selected.number} is booked</p>
        <p>Someone has already ordered at this table. Please pick a green one.</p>
      </>
    );
  } else if (chosen && chosen.id === selected.id) {
    card = (
      <>
        <p className="tb-card-title">Table {selected.number} · {selected.seats} seats</p>
        <p>
          Chosen. It is yours once you place your order, so please order soon: another guest can still
          take it before that.
        </p>
        <div className="tb-actions">
          <Link to="/menu" className="order-btn">
            GO TO MENU
          </Link>
          <button type="button" className="tb-ghost" onClick={clear}>
            CLEAR
          </button>
        </div>
      </>
    );
  } else {
    card = (
      <>
        <p className="tb-card-title">Table {selected.number} · {selected.seats} seats</p>
        <p>Available. Choose it, then pick your food. The table is booked when you place the order.</p>
        <div className="tb-actions">
          <button type="button" className="order-btn" onClick={chooseSelected}>
            {userId ? `CHOOSE TABLE ${selected.number}` : "LOG IN TO CHOOSE"}
          </button>
        </div>
      </>
    );
  }

  return (
    <section className="tb-page">
      <div className="tb-heading">
        <span className="tb-script">Pick your</span>
        <h1>Table</h1>
        <p>Dine-in only. No reservations: a table is booked when you place your order.</p>
      </div>

      {error && (
        <p className="tb-error" role="alert">
          {error}
        </p>
      )}
      {chosenTaken && (
        <p className="tb-error" role="alert">
          Table {chosen.number} was just taken by another guest. Please choose another.
        </p>
      )}

      {!data && !error && <p className="tb-loading">Loading the floor plan…</p>}

      {data && (
        <>
          <ul className="tb-legend" aria-label="Legend">
            <li><span className="tb-dot free"></span> Available</li>
            <li><span className="tb-dot booked"></span> Booked</li>
            <li><span className="tb-dot mine"></span> Yours</li>
          </ul>

          <FloorPlan
            floor={data.floor}
            tables={tables}
            selectedId={activeId}
            onSelect={(t) => setSelectedId(t.id)}
          />
          <p className="tb-hint">Pinch or scroll to zoom · drag to move · tap a table</p>

          <div className="tb-card" role="status" aria-live="polite">
            {card}
          </div>
        </>
      )}
    </section>
  );
}

export default Tables;
