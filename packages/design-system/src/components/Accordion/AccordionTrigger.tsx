import { forwardRef, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import {
  useAccordionContext,
  useAccordionItemContext,
  type AccordionItemContextValue,
} from './context';
import type { AccordionHeaderLevel } from './Accordion';
import styles from './Accordion.module.scss';

export interface AccordionTriggerProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  /**
   * Override the default trigger indicator icon (rotates 180° when open).
   * Pass `null` to suppress the icon entirely. Default: `<ChevronDown />`.
   */
  icon?: ReactNode | null;
  /**
   * Controls rendered at the **right of the header**, OUTSIDE the toggle button —
   * so their buttons/menus are clickable without toggling the section, and the
   * heading's accessible name stays just the title. Keep it to a few small
   * controls (`<Button iconOnly>`, a `<DropdownMenu>` trigger, a `<Switch>`).
   */
  actions?: ReactNode;
  children: ReactNode;
}

interface ItemContextWithHeaderLevel extends AccordionItemContextValue {
  headerLevel: AccordionHeaderLevel;
}

/**
 * Heading-wrapped button that toggles the parent Item. Default indicator is a
 * `<ChevronDown>` icon that rotates 180° when open.
 */
export const AccordionTrigger = forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  function AccordionTrigger({ icon, actions, children, className, onKeyDown, ...props }, ref) {
    const { toggle } = useAccordionContext('Trigger');
    const itemCtx = useAccordionItemContext('Trigger') as ItemContextWithHeaderLevel;
    const { value, disabled, isOpen, triggerId, contentId, headerLevel } = itemCtx;

    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented) return;
      const isNav = ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key);
      if (!isNav) return;
      e.preventDefault();

      const root = e.currentTarget.closest<HTMLElement>('[data-accordion]');
      if (!root) return;

      // Match ONLY accordion toggle buttons (the `data-accordion-trigger` marker),
      // never an `aria-expanded` control a consumer put in the `actions` slot (a
      // DropdownMenu/Select trigger). Then scope to THIS root by filtering to
      // triggers whose nearest accordion ancestor is this root — so ArrowDown from
      // an outer trigger doesn't jump into a nested Accordion inside open Content.
      const triggers = Array.from(
        root.querySelectorAll<HTMLButtonElement>('button[data-accordion-trigger]:not(:disabled)'),
      ).filter((btn) => btn.closest('[data-accordion]') === root);
      if (triggers.length === 0) return;

      const current = triggers.indexOf(e.currentTarget);
      let next = current;

      if (e.key === 'ArrowDown') next = (current + 1) % triggers.length;
      else if (e.key === 'ArrowUp') next = (current - 1 + triggers.length) % triggers.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = triggers.length - 1;

      triggers[next]?.focus();
    };

    const renderedIcon =
      icon === null
        ? null
        : (icon ?? <ChevronDown size={16} aria-hidden="true" className={styles.indicator} />);

    // headerLevel is a string union of valid HTML heading tag names; cast to
    // ElementType for JSX use.
    const Heading = headerLevel as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

    return (
      // Header ROW: the heading (toggle button) + an optional actions slot. Actions
      // live OUTSIDE the heading/button so they're independently clickable (no
      // toggle), valid HTML (no nested buttons), and don't pollute the heading's
      // accessible name.
      <div className={styles.header}>
        <Heading className={styles.heading}>
          {/* Pattern B — {...props} first so component-owned id/aria-expanded/
              aria-controls/disabled/onClick/onKeyDown/className win and the ARIA
              contract can't be overridden by a consumer. */}
          <button
            {...props}
            ref={ref}
            type="button"
            id={triggerId}
            // Stable marker so keyboard arrow-nav targets ONLY accordion toggles,
            // never an aria-expanded control in the `actions` slot.
            data-accordion-trigger=""
            aria-expanded={isOpen}
            aria-controls={contentId}
            disabled={disabled}
            onClick={() => toggle(value)}
            onKeyDown={handleKeyDown}
            className={clsx(styles.trigger, className)}
          >
            <span className={styles.label}>{children}</span>
            {/* Icon wrapped in a slot so its side is controlled purely by CSS
                (root data-indicator-side flips its `order`) — works for a custom
                `icon` too, not just the default chevron. */}
            {renderedIcon !== null && <span className={styles.indicatorSlot}>{renderedIcon}</span>}
          </button>
        </Heading>
        {actions != null && <div className={styles.actions}>{actions}</div>}
      </div>
    );
  },
);
