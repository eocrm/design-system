import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Kbd.module.scss';

/**
 * Chip height. See KbdProps#size for when to use each. Intentionally only
 * two sizes — `'sm'` for inline-chrome (matches TopBar.Search's hotkey hint)
 * and `'md'` for standalone shortcut UI (command-palette, shortcut sheets).
 */
export type KbdSize = 'sm' | 'md';

export interface KbdProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'aria-label'> {
  /**
   * Keys to display. Each entry renders one `<kbd>` chip. Multiple entries
   * are joined with an inline `+` separator; a single-entry array renders
   * no separator. Pass the literal label you want shown (`'⌘'`, `'Ctrl'`,
   * `'Shift'`, `'K'`) — the component does NOT platform-translate.
   */
  keys: string[];
  /**
   * Visual size. `'sm'` is the inline-chrome size (18px tall — matches
   * `TopBar.Search`'s hotkey hint). `'md'` is the standalone shortcut size
   * (24px tall — for command-palette / shortcut-sheet UI).
   * @default 'sm'
   */
  size?: KbdSize;
  /**
   * Accessible label for the whole shortcut, read as a single phrase by
   * screen readers. Defaults to `keys.join(' + ')` (e.g. `'⌘ + K'`) when
   * omitted OR empty — an empty string is not an explicit name, so it takes
   * the default too. Override when the raw keys are unintuitive — e.g. `keys={['⌘', 'K']}`
   * with `aria-label="Open command palette"`.
   */
  'aria-label'?: string;
}

const sizeClass: Record<KbdSize, string> = {
  sm: styles.kbdSizeSm,
  md: styles.kbdSizeMd,
};

/**
 * Renders a keyboard shortcut as one or more `<kbd>` chips joined with an inline `+` separator.
 * @see docs/components/Kbd.md
 */
export const Kbd = forwardRef<HTMLSpanElement, KbdProps>(function Kbd(
  { keys, size = 'sm', 'aria-label': ariaLabel, className, ...props },
  ref,
) {
  // Pattern B — {...props} first so component-owned aria-label, aria-hidden
  // composition, and className composition win over a careless spread.
  return (
    <span
      {...props}
      ref={ref}
      aria-label={ariaLabel || keys.join(' + ')}
      className={clsx(styles.kbd, sizeClass[size], className)}
    >
      {keys.map((key, i) => (
        <span key={i} style={{ display: 'contents' }}>
          {i > 0 && (
            <span aria-hidden="true" className={styles.separator}>
              +
            </span>
          )}
          <kbd aria-hidden="true" className={styles.key}>
            {key}
          </kbd>
        </span>
      ))}
    </span>
  );
});
