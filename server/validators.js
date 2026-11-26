const { CATEGORIES, DRINK_OPTIONS } = require("./menuOptions");

const numericTypes = ["int", "long", "double", "decimal"];
const integer = (minimum) => ({
  bsonType: numericTypes,
  multipleOf: 1,
  minimum,
});
const requiredString = (maxLength) => ({
  bsonType: "string",
  minLength: 1,
  maxLength,
});
const nullableId = {
  oneOf: [
    { bsonType: "null" },
    integer(1),
  ],
};

const drinkChoices = {
  bsonType: "object",
  required: ["size", "milk", "shots", "sugar", "addons"],
  properties: {
    size: { enum: DRINK_OPTIONS.sizes.map((option) => option.id) },
    milk: { enum: DRINK_OPTIONS.milks.map((option) => option.id) },
    shots: {
      ...integer(0),
      maximum: DRINK_OPTIONS.maxShots,
    },
    sugar: { enum: DRINK_OPTIONS.sugar.map((option) => option.id) },
    addons: {
      bsonType: "array",
      uniqueItems: true,
      items: { enum: DRINK_OPTIONS.addons.map((option) => option.id) },
    },
  },
};

const collectionValidators = {
  users: {
    bsonType: "object",
    required: ["id", "name", "email", "phone", "password_hash", "role", "created_at"],
    properties: {
      id: integer(1),
      name: requiredString(80),
      email: requiredString(120),
      phone: { bsonType: ["string", "null"], maxLength: 20 },
      password_hash: requiredString(200),
      role: { enum: ["customer", "admin"] },
      created_at: requiredString(40),
    },
  },
  menu_items: {
    bsonType: "object",
    required: ["id", "name", "description", "category", "price", "image", "is_drink", "sold_out"],
    properties: {
      id: integer(1),
      name: requiredString(60),
      description: { bsonType: "string", maxLength: 200 },
      category: { enum: CATEGORIES },
      price: integer(1),
      image: requiredString(716800),
      is_drink: { enum: [0, 1] },
      sold_out: { enum: [0, 1] },
    },
  },
  orders: {
    bsonType: "object",
    required: [
      "id", "user_id", "customer_name", "phone", "order_type", "payment",
      "total", "status", "table_id", "created_at", "items",
    ],
    properties: {
      id: integer(1),
      user_id: integer(1),
      customer_name: requiredString(80),
      phone: requiredString(20),
      order_type: { enum: ["dine-in", "takeaway"] },
      payment: { enum: ["counter", "stripe"] },
      total: integer(0),
      status: { enum: ["received", "completed"] },
      table_id: nullableId,
      created_at: requiredString(40),
      items: {
        bsonType: "array",
        minItems: 1,
        maxItems: 50,
        items: {
          bsonType: "object",
          required: ["menu_item_id", "name", "details", "price", "qty"],
          properties: {
            menu_item_id: integer(1),
            name: requiredString(60),
            details: { bsonType: "string", maxLength: 500 },
            price: integer(0),
            qty: { ...integer(1), maximum: 50 },
          },
        },
      },
    },
  },
  carts: {
    bsonType: "object",
    required: ["user_id", "lines"],
    properties: {
      user_id: integer(1),
      lines: {
        bsonType: "array",
        maxItems: 50,
        items: {
          bsonType: "object",
          required: ["line_key", "menu_item_id", "options", "qty"],
          properties: {
            line_key: requiredString(300),
            menu_item_id: integer(1),
            options: {
              oneOf: [
                { bsonType: "null" },
                drinkChoices,
              ],
            },
            qty: { ...integer(1), maximum: 50 },
          },
        },
      },
    },
  },
  cafe_tables: {
    bsonType: "object",
    required: ["id", "number", "seats", "order_id"],
    properties: {
      id: integer(1),
      number: integer(1),
      seats: integer(1),
      order_id: nullableId,
      shape: { enum: ["round", "square", "rect"] },
      x: { bsonType: numericTypes },
      y: { bsonType: numericTypes },
      w: { bsonType: numericTypes, minimum: 1 },
      h: { bsonType: numericTypes, minimum: 1 },
    },
  },
};

async function applyCollectionValidators(database) {
  for (const [name, schema] of Object.entries(collectionValidators)) {
    const exists = await database.listCollections({ name }, { nameOnly: true }).hasNext();
    const validation = {
      validator: { $jsonSchema: schema },
      validationLevel: "strict",
      validationAction: "error",
    };

    if (exists) {
      await database.command({ collMod: name, ...validation });
    } else {
      await database.createCollection(name, validation);
    }
  }
}

module.exports = { collectionValidators, applyCollectionValidators };
