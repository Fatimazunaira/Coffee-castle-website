import { Link } from "react-router-dom";

function Hero() {
  return (
    <section className="hero">
      <div className="float float-a">
        <div className="float-pic pic-a"></div>
      </div>
      <div className="float float-b">
        <div className="float-pic pic-b"></div>
      </div>
      <div className="float float-c">
        <div className="float-pic pic-c"></div>
      </div>

      <div className="hero-title">
        <span className="script">Take a</span>
        <h1>
          Coffee
          <br />
          Break
        </h1>
        <Link to="/menu" className="order-btn">
          ORDER NOW
        </Link>
      </div>

      <div className="photo-row">
        <div className="photo photo1"></div>
        <div className="photo photo2"></div>
        <div className="photo photo3"></div>
      </div>
    </section>
  );
}

export default Hero;