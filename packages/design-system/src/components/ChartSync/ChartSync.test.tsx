import type { ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Chart, type ChartProps } from '../Chart';
import { ChartSync } from './ChartSync';

// LiveRegion writes after ANNOUNCE_DELAY_MS (50ms); wait past it or "empty" assertions pass vacuously.
const PAST_ANNOUNCE_DELAY_MS = 120;

// Every chart measures 400x240 at the viewport origin, as in Chart.test.tsx.
function stubLayout() {
  const callbacks: ResizeObserverCallback[] = [];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(cb: ResizeObserverCallback) {
        callbacks.push(cb);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 400,
    bottom: 240,
    width: 400,
    height: 240,
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

const chart = (label: string, props: Partial<ChartProps> = {}) => (
  <Chart
    type="line"
    label={label}
    categories={['W1', 'W2', 'W3']}
    series={[{ key: 's', label: 'Deals', values: [3, 5, 8] }]}
    formatValue={(n) => `${n} deals`}
    {...props}
  />
);
const figure = (label: string) => screen.getByRole('figure', { name: label });
const plot = (label: string) => within(figure(label)).getByRole('group', { name: label });
/** x of a category's axis label (its centre) in the chart `label`. */
const xOf = (label: string, category: string) =>
  Number(
    [...figure(label).querySelectorAll('svg text')]
      .find((t) => t.textContent === category)!
      .getAttribute('x'),
  );
const hover = (label: string, category: string) =>
  fireEvent.pointerMove(plot(label), {
    pointerId: 1,
    pointerType: 'mouse',
    clientX: xOf(label, category),
  });
const leave = (label: string) =>
  fireEvent.pointerLeave(plot(label), { pointerId: 1, pointerType: 'mouse' });
const echoLine = (label: string) => figure(label).querySelector('[data-echo]');
const echoTooltip = () => document.querySelector('[data-chart-tooltip][data-echo]');

function setup(ui: ReactNode) {
  const measure = stubLayout();
  const result = render(<>{ui}</>);
  measure();
  return result;
}

describe('ChartSync', () => {
  it('a hover in A echoes a crosshair, marker and aria-hidden tooltip in B, silently', async () => {
    setup(
      <ChartSync>
        {chart('A')}
        {chart('B')}
      </ChartSync>,
    );
    hover('A', 'W2');
    const line = echoLine('B');
    expect(line).toHaveAttribute('x1', String(xOf('B', 'W2')));
    expect(figure('B').querySelector('path[class*="marker"]')).not.toBeNull();
    expect(echoTooltip()).toHaveTextContent('W2');
    expect(echoTooltip()).toHaveTextContent('5 deals');
    expect(echoTooltip()).toHaveAttribute('aria-hidden', 'true');
    // A shows its own tooltip, not an echo.
    expect(echoLine('A')).toBeNull();
    expect(document.querySelectorAll('[data-chart-tooltip]')).toHaveLength(2);
    await act(async () => {
      await new Promise((r) => setTimeout(r, PAST_ANNOUNCE_DELAY_MS));
    });
    expect(within(figure('B')).getByRole('status')).toBeEmptyDOMElement();
    expect(document.activeElement).toBe(document.body);
  });

  it('keyboard inspection in A echoes in B; A announces, B stays silent', async () => {
    setup(
      <ChartSync>
        {chart('A')}
        {chart('B')}
      </ChartSync>,
    );
    act(() => plot('A').focus());
    await userEvent.keyboard('{ArrowRight}');
    expect(echoLine('B')).toHaveAttribute('x1', String(xOf('B', 'W1')));
    expect(echoTooltip()).toHaveTextContent('W1');
    await act(async () => {
      await new Promise((r) => setTimeout(r, PAST_ANNOUNCE_DELAY_MS));
    });
    expect(within(figure('A')).getByRole('status')).toHaveTextContent('W1');
    expect(within(figure('B')).getByRole('status')).toBeEmptyDOMElement();
    expect(document.activeElement).toBe(plot('A'));
    await userEvent.keyboard('{Escape}');
    expect(echoLine('B')).toBeNull();
  });

  it('leaving A clears B', () => {
    setup(
      <ChartSync>
        {chart('A')}
        {chart('B')}
      </ChartSync>,
    );
    hover('A', 'W3');
    expect(echoLine('B')).not.toBeNull();
    leave('A');
    expect(echoLine('B')).toBeNull();
    expect(document.querySelector('[data-chart-tooltip]')).toBeNull();
  });

  it('unmounting A mid-hover clears B', () => {
    const { rerender } = setup(
      <ChartSync>
        {chart('A')}
        {chart('B')}
      </ChartSync>,
    );
    hover('A', 'W3');
    expect(echoLine('B')).not.toBeNull();
    rerender(<ChartSync>{chart('B')}</ChartSync>);
    expect(echoLine('B')).toBeNull();
    expect(echoTooltip()).toBeNull();
  });

  it('matches by categoryValues across different labels', () => {
    const day = (d: number) => new Date(Date.UTC(2026, 0, d));
    setup(
      <ChartSync>
        {chart('A', { categoryValues: [day(1), day(2), day(3)] })}
        {chart('B', {
          categories: ['1 Jan', '2 Jan', '3 Jan'],
          categoryValues: [day(1), day(2), day(3)],
        })}
      </ChartSync>,
    );
    hover('A', 'W2');
    expect(echoLine('B')).toHaveAttribute('x1', String(xOf('B', '2 Jan')));
  });

  it('sync={false} opts a chart out', () => {
    setup(
      <ChartSync>
        {chart('A')}
        {chart('B', { sync: false })}
      </ChartSync>,
    );
    hover('A', 'W2');
    expect(echoLine('B')).toBeNull();
  });

  it('charts outside any ChartSync do not echo', () => {
    setup(
      <>
        {chart('A')}
        {chart('B')}
      </>,
    );
    hover('A', 'W2');
    expect(echoLine('B')).toBeNull();
  });

  it('sibling groups are independent; in nested groups the nearest wins', () => {
    setup(
      <>
        <ChartSync>
          {chart('A')}
          <ChartSync>
            {chart('B')}
            {chart('C')}
          </ChartSync>
        </ChartSync>
        <ChartSync>{chart('D')}</ChartSync>
      </>,
    );
    hover('B', 'W2');
    expect(echoLine('C')).not.toBeNull();
    expect(echoLine('A')).toBeNull();
    expect(echoLine('D')).toBeNull();
  });

  it('a hover does not re-render the rest of the tree', () => {
    let renders = 0;
    function Sibling() {
      renders++;
      return null;
    }
    setup(
      <ChartSync>
        <Sibling />
        {chart('A')}
        {chart('B')}
      </ChartSync>,
    );
    const before = renders;
    hover('A', 'W2');
    hover('A', 'W3');
    leave('A');
    expect(renders).toBe(before);
  });

  it('shows nothing when the match is outside the viewport or zoom window', () => {
    setup(
      <ChartSync>
        {chart('A')}
        {chart('B', { viewport: { from: 0, to: 0.6 } })}
        {chart('C', { zoomRange: { from: 'W1', to: 'W2' } })}
      </ChartSync>,
    );
    hover('A', 'W3');
    expect(echoLine('B')).toBeNull();
    expect(echoLine('C')).toBeNull();
    expect(echoTooltip()).toBeNull();
    hover('A', 'W1');
    expect(echoLine('B')).not.toBeNull();
    expect(echoLine('C')).not.toBeNull();
  });

  it('warns once about a categoryValues length mismatch and falls back to labels', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = setup(
      <ChartSync>
        {chart('A')}
        {chart('B', { categoryValues: [1, 2] })}
      </ChartSync>,
    );
    hover('A', 'W2');
    rerender(
      <ChartSync>
        {chart('A')}
        {chart('B', { categoryValues: [1, 2] })}
      </ChartSync>,
    );
    expect(echoLine('B')).toHaveAttribute('x1', String(xOf('B', 'W2')));
    const calls = warn.mock.calls.filter((c) => String(c[0]).includes('categoryValues'));
    expect(calls).toHaveLength(1);
  });

  it('warns once when categoryValues are not strictly ascending', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = setup(<ChartSync>{chart('A', { categoryValues: [1, 3, 2] })}</ChartSync>);
    rerender(<ChartSync>{chart('A', { categoryValues: [1, 3, 2] })}</ChartSync>);
    const calls = warn.mock.calls.filter((c) => String(c[0]).includes('ascending'));
    expect(calls).toHaveLength(1);
  });

  it('republishes when the data changes under the same inspected index', () => {
    const { rerender } = setup(
      <ChartSync>
        {chart('A')}
        {chart('B', { categories: ['W1', 'W2', 'W3', 'W4'] })}
      </ChartSync>,
    );
    hover('A', 'W2');
    expect(echoLine('B')).toHaveAttribute('x1', String(xOf('B', 'W2')));
    rerender(
      <ChartSync>
        {chart('A', { categories: ['W2', 'W3', 'W4'] })}
        {chart('B', { categories: ['W1', 'W2', 'W3', 'W4'] })}
      </ChartSync>,
    );
    expect(echoLine('B')).toHaveAttribute('x1', String(xOf('B', 'W3')));
  });

  it('server-renders, inside and outside a ChartSync', () => {
    expect(renderToString(chart('A'))).toContain('Deals');
    expect(renderToString(<ChartSync>{chart('A')}</ChartSync>)).toContain('Deals');
  });
});
