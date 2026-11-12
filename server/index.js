// The database (node:sqlite) is built into Node.js 22.13 and newer.
const [nodeMajor, nodeMinor] = process.versions.node.split(".").map(Number);
if (nodeMajor < 22 || (nodeMajor === 22 && nodeMinor < 13)) {
  console.error(
    `This server needs Node.js 22.13 or newer, but you have ${process.versions.node}.\n` +
      "Install the LTS version from https://nodejs.org and run it again."
  );
  process.exit(1);
}

require("dotenv").config({ quiet: true });

const express = require("express");
const cors = require("cors");

// Stop early, with a clear message, if the secret key is missing.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error(
    "JWT_SECRET is missing. In server/, copy .env.example to .env and set JWT_SECRET to a long random text."
  );
  process.exit(1);
}

require("./db"); // opens the database and creates the tables

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));

app.use("/api", require("./routes/public")); // /api/promo and /api/menu
app.use("/api/auth", require("./routes/auth"));
app.use("/api/cart", require("./routes/cart"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/admin", require("./routes/admin"));

// Last stop: any unexpected error comes here and the browser gets JSON.
app.use((err, req, res, next) => {
  if (err.status && err.status < 500) {
    return res.status(err.status).json({ error: "Bad request." });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
