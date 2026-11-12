import { useContext, useEffect, useState } from "react";
import Lenis from "lenis";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Loader from "./components/Loader";
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import { AuthContext } from "./context/AuthContext";

// Only lets admins see the page it wraps. Everyone else is sent away.
// (This only hides the page. The server also checks, on every admin request.)
function RequireAdmin({ children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <p className="page-note">Checking your login...</p>;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: "/admin" }} />;
  }
  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  const [ready, setReady] = useState(false);

  // Smooth scrolling for the whole page
  useEffect(() => {
    const lenis = new Lenis({ autoRaf: true });
    return () => lenis.destroy();
  }, []);

  // Show the page after the loader has been on screen for a moment
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <BrowserRouter>
      <Loader />
      {ready && (
        <>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <Admin />
                </RequireAdmin>
              }
            />
          </Routes>
          <Footer />
        </>
      )}
    </BrowserRouter>
  );
}

export default App;