// blockReflow.ts — pure geometry for the in-place sortable reflow of block drag.
// From a measure-once snapshot of the block boxes + the pointer, it computes how
// far the grabbed unit lifts (clamped to the container), where it will drop (the
// gap handed to moveBlockUnitToIndex), and the translateY each box needs so the
// neighbours slide apart to open the slot. No DOM access — unit-testable.
import { gapIndexFromY } from './blockDrop';

/** A block box's vertical geometry, relative to the editor shell. */
export interface BlockRect {
  top: number;
  height: number;
}

/** Inclusive box-index range of the dragged unit (a block + any nested subtree). */
export interface UnitRange {
  u0: number;
  u1: number;
}

export interface Reflow {
  /** translateY for the grabbed unit (pointer-following, clamped to the editor). */
  liftDy: number;
  /** Drop gap (0..N) in the full block array — fed to moveBlockUnitToIndex. */
  gap: number;
  /** translateY per box (same order as `rects`): the unit gets liftDy; neighbours
   *  between the unit and the drop gap shift by ±unitHeight; others 0. */
  shifts: number[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * @param rects    box geometry snapshot (untransformed), in document order
 * @param unit     inclusive box-index range of the grabbed unit
 * @param rawDy    pointer delta Y since drag start (drives the lift)
 * @param pointerY pointer Y relative to the shell (drives the drop gap)
 */
export function computeReflow(
  rects: BlockRect[],
  unit: UnitRange,
  rawDy: number,
  pointerY: number,
): Reflow {
  const n = rects.length;
  if (n === 0) return { liftDy: 0, gap: 0, shifts: [] };

  const bottom = (i: number) => rects[i].top + rects[i].height;
  const unitHeight = bottom(unit.u1) - rects[unit.u0].top;
  const minDy = rects[0].top - rects[unit.u0].top; // unit can rise until its top hits row 0's top
  const maxDy = bottom(n - 1) - bottom(unit.u1); // ...or fall until its bottom hits the last row's bottom
  const liftDy = clamp(rawDy, minDy, maxDy);
  const gap = gapIndexFromY(rects, pointerY);

  const shifts = rects.map((_, i) => {
    if (i >= unit.u0 && i <= unit.u1) return liftDy; // the lifted unit travels with the pointer
    if (gap <= unit.u0 && i >= gap && i < unit.u0) return unitHeight; // opening a slot ABOVE → push down
    if (gap >= unit.u1 + 1 && i > unit.u1 && i <= gap - 1) return -unitHeight; // slot BELOW → push up
    return 0;
  });

  return { liftDy, gap, shifts };
}
