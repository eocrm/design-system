import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Button } from '../Button';
import styles from './TopBar.module.scss';

/**
 * Tone of the optional notification-indicator dot. Selects the dot color.
 * - `'danger'` (default) — red, for unread / urgent notifications.
 * - `'warning'` — amber, for soft-warning cues (maintenance banner, etc.).
 * - `'info'` — blue, for informational badges.
 * - `'accent'` — accent color, for "new content" cues.
 */
export type TopBarIndicatorTone = 'danger' | 'warning' | 'info' | 'accent';

/**
 * Props for `<TopBar.IconButton>` — a thin wrapper over `<Button iconOnly
 * variant="ghost" size="sm">` sized for the bar with one addition: an
 * optional notification-indicator dot positioned in the upper-right corner.
 */
export interface TopBarIconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  /**
   * Icon to render inside the button. Typically a single lucide icon
   * (e.g. `<Bell size={16} />`). The wrapping button supplies the
   * accessible name via `aria-label` — the icon itself is decorative.
   */
  children: ReactNode;
  /**
   * Show a small dot in the upper-right corner of the button. Useful for
   * "unread notifications", "pending updates", etc. The dot is purely
   * visual (`aria-hidden`); the consumer is responsible for surfacing
   * count / status text to assistive tech, typically via the button's
   * `aria-label` or a hidden span.
   */
  indicator?: boolean;
  /**
   * Dot color. Defaults to `'danger'` (red). See `TopBarIndicatorTone` for
   * the full option set.
   */
  indicatorTone?: TopBarIndicatorTone;
  /**
   * **Required.** Accessible name for the icon-only button — without it,
   * screen readers announce nothing. Phrase as an action (`'Notifications'`,
   * `'Create new'`). Include count info here when the indicator is on
   * (e.g. `'Notifications, 3 unread'`).
   */
  'aria-label': string;
}

/** Per-tone CSS class lookup. Kept as a record so adding a tone is one edit. */
const TONE_CLASS: Record<TopBarIndicatorTone, string> = {
  danger: styles.indicatorDanger,
  warning: styles.indicatorWarning,
  info: styles.indicatorInfo,
  accent: styles.indicatorAccent,
};

/**
 * Icon button subcomponent for `<TopBar>`. Wraps the design system's
 * `<Button iconOnly variant="ghost" size="sm">` and adds the optional
 * notification-indicator dot in the upper-right corner.
 *
 * Two reasons to reach for this instead of using `<Button>` directly:
 *
 * 1. The bar uses a specific 32×32 size + radius pair that the base
 *    Button doesn't expose as a single prop. Keeping it as a separate
 *    subcomponent means consumers don't have to remember the exact
 *    classes / sizes.
 * 2. The `indicator` dot is topbar-specific — outside the bar it would
 *    overlap with the layout in odd ways. Scoping it to the topbar
 *    keeps the API surface tight.
 *
 * @example
 * <TopBar.IconButton aria-label="Create new">
 *   <Plus size={16} />
 * </TopBar.IconButton>
 *
 * @example
 * // With a notification dot.
 * <TopBar.IconButton aria-label="Notifications, 3 unread" indicator>
 *   <Bell size={16} />
 * </TopBar.IconButton>
 *
 * @example
 * // Custom indicator tone for a soft cue (maintenance banner trigger).
 * <TopBar.IconButton
 *   aria-label="Maintenance scheduled"
 *   indicator
 *   indicatorTone="warning"
 * >
 *   <Wrench size={16} />
 * </TopBar.IconButton>
 *
 * @remarks When NOT to use
 * - For an icon-only button outside the topbar → use
 *   `<Button iconOnly variant="ghost">` directly. The TopBar variant has
 *   indicator-dot styling that only makes sense inside the bar.
 * - For a labeled action ("Create new" with both icon + text) → use a
 *   regular `<Button>`; this subcomponent is icon-only.
 *
 * @remarks Anti-patterns
 * - ❌ Forgetting `aria-label`. The button is icon-only — without a label
 *   screen readers announce nothing. TypeScript requires it.
 * - ❌ Relying on the indicator dot to communicate the count to assistive
 *   tech. The dot is `aria-hidden`; put the count text in the
 *   `aria-label` (`'Notifications, 3 unread'`) instead.
 */
export const TopBarIconButton = forwardRef<HTMLButtonElement, TopBarIconButtonProps>(
  function TopBarIconButton(
    { children, indicator = false, indicatorTone = 'danger', className, ...props },
    ref,
  ) {
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="sm"
        iconOnly
        className={clsx(styles.iconButton, className)}
        // {...props} last so consumer overrides win (Pattern A).
        {...props}
      >
        {children}
        {indicator && (
          <span aria-hidden className={clsx(styles.indicator, TONE_CLASS[indicatorTone])} />
        )}
      </Button>
    );
  },
);
