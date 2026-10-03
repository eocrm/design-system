import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Button } from '../Button';
import styles from './TopBar.module.scss';

/**
 * Tone of the optional notification-indicator dot. Selects the dot color.
 * - `'danger'` (default) — red, for unread / urgent notifications.
 * - `'warning'` — dark amber, for soft-warning cues (maintenance banner, etc.).
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
 * Icon-only ghost button for `<TopBar>` with an optional notification-indicator dot.
 * @see docs/components/TopBar.md
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
