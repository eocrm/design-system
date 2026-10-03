import {
  Children,
  Fragment,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import type { CollapseBreakpoint } from '../_internal/collapse';
import { useBelowBreakpoint } from '../../hooks/useBelowBreakpoint';
import { RailHeader } from './RailHeader';
import { RailFooter } from './RailFooter';
import { RailSpacer } from './RailSpacer';
import { RailCollapseToggle } from './RailCollapseToggle';
import { RailSection } from './RailSection';
import { RailItem } from './RailItem';
import { RailGroup } from './RailGroup';
import styles from './Rail.module.scss';

/**
 * Context shape published to every Rail subcomponent. The collapsed flag
 * cascades visual state (icon-only vs. label+icon) and gates collapsed-mode
 * behaviors (Item tooltips, Group flyouts). `setCollapsed` is the same
 * setter the CollapseToggle calls — exposed so a custom toggle rendered
 * anywhere inside the rail can drive it without going through props.
 */
export interface RailContextValue {
  /**
   * Whether the rail is currently in its narrow icon-only state — the
   * EFFECTIVE state, i.e. what is actually rendered. `true` whenever the
   * `collapseBelow` viewport override is active, regardless of the
   * `collapsed` / `defaultCollapsed` value.
   */
  collapsed: boolean;
  /**
   * Setter that accepts a value or an updater function. Writes the consumer's
   * *preference*, which is what `onCollapsedChange` reports and what governs
   * again above `collapseBelow` — an updater's `prev` is therefore the
   * preference, not the viewport-overridden effective state.
   */
  setCollapsed: (next: boolean | ((prev: boolean) => boolean)) => void;
  /**
   * `true` while the `collapseBelow` viewport override is forcing the collapsed
   * state — i.e. `collapsed` is `true` no matter what the consumer asked for,
   * and no toggle can change what's rendered. Use it to hide or disable UI that
   * would try to expand the rail; `<Rail.CollapseToggle>` unmounts itself on
   * it. Always `false` when `collapseBelow` is unset.
   */
  collapsedByViewport: boolean;
}

/**
 * Context used by every `<Rail.*>` subcomponent. Throws via `useRail()` if a
 * subcomponent is rendered outside a `<Rail>` provider — a misuse that would
 * otherwise produce silently broken collapsed-state behavior.
 */
export const RailContext = createContext<RailContextValue | null>(null);

/**
 * Hook for `<Rail.*>` subcomponents to read the rail's collapsed state. Throws
 * if called outside `<Rail>` to make missing-provider misuses loud.
 */
export function useRail(): RailContextValue {
  const ctx = useContext(RailContext);
  if (!ctx) throw new Error('Rail subcomponents must be used inside <Rail>');
  return ctx;
}

export interface RailProps extends Omit<HTMLAttributes<HTMLElement>, 'aria-label'> {
  /**
   * Controlled collapsed flag. Provide alongside `onCollapsedChange` to drive
   * the rail's narrow/wide state externally (e.g. persisted to localStorage
   * or URL). Omit both `collapsed` and `defaultCollapsed` to let the rail
   * stay expanded.
   */
  collapsed?: boolean;
  /**
   * Initial collapsed state for the uncontrolled case. Has no effect when
   * `collapsed` is provided. Defaults to `false` — the rail mounts expanded.
   */
  defaultCollapsed?: boolean;
  /**
   * Fires whenever the rail toggles, both controlled and uncontrolled. Useful
   * for persisting the state to localStorage or the URL.
   */
  onCollapsedChange?: (collapsed: boolean) => void;
  /**
   * Force the icon-only collapsed mode while the **viewport** is at or below a
   * width threshold: `'sm'` 480px / `'md'` 640px / `'lg'` 768px. Omit for no
   * responsive behavior (the default) — `collapsed` alone governs.
   *
   * Below the threshold the rail renders collapsed regardless of `collapsed` /
   * `defaultCollapsed`; above it, the consumer's value governs again,
   * untouched. It is a **presentation override, not a user choice**, so
   * `onCollapsedChange` does NOT fire when the viewport crosses the threshold
   * in either direction — a narrow window can't silently rewrite a persisted
   * preference. `<Rail.CollapseToggle>` hides itself while the override is
   * active, since it could not change anything.
   *
   * Unlike `<Grid collapseBelow>` / `<Split collapseBelow>`, which measure
   * their own width with a container query, this measures the viewport: the
   * rail's own width is exactly what collapsing changes, so a container query
   * would be circular. Same token scale, different basis.
   *
   * ⚠️ **Your shell's column track must follow.** The override shrinks the
   * rail but is invisible to the layout around it — a shell that sizes its
   * rail track from its OWN `collapsed` state will keep a 240px track around a
   * 56px rail and leave a dead gap on every screen. Key the track off the
   * viewport or off the rail instead, both of which work precisely because the
   * basis here is the viewport rather than a container:
   *
   * ```scss
   * // Either mirror the breakpoint…
   * @media (max-width: 768px) { .shell { grid-template-columns: 56px 1fr; } }
   * // …or follow the rail's own state attribute, no breakpoint duplication:
   * .shell:has(nav[data-collapsed]) { grid-template-columns: 56px 1fr; }
   * ```
   *
   * @example
   * // Persisted preference, plus a hard collapse on phone-width viewports.
   * <Rail collapsed={pref} onCollapsedChange={setPref} collapseBelow="sm">
   */
  collapseBelow?: CollapseBreakpoint;
  /**
   * Accessible label for the wrapping `<nav>` landmark. Defaults to
   * `t('rail.navigation')` when omitted OR empty — an empty string is not an
   * explicit name — so screen readers always announce a name for the region.
   * Override when the page has multiple navigation rails.
   */
  'aria-label'?: string;
  /**
   * Rail children — typically a sequence of `<Rail.Header>`, `<Rail.Section>`,
   * `<Rail.Group>`, `<Rail.Spacer>`, `<Rail.Footer>`. Order matters: the first
   * `<Rail.Footer>` is the split point — everything before it goes in the
   * scroll box, the Footer and anything after it stay outside and pinned to
   * the bottom. A `<Rail.Spacer>` is not needed for that; use it to push a
   * trailing *section* (settings, help) down inside the scrolling area.
   */
  children: ReactNode;
}

/**
 * Collapsible left-side navigation rail (240px labelled / 56px icon-only); compound `Rail.Header`, `Section`, `Item`, `Group`, `Spacer`, `CollapseToggle`, `Footer`.
 * @see docs/components/Rail.md
 */
const RailRoot = forwardRef<HTMLElement, RailProps>(function Rail(
  {
    collapsed: controlledCollapsed,
    defaultCollapsed = false,
    onCollapsedChange,
    collapseBelow,
    'aria-label': ariaLabel,
    className,
    children,
    ...props
  },
  ref,
) {
  const t = useTranslation();

  const isControlled = controlledCollapsed !== undefined;
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState(defaultCollapsed);
  // The consumer's preference — controlled prop or internal state. Deliberately
  // NOT touched by the viewport override: nothing writes it on a breakpoint
  // cross, so an uncontrolled toggle survives a narrow period and a persisted
  // controlled value is never rewritten behind the consumer's back.
  const preferredCollapsed = isControlled
    ? (controlledCollapsed as boolean)
    : uncontrolledCollapsed;

  const collapsedByViewport = useBelowBreakpoint(collapseBelow);
  const collapsed = collapsedByViewport || preferredCollapsed;

  const setCollapsed = useCallback<RailContextValue['setCollapsed']>(
    (next) => {
      // `prev` is the preference, not the effective state, so a custom toggle
      // rendered while the override is active still flips the stored value.
      const value = typeof next === 'function' ? next(preferredCollapsed) : next;
      onCollapsedChange?.(value);
      if (!isControlled) setUncontrolledCollapsed(value);
    },
    [preferredCollapsed, isControlled, onCollapsedChange],
  );

  const ctx = useMemo<RailContextValue>(
    () => ({ collapsed, setCollapsed, collapsedByViewport }),
    [collapsed, setCollapsed, collapsedByViewport],
  );

  // Split children: anything before the FIRST <Rail.Footer> goes into the
  // scrollable body; the Footer itself (and anything after it, if a
  // consumer puts trailing content) stays OUTSIDE the scroll region so
  // the bottom area is always visible regardless of how tall the item
  // list grows.
  //
  // This replaces the earlier `position: sticky; bottom: 0` approach —
  // sticky pinned the Footer visually but items continued to render in
  // the scrollable flow BEHIND the sticky footer, and the painting order
  // surprises (items appearing through the footer's background) made it
  // hard to keep reliable. Structural separation = no z-index gymnastics.
  const { body, footer } = useMemo(() => {
    const bodyChildren: ReactNode[] = [];
    const footerChildren: ReactNode[] = [];
    const arr = Children.toArray(children);
    const flatten = (nodes: ReactNode[]): ReactNode[] =>
      nodes.flatMap((node) =>
        isValidElement(node) && node.type === Fragment
          ? Children.toArray((node.props as { children?: ReactNode }).children)
          : [node],
      );
    let seenFooter = false;
    for (const child of flatten(arr)) {
      if (isValidElement(child) && child.type === RailFooter) {
        seenFooter = true;
        footerChildren.push(child);
      } else if (seenFooter) {
        footerChildren.push(child);
      } else {
        bodyChildren.push(child);
      }
    }
    // Re-key the flattened children before render. `Children.toArray` restarts
    // its synthetic keys at ".0" on every call — including the inner call in
    // `flatten` for a Fragment's children — so a Fragment child's first element
    // would otherwise share key ".0" with the first top-level child and React
    // would warn ("two children with the same key") and could drop one. A fresh
    // per-array index key guarantees uniqueness within each rendered list (body
    // and footer render into separate parents, so per-array indices suffice).
    const reKey = (nodes: ReactNode[], prefix: string): ReactNode[] =>
      nodes.map((node, i) =>
        isValidElement(node) ? cloneElement(node, { key: `${prefix}-${i}` }) : node,
      );
    return { body: reKey(bodyChildren, 'rail-body'), footer: reKey(footerChildren, 'rail-footer') };
  }, [children]);

  return (
    <RailContext.Provider value={ctx}>
      <nav
        ref={ref}
        aria-label={ariaLabel || t('rail.navigation')}
        data-collapsed={collapsed ? '' : undefined}
        className={clsx(styles.rail, collapsed && styles.collapsed, className)}
        // {...props} last so consumer overrides win (Pattern A).
        {...props}
      >
        <div className={styles.body}>{body}</div>
        {footer.length > 0 && <div className={styles.footerWrap}>{footer}</div>}
      </nav>
    </RailContext.Provider>
  );
});

/**
 * Collapsible left-side navigation rail; subcomponents attached to the root via `Object.assign`.
 * @see docs/components/Rail.md
 */
export const Rail = Object.assign(RailRoot, {
  Header: RailHeader,
  Footer: RailFooter,
  Spacer: RailSpacer,
  CollapseToggle: RailCollapseToggle,
  Section: RailSection,
  Item: RailItem,
  Group: RailGroup,
});
