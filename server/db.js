const mongoose = require("mongoose");

// Connects to MongoDB using MONGO_URI from server/.env
// Local example:  MONGO_URI=mongodb://127.0.0.1:27017/coffeecastle
async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is missing. Add it to server/.env");
  await mongoose.connect(uri);
  console.log(`MongoDB connected (database: ${mongoose.connection.name})`);
}

module.exports = connectDB;
