import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import styles from './ChatBubble.module.scss';

export interface ChatBubbleListProps extends HTMLAttributes<HTMLDivElement> {
  /** The `ChatBubble`s of the conversation, oldest first. Pass an `aria-label` naming the conversation. */
  children: ReactNode;
}

/**
 * Vertical list of ChatBubbles that is also the `role="log"` live region announcing new messages.
 * @see docs/components/ChatBubble.md
 */
export const ChatBubbleList = forwardRef<HTMLDivElement, ChatBubbleListProps>(
  function ChatBubbleList({ className, ...props }, ref) {
    // {...props} first so role/aria-live (the announcement contract) win.
    return (
      <div
        {...props}
        ref={ref}
        role="log"
        aria-live="polite"
        className={clsx(styles.list, className)}
      />
    );
  },
);
