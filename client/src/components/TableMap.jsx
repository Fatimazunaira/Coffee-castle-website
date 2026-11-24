import { useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// TABLE MAP: a drawn floor plan of the cafe.
//   green = free, red = taken, dark outline = the table you picked.
// You can zoom (pinch with two fingers, mouse wheel, or the + and - buttons)
// and move around (drag with one finger or the mouse).
//
// Props:
//   tables     = [{ id, number, seats, status: "free" | "taken" }]
//   selectedId = id of the chosen table (or null)
//   onSelect   = function called with a table when a free table is tapped
// ---------------------------------------------------------------------------

// Size of the drawing, in its own units (it is scaled to fit the screen).
const COL_W = 180; // width of one cell of the grid
const ROW_H = 160; // height of one cell
const COLUMNS = 3;
const TOP = 80; // space above the tables for the counter
const BOTTOM = 70; // space below for the entrance
const WIDTH = COL_W * COLUMNS;

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

// Works out the shape of a table from how many people sit at it.
//   1-2 seats: round    3-4 seats: square    5 or more: long (rectangle)
function shapeFor(seats) {
  if (seats <= 2) return { kind: "round", w: 56, h: 56 };
  if (seats <= 4) return { kind: "square", w: 64, h: 64 };
  if (seats <= 6) return { kind: "long", w: 112, h: 58 };
  return { kind: "long", w: 124, h: 58 };
}

// Where the chairs go, as small boxes around the table (x, y are the
// middle of the chair; the table's middle is 0, 0).
function chairsFor(seats, shape) {
  const { w, h } = shape;
  const chairs = [];
  const gap = 5; // space between the table and the chair
  const depth = 13; // how far the chair sticks out

  // Round and square tables: chairs on the sides (left, right, top, bottom)
  if (shape.kind !== "long") {
    const spots = [
      { x: -(w / 2 + gap + depth / 2), y: 0, vertical: true },
      { x: w / 2 + gap + depth / 2, y: 0, vertical: true },
      { x: 0, y: -(h / 2 + gap + depth / 2), vertical: false },
      { x: 0, y: h / 2 + gap + depth / 2, vertical: false },
    ];
    for (const spot of spots.slice(0, Math.min(seats, 4))) {
      chairs.push({ x: spot.x, y: spot.y, w: spot.vertical ? depth : 22, h: spot.vertical ? 22 : depth });
    }
    return chairs;
  }

  // Long tables: one chair at each end (if there are enough seats),
  // the rest spread along the top and the bottom.
  const left = seats >= 5 ? 1 : 0;
  const right = seats >= 6 ? 1 : 0;
  const rest = seats - left - right;
  const top = Math.ceil(rest / 2);
  const bottom = rest - top;

  if (left) chairs.push({ x: -(w / 2 + gap + depth / 2), y: 0, w: depth, h: 22 });
  if (right) chairs.push({ x: w / 2 + gap + depth / 2, y: 0, w: depth, h: 22 });

  const along = (count, y) => {
    for (let i = 0; i < count; i++) {
      const x = -w / 2 + ((i + 0.5) * w) / count;
      chairs.push({ x, y, w: 22, h: depth });
    }
  };
  along(top, -(h / 2 + gap + depth / 2));
  along(bottom, h / 2 + gap + depth / 2);
  return chairs;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function TableMap({ tables, selectedId, onSelect }) {
  const boxRef = useRef(null);

  // view = how the drawing is moved (x, y in pixels) and zoomed (k)
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });

  // The fingers (or mouse) that are touching the map right now
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const draggedAt = useRef(0); // time a drag ended, so a drag is not taken as a tap

  const rows = Math.max(1, Math.ceil(tables.length / COLUMNS));
  const height = TOP + rows * ROW_H + BOTTOM;

  // Keeps the drawing from being dragged completely off the screen.
  function limit(x, y, k) {
    const box = boxRef.current;
    if (!box) return { x, y, k };
    const w = box.clientWidth;
    const h = box.clientHeight;
    return {
      x: clamp(x, w - w * k, 0),
      y: clamp(y, h - h * k, 0),
      k,
    };
  }

  // Zoom to newK, keeping the point (cx, cy) of the screen where it is.
  function zoomAt(cx, cy, newK) {
    setView((v) => {
      const k = clamp(newK, MIN_ZOOM, MAX_ZOOM);
      const ratio = k / v.k;
      return limit(cx - (cx - v.x) * ratio, cy - (cy - v.y) * ratio, k);
    });
  }

  function zoomFromCentre(factor) {
    const box = boxRef.current;
    if (!box) return;
    zoomAt(box.clientWidth / 2, box.clientHeight / 2, view.k * factor);
  }

  // Mouse wheel zoom. It is added by hand (not with onWheel) because the
  // page must be told not to scroll, and React does not allow that.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    function onWheel(e) {
      e.preventDefault();
      const rect = box.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * 0.002);
      setView((v) => {
        const k = clamp(v.k * factor, MIN_ZOOM, MAX_ZOOM);
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const ratio = k / v.k;
        return limit(cx - (cx - v.x) * ratio, cy - (cy - v.y) * ratio, k);
      });
    }
    box.addEventListener("wheel", onWheel, { passive: false });
    return () => box.removeEventListener("wheel", onWheel);
  });

  function startGesture() {
    const points = [...pointers.current.values()];
    if (points.length === 1) {
      gesture.current = { type: "pan", start: points[0], view, moved: false };
    } else if (points.length >= 2) {
      const [a, b] = points;
      gesture.current = {
        type: "pinch",
        distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        view,
        moved: true,
      };
    } else {
      gesture.current = null;
    }
  }

  function onPointerDown(e) {
    const rect = boxRef.current.getBoundingClientRect();
    pointers.current.set(e.pointerId, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    startGesture();
  }

  function onPointerMove(e) {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    pointers.current.set(e.pointerId, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    const points = [...pointers.current.values()];
    const g = gesture.current;

    if (g.type === "pan" && points.length === 1) {
      const dx = points[0].x - g.start.x;
      const dy = points[0].y - g.start.y;
      // small wobbles of a finger are still a tap, not a drag
      if (!g.moved && Math.hypot(dx, dy) < 6) return;
      if (!g.moved) {
        g.moved = true;
        boxRef.current.setPointerCapture(e.pointerId);
      }
      setView(limit(g.view.x + dx, g.view.y + dy, g.view.k));
    }

    if (g.type === "pinch" && points.length >= 2) {
      const [a, b] = points;
      const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const k = clamp(g.view.k * (distance / g.distance), MIN_ZOOM, MAX_ZOOM);
      // the point that was under the fingers at the start stays under them
      const worldX = (g.mid.x - g.view.x) / g.view.k;
      const worldY = (g.mid.y - g.view.y) / g.view.k;
      setView(limit(mid.x - worldX * k, mid.y - worldY * k, k));
    }
  }

  function onPointerEnd(e) {
    const wasDragging = gesture.current && gesture.current.moved;
    pointers.current.delete(e.pointerId);
    if (wasDragging) draggedAt.current = e.timeStamp;
    startGesture(); // a finger is still down: carry on moving with it
  }

  function pick(table, e) {
    // ignore the tap that comes right after a drag
    if (e.timeStamp - draggedAt.current < 300) return;
    if (table.status === "free") onSelect(table);
  }

  const positions = tables.map((table, index) => {
    const row = Math.floor(index / COLUMNS);
    const col = index % COLUMNS;
    return {
      table,
      cx: col * COL_W + COL_W / 2,
      cy: TOP + row * ROW_H + ROW_H / 2,
    };
  });

  return (
    <div className="tm-wrap">
      <div className="tm-controls">
        <button type="button" onClick={() => zoomFromCentre(1.4)} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoomFromCentre(1 / 1.4)} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={() => setView({ x: 0, y: 0, k: 1 })} aria-label="Show the whole cafe">
          ⟲
        </button>
      </div>

      <div
        className="tm-box"
        ref={boxRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={{ aspectRatio: WIDTH + " / " + height }}
      >
        <svg
          className="tm-svg"
          viewBox={"0 0 " + WIDTH + " " + height}
          role="group"
          aria-label="Floor plan of the cafe"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
        >
          {/* the room */}
          <rect className="tm-room" x="4" y="4" width={WIDTH - 8} height={height - 8} rx="14" />

          {/* the counter */}
          <rect className="tm-counter" x="40" y="18" width={WIDTH - 80} height="34" rx="8" />
          <text className="tm-label" x={WIDTH / 2} y="40" textAnchor="middle">
            COUNTER
          </text>

          {/* the entrance */}
          <rect className="tm-door" x={WIDTH / 2 - 55} y={height - 22} width="110" height="14" rx="4" />
          <text className="tm-label" x={WIDTH / 2} y={height - 32} textAnchor="middle">
            ENTRANCE
          </text>

          {positions.map(({ table, cx, cy }) => {
            const shape = shapeFor(table.seats);
            const free = table.status === "free";
            const selected = table.id === selectedId;
            const classes = ["tm-table", free ? "tm-free" : "tm-taken", selected ? "tm-selected" : ""].join(" ");

            return (
              <g
                key={table.id}
                transform={`translate(${cx} ${cy})`}
                className="tm-group"
                role="button"
                tabIndex={free ? 0 : -1}
                aria-disabled={!free}
                aria-pressed={selected}
                aria-label={`Table ${table.number}, ${table.seats} seats, ${free ? "available" : "taken"}`}
                onClick={(e) => pick(table, e)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (free) onSelect(table);
                  }
                }}
              >
                {chairsFor(table.seats, shape).map((chair, i) => (
                  <rect
                    key={i}
                    className="tm-chair"
                    x={chair.x - chair.w / 2}
                    y={chair.y - chair.h / 2}
                    width={chair.w}
                    height={chair.h}
                    rx="4"
                  />
                ))}

                {shape.kind === "round" ? (
                  <circle className={classes} r={shape.w / 2} />
                ) : (
                  <rect
                    className={classes}
                    x={-shape.w / 2}
                    y={-shape.h / 2}
                    width={shape.w}
                    height={shape.h}
                    rx={shape.kind === "square" ? 6 : 8}
                  />
                )}

                <text className="tm-number" y="-2" textAnchor="middle">
                  {table.number}
                </text>
                <text className="tm-state" y="13" textAnchor="middle">
                  {selected ? "YOURS" : free ? table.seats + " seats" : "TAKEN"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default TableMap;
