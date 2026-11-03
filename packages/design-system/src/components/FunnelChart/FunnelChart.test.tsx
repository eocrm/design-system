import { createRef, type RefAttributes } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { ChartTooltip } from '../Chart/ChartTooltip';
import { FunnelChart, type FunnelChartProps } from './FunnelChart';

// Wrap the real tooltip so tests can read the `point` it was given.
vi.mock('../Chart/ChartTooltip', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../Chart/ChartTooltip')>();
  return { ...mod, ChartTooltip: vi.fn(mod.ChartTooltip) };
});

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

  it('defaults to a horizontal taper funnel; shape="sharp" is reflected', () => {
    stubLayout();
    const { rerender } = renderFunnel();
    const fig = screen.getByRole('figure');
    expect(fig).toHaveAttribute('data-orientation', 'horizontal');
    expect(fig).toHaveAttribute('data-shape', 'taper');
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
  });

  it('colours stages with the one-hue ramp, first stage at full strength', () => {
    const layout = stubLayout();
    renderFunnel();
    layout.fire();
    const colorOf = (el: Element) =>
      (el as HTMLElement | SVGElement).style.getPropertyValue('--chart-series-color');
    const ramp = (t: number) =>
      `color-mix(in oklab, var(--funnel-chart-ramp-color), var(--funnel-chart-ramp-target) calc(var(--funnel-chart-ramp-max-mix) * ${t}))`;
    expect(stageGroups().map(colorOf)).toEqual([0, 0.25, 0.5, 0.75, 1].map(ramp));
    expect(colorOf(document.querySelector('[data-stage-cell="w"]')!)).toBe(ramp(1));
  });

  it('a stage `color` overrides the ramp with that palette slot, in the tooltip too', () => {
    const layout = stubLayout();
    renderFunnel({ stages: stages.map((s) => (s.key === 'w' ? { ...s, color: 3 as const } : s)) });
    layout.fire();
    const won = document.querySelector<SVGElement>('[data-stage="w"]')!;
    expect(won.style.getPropertyValue('--chart-series-color')).toBe('var(--chart-series-3)');
    fireEvent.pointerMove(screen.getByRole('group', { name: 'Pipeline' }), {
      clientX: 450,
      pointerType: 'mouse',
    });
    const swatch = tooltip()!.querySelector<HTMLElement>('[style]')!;
    expect(swatch.style.getPropertyValue('--chart-series-color')).toBe('var(--chart-series-3)');
  });

  it('hero: the first band holds its value and label; its footer cell stays empty', () => {
    const layout = stubLayout();
    renderFunnel({ onStageClick: vi.fn() });
    layout.fire();
    const hero = document.querySelector('[data-stage="l"] [data-hero]')!;
    expect(hero.textContent).toBe('1,240Leads');
    const first = document.querySelector('[data-stage-cell="l"]')!;
    expect(first.textContent).toBe('');
    // Still a button with the full name.
    expect(screen.getByRole('button', { name: /^Leads: 1,240\. 100% of Leads\.$/ })).toBe(first);
  });

  it('hero: falls back to the footer when the first band is too short', () => {
    const layout = stubLayout(500, 40);
    renderFunnel();
    layout.fire();
    expect(document.querySelector('[data-hero]')).toBeNull();
    expect(document.querySelector('[data-stage-cell="l"]')!.textContent).toBe('1,240Leads');
  });

  it('hero: skipped when the first stage has a `color` slot (its contrast is only checked on the ramp)', () => {
    const layout = stubLayout();
    renderFunnel({ stages: stages.map((s, i) => (i === 0 ? { ...s, color: 3 as const } : s)) });
    layout.fire();
    expect(document.querySelector('[data-hero]')).toBeNull();
    expect(document.querySelector('[data-stage-cell="l"]')!.textContent).toBe('1,240Leads');
  });

  it('hero: the empty first button moves its focus ring to the band', () => {
    const layout = stubLayout();
    renderFunnel({ onStageClick: vi.fn() });
    layout.fire();
    expect(document.querySelector('[data-stage-cell="l"]')).toHaveAttribute('data-hero-cell');
    expect(document.querySelector('[data-stage="l"]')).toHaveAttribute('data-hero-stage');
    expect(document.querySelector('[data-stage-cell="q"]')).not.toHaveAttribute('data-hero-cell');
  });

  it('hero: falls back to the footer when the value is too wide for the column', () => {
    const layout = stubLayout();
    renderFunnel({ formatValue: (n) => `${n.toLocaleString('en-GB')} opportunities` });
    layout.fire();
    expect(document.querySelector('[data-hero]')).toBeNull();
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
    expect(document.querySelector('[data-stage="l"] rect')).toBeNull();
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

  it('does not warn for more than 8 stages (the ramp never runs out)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderFunnel({
      stages: Array.from({ length: 9 }, (_, i) => ({ key: `s${i}`, label: `S${i}`, value: 9 - i })),
    });
    expect(warn).not.toHaveBeenCalled();
  });
  describe('clickable stages', () => {
    it('renders one named button per stage; clicking passes the original stage and index', async () => {
      const layout = stubLayout();
      const onStageClick = vi.fn();
      renderFunnel({ onStageClick });
      layout.fire();
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5);
      const won = screen.getByRole('button', {
        name: /^Won: 50\. 40% of Negotiation\. 4% of Leads\.$/,
      });
      expect(won).toHaveAttribute('type', 'button');
      expect(won).toHaveAttribute('data-stage-cell', 'w');
      expect(screen.getByRole('button', { name: /^Leads: 1,240\. 100% of Leads\.$/ })).toBe(
        buttons[0],
      );
      await userEvent.click(won);
      expect(onStageClick).toHaveBeenCalledTimes(1);
      expect(onStageClick.mock.calls[0][0]).toBe(stages[4]);
      expect(onStageClick.mock.calls[0][1]).toBe(4);
      const plot = screen.getByRole('group', { name: 'Pipeline' });
      expect(plot).not.toHaveAttribute('tabindex');
      expect(plot).not.toHaveAccessibleDescription();
    });

    it('omits undefined ratios from the button name', () => {
      stubLayout();
      renderFunnel({
        onStageClick: vi.fn(),
        stages: [
          { key: 'a', label: 'A', value: 0 },
          { key: 'b', label: 'B', value: 5 },
        ],
      });
      expect(screen.getByRole('button', { name: /^A: 0\.$/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^B: 5\.$/ })).toBeInTheDocument();
    });

    it('Tab focuses the first button and activates its stage; Enter and Space click', async () => {
      const layout = stubLayout();
      const onStageClick = vi.fn();
      renderFunnel({ onStageClick });
      layout.fire();
      await userEvent.tab();
      expect(screen.getAllByRole('button')[0]).toHaveFocus();
      expect(document.querySelector('[data-stage="l"]')).not.toHaveAttribute('data-dimmed');
      expect(stageGroups().filter((g) => g.hasAttribute('data-dimmed'))).toHaveLength(4);
      expect(tooltip()).toHaveTextContent('Leads');
      await userEvent.keyboard('{Enter}');
      await userEvent.keyboard(' ');
      expect(onStageClick).toHaveBeenCalledTimes(2);
      expect(onStageClick).toHaveBeenNthCalledWith(1, stages[0], 0);
      expect(onStageClick).toHaveBeenNthCalledWith(2, stages[0], 0);
    });

    it('Escape on a focused stage button dismisses the tooltip and keeps focus', async () => {
      const layout = stubLayout();
      const onActiveStageChange = vi.fn();
      renderFunnel({ onStageClick: vi.fn(), onActiveStageChange });
      layout.fire();
      await userEvent.tab();
      const first = screen.getAllByRole('button')[0];
      expect(tooltip()).not.toBeNull();
      expect(fireEvent.keyDown(first, { key: 'Escape' })).toBe(false); // handled: preventDefault
      expect(tooltip()).toBeNull();
      expect(stageGroups().some((g) => g.hasAttribute('data-dimmed'))).toBe(false);
      expect(onActiveStageChange).toHaveBeenLastCalledWith(null);
      expect(first).toHaveFocus();
      // Nothing active: Escape is left for a surrounding dialog.
      expect(fireEvent.keyDown(first, { key: 'Escape' })).toBe(true);
    });

    it('a pointer click on the shapes strip clicks the stage under it', () => {
      const layout = stubLayout();
      const onStageClick = vi.fn();
      renderFunnel({ onStageClick });
      layout.fire();
      const strip = document.querySelector('svg')!.parentElement!;
      fireEvent.click(strip, { clientX: 450 });
      expect(onStageClick).toHaveBeenCalledTimes(1);
      expect(onStageClick.mock.calls[0][0]).toBe(stages[4]);
      expect(onStageClick.mock.calls[0][1]).toBe(4);
    });

    it('without onStageClick there are no buttons and cells are plain elements', () => {
      stubLayout();
      renderFunnel();
      expect(screen.queryAllByRole('button')).toHaveLength(0);
      expect(document.querySelector('[data-stage-cell="w"]')!.tagName).toBe('DIV');
    });
  });

  // Read-only: the visible cells are aria-hidden, so screen readers get each stage once (the table).
  describe.each([
    ['horizontal', 500],
    ['vertical', 5 * 96 - 1],
  ])('%s: stage text is announced once', (_o, width) => {
    const outsideTable = (text: string) =>
      screen
        .queryAllByText(text)
        .filter((el) => !el.closest('table') && !el.closest('[aria-hidden="true"]'));

    it('read-only: only the data table exposes stage labels and values', () => {
      const layout = stubLayout(width, 240);
      renderFunnel();
      layout.fire();
      for (const s of stages) {
        expect(outsideTable(s.label)).toEqual([]);
        expect(outsideTable(s.value.toLocaleString('en-GB'))).toEqual([]);
      }
      expect(screen.getByRole('rowheader', { name: 'Won' })).toBeInTheDocument();
    });

    it('clickable: cells stay named buttons, not hidden', () => {
      const layout = stubLayout(width, 240);
      renderFunnel({ onStageClick: vi.fn() });
      layout.fire();
      const won = screen.getByRole('button', { name: /^Won: 50\. / });
      expect(won).not.toHaveAttribute('aria-hidden');
    });
  });

  describe('onActiveStageChange', () => {
    it('fires with the original stage on hover, null on leave, once per change', () => {
      const layout = stubLayout();
      const onActiveStageChange = vi.fn();
      renderFunnel({ onActiveStageChange });
      layout.fire();
      expect(onActiveStageChange).not.toHaveBeenCalled();
      const plot = screen.getByRole('group', { name: 'Pipeline' });
      fireEvent.pointerMove(plot, { clientX: 150, pointerType: 'mouse' });
      expect(onActiveStageChange).toHaveBeenCalledTimes(1);
      expect(onActiveStageChange.mock.calls[0][0]).toBe(stages[1]);
      fireEvent.pointerMove(plot, { clientX: 160, pointerType: 'mouse' });
      expect(onActiveStageChange).toHaveBeenCalledTimes(1);
      fireEvent.pointerLeave(plot, { pointerType: 'mouse' });
      expect(onActiveStageChange).toHaveBeenCalledTimes(2);
      expect(onActiveStageChange).toHaveBeenLastCalledWith(null);
    });

    it('fires for keyboard inspection in read-only mode', async () => {
      const layout = stubLayout();
      const onActiveStageChange = vi.fn();
      renderFunnel({ onActiveStageChange });
      layout.fire();
      screen.getByRole('group', { name: 'Pipeline' }).focus();
      await userEvent.keyboard('{ArrowRight}');
      expect(onActiveStageChange).toHaveBeenCalledTimes(1);
      expect(onActiveStageChange.mock.calls[0][0]).toBe(stages[0]);
    });

    it('fires for button focus in clickable mode, without a null in between', async () => {
      const layout = stubLayout();
      const onActiveStageChange = vi.fn();
      renderFunnel({ onActiveStageChange, onStageClick: vi.fn() });
      layout.fire();
      await userEvent.tab();
      await userEvent.tab();
      expect(onActiveStageChange.mock.calls.map((c) => c[0])).toEqual([stages[0], stages[1]]);
      await userEvent.tab();
      await userEvent.tab();
      await userEvent.tab();
      await userEvent.tab();
      expect(onActiveStageChange).toHaveBeenLastCalledWith(null);
    });

    it('does not re-fire when rerendered with a new array holding the same data', () => {
      const layout = stubLayout();
      const onActiveStageChange = vi.fn();
      const { rerender } = renderFunnel({ onActiveStageChange });
      layout.fire();
      fireEvent.pointerMove(screen.getByRole('group', { name: 'Pipeline' }), {
        clientX: 150,
        pointerType: 'mouse',
      });
      expect(onActiveStageChange).toHaveBeenCalledTimes(1);
      rerender(
        <LocaleProvider locale="en-GB">
          <FunnelChart
            {...base}
            stages={stages.map((s) => ({ ...s }))}
            onActiveStageChange={(s) => onActiveStageChange(s)}
          />
        </LocaleProvider>,
      );
      expect(onActiveStageChange).toHaveBeenCalledTimes(1);
    });

    it('clears when the active stage is removed', async () => {
      const layout = stubLayout();
      const onActiveStageChange = vi.fn();
      const { rerender } = renderFunnel({ onActiveStageChange });
      layout.fire();
      screen.getByRole('group', { name: 'Pipeline' }).focus();
      await userEvent.keyboard('{End}');
      expect(onActiveStageChange).toHaveBeenLastCalledWith(stages[4]);
      rerender(
        <LocaleProvider locale="en-GB">
          <FunnelChart
            {...base}
            stages={stages.slice(0, 3)}
            onActiveStageChange={onActiveStageChange}
          />
        </LocaleProvider>,
      );
      expect(onActiveStageChange).toHaveBeenLastCalledWith(null);
      expect(onActiveStageChange).toHaveBeenCalledTimes(2);
      expect(tooltip()).toBeNull();
      expect(stageGroups().some((g) => g.hasAttribute('data-dimmed'))).toBe(false);

      // Growing back must not revive the stale index without a user action.
      rerender(
        <LocaleProvider locale="en-GB">
          <FunnelChart {...base} stages={stages} onActiveStageChange={onActiveStageChange} />
        </LocaleProvider>,
      );
      expect(onActiveStageChange).toHaveBeenCalledTimes(2);
      expect(tooltip()).toBeNull();
      expect(stageGroups().some((g) => g.hasAttribute('data-dimmed'))).toBe(false);
    });
  });

  describe('vertical layout', () => {
    const NARROW = 5 * 96 - 1;
    const six = [...stages, { key: 'x', label: 'Extra', value: 10 }];

    it('switches below the min width per stage: one row per stage, each with its own band', () => {
      const layout = stubLayout(NARROW, 300);
      renderFunnel();
      layout.fire();
      expect(screen.getByRole('figure')).toHaveAttribute('data-orientation', 'vertical');
      const rows = document.querySelectorAll('[data-stage-cell]');
      expect(rows).toHaveLength(5);
      rows.forEach((row) => expect(row.querySelectorAll('[data-band] svg path')).toHaveLength(1));
      const won = rows[4];
      expect(won).toHaveTextContent('Won');
      expect(won).toHaveTextContent('50');
      expect(won).toHaveTextContent('40%');
      // No pill on the first stage.
      expect(rows[0]).not.toHaveTextContent('%');
    });

    it('is a table-like grid: aria-hidden header, then swatch, label, value and pill per row', () => {
      const layout = stubLayout(NARROW, 300);
      renderFunnel();
      layout.fire();
      const header = document.querySelector('[data-funnel-header]')!;
      expect(header).toHaveAttribute('aria-hidden', 'true');
      expect([...header.children].map((c) => c.textContent)).toEqual([
        '',
        '',
        'Stage',
        'Value',
        'vs previous',
      ]);
      const rows = document.querySelectorAll('[data-stage-cell]');
      rows.forEach((row) => expect(row.querySelector('[data-swatch]')).not.toBeNull());
      expect(rows[0].textContent).toBe('Leads1,240—');
      expect(rows[4].textContent).toBe('Won5040%');
    });

    it('the switch follows the stage count', () => {
      const layout = stubLayout(5 * 96, 300);
      const { rerender } = renderFunnel();
      layout.fire();
      const fig = screen.getByRole('figure');
      expect(fig).toHaveAttribute('data-orientation', 'horizontal');
      rerender(
        <LocaleProvider locale="en-GB">
          <FunnelChart {...base} stages={six} />
        </LocaleProvider>,
      );
      expect(fig).toHaveAttribute('data-orientation', 'vertical');
    });

    const bandPaths = () =>
      [...document.querySelectorAll('[data-stage-cell] [data-band] path')].map(
        (p) => p.getAttribute('d')!,
      );

    it('rows are slices of the funnel, flowing top to bottom', () => {
      const layout = stubLayout(NARROW, 300);
      renderFunnel();
      layout.fire();
      const bands = document.querySelectorAll('[data-stage-cell] [data-band] svg');
      bands.forEach((svg, i) => {
        expect(svg).toHaveAttribute('viewBox', `0 ${100 * i} 100 100`);
        expect(svg).toHaveAttribute('preserveAspectRatio', 'none');
      });
      const d = bandPaths();
      expect(d).toHaveLength(5);
      // Taper by default: every stage but the last holds, then narrows (a six-point outline).
      const points = (p: string) => p.split(/[ML]/).filter((x) => x.trim()).length;
      d.slice(0, -1).forEach((p) => expect(points(p)).toBe(6));
      expect(points(d.at(-1)!)).toBe(4);
    });

    it('follows shape="sharp": straight trapezoids', () => {
      const layout = stubLayout(NARROW, 300);
      renderFunnel({ shape: 'sharp' });
      layout.fire();
      const d = bandPaths();
      expect(d).toHaveLength(5);
      d.forEach((p) => expect(p.split(/[ML]/).filter((x) => x.trim())).toHaveLength(4));
    });

    it('read-only: ArrowDown/ArrowUp inspect stages; Escape dismisses', async () => {
      const layout = stubLayout(NARROW, 300);
      renderFunnel();
      layout.fire();
      const plot = screen.getByRole('group', { name: 'Pipeline' });
      plot.focus();
      await userEvent.keyboard('{ArrowDown}');
      await act(async () => {
        await new Promise((r) => setTimeout(r, PAST_ANNOUNCE_DELAY_MS));
      });
      expect(tooltip()).toHaveTextContent('Leads');
      expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent('Leads');
      expect(document.querySelector('[data-stage-cell="q"]')).toHaveAttribute('data-dimmed');
      await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}');
      expect(tooltip()).toHaveTextContent('Qualified');
      await userEvent.keyboard('{Escape}');
      expect(tooltip()).toBeNull();
    });

    it('hovering a row activates its stage', () => {
      const layout = stubLayout(NARROW, 300);
      renderFunnel();
      layout.fire();
      fireEvent.pointerEnter(document.querySelector('[data-stage-cell="p"]')!, {
        pointerType: 'mouse',
      });
      expect(tooltip()).toHaveTextContent('Proposal');
      fireEvent.pointerLeave(screen.getByRole('group', { name: 'Pipeline' }), {
        pointerType: 'mouse',
      });
      expect(tooltip()).toBeNull();
    });

    it('moving from a row onto the header clears the active stage', () => {
      const layout = stubLayout(NARROW, 300);
      renderFunnel();
      layout.fire();
      fireEvent.pointerEnter(document.querySelector('[data-stage-cell="w"]')!, {
        pointerType: 'mouse',
      });
      expect(tooltip()).toHaveTextContent('Won');
      fireEvent.pointerEnter(document.querySelector('[data-funnel-header]')!, {
        pointerType: 'mouse',
      });
      expect(tooltip()).toBeNull();
    });

    it('anchors the tooltip at the band top centre, relative to the plot, and follows scroll', () => {
      const layout = stubLayout(NARROW, 300);
      renderFunnel();
      layout.fire();
      const plot = screen.getByRole('group', { name: 'Pipeline' });
      let scrolled = 0;
      const rect = (left: number, top: number, width: number, height: number) =>
        ({
          x: left,
          y: top,
          left,
          top,
          width,
          height,
          right: left + width,
          bottom: top + height,
        }) as DOMRect;
      vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockImplementation(function (
        this: HTMLElement,
      ) {
        if (this === plot) return rect(10, 20, NARROW, 300);
        if (this.hasAttribute('data-band')) return rect(30, 100 - scrolled, 40, 8);
        return rect(0, 0, NARROW, 300);
      });
      const lastPoint = () => vi.mocked(ChartTooltip).mock.lastCall![0].point;
      fireEvent.pointerEnter(document.querySelector('[data-stage-cell="q"]')!, {
        pointerType: 'mouse',
      });
      expect(lastPoint()).toEqual({ x: 40, y: 80 });
      scrolled = 30;
      fireEvent.scroll(plot);
      expect(lastPoint()).toEqual({ x: 40, y: 50 });
    });

    it('clickable: Escape on a focused row dismisses; ArrowDown/ArrowUp are not handled', async () => {
      const layout = stubLayout(NARROW, 300);
      const onActiveStageChange = vi.fn();
      renderFunnel({ onStageClick: vi.fn(), onActiveStageChange });
      layout.fire();
      await userEvent.tab();
      const first = screen.getAllByRole('button')[0];
      expect(tooltip()).toHaveTextContent('Leads');
      expect(fireEvent.keyDown(first, { key: 'ArrowDown' })).toBe(true); // not prevented
      expect(fireEvent.keyDown(first, { key: 'ArrowUp' })).toBe(true);
      expect(tooltip()).toHaveTextContent('Leads');
      expect(onActiveStageChange).toHaveBeenCalledTimes(1);
      expect(fireEvent.keyDown(first, { key: 'Escape' })).toBe(false);
      expect(tooltip()).toBeNull();
      expect(onActiveStageChange).toHaveBeenLastCalledWith(null);
      expect(first).toHaveFocus();
    });

    it('clickable: clicking the Proposal row calls onStageClick', async () => {
      const layout = stubLayout(NARROW, 300);
      const onStageClick = vi.fn();
      renderFunnel({ onStageClick });
      layout.fire();
      await userEvent.click(screen.getByRole('button', { name: /^Proposal:/ }));
      expect(onStageClick).toHaveBeenCalledTimes(1);
      expect(onStageClick.mock.calls[0][0]).toBe(stages[2]);
      expect(onStageClick.mock.calls[0][1]).toBe(2);
    });
  });
});
