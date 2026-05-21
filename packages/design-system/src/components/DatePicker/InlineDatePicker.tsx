import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
} from 'react';
import clsx from 'clsx';
import { useLocale } from '../../i18n/useLocale';
import { DatePickerGrid } from './DatePickerGrid';
import { toIsoDate } from './utils';
import styles from './InlineDatePicker.module.scss';

export interface InlineDatePickerLabels {
  previousMonth?: string;
  nextMonth?: string;
}

export interface InlineDatePickerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /** Selected date. `null` = no value. Pair with `onChange` for controlled use. */
  value?: Date | null;
  /** Initial selected date for uncontrolled use. */
  defaultValue?: Date | null;
  /** Fires when the user clicks a cell. */
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

  /** Localized chevron strings. */
  labels?: InlineDatePickerLabels;
}

const DEFAULT_LABELS: Required<InlineDatePickerLabels> = {
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
};

/**
 * Inline single-date calendar — same month grid as `<DatePicker>` but
 * always rendered in flow (no input, no popover). Composes the shared
 * `<DatePickerGrid>` in single-mode.
 *
 * Cursor is sticky after user interaction: it anchors to `value ?? new
 * Date()` on mount and stays where the user navigates with the chevrons
 * / PageUp / PageDown. Programmatic `value` changes do NOT re-anchor the
 * cursor — the consumer owns scroll/focus into the new month if they
 * want it (via `ref`).
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
 * - Datetime selection → not supported in v1.
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
      labels,
      className,
      ...rest
    },
    ref,
  ) {
    const contextLocale = useLocale();
    const locale = localeOverride ?? contextLocale;
    const resolvedLabels = { ...DEFAULT_LABELS, ...labels };

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
        setValue(date);
      },
      [setValue],
    );

    return (
      <div ref={ref} className={clsx(styles.inline, className)} {...rest}>
        <DatePickerGrid
          cursor={cursor}
          value={value}
          onSelect={handleSelect}
          onCursorChange={setCursor}
          min={min}
          max={max}
          isDateDisabled={isDateDisabled}
          locale={locale}
          labels={resolvedLabels}
          disabled={disabled}
        />
        {name && (
          <input type="hidden" name={name} value={value ? toIsoDate(value) : ''} />
        )}
      </div>
    );
  },
);
