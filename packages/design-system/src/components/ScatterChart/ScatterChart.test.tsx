import { createRef, useState } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScatterChart, type ScatterChartProps } from './ScatterChart';

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

const base: ScatterChartProps = {
  label: 'Bowl vs meal',
  xLabel: 'Bowl',
  yLabel: 'Meal',
  formatX: (x) => `${x} g bowl`,
  formatY: (y) => `${y} g meal`,
  series: [
    {
      key: 'cat',
      label: 'Cat',
      points: [
        { x: 10, y: 5 },
        { x: 30, y: 15, label: 'Big lunch' },
      ],
    },
    { key: 'dog', label: 'Dog', points: [{ x: 20, y: 40 }] },
  ],
};

const live = () => document.querySelector('[aria-live="polite"]')!;
const dots = (c: HTMLElement) => c.querySelectorAll('[data-scatter-dot]');

describe('ScatterChart', () => {
  it('is a named figure with an aria-hidden plot, forwards ref and merges className', () => {
    const layout = stubLayout();
    const ref = createRef<HTMLElement>();
    const { container } = render(<ScatterChart {...base} ref={ref} className="mine" />);
    layout.fire();
    const fig = screen.getByRole('figure', { name: 'Bowl vs meal' });
    expect(fig).toBe(ref.current);
    expect(fig.className).toMatch(/mine/);
    expect(fig.className).toMatch(/root/);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(dots(container)).toHaveLength(3);
  });

  it('draws marks inside a clip path sized to the plot', () => {
    const layout = stubLayout();
    const { container } = render(<ScatterChart {...base} trendLine />);
    layout.fire();
    const clip = container.querySelector('clipPath rect')!;
    expect(clip).not.toBeNull();
    const marks = container.querySelector('[data-scatter-marks]')!;
    const id = container.querySelector('clipPath')!.id;
    expect(marks.getAttribute('clip-path')).toBe(`url(#${id})`);
    expect(marks.querySelectorAll('[data-scatter-dot]').length).toBeGreaterThan(0);
  });

  it('dots use the series marker shape, not colour alone', () => {
    const layout = stubLayout();
    const { container } = render(<ScatterChart {...base} />);
    layout.fire();
    const cat = container.querySelector('[data-series="cat"] [data-scatter-dot]')!;
    const dog = container.querySelector('[data-series="dog"] [data-scatter-dot]')!;
    // slot 1 = circle (arc), slot 2 = square (h/v)
    expect(cat.getAttribute('d')).toMatch(/a/);
    expect(dog.getAttribute('d')).toMatch(/h/);
  });

  it('legend toggle hides a series; controlled hiddenSeries round-trips', async () => {
    const layout = stubLayout();
    function Controlled() {
      const [hidden, setHidden] = useState<string[]>([]);
      return <ScatterChart {...base} hiddenSeries={hidden} onHiddenSeriesChange={setHidden} />;
    }
    const { container } = render(<Controlled />);
    layout.fire();
    const dog = screen.getByRole('button', { name: 'Dog' });
    expect(dog).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(dog);
    expect(dog).toHaveAttribute('aria-pressed', 'false');
    expect(container.querySelector('[data-series="dog"]')).toBeNull();
    // the last visible series can't be hidden
    await userEvent.click(screen.getByRole('button', { name: 'Cat' }));
    expect(container.querySelector('[data-series="cat"]')).not.toBeNull();
    await userEvent.click(dog);
    expect(container.querySelector('[data-series="dog"]')).not.toBeNull();
  });

  it('the plot is one tab stop described by the keyboard hint', () => {
    stubLayout();
    render(<ScatterChart {...base} />);
    const plot = screen.getByRole('group', { name: 'Bowl vs meal' });
    expect(plot).toHaveAttribute('tabindex', '0');
    expect(plot).toHaveAccessibleDescription(
      'Use arrow keys to inspect points in order of x. All values are also in the data table.',
    );
  });

  it('ArrowRight walks points by x across series, Home/End jump, Escape clears', async () => {
    const layout = stubLayout();
    render(<ScatterChart {...base} />);
    layout.fire();
    screen.getByRole('group', { name: 'Bowl vs meal' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(live()).toHaveTextContent('Cat: Bowl 10 g bowl, Meal 5 g meal'));
    expect(document.querySelector('[data-chart-tooltip]')).toHaveTextContent('5 g meal');
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(live()).toHaveTextContent('Dog: Bowl 20 g bowl, Meal 40 g meal'));
    await userEvent.keyboard('{End}');
    await waitFor(() =>
      expect(live()).toHaveTextContent('Cat: Bowl 30 g bowl, Meal 15 g meal. Big lunch'),
    );
    await userEvent.keyboard('{Home}');
    await waitFor(() => expect(live()).toHaveTextContent(/^Cat: Bowl 10 g bowl/));
    await userEvent.keyboard('{Escape}');
    expect(document.querySelector('[data-chart-tooltip]')).toBeNull();
  });

  it('announces size through formatSize and sizeLabel', async () => {
    const layout = stubLayout();
    render(
      <ScatterChart
        {...base}
        series={[{ key: 'cat', label: 'Cat', points: [{ x: 1, y: 2, size: 7 }] }]}
        formatSize={(s) => `${s} kcal`}
        sizeLabel="Energy"
      />,
    );
    layout.fire();
    screen.getByRole('group', { name: 'Bowl vs meal' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() =>
      expect(live()).toHaveTextContent('Cat: Bowl 1 g bowl, Meal 2 g meal, Energy 7 kcal'),
    );
  });

  it('data table has one row per visible point with the axis and size headers', () => {
    stubLayout();
    render(
      <ScatterChart
        {...base}
        series={[...base.series, { key: 'bird', label: 'Bird', points: [{ x: 3, y: 4, size: 2 }] }]}
        formatSize={(s) => `${s} kcal`}
        sizeLabel="Energy"
      />,
    );
    const table = screen.getByRole('table', { name: 'Bowl vs meal' });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual(expect.arrayContaining(['Bowl', 'Meal', 'Energy']));
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Big lunch'),
        expect.stringContaining('Bird3 g bowl4 g meal2 kcal'),
      ]),
    );
    expect(rows.map((r) => r.textContent)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^Bird/)]),
    );
  });

  it('shows the empty state when there are no points', () => {
    stubLayout();
    const empty = { ...base, series: [{ key: 'a', label: 'A', points: [] }] };
    const { rerender } = render(<ScatterChart {...empty} />);
    expect(screen.getByText('No data for this period')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
    rerender(<ScatterChart {...empty} emptyMessage="Nothing eaten yet" />);
    expect(screen.getByText('Nothing eaten yet')).toBeInTheDocument();
  });

  it('trendLine draws one dashed trend per series with two distinct x', () => {
    const layout = stubLayout();
    const { container } = render(<ScatterChart {...base} trendLine />);
    layout.fire();
    const trends = container.querySelectorAll('[data-scatter-trend]');
    expect(trends).toHaveLength(1);
    expect(trends[0].closest('[data-series]')).toHaveAttribute('data-series', 'cat');
  });

  it('reference draws a path and is listed in the legend', () => {
    const layout = stubLayout();
    const { container } = render(
      <ScatterChart
        {...base}
        reference={{
          label: 'Recommended',
          points: [
            { x: 0, y: 0 },
            { x: 40, y: 20 },
          ],
        }}
      />,
    );
    layout.fire();
    expect(container.querySelector('[data-scatter-reference]')?.getAttribute('d')).toMatch(/^M/);
    // Not a series: a plain legend entry, not a (pressed, disabled) toggle.
    expect(screen.queryByRole('button', { name: 'Recommended' })).toBeNull();
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toContain('Recommended');
  });

  it('several references: one path, dash and legend entry each; swatch dash matches', () => {
    const layout = stubLayout();
    const pts = [
      { x: 0, y: 0 },
      { x: 40, y: 20 },
    ];
    const { container } = render(
      <ScatterChart
        {...base}
        reference={[
          { label: 'Usual pace', points: pts },
          { label: "Today's pace", points: pts, color: 2 },
        ]}
      />,
    );
    layout.fire();
    const paths = container.querySelectorAll('[data-scatter-reference]');
    expect(paths).toHaveLength(2);
    expect(paths[0].getAttribute('data-dash')).toBe('0');
    expect(paths[1].getAttribute('data-dash')).not.toBe('0');
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toContain('Usual pace');
    expect(items).toContain("Today's pace");
    const swatch = screen.getByText("Today's pace").querySelector('[data-dash]');
    expect(swatch?.getAttribute('data-dash')).toBe(paths[1].getAttribute('data-dash'));
  });

  it('a single reference keeps data-dash 0', () => {
    const layout = stubLayout();
    const { container } = render(
      <ScatterChart
        {...base}
        reference={{
          label: 'Recommended',
          points: [
            { x: 0, y: 0 },
            { x: 40, y: 20 },
          ],
        }}
      />,
    );
    layout.fire();
    expect(container.querySelectorAll('[data-scatter-reference]')).toHaveLength(1);
    expect(container.querySelector('[data-scatter-reference]')?.getAttribute('data-dash')).toBe(
      '0',
    );
  });

  it('has no Size column when only hidden series carry sizes', () => {
    stubLayout();
    render(
      <ScatterChart
        {...base}
        formatSize={String}
        hiddenSeries={['bird']}
        series={[...base.series, { key: 'bird', label: 'Bird', points: [{ x: 3, y: 4, size: 2 }] }]}
      />,
    );
    expect(
      within(screen.getByRole('table')).queryByRole('columnheader', { name: 'Size' }),
    ).toBeNull();
  });

  it('warns in dev when a point has size but formatSize is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    stubLayout();
    render(
      <ScatterChart
        {...base}
        series={[{ key: 'cat', label: 'Cat', points: [{ x: 1, y: 2, size: 3 }] }]}
      />,
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('formatSize'));
  });

  it('a mouse near a dot shows its tooltip; far away clears it', () => {
    const layout = stubLayout();
    const { container } = render(<ScatterChart {...base} />);
    layout.fire();
    const plot = screen.getByRole('group', { name: 'Bowl vs meal' });
    const dot = container.querySelector('[data-series="dog"] [data-scatter-dot]')!;
    const [cx, cy] = /translate\(([^,]+),([^)]+)\)/
      .exec(dot.getAttribute('transform')!)!
      .slice(1)
      .map(Number);
    fireEvent.pointerMove(plot, { clientX: cx + 5, clientY: cy, pointerType: 'mouse' });
    expect(document.querySelector('[data-chart-tooltip]')).toHaveTextContent('40 g meal');
    fireEvent.pointerMove(plot, { clientX: cx + 100, clientY: cy + 100, pointerType: 'mouse' });
    expect(document.querySelector('[data-chart-tooltip]')).toBeNull();
  });

  it('a tapped tooltip survives pointerleave and closes on a press outside', () => {
    const layout = stubLayout();
    const { container } = render(
      <>
        <ScatterChart {...base} />
        <button type="button">elsewhere</button>
      </>,
    );
    layout.fire();
    const plot = screen.getByRole('group', { name: 'Bowl vs meal' });
    const dot = container.querySelector('[data-series="dog"] [data-scatter-dot]')!;
    const [cx, cy] = /translate\(([^,]+),([^)]+)\)/
      .exec(dot.getAttribute('transform')!)!
      .slice(1)
      .map(Number);
    fireEvent.pointerDown(plot, { clientX: cx, clientY: cy, pointerType: 'touch' });
    fireEvent.pointerLeave(plot, { pointerType: 'touch' });
    expect(document.querySelector('[data-chart-tooltip]')).not.toBeNull();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'elsewhere' }), {
      pointerType: 'touch',
    });
    expect(document.querySelector('[data-chart-tooltip]')).toBeNull();
  });
  it('draws both axis titles, hidden from assistive tech', () => {
    const layout = stubLayout();
    const { container } = render(<ScatterChart {...base} />);
    layout.fire();
    const titles = [...container.querySelectorAll('[data-scatter-axis-title]')];
    expect(titles.map((t) => t.textContent)).toEqual(expect.arrayContaining(['Bowl', 'Meal']));
    for (const t of titles) expect(t.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('a series without points does not keep the last plotted series hideable', async () => {
    const layout = stubLayout();
    const { container } = render(
      <ScatterChart
        {...base}
        series={[base.series[0], { key: 'none', label: 'None', points: [] }]}
      />,
    );
    layout.fire();
    const cat = screen.getByRole('button', { name: 'Cat' });
    expect(cat).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(cat);
    expect(cat).toHaveAttribute('aria-pressed', 'true');
    expect(dots(container).length).toBeGreaterThan(0);
  });

  it('ignores a controlled hiddenSeries that hides every series with points', () => {
    const layout = stubLayout();
    const { container } = render(
      <ScatterChart
        {...base}
        series={[base.series[0], { key: 'none', label: 'None', points: [] }]}
        hiddenSeries={['cat']}
      />,
    );
    layout.fire();
    expect(dots(container).length).toBeGreaterThan(0);
    expect(screen.queryByText('No data for this period')).toBeNull();
  });

  it('reads the pointer hit radius from --scatter-hit-radius', () => {
    const real = window.getComputedStyle;
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
      const style = real(el);
      return {
        ...style,
        getPropertyValue: (name: string) =>
          name === '--scatter-hit-radius' ? '4px' : style.getPropertyValue(name),
      } as CSSStyleDeclaration;
    });
    const layout = stubLayout();
    const { container } = render(<ScatterChart {...base} />);
    layout.fire();
    const plot = screen.getByRole('group', { name: 'Bowl vs meal' });
    const dot = container.querySelector('[data-series="dog"] [data-scatter-dot]')!;
    const [cx, cy] = /translate\(([^,]+),([^)]+)\)/
      .exec(dot.getAttribute('transform')!)!
      .slice(1)
      .map(Number);
    // 10px away: inside the 24px default, outside the 4px token.
    fireEvent.pointerMove(plot, { clientX: cx + 10, clientY: cy, pointerType: 'mouse' });
    expect(document.querySelector('[data-chart-tooltip]')).toBeNull();
    fireEvent.pointerMove(plot, { clientX: cx + 2, clientY: cy, pointerType: 'mouse' });
    expect(document.querySelector('[data-chart-tooltip]')).not.toBeNull();
  });
});
