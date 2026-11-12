import { createRef } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chart, type ChartProps } from './Chart';
import { MARKER_ICON_GAP, MARKER_LABEL_BASELINE } from './chartModel';

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
    expect(within(table).getByRole('columnheader', { name: 'Notes' })).toBeInTheDocument();
    const rows = within(table).getAllByRole('row');
    expect(rows[1].lastElementChild).toHaveTextContent(/^$/);
    expect(rows[2].lastElementChild).toHaveTextContent('Launch, Promo');
    expect(rows[3].lastElementChild).toHaveTextContent('Promo');
    rerender(<Chart {...base} markers={[{ key: 'weekend', from: 'W1', to: 'W1' }]} />);
    expect(within(table).queryByRole('columnheader', { name: 'Notes' })).toBeNull();
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

describe('marker colour, icon and top labels (DS-47)', () => {
  const lineY = (c: HTMLElement) =>
    Number(c.querySelector('line[class*="markerLine"]')!.getAttribute('y1'));

  it('keeps the plot top unchanged without icons or top labels; a gutter row pushes it down', () => {
    const layout = stubLayout();
    const { container, rerender } = render(
      <Chart {...base} markers={[{ key: 'l', label: 'Launch', at: 'W2' }]} />,
    );
    layout.fire();
    expect(lineY(container)).toBe(8);
    rerender(<Chart {...base} markers={[{ key: 'l', label: 'Launch', at: 'W2', icon: '🐱' }]} />);
    expect(lineY(container)).toBe(24); // + MARKER_ICON_GAP
    rerender(
      <Chart
        {...base}
        markers={[{ key: 'l', label: 'Launch', at: 'W2', icon: '🐱', labelPlacement: 'top' }]}
      />,
    );
    expect(lineY(container)).toBe(36);
  });

  const texts = (c: HTMLElement) => [...c.querySelectorAll('[class*="markerLabels"] text')];
  const textY = (c: HTMLElement, t: string) =>
    Number(
      texts(c)
        .find((x) => x.textContent === t)!
        .getAttribute('y'),
    );

  it('keeps an icon clear of the plot top by MARKER_ICON_GAP, and above a stacked top label (DS-56)', () => {
    const layout = stubLayout();
    const { container, rerender } = render(
      <Chart {...base} markers={[{ key: 'l', at: 'W2', icon: '🐱' }]} />,
    );
    layout.fire();
    expect(lineY(container)).toBe(8 + MARKER_LABEL_BASELINE + MARKER_ICON_GAP);
    expect(textY(container, '🐱') + MARKER_ICON_GAP).toBeLessThanOrEqual(lineY(container));
    rerender(
      <Chart
        {...base}
        markers={[{ key: 'l', label: 'Launch', at: 'W2', icon: '🐱', labelPlacement: 'top' }]}
      />,
    );
    const label = textY(container, 'Launch');
    expect(textY(container, '🐱')).toBeLessThan(label - MARKER_LABEL_BASELINE - 1);
    expect(label).toBeLessThan(lineY(container));
  });

  it('adds no gap for a top label without icons (layout unchanged)', () => {
    const layout = stubLayout();
    const { container } = render(
      <Chart
        {...base}
        markers={[{ key: 'l', label: 'Launch', at: 'W2', labelPlacement: 'top' }]}
      />,
    );
    layout.fire();
    expect(lineY(container)).toBe(8 + MARKER_LABEL_BASELINE);
  });

  it('colours the marker label with its palette slot only when colour is set (DS-56)', () => {
    const layout = stubLayout();
    const { container } = render(
      <Chart
        {...base}
        markers={[
          { key: 'a', label: 'Tinted', at: 'W2', color: 2 },
          { key: 'b', label: 'Plain', at: 'W3' },
        ]}
      />,
    );
    layout.fire();
    const tinted = texts(container).find((x) => x.textContent === 'Tinted') as SVGElement;
    expect(tinted.getAttribute('class')).toMatch(/markerLabelColored/);
    expect(tinted.style.getPropertyValue('--chart-series-color')).toBe('var(--chart-series-2)');
    const plain = texts(container).find((x) => x.textContent === 'Plain') as SVGElement;
    expect(plain.getAttribute('class') ?? '').not.toMatch(/markerLabelColored/);
    expect(plain.style.getPropertyValue('--chart-series-color')).toBe('');
  });

  it('colours a marker with its palette slot', () => {
    const layout = stubLayout();
    const { container } = render(
      <Chart
        {...base}
        markers={[
          { key: 'l', at: 'W2', color: 2 },
          { key: 'b', from: 'W1', to: 'W1', color: 3 },
        ]}
      />,
    );
    layout.fire();
    const line = container.querySelector('line[class*="markerLine"]') as SVGElement;
    expect(line).toHaveAttribute('data-slot', '2');
    expect(line.style.getPropertyValue('--chart-series-color')).toBe('var(--chart-series-2)');
    expect(container.querySelector('rect[class*="markerBand"]')).toHaveAttribute('data-slot', '3');
  });

  it('draws the icon as decorative text, kept out of the table and tooltip', async () => {
    const layout = stubLayout();
    const { container } = render(
      <Chart {...base} markers={[{ key: 'f', label: 'Fed', at: 'W2', icon: '🐱' }]} />,
    );
    layout.fire();
    const icon = [...container.querySelectorAll('[class*="markerLabels"] text')].find(
      (t) => t.textContent === '🐱',
    );
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('table')).not.toHaveTextContent('🐱');
    screen.getByRole('group', { name: 'Deals won per week' }).focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    const tip = document.querySelector('[data-chart-tooltip]')!;
    await waitFor(() => expect(tip).toHaveTextContent('Fed'));
    expect(tip).not.toHaveTextContent('🐱');
  });

  it('compact charts draw no icons and reserve no gutter', () => {
    const layout = stubLayout(400, 100);
    const { container } = render(
      <Chart {...base} markers={[{ key: 'f', label: 'Fed', at: 'W2', icon: '🐱' }]} />,
    );
    layout.fire();
    expect(container).not.toHaveTextContent('🐱');
    expect(lineY(container)).toBe(8);
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

    it('unmounting mid-press does not fire the lift', () => {
      const layout = stubLayout();
      // jsdom has no setPointerCapture; a real browser throws on a detached element.
      const capture = vi.fn();
      Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
        value: capture,
        configurable: true,
      });
      onTestFinished(() => {
        delete (HTMLElement.prototype as Partial<HTMLElement>).setPointerCapture;
      });
      const { container, unmount } = render(<Chart {...sel} onSelectedRangeChange={() => {}} />);
      layout.fire();
      fireEvent.pointerDown(plotOf(), { ...touch, clientX: xOf(container, 'c1') });
      unmount();
      expect(() => hold()).not.toThrow();
      expect(capture).not.toHaveBeenCalled();
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

  it('describes the zoom and selection on the plot and names the zoom in the table caption', () => {
    const layout = stubLayout();
    render(
      <Chart
        {...sel}
        zoomRange={{ from: 'c1', to: 'c3' }}
        selectedRange={{ from: 'c3', to: 'c2' }}
        onSelectedRangeChange={() => {}}
      />,
    );
    layout.fire();
    expect(plotOf()).toHaveAccessibleDescription(
      'Zoomed to c1–c3. Selected c2 to c3. Use arrow keys to inspect values. All values are also in the data table. Shift+arrows select a range.',
    );
    expect(screen.getByRole('table', { name: 'Deals won per week. Zoomed to c1–c3' })).toBeTruthy();
  });

  it('draws the part of a selection inside the zoom window; a click there keeps it', () => {
    const layout = stubLayout();
    const onChange = vi.fn();
    const { container } = render(
      <Chart
        {...sel}
        zoomRange={{ from: 'c1', to: 'c3' }}
        selectedRange={{ from: 'c0', to: 'c2' }}
        onSelectedRangeChange={onChange}
      />,
    );
    layout.fire();
    expect(band(container)).not.toBeNull();
    click(container, 'c2');
    expect(onChange).not.toHaveBeenCalled();
    click(container, 'c3');
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('Escape during a drag cancels it without committing', () => {
    const layout = stubLayout();
    const onChange = vi.fn();
    const { container } = render(
      <Chart
        {...sel}
        defaultSelectedRange={{ from: 'c0', to: 'c0' }}
        onSelectedRangeChange={onChange}
      />,
    );
    layout.fire();
    const plot = plotOf();
    const opts = { pointerId: 1, pointerType: 'mouse', button: 0 };
    fireEvent.pointerDown(plot, { ...opts, clientX: xOf(container, 'c1') });
    fireEvent.pointerMove(plot, { ...opts, clientX: xOf(container, 'c3') });
    fireEvent.keyDown(plot, { key: 'Escape' });
    fireEvent.pointerUp(plot, { ...opts, clientX: xOf(container, 'c3') });
    expect(onChange).not.toHaveBeenCalled();
    expect(band(container)).not.toBeNull();
    expect(Number(band(container)!.getAttribute('width'))).toBeLessThan(
      xOf(container, 'c2') - xOf(container, 'c0'),
    );
  });

  it('a focused legend button keeps focus when the zoom buttons appear', () => {
    const layout = stubLayout();
    const two: ChartProps = {
      ...sel,
      series: [
        { key: 'a', label: 'Alpha', values: [1, 2, 3, 4, 5] },
        { key: 'b', label: 'Bravo', values: [1, 2, 3, 4, 5] },
      ],
      onSelectedRangeChange: () => {},
    };
    const { rerender } = render(<Chart {...two} selectedRange={null} />);
    layout.fire();
    const alpha = screen.getByRole('button', { name: 'Alpha' });
    act(() => alpha.focus());
    rerender(<Chart {...two} selectedRange={{ from: 'c1', to: 'c2' }} />);
    expect(screen.getByRole('button', { name: 'Zoom to selection' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Alpha' })).toBe(alpha);
    expect(alpha).toHaveFocus();
  });

  it('Reset zoom into an empty chart moves focus to the figure', async () => {
    const layout = stubLayout();
    render(
      <Chart
        {...sel}
        series={[{ key: 'won', label: 'Deals won', values: [null, null, null, null, null] }]}
        defaultZoomRange={{ from: 'c1', to: 'c2' }}
      />,
    );
    layout.fire();
    await userEvent.click(screen.getByRole('button', { name: 'Reset zoom' }));
    expect(screen.getByRole('figure', { name: 'Deals won per week' })).toHaveFocus();
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

describe('viewport (DS-48)', () => {
  const cats = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'];
  const vp: ChartProps = {
    ...base,
    type: 'bar',
    categories: cats,
    series: [{ key: 'won', label: 'Deals won', values: [1, 2, 3, 4, 5, 6, 7, 8] }],
  };
  const plotOf = () => screen.getByRole('group', { name: 'Deals won per week' });
  const reset = () => screen.queryByRole('button', { name: 'Reset zoom' });

  it('clips marks, markers, selection and value labels to the plot and says zoomed', () => {
    const layout = stubLayout();
    const { container } = render(
      <Chart
        {...vp}
        valueLabels
        markers={[{ key: 'm', at: 'c5', label: 'Launch' }]}
        defaultSelectedRange={{ from: 'c4', to: 'c5' }}
        defaultViewport={{ from: 0.5, to: 1 }}
      />,
    );
    layout.fire();
    const clip = container.querySelector('clipPath');
    expect(clip).not.toBeNull();
    const url = `url(#${clip!.id})`;
    const clipped = (el: Element | null) =>
      expect(el?.closest('[clip-path]')?.getAttribute('clip-path')).toBe(url);
    clipped(container.querySelector('[data-series="won"]'));
    clipped(container.querySelector('[data-selection]'));
    clipped(container.querySelector('[data-value-label]'));
    clipped(container.querySelector('line[data-tone]'));
    expect(plotOf()).toHaveAccessibleDescription(/^Zoomed to c4–c7\. Selected c4 to c5\./);
  });

  it('draws no clipPath without a viewport', () => {
    const layout = stubLayout();
    const { container } = render(<Chart {...vp} />);
    layout.fire();
    expect(container.querySelector('clipPath')).toBeNull();
  });

  it('keeps every category of the domain in the data table', () => {
    const layout = stubLayout();
    render(<Chart {...vp} defaultViewport={{ from: 0.5, to: 1 }} />);
    layout.fire();
    const table = screen.getByRole('table', { name: 'Deals won per week' });
    for (const c of cats) expect(within(table).getByRole('rowheader', { name: c })).toBeTruthy();
  });

  it('Reset zoom shows for a viewport alone and clears only what is set', async () => {
    const layout = stubLayout();
    const onViewport = vi.fn();
    const onZoom = vi.fn();
    const { unmount } = render(
      <Chart
        {...vp}
        defaultViewport={{ from: 0.5, to: 1 }}
        onViewportChange={onViewport}
        onZoomRangeChange={onZoom}
      />,
    );
    layout.fire();
    await userEvent.click(reset()!);
    expect(onViewport).toHaveBeenCalledWith(null, { end: true });
    expect(onZoom).not.toHaveBeenCalled();
    expect(reset()).toBeNull();
    unmount();

    onViewport.mockClear();
    render(
      <Chart
        {...vp}
        defaultZoomRange={{ from: 'c2', to: 'c7' }}
        defaultViewport={{ from: 0.5, to: 1 }}
        onViewportChange={onViewport}
        onZoomRangeChange={onZoom}
      />,
    );
    layout.fire();
    await userEvent.click(reset()!);
    expect(onZoom).toHaveBeenCalledWith(null);
    expect(onViewport).toHaveBeenCalledTimes(1);
    expect(onViewport).toHaveBeenCalledWith(null, { end: true });
  });

  it('a zoomRange change resets a non-null viewport', async () => {
    const layout = stubLayout();
    const onViewport = vi.fn();
    const { rerender } = render(
      <Chart {...vp} viewport={{ from: 0.5, to: 1 }} onViewportChange={onViewport} />,
    );
    layout.fire();
    rerender(
      <Chart
        {...vp}
        zoomRange={{ from: 'c1', to: 'c5' }}
        viewport={{ from: 0.5, to: 1 }}
        onViewportChange={onViewport}
      />,
    );
    expect(onViewport).toHaveBeenCalledWith(null, { end: true });
  });

  it('Zoom to selection resets an uncontrolled viewport', async () => {
    const layout = stubLayout();
    const onViewport = vi.fn();
    render(
      <Chart
        {...vp}
        defaultSelectedRange={{ from: 'c5', to: 'c6' }}
        defaultViewport={{ from: 0.5, to: 1 }}
        onViewportChange={onViewport}
      />,
    );
    layout.fire();
    await userEvent.click(screen.getByRole('button', { name: 'Zoom to selection' }));
    expect(onViewport).toHaveBeenCalledWith(null, { end: true });
    expect(plotOf()).toHaveAccessibleDescription(/^Zoomed to c5–c6\./);
  });

  it('an uncontrolled viewport resets silently when the categories change content', () => {
    const layout = stubLayout();
    const onViewport = vi.fn();
    const { rerender } = render(
      <Chart {...vp} defaultViewport={{ from: 0.5, to: 1 }} onViewportChange={onViewport} />,
    );
    layout.fire();
    rerender(
      <Chart
        {...vp}
        categories={[...cats]}
        defaultViewport={{ from: 0.5, to: 1 }}
        onViewportChange={onViewport}
      />,
    );
    expect(reset()).not.toBeNull();
    rerender(
      <Chart
        {...vp}
        categories={cats.map((c) => `${c}!`)}
        defaultViewport={{ from: 0.5, to: 1 }}
        onViewportChange={onViewport}
      />,
    );
    expect(reset()).toBeNull();
    expect(onViewport).not.toHaveBeenCalled();
  });

  it('keeps defaultViewport when the first categories arrive after loading', () => {
    const layout = stubLayout();
    const { rerender } = render(
      <Chart {...vp} categories={[]} series={[]} defaultViewport={{ from: 0.5, to: 1 }} />,
    );
    layout.fire();
    rerender(<Chart {...vp} defaultViewport={{ from: 0.5, to: 1 }} />);
    expect(reset()).not.toBeNull();
    expect(plotOf()).toHaveAccessibleDescription(/^Zoomed to c4–c7\./);
  });

  it('keyboard zoom announces the new window in the live region', async () => {
    const layout = stubLayout();
    render(<Chart {...vp} zoomGestures />);
    layout.fire();
    plotOf().focus();
    const live = document.querySelector('[aria-live="polite"]')!;
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}+');
    await waitFor(() => expect(live).toHaveTextContent('Zoomed to c1–c5'));
    await userEvent.keyboard('-');
    await waitFor(() => expect(live).toHaveTextContent('Zoomed to c0–c7'));
  });

  it('keyboard zoom that changes nothing announces nothing', async () => {
    const layout = stubLayout();
    const { unmount } = render(<Chart {...vp} zoomGestures />);
    layout.fire();
    plotOf().focus();
    const quiet = async () => {
      await userEvent.keyboard(key);
      await act(async () => {
        await new Promise((r) => setTimeout(r, PAST_ANNOUNCE_DELAY_MS));
      });
      expect(document.querySelector('[aria-live="polite"]')).toBeEmptyDOMElement();
    };
    let key = '-'; // already at full extent
    await quiet();
    unmount();
    // Already at the minimum span (2 of 8 categories).
    const at = render(<Chart {...vp} zoomGestures defaultViewport={{ from: 0, to: 0.25 }} />);
    layout.fire();
    plotOf().focus();
    key = '+';
    await quiet();
    at.unmount();
    // Controlled, and the app keeps its window: what is rendered did not change.
    render(<Chart {...vp} zoomGestures viewport={null} onViewportChange={() => {}} />);
    layout.fire();
    plotOf().focus();
    await quiet();
  });

  it('another viewport change clears the keyboard zoom note, so the same text is heard again', async () => {
    const layout = stubLayout();
    render(<Chart {...vp} zoomGestures />);
    layout.fire();
    plotOf().focus();
    const live = document.querySelector('[aria-live="polite"]')!;
    await userEvent.keyboard('+');
    await waitFor(() => expect(live).toHaveTextContent('Zoomed to c2–c5'));
    await userEvent.click(reset()!);
    await waitFor(() => expect(live).not.toHaveTextContent('Zoomed'));
    plotOf().focus();
    await userEvent.keyboard('+');
    await waitFor(() => expect(live).toHaveTextContent('Zoomed to c2–c5'));
  });

  it('keyboard: +/= and - zoom around the inspected category', async () => {
    const layout = stubLayout();
    const onViewport = vi.fn();
    render(<Chart {...vp} zoomGestures onViewportChange={onViewport} />);
    layout.fire();
    plotOf().focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
    await userEvent.keyboard('+');
    // c2's centre (2.5 / 8) stays put while the span halves.
    const [zoomed, info] = onViewport.mock.lastCall!;
    expect(info).toEqual({ end: true });
    expect(zoomed.from).toBeCloseTo(0.15625);
    expect(zoomed.to).toBeCloseTo(0.65625);
    await userEvent.keyboard('-');
    expect(onViewport).toHaveBeenLastCalledWith(null, { end: true });
    await userEvent.keyboard('=');
    expect(onViewport.mock.lastCall![0]).not.toBeNull();
  });

  it('keyboard: inspecting past the right edge pans the window', async () => {
    const layout = stubLayout();
    const onViewport = vi.fn();
    render(
      <Chart
        {...vp}
        zoomGestures
        defaultViewport={{ from: 0, to: 0.25 }}
        onViewportChange={onViewport}
      />,
    );
    layout.fire();
    plotOf().focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(onViewport).not.toHaveBeenCalled();
    await userEvent.keyboard('{ArrowRight}');
    const [next, info] = onViewport.mock.lastCall!;
    expect(info).toEqual({ end: true });
    expect(next.from).toBeCloseTo(0.125);
    expect(next.to).toBeCloseTo(0.375);
  });

  it('keyboard zoom keys are off without zoomGestures; inspection still pans the window', async () => {
    const layout = stubLayout();
    const onViewport = vi.fn();
    render(<Chart {...vp} defaultViewport={{ from: 0, to: 0.25 }} onViewportChange={onViewport} />);
    layout.fire();
    plotOf().focus();
    await userEvent.keyboard('{ArrowRight}+-=');
    expect(onViewport).not.toHaveBeenCalled();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    const [next, info] = onViewport.mock.lastCall!;
    expect(info).toEqual({ end: true });
    expect(next.from).toBeCloseTo(0.125);
    expect(next.to).toBeCloseTo(0.375);
    expect(plotOf()).toHaveAccessibleDescription(/^Zoomed to c1–c2\./);
  });

  it('renders no NaN while loading or with one category', () => {
    const layout = stubLayout();
    const noNaN = (container: HTMLElement) => {
      for (const el of container.querySelectorAll('svg *'))
        for (const a of el.attributes) expect(`${a.name}=${a.value}`).not.toContain('NaN');
    };
    const { container, rerender } = render(
      <Chart {...vp} categories={[]} series={[]} viewport={{ from: 0.5, to: 1 }} />,
    );
    layout.fire();
    noNaN(container);
    rerender(
      <Chart
        {...vp}
        categories={['only']}
        series={[{ key: 'won', label: 'Deals won', values: [3] }]}
        viewport={{ from: 0.5, to: 1 }}
      />,
    );
    expect(container.querySelector('svg')).not.toBeNull();
    noNaN(container);
  });
});

describe('gestures and plot double-click (DS-48)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  const cats = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'];
  const vp: ChartProps = {
    ...base,
    type: 'bar',
    categories: cats,
    series: [{ key: 'won', label: 'Deals won', values: [1, 2, 3, 4, 5, 6, 7, 8] }],
  };
  const plotOf = () => screen.getByRole('group', { name: 'Deals won per week' });
  const xOf = (container: HTMLElement, category: string) =>
    Number(
      [...container.querySelectorAll('svg text')]
        .find((t) => t.textContent === category)!
        .getAttribute('x'),
    );
  // Middle of the plot, from a grid line's ends.
  const centreOf = (container: HTMLElement) => {
    const line = container.querySelector('svg line')!;
    return (Number(line.getAttribute('x1')) + Number(line.getAttribute('x2'))) / 2;
  };
  /** Dispatches a cancelable touch event; returns true when it was cancelled. */
  const touch = (type: string, points: { x: number; y: number }[]) => {
    const e = new Event(type, { bubbles: true, cancelable: true });
    const list = points.map((p) => ({ clientX: p.x, clientY: p.y }));
    Object.defineProperty(e, 'touches', { value: list });
    act(() => {
      plotOf().dispatchEvent(e);
    });
    return e.defaultPrevented;
  };
  const span = (v: { from: number; to: number }) => v.to - v.from;

  it('ctrl+wheel zooms around the pointer, then settles with end after WHEEL_END_MS', () => {
    const layout = stubLayout();
    const onViewport = vi.fn();
    const { container } = render(<Chart {...vp} zoomGestures onViewportChange={onViewport} />);
    layout.fire();
    const notCancelled = fireEvent.wheel(plotOf(), {
      ctrlKey: true,
      deltaY: -100,
      clientX: centreOf(container),
    });
    expect(notCancelled).toBe(false);
    const [next, info] = onViewport.mock.lastCall!;
    expect(info).toEqual({ end: false });
    expect(span(next)).toBeLessThan(1);
    expect((next.from + next.to) / 2).toBeCloseTo(0.5, 2);
    act(() => vi.advanceTimersByTime(200));
    expect(onViewport).toHaveBeenCalledTimes(2);
    expect(onViewport).toHaveBeenLastCalledWith(next, { end: true });
  });

  it('plain wheel scrolls the page; shift or horizontal wheel pans while zoomed', () => {
    const layout = stubLayout();
    const onViewport = vi.fn();
    const { container } = render(
      <Chart
        {...vp}
        zoomGestures
        defaultViewport={{ from: 0.25, to: 0.5 }}
        onViewportChange={onViewport}
      />,
    );
    layout.fire();
    const x = centreOf(container);
    expect(fireEvent.wheel(plotOf(), { deltaY: 100, clientX: x })).toBe(true);
    expect(onViewport).not.toHaveBeenCalled();
    expect(fireEvent.wheel(plotOf(), { shiftKey: true, deltaY: 100, clientX: x })).toBe(false);
    expect(onViewport.mock.lastCall![0].from).toBeGreaterThan(0.25);
    onViewport.mockClear();
    fireEvent.wheel(plotOf(), { deltaX: -100, deltaY: 1, clientX: x });
    expect(onViewport.mock.lastCall![0].from).toBeLessThan(0.25 + 0.01);
    expect(span(onViewport.mock.lastCall![0])).toBeCloseTo(0.25);
  });

  it('ctrl+wheel does nothing without zoomGestures', () => {
    const layout = stubLayout();
    const onViewport = vi.fn();
    const { container } = render(<Chart {...vp} onViewportChange={onViewport} />);
    layout.fire();
    expect(
      fireEvent.wheel(plotOf(), { ctrlKey: true, deltaY: -100, clientX: centreOf(container) }),
    ).toBe(true);
    act(() => vi.advanceTimersByTime(500));
    expect(onViewport).not.toHaveBeenCalled();
  });

  it('a controlled viewport without onViewportChange stays put', () => {
    const layout = stubLayout();
    const { container } = render(<Chart {...vp} zoomGestures viewport={{ from: 0, to: 0.5 }} />);
    layout.fire();
    const before = xOf(container, 'c1');
    fireEvent.wheel(plotOf(), { ctrlKey: true, deltaY: -300, clientX: centreOf(container) });
    act(() => vi.advanceTimersByTime(500));
    expect(xOf(container, 'c1')).toBe(before);
  });

  it('touch: a two-finger pinch zooms and ends on the last lift', () => {
    const layout = stubLayout();
    const onViewport = vi.fn();
    const { container } = render(<Chart {...vp} zoomGestures onViewportChange={onViewport} />);
    layout.fire();
    const c = centreOf(container);
    touch('touchstart', [
      { x: c - 20, y: 100 },
      { x: c + 20, y: 100 },
    ]);
    expect(
      touch('touchmove', [
        { x: c - 60, y: 100 },
        { x: c + 60, y: 100 },
      ]),
    ).toBe(true);
    const [zoomed, info] = onViewport.mock.lastCall!;
    expect(info).toEqual({ end: false });
    expect(span(zoomed)).toBeLessThan(0.5);
    touch('touchend', [{ x: c + 60, y: 100 }]);
    expect(onViewport.mock.lastCall![1]).toEqual({ end: false });
    touch('touchend', []);
    expect(onViewport).toHaveBeenLastCalledWith(zoomed, { end: true });
  });

  it('touch: one-finger horizontal pan while zoomed; vertical swipe is left to the page', () => {
    const layout = stubLayout();
    const onViewport = vi.fn();
    const { container } = render(
      <Chart
        {...vp}
        zoomGestures
        defaultViewport={{ from: 0.25, to: 0.5 }}
        onViewportChange={onViewport}
      />,
    );
    layout.fire();
    const c = centreOf(container);
    touch('touchstart', [{ x: c, y: 100 }]);
    expect(touch('touchmove', [{ x: c, y: 140 }])).toBe(false);
    touch('touchmove', [{ x: c - 60, y: 140 }]);
    touch('touchend', []);
    expect(onViewport).not.toHaveBeenCalled();

    touch('touchstart', [{ x: c, y: 100 }]);
    expect(touch('touchmove', [{ x: c - 60, y: 102 }])).toBe(true);
    expect(onViewport.mock.lastCall![0].from).toBeGreaterThan(0.25);
    touch('touchend', []);
    expect(onViewport.mock.lastCall![1]).toEqual({ end: true });
  });

  it('touch: a lifted long-press keeps the touch; a pinch first cancels the pending long-press', () => {
    const layout = stubLayout();
    const onViewport = vi.fn();
    const onSelect = vi.fn();
    const { container } = render(
      <Chart {...vp} zoomGestures onViewportChange={onViewport} onSelectedRangeChange={onSelect} />,
    );
    layout.fire();
    const c = centreOf(container);
    const finger = { pointerId: 5, pointerType: 'touch', clientX: c, clientY: 100 };
    const pinch = () => {
      touch('touchstart', [
        { x: c, y: 100 },
        { x: c + 40, y: 100 },
      ]);
      touch('touchmove', [
        { x: c - 40, y: 100 },
        { x: c + 80, y: 100 },
      ]);
      touch('touchend', []);
    };
    fireEvent.pointerDown(plotOf(), finger);
    act(() => vi.advanceTimersByTime(300));
    pinch();
    fireEvent.pointerUp(plotOf(), finger);
    expect(onViewport).not.toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledTimes(1);

    fireEvent.pointerDown(plotOf(), finger);
    pinch();
    act(() => vi.advanceTimersByTime(300));
    fireEvent.pointerUp(plotOf(), finger);
    expect(onViewport).toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('mouse drag pans while zoomed when selection is off; selects when it is on', () => {
    const layout = stubLayout();
    const onViewport = vi.fn();
    const mouse = { pointerId: 1, pointerType: 'mouse', button: 0 };
    const { container, unmount } = render(
      <Chart
        {...vp}
        zoomGestures
        defaultViewport={{ from: 0.25, to: 0.5 }}
        onViewportChange={onViewport}
      />,
    );
    layout.fire();
    const c = centreOf(container);
    fireEvent.pointerDown(plotOf(), { ...mouse, clientX: c });
    fireEvent.pointerMove(plotOf(), { ...mouse, clientX: c - 50 });
    const [next, info] = onViewport.mock.lastCall!;
    expect(info).toEqual({ end: false });
    expect(next.from).toBeGreaterThan(0.25);
    fireEvent.pointerUp(plotOf(), { ...mouse, clientX: c - 50 });
    expect(onViewport).toHaveBeenLastCalledWith(next, { end: true });
    unmount();

    onViewport.mockClear();
    const onSelect = vi.fn();
    const r = render(
      <Chart
        {...vp}
        zoomGestures
        defaultViewport={{ from: 0.25, to: 0.5 }}
        onViewportChange={onViewport}
        onSelectedRangeChange={onSelect}
      />,
    );
    layout.fire();
    const x2 = xOf(r.container, 'c2');
    const x3 = xOf(r.container, 'c3');
    fireEvent.pointerDown(plotOf(), { ...mouse, clientX: x2 });
    fireEvent.pointerMove(plotOf(), { ...mouse, clientX: x3 });
    fireEvent.pointerUp(plotOf(), { ...mouse, clientX: x3 });
    expect(onSelect).toHaveBeenLastCalledWith({ from: 'c2', to: 'c3' });
    expect(onViewport).not.toHaveBeenCalled();
  });

  it('dblclick reports the original category index, a domain fraction and the value at the pointer', () => {
    const layout = stubLayout();
    const onDbl = vi.fn();
    const { container, rerender } = render(<Chart {...vp} onPlotDoubleClick={onDbl} />);
    layout.fire();
    fireEvent.doubleClick(plotOf(), { clientX: xOf(container, 'c2'), clientY: 120 });
    expect(onDbl).toHaveBeenCalledTimes(1);
    const e = onDbl.mock.lastCall![0];
    expect(e).toMatchObject({ index: 2, source: 'mouse', clientY: 120 });
    expect(e.fraction).toBeGreaterThan(0);
    expect(e.fraction).toBeLessThan(1);
    expect(e.fraction).toBeCloseTo(2.5 / 8);
    expect(typeof e.value).toBe('number');
    rerender(<Chart {...vp} zoomRange={{ from: 'c2', to: 'c6' }} onPlotDoubleClick={onDbl} />);
    fireEvent.doubleClick(plotOf(), { clientX: xOf(container, 'c4'), clientY: 120 });
    expect(onDbl.mock.lastCall![0]).toMatchObject({ index: 4, source: 'mouse' });
  });

  it('hover and dblclick over the axis gutter or right padding stay on the visible window', () => {
    const layout = stubLayout();
    const onDbl = vi.fn();
    render(<Chart {...vp} defaultViewport={{ from: 0.25, to: 0.5 }} onPlotDoubleClick={onDbl} />);
    layout.fire();
    fireEvent.pointerMove(plotOf(), { pointerType: 'mouse', clientX: 0, clientY: 50 });
    expect(document.querySelector('[data-chart-tooltip]')).toHaveTextContent('c2');
    fireEvent.pointerMove(plotOf(), { pointerType: 'mouse', clientX: 400, clientY: 50 });
    expect(document.querySelector('[data-chart-tooltip]')).toHaveTextContent('c3');
    fireEvent.doubleClick(plotOf(), { clientX: 0, clientY: -500 });
    const left = onDbl.mock.lastCall![0];
    expect(left.index).toBe(2);
    expect(left.fraction).toBeCloseTo(0.25);
    fireEvent.doubleClick(plotOf(), { clientX: 400, clientY: 120 });
    const right = onDbl.mock.lastCall![0];
    expect(right.index).toBe(3);
    expect(right.fraction).toBeCloseTo(0.5);
    // Outside the plot's height the value stops at the y range's ends instead of extrapolating.
    fireEvent.doubleClick(plotOf(), { clientX: 200, clientY: -400 });
    expect(onDbl.mock.lastCall![0].value).toBeCloseTo(left.value);
    fireEvent.doubleClick(plotOf(), { clientX: 200, clientY: 10_000 });
    const below = onDbl.mock.lastCall![0].value;
    fireEvent.doubleClick(plotOf(), { clientX: 200, clientY: 20_000 });
    expect(onDbl.mock.lastCall![0].value).toBeCloseTo(below);
  });

  it('a touch double-tap fires once; taps 400ms apart do not', () => {
    const layout = stubLayout();
    const onDbl = vi.fn();
    const { container } = render(<Chart {...vp} onPlotDoubleClick={onDbl} />);
    layout.fire();
    const at = { pointerId: 3, pointerType: 'touch', clientX: xOf(container, 'c1'), clientY: 90 };
    const tap = () => {
      fireEvent.pointerDown(plotOf(), at);
      fireEvent.pointerUp(plotOf(), at);
    };
    tap();
    act(() => vi.advanceTimersByTime(400));
    tap();
    expect(onDbl).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(100));
    tap();
    expect(onDbl).toHaveBeenCalledTimes(1);
    expect(onDbl.mock.lastCall![0]).toMatchObject({ index: 1, source: 'touch' });
    // The synthesized dblclick after a double-tap is not a second report.
    fireEvent.doubleClick(plotOf(), at);
    expect(onDbl).toHaveBeenCalledTimes(1);
  });

  it('Enter on the inspected category fires it from the keyboard', () => {
    const layout = stubLayout();
    const onDbl = vi.fn();
    render(<Chart {...vp} onPlotDoubleClick={onDbl} />);
    layout.fire();
    plotOf().focus();
    for (let i = 0; i < 3; i++) fireEvent.keyDown(plotOf(), { key: 'ArrowRight' });
    fireEvent.keyDown(plotOf(), { key: 'Enter' });
    expect(onDbl).toHaveBeenCalledTimes(1);
    expect(onDbl.mock.lastCall![0]).toMatchObject({ index: 2, source: 'keyboard', value: null });
  });

  it('keeps the pan-y plot (no browser double-tap zoom) and hints the zoom keys only with zoomGestures', () => {
    const layout = stubLayout();
    const { rerender } = render(<Chart {...vp} />);
    layout.fire();
    expect(plotOf().className).toMatch(/plot/);
    expect(plotOf()).toHaveAccessibleDescription(
      'Use arrow keys to inspect values. All values are also in the data table.',
    );
    rerender(<Chart {...vp} zoomGestures onPlotDoubleClick={() => {}} />);
    expect(plotOf().className).toMatch(/plot/);
    expect(plotOf()).toHaveAccessibleDescription(
      'Use arrow keys to inspect values. All values are also in the data table. Plus and minus zoom in and out.',
    );
  });
});

describe('referenceLines (DS-53)', () => {
  const props: ChartProps = {
    type: 'stacked-bar',
    label: 'Eaten per day',
    categories: ['Mon', 'Tue'],
    series: [
      { key: 'cat', label: 'Cat', values: [20, 30] },
      { key: 'dog', label: 'Dog', values: [10, 15] },
    ],
    formatValue: (n) => `${n} g`,
    referenceLines: [
      { value: 35, label: '30-day average' },
      { key: 'goal', value: 50, label: 'Goal', color: 2 },
    ],
  };

  it('draws one dashed line per reference, each with its own dash', () => {
    const layout = stubLayout();
    const { container } = render(<Chart {...props} />);
    layout.fire();
    const lines = [...container.querySelectorAll('[data-reference-line]')];
    expect(lines.map((l) => l.getAttribute('data-dash'))).toEqual(['0', '1']);
    // Over the bars.
    const lastBar = [...container.querySelectorAll('path[class*="bar"]')].at(-1)!;
    expect(
      lastBar.compareDocumentPosition(lines[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('emphasis strong marks exactly one line and one legend swatch (DS-57)', () => {
    const layout = stubLayout();
    const { container } = render(
      <Chart
        {...props}
        referenceLines={[
          { value: 1, label: 'a' },
          { value: 2, label: 'b', emphasis: 'strong' },
        ]}
      />,
    );
    layout.fire();
    expect(
      container.querySelectorAll('[data-reference-line][data-emphasis="strong"]'),
    ).toHaveLength(1);
    expect(container.querySelectorAll('svg[data-dash][data-emphasis="strong"]')).toHaveLength(1);
  });

  it('lists each line as a static legend entry with a dash swatch', () => {
    const layout = stubLayout();
    const { container } = render(<Chart {...props} />);
    layout.fire();
    const legend = container.querySelector('ul[class*="legend"]') as HTMLElement;
    for (const [name, dash] of [
      ['30-day average', '0'],
      ['Goal', '1'],
    ]) {
      const entry = within(legend).getByText(name).closest('[data-static]')!;
      expect(entry).not.toBeNull();
      expect(entry.tagName).toBe('SPAN');
      expect(entry.querySelector('svg')!.getAttribute('data-dash')).toBe(dash);
    }
  });

  it('adds a muted row to the tooltip and the announcement', async () => {
    const layout = stubLayout();
    render(<Chart {...props} />);
    layout.fire();
    screen.getByRole('group', { name: 'Eaten per day' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.querySelector('[data-chart-tooltip]')).toHaveTextContent(
      '30-day average: 35 g',
    );
    const live = document.querySelector('[aria-live="polite"]')!;
    await waitFor(() => expect(live).toHaveTextContent(/30-day average: 35 g, Goal: 50 g$/));
  });

  it('lists each line as a table footer row', () => {
    stubLayout();
    render(<Chart {...props} />);
    const table = screen.getByRole('table');
    const foot = table.querySelector('tfoot')!;
    const rows = within(foot as HTMLElement).getAllByRole('row');
    const th = within(rows[0]).getByRole('rowheader', { name: '30-day average' });
    expect(th).toHaveAttribute('scope', 'row');
    const td = rows[0].querySelector('td')!;
    expect(td).toHaveTextContent('35 g');
    // Category + two series columns: the value spans the two after the row header.
    expect(td).toHaveAttribute('colspan', '2');
  });

  it('spans the notes and details columns too', () => {
    stubLayout();
    render(
      <Chart
        {...props}
        annotations={[{ at: 'Tue', glyph: 'up', tone: 'success', label: 'Ahead' }]}
        details={() => ['note']}
      />,
    );
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('columnheader')).toHaveLength(5);
    const td = table.querySelector('tfoot td')!;
    // Two series columns + the notes column + the details column.
    expect(td).toHaveAttribute('colspan', '4');
  });

  it('ignores a non-finite value with a dev warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const layout = stubLayout();
    const { container } = render(
      <Chart {...props} referenceLines={[{ value: NaN, label: 'Broken' }]} />,
    );
    layout.fire();
    expect(container.querySelector('[data-reference-line]')).toBeNull();
    expect(screen.queryByText('Broken')).toBeNull();
    expect(warn.mock.calls.flat().join(' ')).toMatch(/Ignored referenceLines \(Broken\)/);
  });
});

describe('referenceLines paint order (DS-53)', () => {
  const areaProps: ChartProps = {
    ...base,
    type: 'area',
    label: 'Area with reference',
    series: [
      { key: 'a', label: 'A', values: [1, 2, 3] },
      { key: 'b', label: 'B', values: [3, 2, 1] },
    ],
  };

  it('paints over area fills and under line strokes', () => {
    const layout = stubLayout();
    const { container } = render(
      <Chart {...areaProps} referenceLines={[{ value: 3, label: 'Target' }]} />,
    );
    layout.fire();
    const ref = container.querySelector('[data-reference-line]')!;
    const after = (a: Element, b: Element) =>
      !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    for (const fill of container.querySelectorAll('path[class*="area"]'))
      expect(after(fill, ref)).toBe(true);
    for (const stroke of container.querySelectorAll('path[class*="line"]'))
      expect(after(ref, stroke)).toBe(true);
  });

  it('keeps one group per series without reference lines', () => {
    const layout = stubLayout();
    const { container } = render(<Chart {...areaProps} />);
    layout.fire();
    const groups = [...container.querySelectorAll('g[class*="series"][data-series]')];
    expect(groups.map((g) => g.getAttribute('data-series'))).toEqual(['a', 'b']);
    for (const g of groups) {
      expect(g.querySelector('path[class*="area"]')).not.toBeNull();
      expect(g.querySelector('path[class*="line"]')).not.toBeNull();
    }
  });
});

describe('annotations (DS-52)', () => {
  const props: ChartProps = {
    type: 'bar',
    label: 'Eaten per day',
    categories: ['Mon', 'Tue', 'Wed', 'Thu'],
    series: [{ key: 'cat', label: 'Cat', values: [20, 30, 25, 10] }],
    formatValue: (n) => `${n} g`,
    annotations: [{ at: 'Tue', glyph: 'up', tone: 'success', label: 'Ahead of usual pace' }],
  };

  it('draws a decorative glyph with its shape and tone', () => {
    const layout = stubLayout();
    const { container } = render(<Chart {...props} />);
    layout.fire();
    const glyph = container.querySelector('[data-annotation]')!;
    expect(glyph).toHaveAttribute('aria-hidden', 'true');
    expect(glyph).toHaveAttribute('data-glyph', 'up');
    expect(glyph).toHaveAttribute('data-tone', 'success');
  });

  it('lists the label in the tooltip and the announcement', async () => {
    const layout = stubLayout();
    render(<Chart {...props} />);
    layout.fire();
    screen.getByRole('group', { name: 'Eaten per day' }).focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    expect(document.querySelector('[data-chart-tooltip]')).toHaveTextContent('Ahead of usual pace');
    const live = document.querySelector('[aria-live="polite"]')!;
    await waitFor(() => expect(live).toHaveTextContent(/^Tue: .*\. Ahead of usual pace$/));
  });

  it('adds the notes column when only annotations exist, after any marker labels', () => {
    stubLayout();
    const { rerender } = render(<Chart {...props} />);
    const table = screen.getByRole('table');
    expect(within(table).getByRole('columnheader', { name: 'Notes' })).toBeInTheDocument();
    const rows = within(table).getAllByRole('row');
    expect(rows[2].lastElementChild).toHaveTextContent('Ahead of usual pace');
    expect(rows[1].lastElementChild).toHaveTextContent(/^$/);
    rerender(<Chart {...props} markers={[{ key: 'm', at: 'Tue', label: 'Vet visit' }]} />);
    expect(within(table).getAllByRole('row')[2].lastElementChild).toHaveTextContent(
      'Vet visit, Ahead of usual pace',
    );
  });

  it('ignores an unknown category with a dev warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const layout = stubLayout();
    const { container } = render(
      <Chart {...props} annotations={[{ at: 'Sun', glyph: 'dot', tone: 'neutral', label: 'X' }]} />,
    );
    layout.fire();
    expect(container.querySelector('[data-annotation]')).toBeNull();
    expect(warn.mock.calls.flat().join(' ')).toMatch(/Ignored annotations \(Sun\)/);
  });

  it('under a zoomRange excluding the category, draws no glyph and does not warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const layout = stubLayout();
    const { container } = render(<Chart {...props} zoomRange={{ from: 'Wed', to: 'Thu' }} />);
    layout.fire();
    expect(container.querySelector('[data-annotation]')).toBeNull();
    expect(warn).not.toHaveBeenCalled();
  });

  it('under a viewport excluding the category, draws no glyph but keeps the label in the table (Review Focus 4)', () => {
    const layout = stubLayout();
    const { container } = render(<Chart {...props} defaultViewport={{ from: 0.5, to: 1 }} />);
    layout.fire();
    expect(container.querySelector('[data-annotation]')).toBeNull();
    const rows = within(screen.getByRole('table')).getAllByRole('row');
    expect(rows[2].lastElementChild).toHaveTextContent('Ahead of usual pace');
  });
});

describe('includeZero (DS-71)', () => {
  const weights: ChartProps = {
    type: 'line',
    label: 'Weight',
    categories: ['a', 'b', 'c'],
    series: [{ key: 'w', label: 'Weight', values: [3700, 3800, 3750] }],
    formatValue: (n) => String(n),
  };
  const tickLabels = (c: HTMLElement) =>
    [...c.querySelectorAll('svg text')].map((t) => t.textContent);

  it('draws a 0 tick by default and none with includeZero={false}', () => {
    const layout = stubLayout();
    const { container, rerender } = render(<Chart {...weights} />);
    layout.fire();
    expect(tickLabels(container)).toContain('0');
    rerender(<Chart {...weights} includeZero={false} />);
    expect(tickLabels(container)).not.toContain('0');
  });
});

describe('integerValues (DS-74)', () => {
  it('draws no fractional tick labels', () => {
    const layout = stubLayout();
    const props: ChartProps = {
      type: 'bar',
      label: 'Cleanings',
      categories: ['a', 'b', 'c'],
      series: [{ key: 'n', label: 'Cleanings', values: [1, 1, 0] }],
      formatValue: (n) => String(n),
    };
    const { container, rerender } = render(<Chart {...props} />);
    layout.fire();
    const labels = () => [...container.querySelectorAll('svg text')].map((t) => t.textContent);
    expect(labels().some((l) => l?.includes('.'))).toBe(true);
    rerender(<Chart {...props} integerValues />);
    expect(labels().some((l) => l?.includes('.'))).toBe(false);
  });
});
