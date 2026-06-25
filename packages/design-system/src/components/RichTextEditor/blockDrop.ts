// blockDrop.ts — pure geometry for block drag-to-reorder. Maps a pointer Y to the
// "gap" index (0..n) where a dropped block should land, by comparing against each
// block box's vertical midpoint.
export function gapIndexFromY(rects: { top: number; height: number }[], y: number): number {
  for (let i = 0; i < rects.length; i += 1) {
    if (y < rects[i].top + rects[i].height / 2) return i;
  }
  return rects.length;
}
