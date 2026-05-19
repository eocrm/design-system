import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
} from 'react';
import clsx from 'clsx';
import styles from './Tabs.module.scss';

/** One tab in the tablist. */
export interface TabItem {
  /** Stable identifier — used for `activeId`/`onChange` and id generation. Must be unique within the items array. */
  id: string;
  /** Visible label for the tab. */
  label: string;
  /** Optional count chip shown next to the label (e.g. "Activity · 12"). */
  count?: number;
}

/**
 * Determines what happens when Arrow keys move focus between tabs.
 * - `auto` (default) — focus and onChange both fire on Arrow. Best for cheap, eager-rendered panels.
 * - `manual` — Arrow only moves focus; Enter/Space activates via native button click. Best for lazy-loaded panels.
 */
export type TabsActivationMode = 'auto' | 'manual';

/** `aria-orientation` value. Affects how screen readers announce the strip. */
export type TabsOrientation = 'horizontal' | 'vertical';

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** The tabs to render. Each item must have a unique `id`. */
  items: TabItem[];
  /** The id of the currently-active tab. If it doesn't match any item, the strip still stays keyboard-reachable (first tab gets tabindex=0). */
  activeId: string;
  /** Called with the tab id when the user activates a different tab. Won't fire when re-clicking the already-active tab. */
  onChange: (id: string) => void;
  /**
   * Optional id prefix for controlled tabpanels. When set, each tab gets
   * `aria-controls="${panelIdPrefix}-${itemId}-panel"` — the consumer must
   * render the matching panel with that id. When omitted, an internal id
   * (sanitized React `useId`) is generated.
   */
  panelIdPrefix?: string;
  /**
   * `'auto'` (default): arrow keys move focus AND fire onChange — the visible
   * panel changes with each keystroke. Best for cheap, eager-rendered panels.
   *
   * `'manual'`: arrow keys only move focus; Enter/Space (the native button
   * activation keys) then commits via onChange. Use this when panels are
   * expensive (lazy-load, network) so the user can scan tab labels without
   * triggering loads.
   */
  activationMode?: TabsActivationMode;
  /**
   * `'horizontal'` (default) or `'vertical'`. Passed through as `aria-orientation`
   * on the tablist. Only affects how AT announces the strip — the layout itself
   * is up to the consumer's container.
   */
  orientation?: TabsOrientation;
}

// React 19's useId() can include characters that are valid HTML id values but
// break CSS selectors (`:r0:` → `#:r0:` is not a valid selector). Sanitize to
// `[a-zA-Z0-9_-]` so the generated panel ids stay CSS-queryable.
function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// Some consumer environments (RSC, edge runtimes) don't define `process`.
// Read NODE_ENV defensively so the library never throws at module init.
const IS_DEV = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';

/**
 * Horizontal tab strip with optional count chips. Controlled by the caller —
 * pass `activeId` and `onChange`. Implements the full WAI-ARIA Tabs pattern:
 * roving `tabIndex`, ArrowLeft/ArrowRight/Home/End navigation, `aria-controls`
 * + `aria-orientation`, and per-tab/per-panel ids.
 *
 * @example
 * // Basic controlled usage:
 * function ContactView() {
 *   const [tab, setTab] = useState('overview');
 *   return (
 *     <>
 *       <Tabs
 *         items={[
 *           { id: 'overview', label: 'Overview' },
 *           { id: 'activity', label: 'Activity', count: 12 },
 *           { id: 'notes', label: 'Notes', count: 4 },
 *         ]}
 *         activeId={tab}
 *         onChange={setTab}
 *       />
 *       {tab === 'overview' && <OverviewPanel />}
 *     </>
 *   );
 * }
 *
 * @example
 * // Lazy-loaded panels — use manual mode so arrows scan without loading:
 * <Tabs items={items} activeId={tab} onChange={setTab} activationMode="manual" />
 *
 * @remarks When NOT to use
 * - For navigation between pages — use the sidebar or breadcrumbs. Tabs are
 *   for *intra-page* view switching.
 * - For 5+ tabs. That's usually a sign the entity is doing too much — split
 *   the page or use a different IA.
 * - When the user might want to see two views at once. Use side-by-side
 *   panels instead.
 *
 * @remarks Anti-patterns
 * - ❌ Lazy-loading tab content but losing form state when tabs switch.
 *   Either preserve state or warn the user before they lose data.
 * - ❌ Putting the page's primary action inside a tab. The primary action
 *   belongs in the page header.
 */
export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  {
    items,
    activeId,
    onChange,
    panelIdPrefix,
    activationMode = 'auto',
    orientation = 'horizontal',
    className,
    ...props
  },
  ref,
) {
  const reactId = useId();
  const prefix = panelIdPrefix ?? sanitizeId(reactId);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const firstMeasureRef = useRef(true);

  // Dev-only: warn on duplicate ids. The ref map would silently collapse them
  // and roving tabindex would behave unpredictably. Run as an effect (not in
  // render) so it fires once per items change and doesn't double-warn in
  // StrictMode dev.
  useEffect(() => {
    if (!IS_DEV) return;
    const ids = items.map((i) => i.id);
    if (new Set(ids).size !== ids.length) {
      // eslint-disable-next-line no-console
      console.warn('[Tabs] items contains duplicate ids:', ids);
    }
  }, [items]);

  // Position the shared underline indicator. Reads layout metrics from the
  // active tab's button and writes them as inline styles on the indicator.
  // useLayoutEffect (not useEffect) so the bar's new position is committed
  // before paint — avoids a one-frame flash at the old location.
  useLayoutEffect(() => {
    const indicator = indicatorRef.current;
    if (!indicator) return;
    const node = tabRefs.current[activeId];
    if (!node) {
      // activeId doesn't match any item, or items is empty — hide the bar
      // rather than leave it stranded mid-slide.
      indicator.style.opacity = '0';
      return;
    }
    indicator.style.opacity = '1';

    if (firstMeasureRef.current) {
      // First paint: disable the transition for one frame so the indicator
      // doesn't slide in from (0, 0) on mount.
      indicator.style.transition = 'none';
      indicator.style.transform = `translateX(${node.offsetLeft}px)`;
      indicator.style.width = `${node.offsetWidth}px`;
      // Force a reflow before clearing the inline transition override so the
      // first measurement lands without animation.
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      indicator.offsetWidth;
      indicator.style.transition = '';
      firstMeasureRef.current = false;
      return;
    }

    indicator.style.transform = `translateX(${node.offsetLeft}px)`;
    indicator.style.width = `${node.offsetWidth}px`;
  }, [activeId, items]);

  // Focused tab can drift from activeId in manual activation mode. In auto
  // mode they stay in sync because focusTab also calls onChange.
  const [focusedId, setFocusedId] = useState<string>(activeId);
  useEffect(() => {
    setFocusedId(activeId);
  }, [activeId]);

  // The effective focused id ALWAYS resolves to an item (or null when items is
  // empty). When `focusedId` doesn't match any item — e.g. activeId is invalid
  // or the active item was just deleted — we fall back to items[0] so the
  // tablist stays keyboard-reachable.
  const effectiveFocusedId = items.find((i) => i.id === focusedId)?.id ?? items[0]?.id ?? null;

  const focusTab = (id: string) => {
    setFocusedId(id);
    tabRefs.current[id]?.focus();
    if (activationMode === 'auto') {
      onChange(id);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (items.length === 0 || effectiveFocusedId === null) return;
    const currentIndex = items.findIndex((i) => i.id === effectiveFocusedId);
    let nextIndex = -1;
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % items.length;
        break;
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + items.length) % items.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    focusTab(items[nextIndex].id);
  };

  return (
    // The scroll wrapper owns overflow-x so the tablist itself stays an
    // overflow-visible box — that keeps the active-tab underline (`::after`
    // at bottom: -2px) from being clipped by the auto-promoted overflow-y.
    <div className={styles.scrollWrap}>
      <div
        // Consumer-controlled props come first so component-owned attrs below
        // (role, aria-orientation, onKeyDown, className) always win.
        {...props}
        ref={ref}
        role="tablist"
        aria-orientation={orientation}
        onKeyDown={onKeyDown}
        className={clsx(styles.tabs, className)}
      >
        {items.map((item) => {
          const active = item.id === activeId;
          const focused = item.id === effectiveFocusedId;
          const tabId = `${prefix}-${item.id}-tab`;
          const panelId = `${prefix}-${item.id}-panel`;
          return (
            <button
              key={item.id}
              ref={(el) => {
                tabRefs.current[item.id] = el;
                // React 19 ref-callback cleanup — runs when the element unmounts
                // or this callback identity changes (i.e. when items change).
                return () => {
                  delete tabRefs.current[item.id];
                };
              }}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={panelId}
              tabIndex={focused ? 0 : -1}
              className={clsx(styles.tab, active && styles.active)}
              // Skip the onChange call when clicking the already-active tab —
              // avoids unnecessary parent re-renders.
              onClick={() => {
                if (item.id !== activeId) onChange(item.id);
              }}
            >
              <span>{item.label}</span>
              {item.count !== undefined && <span className={styles.count}>{item.count}</span>}
            </button>
          );
        })}
        <span
          ref={indicatorRef}
          className={styles.indicator}
          aria-hidden="true"
        />
      </div>
    </div>
  );
});
