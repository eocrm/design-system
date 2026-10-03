import { forwardRef, type InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import { Kbd } from '../Kbd';
import styles from './TopBar.module.scss';

/**
 * Props for `<TopBar.Search>` — a styled `<input type="search">` with a
 * leading magnifying-glass icon and an optional trailing `<Kbd>` hotkey
 * hint.
 *
 * Inherits the standard `<input>` HTML attribute surface (minus `type`,
 * which is fixed to `'search'`). Spread your `value` / `defaultValue` /
 * `onChange` / `name` / `id` props through normally — they reach the
 * underlying input.
 */
export interface TopBarSearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * Optional hotkey hint shown after the input. Rendered internally via
   * `<Kbd size="sm">`. Pass an **array** of key labels for a multi-key
   * combo (`['⌘', 'K']` → two chips joined with `+`) or a single string
   * for a one-chip hint (`'Esc'` → one chip). Note: `'⌘K'` is treated as
   * a single chip — use the array form for multi-key combos.
   *
   * The hint is **visual only**; the library does not bind any keyboard
   * shortcut to it. Omit for no hint.
   */
  hotkey?: string | string[];
  /**
   * `className` for the wrapping `<div>` (the search surface itself).
   * The input's own className lives on the underlying `<input>` via the
   * spread input-props (use the standard `inputClassName` pattern if you
   * need to target the inner element specifically — not exposed in v1).
   */
  className?: string;
}

/**
 * Search input for `<TopBar>`: a pill with a leading icon, a native search input and an optional hotkey hint.
 * @see docs/components/TopBar.md
 */
export const TopBarSearch = forwardRef<HTMLInputElement, TopBarSearchProps>(function TopBarSearch(
  { hotkey, placeholder, className, 'aria-label': ariaLabel, ...inputProps },
  ref,
) {
  const t = useTranslation();
  return (
    <div className={clsx(styles.search, className)}>
      <Search aria-hidden className={styles.searchIcon} />
      <input
        ref={ref}
        type="search"
        placeholder={placeholder}
        // `||` on BOTH links, not `??`: an empty string is never a meaningful
        // explicit name — it contributes nothing and lets the computation fall
        // through — so an empty `aria-label` must reach `placeholder`, and an
        // empty `placeholder` must reach the translation.
        aria-label={ariaLabel || placeholder || t('topBar.search')}
        className={styles.searchInput}
        // Password managers (1Password, Bitwarden) and browser autofill
        // shouldn't try to fill a free-text search box. The data attrs
        // cover 1P and LP; `autoComplete="off"` covers Chrome / Safari.
        autoComplete="off"
        data-1p-ignore
        data-lpignore="true"
        data-form-type="other"
        // {...inputProps} last so consumer overrides win (Pattern A).
        {...inputProps}
      />
      {hotkey != null && <Kbd keys={Array.isArray(hotkey) ? hotkey : [hotkey]} size="sm" />}
    </div>
  );
});
