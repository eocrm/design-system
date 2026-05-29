import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { Masonry } from './Masonry';
import {
  balanceColumns,
  columnsForWidth,
  roundRobinColumns,
  distributionsEqual,
} from './masonryUtils';

describe('masonryUtils', () => {
  describe('balanceColumns', () => {
    it('round-robins equal-height items', () => {
      expect(balanceColumns([10, 10, 10, 10], 2)).toEqual([
        [0, 2],
        [1, 3],
      ]);
    });
    it('packs into the shortest column (a tall item gets its own column)', () => {
      expect(balanceColumns([100, 10, 10, 10], 2)).toEqual([[0], [1, 2, 3]]);
    });
    it('returns empty columns for no items', () => {
      expect(balanceColumns([], 3)).toEqual([[], [], []]);
    });
    it('leaves trailing columns empty when items < columns', () => {
      expect(balanceColumns([5], 3)).toEqual([[0], [], []]);
    });
    it('clamps columnCount to at least 1', () => {
      expect(balanceColumns([1, 2], 0)).toEqual([[0, 1]]);
    });
  });

  describe('columnsForWidth', () => {
    it('computes how many columns fit', () => {
      expect(columnsForWidth(1000, 240, 16)).toBe(3);
    });
    it('never returns fewer than 1', () => {
      expect(columnsForWidth(100, 240, 16)).toBe(1);
      expect(columnsForWidth(0, 240, 16)).toBe(1);
    });
  });

  describe('roundRobinColumns', () => {
    it('distributes by index across columns', () => {
      expect(roundRobinColumns(6, 3)).toEqual([
        [0, 3],
        [1, 4],
        [2, 5],
      ]);
    });
    it('clamps columnCount to at least 1', () => {
      expect(roundRobinColumns(2, 0)).toEqual([[0, 1]]);
    });
  });

  describe('distributionsEqual', () => {
    it('is true for identical distributions', () => {
      expect(distributionsEqual([[0, 1], [2]], [[0, 1], [2]])).toBe(true);
    });
    it('is false when an item moves columns', () => {
      expect(distributionsEqual([[0, 1], [2]], [[0], [1, 2]])).toBe(false);
    });
  });
});

describe('Masonry', () => {
  it('renders all children', () => {
    render(
      <Masonry columns={3}>
        <div>alpha</div>
        <div>bravo</div>
        <div>charlie</div>
        <div>delta</div>
      </Masonry>,
    );
    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('bravo')).toBeInTheDocument();
    expect(screen.getByText('charlie')).toBeInTheDocument();
    expect(screen.getByText('delta')).toBeInTheDocument();
  });

  it('renders one column container per column (fixed columns)', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Masonry ref={ref} columns={3}>
        <div>a</div>
        <div>b</div>
        <div>c</div>
      </Masonry>,
    );
    expect(ref.current).not.toBeNull();
    // The root's direct children are exactly the column containers.
    expect(ref.current!.children).toHaveLength(3);
  });

  it('applies the gap class (default md, overridable) to the root', () => {
    const ref = createRef<HTMLDivElement>();
    const { rerender } = render(
      <Masonry ref={ref} columns={2}>
        <div>a</div>
      </Masonry>,
    );
    expect(ref.current!.className).toMatch(/gapMd/);
    rerender(
      <Masonry ref={ref} columns={2} gap="lg">
        <div>a</div>
      </Masonry>,
    );
    expect(ref.current!.className).toMatch(/gapLg/);
  });

  it('forwards ref to the root and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Masonry ref={ref} columns={2} className="custom">
        <div>a</div>
      </Masonry>,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current!.className).toMatch(/custom/);
  });

  it('renders without throwing in responsive mode when ResizeObserver is unavailable (jsdom)', () => {
    expect(() =>
      render(
        <Masonry minColumnWidth="200px">
          <div>x</div>
          <div>y</div>
        </Masonry>,
      ),
    ).not.toThrow();
  });
});
