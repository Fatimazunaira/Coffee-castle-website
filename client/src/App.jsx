import { useEffect, useState } from "react";
import Lenis from "lenis";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Loader from "./components/Loader";
import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Menu from "./pages/Menu";
import Admin from "./pages/Admin";

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
            <Route path="/menu" element={<Menu />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
          <Footer />
        </>
      )}
    </BrowserRouter>
  );
}

export default App;