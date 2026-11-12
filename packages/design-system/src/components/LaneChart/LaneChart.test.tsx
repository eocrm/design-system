import { createRef } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LaneChart, type LaneChartProps } from './LaneChart';

function stubLayout(width = 400, height = 400) {
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
  return () =>
    act(() => {
      for (const cb of callbacks) cb([], {} as ResizeObserver);
    });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const base: LaneChartProps = {
  label: 'Effects',
  categories: ['d0', 'd1', 'd2', 'd3', 'd4'],
  lanes: [
    {
      key: 'food',
      label: 'Food',
      type: 'bar',
      values: [10, 20, 30, 40, 50],
      formatValue: (n) => `${n} g`,
    },
    {
      key: 'poo',
      label: 'Poo',
      type: 'dots',
      values: [0, 2, null, 1, 0],
      formatValue: (n) => `${n}x`,
    },
    {
      key: 'w',
      label: 'Weight',
      type: 'line',
      values: [3.8, null, 3.9, 4, 4.1],
      formatValue: (n) => `${n} kg`,
      includeZero: false,
    },
  ],
};

const plotOf = () => screen.getByRole('group', { name: 'Effects' });
const tooltip = () => document.querySelector('[data-chart-tooltip]') as HTMLElement;
const xOf = (container: HTMLElement, category: string) =>
  Number(
    [...container.querySelectorAll('svg text')]
      .find((t) => t.textContent === category)!
      .getAttribute('x'),
  );

describe('LaneChart', () => {
  it('is a named figure, forwards ref and merges className', () => {
    stubLayout();
    const ref = createRef<HTMLElement>();
    render(<LaneChart {...base} ref={ref} className="mine" />);
    const fig = screen.getByRole('figure', { name: 'Effects' });
    expect(fig).toBe(ref.current);
    expect(fig.className).toMatch(/mine/);
    expect(fig.className).toMatch(/root/);
  });

  it('has one tab stop and draws every lane label as visible text', () => {
    const fire = stubLayout();
    const { container } = render(<LaneChart {...base} />);
    fire();
    const focusable = container.querySelectorAll('[tabindex="0"]');
    expect(focusable).toHaveLength(1);
    expect(focusable[0]).toBe(plotOf());
    const texts = [...container.querySelectorAll('svg text')].map((t) => t.textContent);
    for (const l of base.lanes) expect(texts).toContain(l.label);
    // x labels once, not per lane
    expect(texts.filter((t) => t === 'd0')).toHaveLength(1);
  });

  it('draws a dot for each positive value of a dots lane', () => {
    const fire = stubLayout();
    const { container } = render(<LaneChart {...base} />);
    fire();
    // values [0, 2, null, 1, 0] → two dots
    expect(container.querySelectorAll('[data-lane="poo"] [data-lane-dot]')).toHaveLength(2);
  });

  it('ArrowRight inspects category 1 and the tooltip lists every lane', async () => {
    const fire = stubLayout();
    render(<LaneChart {...base} />);
    fire();
    plotOf().focus();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    const tip = tooltip();
    expect(tip).toHaveTextContent('d1');
    expect(tip).toHaveTextContent('Food');
    expect(tip).toHaveTextContent('20 g');
    expect(tip).toHaveTextContent('Poo');
    expect(tip).toHaveTextContent('2x');
    expect(tip).toHaveTextContent('Weight');
    expect(tip).toHaveTextContent('No data');
  });

  it('selectOn="tap" selects the tapped category', () => {
    const fire = stubLayout();
    const onChange = vi.fn();
    const { container } = render(
      <LaneChart {...base} selectOn="tap" onSelectedRangeChange={onChange} />,
    );
    fire();
    const mouse = { pointerId: 1, pointerType: 'mouse', button: 0, clientX: xOf(container, 'd2') };
    fireEvent.pointerDown(plotOf(), mouse);
    fireEvent.pointerUp(plotOf(), mouse);
    expect(onChange).toHaveBeenLastCalledWith({ from: 'd2', to: 'd2' });
    expect(container.querySelectorAll('[data-selection]')).toHaveLength(1);
  });

  it('draws each marker label once, a beside label in the top gutter', () => {
    const fire = stubLayout();
    const { container } = render(
      <LaneChart
        {...base}
        markers={[
          { key: 'vet', at: 'd1', label: 'Vet' },
          { key: 'trip', from: 'd3', to: 'd4', label: 'Trip', labelPlacement: 'top' },
        ]}
      />,
    );
    fire();
    const texts = [...container.querySelectorAll('svg text')];
    const vet = texts.filter((t) => t.textContent === 'Vet');
    expect(vet).toHaveLength(1);
    expect(texts.filter((t) => t.textContent === 'Trip')).toHaveLength(1);
    // in the top gutter: above every lane's plot (the first lane label sits below it)
    const firstLane = texts.find((t) => t.textContent === 'Food')!;
    expect(Number(vet[0].getAttribute('y'))).toBeLessThan(
      Number(firstLane.closest('[data-lane]')!.getAttribute('data-top')),
    );
    expect(container.querySelectorAll('[data-marker-line]').length).toBeGreaterThan(0);
  });

  it('the data table has one column per lane', () => {
    stubLayout();
    render(<LaneChart {...base} />);
    const headers = within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    for (const l of base.lanes) expect(headers).toContain(l.label);
    expect(within(screen.getByRole('table')).getByText('2x')).toBeInTheDocument();
  });

  it('empty categories render emptyMessage', () => {
    stubLayout();
    render(<LaneChart {...base} categories={[]} emptyMessage="Nothing yet" />);
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
    expect(screen.queryByRole('group')).toBeNull();
  });

  it('warns with the LaneChart name for an unknown selectedRange', () => {
    stubLayout();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<LaneChart {...base} selectedRange={{ from: 'nope', to: 'd1' }} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[LaneChart] Ignored selectedRange'));
  });
});
