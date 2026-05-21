import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { useLocale } from '../../i18n/useLocale';
import { mergeRefs } from '../_internal/refs';
import { DatePickerGrid } from './DatePickerGrid';
import { formatDate, parseDate, toIsoDate, isDateOutOfRange } from './utils';
import styles from './DatePicker.module.scss';

export interface DatePickerLabels {
  /** aria-label for the previous-month chevron. */
  previousMonth?: string;
  /** aria-label for the next-month chevron. */
  nextMonth?: string;
  /** aria-label for the calendar-toggle button on the right of the input. */
  openCalendar?: string;
  /** aria-label for the ✕ clear button shown when a value is set. */
  clear?: string;
  /** aria-label applied to the popover wrapper (role="dialog"). */
  dialogLabel?: string;
}

export interface DatePickerProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max'
> {
  /** Selected date. `null` = no value. Pair with `onChange` for controlled use. */
  value?: Date | null;
  /** Initial selected date for uncontrolled use. */
  defaultValue?: Date | null;
  /** Fires when the value changes. */
  onChange?: (date: Date | null) => void;

  /** Override locale (otherwise reads `useLocale()`). */
  locale?: string;
  /** Earliest selectable date (inclusive). */
  min?: Date;
  /** Latest selectable date (inclusive). */
  max?: Date;
  /** Per-date disable callback. */
  isDateDisabled?: (date: Date) => boolean;

  /** Show the ✕ clear button when a value is set. Defaults to `true`. */
  clearable?: boolean;
  /** Toggle red border + focus ring + `aria-invalid="true"`. */
  invalid?: boolean;

  /** Form name. When set, renders a hidden mirror `<input>` with the ISO date. */
  name?: string;

  /** Localized strings. */
  labels?: DatePickerLabels;
}

const DEFAULT_LABELS: Required<DatePickerLabels> = {
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  openCalendar: 'Open calendar',
  clear: 'Clear date',
  dialogLabel: 'Choose date',
};

/**
 * Single-date input with a Floating-UI popover that contains a month grid.
 * Locale-aware typed parsing (en-US, ru-RU, ja-JP, etc.), min/max +
 * `isDateDisabled` constraints, clearable, and a hidden mirror `<input>`
 * for native form posts.
 *
 * Built on the Calendar primitives (`useMonth`, formatters); the popover
 * is positioned via `@floating-ui/react-dom` and portaled into
 * `document.body` so it escapes overflow-hidden ancestors.
 *
 * @example
 * // Uncontrolled, today as the default:
 * <DatePicker defaultValue={new Date()} onChange={(d) => console.log(d)} />
 *
 * @example
 * // Constrained + cleared:
 * <DatePicker
 *   value={value}
 *   onChange={setValue}
 *   min={new Date()}
 *   isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
 * />
 *
 * @example
 * // Form integration via the hidden mirror:
 * <form action="/dates"><DatePicker name="dob" /></form>
 *
 * @remarks When NOT to use
 * - Range selection → not supported in v1; ships in a follow-up PR.
 * - Datetime (date + time) → not supported in v1.
 * - Free-form date strings without a clear locale → use a plain `<Input>`.
 *
 * @remarks Anti-patterns
 * - ❌ Wrapping the picker in `<label htmlFor={id}>` while also passing
 *   `aria-label` — pick one. The wrapper label is preferred.
 * - ❌ Using `value` without `onChange` and expecting state to update on
 *   user input — the picker is fully controlled when `value` is passed.
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(function DatePicker(
  {
    value: valueProp,
    defaultValue = null,
    onChange,
    locale: localeOverride,
    min,
    max,
    isDateDisabled,
    clearable = true,
    invalid = false,
    disabled = false,
    name,
    labels,
    placeholder,
    className,
    id: idProp,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const contextLocale = useLocale();
  const locale = localeOverride ?? contextLocale;
  const resolvedLabels = { ...DEFAULT_LABELS, ...labels };
  const generatedId = useId();
  const inputId = idProp ?? generatedId;

  const [uncontrolled, setUncontrolled] = useState<Date | null>(defaultValue);
  const value = valueProp !== undefined ? valueProp : uncontrolled;
  const setValue = useCallback(
    (next: Date | null) => {
      if (valueProp === undefined) setUncontrolled(next);
      onChange?.(next);
    },
    [valueProp, onChange],
  );

  const formattedValue = value ? formatDate(value, locale) : '';
  const [draft, setDraft] = useState(formattedValue);
  useEffect(() => {
    setDraft(formattedValue);
  }, [formattedValue]);

  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState<Date>(value ?? new Date());
  useEffect(() => {
    if (open) setCursor(value ?? new Date());
  }, [open, value]);

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { refs, floatingStyles } = useFloating({
    open,
    placement: 'bottom-start',
    transform: false,
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  // ArrowDown bumps `focusGridTick` to request a focus-into-grid after the
  // popover renders. Using a counter (rather than a ref-flag) guarantees a
  // re-render and a fresh effect run even when `open` was already true.
  const [focusGridTick, setFocusGridTick] = useState(0);
  useEffect(() => {
    if (focusGridTick === 0) return;
    const dialog = refs.floating.current;
    const focusable = dialog?.querySelector<HTMLButtonElement>('[role="gridcell"][tabindex="0"]');
    focusable?.focus();
  }, [focusGridTick, refs.floating]);

  const commit = useCallback(
    (raw: string) => {
      if (raw.trim() === '') {
        setValue(null);
        return;
      }
      const parsed = parseDate(raw, locale);
      if (parsed != null && !isDateOutOfRange(parsed, min, max, isDateDisabled)) {
        setValue(parsed);
      } else {
        setDraft(formattedValue); // revert
      }
    },
    [locale, min, max, isDateDisabled, setValue, formattedValue],
  );

  const handleInputBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      // Defer so focus transitions to a sibling inside the wrapper (clear
      // button, open-calendar button) — or programmatic focus into the
      // portaled popover (ArrowDown into the grid) — can complete before
      // we check `document.activeElement`. The popover uses
      // `onMouseDown={preventDefault}` to keep input focus on grid clicks;
      // this defer handles keyboard-driven focus moves.
      window.setTimeout(() => {
        const active = document.activeElement;
        const insideWrapper = wrapperRef.current?.contains(active);
        const insideFloating = refs.floating.current?.contains(active);
        if (!insideWrapper && !insideFloating) {
          commit(draft);
          setOpen(false);
        }
      }, 0);
      onBlur?.(e);
    },
    [commit, draft, onBlur, refs.floating],
  );

  const handleInputFocus = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      onFocus?.(e);
    },
    [onFocus],
  );

  const handleInputClick = useCallback(() => {
    if (!disabled) setOpen(true);
  }, [disabled]);

  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
        // Bump the tick to schedule a focus-into-grid on the next commit.
        // Going through a state-driven effect (rather than `setTimeout(0)`)
        // is deterministic for jsdom, which otherwise races `waitFor`
        // against the macrotask queue and yields intermittent failures.
        setFocusGridTick((t) => t + 1);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        commit(draft);
        setOpen(false);
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
        inputRef.current?.focus();
      }
    },
    [commit, draft, open],
  );

  const handleSelect = useCallback(
    (next: Date) => {
      setValue(next);
      setOpen(false);
      inputRef.current?.focus();
    },
    [setValue],
  );

  const handleClear = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setValue(null);
      inputRef.current?.focus();
    },
    [setValue],
  );

  const handleToggle = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setOpen((v) => {
      const next = !v;
      // On open, transfer focus to the input so the popover's
      // ArrowDown contract works and the input is ready for typing.
      if (next) inputRef.current?.focus();
      return next;
    });
  }, []);

  // Click outside closes (separate from blur to handle the case where
  // focus moved into the grid via mouse, then user clicks somewhere else).
  // Uses `pointerdown` + capture phase to match Popover/DropdownMenu/Tooltip.
  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node | null;
      const floating = refs.floating.current;
      if (target && !wrapperRef.current?.contains(target) && !floating?.contains(target)) {
        commit(draft);
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [open, refs.floating, commit, draft]);

  const showClear = clearable && value != null && !disabled;

  const setWrapperRef = useCallback(
    (node: HTMLDivElement | null) => {
      wrapperRef.current = node;
      refs.setReference(node);
    },
    [refs],
  );

  return (
    <div
      ref={setWrapperRef}
      className={clsx(
        styles.wrapper,
        invalid && styles.invalid,
        disabled && styles.disabled,
        className,
      )}
    >
      <input
        {...rest}
        ref={mergeRefs(inputRef, ref)}
        id={inputId}
        type="text"
        className={styles.input}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onClick={handleInputClick}
        onKeyDown={handleInputKeyDown}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-haspopup="dialog"
        aria-expanded={open}
        placeholder={placeholder ?? formatDate(new Date(2000, 0, 2), locale)}
        autoComplete="off"
      />
      {showClear && (
        <button
          type="button"
          className={styles.clearButton}
          aria-label={resolvedLabels.clear}
          onClick={handleClear}
        >
          <X size={14} />
        </button>
      )}
      <button
        type="button"
        className={styles.openButton}
        aria-label={resolvedLabels.openCalendar}
        onClick={handleToggle}
        disabled={disabled}
      >
        <CalendarIcon size={14} />
      </button>
      {name && <input type="hidden" name={name} value={value ? toIsoDate(value) : ''} />}
      {open &&
        createPortal(
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className={styles.popover}
            role="dialog"
            aria-modal="false"
            aria-label={resolvedLabels.dialogLabel}
            onMouseDown={(e) => e.preventDefault()} // keep input focus on grid click
          >
            <DatePickerGrid
              cursor={cursor}
              value={value}
              onCursorChange={setCursor}
              onSelect={handleSelect}
              min={min}
              max={max}
              isDateDisabled={isDateDisabled}
              locale={locale}
              labels={{
                previousMonth: resolvedLabels.previousMonth,
                nextMonth: resolvedLabels.nextMonth,
              }}
            />
          </div>,
          document.body,
        )}
    </div>
  );
});
