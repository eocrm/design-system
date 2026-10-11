import {
  forwardRef,
  useCallback,
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
import { ChevronRight } from 'lucide-react';
import { CircularProgress } from '../CircularProgress';
import { LiveRegion } from '../LiveRegion';
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
   *   when wider than its container. Spatial keys: ↓ into children, ↑ to the parent, ←/→ between siblings.
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
  const pendingFocus = useRef<{ parentId: string | null; count: number } | null>(null);
  const watch = useRef<{
    parentId: string | null;
    kind: 'expand' | 'retry' | 'more';
    seenPending?: boolean;
  } | null>(null);
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const ta = typeahead.current;
    return () => {
      if (ta.timer) clearTimeout(ta.timer);
      if (announceTimer.current) clearTimeout(announceTimer.current);
    };
  }, []);

  const selectedKey = onSelect && selectedId !== null ? nodeKey(selectedId) : null;
  const tabStop = has(flat, focusedKey)
    ? focusedKey
    : has(flat, selectedKey)
      ? selectedKey
      : (flat[0]?.key ?? null);

  const focusKey = useCallback((key: string) => {
    setFocusedKey(key);
    itemEls.current.get(key)?.focus();
  }, []);

  // Focus is in the tree, or was until the focused row unmounted (activeElement falls back to body).
  const inTree = useCallback(
    () =>
      !!rootEl.current?.contains(document.activeElement) ||
      (document.activeElement === document.body && hadFocus.current),
    [],
  );

  /** The user started a load: announce it if it stays pending (keyed on item keys, never array identity). */
  const startWatch = (parentId: string | null, kind: 'expand' | 'retry' | 'more') => {
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = null;
    watch.current = { parentId, kind };
    setMessage('');
  };

  const expand = (id: string) => {
    startWatch(id, 'expand');
    onExpandedChange(id, true);
  };

  const activate = (item: TreeItem) => {
    if (item.kind === 'node') onSelect?.(item.node.id);
    else if (item.kind === 'error' && onRetry) {
      pendingFocus.current = { parentId: item.parentId, count: 0 };
      startWatch(item.parentId, 'retry');
      onRetry(item.parentId);
    } else if (item.kind === 'overflow' && item.overflow.onLoadMore && !item.overflow.loading) {
      pendingFocus.current = {
        parentId: item.parentId,
        count: levelNodes(flat, item.parentId).length,
      };
      startWatch(item.parentId, 'more');
      item.overflow.onLoadMore();
    }
  };

  // Focus repair: the focused row vanished (ancestor collapsed, status row resolved) → nearest visible ancestor.
  useLayoutEffect(() => {
    if (focusedKey !== null && !has(flat, focusedKey)) {
      if (inTree()) {
        let key = parents.current.get(focusedKey) ?? null;
        while (key !== null && !has(flat, key)) key = parents.current.get(key) ?? null;
        const target = key ?? flat[0]?.key;
        if (target) focusKey(target);
        else setFocusedKey(null);
      } else setFocusedKey(null);
    }
    parents.current = new Map(
      flat.map((i) => [i.key, i.parentId === null ? null : nodeKey(i.parentId)]),
    );
  }, [flat, focusedKey, focusKey, inTree]);

  // After retry / load-more: focus the first newly arrived node; give up once the level settles without one.
  useEffect(() => {
    const pending = pendingFocus.current;
    if (!pending) return;
    const nodes = levelNodes(flat, pending.parentId);
    if (nodes.length > pending.count) {
      pendingFocus.current = null;
      if (inTree()) focusKey(nodes[pending.count].key);
    } else if (
      !flat.some(
        (i) =>
          i.parentId === pending.parentId &&
          (i.kind === 'loading' ||
            i.kind === 'error' ||
            (i.kind === 'overflow' && i.overflow.loading)),
      )
    ) {
      pendingFocus.current = null;
    }
  }, [flat, focusKey, inTree]);

  // Announcements: "Loading…" once a user-triggered load is pending 300ms, "Couldn't load" on failure, success silent.
  useEffect(() => {
    const w = watch.current;
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
    // The old error row can outlive a retry by a render (onRetry may start loading async): not a new failure.
    if (failed && w.kind === 'retry' && !w.seenPending) return;
    if (failed) setMessage(t('treeView.loadError'));
    watch.current = null;
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = null;
  }, [flat, t]);

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
    if (
      event.key.length === 1 &&
      event.key !== ' ' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const ta = typeahead.current;
      if (ta.timer) clearTimeout(ta.timer);
      ta.buffer += event.key;
      ta.timer = setTimeout(() => {
        ta.buffer = '';
        ta.timer = null;
      }, 500);
      const match = typeaheadMatch(flat, item.key, ta.buffer);
      if (match) focusKey(match);
      event.preventDefault();
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

  const common = (item: TreeItem) => ({
    ref: (el: HTMLDivElement | null) => {
      if (el) itemEls.current.set(item.key, el);
      else itemEls.current.delete(item.key);
    },
    role: 'treeitem',
    'aria-level': item.level,
    tabIndex: tabStop === item.key ? 0 : -1,
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => onItemKeyDown(e, item),
    onFocus: (e: FocusEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) setFocusedKey(item.key);
    },
    onClick: (e: MouseEvent<HTMLDivElement>) => onItemClick(e, item),
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
          <div className={styles.row}>
            <span
              className={styles.toggle}
              aria-hidden="true"
              data-toggle={node.hasChildren ? '' : undefined}
              data-expanded={item.expanded || undefined}
              onClick={node.hasChildren ? (e) => onToggleClick(e, item) : undefined}
            >
              {node.hasChildren && <ChevronRight className={styles.chevron} />}
            </span>
            <span className={styles.content}>{node.content ?? node.label}</span>
          </div>
          {item.expanded && (
            <div role="group" className={styles.group}>
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
        <div className={styles.row}>
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
    // {...rest} first (Pattern B): role, aria-label, data-view and the key handling must win.
    <div
      {...rest}
      ref={mergeRefs(ref, rootEl)}
      role="tree"
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
      {items.map(renderItem)}
      <LiveRegion>{message}</LiveRegion>
    </div>
  );
});
