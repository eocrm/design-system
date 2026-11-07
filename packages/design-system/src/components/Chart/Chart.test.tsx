import { createRef } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chart, type ChartProps } from './Chart';

// LiveRegion writes after ANNOUNCE_DELAY_MS (50ms); wait past it or "empty" assertions pass vacuously.
const PAST_ANNOUNCE_DELAY_MS = 120;

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

  it('renders a footnote after the plot that describes it', () => {
    stubLayout();
    render(<Chart {...base} footnote="3 deals in other currencies not included" />);
    const note = screen.getByText('3 deals in other currencies not included');
    const plot = screen.getByRole('group', { name: 'Deals won per week' });
    expect(plot.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(plot).toHaveAccessibleDescription(
      'Use arrow keys to inspect values. All values are also in the data table. 3 deals in other currencies not included',
    );
    expect(screen.getByRole('figure')).toHaveAttribute('data-footnote');
  });

  it('keeps the footnote in the empty state', () => {
    render(
      <Chart
        {...base}
        series={[{ key: 'a', label: 'A', values: [0, null, 0] }]}
        footnote="3 deals in other currencies not included"
      />,
    );
    expect(screen.getByText('3 deals in other currencies not included')).toBeInTheDocument();
    expect(screen.getByRole('figure')).toHaveAttribute('data-footnote');
  });

  it('renders no footnote element or attribute without the prop', () => {
    stubLayout();
    render(<Chart {...base} />);
    expect(screen.getByRole('figure')).not.toHaveAttribute('data-footnote');
    expect(screen.getByRole('group', { name: 'Deals won per week' })).toHaveAttribute(
      'aria-describedby',
      expect.not.stringContaining(' '),
    );
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

describe('curve', () => {
  it('linear draws one straight segment per category pair', () => {
    stubLayout();
    const { container } = render(
      <Chart {...base} series={[{ key: 'won', label: 'Won', values: [3, 5, 8] }]} curve="linear" />,
    );
    const d = container.querySelector('path[class*="line"]')!.getAttribute('d')!;
    const pts = d
      .slice(1)
      .split('L')
      .map((p) => p.split(',').map(Number));
    const slopes = new Set(
      pts.slice(1).map((p, i) => ((p[1] - pts[i][1]) / (p[0] - pts[i][0])).toFixed(1)),
    );
    expect(slopes.size).toBeLessThanOrEqual(2);
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

  it('compact mode keeps a hidden series that would not fit as a re-show toggle', async () => {
    const layout = stubLayout(160, 100);
    const names = ['Alpha team', 'Bravo team', 'Charlie team', 'Delta team', 'Echo team'];
    const many: ChartProps = {
      ...base,
      series: names.map((label, i) => ({ key: `s${i}`, label, values: [1, 2, 3] })),
    };
    const onChange = vi.fn();
    render(<Chart {...many} hiddenSeries={['s4']} onHiddenSeriesChange={onChange} />);
    layout.fire();
    const echo = screen.getByRole('button', { name: 'Echo team' });
    expect(echo).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(echo);
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('compact mode fits the row over the shown items, hidden ones included', () => {
    const layout = stubLayout(240, 100);
    const names = ['Alpha team', 'Bravo team', 'Charlie team', 'Delta team', 'Echo team'];
    const many: ChartProps = {
      ...base,
      series: names.map((label, i) => ({ key: `s${i}`, label, values: [1, 2, 3] })),
    };
    render(<Chart {...many} hiddenSeries={['s4']} />);
    layout.fire();
    const withHidden = screen.getAllByRole('button').map((b) => b.textContent);
    expect(withHidden).toContain('Echo team');
    expect(withHidden.length).toBeLessThan(5);
    expect(screen.getByText(`+${5 - withHidden.length}`)).toBeInTheDocument();
  });

  it('compact mode fits the forced hidden item itself: a long hidden label pushes visible ones into +N', () => {
    // 240px row: "Echo team regional pipeline" alone (189 + 28) plus the +N reserve already overflows,
    // so no visible item may join it. Fitting only the first visible labels would also render Alpha + Bravo.
    const layout = stubLayout(240, 100);
    const names = [
      'Alpha team',
      'Bravo team',
      'Charlie team',
      'Delta team',
      'Echo team regional pipeline',
    ];
    const many: ChartProps = {
      ...base,
      series: names.map((label, i) => ({ key: `s${i}`, label, values: [1, 2, 3] })),
    };
    render(<Chart {...many} hiddenSeries={['s4']} />);
    layout.fire();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Echo team regional pipeline',
    ]);
    expect(screen.getByText('+4')).toBeInTheDocument();
  });

  it('compact mode does not force a comparison whose parent is hidden', () => {
    // The comparison button is disabled while its parent is hidden, so it is not a re-show
    // control and must compete for space like any visible item.
    const layout = stubLayout(160, 100);
    const many: ChartProps = {
      ...base,
      series: [
        { key: 's0', label: 'Alpha team', values: [1, 2, 3] },
        { key: 's0p', label: 'Previous period', values: [1, 1, 1], comparisonOf: 's0' },
        { key: 's1', label: 'Bravo team', values: [2, 2, 2] },
        { key: 's2', label: 'Charlie team', values: [3, 3, 3] },
      ],
    };
    render(<Chart {...many} hiddenSeries={['s0']} />);
    layout.fire();
    expect(screen.getByRole('button', { name: 'Alpha team' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Previous period/ })).toBeNull();
  });

  it('ignores a controlled hiddenSeries that would hide every primary', () => {
    stubLayout().fire();
    const { container } = render(<Chart {...three} hiddenSeries={['a', 'b', 'c']} />);
    expect(container.querySelectorAll('svg [data-series]').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole('button', { name: 'Bob' })).toHaveAttribute('aria-pressed', 'true');
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
    expect(plot).toHaveAccessibleDescription(
      'Use arrow keys to inspect values. All values are also in the data table.',
    );
  });

  it('arrow keys walk categories, announce values, Home/End jump, Escape clears', async () => {
    const layout = stubLayout();
    render(<Chart {...base} />);
    layout.fire();
    const plot = screen.getByRole('group', { name: 'Deals won per week' });
    plot.focus();
    await userEvent.keyboard('{ArrowRight}');
    const live = document.querySelector('[aria-live="polite"]')!;
    await waitFor(() =>
      expect(live).toHaveTextContent('W1: Deals won 3 deals, Previous period (Deals won) 2 deals'),
    );
    expect(document.querySelector('[data-chart-tooltip]')).toHaveTextContent('W1');
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() =>
      expect(live).toHaveTextContent('W2: Deals won No data, Previous period (Deals won) 4 deals'),
    );
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(live).toHaveTextContent(/^W3:/));
    await userEvent.keyboard('{Home}');
    await waitFor(() => expect(live).toHaveTextContent(/^W1:/));
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
    await waitFor(() => expect(live).toHaveTextContent('Previous period (Alice) 1'));
    await waitFor(() => expect(live).toHaveTextContent('Previous period (Bob) 2'));
  });

  it('ArrowLeft from nothing starts at the last category', async () => {
    const layout = stubLayout();
    render(<Chart {...base} />);
    layout.fire();
    screen.getByRole('group', { name: 'Deals won per week' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(() =>
      expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent(/^W3:/),
    );
  });

  it('pointer movement shows the tooltip without announcing', async () => {
    const layout = stubLayout();
    render(<Chart {...base} />);
    layout.fire();
    const plot = screen.getByRole('group', { name: 'Deals won per week' });
    await userEvent.pointer({ target: plot, coords: { clientX: 399, clientY: 50 } });
    expect(document.querySelector('[data-chart-tooltip]')).toHaveTextContent('W3');
    // LiveRegion writes after a delay: wait past it, or this passes vacuously.
    await act(async () => {
      await new Promise((r) => setTimeout(r, PAST_ANNOUNCE_DELAY_MS));
    });
    expect(document.querySelector('[aria-live="polite"]')).toBeEmptyDOMElement();
    await userEvent.unhover(plot);
    expect(document.querySelector('[data-chart-tooltip]')).toBeNull();
  });

  it('mounted charts announce nothing on load', async () => {
    const layout = stubLayout();
    render(
      <>
        <Chart {...base} />
        <Chart {...base} label="Second" />
      </>,
    );
    layout.fire();
    await act(async () => {
      await new Promise((r) => setTimeout(r, PAST_ANNOUNCE_DELAY_MS));
    });
    const lives = document.querySelectorAll('[aria-live="polite"]');
    expect(lives).toHaveLength(2);
    for (const live of lives) expect(live).toBeEmptyDOMElement();
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

  it('a tapped tooltip closes on a press outside the plot, without relying on focus', () => {
    const layout = stubLayout();
    render(
      <>
        <Chart {...base} />
        <button type="button">elsewhere</button>
      </>,
    );
    layout.fire();
    const plot = screen.getByRole('group', { name: 'Deals won per week' });
    // fireEvent does not move focus, like mobile Safari tapping a tabIndex div.
    fireEvent.pointerDown(plot, { clientX: 399, pointerType: 'touch' });
    fireEvent.pointerLeave(plot, { pointerType: 'touch' });
    expect(plot).not.toHaveFocus();
    fireEvent.pointerDown(plot, { clientX: 10, pointerType: 'touch' });
    expect(document.querySelector('[data-chart-tooltip]')).not.toBeNull();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'elsewhere' }), {
      pointerType: 'touch',
    });
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

describe('markers', () => {
  const markers: ChartProps['markers'] = [
    { key: 'launch', label: 'Launch', at: 'W2' },
    { key: 'promo', label: 'Promo', from: 'W2', to: 'W3' },
    { key: 'weekend', from: 'W1', to: 'W1', tone: 'subtle' },
  ];

  it('draws a band per range and a line per point, with labels', () => {
    const layout = stubLayout();
    const { container } = render(<Chart {...base} markers={markers} />);
    layout.fire();
    const bands = container.querySelectorAll('rect[class*="markerBand"]');
    expect([...bands].map((b) => b.getAttribute('data-tone'))).toEqual(['neutral', 'subtle']);
    expect(container.querySelectorAll('line[class*="markerLine"]')).toHaveLength(1);
    const labels = [...container.querySelectorAll('[class*="markerLabels"] text')];
    expect(labels.map((l) => l.textContent)).toContain('Launch');
  });

  it('lists labelled markers in the data table; decorative ones add nothing', () => {
    stubLayout();
    const { rerender } = render(<Chart {...base} markers={markers} />);
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Markers' })).toBeInTheDocument();
    const rows = within(table).getAllByRole('row');
    expect(rows[1].lastElementChild).toHaveTextContent(/^$/);
    expect(rows[2].lastElementChild).toHaveTextContent('Launch, Promo');
    expect(rows[3].lastElementChild).toHaveTextContent('Promo');
    rerender(<Chart {...base} markers={[{ key: 'weekend', from: 'W1', to: 'W1' }]} />);
    expect(within(table).queryByRole('columnheader', { name: 'Markers' })).toBeNull();
  });

  it('names the markers of the inspected category in the tooltip and announcement', async () => {
    const layout = stubLayout();
    render(<Chart {...base} markers={markers} />);
    layout.fire();
    screen.getByRole('group', { name: 'Deals won per week' }).focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    const live = document.querySelector('[aria-live="polite"]')!;
    await waitFor(() => expect(live).toHaveTextContent(/^W2: .*\. Launch, Promo$/));
    expect(document.querySelector('[data-chart-tooltip]')).toHaveTextContent('Launch');
  });

  it('ignores markers naming an unknown category, with a dev warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const layout = stubLayout();
    const { container } = render(
      <Chart {...base} markers={[{ key: 'x', label: 'X', at: 'W9' }]} />,
    );
    layout.fire();
    expect(container.querySelector('line[class*="markerLine"]')).toBeNull();
    expect(warn.mock.calls.flat().join(' ')).toMatch(/Ignored markers \(x\)/);
  });
});

it('inspection markers paint after every series, so a later stacked area cannot cover them', async () => {
  const layout = stubLayout();
  const { container } = render(
    <Chart
      {...base}
      type="area"
      series={[
        { key: 'a', label: 'A', values: [1, 2, 3] },
        { key: 'b', label: 'B', values: [3, 2, 1] },
      ]}
    />,
  );
  layout.fire();
  screen.getByRole('group', { name: 'Deals won per week' }).focus();
  await userEvent.keyboard('{ArrowRight}');
  const svg = container.querySelector('svg')!;
  const lastArea = [...svg.querySelectorAll('path[class*="area"]')].at(-1)!;
  const markers = [...svg.querySelectorAll('path[class*="marker"]')];
  expect(markers).toHaveLength(2);
  for (const m of markers) {
    expect(lastArea.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
});

describe('details', () => {
  const details: ChartProps['details'] = (i) => (i === 0 ? ['235 kcal', '5 times'] : []);

  it('shows detail rows in the tooltip and the announcement', async () => {
    const layout = stubLayout();
    render(<Chart {...base} details={details} />);
    layout.fire();
    screen.getByRole('group', { name: 'Deals won per week' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    const tip = document.querySelector('[data-chart-tooltip]')!;
    expect(tip).toHaveTextContent('235 kcal');
    expect(tip).toHaveTextContent('5 times');
    const live = document.querySelector('[aria-live="polite"]')!;
    await waitFor(() => expect(live).toHaveTextContent(/235 kcal, 5 times$/));
  });

  it('adds a Details column to the data table only when details is given', () => {
    stubLayout();
    const { rerender } = render(<Chart {...base} details={details} />);
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Details' })).toBeInTheDocument();
    const rows = within(table).getAllByRole('row');
    expect(rows[1].lastElementChild).toHaveTextContent('235 kcal; 5 times');
    expect(rows[2].lastElementChild).toHaveTextContent(/^$/);
    rerender(<Chart {...base} />);
    expect(within(table).queryByRole('columnheader', { name: 'Details' })).toBeNull();
  });

  it('keeps detail rows when every non-primary series is hidden', async () => {
    const layout = stubLayout();
    render(<Chart {...base} details={details} hiddenSeries={['prev']} />);
    layout.fire();
    screen.getByRole('group', { name: 'Deals won per week' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.querySelector('[data-chart-tooltip]')).toHaveTextContent('235 kcal');
  });
});

describe('valueLabels', () => {
  it('renders aria-hidden labels matching the tooltip value', async () => {
    const layout = stubLayout();
    render(
      <Chart
        {...base}
        type="bar"
        series={[{ key: 'won', label: 'Deals won', values: [3, 5, 8] }]}
        valueLabels
      />,
    );
    layout.fire();
    const labels = document.querySelectorAll('[data-value-label]');
    expect(Array.from(labels, (l) => l.textContent)).toEqual(['3 deals', '5 deals', '8 deals']);
    labels.forEach((l) => expect(l).toHaveAttribute('aria-hidden', 'true'));
    screen.getByRole('group', { name: 'Deals won per week' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.querySelector('[data-chart-tooltip]')).toHaveTextContent('3 deals');
  });

  it('renders none by default', () => {
    const layout = stubLayout();
    render(<Chart {...base} type="bar" />);
    layout.fire();
    expect(document.querySelector('[data-value-label]')).toBeNull();
  });
});

describe('range selection and zoom', () => {
  const cats = ['c0', 'c1', 'c2', 'c3', 'c4'];
  const sel: ChartProps = {
    ...base,
    type: 'bar',
    categories: cats,
    series: [{ key: 'won', label: 'Deals won', values: [1, 2, 3, 4, 5] }],
  };
  const plotOf = () => screen.getByRole('group', { name: 'Deals won per week' });
  // The x-axis label sits at the category's centre.
  const xOf = (container: HTMLElement, category: string) =>
    Number(
      [...container.querySelectorAll('svg text')]
        .find((t) => t.textContent === category)!
        .getAttribute('x'),
    );
  const live = () => document.querySelector('[aria-live="polite"]')!;
  const band = (container: HTMLElement) => container.querySelector('[data-selection]');

  function drag(container: HTMLElement, from: string, to: string) {
    const plot = plotOf();
    const opts = { pointerId: 1, pointerType: 'mouse', button: 0 };
    fireEvent.pointerDown(plot, { ...opts, clientX: xOf(container, from) });
    fireEvent.pointerMove(plot, { ...opts, clientX: xOf(container, to) });
    fireEvent.pointerUp(plot, { ...opts, clientX: xOf(container, to) });
  }
  function click(container: HTMLElement, at: string) {
    const plot = plotOf();
    const opts = { pointerId: 1, pointerType: 'mouse', button: 0, clientX: xOf(container, at) };
    fireEvent.pointerDown(plot, opts);
    fireEvent.pointerUp(plot, opts);
  }

  it('a mouse drag past the slop selects and draws a band', () => {
    const layout = stubLayout();
    const onChange = vi.fn();
    const { container } = render(<Chart {...sel} onSelectedRangeChange={onChange} />);
    layout.fire();
    drag(container, 'c1', 'c3');
    expect(onChange).toHaveBeenLastCalledWith({ from: 'c1', to: 'c3' });
    expect(band(container)).not.toBeNull();
  });

  it('a click without movement inspects and does not select', () => {
    const layout = stubLayout();
    const onChange = vi.fn();
    const { container } = render(<Chart {...sel} onSelectedRangeChange={onChange} />);
    layout.fire();
    click(container, 'c2');
    expect(onChange).not.toHaveBeenCalled();
    expect(document.querySelector('[data-chart-tooltip]')).toHaveTextContent('c2');
  });

  it('a click outside the band clears the selection; inside it does not', () => {
    const layout = stubLayout();
    const onChange = vi.fn();
    const { container } = render(
      <Chart {...sel} selectedRange={{ from: 'c1', to: 'c3' }} onSelectedRangeChange={onChange} />,
    );
    layout.fire();
    click(container, 'c2');
    expect(onChange).not.toHaveBeenCalled();
    click(container, 'c4');
    expect(onChange).toHaveBeenCalledWith(null);
  });

  describe('touch long-press', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());
    const touch = { pointerId: 2, pointerType: 'touch' };
    const hold = () => act(() => vi.advanceTimersByTime(300));

    it('long-press then move then release selects the range', () => {
      const layout = stubLayout();
      const onChange = vi.fn();
      const { container } = render(<Chart {...sel} onSelectedRangeChange={onChange} />);
      layout.fire();
      fireEvent.pointerDown(plotOf(), { ...touch, clientX: xOf(container, 'c1') });
      hold();
      fireEvent.pointerMove(plotOf(), { ...touch, clientX: xOf(container, 'c3') });
      expect(band(container)).not.toBeNull();
      fireEvent.pointerUp(plotOf(), { ...touch, clientX: xOf(container, 'c3') });
      expect(onChange).toHaveBeenLastCalledWith({ from: 'c1', to: 'c3' });
    });

    it('long-press released without moving selects one category', () => {
      const layout = stubLayout();
      const onChange = vi.fn();
      const { container } = render(<Chart {...sel} onSelectedRangeChange={onChange} />);
      layout.fire();
      const at = { ...touch, clientX: xOf(container, 'c1') };
      fireEvent.pointerDown(plotOf(), at);
      hold();
      fireEvent.pointerUp(plotOf(), at);
      expect(onChange).toHaveBeenLastCalledWith({ from: 'c1', to: 'c1' });
    });

    it('moving past the slop before the timer is a scroll: no selection, ever', () => {
      const layout = stubLayout();
      const onChange = vi.fn();
      const { container } = render(<Chart {...sel} onSelectedRangeChange={onChange} />);
      layout.fire();
      const x = xOf(container, 'c1');
      fireEvent.pointerDown(plotOf(), { ...touch, clientX: x, clientY: 50 });
      act(() => vi.advanceTimersByTime(100));
      fireEvent.pointerMove(plotOf(), { ...touch, clientX: x, clientY: 70 });
      act(() => vi.advanceTimersByTime(1000));
      expect(band(container)).toBeNull();
      fireEvent.pointerUp(plotOf(), { ...touch, clientX: x, clientY: 70 });
      expect(onChange).not.toHaveBeenCalled();
    });

    it('a quick tap shows the tooltip and does not select', () => {
      const layout = stubLayout();
      const onChange = vi.fn();
      const { container } = render(<Chart {...sel} onSelectedRangeChange={onChange} />);
      layout.fire();
      const at = { ...touch, clientX: xOf(container, 'c2') };
      fireEvent.pointerDown(plotOf(), at);
      fireEvent.pointerUp(plotOf(), at);
      act(() => vi.advanceTimersByTime(1000));
      expect(onChange).not.toHaveBeenCalled();
      expect(band(container)).toBeNull();
      expect(document.querySelector('[data-chart-tooltip]')).toHaveTextContent('c2');
    });

    it('a quick tap outside the band clears the selection; inside it does not', () => {
      const layout = stubLayout();
      const onChange = vi.fn();
      const { container } = render(
        <Chart
          {...sel}
          selectedRange={{ from: 'c1', to: 'c2' }}
          onSelectedRangeChange={onChange}
        />,
      );
      layout.fire();
      const tap = (c: string) => {
        const at = { ...touch, clientX: xOf(container, c) };
        fireEvent.pointerDown(plotOf(), at);
        fireEvent.pointerUp(plotOf(), at);
      };
      tap('c1');
      expect(onChange).not.toHaveBeenCalled();
      tap('c4');
      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('cancels the lifted page scroll for its touchmoves only', () => {
      const layout = stubLayout();
      const { container } = render(<Chart {...sel} onSelectedRangeChange={() => {}} />);
      layout.fire();
      const touchmove = () => {
        const e = new Event('touchmove', { bubbles: true, cancelable: true });
        plotOf().dispatchEvent(e);
        return e.defaultPrevented;
      };
      fireEvent.pointerDown(plotOf(), { ...touch, clientX: xOf(container, 'c1') });
      expect(touchmove()).toBe(false);
      hold();
      expect(touchmove()).toBe(true);
      fireEvent.pointerUp(plotOf(), { ...touch, clientX: xOf(container, 'c1') });
      expect(touchmove()).toBe(false);
    });
  });

  it('Shift+arrows extend from the anchor; Escape clears selection, then inspection', async () => {
    const layout = stubLayout();
    const onChange = vi.fn();
    render(<Chart {...sel} defaultSelectedRange={null} onSelectedRangeChange={onChange} />);
    layout.fire();
    plotOf().focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    await userEvent.keyboard('{Shift>}{ArrowRight}{ArrowRight}{/Shift}');
    expect(onChange).toHaveBeenLastCalledWith({ from: 'c1', to: 'c3' });
    await waitFor(() => expect(live()).toHaveTextContent('Selected c1 to c3'));
    await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}');
    expect(onChange).toHaveBeenLastCalledWith({ from: 'c1', to: 'c2' });
    await userEvent.keyboard('{Escape}');
    expect(onChange).toHaveBeenLastCalledWith(null);
    await waitFor(() => expect(live()).toHaveTextContent('Selection cleared'));
    expect(document.querySelector('[data-chart-tooltip]')).not.toBeNull();
    await userEvent.keyboard('{Escape}');
    expect(document.querySelector('[data-chart-tooltip]')).toBeNull();
  });

  it('announces a single-category selection', async () => {
    const layout = stubLayout();
    render(<Chart {...sel} onSelectedRangeChange={() => {}} />);
    layout.fire();
    plotOf().focus();
    await userEvent.keyboard('{ArrowRight}{Shift>}{ArrowRight}{ArrowLeft}{/Shift}');
    await waitFor(() => expect(live()).toHaveTextContent('Selected c0'));
  });

  it('zooms to the selection and resets', async () => {
    const layout = stubLayout();
    const onZoom = vi.fn();
    const { container } = render(
      <Chart {...sel} defaultSelectedRange={null} onZoomRangeChange={onZoom} />,
    );
    layout.fire();
    expect(screen.queryByRole('button', { name: 'Zoom to selection' })).toBeNull();
    drag(container, 'c1', 'c3');
    await userEvent.click(screen.getByRole('button', { name: 'Zoom to selection' }));
    expect(onZoom).toHaveBeenLastCalledWith({ from: 'c1', to: 'c3' });
    const table = screen.getByRole('table');
    expect(within(table).queryByRole('rowheader', { name: 'c0' })).toBeNull();
    expect(within(table).getByRole('rowheader', { name: 'c1' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'c3' })).toBeInTheDocument();
    expect(within(table).queryByRole('rowheader', { name: 'c4' })).toBeNull();
    expect(band(container)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Zoom to selection' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Reset zoom' }));
    expect(onZoom).toHaveBeenLastCalledWith(null);
    expect(within(table).getByRole('rowheader', { name: 'c0' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset zoom' })).toBeNull();
  });

  it('ignores a controlled zoomRange naming an unknown category, warning once', () => {
    const layout = stubLayout();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = render(<Chart {...sel} zoomRange={{ from: 'c1', to: 'nope' }} />);
    layout.fire();
    rerender(<Chart {...sel} zoomRange={{ from: 'c1', to: 'nope' }} />);
    expect(within(screen.getByRole('table')).getByRole('rowheader', { name: 'c0' })).toBeTruthy();
    expect(warn.mock.calls.filter(([m]) => String(m).includes('zoomRange'))).toHaveLength(1);
  });

  it('passes original category indices to details while zoomed', async () => {
    const layout = stubLayout();
    const details = vi.fn((i: number) => [`detail ${i}`]);
    render(<Chart {...sel} details={details} zoomRange={{ from: 'c2', to: 'c4' }} />);
    layout.fire();
    expect(within(screen.getByRole('table')).getByText('detail 2')).toBeInTheDocument();
    plotOf().focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.querySelector('[data-chart-tooltip]')).toHaveTextContent('detail 2');
    expect(details.mock.calls.map(([i]) => i)).not.toContain(0);
  });

  it('keeps value labels while zoomed', () => {
    const layout = stubLayout();
    render(<Chart {...sel} valueLabels zoomRange={{ from: 'c2', to: 'c4' }} />);
    layout.fire();
    const labels = document.querySelectorAll('[data-value-label]');
    expect(Array.from(labels, (l) => l.textContent)).toEqual(['3 deals', '4 deals', '5 deals']);
  });

  it('a zoomed window with no data still draws and keeps Reset zoom', () => {
    const layout = stubLayout();
    const { container } = render(
      <Chart
        {...sel}
        series={[{ key: 'won', label: 'Deals won', values: [1, null, null, 4, 5] }]}
        zoomRange={{ from: 'c1', to: 'c2' }}
      />,
    );
    layout.fire();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Reset zoom' })).toBeInTheDocument();
  });

  it('Shift+arrow after zooming starts a fresh range inside the zoomed view', async () => {
    const layout = stubLayout();
    const onChange = vi.fn();
    render(<Chart {...sel} onSelectedRangeChange={onChange} />);
    layout.fire();
    plotOf().focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{Shift>}{ArrowRight}{ArrowRight}{/Shift}');
    await userEvent.click(screen.getByRole('button', { name: 'Zoom to selection' }));
    expect(plotOf()).toHaveFocus();
    await userEvent.keyboard('{Shift>}{ArrowRight}{/Shift}');
    expect(onChange).toHaveBeenLastCalledWith({ from: 'c1', to: 'c1' });
    await waitFor(() => expect(live()).toHaveTextContent('Selected c1'));
    expect(live()).not.toHaveTextContent('undefined');
  });

  it('Shift+arrow after a mouse selection extends from the inspected category, not the old anchor', async () => {
    const layout = stubLayout();
    const onChange = vi.fn();
    const { container } = render(<Chart {...sel} onSelectedRangeChange={onChange} />);
    layout.fire();
    plotOf().focus();
    await userEvent.keyboard('{ArrowRight}{Shift>}{ArrowRight}{/Shift}');
    expect(onChange).toHaveBeenLastCalledWith({ from: 'c0', to: 'c1' });
    drag(container, 'c3', 'c4');
    expect(onChange).toHaveBeenLastCalledWith({ from: 'c3', to: 'c4' });
    await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}');
    expect(onChange).toHaveBeenLastCalledWith({ from: 'c3', to: 'c4' });
  });

  it('Escape, plot clicks and zoom act on a selection outside the zoomed view', async () => {
    const layout = stubLayout();
    const onChange = vi.fn();
    const onZoom = vi.fn();
    const { container, rerender } = render(
      <Chart
        {...sel}
        zoomRange={{ from: 'c2', to: 'c4' }}
        onZoomRangeChange={onZoom}
        selectedRange={{ from: 'c0', to: 'c1' }}
        onSelectedRangeChange={onChange}
      />,
    );
    layout.fire();
    expect(band(container)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Zoom to selection' }));
    expect(onZoom).toHaveBeenLastCalledWith({ from: 'c0', to: 'c1' });
    onChange.mockClear();
    rerender(
      <Chart
        {...sel}
        zoomRange={{ from: 'c2', to: 'c4' }}
        selectedRange={{ from: 'c0', to: 'c1' }}
        onSelectedRangeChange={onChange}
      />,
    );
    plotOf().focus();
    await userEvent.keyboard('{Escape}');
    expect(onChange).toHaveBeenLastCalledWith(null);
    onChange.mockClear();
    click(container, 'c3');
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('compact: the legend fits into the width the zoom buttons leave', () => {
    // The stub gives every element the same width, so the zoom buttons claim the whole row.
    const layout = stubLayout(400, 100);
    const many: ChartProps = {
      ...sel,
      series: ['Alpha team', 'Bravo team', 'Charlie team', 'Delta team', 'Echo team'].map(
        (label, i) => ({ key: `s${i}`, label, values: [1, 2, 3, 4, 5] }),
      ),
    };
    const legendButtons = () =>
      screen.getAllByRole('button').filter((b) => b.hasAttribute('aria-pressed')).length;
    const { rerender } = render(<Chart {...many} />);
    layout.fire();
    const without = legendButtons();
    rerender(<Chart {...many} zoomRange={{ from: 'c1', to: 'c3' }} />);
    layout.fire();
    expect(screen.getByRole('button', { name: 'Reset zoom' })).toBeInTheDocument();
    expect(legendButtons()).toBeLessThan(without);
  });

  it('is off without selection props', async () => {
    const layout = stubLayout();
    const { container } = render(<Chart {...sel} />);
    layout.fire();
    drag(container, 'c1', 'c3');
    expect(band(container)).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(plotOf()).toHaveAccessibleDescription(
      'Use arrow keys to inspect values. All values are also in the data table.',
    );
  });

  it('adds the range hint when selection is enabled', () => {
    stubLayout();
    render(<Chart {...sel} onSelectedRangeChange={() => {}} />);
    expect(plotOf()).toHaveAccessibleDescription(
      'Use arrow keys to inspect values. All values are also in the data table. Shift+arrows select a range.',
    );
  });
});
