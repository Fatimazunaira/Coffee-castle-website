import { useEffect, useState } from "react";
import { getMenu, subscribe } from "./menuStore";

// Gives a page the current menu and keeps it up to date.
// Returns { items, loading, error }.
export default function useMenu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const load = () =>
      getMenu()
        .then((list) => {
          if (!alive) return;
          setItems(list);
          setError("");
          setLoading(false);
        })
        .catch((err) => {
          if (!alive) return;
          setError(err.message);
          setLoading(false);
        });
    load();
    const stop = subscribe(load);
    return () => {
      alive = false;
      stop();
    };
  }, []);

  return { items, loading, error };
}
