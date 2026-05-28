import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { useAccordionItemContext } from './context';
import styles from './Accordion.module.scss';

export interface AccordionContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * Collapsible region announced via `role="region"` + `aria-labelledby` pointing
 * at the trigger. Animated via CSS `grid-template-rows: 0fr → 1fr`.
 */
export const AccordionContent = forwardRef<HTMLDivElement, AccordionContentProps>(
  function AccordionContent({ children, className, ...props }, ref) {
    const { isOpen, triggerId, contentId } = useAccordionItemContext('Content');

    return (
      // Pattern B — {...props} first so component-owned id/role/
      // aria-labelledby/data-state/className win.
      <div
        {...props}
        ref={ref}
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        data-state={isOpen ? 'open' : 'closed'}
        className={clsx(styles.content, className)}
      >
        <div className={styles.inner}>
          <div className={styles.body}>{children}</div>
        </div>
      </div>
    );
  },
);
