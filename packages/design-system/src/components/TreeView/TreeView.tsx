import {
  forwardRef,
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

  const visible = (key: string | null) => key !== null && flat.some((i) => i.key === key);
  const selectedKey = onSelect && selectedId !== null ? nodeKey(selectedId) : null;
  const tabStop = visible(focusedKey)
    ? focusedKey
    : visible(selectedKey)
      ? selectedKey
      : (flat[0]?.key ?? null);

  const focusKey = (key: string) => {
    setFocusedKey(key);
    itemEls.current.get(key)?.focus();
  };

  const activate = (item: TreeItem) => {
    if (item.kind === 'node') onSelect?.(item.node.id);
    // Task 3: error → onRetry, overflow → onLoadMore.
  };

  const run = (action: TreeAction) => {
    if (action.type === 'focus') focusKey(action.key);
    else if (action.type === 'expand')
      onExpandedChange(action.id, true); // Task 3: watch for announcements
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
    onExpandedChange(item.node.id, !item.expanded);
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
    if (item.kind === 'loading') {
      return (
        <div
          key={item.key}
          {...common(item)}
          className={styles.item}
          aria-label={t('treeView.loading')}
          aria-disabled="true"
          data-kind="status"
        >
          <div className={styles.row}>
            <span className={styles.toggle} aria-hidden="true">
              <CircularProgress size="sm" aria-hidden="true" />
            </span>
            <span className={styles.status}>{t('treeView.loading')}</span>
          </div>
        </div>
      );
    }
    // error + overflow rows: Task 3.
    return null;
  };

  return (
    // {...rest} first (Pattern B): role, aria-label, data-view and the key handling must win.
    <div {...rest} ref={ref} role="tree" data-view={view} className={clsx(styles.root, className)}>
      {items.map(renderItem)}
    </div>
  );
});
