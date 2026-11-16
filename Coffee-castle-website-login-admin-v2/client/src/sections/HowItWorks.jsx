function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Order",
      text: "Pick your drink and food, then choose dine-in or takeaway.",
    },
    {
      number: "02",
      title: "Get your table",
      text: "We give you a free table automatically. No waiting in line.",
    },
    {
      number: "03",
      title: "Track your order",
      text: "See when it is received, being prepared, and ready.",
    },
  ];

  return (
    <section className="how">
      <span className="how-script">How it works</span>
      <h2>Three easy steps</h2>

      <div className="how-row">
        {steps.map((step) => (
          <div key={step.number} className="how-step">
            <p className="how-number">{step.number}</p>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HowItWorks;