import type { Rect } from './edgePath';

/** Arrow-key direction for spatial node navigation. */
export type NavDirection = 'up' | 'down' | 'left' | 'right';

function center(rect: Rect): { x: number; y: number } {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/**
 * Nearest node in an arrow direction, judged by rect centers. Candidates must
 * lie strictly in that direction; off-axis distance is penalized 2× so
 * aligned neighbors win over closer diagonal ones. Returns null when nothing
 * lies that way.
 */
export function nearestInDirection(
  currentId: string,
  rects: ReadonlyMap<string, Rect>,
  direction: NavDirection,
): string | null {
  const current = rects.get(currentId);
  if (!current) return null;
  const cc = center(current);
  let best: string | null = null;
  let bestScore = Infinity;
  for (const [id, rect] of rects) {
    if (id === currentId) continue;
    const c = center(rect);
    const dx = c.x - cc.x;
    const dy = c.y - cc.y;
    let primary: number;
    let secondary: number;
    switch (direction) {
      case 'right':
        primary = dx;
        secondary = Math.abs(dy);
        break;
      case 'left':
        primary = -dx;
        secondary = Math.abs(dy);
        break;
      case 'down':
        primary = dy;
        secondary = Math.abs(dx);
        break;
      case 'up':
        primary = -dy;
        secondary = Math.abs(dx);
        break;
    }
    if (primary <= 0.5) continue;
    const score = primary + secondary * 2;
    if (score < bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}

/** Topmost node, ties broken by leftmost — the initial arrow-key focus target. */
export function topLeftMost(rects: ReadonlyMap<string, Rect>): string | null {
  let best: string | null = null;
  let bestRect: Rect | null = null;
  for (const [id, rect] of rects) {
    if (
      bestRect === null ||
      rect.y < bestRect.y ||
      (rect.y === bestRect.y && rect.x < bestRect.x)
    ) {
      best = id;
      bestRect = rect;
    }
  }
  return best;
}
