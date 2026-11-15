# NUST Coffee Castle

## Setup
1. Install Node.js and MongoDB Community Server (MongoDB must be running)
2. git clone <repo link>
3. cd client; npm install
4. cd server; npm install --legacy-peer-deps
5. In server/, create a file called .env with this line:
   MONGO_URI=mongodb://127.0.0.1:27017/coffeecastle
6. In server/, run once to load the starter menu: node seed.js
7. Run client: npm run dev (in client/)
8. Run server: node index.js (in server/)
