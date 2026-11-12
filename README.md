# NUST Coffee Castle

## Setup
You need Node.js 22.13 or newer (check with `node -v`).

1. git clone <repo link>
2. cd client; npm install
3. cd server; npm install --legacy-peer-deps
4. In server/, copy .env.example to .env and fill in the values (see DATABASE.md)
5. Run server: node index.js (in server/)
6. Run client: npm run dev (in client/), then open http://localhost:5173

The client sends every /api request to the server on port 5000 (see client/vite.config.js),
so start the server first.

## Logging in
- Customers: use "LOGIN" in the top bar, then the "SIGN UP" tab.
- Admin: log in with the ADMIN_EMAIL and ADMIN_PASSWORD from server/.env.
  An "ADMIN" link then appears in the top bar.

The admin panel (/admin) has four tabs: Customers (details, carts, orders and tables),
Tables, Menu, and Promo banner.

## Database
See [DATABASE.md](DATABASE.md).
