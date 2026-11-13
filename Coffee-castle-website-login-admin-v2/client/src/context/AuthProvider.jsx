import { useEffect, useState } from "react";
import { api, getToken, setToken } from "../api";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  // user is null when nobody is logged in
  const [user, setUser] = useState(null);
  // loading = we have a saved login and are checking that it is still valid
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => setToken(null)) // expired or invalid: forget it
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await api("/api/auth/login", { method: "POST", body: { email, password } });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(fields) {
    const data = await api("/api/auth/register", { method: "POST", body: fields });
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  const value = { user, loading, login, register, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
