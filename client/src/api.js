export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const formatPrice = (n) => `Rs ${n.toLocaleString("en-PK")}`;


// ---------------------------------------------------------------------------
// Talking to the server (login, cart, orders, admin).
//
// Usage:  const data = await api("/api/menu");
//         await api("/api/orders", { method: "POST", body: { ... } });
// If the server says something went wrong, this throws an Error whose message
// is the text from the server, so you can show it to the user.
// ---------------------------------------------------------------------------
const TOKEN_KEY = "cc_token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // storage blocked: the login just won't be remembered
  }
}

export async function api(path, { method = "GET", body } = {}) {
  const headers = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  let res;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the server. Is it running? (node index.js in the server folder)");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // the reply had no JSON
  }

  if (!res.ok) {
    const error = new Error((data && data.error) || "Something went wrong. Please try again.");
    error.status = res.status;
    throw error;
  }
  return data;
}
