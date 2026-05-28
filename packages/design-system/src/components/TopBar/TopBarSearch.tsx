import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n';
import styles from './TopBar.module.scss';

/**
 * Props for `<TopBar.Search>` — a styled `<input type="search">` with a
 * leading magnifying-glass icon and an optional trailing `<kbd>` hint.
 *
 * Inherits the standard `<input>` HTML attribute surface (minus `type`,
 * which is fixed to `'search'`). Spread your `value` / `defaultValue` /
 * `onChange` / `name` / `id` props through normally — they reach the
 * underlying input.
 */
export interface TopBarSearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /**
   * Optional `<kbd>` hint shown after the input — typically a hotkey copy
   * (e.g. `'⌘K'`, `'Ctrl+K'`). The hint is **visual only**; the library
   * does not bind any keyboard shortcut to it. Omit for no hint.
   */
  hotkey?: ReactNode;
  /**
   * `className` for the wrapping `<div>` (the search surface itself).
   * The input's own className lives on the underlying `<input>` via the
   * spread input-props (use the standard `inputClassName` pattern if you
   * need to target the inner element specifically — not exposed in v1).
   */
  className?: string;
}

/**
 * Search input subcomponent for `<TopBar>`. Renders a 32px-tall pill with
 * a leading lucide `Search` icon, a real `<input type="search">`, and an
 * optional trailing `<kbd>` hotkey hint.
 *
 * The native `type="search"` lets the browser expose `role="searchbox"`
 * automatically and gives users the standard clear-button affordance. The
 * input is wired with `autoComplete="off"` plus the password-manager
 * ignore data attributes (`data-1p-ignore`, `data-lpignore`, `data-form-
 * type="other"`) so 1Password / Bitwarden / Chrome autofill don't try to
 * fill it as a username field — a free-text search box has no business
 * receiving credentials.
 *
 * The `hotkey` prop is a **visual hint only** — the component does not
 * implement keyboard-shortcut focus behavior. Binding ⌘K (or anything
 * else) to focus the input is the consumer's responsibility; the library
 * doesn't dictate which shortcuts a host app uses.
 *
 * @example
 * <TopBar.Search placeholder="Search contacts, deals…" hotkey="⌘K" />
 *
 * @example
 * // Controlled — round-trip value through state.
 * const [q, setQ] = useState('');
 * <TopBar.Search
 *   placeholder="Search…"
 *   value={q}
 *   onChange={(e) => setQ(e.target.value)}
 * />
 *
 * @example
 * // No hotkey hint — omit the prop entirely.
 * <TopBar.Search placeholder="Filter…" />
 *
 * @remarks When NOT to use
 * - For a command-palette experience (typing → result list → keyboard
 *   nav) → use a `<Popover>` + `<OptionsPicker>` combination; the topbar
 *   search is a plain text input.
 * - For a form's search field → use `<Input>` directly. The topbar search
 *   styling (pill + leading icon) is specific to the bar.
 *
 * @remarks Anti-patterns
 * - ❌ Putting a submit button inside the search wrapper. The input is
 *   `type="search"` — on Enter, the consumer reads the value from the
 *   input's `onKeyDown` / `onChange`. Adding a button changes the shape.
 * - ❌ Setting `placeholder` and `aria-label` to different strings. The
 *   default aria-label IS the placeholder; only override when the visible
 *   placeholder is too terse to stand on its own.
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
        aria-label={ariaLabel ?? placeholder ?? t('topBar.search')}
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
      {hotkey != null && (
        <kbd aria-hidden className={styles.searchKbd}>
          {hotkey}
        </kbd>
      )}
    </div>
  );
});
