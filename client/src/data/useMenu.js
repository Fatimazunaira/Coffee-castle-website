import { useEffect, useState } from "react";
import { getMenu, subscribe } from "./menuStore";

// Gives a page the current menu and keeps it up to date.
// Returns { items, loading }.
export default function useMenu() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = () =>
      getMenu().then((list) => {
        if (!alive) return;
        setItems(list);
        setLoading(false);
      });
    load();
    const stop = subscribe(load);
    return () => {
      alive = false;
      stop();
    };
  }, []);

  return { items, loading };
}
