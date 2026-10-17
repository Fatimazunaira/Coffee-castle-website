import { useEffect, useState } from "react";
import Lenis from "lenis";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Loader from "./components/Loader";
import Home from "./pages/Home";

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
          </Routes>
          <Footer />
        </>
      )}
    </BrowserRouter>
  );
}

export default App;