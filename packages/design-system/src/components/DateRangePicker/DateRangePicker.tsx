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
import {
  autoUpdate,
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
} from 'lucide-react';
import { useLocale } from '../../i18n/useLocale';
import { mergeRefs } from '../_internal/refs';
import { addMonths } from '../../calendar/dateMath';
import { DatePickerGrid } from '../DatePicker/DatePickerGrid';
import { toIsoDate, isDateOutOfRange } from '../DatePicker/utils';
import {
  type DateRange,
  autoSwapRange,
  formatDateRange,
  parseDateRange,
} from './utils';
import styles from './DateRangePicker.module.scss';

export interface DateRangePickerLabels {
  /** aria-label for the previous-month chevron. */
  previousMonth?: string;
  /** aria-label for the next-month chevron. */
  nextMonth?: string;
  /** aria-label for the calendar-toggle button on the right of the input. */
  openCalendar?: string;
  /** aria-label for the ✕ clear button shown when a range is set. */
  clear?: string;
  /** aria-label applied to the popover wrapper (role="dialog"). */
  dialogLabel?: string;
}

export interface DateRangePickerProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max' | 'name'
  > {
  /** Selected range. `null` = no range. Pair with `onChange` for controlled use. */
  value?: DateRange | null;
  /** Initial range for uncontrolled use. */
  defaultValue?: DateRange | null;
  /** Fires when a complete range commits (after second click in grid, or successful typed parse on blur). */
  onChange?: (range: DateRange | null) => void;

  /** Override locale (otherwise reads `useLocale()`). */
  locale?: string;
  /** Earliest selectable date (inclusive). Both halves and typed input are gated. */
  min?: Date;
  /** Latest selectable date (inclusive). */
  max?: Date;
  /** Per-date disable predicate. */
  isDateDisabled?: (date: Date) => boolean;

  /** Show the ✕ clear button when a range is set. Defaults to `true`. */
  clearable?: boolean;
  /** Toggle red border + focus ring + `aria-invalid="true"`. */
  invalid?: boolean;

  /** Form name for the START half (hidden `<input>`). */
  nameStart?: string;
  /** Form name for the END half. */
  nameEnd?: string;

  /** Localized strings. */
  labels?: DateRangePickerLabels;
}

const DEFAULT_LABELS: Required<DateRangePickerLabels> = {
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  openCalendar: 'Open calendar',
  clear: 'Clear range',
  dialogLabel: 'Choose date range',
};

/**
 * Single-field date-range input with a Floating-UI popover that shows
 * two months side-by-side. Locale-aware typed parsing, min/max +
 * `isDateDisabled`, clearable, hover preview between clicks, auto-swap
 * on out-of-order picks, and separate `nameStart`/`nameEnd` form
 * mirrors. Built on the same `DatePickerGrid` as `<DatePicker>` (with a
 * new `selectionMode='range'`).
 *
 * @example
 * <DateRangePicker defaultValue={{ start: new Date(), end: new Date() }} />
 *
 * @example
 * // Controlled, constrained to a 90-day window:
 * <DateRangePicker
 *   value={range}
 *   onChange={setRange}
 *   min={new Date()}
 *   max={new Date(Date.now() + 90 * 86_400_000)}
 * />
 *
 * @example
 * // Form-mirror, two separate fields:
 * <form action="/api/bookings">
 *   <DateRangePicker nameStart="bookingStart" nameEnd="bookingEnd" />
 * </form>
 *
 * @remarks When NOT to use
 * - Single date → use `<DatePicker>`.
 * - Datetime (date + time) → not supported.
 * - Multi-date selection (3+ non-contiguous dates) → out of scope.
 *
 * @remarks Anti-patterns
 * - ❌ Passing `value` without `onChange` — picker is fully controlled
 *   when `value` is set; user input has no effect.
 * - ❌ Using `defaultValue` AND `value` together — pick one.
 */
export const DateRangePicker = forwardRef<HTMLInputElement, DateRangePickerProps>(
  function DateRangePicker(
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
      nameStart,
      nameEnd,
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

    const [uncontrolled, setUncontrolled] = useState<DateRange | null>(defaultValue);
    const value = valueProp !== undefined ? valueProp : uncontrolled;
    const setValue = useCallback(
      (next: DateRange | null) => {
        if (valueProp === undefined) setUncontrolled(next);
        onChange?.(next);
      },
      [valueProp, onChange],
    );

    const formattedValue = value ? formatDateRange(value, locale) : '';
    const [draft, setDraft] = useState(formattedValue);
    useEffect(() => {
      setDraft(formattedValue);
    }, [formattedValue]);

    const [open, setOpen] = useState(false);
    const [cursor, setCursor] = useState<Date>(value?.start ?? new Date());
    useEffect(() => {
      if (open) setCursor(value?.start ?? new Date());
    }, [open, value]);

    // In-flight selection state during the click-1 → click-2 dance.
    const [selectionStart, setSelectionStart] = useState<Date | null>(null);
    const [hoverDate, setHoverDate] = useState<Date | null>(null);

    // Focus-into-grid ticker (same pattern as DatePicker).
    const [focusGridTick, setFocusGridTick] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const { refs, floatingStyles } = useFloating({
      open,
      placement: 'bottom-start',
      transform: false,
      middleware: [offset(4), flip(), shift({ padding: 8 })],
      whileElementsMounted: autoUpdate,
    });

    const setWrapperRef = useCallback(
      (node: HTMLDivElement | null) => {
        wrapperRef.current = node;
        refs.setReference(node);
      },
      [refs],
    );

    const commit = useCallback(
      (raw: string) => {
        if (raw.trim() === '') {
          setValue(null);
          return;
        }
        const parsed = parseDateRange(raw, locale);
        if (
          parsed != null &&
          !isDateOutOfRange(parsed.start, min, max, isDateDisabled) &&
          !isDateOutOfRange(parsed.end, min, max, isDateDisabled)
        ) {
          setValue(parsed);
        } else {
          setDraft(formattedValue);
        }
      },
      [locale, min, max, isDateDisabled, setValue, formattedValue],
    );

    const handleInputBlur = useCallback(
      (e: FocusEvent<HTMLInputElement>) => {
        // Defer so in-wrapper / in-popover focus moves can complete first.
        window.setTimeout(() => {
          const active = document.activeElement;
          const insideWrapper = wrapperRef.current?.contains(active);
          const insideFloating = refs.floating.current?.contains(active);
          if (!insideWrapper && !insideFloating) {
            commit(draft);
            setOpen(false);
            setSelectionStart(null);
            setHoverDate(null);
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
          setFocusGridTick((t) => t + 1);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          commit(draft);
          setOpen(false);
          setSelectionStart(null);
          setHoverDate(null);
        }
        if (e.key === 'Escape' && open) {
          e.preventDefault();
          setOpen(false);
          setSelectionStart(null);
          setHoverDate(null);
          inputRef.current?.focus();
        }
      },
      [commit, draft, open],
    );

    // After ArrowDown opens the popover, focus the first focusable cell
    // in the LEFT grid (selected start, else today, else first selectable).
    useEffect(() => {
      if (focusGridTick === 0) return;
      const floating = refs.floating.current;
      const focusable = floating?.querySelector<HTMLButtonElement>(
        '[role="gridcell"][tabindex="0"]',
      );
      focusable?.focus();
    }, [focusGridTick, open, refs.floating]);

    // Click-1 → click-2 → commit dance.
    const handleGridSelect = useCallback(
      (date: Date) => {
        if (selectionStart == null) {
          // First click — or restart after a committed range.
          setSelectionStart(date);
          setHoverDate(null);
          // Internal-only "no committed end yet"; don't surface via onChange.
        } else {
          // Second click — commit.
          const range = autoSwapRange(selectionStart, date);
          setSelectionStart(null);
          setHoverDate(null);
          setValue(range);
          setOpen(false);
          inputRef.current?.focus();
        }
      },
      [selectionStart, setValue],
    );

    const handleClear = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setValue(null);
        setSelectionStart(null);
        setHoverDate(null);
        inputRef.current?.focus();
      },
      [setValue],
    );

    const handleToggle = useCallback((e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setOpen((v) => {
        const next = !v;
        if (next) inputRef.current?.focus();
        return next;
      });
    }, []);

    const goPrev = useCallback(() => {
      setCursor((c) => addMonths(c, -1));
    }, []);
    const goNext = useCallback(() => {
      setCursor((c) => addMonths(c, 1));
    }, []);

    // Click-outside (pointerdown capture, library convention).
    useEffect(() => {
      if (!open) return;
      const handler = (e: PointerEvent) => {
        const target = e.target as Node | null;
        const floating = refs.floating.current;
        if (
          target &&
          !wrapperRef.current?.contains(target) &&
          !floating?.contains(target)
        ) {
          commit(draft);
          setOpen(false);
          setSelectionStart(null);
          setHoverDate(null);
        }
      };
      document.addEventListener('pointerdown', handler, true);
      return () => document.removeEventListener('pointerdown', handler, true);
    }, [open, refs.floating, commit, draft]);

    const showClear = clearable && value != null && !disabled;

    // The grids receive the in-flight selection as rangeStart while
    // selectionStart is set; otherwise the committed value drives them.
    const gridRangeStart = selectionStart ?? value?.start ?? null;
    const gridRangeEnd = selectionStart != null ? null : value?.end ?? null;

    const rightCursor = addMonths(cursor, 1);

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
          placeholder={
            placeholder ??
            `${rangeFormatExample(locale)} — ${rangeFormatExample(locale)}`
          }
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
        {nameStart && (
          <input
            type="hidden"
            name={nameStart}
            value={value ? toIsoDate(value.start) : ''}
          />
        )}
        {nameEnd && (
          <input
            type="hidden"
            name={nameEnd}
            value={value ? toIsoDate(value.end) : ''}
          />
        )}
        {open &&
          createPortal(
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className={styles.popover}
              role="dialog"
              aria-modal="false"
              aria-label={resolvedLabels.dialogLabel}
              onMouseDown={(e) => e.preventDefault()}
            >
              <header className={styles.popoverHeader}>
                <button
                  type="button"
                  className={styles.popoverNavButton}
                  aria-label={resolvedLabels.previousMonth}
                  onClick={goPrev}
                >
                  <ChevronLeft size={14} />
                </button>
                <div className={styles.popoverHeaderSpacer} />
                <button
                  type="button"
                  className={styles.popoverNavButton}
                  aria-label={resolvedLabels.nextMonth}
                  onClick={goNext}
                >
                  <ChevronRight size={14} />
                </button>
              </header>
              <div className={styles.grids}>
                <DatePickerGrid
                  cursor={cursor}
                  value={null}
                  onCursorChange={() => {}}
                  onSelect={handleGridSelect}
                  min={min}
                  max={max}
                  isDateDisabled={isDateDisabled}
                  locale={locale}
                  labels={{
                    previousMonth: resolvedLabels.previousMonth,
                    nextMonth: resolvedLabels.nextMonth,
                  }}
                  selectionMode="range"
                  rangeStart={gridRangeStart}
                  rangeEnd={gridRangeEnd}
                  hoverDate={hoverDate}
                  onHoverDate={setHoverDate}
                  chevrons={false}
                />
                <DatePickerGrid
                  cursor={rightCursor}
                  value={null}
                  onCursorChange={() => {}}
                  onSelect={handleGridSelect}
                  min={min}
                  max={max}
                  isDateDisabled={isDateDisabled}
                  locale={locale}
                  labels={{
                    previousMonth: resolvedLabels.previousMonth,
                    nextMonth: resolvedLabels.nextMonth,
                  }}
                  selectionMode="range"
                  rangeStart={gridRangeStart}
                  rangeEnd={gridRangeEnd}
                  hoverDate={hoverDate}
                  onHoverDate={setHoverDate}
                  chevrons={false}
                />
              </div>
            </div>,
            document.body,
          )}
      </div>
    );
  },
);

// Locale-aware placeholder hint — uses the same example date as
// `getLocaleDateOrder` so the placeholder reflects the actual format.
function rangeFormatExample(locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(2000, 0, 2));
}
