import { createRef, useRef, useState, type Ref } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TreeView, type TreeViewChildren, type TreeViewNode, type TreeViewProps } from '.';

const n = (id: string, hasChildren = false): TreeViewNode => ({ id, label: id, hasChildren });
const data: Record<string, TreeViewChildren> = {
  Company: [n('Sales', true), n('Support', true)],
  Sales: [n('Team A'), n('Team B')],
};

function Harness(
  props: Partial<TreeViewProps> & { initial?: string[]; ref?: Ref<HTMLDivElement> },
) {
  const { initial = [], ...rest } = props;
  const [expanded, setExpanded] = useState(() => new Set(initial));
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <TreeView
      aria-label="Structure"
      roots={[n('Company', true), n('Other')]}
      childrenOf={(id) => data[id]}
      expandedIds={expanded}
      onExpandedChange={(id, open) =>
        setExpanded((prev) => {
          const next = new Set(prev);
          if (open) next.add(id);
          else next.delete(id);
          return next;
        })
      }
      selectedId={selected}
      onSelect={setSelected}
      {...rest}
    />
  );
}
const item = (name: string) => screen.getByRole('treeitem', { name });
// Selection / activation is wired to the row (the treeitem's first child), not the whole treeitem.
const row = (name: string) => item(name).firstElementChild!;

describe('TreeView', () => {
  it('is a named tree, forwards ref, merges className, keeps its role over a consumer role', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Harness ref={ref} className="mine" role="list" data-testid="t" />);
    const tree = screen.getByRole('tree', { name: 'Structure' });
    expect(tree).toBe(ref.current);
    expect(tree.className).toMatch(/mine/);
    expect(tree).toHaveAttribute('data-testid', 't');
    expect(tree).toHaveAttribute('data-view', 'list');
  });

  it('renders levels, set positions, expanded state and nested groups', () => {
    render(<Harness initial={['Company', 'Sales']} />);
    expect(item('Company')).toHaveAttribute('aria-level', '1');
    expect(item('Company')).toHaveAttribute('aria-expanded', 'true');
    expect(item('Support')).toHaveAttribute('aria-expanded', 'false');
    expect(item('Other')).not.toHaveAttribute('aria-expanded');
    expect(item('Team B')).toHaveAttribute('aria-level', '3');
    expect(item('Team B')).toHaveAttribute('aria-setsize', '2');
    expect(item('Team B')).toHaveAttribute('aria-posinset', '2');
    const group = within(item('Sales')).getByRole('group');
    expect(
      within(group)
        .getAllByRole('treeitem')
        .map((el) => el.getAttribute('aria-label')),
    ).toEqual(['Team A', 'Team B']);
  });

  it('names rows by label, not rich content', () => {
    render(
      <Harness
        roots={[{ id: 'x', label: 'Plain', hasChildren: false, content: <b>Rich 42</b> }]}
      />,
    );
    expect(item('Plain')).toHaveTextContent('Rich 42');
  });

  it('marks selection only when onSelect is passed', () => {
    const { rerender } = render(<Harness />);
    expect(item('Company')).toHaveAttribute('aria-selected', 'false');
    rerender(<Harness onSelect={undefined} />);
    expect(item('Company')).not.toHaveAttribute('aria-selected');
  });

  it('has exactly one tab stop: the selected item, else the first', async () => {
    render(<Harness initial={['Company']} />);
    const stops = () => screen.getAllByRole('treeitem').filter((el) => el.tabIndex === 0);
    expect(stops()).toEqual([item('Company')]);
    await userEvent.click(row('Support'));
    expect(stops()).toEqual([item('Support')]);
    expect(item('Support')).toHaveAttribute('aria-selected', 'true');
    expect(item('Support')).toHaveFocus();
  });

  it('tab stop falls back to the first item when the selected node is hidden', () => {
    render(<Harness selectedId="Team A" />);
    expect(screen.getAllByRole('treeitem').filter((el) => el.tabIndex === 0)).toEqual([
      item('Company'),
    ]);
  });

  it('list keys: arrows move, expand and collapse; Enter selects; selection never follows focus', async () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} selectedId={null} />);
    await userEvent.tab();
    expect(item('Company')).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(item('Company')).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{ArrowRight}');
    expect(item('Sales')).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{End}');
    expect(item('Other')).toHaveFocus();
    await userEvent.keyboard('{Home}{ArrowDown}{ArrowLeft}');
    expect(item('Company')).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(item('Company')).toHaveAttribute('aria-expanded', 'false');
    expect(onSelect).not.toHaveBeenCalled();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('Company');
    await userEvent.keyboard(' ');
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('typeahead jumps to the next visible label', async () => {
    render(<Harness initial={['Company']} />);
    await userEvent.tab();
    await userEvent.keyboard('s');
    expect(item('Sales')).toHaveFocus();
    await userEvent.keyboard('u');
    expect(item('Support')).toHaveFocus();
  });

  it('typeahead keys do not bubble to a parent onKeyDown', async () => {
    const parent = vi.fn();
    render(
      <div onKeyDown={parent}>
        <Harness initial={['Company']} />
      </div>,
    );
    await userEvent.tab();
    await userEvent.keyboard('s');
    expect(item('Sales')).toHaveFocus();
    expect(parent).not.toHaveBeenCalled();
  });

  it('typeahead continues through a space; a lone space still selects', async () => {
    const onSelect = vi.fn();
    render(<Harness initial={['Company', 'Sales']} onSelect={onSelect} />);
    await userEvent.tab();
    await userEvent.keyboard('Team ');
    expect(onSelect).not.toHaveBeenCalled();
    await userEvent.keyboard('B');
    expect(item('Team B')).toHaveFocus();
    expect(onSelect).not.toHaveBeenCalled();
    await act(() => new Promise((r) => setTimeout(r, 600)));
    await userEvent.keyboard(' ');
    expect(onSelect).toHaveBeenCalledWith('Team B');
  });

  it('selects on the row only: the chart children container and its space do not select', async () => {
    const onSelect = vi.fn();
    render(<Harness view="chart" initial={['Company']} onSelect={onSelect} />);
    await userEvent.click(within(item('Company')).getByRole('group'));
    expect(onSelect).not.toHaveBeenCalled();
    await userEvent.click(within(item('Company')).getByText('Company'));
    expect(onSelect).toHaveBeenCalledWith('Company');
  });

  it('renders no group for an expanded node with no children', () => {
    render(<Harness initial={['Company']} childrenOf={() => []} />);
    expect(item('Company')).toHaveAttribute('aria-expanded', 'true');
    expect(within(item('Company')).queryByRole('group')).toBeNull();
  });

  it('clicking the chevron toggles without selecting', async () => {
    const onSelect = vi.fn();
    const { container } = render(<Harness onSelect={onSelect} />);
    await userEvent.click(container.querySelector('[data-toggle]')!);
    expect(item('Company')).toHaveAttribute('aria-expanded', 'true');
    expect(onSelect).not.toHaveBeenCalled();
    expect(container.querySelector('[data-toggle]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows a disabled loading row while children are undefined', () => {
    render(<Harness initial={['Company', 'Support']} />);
    const row = item('Loading…');
    expect(row).toHaveAttribute('aria-disabled', 'true');
    expect(row).toHaveAttribute('aria-level', '3');
    expect(row).not.toHaveAttribute('aria-selected');
  });

  it('moves focus to the nearest visible ancestor when the focused row disappears', async () => {
    const { rerender } = render(<Harness expandedIds={new Set(['Company', 'Sales'])} />);
    await userEvent.click(row('Team A'));
    rerender(<Harness expandedIds={new Set(['Company'])} />);
    expect(item('Sales')).toHaveFocus();
  });

  it('keys from nested elements are ignored', async () => {
    const onSelect = vi.fn();
    render(
      <Harness
        onSelect={onSelect}
        roots={[
          {
            id: 'x',
            label: 'X',
            hasChildren: false,
            content: (
              <span tabIndex={-1} data-testid="inner">
                x
              </span>
            ),
          },
        ]}
      />,
    );
    screen.getByTestId('inner').focus();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).not.toHaveBeenCalled();
  });
});

function Async(props: {
  failFirst?: boolean;
  /** Number of loads that fail before one succeeds (default 1 with failFirst, else 0). */
  fails?: number;
  onRetry?: boolean;
  pageSize?: number;
  total?: number;
  /** onLoadMore flips `loading` a tick later, like react-query's fetchNextPage. */
  asyncLoadMore?: boolean;
}) {
  const {
    failFirst = false,
    onRetry = true,
    pageSize = 2,
    total = 4,
    asyncLoadMore = false,
  } = props;
  const fails = props.fails ?? (failFirst ? 1 : 0);
  const [expanded, setExpanded] = useState(new Set<string>());
  const [kids, setKids] = useState<Record<string, TreeViewChildren>>({});
  const [shown, setShown] = useState(pageSize);
  const [moreLoading, setMoreLoading] = useState(false);
  const attempts = useRef(0);
  const load = (id: string) => {
    setKids((k) => ({ ...k, [id]: undefined }));
    const fail = attempts.current++ < fails;
    setTimeout(
      () =>
        setKids((k) => ({
          ...k,
          [id]: fail
            ? { error: true }
            : Array.from({ length: total }, (_, i) => n(`Child ${i + 1}`)),
        })),
      1000,
    );
  };
  return (
    <TreeView
      aria-label="Async"
      roots={[n('Root', true)]}
      childrenOf={(id) => {
        const list = kids[id];
        return Array.isArray(list) ? list.slice(0, shown) : list; // new array identity every render
      }}
      expandedIds={expanded}
      onExpandedChange={(id, open) => {
        setExpanded((p) => (open ? new Set([...p, id]) : new Set([...p].filter((x) => x !== id))));
        if (open && !(id in kids)) load(id);
      }}
      onRetry={onRetry ? load : undefined}
      overflowOf={(p) =>
        p === 'Root' && Array.isArray(kids.Root) && shown < total
          ? {
              label: `${total - shown} more not shown`,
              loading: moreLoading,
              onLoadMore: () => {
                const start = () => {
                  setMoreLoading(true);
                  setTimeout(() => {
                    setShown((s) => s + pageSize);
                    setMoreLoading(false);
                  }, 1000);
                };
                if (asyncLoadMore) setTimeout(start, 0);
                else start();
              },
            }
          : null
      }
    />
  );
}
const region = () => document.querySelector('[aria-live]')!;

describe('TreeView async', () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());
  const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const tick = (ms: number) => act(() => vi.advanceTimersByTime(ms));
  // LiveRegion writes its text ANNOUNCE_DELAY_MS (50) after the message commits, and a sync act() commits only
  // when it exits — so a message set during one tick() reaches the region on the next one.
  const PAST_ANNOUNCE_DELAY_MS = 100;

  it('mounts silently and announces a slow user-triggered load after 300ms, success silent', async () => {
    const u = user();
    render(<Async />);
    expect(region()).toHaveTextContent('');
    await u.tab();
    await u.keyboard('{ArrowRight}');
    expect(item('Loading…')).toBeInTheDocument();
    tick(200);
    expect(region()).toHaveTextContent('');
    tick(200);
    tick(PAST_ANNOUNCE_DELAY_MS);
    expect(region()).toHaveTextContent('Loading…');
    tick(1000);
    tick(PAST_ANNOUNCE_DELAY_MS);
    expect(item('Child 1')).toBeInTheDocument();
    expect(item('Root')).toHaveFocus();
    expect(region()).toHaveTextContent('Loading…'); // success is silent: no new message
  });

  it('announces a failure, and Retry loads and focuses the first child', async () => {
    const u = user();
    render(<Async failFirst />);
    await u.tab();
    await u.keyboard('{ArrowRight}');
    tick(1100);
    tick(PAST_ANNOUNCE_DELAY_MS);
    expect(region()).toHaveTextContent("Couldn't load");
    const row = item("Couldn't load. Retry");
    expect(row).not.toHaveAttribute('aria-disabled');
    await u.keyboard('{ArrowRight}');
    expect(row).toHaveFocus();
    await u.keyboard('{Enter}');
    tick(1100);
    expect(item('Child 1')).toHaveFocus();
  });

  it('a retry that fails again keeps focus on the Retry row', async () => {
    const u = user();
    render(<Async fails={2} />);
    await u.tab();
    await u.keyboard('{ArrowRight}');
    tick(1100);
    await u.keyboard('{ArrowRight}{Enter}');
    expect(item('Loading…')).toHaveFocus();
    tick(1100);
    expect(item("Couldn't load. Retry")).toHaveFocus();
  });

  it('announces a failure once; later re-renders do not re-announce it', async () => {
    const u = user();
    const { rerender } = render(<Async failFirst />);
    await u.tab();
    await u.keyboard('{ArrowRight}');
    tick(1100);
    tick(PAST_ANNOUNCE_DELAY_MS);
    expect(region()).toHaveTextContent("Couldn't load");
    const observer = new MutationObserver(() => {});
    observer.observe(region(), { childList: true, characterData: true, subtree: true });
    rerender(<Async failFirst />);
    await u.keyboard('{ArrowDown}{ArrowUp}');
    tick(500);
    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect();
  });

  it('without onRetry the error row is inert text', async () => {
    const u = user();
    render(<Async failFirst onRetry={false} />);
    await u.tab();
    await u.keyboard('{ArrowRight}');
    tick(1100);
    expect(item("Couldn't load")).toHaveAttribute('aria-disabled', 'true');
  });

  it('load-more shows loading on the row, then focuses the first new child', async () => {
    const u = user();
    render(<Async />);
    await u.tab();
    await u.keyboard('{ArrowRight}');
    tick(1100);
    await u.click(row('2 more not shown'));
    expect(item('Loading…')).toHaveAttribute('aria-disabled', 'true');
    tick(1100);
    expect(item('Child 3')).toHaveFocus();
    expect(screen.queryByRole('treeitem', { name: /more not shown/ })).toBeNull();
  });

  it('load-more whose loading flag flips a tick later still announces and focuses the first new child', async () => {
    const u = user();
    render(<Async asyncLoadMore />);
    await u.tab();
    await u.keyboard('{ArrowRight}');
    tick(1100);
    await u.click(row('2 more not shown'));
    tick(PAST_ANNOUNCE_DELAY_MS);
    expect(region()).toHaveTextContent('');
    expect(item('Loading…')).toHaveFocus();
    tick(300);
    tick(PAST_ANNOUNCE_DELAY_MS);
    expect(region()).toHaveTextContent('Loading…');
    tick(1000);
    expect(item('Child 3')).toHaveFocus();
  });

  it('load-more that adds nothing leaves focus on a visible item', async () => {
    const u = user();
    render(<Async pageSize={0} total={1} />);
    await u.tab();
    await u.keyboard('{ArrowRight}');
    tick(1100);
    await u.click(row('1 more not shown'));
    tick(1100);
    expect(item('1 more not shown')).toHaveFocus();
  });

  it('collapsing an ancestor moves focus to it', async () => {
    const u = user();
    const { container } = render(<Async />);
    await u.tab();
    await u.keyboard('{ArrowRight}');
    tick(1100);
    await u.keyboard('{ArrowRight}');
    expect(item('Child 1')).toHaveFocus();
    await u.click(container.querySelector('[data-toggle]')!);
    expect(item('Root')).toHaveFocus();
  });

  it('does not re-announce the old failure when onRetry has not started loading yet', async () => {
    // onRetry re-renders (e.g. sets a fetching flag) but the data still reports the old error for now.
    function Stuck() {
      const [, bump] = useState(0);
      return (
        <TreeView
          aria-label="Stuck"
          roots={[n('Root', true)]}
          childrenOf={() => ({ error: true })}
          expandedIds={new Set(['Root'])}
          onExpandedChange={() => {}}
          onRetry={() => bump((x) => x + 1)}
        />
      );
    }
    const u = user();
    render(<Stuck />);
    await u.click(row("Couldn't load. Retry"));
    tick(PAST_ANNOUNCE_DELAY_MS);
    expect(region()).toHaveTextContent('');
  });

  it('re-rendering with new array identities keeps focus and stays silent', async () => {
    const u = user();
    const { rerender } = render(<Async />);
    await u.tab();
    await u.keyboard('{ArrowRight}');
    tick(1100);
    tick(PAST_ANNOUNCE_DELAY_MS);
    await u.keyboard('{ArrowRight}{ArrowDown}');
    const message = region().textContent;
    rerender(<Async />);
    tick(500);
    expect(item('Child 2')).toHaveFocus();
    expect(region().textContent).toBe(message);
  });
});

describe('TreeView chart view', () => {
  it('prevents native focus on subtree space but not on rows', () => {
    render(<Harness view="chart" initial={['Company']} />);
    expect(fireEvent.mouseDown(within(item('Company')).getByRole('group'))).toBe(false);
    expect(fireEvent.mouseDown(row('Company'))).toBe(true);
    expect(fireEvent.mouseDown(row('Sales'))).toBe(true);
  });

  it('describes the keys and uses spatial arrows', async () => {
    render(<Harness view="chart" initial={['Company']} />);
    const tree = screen.getByRole('tree');
    expect(tree).toHaveAttribute('data-view', 'chart');
    expect(tree).toHaveAccessibleDescription(
      'Use up and down arrows to move between levels, left and right arrows to move between siblings.',
    );
    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}');
    expect(item('Sales')).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(item('Support')).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(item('Support')).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{ArrowUp}');
    expect(item('Support')).toHaveAttribute('aria-expanded', 'false');
    await userEvent.keyboard('{ArrowUp}');
    expect(item('Company')).toHaveFocus();
  });

  it('scrolls the focused box into view', async () => {
    const original = Element.prototype.scrollIntoView;
    const spy = vi.fn();
    Element.prototype.scrollIntoView = spy;
    onTestFinished(() => {
      Element.prototype.scrollIntoView = original;
    });
    render(<Harness view="chart" initial={['Company']} />);
    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}');
    expect(spy).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
  });

  it('list view has no key hint', () => {
    render(<Harness />);
    expect(screen.getByRole('tree')).not.toHaveAttribute('aria-describedby');
  });

  it('keeps a consumer aria-describedby next to the hint', () => {
    render(
      <>
        <p id="mine">Mine</p>
        <Harness view="chart" aria-describedby="mine" />
      </>,
    );
    expect(screen.getByRole('tree')).toHaveAccessibleDescription(/^Mine Use up and down/);
  });

  it('toggle icon differs collapsed vs expanded', () => {
    render(<Harness view="chart" initial={['Company']} />);
    const icon = (name: string) => item(name).querySelector('[data-toggle] svg');
    expect(icon('Company')).toHaveClass('lucide-minus');
    expect(icon('Support')).toHaveClass('lucide-chevron-down');
  });

  describe('chart opens centred on the tab stop', () => {
    const rect = (left: number, width: number) =>
      ({
        left,
        width,
        right: left + width,
        top: 0,
        bottom: 0,
        height: 0,
        x: left,
        y: 0,
      }) as DOMRect;
    afterEach(() => vi.restoreAllMocks());

    it('scrolls its own container so the tab-stop item is centred (chart only)', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: HTMLElement,
      ) {
        return this.getAttribute('role') === 'tree' ? rect(0, 200) : rect(500, 100);
      });
      const { unmount } = render(<Harness view="chart" />);
      // item centre 550 vs container centre 100
      expect(screen.getByRole('tree').scrollLeft).toBe(450);
      unmount();
      render(<Harness view="list" />);
      expect(screen.getByRole('tree').scrollLeft).toBe(0);
    });

    it('centres once roots arrive after mounting empty', () => {
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
        this: HTMLElement,
      ) {
        return this.getAttribute('role') === 'tree' ? rect(0, 200) : rect(500, 100);
      });
      const { rerender } = render(<Harness view="chart" roots={[]} />);
      expect(screen.getByRole('tree').scrollLeft).toBe(0);
      rerender(<Harness view="chart" roots={[n('Late')]} />);
      expect(screen.getByRole('tree').scrollLeft).toBe(450);
    });
  });
});
