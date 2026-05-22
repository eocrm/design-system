import { paginationRange, type PaginationItem } from './paginationRange';

describe('paginationRange', () => {
  // The source of truth for the algorithm is the spec's edge-case table.
  // Each case is verified against MUI's usePagination behaviour.
  const cases: Array<{
    name: string;
    current: number;
    count: number;
    siblings: number;
    expected: PaginationItem[];
  }> = [
    {
      name: 'current=1, count=1, siblings=1',
      current: 1,
      count: 1,
      siblings: 1,
      expected: [1],
    },
    {
      name: 'current=1, count=5, siblings=1',
      current: 1,
      count: 5,
      siblings: 1,
      expected: [1, 2, 3, 4, 5],
    },
    {
      name: 'current=1, count=7, siblings=1 (= totalSlots exactly)',
      current: 1,
      count: 7,
      siblings: 1,
      expected: [1, 2, 3, 4, 5, 6, 7],
    },
    {
      name: 'current=1, count=10, siblings=1 (only end ellipsis)',
      current: 1,
      count: 10,
      siblings: 1,
      expected: [1, 2, 3, 4, 5, 'ellipsis-end', 10],
    },
    {
      name: 'current=2, count=10, siblings=1 (only end ellipsis)',
      current: 2,
      count: 10,
      siblings: 1,
      expected: [1, 2, 3, 4, 5, 'ellipsis-end', 10],
    },
    {
      name: 'current=5, count=10, siblings=1 (both ellipses)',
      current: 5,
      count: 10,
      siblings: 1,
      expected: [1, 'ellipsis-start', 4, 5, 6, 'ellipsis-end', 10],
    },
    {
      name: 'current=9, count=10, siblings=1 (only start ellipsis)',
      current: 9,
      count: 10,
      siblings: 1,
      expected: [1, 'ellipsis-start', 6, 7, 8, 9, 10],
    },
    {
      name: 'current=10, count=10, siblings=1 (only start ellipsis)',
      current: 10,
      count: 10,
      siblings: 1,
      expected: [1, 'ellipsis-start', 6, 7, 8, 9, 10],
    },
    {
      name: 'siblings=0, current=5, count=10 (tight totalSlots=5)',
      current: 5,
      count: 10,
      siblings: 0,
      expected: [1, 'ellipsis-start', 5, 'ellipsis-end', 10],
    },
    {
      name: 'siblings=0, current=1, count=5 (fits)',
      current: 1,
      count: 5,
      siblings: 0,
      expected: [1, 2, 3, 4, 5],
    },
    {
      name: 'siblings=2, current=5, count=10 (gap-of-1 on left collapses to "2")',
      current: 5,
      count: 10,
      siblings: 2,
      expected: [1, 2, 3, 4, 5, 6, 7, 'ellipsis-end', 10],
    },
    {
      name: 'siblings=2, current=6, count=12 (both ellipses, totalSlots=9)',
      current: 6,
      count: 12,
      siblings: 2,
      expected: [1, 'ellipsis-start', 4, 5, 6, 7, 8, 'ellipsis-end', 12],
    },
    {
      name: 'siblings=2, current=5, count=9 (fits at totalSlots=9)',
      current: 5,
      count: 9,
      siblings: 2,
      expected: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    },
  ];

  it.each(cases)('$name', ({ current, count, siblings, expected }) => {
    expect(paginationRange(current, count, siblings)).toEqual(expected);
  });

  it('returns a constant slot count once ellipsis is needed (siblingCount=1, count=20)', () => {
    // Whichever page is current in a long list, the slot count should be
    // totalSlots = siblings*2 + 5 = 7. This is what keeps the pagination
    // row from jumping width as the user clicks between pages.
    for (let current = 1; current <= 20; current++) {
      expect(paginationRange(current, 20, 1)).toHaveLength(7);
    }
  });
});
