# NUST Coffee Castle

A cafe website: customers browse the menu, log in, order dine-in or takeaway. Dine-in guests pick a free table on a zoomable floor plan. The admin changes the menu and the promo banner, sees customers, their carts and
orders, and frees tables.

Built with React (Vite) for the website, Express for the server and MongoDB for the database.

## What you need

- **Node.js 22.13 or newer** (`node -v` shows yours).
- A MongoDB database, such as a MongoDB Atlas cluster.

## Setup (once)

1. `git clone https://github.com/Fatimazunaira/Coffee-castle-website`
2. Client: `cd client` then `npm install`
3. Server: `cd server` then `npm install`
4. In `server/`, copy `.env.example` to `.env`. Generate a secret by running:

   ```sh
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

   Paste the output as the value of `JWT_SECRET` in `server/.env`, then fill in
   `MONGODB_URI` and `ADMIN_PASSWORD` (see `DATABASE.md`). Keep `.env` private; never
   commit or share the generated secret.

## Run (two terminals, both must stay open)

- Terminal 1, in `server/`: `node index.js` (you should see `Server running on http://localhost:5000`)
- Terminal 2, in `client/`: `npm run dev`, then open http://localhost:5173

If the page says it cannot reach the server, terminal 1 is not running.

## Accounts

- Customers sign up on the **Login** page.
- The admin is made from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `server/.env` the first time the server
  starts. After logging in, an **ADMIN** link appears in the navigation bar.
  (With no `ADMIN_PASSWORD`, the development login is `admin@coffeecastle.pk` / `admin12345`.)

## Folders

- `client/src/pages`: Home, Menu, Tables (floor plan), Cart, Login, Admin
- `client/src/components/admin`: the four admin tabs (Customers, Tables, Menu, Promo banner)
- `client/src/data/menuStore.js`: the only file that talks to the server about menu items
- `server/routes`: the API (`public`, `auth`, `cart`, `orders`, `tables`, `admin`)
- `server/tableLayout.js`: the 7 tables and where they sit on the floor plan
- `server/db.js`: MongoDB connection, indexes, and initial data

More about the database: see `DATABASE.md`.

## Not finished yet

- "Pay by card (Stripe)" saves the order but does not charge a card.
- The ORDER HISTORY link has no page yet.
