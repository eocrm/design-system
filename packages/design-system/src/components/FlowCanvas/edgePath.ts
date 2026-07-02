/** Axis-aligned rectangle in canvas coordinates. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Point in canvas coordinates. */
export interface Point {
  x: number;
  y: number;
}

/** SVG path plus the chip anchor point for one edge. */
export interface EdgeGeometry {
  /** `d` attribute for the SVG `<path>`. */
  path: string;
  /** True cubic midpoint (t = 0.5) — where the label chip is anchored. */
  midpoint: Point;
}

const MIN_STRENGTH = 40; // minimum control-point pull so short edges still curve
const PAIR_SHIFT = 8; // endpoint offset when a reverse edge exists
const PAIR_BOW = 24; // extra control-point bow for reverse pairs

function cubic(p0: Point, c1: Point, c2: Point, p3: Point): EdgeGeometry {
  return {
    path: `M ${p0.x} ${p0.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p3.x} ${p3.y}`,
    // De Casteljau at t = 0.5: (p0 + 3·c1 + 3·c2 + p3) / 8
    midpoint: {
      x: (p0.x + 3 * c1.x + 3 * c2.x + p3.x) / 8,
      y: (p0.y + 3 * c1.y + 3 * c2.y + p3.y) / 8,
    },
  };
}

/**
 * Bezier between two node rects. Anchors on the facing sides (horizontal when
 * |dx| ≥ |dy|, else vertical). `curvature` (±1) separates an A→B / B→A pair:
 * pass opposite signs so the two edges bow apart; 0 for a lone edge.
 */
export function edgeGeometry(source: Rect, target: Rect, curvature: -1 | 0 | 1 = 0): EdgeGeometry {
  const sc = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
  const tc = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  const dx = tc.x - sc.x;
  const dy = tc.y - sc.y;
  const bow = curvature * PAIR_BOW;

  if (Math.abs(dx) >= Math.abs(dy)) {
    const sign = dx >= 0 ? 1 : -1;
    const p0 = { x: sc.x + (sign * source.width) / 2, y: sc.y + curvature * PAIR_SHIFT };
    const p3 = { x: tc.x - (sign * target.width) / 2, y: tc.y + curvature * PAIR_SHIFT };
    const strength = Math.max(MIN_STRENGTH, Math.abs(p3.x - p0.x) / 2);
    return cubic(
      p0,
      { x: p0.x + sign * strength, y: p0.y + bow },
      { x: p3.x - sign * strength, y: p3.y + bow },
      p3,
    );
  }
  const sign = dy >= 0 ? 1 : -1;
  const p0 = { x: sc.x + curvature * PAIR_SHIFT, y: sc.y + (sign * source.height) / 2 };
  const p3 = { x: tc.x + curvature * PAIR_SHIFT, y: tc.y - (sign * target.height) / 2 };
  const strength = Math.max(MIN_STRENGTH, Math.abs(p3.y - p0.y) / 2);
  return cubic(
    p0,
    { x: p0.x + bow, y: p0.y + sign * strength },
    { x: p3.x + bow, y: p3.y - sign * strength },
    p3,
  );
}

/** Small loop arcing over a node's top-right corner, for self-referencing edges. */
export function selfLoopGeometry(rect: Rect): EdgeGeometry {
  const p0 = { x: rect.x + rect.width * 0.75, y: rect.y };
  const p3 = { x: rect.x + rect.width, y: rect.y + rect.height * 0.25 };
  return cubic(p0, { x: p0.x + 10, y: p0.y - 48 }, { x: p3.x + 48, y: p3.y - 10 }, p3);
}
