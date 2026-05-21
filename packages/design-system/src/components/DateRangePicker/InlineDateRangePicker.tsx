import { forwardRef, useCallback, useEffect, useRef, useState, type HTMLAttributes } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale } from '../../i18n/useLocale';
import { addMonths } from '../../calendar/dateMath';
import { DatePickerGrid } from '../DatePicker/DatePickerGrid';
import { toIsoDate } from '../DatePicker/utils';
import { autoSwapRange, type DateRange } from './utils';
import styles from './InlineDateRangePicker.module.scss';

export interface InlineDateRangePickerLabels {
  previousMonth?: string;
  nextMonth?: string;
}

export interface InlineDateRangePickerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  /** Selected range. `null` = no range. Pair with `onChange` for controlled use. */
  value?: DateRange | null;
  /** Initial range for uncontrolled use. */
  defaultValue?: DateRange | null;
  /**
   * Fires when a complete range commits (second click, auto-swapped).
   * Currently always fires with a complete `DateRange`; `null` is
   * reserved for a future clear / deselect mechanism.
   */
  onChange?: (range: DateRange | null) => void;

  /** Override locale. */
  locale?: string;
  /** Earliest selectable date (inclusive). */
  min?: Date;
  /** Latest selectable date (inclusive). */
  max?: Date;
  /** Per-date disable predicate. */
  isDateDisabled?: (date: Date) => boolean;

  /** Form name for the START half (hidden `<input>` mirror). */
  nameStart?: string;
  /** Form name for the END half. */
  nameEnd?: string;

  /** Disables interaction. Defaults to `false`. */
  disabled?: boolean;

  /** Localized chevron strings. */
  labels?: InlineDateRangePickerLabels;
}

const DEFAULT_LABELS: Required<InlineDateRangePickerLabels> = {
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
};

/**
 * Inline date-range calendar — same two-month grid as `<DateRangePicker>`
 * but always rendered in flow (no input, no popover). Composes two
 * `<DatePickerGrid>` instances in `selectionMode='range'` with the same
 * click-1 / click-2 / restart selection machine.
 *
 * Cursor anchors to `value?.start ?? new Date()` on mount. It re-anchors
 * once if `value` transitions from `null` to a non-null range (e.g.,
 * loading an async initial value). After that first arrival, subsequent
 * programmatic `value` changes do not move the cursor — the consumer
 * owns navigation into the new month via `ref`.
 *
 * The external prev/next chevrons in the header shift both grids by
 * ±1 month at once. Keyboard cross-grid navigation works in both
 * directions (per-grid `onCursorChange` callbacks; right grid's
 * translates via `addMonths(c, -1)`).
 *
 * @example
 * <InlineDateRangePicker value={range} onChange={setRange} />
 *
 * @example
 * <form action="/api/bookings">
 *   <InlineDateRangePicker
 *     nameStart="bookingStart"
 *     nameEnd="bookingEnd"
 *     min={new Date()}
 *   />
 *   <button type="submit">Save</button>
 * </form>
 *
 * @remarks When NOT to use
 * - Compact form field → use `<DateRangePicker>` (the popover variant).
 * - Single-date selection → use `<InlineDatePicker>`.
 *
 * @remarks Anti-patterns
 * - ❌ Wrapping in a narrow container (< ~32rem). The two grids need
 *   side-by-side room; squashing them clips the right grid.
 * - ❌ Using `value` without `onChange`.
 */
export const InlineDateRangePicker = forwardRef<HTMLDivElement, InlineDateRangePickerProps>(
  function InlineDateRangePicker(
    {
      value: valueProp,
      defaultValue = null,
      onChange,
      locale: localeOverride,
      min,
      max,
      isDateDisabled,
      nameStart,
      nameEnd,
      disabled = false,
      labels,
      className,
      ...rest
    },
    ref,
  ) {
    const contextLocale = useLocale();
    const locale = localeOverride ?? contextLocale;
    const resolvedLabels = { ...DEFAULT_LABELS, ...labels };

    const [uncontrolled, setUncontrolled] = useState<DateRange | null>(defaultValue);
    const value = valueProp !== undefined ? valueProp : uncontrolled;
    const setValue = useCallback(
      (next: DateRange | null) => {
        if (valueProp === undefined) setUncontrolled(next);
        onChange?.(next);
      },
      [valueProp, onChange],
    );

    const [cursor, setCursor] = useState<Date>(value?.start ?? new Date());

    // Re-anchor only on the FIRST controlled `value` set when it was previously null.
    const valueRef = useRef(value);
    useEffect(() => {
      if (valueRef.current == null && value != null) setCursor(value.start);
      valueRef.current = value;
    }, [value]);

    const [selectionStart, setSelectionStart] = useState<Date | null>(null);
    const [hoverDate, setHoverDate] = useState<Date | null>(null);

    const handleGridSelect = useCallback(
      (date: Date) => {
        if (selectionStart == null) {
          setSelectionStart(date);
          setHoverDate(null);
        } else {
          const range = autoSwapRange(selectionStart, date);
          setSelectionStart(null);
          setHoverDate(null);
          setValue(range);
        }
      },
      [selectionStart, setValue],
    );

    // Per-grid cursor-change callbacks — same translation as the popover
    // variant. Right grid's `onCursorChange(M)` means "show month M on the
    // right," which requires DRP cursor = M − 1 (because right always
    // renders cursor + 1).
    const handleLeftGridCursorChange = useCallback((c: Date) => {
      setCursor(c);
    }, []);
    const handleRightGridCursorChange = useCallback((c: Date) => {
      setCursor(addMonths(c, -1));
    }, []);

    const goPrev = useCallback(() => {
      setCursor((c) => addMonths(c, -1));
    }, []);
    const goNext = useCallback(() => {
      setCursor((c) => addMonths(c, 1));
    }, []);

    const gridRangeStart = selectionStart ?? value?.start ?? null;
    const gridRangeEnd = selectionStart != null ? null : (value?.end ?? null);
    const rightCursor = addMonths(cursor, 1);

    return (
      // {...rest} last so consumer overrides win (Pattern A).
      <div
        ref={ref}
        className={clsx(styles.inline, disabled && styles.disabled, className)}
        {...rest}
      >
        <header className={styles.header}>
          <button
            type="button"
            className={styles.navButton}
            aria-label={resolvedLabels.previousMonth}
            onClick={goPrev}
            disabled={disabled}
          >
            <ChevronLeft size={14} />
          </button>
          <div className={styles.headerSpacer} />
          <button
            type="button"
            className={styles.navButton}
            aria-label={resolvedLabels.nextMonth}
            onClick={goNext}
            disabled={disabled}
          >
            <ChevronRight size={14} />
          </button>
        </header>
        <div className={styles.grids}>
          <DatePickerGrid
            cursor={cursor}
            value={null}
            onCursorChange={handleLeftGridCursorChange}
            onSelect={handleGridSelect}
            min={min}
            max={max}
            isDateDisabled={isDateDisabled}
            locale={locale}
            labels={resolvedLabels}
            selectionMode="range"
            rangeStart={gridRangeStart}
            rangeEnd={gridRangeEnd}
            hoverDate={hoverDate}
            onHoverDate={setHoverDate}
            chevrons={false}
            disabled={disabled}
          />
          <DatePickerGrid
            cursor={rightCursor}
            value={null}
            onCursorChange={handleRightGridCursorChange}
            onSelect={handleGridSelect}
            min={min}
            max={max}
            isDateDisabled={isDateDisabled}
            locale={locale}
            labels={resolvedLabels}
            selectionMode="range"
            rangeStart={gridRangeStart}
            rangeEnd={gridRangeEnd}
            hoverDate={hoverDate}
            onHoverDate={setHoverDate}
            chevrons={false}
            disabled={disabled}
          />
        </div>
        {nameStart && (
          <input type="hidden" name={nameStart} value={value ? toIsoDate(value.start) : ''} />
        )}
        {nameEnd && (
          <input type="hidden" name={nameEnd} value={value ? toIsoDate(value.end) : ''} />
        )}
      </div>
    );
  },
);
