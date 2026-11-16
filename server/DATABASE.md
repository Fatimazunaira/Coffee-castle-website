# MongoDB setup

The server stores data in MongoDB. Use a local MongoDB server or MongoDB Atlas and set its
connection string as `MONGODB_URI` in `server/.env`. Keep `.env` private.

On the first server start, the app creates the indexes and adds the default menu, promo,
tables, and development admin only when those records are missing.

