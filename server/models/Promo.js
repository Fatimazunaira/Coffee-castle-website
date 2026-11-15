const mongoose = require("mongoose");

// The home page banner. There is only ever one document.
const promoSchema = new mongoose.Schema({
  text: { type: String, trim: true, maxlength: 200, default: "" },
});

module.exports = mongoose.model("Promo", promoSchema);
