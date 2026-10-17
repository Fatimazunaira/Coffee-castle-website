import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-col">
        <h3>COFFEE CASTLE/CAFÉ</h3>
        <p>NUST Campus, Islamabad</p>
      </div>

      <div className="footer-col">
        <h3>OPEN HOURS</h3>
        <p>Mon - Fri: 8:00 AM - 10:00 PM</p>
        <p>Sat - Sun: 10:00 AM - 11:00 PM</p>
      </div>

      <div className="footer-col">
        <h3>LINKS</h3>
        <Link to="/menu">Menu</Link>
        <Link to="/cart">Cart</Link>
        <Link to="/login">Login</Link>
      </div>
    </footer>
  );
}

export default Footer;