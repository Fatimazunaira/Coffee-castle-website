import { createContext } from "react";

// The table the guest tapped on the floor plan: { id, number, seats } or null.
// This is only a wish. The table is NOT held for them: it becomes theirs when the order is placed.
export const TableChoiceContext = createContext({ chosen: null, choose: () => {}, clear: () => {} });
