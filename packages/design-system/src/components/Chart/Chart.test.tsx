import { createRef } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import { Chart, type ChartProps } from './Chart';

function stubLayout(width = 400, height = 240) {
  const callbacks: ResizeObserverCallback[] = [];
  const observed: Element[] = [];
  const disconnect = vi.fn();
  class MockResizeObserver {
    constructor(cb: ResizeObserverCallback) {
      callbacks.push(cb);
    }
    observe = (el: Element) => {
      observed.push(el);
    };
    unobserve = vi.fn();
    disconnect = disconnect;
  }
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
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
    rect,
    observed,
    disconnect,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const base: ChartProps = {
  type: 'line',
  label: 'Deals won per week',
  categories: ['W1', 'W2', 'W3'],
  series: [
    { key: 'won', label: 'Deals won', values: [3, null, 8] },
    { key: 'prev', label: 'Previous period', values: [2, 4, 6], comparisonOf: 'won' },
  ],
  formatValue: (n) => `${n} deals`,
};

describe('Chart', () => {
  it('is a named figure, forwards ref and merges className', () => {
    stubLayout();
    const ref = createRef<HTMLElement>();
    render(<Chart {...base} ref={ref} className="mine" data-testid="c" />);
    const fig = screen.getByRole('figure', { name: 'Deals won per week' });
    expect(fig).toBe(ref.current);
    expect(fig.className).toMatch(/mine/);
    expect(fig.className).toMatch(/root/);
  });

  it('renders no svg until measured', () => {
    const { container } = render(<Chart {...base} />);
    expect(container.querySelector('svg')).toBeNull();
    // the table is size-independent and present at once
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('draws one series group per visible series after measuring', () => {
    const layout = stubLayout();
    const { container } = render(<Chart {...base} />);
    layout.fire();
    const groups = container.querySelectorAll('svg [data-series]');
    expect([...groups].map((g) => g.getAttribute('data-series'))).toEqual(['won', 'prev']);
    expect(container.querySelector('[data-series="prev"]')).toHaveAttribute('data-comparison');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('data table mirrors values through formatValue, null as No data', () => {
    stubLayout();
    render(<Chart {...base} />);
    const table = screen.getByRole('table', { name: 'Deals won per week' });
    const rows = within(table).getAllByRole('row');
    expect(
      within(rows[0])
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Category', 'Deals won', 'Previous period (Deals won)']);
    expect(
      within(rows[1])
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['3 deals', '2 deals']);
    expect(within(rows[2]).getAllByRole('cell')[0]).toHaveTextContent('No data');
  });

  it('shows EmptyState instead of the plot when everything is zero or null', () => {
    render(
      <Chart
        {...base}
        series={[{ key: 'a', label: 'A', values: [0, null, 0] }]}
        emptyMessage="Nothing here"
      />,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('falls back to the translated empty title', () => {
    render(<Chart {...base} categories={[]} series={[]} />);
    expect(screen.getByText('No data for this period')).toBeInTheDocument();
  });

  it('warns in dev about dropped comparisons and overflow', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Chart
        {...base}
        type="stacked-bar"
        series={[
          ...Array.from({ length: 9 }, (_, i) => ({
            key: `k${i}`,
            label: `K${i}`,
            values: [1, 1, 1],
          })),
          { key: 'p', label: 'P', values: [1, 1, 1], comparisonOf: 'k0' },
        ]}
      />,
    );
    expect(warn.mock.calls.flat().join(' ')).toMatch(/Ignored comparison series \(p\)/);
    expect(warn.mock.calls.flat().join(' ')).toMatch(/\[Chart\] 1 series beyond/);
  });

  it('keeps hidden series across a re-render with new series arrays', () => {
    const layout = stubLayout();
    const { container, rerender } = render(<Chart {...base} hiddenSeries={['prev']} />);
    layout.fire();
    rerender(
      <Chart {...base} series={base.series.map((x) => ({ ...x }))} hiddenSeries={['prev']} />,
    );
    expect(container.querySelector('[data-series="won"]')).not.toBeNull();
    expect(container.querySelector('[data-series="prev"]')).toBeNull();
  });

  it('measures a plot that mounts after an empty first render', () => {
    const layout = stubLayout();
    const zero = [{ key: 'a', label: 'A', values: [0, 0, 0] }];
    const { container, rerender } = render(<Chart {...base} series={zero} />);
    rerender(<Chart {...base} />);
    layout.fire();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('re-observes the new plot after data, empty, data', () => {
    const layout = stubLayout();
    const zero = [{ key: 'a', label: 'A', values: [0, 0, 0] }];
    const { container, rerender } = render(<Chart {...base} />);
    const first = container.querySelector('svg')!.parentElement;
    rerender(<Chart {...base} series={zero} />);
    expect(layout.disconnect).toHaveBeenCalled();
    rerender(<Chart {...base} />);
    const plot = container.querySelector('svg')!.parentElement;
    expect(plot).not.toBe(first);
    expect(layout.observed[layout.observed.length - 1]).toBe(plot);
  });

  it('spreads native attributes but keeps the figure role and name', () => {
    render(<Chart {...base} role="img" aria-label="hijack" aria-labelledby="nope" data-x="1" />);
    const fig = screen.getByRole('figure', { name: 'Deals won per week' });
    expect(fig).toHaveAttribute('data-x', '1');
  });
});
