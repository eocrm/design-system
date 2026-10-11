import {
  forwardRef,
  useCallback,
  useId,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { ChevronDown, ChevronRight, Minus } from 'lucide-react';
import { CircularProgress } from '../CircularProgress';
import { LiveRegion } from '../LiveRegion';
import { VisuallyHidden } from '../VisuallyHidden';
import { chain, mergeRefs } from '../_internal/refs';
import { useTranslation } from '../../i18n/useTranslation';
import {
  buildTree,
  flatten,
  keyAction,
  nodeKey,
  typeaheadMatch,
  type TreeAction,
  type TreeItem,
  type TreeViewChildren,
  type TreeViewNode,
  type TreeViewOverflow,
  type TreeViewView,
} from './treeModel';
import styles from './TreeView.module.scss';

export interface TreeViewProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onSelect' | 'children'
> {
  /** Accessible name of the tree, e.g. "Organization structure". Required. */
  'aria-label': string;
  /**
   * Presentation. Default `'list'`.
   * - `'list'` — file-explorer rows indented per level with a chevron; ↑/↓ walk rows, →/← expand/collapse.
   * - `'chart'` — classic top-down org chart of boxes with connector lines; scrolls horizontally inside itself
   *   when wider than its container. Spatial keys: ↓ expands or enters, ↑ collapses or goes to the parent, ←/→ between siblings.
   */
  view?: TreeViewView;
  /** Top-level nodes. */
  roots: TreeViewNode[];
  /** Children of an expanded node: the array once loaded, `undefined` while loading, `{ error: true }` on failure. Called only for expanded nodes. */
  childrenOf: (id: string) => TreeViewChildren;
  /** Ids of expanded nodes (controlled). Fetch a node's children when it appears here. */
  expandedIds: ReadonlySet<string>;
  /** Called when the user expands or collapses a node. */
  onExpandedChange: (id: string, expanded: boolean) => void;
  /** Selected node id (controlled). Ignored when `onSelect` is absent. */
  selectedId?: string | null;
  /** Called on click / Enter / Space on a node. Omit for a tree without selection (no `aria-selected`). Selection never follows focus. */
  onSelect?: (id: string) => void;
  /** Makes a failed level's "Couldn't load. Retry" row actionable; called with the parent id. Without it the row is inert text. */
  onRetry?: (id: string) => void;
  /** "N more not shown" row at the end of a level (`parentId` `null` = root level), or `null` for none. Pass `onLoadMore` to make it actionable. */
  overflowOf?: (parentId: string | null) => TreeViewOverflow | null;
}

const has = (flat: TreeItem[], key: string | null) =>
  key !== null && flat.some((i) => i.key === key);

const parentKey = (item: TreeItem) => (item.parentId === null ? null : nodeKey(item.parentId));

/** Visible node children of a level (`null` = roots), in order. */
const levelNodes = (flat: TreeItem[], parentId: string | null) =>
  flat.filter((i) => i.kind === 'node' && i.parentId === parentId);

/**
 * Lazily loaded hierarchical tree (WAI-ARIA tree) in a file-explorer list or a top-down org-chart view.
 * @see docs/components/TreeView.md
 */
export const TreeView = forwardRef<HTMLDivElement, TreeViewProps>(function TreeView(
  {
    view = 'list',
    roots,
    childrenOf,
    expandedIds,
    onExpandedChange,
    selectedId = null,
    onSelect,
    onRetry,
    overflowOf,
    className,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const hintId = useId();
  const items = buildTree({ roots, childrenOf, expandedIds, overflowOf });
  const flat = flatten(items);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const itemEls = useRef(new Map<string, HTMLDivElement>());
  const typeahead = useRef<{ buffer: string; timer: ReturnType<typeof setTimeout> | null }>({
    buffer: '',
    timer: null,
  });
  const rootEl = useRef<HTMLDivElement>(null);
  const hadFocus = useRef(false);
  const parents = useRef(new Map<string, string | null>());
  // The load the user last started. `count` (retry / load-more): node children of the level when it fired;
  // the node at that index gets focus once it arrives.
  const watch = useRef<{
    parentId: string | null;
    kind: 'expand' | 'retry' | 'more';
    count?: number;
    seenPending?: boolean;
  } | null>(null);
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const ta = typeahead.current;
    return () => {
      if (ta.timer) clearTimeout(ta.timer);
      if (announceTimer.current) clearTimeout(announceTimer.current);
      // Null them so a reconnect (StrictMode, Activity) can start fresh timers.
      ta.timer = null;
      ta.buffer = '';
      announceTimer.current = null;
    };
  }, []);

  const selectedKey = onSelect && selectedId !== null ? nodeKey(selectedId) : null;
  const tabStop = has(flat, focusedKey)
    ? focusedKey
    : has(flat, selectedKey)
      ? selectedKey
      : (flat[0]?.key ?? null);

  const chart = view === 'chart';
  // Open the chart centred on the tab-stop box, scrolling only the tree's own container (never the page).
  // Keyed on view and on the tree gaining its first items (late roots); re-running on every render would
  // fight the user's scrolling.
  const hasItems = flat.length > 0;
  useLayoutEffect(() => {
    const box = tabStop ? itemEls.current.get(tabStop) : undefined;
    const root = rootEl.current;
    if (!chart || !box || !root) return;
    const b = box.getBoundingClientRect();
    const c = root.getBoundingClientRect();
    root.scrollLeft += b.left + b.width / 2 - (c.left + c.width / 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, hasItems]);
  const focusKey = useCallback(
    (key: string) => {
      setFocusedKey(key);
      const el = itemEls.current.get(key);
      if (!el) return;
      if (!chart) return el.focus();
      // The chart scrolls inside itself: bring the box into view without the browser's own jump.
      el.focus({ preventScroll: true });
      el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    },
    [chart],
  );

  // Focus is in the tree, or was until the focused row unmounted (activeElement falls back to body).
  const inTree = useCallback(
    () =>
      !!rootEl.current?.contains(document.activeElement) ||
      (document.activeElement === document.body && hadFocus.current),
    [],
  );

  /** The user started a load: track it by item keys (never array identity) for focus and announcements. */
  const startWatch = (
    parentId: string | null,
    kind: 'expand' | 'retry' | 'more',
    count?: number,
  ) => {
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = null;
    watch.current = { parentId, kind, count };
    setMessage('');
  };

  const expand = (id: string) => {
    startWatch(id, 'expand');
    onExpandedChange(id, true);
  };

  const activate = (item: TreeItem) => {
    if (item.kind === 'node') onSelect?.(item.node.id);
    else if (item.kind === 'error' && onRetry) {
      startWatch(item.parentId, 'retry', 0);
      onRetry(item.parentId);
    } else if (item.kind === 'overflow' && item.overflow.onLoadMore && !item.overflow.loading) {
      startWatch(item.parentId, 'more', levelNodes(flat, item.parentId).length);
      item.overflow.onLoadMore();
    }
  };

  useLayoutEffect(() => {
    const w = watch.current;
    // 1. Retry / load-more: focus the first newly arrived node.
    let moved = false;
    if (w?.count !== undefined) {
      const nodes = levelNodes(flat, w.parentId);
      if (nodes.length > w.count) {
        const key = nodes[w.count].key;
        w.count = undefined;
        if (inTree()) {
          focusKey(key);
          moved = true;
        }
      }
    }
    // 2. Focus repair: the focused row vanished → a status row now in its level (error ↔ loading, overflow
    //    still there), else the nearest visible ancestor, else the first item.
    if (!moved && focusedKey !== null && !has(flat, focusedKey)) {
      if (inTree()) {
        const parent = parents.current.get(focusedKey) ?? null;
        const status = flat.find((i) => i.kind !== 'node' && parentKey(i) === parent);
        let key = parent;
        while (key !== null && !has(flat, key)) key = parents.current.get(key) ?? null;
        const target = status?.key ?? key ?? flat[0]?.key;
        if (target) focusKey(target);
        else setFocusedKey(null);
      } else setFocusedKey(null);
    }
    parents.current = new Map(flat.map((i) => [i.key, parentKey(i)]));
    // 3. Announcements: "Loading…" once the load is pending 300ms, "Couldn't load" on failure, success silent.
    if (!w) return;
    const pending =
      w.kind === 'more'
        ? flat.some((i) => i.kind === 'overflow' && i.parentId === w.parentId && i.overflow.loading)
        : has(flat, `loading:${w.parentId}`);
    if (pending) {
      w.seenPending = true;
      announceTimer.current ??= setTimeout(() => setMessage(t('treeView.loading')), 300);
      return;
    }
    const failed = has(flat, `error:${w.parentId}`);
    // The consumer may start loading a render or a tick later (react-query): the row the user activated is
    // still there and nothing is pending yet — keep waiting rather than reading it as the outcome.
    const notStarted =
      !w.seenPending &&
      (w.kind === 'retry'
        ? failed
        : w.kind === 'more' &&
          flat.some((i) => i.kind === 'overflow' && i.parentId === w.parentId));
    if (notStarted) return;
    if (failed) setMessage(t('treeView.loadError'));
    watch.current = null;
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = null;
  }, [flat, focusedKey, focusKey, inTree, t]);

  const run = (action: TreeAction) => {
    if (action.type === 'focus') focusKey(action.key);
    else if (action.type === 'expand') expand(action.id);
    else if (action.type === 'collapse') onExpandedChange(action.id, false);
    else {
      const target = flat.find((i) => i.key === action.key);
      if (target) activate(target);
    }
  };

  const onItemKeyDown = (event: KeyboardEvent<HTMLDivElement>, item: TreeItem) => {
    if (event.target !== event.currentTarget) return;
    const ta = typeahead.current;
    // Space continues a running typeahead ("Team B"); on its own it selects.
    if (
      event.key.length === 1 &&
      (event.key !== ' ' || ta.timer) &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      if (ta.timer) clearTimeout(ta.timer);
      ta.buffer += event.key;
      ta.timer = setTimeout(() => {
        ta.buffer = '';
        ta.timer = null;
      }, 500);
      const match = typeaheadMatch(flat, item.key, ta.buffer);
      if (match) focusKey(match);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const action = keyAction(flat, item.key, event.key, view);
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    run(action);
  };

  const onItemClick = (event: MouseEvent<HTMLDivElement>, item: TreeItem) => {
    event.stopPropagation();
    focusKey(item.key);
    activate(item);
  };

  const onToggleClick = (event: MouseEvent<HTMLSpanElement>, item: TreeItem & { kind: 'node' }) => {
    event.stopPropagation();
    focusKey(item.key);
    if (item.expanded) onExpandedChange(item.node.id, false);
    else expand(item.node.id);
  };

  // Click lives on the row, not the treeitem: in chart view the item also wraps its subtree and connector space.
  const rowClick = (item: TreeItem) => ({
    onClick: (e: MouseEvent<HTMLDivElement>) => onItemClick(e, item),
  });

  const common = (item: TreeItem) => ({
    ref: (el: HTMLDivElement | null) => {
      if (el) itemEls.current.set(item.key, el);
      else itemEls.current.delete(item.key);
    },
    role: 'treeitem',
    'aria-level': item.level,
    tabIndex: tabStop === item.key ? 0 : -1,
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => onItemKeyDown(e, item),
    // Chart items wrap their subtree: a press on that space must not natively focus the ancestor item.
    onMouseDown: (e: MouseEvent<HTMLDivElement>) => {
      if (e.button === 0 && !(e.target as Element).closest('[data-row]')) e.preventDefault();
    },
    onFocus: (e: FocusEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) setFocusedKey(item.key);
    },
    style: { '--tree-view-level': item.level - 1 } as CSSProperties,
  });

  const renderItem = (item: TreeItem): ReactNode => {
    if (item.kind === 'node') {
      const { node } = item;
      return (
        <div
          key={item.key}
          {...common(item)}
          className={styles.item}
          aria-label={node.label}
          aria-setsize={item.setSize}
          aria-posinset={item.posInSet}
          aria-expanded={node.hasChildren ? item.expanded : undefined}
          aria-selected={onSelect ? selectedId === node.id : undefined}
          data-kind="node"
        >
          <div className={styles.row} data-row="" {...rowClick(item)}>
            <span
              className={styles.toggle}
              aria-hidden="true"
              data-toggle={node.hasChildren ? '' : undefined}
              data-expanded={item.expanded || undefined}
              onClick={node.hasChildren ? (e) => onToggleClick(e, item) : undefined}
            >
              {node.hasChildren &&
                (chart ? (
                  item.expanded ? (
                    <Minus className={styles.chevron} />
                  ) : (
                    <ChevronDown className={styles.chevron} />
                  )
                ) : (
                  <ChevronRight className={styles.chevron} />
                ))}
            </span>
            <span className={styles.content}>{node.content ?? node.label}</span>
          </div>
          {item.expanded && item.children.length > 0 && (
            <div role="group" className={clsx(styles.group, chart && styles.level)}>
              {item.children.map(renderItem)}
            </div>
          )}
        </div>
      );
    }
    const loading =
      item.kind === 'loading' || (item.kind === 'overflow' && !!item.overflow.loading);
    let name = t('treeView.loading');
    let text: ReactNode = name;
    let actionable = false;
    if (item.kind === 'error') {
      actionable = !!onRetry;
      name = actionable
        ? `${t('treeView.loadError')}. ${t('treeView.retry')}`
        : t('treeView.loadError');
      text = actionable ? (
        <>
          {t('treeView.loadError')}. <span data-action="">{t('treeView.retry')}</span>
        </>
      ) : (
        name
      );
    } else if (item.kind === 'overflow' && !loading) {
      actionable = !!item.overflow.onLoadMore;
      name = text = item.overflow.label;
    }
    return (
      <div
        key={item.key}
        {...common(item)}
        className={styles.item}
        aria-label={name}
        aria-disabled={actionable ? undefined : 'true'}
        data-kind="status"
      >
        <div className={styles.row} data-row="" {...rowClick(item)}>
          <span className={styles.toggle} aria-hidden="true">
            {loading && <CircularProgress size="sm" aria-hidden="true" />}
          </span>
          <span
            className={styles.status}
            data-error={item.kind === 'error' ? '' : undefined}
            data-action={item.kind === 'overflow' && actionable ? '' : undefined}
          >
            {text}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* {...rest} first (Pattern B): role, aria-label, data-view and the key handling must win. */}
      <div
        {...rest}
        ref={mergeRefs(ref, rootEl)}
        role="tree"
        aria-describedby={
          chart
            ? [rest['aria-describedby'], hintId].filter(Boolean).join(' ')
            : rest['aria-describedby']
        }
        data-view={view}
        className={clsx(styles.root, className)}
        onFocus={chain(() => {
          hadFocus.current = true;
        }, onFocus)}
        onBlur={chain((e: FocusEvent<HTMLDivElement>) => {
          if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
          // Some browsers blur a focused row as it unmounts; that is not focus leaving the tree.
          const left = e.target;
          queueMicrotask(() => {
            if (left.isConnected) hadFocus.current = false;
          });
        }, onBlur)}
      >
        {chart ? (
          <div className={styles.level}>{items.map(renderItem)}</div>
        ) : (
          items.map(renderItem)
        )}
      </div>
      {/* Outside the tree: a tree may own only groups and treeitems. */}
      {chart && <VisuallyHidden id={hintId}>{t('treeView.chartHint')}</VisuallyHidden>}
      <LiveRegion>{message}</LiveRegion>
    </>
  );
});
