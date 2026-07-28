import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import { useRail } from './Rail';
import { Button } from '../Button';
import styles from './Rail.module.scss';

export interface RailCollapseToggleProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'children'
> {
  /**
   * Override the auto-generated aria-label (defaults to `t('rail.expand')` /
   * `t('rail.collapse')` depending on the current state).
   */
  'aria-label'?: string;
}

/**
 * Pre-wired chevron button that toggles the surrounding `<Rail>`'s collapsed
 * state. Renders a ghost-style icon-only `<Button>` whose `aria-label` flips
 * between `t('rail.expand')` and `t('rail.collapse')` to match the current
 * direction of the action. The chevron rotates 180° when the rail is
 * collapsed so it always points "outward" (toward where the rail will
 * expand).
 *
 * Drop this inside a `<Rail.Footer>` for the standard pattern, or anywhere
 * inside the rail for a custom layout.
 *
 * **Renders nothing while the rail's `collapseBelow` viewport override is
 * active.** The override pins the collapsed state, so the button could not
 * change anything — a control that can never do its job is hidden rather than
 * shown inert (same call as DataTable's drag grip on a single-column table).
 *
 * @example
 * <Rail.Footer>
 *   <Rail.CollapseToggle />
 * </Rail.Footer>
 */
export const RailCollapseToggle = forwardRef<HTMLButtonElement, RailCollapseToggleProps>(
  function RailCollapseToggle({ className, onClick, 'aria-label': ariaLabel, ...rest }, ref) {
    const t = useTranslation();
    const { collapsed, setCollapsed, collapsedByViewport } = useRail();
    if (collapsedByViewport) return null;
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="sm"
        iconOnly
        aria-label={ariaLabel ?? (collapsed ? t('rail.expand') : t('rail.collapse'))}
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) setCollapsed((prev) => !prev);
        }}
        className={clsx(styles.collapseToggle, className)}
        {...rest}
      >
        {/* Swap the icon instead of rotating the button so the icon's anchor
            point (left side of the row) stays stable across the collapse. A
            CSS rotate transform on the button moves the icon visually from
            row-start to row-end because justify-content: flex-start flips
            with the rotation — looks like a "jump". */}
        {collapsed ? (
          <ChevronsRight size={14} aria-hidden />
        ) : (
          <ChevronsLeft size={14} aria-hidden />
        )}
      </Button>
    );
  },
);
