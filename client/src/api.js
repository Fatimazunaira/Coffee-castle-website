// Small helper for talking to the server.
// In development the Vite proxy (vite.config.js) sends /api/... to port 5000.
// When the site is hosted online, set VITE_API_URL to the server address.
const BASE = import.meta.env.VITE_API_URL || "";
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

// Usage:  const data = await api("/api/menu");
//         await api("/api/orders", { method: "POST", body: { ... } });
// If the server says something went wrong, this throws an Error whose
// message is the text from the server, so you can show it to the user.
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
    res = await fetch(BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the server. Is it running?");
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
