const { MongoClient } = require("mongodb");
const bcrypt = require("bcryptjs");
const { applyCollectionValidators } = require("./validators");
const { TABLE_LAYOUT } = require("./tableLayout");

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

  await applyCollectionValidators(database);

  await Promise.all([
    database.collection("users").createIndex({ id: 1 }, { unique: true }),
    database.collection("users").createIndex({ email: 1 }, { unique: true }),
    database.collection("menu_items").createIndex({ id: 1 }, { unique: true }),
    database.collection("cafe_tables").createIndex({ id: 1 }, { unique: true }),
    database.collection("cafe_tables").createIndex({ number: 1 }, { unique: true }),
    database.collection("orders").createIndex({ id: 1 }, { unique: true }),
    database.collection("orders").createIndex({ user_id: 1, id: -1 }),
    database.collection("orders").createIndex({ order_type: 1, table_id: 1, id: 1 }),
    database.collection("carts").createIndex({ user_id: 1 }, { unique: true }),
    // One order can sit at only one table (several free tables with order_id: null are fine).
    database.collection("cafe_tables").createIndex(
      { order_id: 1 },
      { unique: true, partialFilterExpression: { order_id: { $type: "number" } } }
    ),
  ]);

  // One guest can have only ONE active dine-in order (so only one table) at a time.
  // MongoDB itself enforces this, so it holds even if the same person orders from two tabs
  // or two phones at the same moment. "Active" = received and not yet completed by the admin.
  try {
    await database.collection("orders").createIndex(
      { user_id: 1 },
      {
        unique: true,
        name: "one_active_dine_in_per_user",
        partialFilterExpression: { order_type: "dine-in", status: "received", table_id: { $type: "number" } },
      }
    );
  } catch (err) {
    console.warn(
      "Could not create the 'one active dine-in order per guest' index. " +
        "Some guest probably has two active dine-in orders already; complete one of them in the admin Tables tab and restart.",
      err.message
    );
  }

  await seedDefaults();
  return database;
}

// Makes the cafe_tables collection match tableLayout.js (7 tables).
// It only touches the layout fields, never order_id, so a table that is in use stays in use.
async function syncTables() {
  const tables = database.collection("cafe_tables");

  for (const spec of TABLE_LAYOUT) {
    const layout = { seats: spec.seats, shape: spec.shape, x: spec.x, y: spec.y, w: spec.w, h: spec.h };
    const existing = await tables.findOne({ number: spec.number }, { projection: { _id: 1 } });
    if (existing) {
      await tables.updateOne({ _id: existing._id }, { $set: layout });
    } else {
      await tables.insertOne({ id: await nextId("cafe_tables"), number: spec.number, order_id: null, ...layout });
    }
  }

  // Tables from the old 10-table setup that are not on the new plan. Only free ones are removed.
  const numbers = TABLE_LAYOUT.map((spec) => spec.number);
  await tables.deleteMany({ number: { $nin: numbers }, order_id: null });
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

  await syncTables();

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