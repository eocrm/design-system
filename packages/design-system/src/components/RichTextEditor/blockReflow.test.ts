import { computeReflow } from './blockReflow';

// 3 equal 20px-tall rows stacked from y=0.
const R3 = [
  { top: 0, height: 20 },
  { top: 20, height: 20 },
  { top: 40, height: 20 },
];

describe('computeReflow', () => {
  it('drag the first row down past the others → passed rows shift up, unit follows', () => {
    // pointer near the bottom row, dragged down by 40px; unit = row 0.
    const r = computeReflow(R3, { u0: 0, u1: 0 }, 40, 55);
    expect(r.gap).toBe(3); // lands at the end
    expect(r.liftDy).toBe(40); // clamped to maxDy = bottom(2)-bottom(0) = 60-20 = 40
    expect(r.shifts).toEqual([40, -20, -20]); // unit follows; rows 1,2 slide up by unitHeight(20)
  });

  it('drag the last row up to the top → passed rows shift down, unit follows', () => {
    const r = computeReflow(R3, { u0: 2, u1: 2 }, -40, 5);
    expect(r.gap).toBe(0);
    expect(r.liftDy).toBe(-40); // minDy = rects[0].top - rects[2].top = -40
    expect(r.shifts).toEqual([20, 20, -40]); // rows 0,1 slide down; unit follows up
  });

  it('clamps liftDy to the container bounds (cannot leave top/bottom)', () => {
    expect(computeReflow(R3, { u0: 0, u1: 0 }, 9999, 999).liftDy).toBe(40); // maxDy
    expect(computeReflow(R3, { u0: 2, u1: 2 }, -9999, -999).liftDy).toBe(-40); // minDy
  });

  it('no reorder when the pointer stays within the unit span (gap inside the unit)', () => {
    // unit = row 1; pointer over row 1's own box.
    const r = computeReflow(R3, { u0: 1, u1: 1 }, 0, 25);
    expect(r.gap).toBe(1); // a gap of u0 / inside the unit span → moveBlockUnitToIndex no-ops
    expect(r.shifts).toEqual([0, 0, 0]);
  });

  it('a multi-box unit (list subtree) travels together; neighbors shift by the full unit height', () => {
    // 4 rows; unit = rows 1..2 (a list item + one nested child), height 40.
    const R4 = [
      { top: 0, height: 20 },
      { top: 20, height: 20 },
      { top: 40, height: 20 },
      { top: 60, height: 20 },
    ];
    const r = computeReflow(R4, { u0: 1, u1: 2 }, 40, 75); // drag the pair down to the end
    expect(r.gap).toBe(4);
    expect(r.shifts[1]).toBe(r.liftDy);
    expect(r.shifts[2]).toBe(r.liftDy);
    expect(r.shifts[3]).toBe(-40); // the trailing row slides up by the unit's full height
    expect(r.shifts[0]).toBe(0);
  });

  it('returns a no-op reflow for an empty rect list', () => {
    expect(computeReflow([], { u0: 0, u1: 0 }, 10, 10)).toEqual({ liftDy: 0, gap: 0, shifts: [] });
  });
});
