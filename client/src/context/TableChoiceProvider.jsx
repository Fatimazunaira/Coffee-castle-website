import { useState } from "react";
import { TableChoiceContext } from "./TableChoiceContext";

const KEY = "cc_table";

function readSaved() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY));
    if (saved && Number.isInteger(saved.id) && Number.isInteger(saved.number)) return saved;
  } catch {
    // nothing saved, or storage blocked
  }
  return null;
}

// Remembers the chosen table for this browser tab only (so it is forgotten when the tab closes).
export function TableChoiceProvider({ children }) {
  const [chosen, setChosen] = useState(readSaved);

  function save(table) {
    setChosen(table);
    try {
      if (table) sessionStorage.setItem(KEY, JSON.stringify(table));
      else sessionStorage.removeItem(KEY);
    } catch {
      // storage blocked: the choice just lasts until the page reloads
    }
  }

  const value = {
    chosen,
    choose: (table) => save({ id: table.id, number: table.number, seats: table.seats }),
    clear: () => save(null),
  };

  return <TableChoiceContext.Provider value={value}>{children}</TableChoiceContext.Provider>;
}
