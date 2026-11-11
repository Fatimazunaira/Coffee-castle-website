export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const formatPrice = (n) => `Rs ${n.toLocaleString("en-PK")}`;
