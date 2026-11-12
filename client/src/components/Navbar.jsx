import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { CartContext } from "../context/CartContext";

// Opening hours (keep these the same as the footer)
function openHourFor(day) {
  // day 0 = Sunday, day 6 = Saturday
  if (day === 0 || day === 6) {
    return 10;
  }
  return 8;
}

function closeHourFor(day) {
  if (day === 0 || day === 6) {
    return 23;
  }
  return 22;
}

function formatHour(hour) {
  if (hour > 12) {
    return hour - 12 + " PM";
  }
  if (hour === 12) {
    return "12 PM";
  }
  return hour + " AM";
}

function getStatus() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();

  if (hour >= openHourFor(day) && hour < closeHourFor(day)) {
    return { open: true, text: "OPEN NOW" };
  }

  if (hour < openHourFor(day)) {
    return { open: false, text: "CLOSED · OPENS AT " + formatHour(openHourFor(day)) };
  }

  const tomorrow = (day + 1) % 7;
  return {
    open: false,
    text: "CLOSED · OPENS AT " + formatHour(openHourFor(tomorrow)) + " TOMORROW",
  };
}

function Navbar() {
  const { count } = useContext(CartContext);
  const [status, setStatus] = useState(getStatus());
  // menuOpen remembers if the phone menu is open or closed
  const [menuOpen, setMenuOpen] = useState(false);

  // check the time again every minute
  useEffect(() => {
    const timer = setInterval(() => setStatus(getStatus()), 60000);
    return () => clearInterval(timer);
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="navbar">
      <Link to="/" onClick={closeMenu}>
        COFFEE CASTLE/CAFÉ
      </Link>

      <p className="status">
        <span className={status.open ? "status-dot open" : "status-dot"}></span>
        {status.text}
      </p>

      <button
        className={menuOpen ? "burger open" : "burger"}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Open menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <nav className={menuOpen ? "nav-links open" : "nav-links"}>
  <Link to="/menu" onClick={closeMenu}>
    MENU
  </Link>

   <Link to="/cart" onClick={closeMenu}>
    CART ({count})
  </Link>

  <Link to="/orders" onClick={closeMenu}>
    ORDER HISTORY
  </Link>


  <Link to="/login" onClick={closeMenu}>
    LOGIN
  </Link>
</nav>

    </header>
  );
}

export default Navbar;