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
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { useLocale } from '../../i18n/useLocale';
import { useTranslation } from '../../i18n/useTranslation';
import { mergeRefs } from '../_internal/refs';
import { DatePickerGrid } from './DatePickerGrid';
import { TimeField } from '../TimeField';
import {
  combineDateAndTime,
  formatDate,
  formatDateTime,
  isDateOutOfRange,
  parseDate,
  parseDateTime,
  resolveHourCycle,
  roundTimeToStep,
  toIsoDate,
  toIsoDateTime,
  type DateTimeGranularity,
  type HourCycle,
} from './utils';
import styles from './DatePicker.module.scss';

/** Field height + type scale. Pairs with `<Input>` and `<Select>`. */
export type DatePickerSize = 'sm' | 'md' | 'lg';

export interface DatePickerProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max' | 'size'
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

  /**
   * Field height + type scale. Same scale as `<Input>`. Defaults to `'md'`.
   * Affects only the trigger row; the popover month grid is fixed-size.
   *
   * - `'sm'` — 24px tall.
   * - `'md'` — 32px tall (default).
   * - `'lg'` — 40px tall.
   */
  size?: DatePickerSize;

  /**
   * Picker precision.
   *
   * - `'day'` (default) — date only; behavior unchanged from prior releases.
   * - `'minute'` — adds a manual-entry time input below the calendar grid.
   *   The trigger text shows `HH:mm` after the date. The hidden form mirror
   *   (when `name` is set) emits ISO local datetime (`2026-05-28T14:30`).
   *
   * Time is preserved across date re-picks. Picking from a `null` value
   * defaults the time to `00:00`.
   */
  granularity?: DateTimeGranularity;

  /**
   * Minutes step for the `<TimeField>` popover and for rounding typed
   * time input on commit. Defaults to `15`. Set `1` to disable rounding.
   * Only meaningful when `granularity='minute'`.
   */
  timeStep?: number;

  /**
   * Display cycle for the embedded `<TimeField>` + the trigger's time tail.
   *
   * - `'24'` — `"HH:mm"` in the trigger; 24h hour list in the time popover.
   * - `'12'` — `"h:mm AM/PM"` in the trigger; 12h hour list + AM/PM column.
   * - `'auto'` (default) — derives from the active locale via Intl. en-US →
   *   `'12'`; ru-RU / de-DE / fr-FR → `'24'`.
   *
   * Only meaningful when `granularity='minute'`. Typed input is lenient
   * regardless of cycle — both `"14:30"` and `"2:30 PM"` parse on blur.
   */
  hourCycle?: HourCycle;
}

const ICON_SIZE_FOR: Record<DatePickerSize, number> = {
  sm: 14,
  md: 14,
  lg: 16,
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
 * - Datetime with seconds precision → only `granularity='minute'` is
 *   supported. For finer precision, compose with a separate input.
 * - Time-only fields (no date) → out of scope.
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
    size = 'md',
    granularity = 'day',
    timeStep = 15,
    hourCycle = 'auto',
    name,
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

  const [uncontrolled, setUncontrolled] = useState<Date | null>(defaultValue);
  const value = valueProp !== undefined ? valueProp : uncontrolled;
  const setValue = useCallback(
    (next: Date | null) => {
      if (valueProp === undefined) setUncontrolled(next);
      onChange?.(next);
    },
    [valueProp, onChange],
  );

  const formattedValue = value
    ? granularity === 'minute'
      ? formatDateTime(value, locale, resolvedCycle)
      : formatDate(value, locale)
    : '';
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
      const parsed = granularity === 'minute' ? parseDateTime(raw, locale) : parseDate(raw, locale);
      if (parsed != null && !isDateOutOfRange(parsed, min, max, isDateDisabled)) {
        setValue(parsed);
      } else {
        setDraft(formattedValue); // revert
      }
    },
    [granularity, locale, min, max, isDateDisabled, setValue, formattedValue],
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
        // The embedded <TimeField> renders its popover into document.body
        // (a SIBLING portal — not a descendant of refs.floating). When the
        // user clicks the time chevron, focus moves through the TimeField
        // input and on into one of the listbox rows via the auto-focus rAF
        // effect; that row lives inside the sibling portal. Without this
        // exemption the deferred blur check would see "outside floating"
        // and close the calendar mid-interaction. Mirrors the same
        // [data-timefield-popover] exemption used by the click-outside
        // handler below.
        const insideTimeFieldPopover =
          active instanceof Element && active.closest('[data-timefield-popover="true"]') != null;
        if (!insideWrapper && !insideFloating && !insideTimeFieldPopover) {
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
        // Already handled by an inner surface's capture listener on this
        // same press (the embedded clock) — one layer per press (#274).
        if (overlayStack.wasEscapeConsumed(e.nativeEvent)) return;
        e.preventDefault();
        setOpen(false);
        inputRef.current?.focus();
      }
    },
    [commit, draft, open],
  );

  // #274: Escape must close the calendar from ANYWHERE while open — the
  // input-scoped handler above is dead once focus moves into the grid via
  // ArrowDown (a pre-existing gap), and hosts now yield Escape to open
  // floating surfaces, which would otherwise leave the press doing nothing.
  // Capture phase to beat focused widgets (matches TimeField). Defers to an
  // open embedded TimeField clock: the clock's own (later-registered)
  // listener must close it first — closing the calendar would unmount the
  // clock mid-press.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (document.querySelector('[data-timefield-popover="true"]')) return;
      e.preventDefault();
      overlayStack.consumeEscape(e); // hosts yield even if we ran first (#274)
      setOpen(false);
      inputRef.current?.focus();
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open]);

  const handleSelect = useCallback(
    (next: Date) => {
      let withTime = next;
      if (granularity === 'minute') {
        if (value != null) {
          withTime = combineDateAndTime(next, value.getHours(), value.getMinutes());
        } else {
          // Default time = 00:00, rounded to keep step-aligned invariant
          // (no-op for any sensible step; explicit for clarity).
          const rounded = roundTimeToStep(0, 0, timeStep);
          withTime = combineDateAndTime(next, rounded.hours, rounded.minutes);
        }
      }
      setValue(withTime);
      setOpen(false);
      inputRef.current?.focus();
    },
    [granularity, value, setValue, timeStep],
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
      if (!target) return;
      const floating = refs.floating.current;
      if (wrapperRef.current?.contains(target) || floating?.contains(target)) return;
      // The embedded <TimeField> renders its popover into document.body
      // (sibling portal). Treat any click inside it as "inside" so this
      // popover doesn't auto-close mid-time-pick.
      if (target instanceof Element && target.closest('[data-timefield-popover="true"]')) {
        return;
      }
      commit(draft);
      setOpen(false);
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [open, refs.floating, commit, draft]);

  // #272: inside a Modal/Drawer the popover's base z (--z-popover, below
  // --z-modal) paints it behind the host — elevate when the trigger sits in
  // an overlay, exactly like Select/Popover/DropdownMenu.
  const inOverlay = useInOverlay(wrapperRef, open);
  // #274: hosts yield Escape while we're open — our own capture/element
  // handler closes us on the same press instead of the Modal/Drawer.
  useFloatingSurface(open);

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
            ? formatDateTime(new Date(2000, 0, 2, 14, 30), locale, resolvedCycle)
            : formatDate(new Date(2000, 0, 2), locale))
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
      {name && (
        <input
          type="hidden"
          name={name}
          value={value ? (granularity === 'minute' ? toIsoDateTime(value) : toIsoDate(value)) : ''}
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
            />
            {granularity === 'minute' && (
              <div className={styles.timeRow}>
                <label className={styles.timeLabel} htmlFor={`${inputId}-time`}>
                  {t('datePicker.timeLabel')}
                </label>
                <TimeField
                  id={`${inputId}-time`}
                  value={value ? { hours: value.getHours(), minutes: value.getMinutes() } : null}
                  step={timeStep}
                  hourCycle={hourCycle}
                  locale={locale}
                  disabled={value == null || disabled}
                  aria-label={t('datePicker.timeLabel')}
                  onChange={(time) => {
                    if (value == null) return;
                    setValue(combineDateAndTime(value, time.hours, time.minutes));
                  }}
                />
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
});
