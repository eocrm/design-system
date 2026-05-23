import {
  forwardRef,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type TextareaHTMLAttributes,
} from 'react';
import clsx from 'clsx';
import styles from './Textarea.module.scss';

/**
 * Field typography + padding scale. Pairs with Input's `size`.
 *
 * Unlike Input, size does NOT affect the textarea's height — height is
 * driven by `minRows` (and capped by `maxRows` if auto-grow is on).
 */
export type TextareaSize = 'sm' | 'md' | 'lg';

/** User-drag resize handle direction. Maps to CSS `resize`. */
export type TextareaResize = 'none' | 'vertical' | 'both';

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size' | 'rows'> {
  /**
   * Toggles the error visual (red border + danger focus ring) and sets
   * `aria-invalid="true"`. Pair with a visible error message and an
   * `aria-describedby` pointer at the message id.
   */
  invalid?: boolean;

  /**
   * Visual size. Defaults to `'md'`.
   * - `'sm'` — tighter padding + `--font-size-sm`. Used in dense forms.
   * - `'md'` — default padding + `--font-size-md`. Most form contexts.
   * - `'lg'` — same padding as md but `--font-size-lg`. Hero / focus textareas.
   *
   * Note: this collapses the native HTML `<textarea size>` attribute. Use
   * `style={{ width }}` or a parent container for explicit width.
   */
  size?: TextareaSize;

  /**
   * Block browser autofill AND password managers from offering to fill
   * this textarea. Same heuristic as Input — see Input's JSDoc for the
   * full set of opt-out attributes applied.
   *
   * Smart default: when omitted, block iff `autoComplete` is also omitted
   * (or `'off'`). Explicit autocomplete hints opt back IN to autofill.
   * Pass `true` to force-block, `false` to force-allow.
   */
  disableAutofill?: boolean;

  /**
   * Minimum visible rows. The textarea never renders shorter than this,
   * regardless of content. Default: `3`. Also seeds the native `rows`
   * attribute for SSR / no-JS rendering.
   */
  minRows?: number;

  /**
   * Maximum visible rows. Beyond this, content scrolls inside the field
   * instead of expanding further. Only meaningful when `autoGrow` is true.
   * Default: `undefined` (unbounded growth).
   */
  maxRows?: number;

  /**
   * When true, height adapts to content between `minRows` and `maxRows`.
   * Default: `true`. When false, height locks at `minRows` and a scrollbar
   * appears past it.
   */
  autoGrow?: boolean;

  /**
   * User-drag resize handle direction. Default: `'vertical'`.
   *
   * **Forced to `'none'`** when `autoGrow` is `true` — user-drag fights
   * the auto-grow measurement and produces erratic behavior. To enable
   * a resize handle, opt out of auto-grow with `autoGrow={false}`.
   */
  resize?: TextareaResize;

  /**
   * Show the character counter (`${value.length}` or
   * `${value.length} / ${maxLength}` when both are set).
   *
   * Default: `true` when `maxLength` is set, `false` otherwise.
   *
   * The counter renders as a `<span aria-live="polite" aria-atomic="true">`
   * inside the wrapper, below the textarea. It updates on every input —
   * works for both controlled and uncontrolled textareas.
   */
  showCount?: boolean;
}

const AUTOFILL_DISABLED_PROPS = {
  autoComplete: 'off' as const,
  'data-1p-ignore': '' as const,
  'data-lpignore': 'true' as const,
  'data-form-type': 'other' as const,
};

const SIZE_CLASS: Record<TextareaSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

const RESIZE_CLASS: Record<TextareaResize, string> = {
  none: styles.resizeNone,
  vertical: styles.resizeVertical,
  both: styles.resizeBoth,
};

/**
 * Multi-line text input. The dumb companion to `<Input>` — same `invalid` +
 * `disableAutofill` smart-default behavior, plus auto-grow, resize-handle
 * direction, and an optional character counter.
 *
 * Forwards the `<textarea>` element via ref (not the wrapper div). All
 * native textarea attributes pass through except `size` (shadowed by the
 * component-level size prop) and `rows` (computed from `minRows`).
 *
 * Always renders a `<div>` wrapper so the optional counter has a place
 * to live — unlike Input, which is a single `<input>`.
 *
 * @example
 * // Default — auto-grows, 3 min rows.
 * <Textarea placeholder="Write something…" />
 *
 * @example
 * // Twitter-style counter, controlled.
 * <Textarea
 *   maxLength={140}
 *   value={value}
 *   onChange={(e) => setValue(e.target.value)}
 * />
 *
 * @example
 * // Fixed rows + drag-to-resize.
 * <Textarea autoGrow={false} minRows={4} resize="vertical" />
 *
 * @example
 * // Error state.
 * <Textarea invalid aria-describedby="bio-error" />
 * <p id="bio-error">Bio is required.</p>
 *
 * @remarks When NOT to use
 * - Single-line text → use `<Input>`.
 * - Choosing from a fixed list → use `<Select>`.
 * - Rich text editing / mentions / markdown → no shipped primitive yet.
 * - Password fields → use `<PasswordInput>`.
 *
 * @remarks Anti-patterns
 * - ❌ Using `placeholder` as a label. Placeholders disappear on focus.
 * - ❌ Setting both `autoGrow={true}` AND expecting `resize="vertical"`
 *   to render a drag handle. Auto-grow wins; the handle is hidden.
 * - ❌ Building a separate character counter outside the component when
 *   `maxLength` / `showCount` would do it.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      invalid,
      size = 'md',
      disableAutofill,
      minRows = 3,
      maxRows,
      autoGrow = true,
      resize = 'vertical',
      showCount,
      className,
      value,
      defaultValue,
      onChange,
      maxLength,
      ...props
    },
    ref,
  ) {
    // Merge external ref with internal ref so we don't lose either.
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        textareaRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    // Internal value mirror — keeps the counter in sync for uncontrolled
    // inputs. For controlled inputs, currentValue tracks `value` directly.
    const [internalValue, setInternalValue] = useState<string>(() =>
      typeof defaultValue === 'string' ? defaultValue : '',
    );
    const isControlled = value !== undefined;
    const currentValue = isControlled ? String(value) : internalValue;

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
      if (!isControlled) setInternalValue(e.target.value);
      onChange?.(e);
    };

    // Auto-grow: synchronously after render, reset height to auto, then
    // set to scrollHeight clamped between minRows and maxRows.
    useLayoutEffect(() => {
      if (!autoGrow) return;
      const el = textareaRef.current;
      if (!el) return;

      el.style.height = 'auto';

      const computed = window.getComputedStyle(el);
      // jsdom may return 'normal' for lineHeight — fall back to 0 so the
      // math degrades gracefully (minHeight becomes 0, target = scrollHeight).
      const lineHeight = parseFloat(computed.lineHeight) || 0;
      const paddingY =
        (parseFloat(computed.paddingTop) || 0) +
        (parseFloat(computed.paddingBottom) || 0);
      const borderY =
        (parseFloat(computed.borderTopWidth) || 0) +
        (parseFloat(computed.borderBottomWidth) || 0);

      const minHeight = lineHeight * minRows + paddingY + borderY;
      const maxHeight =
        maxRows !== undefined
          ? lineHeight * maxRows + paddingY + borderY
          : Infinity;

      const desired = el.scrollHeight + borderY;
      const target = Math.min(Math.max(desired, minHeight), maxHeight);
      el.style.height = `${target}px`;
      el.style.overflowY = desired > maxHeight ? 'auto' : 'hidden';
    }, [currentValue, autoGrow, minRows, maxRows, size]);

    // Smart autofill default — same heuristic as Input.
    const hasAutocompleteHint =
      typeof props.autoComplete === 'string' && props.autoComplete !== 'off';
    const blockAutofill = disableAutofill ?? !hasAutocompleteHint;

    // Effective resize: auto-grow forces 'none' because user-drag and
    // measured-height fight each other.
    const effectiveResize: TextareaResize = autoGrow ? 'none' : resize;

    const shouldShowCount = showCount ?? maxLength !== undefined;

    return (
      <div className={styles.wrapper}>
        <textarea
          ref={setRefs}
          rows={minRows}
          aria-invalid={invalid || undefined}
          // Autofill blocking goes before {...props} — matches Input's spread
          // order. Consumer's autoComplete wins; data-* opt-outs still apply.
          {...(blockAutofill ? AUTOFILL_DISABLED_PROPS : {})}
          value={value}
          defaultValue={defaultValue}
          maxLength={maxLength}
          {...props}
          onChange={handleChange}
          className={clsx(
            styles.textarea,
            SIZE_CLASS[size],
            RESIZE_CLASS[effectiveResize],
            invalid && styles.invalid,
            className,
          )}
        />
        {shouldShowCount && (
          <span
            className={styles.counter}
            aria-live="polite"
            aria-atomic="true"
          >
            {currentValue.length}
            {maxLength !== undefined && ` / ${maxLength}`}
          </span>
        )}
      </div>
    );
  },
);
