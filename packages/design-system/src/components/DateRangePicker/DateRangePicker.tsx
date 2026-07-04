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
import { overlayStack, useFloatingSurface, useInOverlay } from '../_internal/overlay';
import clsx from 'clsx';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { useLocale } from '../../i18n/useLocale';
import { useTranslation } from '../../i18n/useTranslation';
import { mergeRefs } from '../_internal/refs';
import { addMonths } from '../../calendar/dateMath';
import { DatePickerGrid } from '../DatePicker/DatePickerGrid';
import { TimeField } from '../TimeField';
import {
  combineDateAndTime,
  formatDate,
  formatDateTime,
  isDateOutOfRange,
  resolveHourCycle,
  roundTimeToStep,
  toIsoDate,
  toIsoDateTime,
  type DateTimeGranularity,
  type HourCycle,
} from '../DatePicker/utils';
import {
  type DateRange,
  autoSwapRange,
  clampRangeEndAfterStart,
  formatDateRange,
  formatDateTimeRange,
  parseDateRange,
  parseDateTimeRange,
} from './utils';
import styles from './DateRangePicker.module.scss';

/** Field height + type scale. Pairs with `<Input>`, `<Select>`, and `<DatePicker>`. */
export type DateRangePickerSize = 'sm' | 'md' | 'lg';

export interface DateRangePickerProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max' | 'name' | 'size'
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

  /**
   * Field height + type scale. Same scale as `<DatePicker>`. Defaults to `'md'`.
   * Affects only the trigger row; the two-month popover grid is fixed-size.
   *
   * - `'sm'` — 24px tall.
   * - `'md'` — 32px tall (default).
   * - `'lg'` — 40px tall.
   */
  size?: DateRangePickerSize;

  /** Show the ✕ clear button when a range is set. Defaults to `true`. */
  clearable?: boolean;
  /** Toggle red border + focus ring + `aria-invalid="true"`. */
  invalid?: boolean;

  /** Form name for the START half (hidden `<input>`). */
  nameStart?: string;
  /** Form name for the END half. */
  nameEnd?: string;

  /**
   * Picker precision.
   *
   * - `'day'` (default) — date only; behavior unchanged from prior releases.
   * - `'minute'` — adds two manual-entry time inputs (start + end) below
   *   the two-month grid. The trigger text shows `HH:mm` after each date.
   *   Hidden form mirrors (when `nameStart` / `nameEnd` are set) emit ISO
   *   local datetime (`2026-05-28T14:30`).
   *
   * At `'minute'` the start/end time inputs are shown and editable in the
   * popover even before a range is picked (defaulting to `00:00` / `23:59`).
   * Times entered in the empty state are applied when the range is committed
   * (instead of the bare defaults), and existing times are preserved across
   * date re-picks. Same-day ranges with end-time < start-time are silently
   * clamped so end-time ≥ start-time.
   */
  granularity?: DateTimeGranularity;

  /**
   * Minutes step for the start + end `<TimeField>` popovers and for
   * rounding typed time input on commit. Defaults to `15`. Set `1` to
   * disable rounding. Only meaningful when `granularity='minute'`.
   */
  timeStep?: number;

  /**
   * Display cycle for the two embedded `<TimeField>`s + the trigger's
   * time tails.
   *
   * - `'24'` — `"HH:mm"` in trigger + 24h hour lists in popovers.
   * - `'12'` — `"h:mm AM/PM"` in trigger + 12h hour lists + AM/PM column.
   * - `'auto'` (default) — derives from the active locale via Intl. en-US →
   *   `'12'`; ru-RU → `'24'`.
   *
   * Only meaningful when `granularity='minute'`. Typed input is lenient
   * regardless of cycle — both `"14:30"` and `"2:30 PM"` parse on blur.
   */
  hourCycle?: HourCycle;
}

const ICON_SIZE_FOR: Record<DateRangePickerSize, number> = {
  sm: 14,
  md: 14,
  lg: 16,
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
 * - Seconds-precision tracking → only `granularity='minute'` is supported.
 * - Time-only fields (no date) → out of scope.
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
      size = 'md',
      granularity = 'day',
      timeStep = 15,
      hourCycle = 'auto',
      nameStart,
      nameEnd,
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
    const resolvedCycle = resolveHourCycle(hourCycle, locale);
    const t = useTranslation();
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

    const formattedValue = value
      ? granularity === 'minute'
        ? formatDateTimeRange(value, locale, resolvedCycle)
        : formatDateRange(value, locale)
      : '';
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

    // Editable "pending" times shown by the empty-state time inputs (minute
    // granularity, value == null). Lazy initializers seed the defaults
    // rounded to the initial `timeStep` so the displayed empty-state value
    // matches what gets committed on range pick.
    const [pendingStartTime, setPendingStartTime] = useState<{ hours: number; minutes: number }>(
      () => roundTimeToStep(0, 0, timeStep),
    );
    const [pendingEndTime, setPendingEndTime] = useState<{ hours: number; minutes: number }>(() =>
      roundTimeToStep(23, 59, timeStep),
    );

    // Focus-into-grid ticker (same pattern as DatePicker).
    const [focusGridTick, setFocusGridTick] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Mirror `open` into a ref so the deferred blur handler can read its
    // current value (closure would otherwise capture the stale value at
    // the time of blur dispatch). Used to skip the deferred commit if the
    // pointerdown outside-click handler already closed + committed.
    const openRef = useRef(open);
    useEffect(() => {
      openRef.current = open;
    }, [open]);

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

    // #272: same overlay elevation as DatePicker.
    const inOverlay = useInOverlay(wrapperRef, open);
    // #274: hosts yield Escape while we're open.
    useFloatingSurface(open);

    const commit = useCallback(
      (raw: string) => {
        if (raw.trim() === '') {
          setValue(null);
          return;
        }
        const parsed =
          granularity === 'minute' ? parseDateTimeRange(raw, locale) : parseDateRange(raw, locale);
        if (
          parsed != null &&
          !isDateOutOfRange(parsed.start, min, max, isDateDisabled) &&
          !isDateOutOfRange(parsed.end, min, max, isDateDisabled)
        ) {
          setValue(granularity === 'minute' ? clampRangeEndAfterStart(parsed) : parsed);
        } else {
          setDraft(formattedValue);
        }
      },
      [granularity, locale, min, max, isDateDisabled, setValue, formattedValue],
    );

    const handleInputBlur = useCallback(
      (e: FocusEvent<HTMLInputElement>) => {
        // Defer so in-wrapper / in-popover focus moves can complete first.
        window.setTimeout(() => {
          // If the outside-click pointerdown handler already closed us,
          // skip — it already committed the draft in the same user action.
          // Without this guard, onChange double-fires on outside click.
          if (!openRef.current) return;
          const active = document.activeElement;
          const insideWrapper = wrapperRef.current?.contains(active);
          const insideFloating = refs.floating.current?.contains(active);
          // The embedded <TimeField> renders its popover into document.body
          // (sibling portal). When the user clicks the time chevron, focus
          // ends up in a listbox row inside that portal — not a descendant
          // of refs.floating. Without this exemption the deferred blur
          // check sees "outside floating" and closes the calendar
          // mid-interaction. Mirrors the [data-timefield-popover]
          // exemption in the click-outside handler below.
          const insideTimeFieldPopover =
            active instanceof Element && active.closest('[data-timefield-popover="true"]') != null;
          if (!insideWrapper && !insideFloating && !insideTimeFieldPopover) {
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
          // Already handled by the embedded clock on this press (#274).
          if (overlayStack.wasEscapeConsumed(e.nativeEvent)) return;
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
    // #274: Escape from anywhere while open — mirrors DatePicker; see there
    // for the rationale and the embedded-clock deferral.
    useEffect(() => {
      if (!open) return;
      function onKeyDown(e: globalThis.KeyboardEvent) {
        if (e.key !== 'Escape') return;
        if (document.querySelector('[data-timefield-popover="true"]')) return;
        e.preventDefault();
        overlayStack.consumeEscape(e); // hosts yield even if we ran first (#274)
        setOpen(false);
        setSelectionStart(null);
        setHoverDate(null);
        inputRef.current?.focus();
      }
      document.addEventListener('keydown', onKeyDown, true);
      return () => document.removeEventListener('keydown', onKeyDown, true);
    }, [open]);

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
          let withTime: DateRange = range;
          if (granularity === 'minute') {
            // Preserve existing times if value exists; otherwise fall back to
            // the editable PENDING times (defaulting to 00:00 / 23:59) the
            // user may have set in the empty state. Then round to step (no-op
            // for 00:00 / 23:59 with any sensible step, but keeps the
            // invariant explicit). Then clamp same-day end ≥ start.
            const startRounded = roundTimeToStep(
              value?.start?.getHours() ?? pendingStartTime.hours,
              value?.start?.getMinutes() ?? pendingStartTime.minutes,
              timeStep,
            );
            const endRounded = roundTimeToStep(
              value?.end?.getHours() ?? pendingEndTime.hours,
              value?.end?.getMinutes() ?? pendingEndTime.minutes,
              timeStep,
            );
            withTime = {
              start: combineDateAndTime(range.start, startRounded.hours, startRounded.minutes),
              end: combineDateAndTime(range.end, endRounded.hours, endRounded.minutes),
            };
            withTime = clampRangeEndAfterStart(withTime);
          }
          setSelectionStart(null);
          setHoverDate(null);
          setValue(withTime);
          setOpen(false);
          inputRef.current?.focus();
        }
      },
      [granularity, selectionStart, value, setValue, timeStep, pendingStartTime, pendingEndTime],
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

    const handleToggle = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setOpen((v) => !v);
        // pre-toggle: if currently closed, we're opening — focus the input.
        // Reading `open` outside the updater keeps the focus call single-fire
        // even under React StrictMode (updaters can run twice in dev).
        if (!open) inputRef.current?.focus();
      },
      [open],
    );

    const goPrev = useCallback(() => {
      setCursor((c) => addMonths(c, -1));
    }, []);
    const goNext = useCallback(() => {
      setCursor((c) => addMonths(c, 1));
    }, []);

    // Per-grid cursor-change callbacks. The right grid renders DRP cursor
    // + 1 month, so when keyboard nav inside the right grid asks to land
    // focus in month M (via `onCursorChange(firstOfM)`), DRP must set its
    // own cursor to M − 1 so the right grid actually shows M. Without
    // this translation, ArrowLeft from the right grid's first-of-month
    // cell would no-op (DRP cursor unchanged → right grid unchanged →
    // pendingFocusKey never consumed).
    const handleLeftGridCursorChange = useCallback((c: Date) => {
      setCursor(c);
    }, []);
    const handleRightGridCursorChange = useCallback((c: Date) => {
      setCursor(addMonths(c, -1));
    }, []);

    // Click-outside (pointerdown capture, library convention).
    useEffect(() => {
      if (!open) return;
      const handler = (e: PointerEvent) => {
        const target = e.target as Node | null;
        if (!target) return;
        const floating = refs.floating.current;
        if (wrapperRef.current?.contains(target) || floating?.contains(target)) return;
        // The embedded <TimeField>s render their popovers into document.body
        // (sibling portals). Treat any click inside them as "inside" so
        // this popover doesn't auto-close mid-time-pick.
        if (target instanceof Element && target.closest('[data-timefield-popover="true"]')) {
          return;
        }
        commit(draft);
        setOpen(false);
        setSelectionStart(null);
        setHoverDate(null);
      };
      document.addEventListener('pointerdown', handler, true);
      return () => document.removeEventListener('pointerdown', handler, true);
    }, [open, refs.floating, commit, draft]);

    const showClear = clearable && value != null && !disabled;

    // The grids receive the in-flight selection as rangeStart while
    // selectionStart is set; otherwise the committed value drives them.
    const gridRangeStart = selectionStart ?? value?.start ?? null;
    const gridRangeEnd = selectionStart != null ? null : (value?.end ?? null);

    const rightCursor = addMonths(cursor, 1);

    return (
      <div
        ref={setWrapperRef}
        className={clsx(
          styles.wrapper,
          styles[`size-${size}`],
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
            (granularity === 'minute'
              ? `${formatDateTime(new Date(2000, 0, 2, 9, 0), locale, resolvedCycle)} — ${formatDateTime(new Date(2000, 0, 9, 17, 30), locale, resolvedCycle)}`
              : `${formatDate(new Date(2000, 0, 2), locale)} — ${formatDate(new Date(2000, 0, 9), locale)}`)
          }
          autoComplete="off"
        />
        {showClear && (
          <button
            type="button"
            className={styles.clearButton}
            aria-label={t('datePicker.clear')}
            onClick={handleClear}
          >
            <X size={ICON_SIZE_FOR[size]} />
          </button>
        )}
        <button
          type="button"
          className={styles.openButton}
          aria-label={t('datePicker.openCalendar')}
          onClick={handleToggle}
          disabled={disabled}
        >
          <CalendarIcon size={ICON_SIZE_FOR[size]} />
        </button>
        {nameStart && (
          <input
            type="hidden"
            name={nameStart}
            value={
              value
                ? granularity === 'minute'
                  ? toIsoDateTime(value.start)
                  : toIsoDate(value.start)
                : ''
            }
          />
        )}
        {nameEnd && (
          <input
            type="hidden"
            name={nameEnd}
            value={
              value
                ? granularity === 'minute'
                  ? toIsoDateTime(value.end)
                  : toIsoDate(value.end)
                : ''
            }
          />
        )}
        {open &&
          createPortal(
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              className={styles.popover}
              data-in-overlay={inOverlay ? '' : undefined}
              role="dialog"
              aria-modal="false"
              aria-label={t('datePicker.openCalendar')}
              onMouseDown={(e) => e.preventDefault()}
            >
              <header className={styles.popoverHeader}>
                <button
                  type="button"
                  className={styles.popoverNavButton}
                  aria-label={t('datePicker.previousMonth')}
                  onClick={goPrev}
                >
                  <ChevronLeft size={14} />
                </button>
                <div className={styles.popoverHeaderSpacer} />
                <button
                  type="button"
                  className={styles.popoverNavButton}
                  aria-label={t('datePicker.nextMonth')}
                  onClick={goNext}
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
                  onCursorChange={handleRightGridCursorChange}
                  onSelect={handleGridSelect}
                  min={min}
                  max={max}
                  isDateDisabled={isDateDisabled}
                  locale={locale}
                  selectionMode="range"
                  rangeStart={gridRangeStart}
                  rangeEnd={gridRangeEnd}
                  hoverDate={hoverDate}
                  onHoverDate={setHoverDate}
                  chevrons={false}
                />
              </div>
              {granularity === 'minute' && (
                <div className={styles.timeRowsPair}>
                  <div className={styles.timeRow}>
                    <label className={styles.timeLabel} htmlFor={`${inputId}-start-time`}>
                      {t('dateRangePicker.startTimeLabel')}
                    </label>
                    <TimeField
                      id={`${inputId}-start-time`}
                      value={
                        value != null
                          ? { hours: value.start.getHours(), minutes: value.start.getMinutes() }
                          : pendingStartTime
                      }
                      step={timeStep}
                      hourCycle={hourCycle}
                      locale={locale}
                      disabled={disabled}
                      aria-label={t('dateRangePicker.startTimeLabel')}
                      onChange={(time) => {
                        if (value != null) {
                          setValue(
                            clampRangeEndAfterStart({
                              start: combineDateAndTime(value.start, time.hours, time.minutes),
                              end: value.end,
                            }),
                          );
                        } else {
                          setPendingStartTime({ hours: time.hours, minutes: time.minutes });
                        }
                      }}
                    />
                  </div>
                  <div className={styles.timeRow}>
                    <label className={styles.timeLabel} htmlFor={`${inputId}-end-time`}>
                      {t('dateRangePicker.endTimeLabel')}
                    </label>
                    <TimeField
                      id={`${inputId}-end-time`}
                      value={
                        value != null
                          ? { hours: value.end.getHours(), minutes: value.end.getMinutes() }
                          : pendingEndTime
                      }
                      step={timeStep}
                      hourCycle={hourCycle}
                      locale={locale}
                      disabled={disabled}
                      aria-label={t('dateRangePicker.endTimeLabel')}
                      onChange={(time) => {
                        if (value != null) {
                          setValue(
                            clampRangeEndAfterStart({
                              start: value.start,
                              end: combineDateAndTime(value.end, time.hours, time.minutes),
                            }),
                          );
                        } else {
                          setPendingEndTime({ hours: time.hours, minutes: time.minutes });
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>,
            document.body,
          )}
      </div>
    );
  },
);
