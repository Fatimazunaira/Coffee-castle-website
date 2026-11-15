require("dotenv").config({ quiet: true });
const express = require("express");
const cors = require("cors");

const connectDB = require("./db");
const Promo = require("./models/Promo");
const menuRoutes = require("./routes/menu");

const app = express();
app.use(cors());
// Admin photos arrive as base64 text, so allow bigger bodies than the 100kb default.
app.use(express.json({ limit: "2mb" }));

const DEFAULT_PROMO = "Today's special: 20% off all iced lattes!";

app.get("/api/promo", async (req, res) => {
  const promo = await Promo.findOne();
  res.json({ text: promo ? promo.text : DEFAULT_PROMO });
});

// Admin: change the banner text. An empty text hides the banner.
app.put("/api/promo", async (req, res) => {
  const text = String(req.body?.text ?? "");
  const promo = await Promo.findOneAndUpdate({}, { text }, { upsert: true, new: true, runValidators: true });
  res.json({ text: promo.text });
});

app.use("/api/menu", menuRoutes);

// Turns database errors into short messages the admin form can show.
app.use((err, req, res, next) => {
  if (err.name === "ValidationError") {
    const first = Object.values(err.errors)[0];
    return res.status(400).json({ error: first.message });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ error: "Some of the values sent are not valid." });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`)))
  .catch((err) => {
    console.error("Could not start the server:", err.message);
    process.exit(1);
  });
