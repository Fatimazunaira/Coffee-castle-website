require("dotenv").config({ quiet: true });

const express = require("express");
const cors = require("cors");
const { connect } = require("./db");

// Stop early, with a clear message, if the secret key is missing.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error(
    "JWT_SECRET is missing. In server/, copy .env.example to .env and set JWT_SECRET to a long random text."
  );
  process.exit(1);
}

const app = express();
app.use(cors());

// Menu pictures are sent as text, so the admin menu routes accept bigger requests.
// (This line must come before the general one below.)
app.use("/api/admin/menu", express.json({ limit: "1mb" }));
app.use(express.json({ limit: "100kb" }));

app.use("/api", require("./routes/public").router); // /api/promo and /api/menu
app.use("/api/auth", require("./routes/auth"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/tables", require("./routes/tables"));
app.use("/api/admin", require("./routes/admin"));

// Last stop: any unexpected error comes here and the browser gets JSON.
app.use((err, req, res, next) => {
  if (err.status === 413) {
    return res.status(413).json({ error: "That is too large to send." });
  }
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: "Bad request." });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side." });
});

const PORT = process.env.PORT || 5000;

connect()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Could not connect to MongoDB:", err);
    process.exit(1);
  });
