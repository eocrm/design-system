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
   * `t('rail.collapse')` depending on the current state, when omitted OR
   * empty — an empty string is not an explicit name).
   */
  'aria-label'?: string;
}

/**
 * Pre-wired chevron button that toggles the surrounding rail; renders nothing while the `collapseBelow` override is active (`Rail.CollapseToggle`).
 * @see docs/components/Rail.md
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
        aria-label={ariaLabel || (collapsed ? t('rail.expand') : t('rail.collapse'))}
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
