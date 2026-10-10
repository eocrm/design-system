import { createRef } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    expect(layout.observed).toContain(plot);
  });

  it('spreads native attributes but keeps the figure role and name', () => {
    render(<Chart {...base} role="img" aria-label="hijack" aria-labelledby="nope" data-x="1" />);
    const fig = screen.getByRole('figure', { name: 'Deals won per week' });
    expect(fig).toHaveAttribute('data-x', '1');
  });
});

describe('legend', () => {
  const three: ChartProps = {
    ...base,
    series: [
      { key: 'a', label: 'Alice', values: [1, 2, 3] },
      { key: 'a-prev', label: 'Previous period', values: [1, 1, 1], comparisonOf: 'a' },
      { key: 'b', label: 'Bob', values: [2, 2, 2] },
    ],
  };

  it('is absent for a single series', () => {
    render(<Chart {...base} series={[base.series[0]]} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('lists every series as a pressed toggle; comparisons name their parent', () => {
    render(<Chart {...three} />);
    expect(screen.getByRole('button', { name: 'Alice' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Previous period, Alice' })).toBeInTheDocument();
  });

  it('click hides a series and its comparison, and reports the change', async () => {
    const layout = stubLayout();
    const onChange = vi.fn();
    const { container } = render(<Chart {...three} onHiddenSeriesChange={onChange} />);
    layout.fire();
    await userEvent.click(screen.getByRole('button', { name: 'Alice' }));
    expect(onChange).toHaveBeenCalledWith(['a']);
    expect(screen.getByRole('button', { name: 'Alice' })).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('[data-series="a"]')).toBeNull();
    expect(container.querySelector('[data-series="a-prev"]')).toBeNull();
    // the table drops hidden columns too
    expect(screen.queryByRole('columnheader', { name: 'Alice' })).toBeNull();
  });

  it('cannot hide the last visible primary series', async () => {
    const onChange = vi.fn();
    render(<Chart {...three} hiddenSeries={['b']} onHiddenSeriesChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Alice' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Alice' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Alice' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not re-emit stale hidden keys', async () => {
    const onChange = vi.fn();
    render(<Chart {...three} hiddenSeries={['gone']} onHiddenSeriesChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Bob' }));
    expect(onChange).toHaveBeenCalledWith(['b']);
  });

  it('hovering a hidden series dims nothing', async () => {
    const layout = stubLayout();
    const { container } = render(<Chart {...three} hiddenSeries={['b']} />);
    layout.fire();
    await userEvent.hover(screen.getByRole('button', { name: 'Bob' }));
    expect(container.querySelector('[data-dimmed]')).toBeNull();
  });

  it('touch pointerenter does not dim', () => {
    const layout = stubLayout();
    const { container } = render(<Chart {...three} />);
    layout.fire();
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Bob' }), { pointerType: 'touch' });
    expect(container.querySelector('[data-dimmed]')).toBeNull();
  });

  it('mouse-leave keeps the dimming of a still-focused legend button', async () => {
    const layout = stubLayout();
    const { container } = render(<Chart {...three} />);
    layout.fire();
    act(() => screen.getByRole('button', { name: 'Alice' }).focus());
    await userEvent.hover(screen.getByRole('button', { name: 'Bob' }));
    await userEvent.unhover(screen.getByRole('button', { name: 'Bob' }));
    expect(container.querySelector('[data-series="a"]')).not.toHaveAttribute('data-dimmed');
    expect(container.querySelector('[data-series="b"]')).toHaveAttribute('data-dimmed');
  });

  it('compact mode shows fewer legend items plus a +N overflow count', () => {
    const layout = stubLayout(160, 100);
    const many: ChartProps = {
      ...base,
      series: ['Alpha team', 'Bravo team', 'Charlie team', 'Delta team', 'Echo team'].map(
        (label, i) => ({ key: `s${i}`, label, values: [1, 2, 3] }),
      ),
    };
    render(<Chart {...many} />);
    layout.fire();
    const shown = screen.getAllByRole('button').length;
    expect(shown).toBeLessThan(5);
    expect(screen.getByText(`+${5 - shown}`)).toBeInTheDocument();
  });

  it('controlled hiddenSeries drives the pressed state', () => {
    render(<Chart {...three} hiddenSeries={['b']} />);
    expect(screen.getByRole('button', { name: 'Bob' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('ignores hidden keys that no longer exist', () => {
    stubLayout().fire();
    const { container } = render(<Chart {...three} hiddenSeries={['gone']} />);
    expect(container.querySelectorAll('svg [data-series]')).toHaveLength(3);
  });

  it('hovering or focusing an item dims the other series', async () => {
    const layout = stubLayout();
    const { container } = render(<Chart {...three} />);
    layout.fire();
    await userEvent.hover(screen.getByRole('button', { name: 'Bob' }));
    expect(container.querySelector('[data-series="a"]')).toHaveAttribute('data-dimmed');
    expect(container.querySelector('[data-series="b"]')).not.toHaveAttribute('data-dimmed');
    await userEvent.unhover(screen.getByRole('button', { name: 'Bob' }));
    expect(container.querySelector('[data-series="a"]')).not.toHaveAttribute('data-dimmed');
    act(() => screen.getByRole('button', { name: 'Alice' }).focus());
    expect(container.querySelector('[data-series="a-prev"]')).not.toHaveAttribute('data-dimmed');
    expect(container.querySelector('[data-series="b"]')).toHaveAttribute('data-dimmed');
  });
});

describe('inspect', () => {
  it('the plot is one named tab stop', () => {
    stubLayout();
    render(<Chart {...base} />);
    const plot = screen.getByRole('group', { name: 'Deals won per week' });
    expect(plot).toHaveAttribute('tabindex', '0');
    expect(plot).toHaveAccessibleDescription('Chart values. Use arrow keys to inspect.');
  });

  it('arrow keys walk categories, announce values, Home/End jump, Escape clears', async () => {
    const layout = stubLayout();
    render(<Chart {...base} />);
    layout.fire();
    const plot = screen.getByRole('group', { name: 'Deals won per week' });
    plot.focus();
    await userEvent.keyboard('{ArrowRight}');
    const live = document.querySelector('[aria-live="polite"]')!;
    expect(live).toHaveTextContent('W1: Deals won 3 deals, Previous period (Deals won) 2 deals');
    expect(document.querySelector('[data-chart-tooltip]')).toHaveTextContent('W1');
    await userEvent.keyboard('{ArrowRight}');
    expect(live).toHaveTextContent('W2: Deals won No data, Previous period (Deals won) 4 deals');
    await userEvent.keyboard('{End}');
    expect(live).toHaveTextContent(/^W3:/);
    await userEvent.keyboard('{Home}');
    expect(live).toHaveTextContent(/^W1:/);
    await userEvent.keyboard('{Escape}');
    expect(document.querySelector('[data-chart-tooltip]')).toBeNull();
  });

  it('live text names the parent of each comparison', async () => {
    const layout = stubLayout();
    render(
      <Chart
        {...base}
        series={[
          { key: 'a', label: 'Alice', values: [1, 2, 3] },
          { key: 'b', label: 'Bob', values: [4, 5, 6] },
          { key: 'a-prev', label: 'Previous period', values: [1, 1, 1], comparisonOf: 'a' },
          { key: 'b-prev', label: 'Previous period', values: [2, 2, 2], comparisonOf: 'b' },
        ]}
      />,
    );
    layout.fire();
    screen.getByRole('group', { name: 'Deals won per week' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    const live = document.querySelector('[aria-live="polite"]')!;
    expect(live).toHaveTextContent('Previous period (Alice) 1');
    expect(live).toHaveTextContent('Previous period (Bob) 2');
  });

  it('ArrowLeft from nothing starts at the last category', async () => {
    const layout = stubLayout();
    render(<Chart {...base} />);
    layout.fire();
    screen.getByRole('group', { name: 'Deals won per week' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(/^W3:/);
  });

  it('pointer movement shows the tooltip without announcing', async () => {
    const layout = stubLayout();
    render(<Chart {...base} />);
    layout.fire();
    const plot = screen.getByRole('group', { name: 'Deals won per week' });
    await userEvent.pointer({ target: plot, coords: { clientX: 399, clientY: 50 } });
    expect(document.querySelector('[data-chart-tooltip]')).toHaveTextContent('W3');
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent('');
    await userEvent.unhover(plot);
    expect(document.querySelector('[data-chart-tooltip]')).toBeNull();
  });

  it('the tooltip is hidden from assistive tech and lists only visible series', async () => {
    const layout = stubLayout();
    render(<Chart {...base} hiddenSeries={['prev']} />);
    layout.fire();
    screen.getByRole('group', { name: 'Deals won per week' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    const tip = document.querySelector('[data-chart-tooltip]')!;
    expect(tip).toHaveAttribute('aria-hidden', 'true');
    expect(tip).not.toHaveTextContent('Previous period');
  });

  it('Escape with nothing active is not swallowed', async () => {
    const layout = stubLayout();
    const onKeyDown = vi.fn();
    render(
      <div onKeyDown={onKeyDown}>
        <Chart {...base} />
      </div>,
    );
    layout.fire();
    screen.getByRole('group', { name: 'Deals won per week' }).focus();
    await userEvent.keyboard('{Escape}');
    expect(onKeyDown).toHaveBeenCalled();
    expect(onKeyDown.mock.calls[0][0].defaultPrevented).toBe(false);
  });

  it('a touch tap keeps the tooltip after pointerleave; a mouse leave clears it', () => {
    const layout = stubLayout();
    render(<Chart {...base} />);
    layout.fire();
    const plot = screen.getByRole('group', { name: 'Deals won per week' });
    fireEvent.pointerDown(plot, { clientX: 399, pointerType: 'touch' });
    fireEvent.pointerLeave(plot, { pointerType: 'touch' });
    expect(document.querySelector('[data-chart-tooltip]')).not.toBeNull();
    fireEvent.pointerLeave(plot, { pointerType: 'mouse' });
    expect(document.querySelector('[data-chart-tooltip]')).toBeNull();
  });

  it('bar charts get a band; line charts get a crosshair and one marker per defined value', async () => {
    const layout = stubLayout();
    const { container, rerender } = render(<Chart {...base} type="bar" />);
    layout.fire();
    screen.getByRole('group', { name: 'Deals won per week' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(container.querySelector('rect[class*="band"]')).not.toBeNull();
    expect(container.querySelector('line[class*="crosshair"]')).toBeNull();
    expect(container.querySelector('path[class*="marker"]')).toBeNull();
    rerender(<Chart {...base} type="line" />);
    expect(container.querySelector('rect[class*="band"]')).toBeNull();
    expect(container.querySelector('line[class*="crosshair"]')).not.toBeNull();
    expect(container.querySelectorAll('path[class*="marker"]')).toHaveLength(2);
    await userEvent.keyboard('{ArrowRight}');
    expect(container.querySelectorAll('path[class*="marker"]')).toHaveLength(1);
  });
});
