// Fills the database with the 6 starter menu items and the promo banner.
//   node seed.js          -> only seeds if the menu is empty (safe)
//   node seed.js --reset  -> DELETES all menu items first, then seeds
require("dotenv").config({ quiet: true });
const mongoose = require("mongoose");
const connectDB = require("./db");
const MenuItem = require("./models/MenuItem");
const Promo = require("./models/Promo");

const SEED_ITEMS = [
  { name: "Caramel Latte", price: 450, image: "/images/menu1.jpg", category: "Hot Coffee", description: "Espresso, steamed milk and a ribbon of caramel.", isDrink: true },
  { name: "Chicken Club Sandwich", price: 650, image: "/images/menu2.jpg", category: "Snacks", description: "Grilled chicken, egg and lettuce on toasted bread.", isDrink: false },
  { name: "Cheese Omelette", price: 400, image: "/images/menu3.jpg", category: "Snacks", description: "Fluffy eggs folded around melted cheese.", isDrink: false },
  { name: "Chocolate Brownie", price: 320, image: "/images/menu4.jpg", category: "Bakery", description: "Fudgy brownie with a crisp top.", isDrink: false },
  { name: "Cold Coffee", price: 480, image: "/images/menu5.jpg", category: "Cold Drinks", description: "Chilled coffee blended smooth with ice and milk.", isDrink: true },
  { name: "Loaded Fries", price: 450, image: "/images/menu6.jpg", category: "Snacks", description: "Crispy fries with cheese sauce and jalapeños.", isDrink: false },
];

async function run() {
  await connectDB();

  if (process.argv.includes("--reset")) {
    await MenuItem.deleteMany({});
    console.log("Old menu items deleted.");
  }

  if ((await MenuItem.countDocuments()) === 0) {
    await MenuItem.insertMany(SEED_ITEMS);
    console.log(`Added ${SEED_ITEMS.length} menu items.`);
  } else {
    console.log("Menu already has items, skipped. Use --reset to start over.");
  }

  if (!(await Promo.findOne())) {
    await Promo.create({ text: "Today's special: 20% off all iced lattes!" });
    console.log("Added the promo banner.");
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
