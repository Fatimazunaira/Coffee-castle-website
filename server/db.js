const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is missing. Set it in server/.env.");
}

const client = new MongoClient(process.env.MONGODB_URI);
let database;

const starterItems = [
  ["Caramel Latte", "Espresso, steamed milk and a ribbon of caramel.", "Hot Coffee", 450, "/images/menu1.jpg", 1],
  ["Chicken Club Sandwich", "Grilled chicken, egg and lettuce on toasted bread.", "Snacks", 650, "/images/menu2.jpg", 0],
  ["Cheese Omelette", "Fluffy eggs folded around melted cheese.", "Snacks", 400, "/images/menu3.jpg", 0],
  ["Chocolate Brownie", "Fudgy brownie with a crisp top.", "Bakery", 320, "/images/menu4.jpg", 0],
  ["Cold Coffee", "Chilled coffee blended smooth with ice and milk.", "Cold Drinks", 480, "/images/menu5.jpg", 1],
  ["Loaded Fries", "Crispy fries with cheese sauce and jalapeños.", "Snacks", 450, "/images/menu6.jpg", 0],
];

async function nextId(collectionName, session) {
  const result = await database.collection("counters").findOneAndUpdate(
    { _id: collectionName },
    { $inc: { sequence: 1 } },
    { upsert: true, returnDocument: "after", session }
  );
  return result.sequence;
}

async function connect() {
  if (database) return database;
  await client.connect();
  database = client.db();

  await Promise.all([
    database.collection("users").createIndex({ id: 1 }, { unique: true }),
    database.collection("users").createIndex({ email: 1 }, { unique: true }),
    database.collection("menu_items").createIndex({ id: 1 }, { unique: true }),
    database.collection("cafe_tables").createIndex({ id: 1 }, { unique: true }),
    database.collection("cafe_tables").createIndex({ number: 1 }, { unique: true }),
    database.collection("orders").createIndex({ id: 1 }, { unique: true }),
    database.collection("orders").createIndex({ user_id: 1, id: -1 }),
    database.collection("carts").createIndex({ user_id: 1 }, { unique: true }),
  ]);

  await seedDefaults();
  return database;
}

async function seedDefaults() {
  const menuItems = database.collection("menu_items");
  if ((await menuItems.countDocuments()) === 0) {
    const items = [];
    for (const [name, description, category, price, image, is_drink] of starterItems) {
      items.push({
        id: await nextId("menu_items"),
        name,
        description,
        category,
        price,
        image,
        is_drink,
        sold_out: 0,
      });
    }
    await menuItems.insertMany(items);
  }

  await database.collection("promo").updateOne(
    { _id: 1 },
    {
      $setOnInsert: {
        title: "Caramel Latte",
        description: "Buy one, get 20% off the second. Today only.",
        price: 450,
        active: 1,
      },
    },
    { upsert: true }
  );

  const tables = database.collection("cafe_tables");
  if ((await tables.countDocuments()) === 0) {
    const starterTables = [];
    for (let index = 0; index < 10; index++) {
      starterTables.push({
        id: await nextId("cafe_tables"),
        number: index + 1,
        seats: index < 4 ? 2 : 4,
        order_id: null,
      });
    }
    await tables.insertMany(starterTables);
  }

  if (!(await database.collection("users").findOne({ role: "admin" }))) {
    const email = (process.env.ADMIN_EMAIL || "admin@coffeecastle.pk").toLowerCase();
    let password = process.env.ADMIN_PASSWORD;

    if (!password) {
      if (process.env.NODE_ENV === "production") {
        console.warn("No ADMIN_PASSWORD set, so no admin account was created.");
        return;
      }
      password = "admin12345";
      console.warn(`Created a development admin: ${email} / ${password} (set ADMIN_PASSWORD in .env)`);
    }

    await database.collection("users").insertOne({
      id: await nextId("users"),
      name: "Café Admin",
      email,
      phone: null,
      password_hash: bcrypt.hashSync(password, 10),
      role: "admin",
      created_at: new Date().toISOString(),
    });
  }
}

function collection(name) {
  if (!database) throw new Error("MongoDB has not connected yet.");
  return database.collection(name);
}

module.exports = { client, connect, collection, nextId };
