import { createContext } from "react";

// Holds who is logged in. The provider is in AuthProvider.jsx.
// Use it like:  const { user, login, logout } = useContext(AuthContext);
export const AuthContext = createContext(null);
