import { useEffect, useState } from "react";

function Loader() {
  const [hide, setHide] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setHide(true), 1800);
    const t2 = setTimeout(() => setGone(true), 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (gone) return null;

  return (
    <div className={hide ? "loader hide" : "loader"}>
      <p className="loader-script">Take a</p>
      <h1 className="loader-name">Coffee Castle</h1>
      <div className="loader-bar"></div>
    </div>
  );
}

export default Loader;