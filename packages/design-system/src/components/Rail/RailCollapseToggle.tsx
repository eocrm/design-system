import { forwardRef } from 'react';
import { ChevronsLeft } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import { useRail } from './Rail';
import { Button } from '../Button';
import styles from './Rail.module.scss';

export interface RailCollapseToggleProps {
  /** Forwarded to the underlying `<button>`. Composed with the toggle's own classes. */
  className?: string;
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
 * @example
 * <Rail.Footer>
 *   <Rail.CollapseToggle />
 * </Rail.Footer>
 */
export const RailCollapseToggle = forwardRef<HTMLButtonElement, RailCollapseToggleProps>(
  function RailCollapseToggle({ className }, ref) {
    const t = useTranslation();
    const { collapsed, setCollapsed } = useRail();
    return (
      <Button
        ref={ref}
        variant="ghost"
        size="sm"
        iconOnly
        aria-label={collapsed ? t('rail.expand') : t('rail.collapse')}
        onClick={() => setCollapsed((prev) => !prev)}
        className={clsx(
          styles.collapseToggle,
          collapsed && styles.collapseToggleRotated,
          className,
        )}
      >
        <ChevronsLeft size={14} aria-hidden />
      </Button>
    );
  },
);
