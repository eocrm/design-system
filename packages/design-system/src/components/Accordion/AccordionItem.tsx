import { forwardRef, useId, useMemo, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import {
  AccordionItemContext,
  useAccordionContext,
  type AccordionItemContextValue,
} from './context';
import type { AccordionHeaderLevel } from './Accordion';
import styles from './Accordion.module.scss';

export interface AccordionItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'value'> {
  /** Unique value used to identify the item in the root's `value`/`onValueChange`. */
  value: string;
  /** When true, the trigger is non-interactive and keyboard nav skips this item. */
  disabled?: boolean;
  /**
   * Heading level wrapping the trigger. WAI-ARIA APG requires triggers to live
   * inside a heading element. Defaults to `'h3'`.
   */
  headerLevel?: AccordionHeaderLevel;
  children: ReactNode;
}

/**
 * Item wrapper. Provides `AccordionItemContext` so Trigger and Content can
 * read this item's value, disabled state, open state, and stable ids.
 */
export const AccordionItem = forwardRef<HTMLDivElement, AccordionItemProps>(
  function AccordionItem(
    { value, disabled = false, headerLevel = 'h3', children, className, ...props },
    ref,
  ) {
    const { isOpen } = useAccordionContext('Item');
    const open = isOpen(value);
    const reactId = useId();
    const triggerId = `accordion-trigger-${reactId}`;
    const contentId = `accordion-content-${reactId}`;

    const ctx = useMemo<AccordionItemContextValue & { headerLevel: AccordionHeaderLevel }>(
      () => ({
        value,
        disabled,
        isOpen: open,
        triggerId,
        contentId,
        headerLevel,
      }),
      [value, disabled, open, triggerId, contentId, headerLevel],
    );

    return (
      <AccordionItemContext.Provider value={ctx}>
        <div
          ref={ref}
          {...props}
          data-state={open ? 'open' : 'closed'}
          data-disabled={disabled ? 'true' : undefined}
          className={clsx(styles.item, className)}
        >
          {children}
        </div>
      </AccordionItemContext.Provider>
    );
  },
);
