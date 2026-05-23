import {
  forwardRef,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import {
  useAccordionContext,
  useAccordionItemContext,
  type AccordionItemContextValue,
} from './context';
import type { AccordionHeaderLevel } from './Accordion';
import styles from './Accordion.module.scss';

export interface AccordionTriggerProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /**
   * Override the default trigger indicator icon (rotates 180° when open).
   * Pass `null` to suppress the icon entirely. Default: `<ChevronDown />`.
   */
  icon?: ReactNode | null;
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
  function AccordionTrigger({ icon, children, className, onKeyDown, ...props }, ref) {
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

      // querySelectorAll matches all descendants — including triggers in a
      // NESTED Accordion inside an open Content. Scope keyboard nav to the
      // current root by filtering to triggers whose nearest accordion ancestor
      // IS this root. Without this, ArrowDown from an outer trigger jumps into
      // the inner accordion.
      const triggers = Array.from(
        root.querySelectorAll<HTMLButtonElement>(
          'button[aria-expanded]:not(:disabled)',
        ),
      ).filter((btn) => btn.closest('[data-accordion]') === root);
      if (triggers.length === 0) return;

      const current = triggers.indexOf(e.currentTarget);
      let next = current;

      if (e.key === 'ArrowDown') next = (current + 1) % triggers.length;
      else if (e.key === 'ArrowUp')
        next = (current - 1 + triggers.length) % triggers.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = triggers.length - 1;

      triggers[next]?.focus();
    };

    const renderedIcon =
      icon === null
        ? null
        : (icon ?? (
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={styles.indicator}
            />
          ));

    // headerLevel is a string union of valid HTML heading tag names; cast to
    // ElementType for JSX use.
    const Heading = headerLevel as 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

    return (
      <Heading className={styles.header}>
        {/* Pattern B — {...props} first so component-owned id/aria-expanded/
            aria-controls/disabled/onClick/onKeyDown/className win and the ARIA
            contract can't be overridden by a consumer. */}
        <button
          {...props}
          ref={ref}
          type="button"
          id={triggerId}
          aria-expanded={isOpen}
          aria-controls={contentId}
          disabled={disabled}
          onClick={() => toggle(value)}
          onKeyDown={handleKeyDown}
          className={clsx(styles.trigger, className)}
        >
          <span className={styles.label}>{children}</span>
          {renderedIcon}
        </button>
      </Heading>
    );
  },
);
