import { createRef, type RefAttributes } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { FunnelChart, type FunnelChartProps } from './FunnelChart';

// LiveRegion writes after ANNOUNCE_DELAY_MS (50ms); wait past it or "empty" assertions pass vacuously.
const PAST_ANNOUNCE_DELAY_MS = 120;

function stubLayout(width = 500, height = 240) {
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

const stages = [
  { key: 'l', label: 'Leads', value: 1240 },
  { key: 'q', label: 'Qualified', value: 620 },
  { key: 'p', label: 'Proposal', value: 248 },
  { key: 'n', label: 'Negotiation', value: 125 },
  { key: 'w', label: 'Won', value: 50 },
];

const base: FunnelChartProps = {
  label: 'Pipeline',
  stages,
  formatValue: (n) => n.toLocaleString('en-GB'),
};

const renderFunnel = (props: Partial<FunnelChartProps & RefAttributes<HTMLElement>> = {}) =>
  render(
    <LocaleProvider locale="en-GB">
      <FunnelChart {...base} {...props} />
    </LocaleProvider>,
  );

const tooltip = () => document.querySelector('[data-chart-tooltip]');
const stageGroups = () => [...document.querySelectorAll('svg g[data-stage]')];

describe('FunnelChart', () => {
  it('is a named figure, forwards ref and merges className', () => {
    stubLayout();
    const ref = createRef<HTMLElement>();
    renderFunnel({ ref, className: 'mine' });
    const fig = screen.getByRole('figure', { name: 'Pipeline' });
    expect(fig).toBe(ref.current);
    expect(fig.className).toMatch(/mine/);
    expect(fig.className).toMatch(/root/);
  });

  it('defaults to a horizontal eased funnel; shape="sharp" is reflected', () => {
    stubLayout();
    const { rerender } = renderFunnel();
    const fig = screen.getByRole('figure');
    expect(fig).toHaveAttribute('data-orientation', 'horizontal');
    expect(fig).toHaveAttribute('data-shape', 'eased');
    rerender(
      <LocaleProvider locale="en-GB">
        <FunnelChart {...base} shape="sharp" />
      </LocaleProvider>,
    );
    expect(fig).toHaveAttribute('data-shape', 'sharp');
  });

  it('draws one aria-hidden stage group per stage and a footer cell with value then label', () => {
    const layout = stubLayout();
    renderFunnel();
    layout.fire();
    expect(document.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(stageGroups().map((g) => g.getAttribute('data-stage'))).toEqual([
      'l',
      'q',
      'p',
      'n',
      'w',
    ]);
    const cell = document.querySelector('[data-stage-cell="w"]')!;
    expect(cell.textContent).toBe('50Won');
    expect(cell).toHaveStyle({ '--chart-series-color': 'var(--chart-series-5)' });
  });

  it('data table lists every stage with step conversion and share of first', () => {
    stubLayout();
    renderFunnel();
    const table = screen.getByRole('table', { name: 'Pipeline' });
    const rows = within(table).getAllByRole('row');
    expect(
      within(rows[0])
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Stage', 'Value', 'Conversion from previous stage', 'Share of first stage']);
    const body = rows.slice(1);
    expect(body).toHaveLength(5);
    expect(body[0].textContent).toBe('Leads1,240—100%');
    expect([...body[4].children].map((c) => c.textContent)).toEqual(['Won', '50', '40%', '4%']);
  });

  it('has no pill on the first stage; later stages show the step conversion', () => {
    const layout = stubLayout();
    renderFunnel();
    layout.fire();
    expect(document.querySelector('[data-stage="l"] text')).toBeNull();
    expect(document.querySelector('[data-stage="q"] rect')).not.toBeNull();
    expect(document.querySelector('[data-stage="q"] text')).toHaveTextContent('50%');
  });

  it('keyboard inspects stages, announces and dims the others', async () => {
    const layout = stubLayout();
    renderFunnel();
    layout.fire();
    const plot = screen.getByRole('group', { name: 'Pipeline' });
    expect(plot).toHaveAttribute('tabindex', '0');
    expect(plot).toHaveAccessibleDescription(
      'Use arrow keys to inspect stages. All values are also in the data table.',
    );
    plot.focus();
    await userEvent.keyboard('{ArrowRight}');
    await act(async () => {
      await new Promise((r) => setTimeout(r, PAST_ANNOUNCE_DELAY_MS));
    });
    const live = document.querySelector('[aria-live="polite"]')!;
    expect(live).toHaveTextContent('Leads');
    expect(live).toHaveTextContent('1,240');
    expect(stageGroups().filter((g) => g.hasAttribute('data-dimmed'))).toHaveLength(4);
    expect(document.querySelector('[data-stage="l"]')).not.toHaveAttribute('data-dimmed');

    await userEvent.keyboard('{End}');
    expect(document.querySelector('[data-stage="w"]')).not.toHaveAttribute('data-dimmed');
    expect(tooltip()).toHaveTextContent('Won');

    await userEvent.keyboard('{Escape}');
    expect(stageGroups().some((g) => g.hasAttribute('data-dimmed'))).toBe(false);
    expect(tooltip()).toBeNull();
  });

  it('pointer movement over the shapes shows the stage tooltip; leaving clears it', () => {
    const layout = stubLayout();
    renderFunnel();
    layout.fire();
    const plot = screen.getByRole('group', { name: 'Pipeline' });
    fireEvent.pointerMove(plot, { clientX: 250, pointerType: 'mouse' });
    const tip = tooltip();
    expect(tip).toHaveTextContent('Proposal');
    expect(tip).toHaveTextContent('40% of Qualified');
    expect(tip).toHaveTextContent('20% of Leads');
    expect(document.querySelector('[data-stage="p"]')).not.toHaveAttribute('data-dimmed');
    fireEvent.pointerLeave(plot, { pointerType: 'mouse' });
    expect(tooltip()).toBeNull();
  });

  it('shows the translated empty state with the footnote', () => {
    renderFunnel({ stages: [], footnote: 'Closed deals only' });
    const fig = screen.getByRole('figure', { name: 'Pipeline' });
    expect(fig).toHaveAttribute('data-empty');
    expect(screen.getByText('No data for this period')).toBeInTheDocument();
    expect(screen.getByText('Closed deals only')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('emptyMessage overrides the empty title; footnote also renders with data', () => {
    stubLayout();
    const { rerender } = renderFunnel({ stages: [], emptyMessage: 'Nothing yet' });
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
    rerender(
      <LocaleProvider locale="en-GB">
        <FunnelChart {...base} footnote="Closed deals only" />
      </LocaleProvider>,
    );
    expect(screen.getByText('Closed deals only')).toBeInTheDocument();
    expect(screen.getByRole('figure')).toHaveAttribute('data-footnote');
  });

  it('warns once in dev when stages overflow the palette', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderFunnel({
      stages: Array.from({ length: 9 }, (_, i) => ({ key: `s${i}`, label: `S${i}`, value: 9 - i })),
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0].join(' ')).toMatch(/FunnelChart/);
  });
});
