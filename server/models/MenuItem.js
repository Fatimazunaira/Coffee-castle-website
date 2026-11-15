const mongoose = require("mongoose");

// Same list as client/src/data/menuOptions.js: keep them identical.
const CATEGORIES = ["Hot Coffee", "Cold Drinks", "Tea", "Bakery", "Snacks"];

// Same shape the client already uses:
// { id, name, price, image, category, description, isDrink, soldOut }
const menuItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter the name of the food."],
      trim: true,
      maxlength: [60, "The name is too long (60 characters max)."],
    },
    price: {
      type: Number,
      required: [true, "Please enter a price greater than 0."],
      set: (v) => Math.round(v),
      validate: {
        validator: (v) => v > 0,
        message: "Please enter a price greater than 0.",
      },
    },
    // A data URL (admin upload) or a path like "/images/menu1.jpg"
    image: { type: String, required: [true, "A picture of the food is required."] },
    category: { type: String, enum: CATEGORIES, default: CATEGORIES[0] },
    description: { type: String, trim: true, maxlength: 200, default: "" },
    isDrink: { type: Boolean, default: false },
    soldOut: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Send `id` (a string) to the client instead of MongoDB's `_id`,
// so the existing React code keeps working unchanged.
menuItemSchema.set("toJSON", {
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model("MenuItem", menuItemSchema);
module.exports.CATEGORIES = CATEGORIES;
