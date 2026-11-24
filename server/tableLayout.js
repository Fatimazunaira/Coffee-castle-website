// The cafe floor: exactly 7 tables.
// x and y are the CENTRE of the table on a 360 x 480 floor plan; w and h are its size.
// shape is "round", "square" or "rect" (a rectangle: chairs on its two long sides).
// The website draws the plan from these numbers, so to move or resize a table, edit it here
// and restart the server (the numbers are copied into MongoDB at startup).
const FLOOR = { width: 360, height: 480 };

const TABLE_LAYOUT = [
  { number: 1, seats: 2, shape: "round", x: 70, y: 80, w: 46, h: 46 },
  { number: 2, seats: 2, shape: "square", x: 180, y: 80, w: 46, h: 46 },
  { number: 3, seats: 4, shape: "round", x: 290, y: 80, w: 60, h: 60 },
  { number: 4, seats: 4, shape: "square", x: 80, y: 220, w: 66, h: 66 },
  { number: 5, seats: 5, shape: "round", x: 250, y: 225, w: 78, h: 78 },
  { number: 6, seats: 4, shape: "rect", x: 100, y: 375, w: 84, h: 46 },
  { number: 7, seats: 6, shape: "rect", x: 255, y: 375, w: 110, h: 46 },
];

module.exports = { FLOOR, TABLE_LAYOUT };
