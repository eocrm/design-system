import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import { VisuallyHidden } from '../VisuallyHidden';
import { ChatBubbleList } from './ChatBubbleList';
import styles from './ChatBubble.module.scss';

/** Who a bubble is from: `member` (the signed-in user, right-aligned) or `assistant` (left-aligned). */
export type ChatBubbleFrom = 'member' | 'assistant';

export interface ChatBubbleProps extends HTMLAttributes<HTMLDivElement> {
  /** Speaker. `member` = the user (accent tint, end side); `assistant` = the AI (neutral, start side). */
  from: ChatBubbleFrom;
  /** Message content. Ignored while `pending`. */
  children?: ReactNode;
  /** Slot below the coloured body, same side (feedback buttons, sources). */
  footer?: ReactNode;
  /**
   * Show a "typing" indicator instead of `children`; announced once when
   * inserted into a `ChatBubble.List`. Intended for `from="assistant"`.
   * @default false
   */
  pending?: boolean;
}

const BubbleRoot = forwardRef<HTMLDivElement, ChatBubbleProps>(function ChatBubble(
  { from, footer, pending = false, children, className, ...props },
  ref,
) {
  const t = useTranslation();
  return (
    <div ref={ref} className={clsx(styles.bubble, styles[from], className)} {...props}>
      <div className={styles.column}>
        <div className={styles.body}>
          {pending ? (
            <>
              <span className={styles.dots} aria-hidden="true">
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </span>
              <VisuallyHidden>{t('chatBubble.pending')}</VisuallyHidden>
            </>
          ) : (
            <>
              <VisuallyHidden>{t(`chatBubble.${from}`)}: </VisuallyHidden>
              {children}
            </>
          )}
        </div>
        {footer}
      </div>
    </div>
  );
});

/**
 * One chat message bubble, aligned by speaker; `ChatBubble.List` is the live-region container.
 * @see docs/components/ChatBubble.md
 */
export const ChatBubble = Object.assign(BubbleRoot, { List: ChatBubbleList });
