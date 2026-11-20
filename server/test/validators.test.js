const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const test = require("node:test");
const { MongoClient } = require("mongodb");
const { applyCollectionValidators } = require("../validators");

const testUri = process.env.MONGODB_TEST_URI;

test("core collection validators accept valid records and reject invalid writes", {
  skip: testUri ? false : "Set MONGODB_TEST_URI to run MongoDB integration tests.",
}, async (t) => {
  const client = new MongoClient(testUri);
  await client.connect();
  const suffix = randomUUID().replace(/-/g, "");
  const database = client.db(`coffee_castle_existing_${suffix}`);
  const emptyDatabase = client.db(`coffee_castle_empty_${suffix}`);

  t.after(async () => {
    try {
      await database.dropDatabase();
      await emptyDatabase.dropDatabase();
    } finally {
      await client.close();
    }
  });

  const records = {
    users: {
      id: 1,
      name: "Cafe Customer",
      email: "customer@example.test",
      phone: null,
      password_hash: "bcrypt-hash",
      role: "customer",
      created_at: new Date().toISOString(),
    },
    menu_items: {
      id: 1,
      name: "Caramel Latte",
      description: "Espresso, steamed milk and caramel.",
      category: "Hot Coffee",
      price: 450,
      image: "/images/menu1.jpg",
      is_drink: 1,
      sold_out: 0,
    },
    orders: {
      id: 1,
      user_id: 1,
      customer_name: "Cafe Customer",
      phone: "555-0100",
      order_type: "dine-in",
      payment: "counter",
      total: 450,
      status: "received",
      table_id: 1,
      created_at: new Date().toISOString(),
      items: [{
        menu_item_id: 1,
        name: "Caramel Latte",
        details: "Regular, Whole milk, Sugar: Normal",
        price: 450,
        qty: 1,
      }],
    },
    carts: {
      user_id: 1,
      lines: [{
        line_key: "1|regular|whole|0|normal|",
        menu_item_id: 1,
        options: {
          size: "regular",
          milk: "whole",
          shots: 0,
          sugar: "normal",
          addons: [],
        },
        qty: 1,
      }],
    },
    cafe_tables: {
      id: 1,
      number: 1,
      seats: 2,
      order_id: 1,
    },
  };

  await applyCollectionValidators(emptyDatabase);

  const validIds = {};
  for (const [name, record] of Object.entries(records)) {
    const result = await database.collection(name).insertOne(record);
    validIds[name] = result.insertedId;
  }

  await applyCollectionValidators(database);

  for (const [name, record] of Object.entries(records)) {
    const stored = await database.collection(name).findOne({ _id: validIds[name] });
    assert.ok(stored, `${name} record should remain readable after validation is enabled`);
    assert.equal(stored.id, record.id);
  }

  await database.collection("users").updateOne(
    { _id: validIds.users },
    { $set: { name: "Updated Customer" } }
  );
  await database.collection("menu_items").updateOne(
    { _id: validIds.menu_items },
    { $set: { sold_out: 1 } }
  );
  await database.collection("orders").updateOne(
    { _id: validIds.orders },
    { $set: { status: "completed" } }
  );
  await database.collection("carts").updateOne(
    { _id: validIds.carts },
    { $set: { "lines.0.qty": 2 } }
  );
  await database.collection("cafe_tables").updateOne(
    { _id: validIds.cafe_tables },
    { $set: { order_id: null } }
  );

  const rejectsValidation = (error) => error && error.code === 121;
  const rejectsInvalidInsert = async (name, mutate) => {
    const record = structuredClone(records[name]);
    mutate(record);
    await assert.rejects(
      database.collection(name).insertOne(record),
      rejectsValidation,
      `${name} should reject invalid documents`
    );
  };

  await rejectsInvalidInsert("users", (record) => { delete record.name; });
  await rejectsInvalidInsert("users", (record) => { record.role = "owner"; });
  await rejectsInvalidInsert("users", (record) => { record.phone = 123; });

  await rejectsInvalidInsert("menu_items", (record) => { record.price = "450"; });
  await rejectsInvalidInsert("menu_items", (record) => { record.category = "Seasonal"; });
  await rejectsInvalidInsert("menu_items", (record) => { record.is_drink = 2; });
  await rejectsInvalidInsert("menu_items", (record) => { delete record.image; });

  await rejectsInvalidInsert("orders", (record) => { record.order_type = "delivery"; });
  await rejectsInvalidInsert("orders", (record) => { record.payment = "cash"; });
  await rejectsInvalidInsert("orders", (record) => { record.status = "pending"; });
  await rejectsInvalidInsert("orders", (record) => { record.items[0].qty = 0; });

  await rejectsInvalidInsert("carts", (record) => { record.lines[0].qty = 0; });
  await rejectsInvalidInsert("carts", (record) => { record.lines[0].options.size = "giant"; });
  await rejectsInvalidInsert("carts", (record) => { record.user_id = "1"; });

  await rejectsInvalidInsert("cafe_tables", (record) => { record.seats = "two"; });
  await rejectsInvalidInsert("cafe_tables", (record) => { delete record.number; });
  await rejectsInvalidInsert("cafe_tables", (record) => { record.order_id = "1"; });

  await assert.rejects(
    database.collection("menu_items").updateOne(
      { _id: validIds.menu_items },
      { $set: { category: "Seasonal" } }
    ),
    rejectsValidation,
    "menu_items should reject invalid updates"
  );
});
