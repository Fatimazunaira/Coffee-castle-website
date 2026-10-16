import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

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
  const [status, setStatus] = useState(getStatus());

  // check the time again every minute
  useEffect(() => {
    const timer = setInterval(() => setStatus(getStatus()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="navbar">
      <Link to="/">COFFEE CASTLE/CAFÉ</Link>

      <p className="status">
        <span className={status.open ? "status-dot open" : "status-dot"}></span>
        {status.text}
      </p>

      <nav>
        <Link to="/menu">MENU</Link>
        <Link to="/cart">CART</Link>
        <Link to="/login">LOGIN</Link>
      </nav>
    </header>
  );
}

export default Navbar;