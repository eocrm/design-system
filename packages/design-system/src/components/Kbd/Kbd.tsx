import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import styles from './Kbd.module.scss';

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
   * screen readers. Defaults to `keys.join(' + ')` (e.g. `'⌘ + K'`).
   * Override when the raw keys are unintuitive — e.g. `keys={['⌘', 'K']}`
   * with `aria-label="Open command palette"`.
   */
  'aria-label'?: string;
}

const sizeClass: Record<KbdSize, string> = {
  sm: styles.kbdSizeSm,
  md: styles.kbdSizeMd,
};

/**
 * Renders a keyboard shortcut as one or more `<kbd>` chips joined with an
 * inline `+` separator. Use for shortcut hints in tooltips, command-palette
 * rows, search inputs, and help/shortcut sheets.
 *
 * @example
 * // Single key
 * <Kbd keys={['Esc']} />
 *
 * @example
 * // Two-key combo
 * <Kbd keys={['⌘', 'K']} />
 *
 * @example
 * // Inside a Tooltip
 * <Tooltip content={<>Save <Kbd keys={['⌘', 'S']} /></>}>
 *   <Button>Save</Button>
 * </Tooltip>
 *
 * @remarks
 * **When NOT to use:**
 * - For inline code, use `<Code>` instead — `<kbd>` is for keyboard input.
 * - For arbitrary text chips, use `<Badge>` — the `<kbd>` element implies
 *   keyboard input semantically.
 * - Don't platform-translate inside the `keys` array. Pass what you want
 *   shown. Apps that want `'⌘'` on macOS and `'Ctrl'` elsewhere should
 *   branch at the application layer.
 * - Don't nest a `<Kbd>` inside a button as its only label. Use the
 *   button's `aria-label` and render the Kbd as a separate visual hint.
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
      aria-label={ariaLabel ?? keys.join(' + ')}
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
