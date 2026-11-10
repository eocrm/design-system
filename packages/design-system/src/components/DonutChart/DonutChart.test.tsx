import { createRef, type MouseEvent, type ReactElement, type RefAttributes } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { DonutChart, type DonutChartProps } from './DonutChart';

// LiveRegion writes after ANNOUNCE_DELAY_MS (50ms); wait past it or "empty" assertions pass vacuously.
const PAST_ANNOUNCE_DELAY_MS = 120;

function stubLayout(width = 400, height = 200) {
  class MockResizeObserver {
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
}

beforeEach(() => stubLayout());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const segments = [
  { key: 'todo', label: 'To do', value: 12 },
  { key: 'doing', label: 'In progress', value: 5, color: 3 as const },
  { key: 'done', label: 'Done', value: 30, color: 2 as const },
];

const base: DonutChartProps = { label: 'Work items', segments, formatValue: (n) => String(n) };

const renderDonut = (props: Partial<DonutChartProps & RefAttributes<HTMLElement>> = {}) =>
  render(
    <LocaleProvider locale="en-GB">
      <DonutChart {...base} {...props} />
    </LocaleProvider>,
  );

const arcs = () => [...document.querySelectorAll('path[data-segment]')];
const centerValue = () => document.querySelector('[data-center-value]')?.textContent;
const centerCaption = () => document.querySelector('[data-center-caption]')?.textContent;
const live = () => document.querySelector('[role="status"]')!;
const plot = () => screen.getByRole('group', { name: 'Work items' });
const activeKey = () => document.querySelector('path[data-active]')?.getAttribute('data-segment');
const wait = () => act(() => new Promise((r) => setTimeout(r, PAST_ANNOUNCE_DELAY_MS)));

describe('DonutChart', () => {
  it('is a named figure, forwards ref to the <figure> and merges className', () => {
    const ref = createRef<HTMLElement>();
    renderDonut({ ref, className: 'mine' });
    const fig = screen.getByRole('figure', { name: 'Work items' });
    expect(fig.tagName).toBe('FIGURE');
    expect(ref.current).toBe(fig);
    expect(fig).toHaveClass('mine');
  });

  it('draws one arc per segment with its slot, and the plot is a described tab stop', () => {
    renderDonut();
    expect(arcs().map((a) => a.getAttribute('data-segment'))).toEqual(['todo', 'doing', 'done']);
    // Free slots fill around the pinned ones (assignSlots): todo gets 1.
    expect(arcs().map((a) => a.getAttribute('data-slot'))).toEqual(['1', '3', '2']);
    expect(plot()).toHaveAttribute('tabindex', '0');
    expect(plot()).toHaveAccessibleDescription(
      'Use arrow keys to inspect segments. The data table lists every value.',
    );
  });

  it('shows the total with centerLabel, the "Total" default, and nothing with showTotal={false}', () => {
    const { unmount } = renderDonut({ centerLabel: 'work items' });
    expect(centerValue()).toBe('47');
    expect(centerCaption()).toBe('work items');
    unmount();
    const r2 = renderDonut();
    expect(centerCaption()).toBe('Total');
    r2.unmount();
    renderDonut({ showTotal: false });
    expect(document.querySelector('[data-center-value]')).toBeNull();
  });

  it('inspects a segment from the keyboard: centre, data-active and the live region', async () => {
    renderDonut();
    plot().focus();
    fireEvent.keyDown(plot(), { key: 'ArrowRight' });
    expect(centerValue()).toBe('12');
    expect(centerCaption()).toContain('25.5%');
    expect(centerCaption()).toContain('To do');
    expect(activeKey()).toBe('todo');
    await wait();
    expect(live()).toHaveTextContent('To do: 12, 25.5%');
    fireEvent.keyDown(plot(), { key: 'ArrowLeft' });
    expect(activeKey()).toBe('done'); // wraps backwards
  });

  it('skips zero segments, wraps, activates with Enter and clears with Escape', () => {
    const onSegmentClick = vi.fn();
    const segs = [
      { key: 'a', label: 'A', value: 5 },
      { key: 'b', label: 'B', value: 0 },
      { key: 'c', label: 'C', value: 3 },
    ];
    renderDonut({ segments: segs, onSegmentClick });
    expect(arcs().map((a) => a.getAttribute('data-segment'))).toEqual(['a', 'c']);
    fireEvent.keyDown(plot(), { key: 'ArrowRight' });
    expect(activeKey()).toBe('a');
    fireEvent.keyDown(plot(), { key: 'ArrowRight' });
    expect(activeKey()).toBe('c');
    fireEvent.keyDown(plot(), { key: 'Enter' });
    expect(onSegmentClick).toHaveBeenCalledWith(segs[2]);
    fireEvent.keyDown(plot(), { key: 'ArrowRight' });
    expect(activeKey()).toBe('a');
    fireEvent.keyDown(plot(), { key: 'Escape' });
    expect(activeKey()).toBeUndefined();
    expect(centerValue()).toBe('8');
  });

  it('hovering an arc inspects it; clicking it calls onSegmentClick', () => {
    const onSegmentClick = vi.fn();
    renderDonut({ onSegmentClick });
    fireEvent.pointerEnter(arcs()[2]);
    expect(activeKey()).toBe('done');
    expect(centerValue()).toBe('30');
    expect(document.querySelector('[data-chart-tooltip]')).toHaveTextContent('Done');
    fireEvent.click(arcs()[2]);
    expect(onSegmentClick).toHaveBeenCalledWith(segments[2]);
  });

  it('legend entries are buttons only for drawn segments with onSegmentClick', async () => {
    const onSegmentClick = vi.fn();
    const segs = [...segments, { key: 'none', label: 'Cancelled', value: 0 }];
    const { unmount } = renderDonut({ segments: segs, onSegmentClick });
    const legend = screen.getByRole('list');
    const buttons = within(legend).getAllByRole('button');
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'To do: 12, 25.5%',
      'In progress: 5, 10.6%',
      'Done: 30, 63.8%',
    ]);
    expect(legend.querySelectorAll('li')).toHaveLength(4);
    expect(within(legend).getByText('Cancelled').closest('button')).toBeNull();
    await userEvent.click(buttons[1]);
    expect(onSegmentClick).toHaveBeenCalledWith(segs[1]);
    unmount();
    renderDonut();
    expect(document.querySelector('ul button')).toBeNull();
  });

  it('lists every segment, including zero ones, in the data table', () => {
    renderDonut({ segments: [...segments, { key: 'z', label: 'Zero', value: 0 }] });
    const table = screen.getByRole('table', { name: 'Work items' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Segment', 'Value', 'Share']);
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((r) => r.textContent)).toEqual([
      'To do1225.5%',
      'In progress510.6%',
      'Done3063.8%',
      'Zero00%',
    ]);
  });

  it('shows the empty state when every value is 0', () => {
    const zero = segments.map((s) => ({ ...s, value: 0 }));
    const { unmount } = renderDonut({ segments: zero });
    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(arcs()).toHaveLength(0);
    unmount();
    renderDonut({ segments: [], emptyMessage: 'Nothing yet', footnote: 'Open items' });
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
    expect(screen.getByText('Open items')).toBeInTheDocument();
  });

  it('keeps the live region rendered while idle', async () => {
    renderDonut();
    await wait();
    expect(live()).toBeInTheDocument();
    expect(live()).toHaveTextContent('');
  });

  it('warns in dev for invalid values and for more than 8 segments', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderDonut({ segments: [...segments, { key: 'neg', label: 'Neg', value: -1 }] });
    expect(warn).toHaveBeenCalledWith(
      '[DonutChart] Ignored non-finite or negative value for segment(s) neg: counted as 0.',
    );
    warn.mockClear();
    renderDonut({
      segments: Array.from({ length: 9 }, (_, i) => ({ key: `s${i}`, label: `S${i}`, value: 1 })),
    });
    expect(warn).toHaveBeenCalledWith(
      '[DonutChart] More than 8 segments: colours repeat. Group the smallest into "Other".',
    );
    expect(warn).toHaveBeenCalledTimes(1);
  });
  it('describes the ring with the activate hint only when segments are activatable', () => {
    const hint = 'Press Enter to open the selected segment.';
    const { unmount } = renderDonut();
    expect(plot()).not.toHaveAccessibleDescription(expect.stringContaining(hint));
    unmount();
    renderDonut({ onSegmentClick: vi.fn() });
    expect(plot()).toHaveAccessibleDescription(expect.stringContaining(hint));
  });

  it('reads --donut-thickness / --donut-gap in px or rem (16px root in jsdom)', () => {
    const ring = (thickness: string, gap: string) => {
      const { unmount } = render(
        <div style={{ '--donut-thickness': thickness, '--donut-gap': gap } as React.CSSProperties}>
          <DonutChart {...base} />
        </div>,
      );
      const d = arcs().map((a) => a.getAttribute('d'));
      unmount();
      return d;
    };
    const px = ring('24px', '2px');
    expect(ring('1.5rem', '0.125rem')).toEqual(px);
    expect(ring('3rem', '0.125rem')).not.toEqual(px);
    // Unsupported units fall back to the 24px / 2px defaults.
    expect(ring('calc(1px + 1px)', '2em')).toEqual(ring('', ''));
  });

  it('hides a read-only legend whole, and only zero-value items of a clickable one', () => {
    const segs = [...segments, { key: 'none', label: 'Cancelled', value: 0 }];
    const { unmount } = renderDonut({ segments: segs });
    // Read-only: the table is the screen reader's copy, so no list of blank items.
    expect(document.querySelector('ul')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByRole('list')).toBeNull();
    unmount();
    renderDonut({ segments: segs, onSegmentClick: vi.fn() });
    const list = screen.getByRole('list');
    expect(list).not.toHaveAttribute('aria-hidden');
    expect(screen.getByText('Cancelled', { selector: 'ul span' }).closest('li')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(within(list).getAllByRole('listitem')).toHaveLength(segments.length);
    expect(screen.getByRole('button', { name: /^To do/ }).closest('[aria-hidden]')).toBeNull();
  });

  it('keeps the keyboard segment as the Enter/Space target while another is hovered', async () => {
    const onSegmentClick = vi.fn();
    renderDonut({ onSegmentClick });
    plot().focus();
    fireEvent.keyDown(plot(), { key: 'ArrowRight' }); // todo
    fireEvent.pointerEnter(arcs()[2], { pointerType: 'mouse' });
    expect(activeKey()).toBe('done'); // hover shows
    expect(centerValue()).toBe('30');
    await wait();
    expect(live()).toHaveTextContent('To do: 12, 25.5%'); // announcement unchanged
    fireEvent.keyDown(plot(), { key: 'Enter' });
    expect(onSegmentClick).toHaveBeenLastCalledWith(segments[0]);
    fireEvent.keyDown(plot(), { key: ' ' });
    expect(onSegmentClick).toHaveBeenCalledTimes(2);
    expect(onSegmentClick).toHaveBeenLastCalledWith(segments[0]);
    // Pointer leave clears only the hover: the keyboard segment shows again and roving continues from it.
    fireEvent.pointerLeave(plot(), { pointerType: 'mouse' });
    expect(activeKey()).toBe('todo');
    fireEvent.keyDown(plot(), { key: 'ArrowRight' });
    expect(activeKey()).toBe('doing');
  });

  it('pointer leave clears a hover', () => {
    renderDonut();
    fireEvent.pointerEnter(arcs()[1], { pointerType: 'mouse' });
    expect(activeKey()).toBe('doing');
    fireEvent.pointerLeave(plot(), { pointerType: 'mouse' });
    expect(activeKey()).toBeUndefined();
    expect(centerValue()).toBe('47');
  });

  it('keeps the active segment by key when segments are reordered', () => {
    const { rerender } = renderDonut();
    fireEvent.keyDown(plot(), { key: 'ArrowRight' });
    fireEvent.keyDown(plot(), { key: 'ArrowRight' });
    expect(activeKey()).toBe('doing');
    rerender(
      <LocaleProvider locale="en-GB">
        <DonutChart {...base} segments={[segments[1], segments[0], segments[2]]} />
      </LocaleProvider>,
    );
    expect(activeKey()).toBe('doing');
    expect(centerValue()).toBe('5');
  });

  describe('segment links', () => {
    const linked = () => {
      const onLinkClick = vi.fn((e: MouseEvent) => e.preventDefault());
      const segs = [
        { ...segments[0], link: <a href="/items?s=todo" onClick={onLinkClick} /> },
        segments[1],
        { ...segments[2], link: <a href="/items?s=done" className="mine" /> },
      ];
      return { onLinkClick, segs };
    };
    const linkFor = (key: string) =>
      document.querySelector<HTMLAnchorElement>(`[data-segment-link="${key}"]`)!;

    it('renders a linked legend entry as the link, with href, summary name and merged className', () => {
      const { segs } = linked();
      renderDonut({ segments: segs });
      const legend = screen.getByRole('list');
      expect(legend).not.toHaveAttribute('aria-hidden');
      const links = within(legend).getAllByRole('link');
      expect(links.map((l) => l.getAttribute('href'))).toEqual(['/items?s=todo', '/items?s=done']);
      expect(links[0]).toHaveAccessibleName('To do: 12, 25.5%');
      expect(links[1]).toHaveClass('mine');
      expect(within(legend).queryByRole('button')).toBeNull(); // no onSegmentClick
      expect(plot()).toHaveAccessibleDescription(
        expect.stringContaining('Press Enter to open the selected segment.'),
      );
    });

    it('Enter on the ring and an arc click follow the link (with modifiers), and onSegmentClick still fires', () => {
      const { onLinkClick, segs } = linked();
      const onSegmentClick = vi.fn();
      renderDonut({ segments: segs, onSegmentClick });
      fireEvent.keyDown(plot(), { key: 'ArrowRight' });
      fireEvent.keyDown(plot(), { key: 'Enter' });
      expect(onLinkClick).toHaveBeenCalledTimes(1);
      expect(onSegmentClick).toHaveBeenLastCalledWith(segs[0]);
      fireEvent.click(arcs()[0], { ctrlKey: true });
      expect(onLinkClick).toHaveBeenCalledTimes(2);
      expect(onLinkClick.mock.calls[1][0].ctrlKey).toBe(true);
      expect(onSegmentClick).toHaveBeenCalledTimes(2);
      // Unlinked segment keeps the plain onSegmentClick path.
      fireEvent.click(arcs()[1]);
      expect(onSegmentClick).toHaveBeenLastCalledWith(segs[1]);
      expect(onLinkClick).toHaveBeenCalledTimes(2);
      expect(linkFor('doing')).toBeNull();
    });

    it('arc click follows a link without onSegmentClick', () => {
      const { onLinkClick, segs } = linked();
      renderDonut({ segments: segs });
      fireEvent.click(arcs()[0]);
      expect(onLinkClick).toHaveBeenCalledTimes(1);
    });

    it('warns in dev for a non-element or non-empty link', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      renderDonut({
        segments: [
          { ...segments[0], link: <a href="/x">text</a> },
          { ...segments[1], link: '/y' as unknown as ReactElement },
          segments[2],
        ],
      });
      expect(warn).toHaveBeenCalledWith(
        '[DonutChart] `link` must be an empty element; its children are replaced for segment(s) todo.',
      );
      expect(warn).toHaveBeenCalledWith(
        '[DonutChart] `link` must be a React element (e.g. <a href> or a router Link); ignored for segment(s) doing.',
      );
      expect(linkFor('todo')).toHaveTextContent('To do');
      expect(linkFor('doing')).toBeNull();
    });
  });
});
