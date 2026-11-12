import { useEffect, useState } from "react";
import { API_URL } from "../api";

// FR-14: promotion banner shown on the homepage and the menu page
export default function Promo() {
  const [promo, setPromo] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/api/promo`)
      .then((res) => res.json())
      .then((data) => setPromo(data.text))
      .catch(() => setPromo(""));
  }, []);

  if (!promo) return null;
  return <div className="promo">{promo}</div>;
}
