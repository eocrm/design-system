import { getPinStyle, AUTO_CELL_WIDTH } from './pinStyle';
import type { DataTableInstance } from './types';

// Helper: build a minimal instance shape for the helper's needs.
function makeInstance(overrides: Partial<DataTableInstance<unknown>> = {}): DataTableInstance<unknown> {
  return {
    columnPinning: { left: [], right: [] },
    leftPinOffsets: {},
    rightPinOffsets: {},
    enableRowSelection: false,
    // Other fields aren't read by getPinStyle — cast to satisfy the type.
    ...overrides,
  } as DataTableInstance<unknown>;
}

describe('getPinStyle', () => {
  it('returns empty object for unpinned column', () => {
    const result = getPinStyle('name', makeInstance());
    expect(result).toEqual({});
  });

  it('returns sticky-left style with offset for left-pinned column', () => {
    const result = getPinStyle('name', makeInstance({
      columnPinning: { left: ['name'], right: [] },
      leftPinOffsets: { name: 0 },
    }));
    expect(result).toEqual({
      position: 'sticky',
      left: 0,
      pinSide: 'left',
    });
  });

  it('returns sticky-right style with offset for right-pinned column', () => {
    const result = getPinStyle('actions', makeInstance({
      columnPinning: { left: [], right: ['actions'] },
      rightPinOffsets: { actions: 0 },
    }));
    expect(result).toEqual({
      position: 'sticky',
      right: 0,
      pinSide: 'right',
    });
  });

  it('shifts left offset by AUTO_CELL_WIDTH when enableRowSelection is true', () => {
    const result = getPinStyle('name', makeInstance({
      enableRowSelection: true,
      columnPinning: { left: ['name'], right: [] },
      leftPinOffsets: { name: 0 },
    }));
    expect(result.left).toBe(AUTO_CELL_WIDTH);
  });

  it('does NOT shift right offset when enableRowSelection is true', () => {
    const result = getPinStyle('actions', makeInstance({
      enableRowSelection: true,
      columnPinning: { left: [], right: ['actions'] },
      rightPinOffsets: { actions: 0 },
    }));
    expect(result.right).toBe(0);
  });

  it('stacks left offsets: first left col = 0, second = first width, etc.', () => {
    const result = getPinStyle('status', makeInstance({
      columnPinning: { left: ['name', 'status'], right: [] },
      leftPinOffsets: { name: 0, status: 200 }, // name is 200px wide
    }));
    expect(result.left).toBe(200);
  });

  it('AUTO_CELL_WIDTH is 44', () => {
    expect(AUTO_CELL_WIDTH).toBe(44);
  });
});
