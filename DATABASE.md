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

## MongoDB collections

| Collection | What it stores |
| --- | --- |
| `users` | Customer/admin names, email, optional phone, role, account date, and bcrypt password hash. |
| `menu_items` | Menu name, description, category, price, image, drink flag, and sold-out flag. |
| `promo` | The home-page promo banner and its active state. |
| `cafe_tables` | Table number, seats, and the order currently assigned to the table. |
| `orders` | Customer/order details, total, status, payment method label, table assignment, and an embedded snapshot of the ordered items. |
| `carts` | Each customer's saved cart lines and drink choices. |
| `counters` | Numeric ID sequences used by the app. |

Passwords are stored as bcrypt hashes, not plain text. The app stores the payment method
label, not card numbers or payment credentials.

On startup, the server creates required indexes and adds the default menu, promo, and tables
when those collections are empty. It creates the admin account from `ADMIN_EMAIL` and
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
