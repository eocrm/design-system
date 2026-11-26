import { createRef, useRef, useState, type Ref } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

describe('highlightedIds', () => {
  it('marks highlighted nodes with data-highlighted and leaves aria untouched', () => {
    render(
      <Harness
        initial={['Company', 'Sales']}
        highlightedIds={new Set(['Company', 'Sales', 'Team A'])}
      />,
    );
    expect(item('Team A')).toHaveAttribute('data-highlighted');
    expect(item('Team B')).not.toHaveAttribute('data-highlighted');
    expect(item('Company')).not.toHaveAttribute('aria-selected', 'true');
  });

  it('ignores ids that are not rendered', () => {
    const { container } = render(<Harness highlightedIds={new Set(['Nope'])} />);
    expect(container.querySelector('[data-highlighted]')).toBeNull();
  });

  it('flags a chart group only when parent and a child are highlighted', () => {
    const group = (name: string) => within(item(name)).getAllByRole('group')[0] as HTMLElement;
    const { rerender } = render(
      <Harness
        view="chart"
        initial={['Company', 'Sales']}
        highlightedIds={new Set(['Company', 'Sales'])}
      />,
    );
    expect(group('Company')).toHaveAttribute('data-highlighted-path');
    expect(group('Sales')).not.toHaveAttribute('data-highlighted-path');
    rerender(
      <Harness view="chart" initial={['Company', 'Sales']} highlightedIds={new Set(['Company'])} />,
    );
    expect(group('Company')).not.toHaveAttribute('data-highlighted-path');
  });

  it('does not flag a chart group whose child is highlighted but parent is not', () => {
    render(
      <Harness view="chart" initial={['Company', 'Sales']} highlightedIds={new Set(['Sales'])} />,
    );
    expect(within(item('Company')).getAllByRole('group')[0]).not.toHaveAttribute(
      'data-highlighted-path',
    );
  });

  it('writes the measured path segment onto a highlighted chart group', () => {
    render(
      <Harness view="chart" initial={['Company']} highlightedIds={new Set(['Company', 'Sales'])} />,
    );
    const group = within(item('Company')).getByRole('group');
    expect(group.style.getPropertyValue('--tree-view-path-start')).toBe('0px');
    expect(group.style.getPropertyValue('--tree-view-path-width')).toBe('0px');
  });

  it('keeps one ResizeObserver across focus moves and same-content highlight sets', async () => {
    const constructed = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor() {
          constructed();
        }
        observe() {}
        disconnect() {}
      },
    );
    try {
      const props = { view: 'chart' as const, initial: ['Company'] };
      const { rerender } = render(<Harness {...props} highlightedIds={new Set(['Company'])} />);
      act(() => item('Company').focus());
      await userEvent.keyboard('{ArrowDown}{ArrowRight}');
      rerender(<Harness {...props} highlightedIds={new Set(['Company'])} />);
      expect(constructed).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps selection styling and highlight together', async () => {
    render(<Harness initial={['Company']} highlightedIds={new Set(['Sales'])} />);
    await userEvent.click(row('Sales'));
    expect(item('Sales')).toHaveAttribute('aria-selected', 'true');
    expect(item('Sales')).toHaveAttribute('data-highlighted');
  });
});

describe('onHoverChange', () => {
  it.each(['list', 'chart'] as const)(
    'fires the node id on enter and null on leave (%s)',
    (view) => {
      const onHoverChange = vi.fn();
      render(<Harness view={view} onHoverChange={onHoverChange} />);
      fireEvent.pointerEnter(row('Company'));
      expect(onHoverChange).toHaveBeenLastCalledWith('Company');
      fireEvent.pointerLeave(row('Company'));
      expect(onHoverChange).toHaveBeenLastCalledWith(null);
    },
  );

  it('status rows do not fire', () => {
    const onHoverChange = vi.fn();
    render(<Harness initial={['Company', 'Support']} onHoverChange={onHoverChange} />);
    fireEvent.pointerEnter(row('Loading…'));
    fireEvent.pointerLeave(row('Loading…'));
    expect(onHoverChange).not.toHaveBeenCalled();
  });
});

describe('TreeView keyboard move', () => {
  type Tree = Record<string, string[]>; // parent ('' = root) -> child ids
  const start = (): Tree => ({ '': ['Intro', 'Setup', 'FAQ'], Intro: ['A', 'B'], Setup: [] });
  const apply = (tree: Tree, m: { id: string; parentId: string | null; index: number | null }) => {
    const next: Tree = Object.fromEntries(
      Object.entries(tree).map(([k, v]) => [k, v.filter((c) => c !== m.id)]),
    );
    const key = m.parentId ?? '';
    const list = next[key] ?? [];
    list.splice(m.index ?? list.length, 0, m.id);
    next[key] = list;
    return next;
  };

  function Move(props: {
    onMoveSpy?: (m: unknown) => void;
    canDrop?: (id: string, p: string | null) => boolean;
    view?: 'list' | 'chart';
    noMove?: boolean;
    onExpandedSpy?: (id: string, open: boolean) => void;
    onSelectSpy?: (id: string) => void;
    initial?: string[];
  }) {
    const [tree, setTree] = useState(start);
    const [expanded, setExpanded] = useState(() => new Set(props.initial ?? ['Intro']));
    const node = (id: string) => n(id, id in tree);
    return (
      <TreeView
        aria-label="Wiki"
        view={props.view}
        roots={tree[''].map(node)}
        childrenOf={(id) => (tree[id] ?? []).map(node)}
        expandedIds={expanded}
        onExpandedChange={(id, open) => {
          props.onExpandedSpy?.(id, open);
          setExpanded((p) => {
            const next = new Set(p);
            if (open) next.add(id);
            else next.delete(id);
            return next;
          });
        }}
        canDrop={props.canDrop}
        onSelect={props.onSelectSpy}
        onMove={
          props.noMove
            ? undefined
            : (m) => {
                props.onMoveSpy?.(m);
                setTree((t0) => apply(t0, m));
              }
        }
      />
    );
  }
  const press = (key: string) =>
    fireEvent.keyDown(document.activeElement!, { key, ctrlKey: true, shiftKey: true });
  const focus = (name: string) => act(() => item(name).focus());
  const said = (text: string | RegExp) =>
    waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(text));

  it('moves with the four shortcuts, announces, and keeps focus on the node', async () => {
    const spy = vi.fn();
    render(<Move onMoveSpy={spy} />);
    focus('Setup');
    press('ArrowUp');
    expect(spy).toHaveBeenLastCalledWith({ id: 'Setup', parentId: null, index: 0 });
    expect(item('Setup')).toHaveFocus();
    press('ArrowDown');
    expect(spy).toHaveBeenLastCalledWith({ id: 'Setup', parentId: null, index: 1 });
    press('ArrowRight'); // into Intro (expanded): after its 2 children
    expect(spy).toHaveBeenLastCalledWith({ id: 'Setup', parentId: 'Intro', index: 2 });
    await said('Setup moved into Intro, position 3 of 3');
    expect(item('Setup')).toHaveFocus();
    expect(item('Setup')).toHaveAttribute('aria-level', '2');
    press('ArrowLeft');
    expect(spy).toHaveBeenLastCalledWith({ id: 'Setup', parentId: null, index: 1 });
    await said('Setup moved to the top level, position 2 of 3');
    expect(item('Setup')).toHaveFocus();
  });

  it('indent into a collapsed sibling announces without position, then expands after onMove', async () => {
    const order: string[] = [];
    render(
      <Move
        initial={[]}
        onMoveSpy={() => order.push('move')}
        onExpandedSpy={(id, open) => order.push(`expand:${id}:${open}`)}
      />,
    );
    focus('Setup');
    press('ArrowRight');
    expect(order).toEqual(['move', 'expand:Intro:true']);
    await said(/^Setup moved into Intro$/);
  });

  it('announces boundaries and refusals without calling onMove', async () => {
    const spy = vi.fn();
    render(<Move onMoveSpy={spy} canDrop={(_id, p) => p !== 'FAQ'} />);
    focus('Intro');
    press('ArrowUp');
    await said("Can't move further up");
    press('ArrowRight');
    await said("Can't move further in");
    press('ArrowLeft');
    await said("Can't move further out");
    focus('FAQ');
    press('ArrowDown');
    await said("Can't move further down");
    expect(spy).not.toHaveBeenCalled();
  });

  it('re-announces an identical boundary refusal on a repeated attempt', async () => {
    render(<Move />);
    focus('Intro');
    press('ArrowUp');
    await said("Can't move further up");
    const region = screen.getByRole('status');
    // Clear-then-write: the region goes empty before the identical text returns.
    const seen: string[] = [];
    const mo = new MutationObserver(() => seen.push(region.textContent ?? ''));
    mo.observe(region, { childList: true, characterData: true, subtree: true });
    press('ArrowUp');
    await waitFor(() => expect(seen).toContain(''));
    await said("Can't move further up");
    mo.disconnect();
  });

  it('refused by canDrop announces "Can\'t move here"', async () => {
    const spy = vi.fn();
    render(<Move onMoveSpy={spy} canDrop={(_id, p) => p === null} />);
    focus('Setup');
    press('ArrowRight');
    await said("Can't move here");
    expect(spy).not.toHaveBeenCalled();
  });

  it('has aria-description only with onMove; shortcuts do nothing without it or in chart view', () => {
    const spy = vi.fn();
    const { unmount } = render(<Move />);
    expect(screen.getByRole('tree')).toHaveAttribute('aria-description');
    unmount();
    const r = render(<Move noMove onMoveSpy={spy} />);
    expect(screen.getByRole('tree')).not.toHaveAttribute('aria-description');
    focus('Setup');
    press('ArrowUp');
    expect(spy).not.toHaveBeenCalled();
    r.unmount();
    render(<Move view="chart" onMoveSpy={spy} />);
    expect(screen.getByRole('tree')).not.toHaveAttribute('aria-description');
    focus('Setup');
    press('ArrowUp');
    expect(spy).not.toHaveBeenCalled();
  });

  it('plain arrows still navigate', () => {
    render(<Move />);
    focus('Intro');
    fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
    expect(item('A')).toHaveFocus();
  });

  describe('pointer drag', () => {
    // jsdom lays nothing out: stack every row 20px tall from y=0, 200px wide, inside a tree 40px taller than
    // its rows (empty space below the last row). Rects follow the CURRENT DOM, so a re-render re-measures.
    // Rows (Intro expanded): Intro 0-20, A 20-40, B 40-60, Setup 60-80 (collapsed, expandable), FAQ 80-100.
    const ROW_H = 20;
    let restore: () => void;
    beforeEach(() => {
      const orig = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function (this: Element) {
        const tree = this.closest('[role="tree"]');
        if (!tree) return orig.call(this);
        const rows = Array.from(tree.querySelectorAll('[data-row]'));
        if (this === tree) return new DOMRect(0, 0, 200, rows.length * ROW_H + 40);
        const i = rows.indexOf(this);
        return i < 0 ? orig.call(this) : new DOMRect(0, i * ROW_H, 200, ROW_H);
      };
      restore = () => {
        Element.prototype.getBoundingClientRect = orig;
      };
    });
    afterEach(() => restore());

    /** Press a row, trip the 4px activation, then move to (x, y) without releasing. */
    const pick = (name: string, y: number, x = 50) => {
      const r = row(name);
      const top = r.getBoundingClientRect().top + 10;
      fireEvent.pointerDown(r, { clientX: 50, clientY: top, button: 0, isPrimary: true });
      fireEvent.pointerMove(document, { clientX: 50, clientY: top + 6 });
      fireEvent.pointerMove(document, { clientX: x, clientY: y });
    };
    const drop = (y: number, x = 50) => fireEvent.pointerUp(document, { clientX: x, clientY: y });
    const dropMark = () => document.querySelector('[data-drop]');

    it('a click without movement still selects', () => {
      const select = vi.fn();
      render(<Move onSelectSpy={select} />);
      const r = row('Setup');
      fireEvent.pointerDown(r, { clientX: 50, clientY: 70, button: 0, isPrimary: true });
      fireEvent.pointerUp(r, { clientX: 50, clientY: 70 });
      fireEvent.click(r);
      expect(select).toHaveBeenCalledWith('Setup');
    });

    it('drops before / after / inside / below the last row with the right onMove', async () => {
      const spy = vi.fn();
      render(<Move onMoveSpy={spy} />);
      pick('FAQ', 21); // top quarter of A
      expect(item('A')).toHaveAttribute('data-drop', 'before');
      expect(item('FAQ')).toHaveAttribute('data-dragging');
      await said('FAQ: before A');
      drop(21);
      expect(spy).toHaveBeenLastCalledWith({ id: 'FAQ', parentId: 'Intro', index: 0 });
      await said('FAQ moved into Intro, position 1 of 3');
      expect(dropMark()).toBeNull();
      expect(item('FAQ')).not.toHaveAttribute('data-dragging');

      // Rows now: Intro, FAQ, A, B, Setup (60-80 → 80-100).
      pick('A', 99); // bottom quarter of Setup
      expect(item('Setup')).toHaveAttribute('data-drop', 'after');
      drop(99);
      expect(spy).toHaveBeenLastCalledWith({ id: 'A', parentId: null, index: 2 });

      pick('B', 70); // middle of Setup (collapsed): position unknown
      expect(item('Setup')).toHaveAttribute('data-drop', 'inside');
      await said('B: inside Setup');
      drop(70);
      expect(spy).toHaveBeenLastCalledWith({ id: 'B', parentId: 'Setup', index: null });

      // Rows now: Intro, FAQ, Setup, A (0-80) in a 120px tree.
      pick('FAQ', 110); // empty space below the last row
      expect(item('A')).toHaveAttribute('data-drop', 'after');
      drop(110);
      expect(spy).toHaveBeenLastCalledWith({ id: 'FAQ', parentId: null, index: 3 });
    });

    it('a refused target shows no indicator, and dropping there or outside cancels', async () => {
      const spy = vi.fn();
      render(<Move onMoveSpy={spy} canDrop={(_id, p) => p !== 'Setup'} />);
      pick('Intro', 30); // its own child A
      expect(dropMark()).toBeNull();
      expect(item('Intro')).toHaveAttribute('data-dragging'); // its subtree (A, B) dims with it
      drop(30);
      await said(/^Move cancelled\./);
      pick('FAQ', 70); // inside Setup: vetoed
      expect(dropMark()).toBeNull();
      drop(70);
      pick('FAQ', 30, 400); // outside the tree
      expect(dropMark()).toBeNull();
      drop(30, 400);
      expect(spy).not.toHaveBeenCalled();
    });

    it('Escape cancels and announces it', async () => {
      const spy = vi.fn();
      render(<Move onMoveSpy={spy} />);
      pick('FAQ', 90); // still over itself: no target, so the pick-up stays announced
      await said('Picked up FAQ.');
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
      await said(/^Move cancelled\./);
      expect(dropMark()).toBeNull();
      drop(21);
      expect(spy).not.toHaveBeenCalled();
    });

    it('hovering inside a collapsed expandable node expands it after a delay; leaving cancels', () => {
      vi.useFakeTimers();
      try {
        const expand = vi.fn();
        render(<Move onExpandedSpy={expand} />);
        pick('FAQ', 70); // inside Setup
        act(() => vi.advanceTimersByTime(500));
        fireEvent.pointerMove(document, { clientX: 50, clientY: 50 }); // over B
        act(() => vi.advanceTimersByTime(500));
        expect(expand).not.toHaveBeenCalled();
        fireEvent.pointerMove(document, { clientX: 50, clientY: 70 });
        act(() => vi.advanceTimersByTime(700));
        expect(expand).toHaveBeenCalledWith('Setup', true);
        drop(70);
      } finally {
        vi.useRealTimers();
      }
    });

    it('a touch press does not drag on movement alone; a long press does', () => {
      vi.useFakeTimers();
      try {
        const spy = vi.fn();
        render(<Move onMoveSpy={spy} />);
        const r = row('FAQ');
        fireEvent.pointerDown(r, {
          clientX: 50,
          clientY: 90,
          button: 0,
          isPrimary: true,
          pointerType: 'touch',
        });
        fireEvent.pointerMove(document, { clientX: 50, clientY: 21, pointerType: 'touch' });
        fireEvent.pointerUp(document, { clientX: 50, clientY: 21, pointerType: 'touch' });
        expect(dropMark()).toBeNull();
        const touch = (y: number) => ({ touches: [{ clientX: 50, clientY: y }] });
        fireEvent.touchStart(r, touch(90));
        act(() => vi.advanceTimersByTime(250));
        // Touch events stay on the element the touch started on.
        fireEvent.touchMove(r, touch(21));
        expect(item('A')).toHaveAttribute('data-drop', 'before');
        fireEvent.touchEnd(r, { changedTouches: [{ clientX: 50, clientY: 21 }] });
        expect(spy).toHaveBeenLastCalledWith({ id: 'FAQ', parentId: 'Intro', index: 0 });
      } finally {
        vi.useRealTimers();
      }
    });

    it('without onMove rows are not draggable', () => {
      render(<Move noMove />);
      pick('FAQ', 21);
      expect(dropMark()).toBeNull();
      expect(item('FAQ')).not.toHaveAttribute('data-dragging');
    });
  });
});
