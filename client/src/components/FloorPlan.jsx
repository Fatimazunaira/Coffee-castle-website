import { useCallback, useEffect, useRef, useState } from "react";

const MIN_ZOOM = 0.8;
const MAX_ZOOM = 4;
const TAP_SLOP = 6; // pixels a finger may wiggle and still count as a tap

// Where the chairs go around one table. Returns [{ x, y, rot }] in floor-plan units.
function chairsFor(t) {
  const gap = 11; // table edge to chair centre
  const chairs = [];

  if (t.shape === "round") {
    const radius = t.w / 2 + gap;
    for (let i = 0; i < t.seats; i++) {
      const angle = (i / t.seats) * Math.PI * 2 - Math.PI / 2;
      chairs.push({
        x: t.x + radius * Math.cos(angle),
        y: t.y + radius * Math.sin(angle),
        rot: (angle * 180) / Math.PI + 90,
      });
    }
    return chairs;
  }

  // Squares fill left, right, top, bottom in that order. Rectangles use the two long sides.
  const counts = { top: 0, bottom: 0, left: 0, right: 0 };
  if (t.shape === "rect") {
    counts.top = Math.ceil(t.seats / 2);
    counts.bottom = Math.floor(t.seats / 2);
  } else {
    ["left", "right", "top", "bottom"].forEach((side, i) => {
      counts[side] = Math.floor(t.seats / 4) + (i < t.seats % 4 ? 1 : 0);
    });
  }

  for (let j = 0; j < counts.top; j++) {
    chairs.push({ x: t.x - t.w / 2 + (t.w * (j + 1)) / (counts.top + 1), y: t.y - t.h / 2 - gap, rot: 0 });
  }
  for (let j = 0; j < counts.bottom; j++) {
    chairs.push({ x: t.x - t.w / 2 + (t.w * (j + 1)) / (counts.bottom + 1), y: t.y + t.h / 2 + gap, rot: 180 });
  }
  for (let j = 0; j < counts.left; j++) {
    chairs.push({ x: t.x - t.w / 2 - gap, y: t.y - t.h / 2 + (t.h * (j + 1)) / (counts.left + 1), rot: -90 });
  }
  for (let j = 0; j < counts.right; j++) {
    chairs.push({ x: t.x + t.w / 2 + gap, y: t.y - t.h / 2 + (t.h * (j + 1)) / (counts.right + 1), rot: 90 });
  }
  return chairs;
}

function statusText(t) {
  if (t.mine) return "your table";
  return t.status === "free" ? "available" : "booked";
}

// The floor plan. Green = available, red = booked. Drag to move, pinch or scroll-wheel to zoom,
// or use the + / - buttons. Tap a table to select it.
function FloorPlan({ floor, tables, selectedId, onSelect }) {
  const svgRef = useRef(null);
  const pointers = useRef(new Map()); // pointerId -> { x, y } in screen pixels
  const gesture = useRef(null);
  const moved = useRef(false); // did this touch turn into a drag? (then it is not a tap)

  const [view, setViewState] = useState({ s: 1, tx: 0, ty: 0 });
  const viewRef = useRef(view);

  // Keeps the plan from being dragged completely out of sight.
  const setView = useCallback(
    (next) => {
      const s = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next.s));
      const limit = (size, tx) => {
        const a = size * (1 - s);
        return Math.min(Math.max(a, 0) + 40, Math.max(Math.min(a, 0) - 40, tx));
      };
      const clamped = { s, tx: limit(floor.width, next.tx), ty: limit(floor.height, next.ty) };
      viewRef.current = clamped;
      setViewState(clamped);
    },
    [floor.width, floor.height]
  );

  // Screen pixel -> floor-plan coordinates (before zoom and pan).
  function toPlan(clientX, clientY) {
    const svg = svgRef.current;
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    return point.matrixTransform(svg.getScreenCTM().inverse());
  }

  // Zoom to a new scale while keeping the plan point under (px, py) still.
  const zoomAbout = useCallback(
    (px, py, scale) => {
      const v = viewRef.current;
      const s = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
      const cx = (px - v.tx) / v.s;
      const cy = (py - v.ty) / v.s;
      setView({ s, tx: px - cx * s, ty: py - cy * s });
    },
    [setView]
  );

  // The mouse wheel needs a non-passive listener so the page does not scroll while zooming.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    function onWheel(e) {
      e.preventDefault();
      const point = toPlan(e.clientX, e.clientY);
      zoomAbout(point.x, point.y, viewRef.current.s * Math.exp(-e.deltaY * 0.0015));
    }
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomAbout]);

  function startGesture() {
    const list = [...pointers.current.values()];
    if (list.length === 1) {
      const p = toPlan(list[0].x, list[0].y);
      gesture.current = { type: "pan", last: p, startX: list[0].x, startY: list[0].y };
    } else if (list.length >= 2) {
      const [a, b] = list;
      const pa = toPlan(a.x, a.y);
      const pb = toPlan(b.x, b.y);
      gesture.current = {
        type: "pinch",
        dist: Math.hypot(pb.x - pa.x, pb.y - pa.y) || 1,
        mid: { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 },
      };
      moved.current = true;
    } else {
      gesture.current = null;
    }
  }

  function onPointerDown(e) {
    if (pointers.current.size === 0) moved.current = false;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    startGesture();
  }

  function onPointerMove(e) {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    const v = viewRef.current;

    if (g.type === "pan") {
      if (!moved.current && Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < TAP_SLOP) return;
      moved.current = true;
      const p = toPlan(e.clientX, e.clientY);
      setView({ s: v.s, tx: v.tx + (p.x - g.last.x), ty: v.ty + (p.y - g.last.y) });
      g.last = p;
    } else {
      const [a, b] = [...pointers.current.values()];
      const pa = toPlan(a.x, a.y);
      const pb = toPlan(b.x, b.y);
      const dist = Math.hypot(pb.x - pa.x, pb.y - pa.y) || 1;
      const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
      const s = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.s * (dist / g.dist)));
      // the plan point that was under the old midpoint must end up under the new one
      const cx = (g.mid.x - v.tx) / v.s;
      const cy = (g.mid.y - v.ty) / v.s;
      setView({ s, tx: mid.x - cx * s, ty: mid.y - cy * s });
      g.dist = dist;
      g.mid = mid;
    }
  }

  function onPointerEnd(e) {
    pointers.current.delete(e.pointerId);
    startGesture();
  }

  function pick(table) {
    if (moved.current) return; // that was a drag, not a tap
    onSelect(table);
  }

  const zoomBy = (factor) =>
    zoomAbout(floor.width / 2, floor.height / 2, viewRef.current.s * factor);

  return (
    <div className="fp-wrap">
      <svg
        ref={svgRef}
        className="fp-svg"
        viewBox={`0 0 ${floor.width} ${floor.height}`}
        role="group"
        aria-label="Cafe floor plan"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerLeave={onPointerEnd}
      >
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.s})`}>
          <rect className="fp-floor" x="0" y="0" width={floor.width} height={floor.height} rx="14" />
          <text className="fp-door" x={floor.width / 2} y={floor.height - 10} textAnchor="middle">
            ENTRANCE
          </text>

          {tables.map((t) => {
            const state = t.mine ? "mine" : t.status;
            const selected = t.id === selectedId;
            const label = `Table ${t.number}, ${t.seats} seats, ${statusText(t)}`;
            return (
              <g
                key={t.id}
                className={`fp-table ${state}${selected ? " selected" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={label}
                aria-pressed={selected}
                onClick={() => pick(t)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(t);
                  }
                }}
              >
                {chairsFor(t).map((c, i) => (
                  <g key={i} transform={`translate(${c.x} ${c.y}) rotate(${c.rot})`}>
                    <rect className="fp-chair" x="-7" y="-6" width="14" height="12" rx="4" />
                    <rect className="fp-chair-back" x="-7" y="-8" width="14" height="4" rx="2" />
                  </g>
                ))}

                {t.shape === "round" ? (
                  <>
                    <circle className="fp-hit" cx={t.x} cy={t.y} r={t.w / 2 + 22} />
                    <circle className="fp-top" cx={t.x} cy={t.y} r={t.w / 2} />
                  </>
                ) : (
                  <>
                    <rect className="fp-hit" x={t.x - t.w / 2 - 22} y={t.y - t.h / 2 - 22} width={t.w + 44} height={t.h + 44} />
                    <rect
                      className="fp-top"
                      x={t.x - t.w / 2}
                      y={t.y - t.h / 2}
                      width={t.w}
                      height={t.h}
                      rx={t.shape === "square" ? 5 : 7}
                    />
                  </>
                )}

                <text className="fp-num" x={t.x} y={t.y - 1} textAnchor="middle" dominantBaseline="middle">
                  {t.number}
                </text>
                <text className="fp-seats" x={t.x} y={t.y + 11} textAnchor="middle" dominantBaseline="middle">
                  {t.mine ? "YOURS" : `${t.seats} seats`}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className="fp-controls">
        <button type="button" onClick={() => zoomBy(1.4)} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={() => setView({ s: 1, tx: 0, ty: 0 })} aria-label="Reset view">
          ⤢
        </button>
      </div>
    </div>
  );
}

export default FloorPlan;
