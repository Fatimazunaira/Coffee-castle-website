// Table race test. Needs a REAL MongoDB: FerretDB's conditional updates are not atomic, so the
// double-booking checks fail there for reasons that have nothing to do with this code.
// Table race test. Run against a THROWAWAY database, never production:
//   1. start the server (node index.js) with ADMIN_PASSWORD=adminpass123 on PORT=5055
//   2. node test/table-race.mjs
const B = "http://localhost:5055";
const j = async (path, { method = "GET", body, token } = {}) => {
  const r = await fetch(B + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json().catch(() => null) };
};
let fails = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (extra ? "  " + extra : "")); if (!ok) fails++; };
const run = Date.now();
async function newUser(i) {
  const r = await j("/api/auth/register", { method: "POST", body: { name: "Guest " + i, email: `g${i}_${run}@t.test`, phone: "0300", password: "password123" } });
  return r.data.token;
}
const order = (token, tableId, type = "dine-in") =>
  j("/api/orders", { method: "POST", token, body: { name: "G", phone: "0300", orderType: type, payment: "counter", tableId, items: [{ itemId: 2, options: null, qty: 1 }] } });
const tablesOf = async (token) => (await j("/api/tables", { token })).data;

const admin = (await j("/api/auth/login", { method: "POST", body: { email: "admin@coffeecastle.pk", password: "adminpass123" } })).data.token;
const users = [];
for (let i = 0; i < 10; i++) users.push(await newUser(i));

// 1. ten guests, same table, same instant
const res = await Promise.all(users.map((t) => order(t, 1)));
const won = res.filter((r) => r.status === 201), taken = res.filter((r) => r.status === 409 && r.data.code === "TABLE_TAKEN");
check("10 guests race for table 1: exactly one wins", won.length === 1, `(201s=${won.length}, 409 TABLE_TAKEN=${taken.length})`);
check("all others told TABLE_TAKEN", taken.length === 9);
const winnerIdx = res.findIndex((r) => r.status === 201), winner = users[winnerIdx], loser = users[(winnerIdx + 1) % 10];

// 2. board state
let t = await tablesOf(winner);
check("winner sees table 1 booked + mine", t.tables[0].status === "booked" && t.tables[0].mine && t.mine.tableNumber === 1);
t = await tablesOf(loser);
check("others see table 1 booked, not mine, mine=null", t.tables[0].status === "booked" && !t.tables[0].mine && t.mine === null);
t = await tablesOf();
check("guest (no login) sees booked and only table 1", t.tables.filter((x) => x.status === "booked").length === 1 && t.mine === null);
check("exactly 7 tables", t.tables.length === 7);

// 3. winner cannot take a 2nd table
const second = await order(winner, 2);
check("winner cannot order a 2nd table (ACTIVE_ORDER)", second.status === 409 && second.data.code === "ACTIVE_ORDER");
t = await tablesOf();
check("table 2 stayed free", t.tables[1].status === "free");
const take = await order(winner, undefined, "takeaway");
check("winner CAN still order takeaway", take.status === 201 && take.data.table === null);

// 4. one fresh guest fires 5 dine-in orders for 5 different tables at once
const solo = await newUser(99);
const burst = await Promise.all([2, 3, 4, 5, 6].map((id) => order(solo, id)));
const okBurst = burst.filter((r) => r.status === 201).length;
t = await tablesOf(solo);
const heldBySolo = t.tables.filter((x) => x.mine).length;
check("same guest, 5 simultaneous tables: at most one table kept", okBurst <= 1 && heldBySolo <= 1, `(201s=${okBurst}, tables held=${heldBySolo})`);
const bookedNow = t.tables.filter((x) => x.status === "booked").length;
check("no table left stuck 'booked' by a rolled-back order", bookedNow === 1 + heldBySolo, `(booked=${bookedNow})`);

// 5. dine-in without a table, and bad table
let r = await order(users[2], undefined);
check("dine-in without tableId rejected (NO_TABLE)", r.status === 400 && r.data.code === "NO_TABLE");
r = await order(users[2], 9999);
check("unknown table rejected", r.status === 404);

// 6. admin frees table 1 -> winner may choose again, and others may take it
const free = await j("/api/admin/tables/1/free", { method: "POST", token: admin });
check("admin free works", free.status === 200 && free.data.tables[0].status === "free");
r = await order(winner, 1);
check("after free, same guest can order dine-in again", r.status === 201);
console.log(fails ? `\n${fails} FAILED` : "\nALL PASSED");
process.exit(fails ? 1 : 0);
