import { useEffect, useState } from "react";

export default function App() {
  const [promo, setPromo] = useState("");

  useEffect(() => {
    fetch("http://localhost:5000/api/promo")
      .then((res) => res.json())
      .then((data) => setPromo(data.text))
      .catch(() => setPromo(""));
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", textAlign: "center", padding: 40 }}>
      <h1>☕ NUST Coffee Castle</h1>
      <p>Order ahead. Skip the line. We'll find you a table.</p>

      {promo && (
        <div style={{ background: "#f3e5d0", padding: 12, margin: "20px auto", maxWidth: 400 }}>
          {promo}
        </div>
      )}

      <button style={{ padding: "10px 24px", fontSize: 16 }}>View Menu</button>
    </div>
  );
}