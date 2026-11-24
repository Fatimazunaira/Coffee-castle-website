# MongoDB guide

The server stores application data in MongoDB using the official Node.js driver. You can use
the local MongoDB service for development or MongoDB Atlas for a shared/deployed database.
The server requires Node.js 22.13 or newer.

## Local setup

1. Make sure the MongoDB service is running on your computer.
2. In `server/`, copy `.env.example` to `.env` if you do not already have a `.env` file.
3. Set `MONGODB_URI` to your local database, for example:

   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/coffee_castle
   ```

4. Set a long random `JWT_SECRET`, plus `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
5. Start the server from `server/` with `npm run dev`, then start the client from `client/`
   with `npm run dev`.

Never commit `server/.env`. It contains credentials and is ignored by Git.

## Data dictionary

Unless noted otherwise, application `id` values are positive integers allocated from
`counters`. MongoDB also adds its own `_id` field. Dates are ISO 8601 strings. Price and
quantity values are whole numbers; there is no separate currency field. Boolean-like flags
are stored as `0` or `1`.

| Collection | Fields and meaning |
| --- | --- |
| `users` | `id` integer; `name` string; `email` lowercase string; `phone` string or `null`; `password_hash` bcrypt string; `role` is `customer` or `admin`; `created_at` ISO date string. |
| `menu_items` | `id` integer; `name`, `description`, `category`, and `image` strings; `price` integer; `is_drink` and `sold_out` are `0` or `1`. Drink choice definitions and their prices are maintained in server code, not stored per menu item. |
| `promo` | Singleton document with `_id: 1`; `title` and `description` strings; `price` integer or `null`; `active` is `0` or `1`. |
| `cafe_tables` | `id` integer; `number` and `seats` integers; `order_id` integer referencing `orders.id`, or `null` when unoccupied; `shape` is `round`, `square` or `rect`; `x`, `y` (centre) and `w`, `h` (size) place the table on the 360 x 480 floor plan. There are exactly 7 tables, defined in `server/tableLayout.js` and copied into MongoDB at startup. |
| `orders` | `id` integer; `user_id` references `users.id`; `customer_name` and `phone` strings; `order_type` is `dine-in` or `takeaway`; `payment` is the `counter` or `stripe` method label; `total` integer; `status` is currently `received` or `completed`; `table_id` references `cafe_tables.id` or is `null`; `created_at` ISO date string; `items` is an immutable-at-checkout item snapshot (see below). |
| `carts` | One document per `user_id`; `lines` array contains `line_key` string, `menu_item_id` referencing `menu_items.id`, `options` object or `null`, and `qty` integer. Drink `options` contain `size`, `milk`, `shots`, `sugar`, and `addons`; non-drink options are `null`. |
| `counters` | One document per counter; `_id` is the collection name and `sequence` is the last allocated integer. |

Each `orders.items` snapshot has `menu_item_id`, `name`, `details`, `price` (unit price
including selected drink options), and `qty`. Keeping the name and price in the order
preserves what was purchased if the menu item later changes or is removed. `payment` is
only a method label; the application does not store card numbers or payment credentials.

### Relationships and indexes

`orders.user_id` links an order to a user. `cafe_tables.order_id` identifies the order
currently occupying a table. An order's `table_id` records the table assigned to it and is
retained after completion as order history, so it need not match the table's current
`order_id`. Cart lines and order snapshots refer to menu items by numeric ID. MongoDB does
not enforce these references as foreign keys, so backend operations must keep active
assignments consistent.

The server creates these indexes at startup:

| Collection | Index |
| --- | --- |
| `users` | Unique `id`; unique `email` |
| `menu_items` | Unique `id` |
| `cafe_tables` | Unique `id`; unique `number` |
| `orders` | Unique `id`; `{ user_id: 1, id: -1 }` for a customer's recent orders; `{ order_type: 1, table_id: 1, id: 1 }`; unique partial `{ user_id: 1 }` (only `dine-in`, `received`, with a table) so a guest has one active table |
| `carts` | Unique `user_id` |

`promo._id` and `counters._id` are unique through MongoDB's built-in `_id` index. At startup,
the server applies strict MongoDB JSON Schema validators to `users`, `menu_items`, `orders`,
`carts`, and `cafe_tables`. They enforce the required fields, BSON types, and documented
allowed values; the API still performs user-friendly input validation. Validators are applied
to existing collections with `collMod` and do not rewrite or scan existing documents. The
MongoDB application user must be allowed to create collections and run `collMod`.

Run the validator integration test from `server/` with `MONGODB_TEST_URI` pointed at a
disposable MongoDB instance, for example:

```powershell
$env:MONGODB_TEST_URI = "mongodb://127.0.0.1:27017"
npm test
```

The test creates and drops a uniquely named test database. Do not point
`MONGODB_TEST_URI` at a production database.

### Dine-in order and table lifecycle

- Guests pick a table on the floor plan (`/tables`: green = free, red = booked). Picking only
  remembers the choice in the browser; it does **not** hold the table. There are no reservations.
- Placing a dine-in order must include `tableId`. The server claims it with one atomic update
  (`order_id: null` -> the new order's id). If two guests order the same table at the same moment
  exactly one update matches; the other gets HTTP 409 `TABLE_TAKEN`, keeps their cart and picks
  another table.
- One guest, one table: a guest with an active dine-in order (`status: received`, has a `table_id`)
  gets 409 `ACTIVE_ORDER` for another dine-in order. This is enforced three ways: a check before
  claiming, the unique partial index `one_active_dine_in_per_user` on `orders`, and a check after
  saving that undoes the newest order if the guest somehow has two. Takeaway orders are unaffected.
- If saving the order fails after a table was claimed, the table is released.
- Freeing an occupied table (admin) marks its order `completed` and releases the table. There is no
  waiting queue any more: if every table is booked, guests can still order takeaway.
- A completed order keeps its `table_id` as history.
- A takeaway order has `table_id: null`.
- Upgrading an existing database: tables 1 to 7 get their floor-plan fields; old tables 8 to 10 that are
  free are deleted at startup, and occupied ones stay visible in the admin Tables tab (but not on the
  guest plan) until you free them, then they are deleted. Dine-in orders that were still queued under
  the old system (`table_id: null`) are left as they are; the old queue no longer seats them.

The order insert and table updates span multiple documents and are not wrapped in a MongoDB
transaction. The order-creation route releases a claimed table if inserting the order
fails, and table assignment uses conditional updates, but a process interruption or a
concurrent table-free operation can still leave the two references out of sync. Treat
recovery and concurrency testing as a backend follow-up; transactions would require a
MongoDB replica-set deployment.

Before changing this flow, run `server/test/table-race.mjs` against a disposable database (see the
comment at the top of that file). It checks the double-booking, one-table-per-guest and free-up cases.

On startup, the server creates required indexes and adds the default menu and promo when those
collections are empty, and syncs the 7 tables from `server/tableLayout.js` (free tables left over from
the old 10-table setup are deleted). Existing partially populated menu or table collections
are not automatically backfilled. It creates the admin account from `ADMIN_EMAIL` and
`ADMIN_PASSWORD` only if no admin exists.

## Viewing local data

In MongoDB Compass, connect to:

```text
mongodb://127.0.0.1:27017
```

Open the `coffee_castle` database and select a collection to inspect its documents. The admin
dashboard in the website provides customer, cart, order, table, menu, and promo views without
exposing password hashes.

## Deploying

For a deployed site, use a hosted database such as MongoDB Atlas. Set `MONGODB_URI` in the
hosting provider's environment-variable settings to the Atlas connection string. Do not use
`127.0.0.1` for a remote deployment; that address refers to the deployed machine itself.
Keep the database username/password private, and allow connections only from trusted
networks where possible.
