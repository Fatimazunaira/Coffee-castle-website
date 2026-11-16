function Marquee() {
  const text = "TAKE A COFFEE BREAK ✦ ".repeat(6);

  return (
    <div className="marquee">
      <div className="marquee-track">
        <span>{text}</span>
        <span>{text}</span>
      </div>
    </div>
  );
}

export default Marquee;