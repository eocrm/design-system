/** Greedy shortest-column-first packing. Returns `columnCount` arrays of child indices. */
export function balanceColumns(heights: number[], columnCount: number): number[][] {
  const cols = Math.max(1, Math.floor(columnCount));
  const out: number[][] = Array.from({ length: cols }, () => []);
  const colHeights = new Array<number>(cols).fill(0);
  heights.forEach((h, i) => {
    let min = 0;
    for (let c = 1; c < cols; c++) {
      if (colHeights[c] < colHeights[min]) min = c;
    }
    out[min].push(i);
    colHeights[min] += h;
  });
  return out;
}

/** How many columns of `minColumnPx` (+ `gapPx` between) fit in `width`. Never < 1. */
export function columnsForWidth(width: number, minColumnPx: number, gapPx: number): number {
  if (width <= 0 || minColumnPx <= 0) return 1;
  return Math.max(1, Math.floor((width + gapPx) / (minColumnPx + gapPx)));
}

/** Index-order distribution across columns (the pre-measure / SSR first paint). */
export function roundRobinColumns(itemCount: number, columnCount: number): number[][] {
  const cols = Math.max(1, Math.floor(columnCount));
  const out: number[][] = Array.from({ length: cols }, () => []);
  for (let i = 0; i < itemCount; i++) out[i % cols].push(i);
  return out;
}

/** Deep-equal two column distributions (used to skip no-op state updates). */
export function distributionsEqual(a: number[][], b: number[][]): boolean {
  if (a.length !== b.length) return false;
  for (let c = 0; c < a.length; c++) {
    if (a[c].length !== b[c].length) return false;
    for (let i = 0; i < a[c].length; i++) {
      if (a[c][i] !== b[c][i]) return false;
    }
  }
  return true;
}
