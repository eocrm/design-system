import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
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
  /**
   * Optional leading icon rendered before the label. Typically a `lucide-react`
   * icon. Sized via CSS to match the label's line height. Rendered with
   * `aria-hidden="true"` (decorative — the label carries the accessible name).
   */
  icon?: ReactNode;
  /**
   * Optional leading adornment rendered before the icon/label (e.g. a status
   * dot). Rendered as-is (NOT `aria-hidden`): if purely decorative mark your
   * node `aria-hidden`; if meaningful, give it accessible text so it joins the
   * tab's accessible name. Distinct from `icon`, which is always decorative.
   */
  leading?: ReactNode;
  /**
   * Optional trailing adornment rendered at the end of the tab (e.g. an
   * unsaved-changes badge or status `Badge`). In `vertical` orientation it is
   * pinned to the row's far-right edge; in `horizontal` it follows the label/
   * count. Rendered as-is (NOT `aria-hidden`) — same a11y note as `leading`.
   */
  trailing?: ReactNode;
  /**
   * Interactive control(s) for this tab (a `Switch`, a close button, a `⋯`
   * menu), rendered OUTSIDE the tab's `role="tab"` button so the markup is
   * valid and the control is focusable and keyboard-operable. For STATIC
   * adornments (a `Badge`, a status dot, a numeric count) use
   * `leading`/`trailing`/`count` — those render inside the button. Not
   * `aria-hidden`; give controls an accessible label. Adds a Tab stop.
   */
  actions?: ReactNode;
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
   * `'horizontal'` (default) — a horizontal strip with a sliding underline.
   * `'vertical'` — a stacked master–detail rail: full-width rows, a left accent
   * bar + tinted background on the active row, and ArrowUp/ArrowDown navigation.
   * Sets `aria-orientation` on the tablist accordingly. Put a vertical strip in a
   * `Split`'s `aside`, with the detail panel as the `Split`'s children beside it.
   */
  orientation?: TabsOrientation;
  /**
   * Controls for the whole tab bar (e.g. an "add tab" button, a filter
   * toggle), rendered at the end of the strip OUTSIDE the tablist so it never
   * scrolls with the tabs and is not part of tab keyboard navigation. For a
   * control attached to a single tab, use `TabItem.actions` instead.
   */
  endContent?: ReactNode;
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
 * Tab strip (horizontal or vertical) with optional count chips and leading/
 * trailing adornments. Controlled by the caller — pass `activeId` and
 * `onChange`. Implements the full WAI-ARIA Tabs pattern: roving `tabIndex`,
 * arrow-key navigation (Left/Right when horizontal, Up/Down when vertical) +
 * Home/End, `aria-controls` + `aria-orientation`, and per-tab/per-panel ids.
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
 * @example
 * // Vertical master–detail rail with a trailing unsaved-changes badge:
 * <Split
 *   aside={
 *     <Tabs
 *       orientation="vertical"
 *       items={[
 *         { id: 'general', label: 'General' },
 *         { id: 'security', label: 'Security', trailing: <Badge tone="warning">Unsaved</Badge> },
 *         { id: 'billing', label: 'Billing', count: 3 },
 *       ]}
 *       activeId={section}
 *       onChange={setSection}
 *     />
 *   }
 * >
 *   <SectionPanel id={section} />
 * </Split>
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
 * - ❌ Using `orientation="vertical"` as a page sidebar / primary navigation.
 *   It is for *intra-page* master–detail section switching, not route changes —
 *   use the app sidebar for navigation.
 */
export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  {
    items,
    activeId,
    onChange,
    panelIdPrefix,
    activationMode = 'auto',
    orientation = 'horizontal',
    endContent,
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

  // Position the shared indicator. Reads layout metrics from the active tab's
  // button and writes them as inline styles on the indicator. In horizontal
  // mode it's an underline driven by translateX + width; in vertical mode it's
  // a left accent bar driven by translateY + height. The cross-axis dimension
  // is cleared each pass so a runtime orientation flip can't leave a stale
  // width/height behind. useLayoutEffect (not useEffect) so the bar's new
  // position is committed before paint — avoids a one-frame flash at the old
  // location.
  useLayoutEffect(() => {
    const indicator = indicatorRef.current;
    if (!indicator) return;
    const node = tabRefs.current[activeId];
    if (!node) {
      // activeId doesn't match any item, or items is empty — hide the bar
      // rather than leave it stranded mid-slide. Important: we return BEFORE
      // touching firstMeasureRef, so a later "missing → valid" transition
      // still gets the no-animation first-paint treatment.
      indicator.style.opacity = '0';
      return;
    }
    indicator.style.opacity = '1';

    // When the active tab is wrapped in a per-tab `actions` cell
    // (role="presentation"), measure the CELL so the underline spans the whole
    // tab — label AND its controls — instead of just the button. Bare tabs
    // (no actions) measure the button, unchanged.
    const cell = node.parentElement;
    const measureNode = cell && cell.getAttribute('role') === 'presentation' ? cell : node;

    const vertical = orientation === 'vertical';
    const write = () => {
      if (vertical) {
        indicator.style.transform = `translateY(${measureNode.offsetTop}px)`;
        indicator.style.height = `${measureNode.offsetHeight}px`;
        indicator.style.width = ''; // CSS owns the bar thickness in vertical
      } else {
        indicator.style.transform = `translateX(${measureNode.offsetLeft}px)`;
        indicator.style.width = `${measureNode.offsetWidth}px`;
        indicator.style.height = ''; // CSS owns the bar thickness in horizontal
      }
    };

    if (firstMeasureRef.current) {
      // First paint: disable the transition for one frame so the indicator
      // doesn't slide in from (0, 0) on mount.
      indicator.style.transition = 'none';
      write();
      // Force a reflow before clearing the inline transition override so the
      // first measurement lands without animation.
      void indicator.offsetWidth;
      indicator.style.transition = '';
      firstMeasureRef.current = false;
      return;
    }

    write();
  }, [activeId, items, orientation]);

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
    // Only rove when the key originates on a tab (or the tablist itself). This
    // stops Arrow/Home/End inside a per-tab `actions` control from hijacking
    // tab navigation. Real roving focus always lands on a role="tab".
    if (
      event.target !== event.currentTarget &&
      (event.target as HTMLElement).getAttribute('role') !== 'tab'
    ) {
      return;
    }
    if (items.length === 0 || effectiveFocusedId === null) return;
    const currentIndex = items.findIndex((i) => i.id === effectiveFocusedId);
    // Vertical strips navigate with Up/Down; horizontal with Left/Right. The
    // matching `case nextKey:` below reads the active axis's keys.
    const vertical = orientation === 'vertical';
    const nextKey = vertical ? 'ArrowDown' : 'ArrowRight';
    const prevKey = vertical ? 'ArrowUp' : 'ArrowLeft';
    let nextIndex = -1;
    switch (event.key) {
      case nextKey:
        nextIndex = (currentIndex + 1) % items.length;
        break;
      case prevKey:
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

  const strip = (
    // The scroll wrapper owns overflow-x so the tablist itself stays an
    // overflow-visible box — that keeps the indicator span (positioned just
    // below the tablist's baseline) from being clipped by the auto-promoted
    // overflow-y.
    <div
      className={clsx(styles.scrollWrap, orientation === 'vertical' && styles.scrollWrapVertical)}
    >
      <div
        // Consumer-controlled props come first so component-owned attrs below
        // (role, aria-orientation, onKeyDown, className) always win.
        {...props}
        ref={ref}
        role="tablist"
        aria-orientation={orientation}
        onKeyDown={onKeyDown}
        className={clsx(styles.tabs, orientation === 'vertical' && styles.vertical, className)}
      >
        {items.map((item) => {
          const active = item.id === activeId;
          const focused = item.id === effectiveFocusedId;
          const tabId = `${prefix}-${item.id}-tab`;
          const panelId = `${prefix}-${item.id}-panel`;
          const tab = (
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
              <span className={styles.main}>
                {item.leading != null && <span className={styles.leading}>{item.leading}</span>}
                {item.icon != null && (
                  <span className={styles.icon} aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                <span className={styles.label}>{item.label}</span>
                {item.count !== undefined && <span className={styles.count}>{item.count}</span>}
              </span>
              {item.trailing != null && <span className={styles.trailing}>{item.trailing}</span>}
            </button>
          );

          if (item.actions == null) return tab;
          return (
            <span key={item.id} role="presentation" className={styles.cell}>
              {tab}
              <span className={styles.tabActions}>{item.actions}</span>
            </span>
          );
        })}
        <span ref={indicatorRef} className={styles.indicator} aria-hidden="true" />
      </div>
    </div>
  );

  if (endContent == null) return strip;

  return (
    <div className={clsx(styles.root, orientation === 'vertical' && styles.rootVertical)}>
      {strip}
      {/* data-tabs-end is an internal test hook (module classes are hashed), not public API. */}
      <div data-tabs-end="" className={styles.endContent}>
        {endContent}
      </div>
    </div>
  );
});
