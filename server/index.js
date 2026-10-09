const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/promo", (req, res) => {
  res.json({ text: "Today's special: 20% off all iced lattes!" });
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));