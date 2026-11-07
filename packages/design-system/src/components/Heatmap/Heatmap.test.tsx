import { createRef } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Heatmap, type HeatmapProps } from './Heatmap';

function stubLayout(width = 400, height = 240) {
  const callbacks: ResizeObserverCallback[] = [];
  class MockResizeObserver {
    constructor(cb: ResizeObserverCallback) {
      callbacks.push(cb);
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  } as DOMRect);
  return {
    fire() {
      act(() => {
        for (const cb of callbacks) cb([], {} as ResizeObserver);
      });
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const base: HeatmapProps = {
  label: 'Meals by hour',
  rows: ['Mon', 'Tue'],
  columns: ['06', '07', '08'],
  values: [
    [0, 12, 3],
    [null, 7, 1],
  ],
  formatValue: (n) => `${n} g`,
};

const live = () => document.querySelector('[aria-live="polite"]')!;
const cells = (c: HTMLElement) => c.querySelectorAll('[data-heatmap-cell]');
const cell = (c: HTMLElement, row: number, col: number) =>
  c.querySelector(`[data-heatmap-cell][data-row="${row}"][data-col="${col}"]`)!;
const tooltip = () => document.querySelector('[data-chart-tooltip]');

describe('Heatmap', () => {
  it('is a named figure with one cell per row × column, forwards ref and merges className', () => {
    const layout = stubLayout();
    const ref = createRef<HTMLElement>();
    const { container } = render(<Heatmap {...base} ref={ref} className="mine" />);
    layout.fire();
    const fig = screen.getByRole('figure', { name: 'Meals by hour' });
    expect(fig).toBe(ref.current);
    expect(fig.className).toMatch(/mine/);
    expect(fig.className).toMatch(/root/);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(cells(container)).toHaveLength(base.rows.length * base.columns.length);
    // Highest value takes the darkest step, lowest the palest.
    expect(cell(container, 0, 1)).toHaveAttribute('data-step', '5');
    expect(cell(container, 0, 0)).toHaveAttribute('data-step', '1');
  });

  it.each([
    ['390 wide, no definite height (24 columns)', 390, 0, 24],
    ['short and wide: the height limits', 1200, 100, 24],
    ['narrow and tall: the width limits', 300, 600, 3],
  ])('cells are always square: %s', (_, width, height, nCols) => {
    const layout = stubLayout(width, height);
    const columns = Array.from({ length: nCols }, (_, i) => String(i).padStart(2, '0'));
    const values = base.rows.map((_, r) => columns.map((_, c) => r + c));
    const { container } = render(<Heatmap {...base} columns={columns} values={values} />);
    layout.fire();
    const all = [...cells(container)];
    expect(all).toHaveLength(base.rows.length * nCols);
    for (const c of all) expect(c.getAttribute('width')).toBe(c.getAttribute('height'));
    const side = Number(all[0].getAttribute('width')) + 2;
    if (width === 1200 && height === 100) {
      // Height-limited: (100 − 20px label band) / 2 rows.
      expect(side).toBeCloseTo(40);
    }
  });

  it('reserves the minimum grid size on the plot so the grid overflows instead of clipping', () => {
    const layout = stubLayout(400, 80);
    render(<Heatmap {...base} footnote="Last 7 days" />);
    layout.fire();
    // 2 rows × 12px minimum + the label band.
    expect(screen.getByRole('group')).toHaveStyle({ minHeight: '44px' });
    expect(screen.getByRole('figure')).toHaveAttribute('data-footnote');
  });

  it('draws a null cell as empty, not as the lowest step', () => {
    const layout = stubLayout();
    const { container } = render(<Heatmap {...base} />);
    layout.fire();
    const empty = cell(container, 1, 0);
    expect(empty.getAttribute('class')).toMatch(/empty/);
    expect(empty).not.toHaveAttribute('data-step');
  });

  it('the grid is one tab stop described by the keyboard hint and the footnote', () => {
    stubLayout();
    render(<Heatmap {...base} footnote="Grams eaten" />);
    const grid = screen.getByRole('group', { name: 'Meals by hour' });
    expect(grid).toHaveAttribute('tabindex', '0');
    expect(grid).toHaveAccessibleDescription(
      'Use arrow keys to move between cells, Home and End within a row, Ctrl+Home and Ctrl+End to the corners. All values are also in the data table. Grams eaten',
    );
  });

  it('arrows move by cell, Home/End within the row, Ctrl+Home/End to the corners, Escape clears', async () => {
    const layout = stubLayout();
    render(<Heatmap {...base} />);
    layout.fire();
    screen.getByRole('group', { name: 'Meals by hour' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(live()).toHaveTextContent('Mon, 06: 0 g'));
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(live()).toHaveTextContent('Mon, 07: 12 g'));
    expect(tooltip()).toHaveTextContent('12 g');
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(live()).toHaveTextContent('Tue, 07: 7 g'));
    await userEvent.keyboard('{Home}');
    await waitFor(() => expect(live()).toHaveTextContent('Tue, 06: No data'));
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(live()).toHaveTextContent('Tue, 08: 1 g'));
    await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(live()).toHaveTextContent('Tue, 08: 1 g'));
    await userEvent.keyboard('{Control>}{Home}{/Control}');
    await waitFor(() => expect(live()).toHaveTextContent('Mon, 06: 0 g'));
    await userEvent.keyboard('{ArrowUp}{ArrowLeft}');
    await waitFor(() => expect(live()).toHaveTextContent('Mon, 06: 0 g'));
    await userEvent.keyboard('{Control>}{End}{/Control}');
    await waitFor(() => expect(live()).toHaveTextContent('Tue, 08: 1 g'));
    await userEvent.keyboard('{Escape}');
    expect(tooltip()).toBeNull();
    expect(live()).toHaveTextContent('');
  });

  it('a hovered cell shows its tooltip; a tapped one survives pointerleave and closes on a press outside', () => {
    const layout = stubLayout();
    const { container } = render(
      <>
        <Heatmap {...base} />
        <button type="button">elsewhere</button>
      </>,
    );
    layout.fire();
    const grid = screen.getByRole('group', { name: 'Meals by hour' });
    const target = cell(container, 0, 1);
    const cx = Number(target.getAttribute('x')) + 2;
    const cy = Number(target.getAttribute('y')) + 2;
    fireEvent.pointerMove(grid, { clientX: cx, clientY: cy, pointerType: 'mouse' });
    expect(tooltip()).toHaveTextContent('Mon, 07');
    expect(tooltip()).toHaveTextContent('12 g');
    fireEvent.pointerLeave(grid, { pointerType: 'mouse' });
    expect(tooltip()).toBeNull();

    fireEvent.pointerDown(grid, { clientX: cx, clientY: cy, pointerType: 'touch' });
    fireEvent.pointerLeave(grid, { pointerType: 'touch' });
    expect(tooltip()).not.toBeNull();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'elsewhere' }), {
      pointerType: 'touch',
    });
    expect(tooltip()).toBeNull();
  });

  it('data table has one row per row label with each column formatted', () => {
    stubLayout();
    render(<Heatmap {...base} />);
    const table = screen.getByRole('table', { name: 'Meals by hour' });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual(expect.arrayContaining(['06', '07', '08']));
    const mon = within(table).getByRole('row', { name: /^Mon/ });
    expect(
      within(mon)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['0 g', '12 g', '3 g']);
    const tue = within(table).getByRole('row', { name: /^Tue/ });
    expect(
      within(tue)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['No data', '7 g', '1 g']);
  });

  it('legend lists one entry per bucket, with "No data" only when a cell is null', () => {
    const layout = stubLayout();
    const { container, rerender } = render(<Heatmap {...base} />);
    layout.fire();
    const legend = () => container.querySelector('[data-heatmap-legend]')!;
    expect(legend()).toHaveTextContent('No data');
    expect(legend()).toHaveTextContent('0 g');
    rerender(
      <Heatmap
        {...base}
        values={[
          [0, 1, 2],
          [3, 2, 1],
        ]}
      />,
    );
    expect(legend()).not.toHaveTextContent('No data');
    expect(
      Array.from(legend().querySelectorAll('[data-heatmap-legend-item]')).map(
        (li) => li.textContent,
      ),
    ).toEqual(['0 g', '1 g', '2 g', '3 g']);
  });

  it('continuous data gets a stepped bar with each boundary printed once', () => {
    const layout = stubLayout();
    const { container } = render(
      <Heatmap
        {...base}
        values={[
          [0, 12.5, 40.2],
          [null, 77.1, 99.9],
        ]}
        formatValue={String}
      />,
    );
    layout.fire();
    const scale = container.querySelector('[data-heatmap-scale]')!;
    const bounds = Array.from(scale.querySelectorAll('[data-heatmap-boundary]')).map(
      (b) => b.textContent,
    );
    expect(bounds[0]).toBe('0');
    expect(bounds.at(-1)).toBe('99.9');
    expect(new Set(bounds).size).toBe(bounds.length);
    expect(scale.querySelectorAll('[aria-hidden="true"]')).toHaveLength(bounds.length - 1);
    expect(container.querySelector('[data-heatmap-legend]')).toHaveTextContent('No data');
  });

  it('ignores values outside rows × columns when bucketing', () => {
    const layout = stubLayout();
    const { container } = render(
      <Heatmap
        {...base}
        values={[
          [0, 1, 2, 1000],
          [3, 2, 1],
          [500, 500, 500],
        ]}
      />,
    );
    layout.fire();
    expect(
      Array.from(container.querySelectorAll('[data-heatmap-legend-item]')).map(
        (li) => li.textContent,
      ),
    ).toEqual(['0 g', '1 g', '2 g', '3 g']);
  });

  it('shows the empty state when no cell has a finite value', () => {
    stubLayout();
    const { container } = render(
      <Heatmap
        {...base}
        values={[
          [null, null, null],
          [null, null, null],
        ]}
        emptyMessage="Nothing yet"
        footnote="Last 7 days"
      />,
    );
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    expect(cells(container)).toHaveLength(0);
    expect(screen.queryByRole('group')).toBeNull();
  });
});
