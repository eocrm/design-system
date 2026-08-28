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
 * A trailing action rendered after the tab items in the same strip (e.g. a
 * `+ New deal` pseudo-tab). Rendered as a real `<button type="button">`, NOT
 * `role="tab"` — it has no tabpanel to control, is excluded from the
 * arrow-key roving order, and the animated selection indicator never targets
 * it. Reachable via the Tab key like any ordinary button, right after the
 * currently-focusable tab.
 */
export interface TabsAction {
  /** Visible label. Also the button's accessible name — no separate aria-label needed. */
  label: string;
  /** Optional decorative icon rendered before the label. Rendered `aria-hidden` — the label carries the accessible name. */
  icon?: ReactNode;
  /** Called when the button is clicked. Never changes `activeId` or fires `onChange` — wire up your own state (e.g. append a new tab) in the handler. */
  onClick: () => void;
  /** Disables the button (dimmed, non-interactive). Default `false`. */
  disabled?: boolean;
}

/**
 * Determines what happens when Arrow keys move focus between tabs.
 * - `auto` (default) — focus and onChange both fire on Arrow. Best for cheap, eager-rendered panels.
 * - `manual` — Arrow only moves focus; Enter/Space activates via native button click. Best for lazy-loaded panels.
 */
export type TabsActivationMode = 'auto' | 'manual';

/**
 * Tablist layout and `aria-orientation` value. Use `'horizontal'` (the
 * default) for a conventional tab strip or `'vertical'` for a fixed
 * master–detail rail. `'auto'` starts vertical and switches from vertical to
 * horizontal when the available tab-strip width reaches a configurable
 * breakpoint (320px by default); it is for a `Split` rail that becomes a
 * full-width strip when the panes stack.
 */
export type TabsOrientation = 'horizontal' | 'vertical' | 'auto';

type EffectiveTabsOrientation = Exclude<TabsOrientation, 'auto'>;

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** The tabs to render. Each item must have a unique `id`. */
  items: TabItem[];
  /** The id of the currently-active tab. If it doesn't match any item, the strip still stays keyboard-reachable (first tab gets tabindex=0). */
  activeId: string;
  /** Called with the tab id when the user activates a different tab. Won't fire when re-clicking the already-active tab. */
  onChange: (id: string) => void;
  /**
   * Optional id prefix for controlled tabpanels. When set, the ACTIVE tab gets
   * `aria-controls="${panelIdPrefix}-${itemId}-panel"` — the consumer must
   * render the matching panel with that id. When omitted, an internal id
   * (sanitized React `useId`) is generated.
   *
   * Only the active tab carries it, because consumers render only the active
   * panel; stamping every tab would point N-1 of them at elements that do not
   * exist. Inactive tabs keep their own `id` for the panel's
   * `aria-labelledby` to reference.
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
   * `'auto'` — measures available Tabs/tab-strip width: vertical below
   * `autoOrientationBreakpoint` and horizontal at or above it. It starts
   * vertical during SSR and whenever `ResizeObserver` is unavailable. Use it
   * with a collapsing `Split`: the fixed-width aside remains a vertical rail,
   * then the full-width stacked tablist becomes horizontal. `aria-orientation`,
   * keyboard navigation, and presentation always follow the effective orientation.
   */
  orientation?: TabsOrientation;
  /**
   * Available tab-strip width in px where `orientation="auto"` switches from
   * vertical to horizontal. Defaults to `320`. Set this per Tabs instance to
   * align automatic orientation with the surrounding layout's threshold.
   * @default 320
   */
  autoOrientationBreakpoint?: number;
  /**
   * A trailing action rendered after the tab items, inside the same strip
   * (e.g. `{ label: 'New deal', icon: <Plus/>, onClick: addDeal }`). Styled
   * tab-like but visibly muted, never becomes the selected tab, and is
   * skipped by arrow-key roving — reachable via the Tab key instead. For
   * controls that apply to the whole bar but aren't shaped like a tab (a
   * filter toggle), use `endContent`. For a control on a single tab, use
   * `TabItem.actions`.
   */
  action?: TabsAction;
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
 * Responsive tab strip (horizontal, vertical, or automatic) with optional
 * count chips and leading/trailing adornments. Controlled by the caller —
 * pass `activeId` and `onChange`. Implements the full WAI-ARIA Tabs pattern:
 * roving `tabIndex`, arrow-key navigation (Left/Right when horizontal,
 * Up/Down when vertical) + Home/End, `aria-controls` + `aria-orientation`,
 * and per-tab/per-panel ids.
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
 * // Trailing action — a button-like pseudo-tab that never becomes selected:
 * <Tabs
 *   items={items}
 *   activeId={tab}
 *   onChange={setTab}
 *   action={{ label: '+ New entity', icon: <Plus size={14} />, onClick: createEntity }}
 * />
 *
 * @example
 * // Responsive master–detail rail with a trailing unsaved-changes badge:
 * <Split
 *   asideWidth="220px"
 *   collapseBelow="sm"
 *   aside={
 *     <Tabs
 *       orientation="auto"
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
 * - ❌ Combining `orientation="auto"` with app-owned viewport measurement.
 *   Auto mode measures the available Tabs/tab-strip width, so let it react to
 *   the `Split`'s layout instead of duplicating breakpoint state in the app.
 * - ❌ Reaching for `action` to switch views. It never sets `activeId` — if
 *   the click should select a tab, add a `TabItem` instead.
 */
export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  {
    items,
    activeId,
    onChange,
    panelIdPrefix,
    activationMode = 'auto',
    orientation = 'horizontal',
    autoOrientationBreakpoint = 320,
    action,
    endContent,
    className,
    ...props
  },
  ref,
) {
  const reactId = useId();
  const prefix = panelIdPrefix ?? sanitizeId(reactId);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const scrollWrapRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const endContentRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const firstMeasureRef = useRef(true);
  const hasEndContent = endContent != null;
  const [automaticOrientation, setAutomaticOrientation] =
    useState<EffectiveTabsOrientation>('vertical');
  const effectiveOrientation: EffectiveTabsOrientation =
    orientation === 'auto' ? automaticOrientation : orientation;

  useLayoutEffect(() => {
    if (orientation !== 'auto') return;
    // Measure the box that receives the available layout width, rather than
    // the tablist's intrinsic inline-flex width. With end content, the strip
    // shares a stable root row with controls at its end, so its horizontal
    // budget is root width minus the end region's border-box width (including
    // the gap padding). The end region keeps that footprint in both
    // orientations, so the same measurement cannot bounce the mode at the
    // boundary.
    const root = hasEndContent ? rootRef.current : scrollWrapRef.current;
    const end = hasEndContent ? endContentRef.current : null;
    if (!root || (hasEndContent && !end) || typeof ResizeObserver === 'undefined') return;

    let rootWidth = root.getBoundingClientRect().width;
    let endContentWidth = end?.getBoundingClientRect().width ?? 0;
    const update = () => {
      const availableWidth = Math.max(0, rootWidth - endContentWidth);
      setAutomaticOrientation(
        availableWidth >= autoOrientationBreakpoint ? 'horizontal' : 'vertical',
      );
    };
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // contentRect excludes padding, but the end-content gap consumes real
        // horizontal strip space. Read the border box from the observed target.
        const width = entry.target.getBoundingClientRect().width;
        if (entry.target === root) rootWidth = width;
        if (entry.target === end) endContentWidth = width;
      }
      update();
    });

    update();
    observer.observe(root);
    if (end) observer.observe(end);
    return () => observer.disconnect();
  }, [orientation, hasEndContent, autoOrientationBreakpoint]);

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

    const vertical = effectiveOrientation === 'vertical';
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
  }, [activeId, items, effectiveOrientation]);

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
    const vertical = effectiveOrientation === 'vertical';
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
      ref={scrollWrapRef}
      className={clsx(
        styles.scrollWrap,
        effectiveOrientation === 'vertical' && styles.scrollWrapVertical,
      )}
    >
      <div
        // Consumer-controlled props come first so component-owned attrs below
        // (role, aria-orientation, onKeyDown, className) always win.
        {...props}
        ref={ref}
        role="tablist"
        aria-orientation={effectiveOrientation}
        onKeyDown={onKeyDown}
        className={clsx(
          styles.tabs,
          effectiveOrientation === 'vertical' && styles.vertical,
          className,
        )}
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
              // ONLY on the active tab. Consumers render just the active
              // panel — that is what this API's shape implies and what the
              // docs describe — so stamping every tab shipped N-1 dangling
              // IDREFs that no consumer could fix without eagerly mounting
              // every panel and firing every panel's queries on first paint
              // (#501). Inactive tabs keep their `id`, which is what the
              // panel's `aria-labelledby` points back to, so the relationship
              // is still expressed in both directions for the pair that
              // actually exists.
              aria-controls={active ? panelId : undefined}
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
        {action != null && (
          // Plain button — deliberately NOT role="tab": no tabpanel to
          // control, excluded from the arrow-key roving above (which only
          // ever reads `items`/`tabRefs`), and never measured by the
          // indicator effect (which only looks up `tabRefs[activeId]`).
          // Known, accepted `aria-required-children` deviation: this leaves
          // one non-"tab" child in a `role="tablist"` container, same as the
          // `TabItem.actions` button above already does. A real `<button>`
          // still announces correctly to AT regardless of its parent's role.
          <button
            type="button"
            className={styles.action}
            onClick={action.onClick}
            disabled={action.disabled}
          >
            {action.icon != null && (
              <span className={styles.icon} aria-hidden="true">
                {action.icon}
              </span>
            )}
            <span className={styles.label}>{action.label}</span>
          </button>
        )}
        <span ref={indicatorRef} className={styles.indicator} aria-hidden="true" />
      </div>
    </div>
  );

  if (!hasEndContent) return strip;

  return (
    <div
      ref={rootRef}
      className={clsx(styles.root, effectiveOrientation === 'vertical' && styles.rootVertical)}
    >
      {strip}
      {/* data-tabs-end is an internal test hook (module classes are hashed), not public API. */}
      <div ref={endContentRef} data-tabs-end="" className={styles.endContent}>
        {endContent}
      </div>
    </div>
  );
});
