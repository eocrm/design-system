import {
  forwardRef,
  type ComponentPropsWithRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { useRail } from './Rail';
import { Tooltip } from '../Tooltip';
import styles from './Rail.module.scss';

interface RailItemOwnProps {
  /**
   * Leading icon — required for top-level items (the only thing visible
   * when the rail is collapsed); optional for items nested inside a
   * `<Rail.Group>` (Jira renders subitems without icons).
   */
  icon?: ReactNode;
  /**
   * Optional trailing badge — typically a `<Badge>` or a small numeric
   * pill. Right-aligned when the rail is expanded; fades to invisible
   * when collapsed (the badge content is announced by screen readers
   * either way since it's still in the DOM).
   */
  badge?: ReactNode;
  /**
   * The label text — visible when expanded, used as the tooltip when
   * collapsed. Optional at the type level only to satisfy the polymorphic
   * `forwardRef` generic; in practice every item has a label.
   */
  children?: ReactNode;
}

/**
 * Polymorphic helper that intersects `RailItemOwnProps` with the underlying
 * element's props (minus the ones we own). Mirrors `<Link>`.
 */
type PolymorphicProps<C extends ElementType, P> = P & { as?: C } & Omit<
    ComponentPropsWithoutRef<C>,
    keyof P | 'as'
  >;

/**
 * Public prop type. Generic `C` defaults to `'a'`. When the consumer passes
 * `as={NavLink}`, all of NavLink's props (`to`, `replace`, `end`, etc.) are
 * available with full TypeScript inference.
 */
export type RailItemProps<C extends ElementType = 'a'> = PolymorphicProps<C, RailItemOwnProps>;

/**
 * Internal generic-preserving signature. React's `forwardRef` strips the
 * generic from the returned component, so we re-attach it via the cast
 * below.
 */
type RailItemComponent = <C extends ElementType = 'a'>(
  props: RailItemProps<C> & { ref?: ComponentPropsWithRef<C>['ref'] },
) => ReactElement | null;

/**
 * Single navigation item in the rail. Polymorphic — defaults to `<a>` but
 * the consumer typically passes `as={NavLink}` (react-router) or any
 * equivalent routing component. Active styling is **purely CSS** via the
 * `[aria-current="page"]` selector, so any routing primitive that sets
 * `aria-current` on the rendered element triggers the active state — no
 * routing dependency in the library.
 *
 * Behavior:
 * - Expanded: renders icon + label + (optional) badge on a single row.
 * - Collapsed (top-level): renders icon only, wrapped in a `<Tooltip>` so
 *   the label is still discoverable. Only wraps in Tooltip when the
 *   children are a string AND the item is a direct child of the rail (not
 *   inside a `<Rail.Group>` — group subitems render inside the flyout
 *   popover when collapsed, which already shows their labels).
 *
 * @example
 * // Default — renders <a href="…">.
 * <Rail.Item icon={<Home />} href="/dashboard">Dashboard</Rail.Item>
 *
 * @example
 * // SPA — react-router NavLink sets aria-current="page" automatically,
 * // which Rail's CSS picks up and renders the active accent.
 * <Rail.Item icon={<Home />} as={NavLink} to="/" end>Dashboard</Rail.Item>
 *
 * @example
 * // Trailing badge — fades when the rail collapses.
 * <Rail.Item icon={<Building />} as={NavLink} to="/tenants" badge="12">
 *   Tenants
 * </Rail.Item>
 *
 * @remarks Anti-patterns
 * - ❌ Putting an icon-less top-level item directly in a `<Rail.Section>` —
 *   when the rail collapses there's literally nothing visible. Items
 *   without an icon belong inside a `<Rail.Group>`.
 * - ❌ Hand-rolling active-state styling. Set `aria-current="page"` on the
 *   rendered element and the CSS handles it.
 */
export const RailItem = forwardRef(function RailItem<C extends ElementType = 'a'>(
  { as, icon, badge, children, className, ...rest }: RailItemProps<C>,
  ref: ForwardedRef<Element>,
) {
  const Component = (as ?? 'a') as ElementType;
  const { collapsed } = useRail();

  // The polymorphic anchor / NavLink / button receives the className so the
  // CSS `:has([aria-current="page"])` selector can light it up via the
  // descendant's aria-current. Active-state styling is purely CSS.
  const inner = (
    <Component
      ref={ref}
      className={clsx(styles.item, className)}
      // {...rest} last so consumer overrides win (Pattern A).
      {...rest}
    >
      {icon && (
        <span className={styles.itemIcon} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={styles.itemLabel}>{children}</span>
      {badge != null && <span className={styles.itemBadge}>{badge}</span>}
    </Component>
  );

  // Wrap in a Tooltip when the rail is collapsed and the label is a simple
  // string — only then can we project the label onto the tooltip surface
  // safely. Non-string children (icons, complex nodes) are ignored;
  // consumers can always wrap their item in their own <Tooltip> when needed.
  if (collapsed && typeof children === 'string') {
    return (
      <Tooltip content={children} side="right">
        {inner}
      </Tooltip>
    );
  }
  return inner;
}) as RailItemComponent;
