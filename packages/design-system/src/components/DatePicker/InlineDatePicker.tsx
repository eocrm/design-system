import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
} from 'react';
import clsx from 'clsx';
import { useLocale } from '../../i18n/useLocale';
import { useTranslation } from '../../i18n/useTranslation';
import { DatePickerGrid } from './DatePickerGrid';
import {
  combineDateAndTime,
  toIsoDate,
  toIsoDateTime,
  toTimeInputValue,
  type DateTimeGranularity,
} from './utils';
import styles from './InlineDatePicker.module.scss';

export interface InlineDatePickerProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  /** Selected date. `null` = no value. Pair with `onChange` for controlled use. */
  value?: Date | null;
  /** Initial selected date for uncontrolled use. */
  defaultValue?: Date | null;
  /**
   * Fires when the user clicks a cell. Currently always fires with a
   * `Date`; `null` is reserved for a future clear / deselect mechanism.
   */
  onChange?: (date: Date | null) => void;

  /** Override locale (otherwise reads `useLocale()`). */
  locale?: string;
  /** Earliest selectable date (inclusive). */
  min?: Date;
  /** Latest selectable date (inclusive). */
  max?: Date;
  /** Per-date disable callback. Disabled cells are non-clickable; arrow-key nav skips them. */
  isDateDisabled?: (date: Date) => boolean;

  /** Form name. When set, renders a hidden `<input type="hidden">` mirror with the ISO date. */
  name?: string;

  /** Disables interaction — cells / chevrons / keyboard nav all blocked. Defaults to `false`. */
  disabled?: boolean;

  /**
   * Picker precision.
   *
   * - `'day'` (default) — date only; behavior unchanged from prior releases.
   * - `'minute'` — adds a manual-entry time input below the calendar grid.
   *   The hidden form mirror (when `name` is set) emits ISO local datetime
   *   (`2026-05-28T14:30`).
   *
   * Time is preserved across date re-picks. Picking from a `null` value
   * defaults the time to `00:00`.
   */
  granularity?: DateTimeGranularity;
}

/**
 * Inline single-date calendar — same month grid as `<DatePicker>` but
 * always rendered in flow (no input, no popover). Composes the shared
 * `<DatePickerGrid>` in single-mode.
 *
 * Cursor anchors to `value ?? new Date()` on mount. It re-anchors each
 * time `value` transitions from `null` to a non-null date (e.g., loading
 * an async initial value, or a consumer clearing and re-setting). After
 * a transition, subsequent non-null `value` changes do not move the
 * cursor — the consumer owns navigation into the new month via `ref`.
 *
 * @example
 * <InlineDatePicker value={date} onChange={setDate} />
 *
 * @example
 * // Constrained + form-mirror:
 * <form action="/api/dates">
 *   <InlineDatePicker name="dob" min={new Date()} />
 *   <button type="submit">Save</button>
 * </form>
 *
 * @example
 * // Disabled (read-only display):
 * <InlineDatePicker disabled defaultValue={new Date()} />
 *
 * @remarks When NOT to use
 * - Compact form field → use `<DatePicker>` (the popover variant).
 * - Choosing a range → use `<InlineDateRangePicker>`.
 * - Seconds-precision tracking → only `granularity='minute'` is supported.
 * - Time-only fields (no date) → out of scope.
 *
 * @remarks Anti-patterns
 * - ❌ Rendering multiple `<InlineDatePicker>`s in the same flex row
 *   without giving them their intrinsic width — the calendar gets
 *   squashed. Wrap in `<Stack>` or give each a column.
 * - ❌ Using `value` without `onChange` — the picker is controlled when
 *   `value` is set; user clicks have no effect.
 */
export const InlineDatePicker = forwardRef<HTMLDivElement, InlineDatePickerProps>(
  function InlineDatePicker(
    {
      value: valueProp,
      defaultValue = null,
      onChange,
      locale: localeOverride,
      min,
      max,
      isDateDisabled,
      name,
      disabled = false,
      granularity = 'day',
      className,
      id: idProp,
      ...rest
    },
    ref,
  ) {
    const contextLocale = useLocale();
    const locale = localeOverride ?? contextLocale;
    const t = useTranslation();
    const generatedId = useId();
    const inlineId = idProp ?? generatedId;

    const [uncontrolled, setUncontrolled] = useState<Date | null>(defaultValue);
    const value = valueProp !== undefined ? valueProp : uncontrolled;
    const setValue = useCallback(
      (next: Date | null) => {
        if (valueProp === undefined) setUncontrolled(next);
        onChange?.(next);
      },
      [valueProp, onChange],
    );

    // Sticky cursor — anchor once on mount, then leave it alone.
    const [cursor, setCursor] = useState<Date>(value ?? new Date());
    // Re-anchor only on the FIRST controlled `value` set when it was previously null.
    // (Avoids surprise scroll when consumer updates state programmatically.)
    const valueRef = useRef(value);
    useEffect(() => {
      if (valueRef.current == null && value != null) setCursor(value);
      valueRef.current = value;
    }, [value]);

    const handleSelect = useCallback(
      (date: Date) => {
        let withTime = date;
        if (granularity === 'minute') {
          if (value != null) {
            withTime = combineDateAndTime(date, value.getHours(), value.getMinutes());
          } else {
            withTime = combineDateAndTime(date, 0, 0);
          }
        }
        setValue(withTime);
      },
      [granularity, value, setValue],
    );

    return (
      // {...rest} last so consumer overrides win (Pattern A).
      <div
        ref={ref}
        id={idProp}
        className={clsx(styles.inline, className)}
        {...rest}
      >
        <DatePickerGrid
          cursor={cursor}
          value={value}
          onSelect={handleSelect}
          onCursorChange={setCursor}
          min={min}
          max={max}
          isDateDisabled={isDateDisabled}
          locale={locale}
          disabled={disabled}
        />
        {granularity === 'minute' && (
          <div className={styles.timeRow}>
            <label className={styles.timeLabel} htmlFor={`${inlineId}-time`}>
              {t('datePicker.timeLabel')}
            </label>
            <input
              id={`${inlineId}-time`}
              type="time"
              step={60}
              className={styles.timeInput}
              value={value ? toTimeInputValue(value) : ''}
              disabled={value == null || disabled}
              aria-label={t('datePicker.timeLabel')}
              onChange={(e) => {
                if (value == null) return;
                const [hh, mm] = e.target.value.split(':').map(Number);
                if (!Number.isFinite(hh) || !Number.isFinite(mm)) return;
                setValue(combineDateAndTime(value, hh, mm));
              }}
            />
          </div>
        )}
        {name && (
          <input
            type="hidden"
            name={name}
            value={
              value
                ? granularity === 'minute'
                  ? toIsoDateTime(value)
                  : toIsoDate(value)
                : ''
            }
          />
        )}
      </div>
    );
  },
);
