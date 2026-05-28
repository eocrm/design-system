import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { useLocale } from '../../i18n/useLocale';
import { useTranslation } from '../../i18n/useTranslation';
import {
  formatTime,
  parseTime,
  resolveHourCycle,
  roundTimeToStep,
  type HourCycle,
  type TimeValue,
} from '../_internal/timeUtils';
import styles from './TimeField.module.scss';

export type { TimeValue, HourCycle };

/**
 * Props for the public `<TimeField>` primitive — a standalone time-of-day
 * input with a popover containing hour / minute (and AM/PM in 12h locales)
 * lists. Used internally by the DatePicker family, exposed publicly for
 * consumers who need a time input without a date.
 */
export interface TimeFieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /**
   * Selected time. `null` disables the field — the field cannot be
   * activated until the parent supplies a value (used by the picker family
   * to gate time selection on a date being chosen first).
   */
  value: TimeValue | null;
  /**
   * Fired when the user commits a new time, either by typing + blur /
   * Enter, by clicking a row in the popover, or by clicking the Now button.
   * The emitted value is always 24-hour internal regardless of display cycle.
   */
  onChange: (value: TimeValue) => void;
  /**
   * Minutes step. Default `15`. Controls the row count in the minutes
   * column (e.g., 15 → 4 rows: 00/15/30/45) AND rounds typed input on
   * commit. Set `1` to disable rounding.
   */
  step?: number;
  /**
   * Display + parse cycle.
   * - `'24'` — hour list 00–23, text input shows `HH:mm`, no AM/PM column.
   * - `'12'` — hour list `12, 1, 2, …, 11` with an AM/PM column; text
   *   input shows `h:mm AM/PM`.
   * - `'auto'` (default) — reads the active locale via
   *   `Intl.DateTimeFormat`; en-US → 12h, ru-RU → 24h.
   *
   * Typed input is lenient regardless of cycle — both 24h (`14:30`) and
   * AM/PM (`2:30 PM`) shapes parse in either mode.
   */
  hourCycle?: HourCycle;
  /**
   * Locale override for `hourCycle='auto'` detection + text formatting.
   * Defaults to the active `<LocaleProvider>` / browser locale.
   */
  locale?: string;
  /**
   * Hide the "Now" quick-pick button in the popover footer. Default `false`
   * (button shown).
   */
  hideNowButton?: boolean;
  /** Accessible label. Required — TimeField is a primitive with no implicit default. */
  'aria-label': string;
  /** Disables the input + popover trigger. */
  disabled?: boolean;
  /** Stable id for the input (so an external `<label htmlFor>` can target it). */
  id?: string;
  /** Additional className on the wrapper. */
  className?: string;
}

type FocusColumn = 'hours' | 'minutes' | 'period';

/**
 * Standalone time-of-day input — bare text input plus a chevron that opens
 * a Floating-UI popover with scrollable hour / minute (and AM/PM in 12h
 * locales) lists. Free typing parses on blur / Enter via `parseTime`;
 * popover clicks commit immediately and leave the popover open so the user
 * can dial in additional columns. A "Now" footer button quick-picks the
 * current rounded time.
 *
 * Keyboard:
 * - `ArrowDown` on the input opens the popover and moves focus to the
 *   current hour row.
 * - Inside the popover: `ArrowUp` / `ArrowDown` move within the focused
 *   column (no wrap), `ArrowLeft` / `ArrowRight` switch columns, `Home` /
 *   `End` jump to first / last row, `Enter` / `Space` commit, `Escape`
 *   closes.
 *
 * @example
 * // Default — derives 12h vs 24h from the active locale.
 * const [time, setTime] = useState<TimeValue | null>({ hours: 9, minutes: 0 });
 * <TimeField value={time} onChange={setTime} aria-label="Start time" />
 *
 * @example
 * // Forced 24h, 30-minute step, no Now button.
 * <TimeField
 *   value={time}
 *   onChange={setTime}
 *   hourCycle="24"
 *   step={30}
 *   hideNowButton
 *   aria-label="Departure time"
 * />
 *
 * @example
 * // Inside a DatePicker, after a date has been chosen:
 * <TimeField
 *   value={value ? { hours: value.getHours(), minutes: value.getMinutes() } : null}
 *   onChange={(time) => setValue(combineDateAndTime(value, time.hours, time.minutes))}
 *   step={timeStep}
 *   hourCycle={hourCycle}
 *   aria-label={t('datePicker.timeLabel')}
 *   disabled={value == null}
 * />
 *
 * @remarks
 * **When NOT to use.** For datetime input use `<DatePicker>` /
 * `<DateRangePicker>` with `granularity='minute'` — TimeField is for
 * pure time-of-day. For elapsed-duration inputs (e.g. "3h 15m" of
 * meeting length) use a numeric input pair — TimeField clamps to 23:59
 * and parses AM/PM, which are wrong semantics for durations.
 *
 * @remarks
 * **Time zones are out of scope.** The value contract is wall-clock —
 * `{ hours, minutes }` carries no zone information. Round-tripping to UTC
 * is the consumer's responsibility.
 */
export const TimeField = forwardRef<HTMLDivElement, TimeFieldProps>(function TimeField(
  {
    value,
    onChange,
    step = 15,
    hourCycle = 'auto',
    locale: localeProp,
    hideNowButton = false,
    'aria-label': ariaLabel,
    disabled = false,
    id: idProp,
    className,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const localeFromContext = useLocale();
  const locale = localeProp ?? localeFromContext;
  const resolvedCycle = resolveHourCycle(hourCycle, locale);

  const generatedId = useId();
  const inputId = idProp ?? generatedId;

  // Field is effectively disabled when there is no time to mutate.
  const isDisabled = disabled || value == null;

  // ---- Derived current values + display strings ----
  const currentHour = value?.hours ?? 0;
  const currentMinute = value?.minutes ?? 0;
  const currentPeriod: 0 | 1 = currentHour >= 12 ? 1 : 0; // 0 = AM, 1 = PM

  const placeholder =
    resolvedCycle === '24' ? t('datePicker.timePlaceholder24') : t('datePicker.timePlaceholder12');
  // "12:00 AM" = 8 chars; "HH:mm" = 5. Bump for 12h.
  const inputMaxLength = resolvedCycle === '24' ? 5 : 8;

  // Local draft so partial keystrokes don't immediately mutate state.
  const formattedValue = value ? formatTime(value.hours, value.minutes, resolvedCycle) : '';
  const [draft, setDraft] = useState<string>(formattedValue);
  useEffect(() => {
    setDraft(formattedValue);
    // formattedValue is derived from value + resolvedCycle — re-sync on both.
  }, [formattedValue]);

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      if (typeof ref === 'function') ref(node);
      else if (ref != null) (ref as { current: HTMLDivElement | null }).current = node;
    },
    [refs, ref],
  );

  // Force-close whenever the field becomes disabled.
  useEffect(() => {
    if (isDisabled && open) setOpen(false);
  }, [isDisabled, open]);

  // ---- Commit (text → onChange) ----
  const commit = useCallback(() => {
    if (value == null) return;
    const parsed = parseTime(draft);
    if (parsed == null) {
      // Revert to last-known good.
      setDraft(formattedValue);
      return;
    }
    const rounded = roundTimeToStep(parsed.hours, parsed.minutes, step);
    if (rounded.hours === value.hours && rounded.minutes === value.minutes) {
      // No-op — but re-normalize the visible draft so e.g. "230pm" snaps
      // back to the canonical formatted value.
      setDraft(formattedValue);
      return;
    }
    onChange({ hours: rounded.hours, minutes: rounded.minutes });
  }, [draft, formattedValue, onChange, step, value]);

  const handleInputBlur = useCallback(() => {
    // Defer so popover interactions (which move focus into the listbox)
    // don't fire a commit-and-revert before the click handler runs.
    window.setTimeout(() => {
      const active = document.activeElement;
      const insideWrapper = wrapperRef.current?.contains(active);
      const insideFloating = refs.floating.current?.contains(active);
      if (!insideWrapper && !insideFloating) {
        commit();
      }
    }, 0);
  }, [commit, refs.floating]);

  const handleInputKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
        return;
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key === 'ArrowDown' && !isDisabled) {
        e.preventDefault();
        setOpen(true);
      }
    },
    [commit, isDisabled, open],
  );

  // ---- Popover toggle ----
  const handleToggle = useCallback(() => {
    if (isDisabled) return;
    setOpen((v) => {
      const next = !v;
      if (next) {
        // Move focus to the input so the popover Escape / Arrow contracts
        // remain intuitive on close. The arrow-nav effect below will then
        // transfer focus into the listbox.
        inputRef.current?.focus();
      }
      return next;
    });
  }, [isDisabled]);

  // ---- Outside click + Escape ----
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      const floating = refs.floating.current;
      if (target && !wrapperRef.current?.contains(target) && !floating?.contains(target)) {
        commit();
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open, refs.floating, commit]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open]);

  // ---- Row sets ----
  const minuteCount = Math.max(1, Math.floor(60 / Math.max(1, step)));
  const minuteRows: readonly number[] = useMemo(
    () => Array.from({ length: minuteCount }, (_, i) => i * step),
    [minuteCount, step],
  );

  // 24h: 0..23 displayed as "00".."23"; 12h: [12, 1, 2, ..., 11] displayed verbatim.
  // Internal storage is always 24h — the 12h displayed value is mapped via
  // `currentPeriod` when a row is clicked.
  const hoursRows: readonly number[] = useMemo(
    () =>
      resolvedCycle === '24'
        ? Array.from({ length: 24 }, (_, i) => i)
        : [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    [resolvedCycle],
  );

  // Map current internal hour → display hour (used to find the current row
  // in the popover's hours column, and to flag aria-selected / data-current).
  const currentDisplayHour =
    resolvedCycle === '24'
      ? currentHour
      : currentHour % 12 === 0
        ? 12
        : currentHour % 12;

  // ---- Column structure for arrow nav ----
  const columns: readonly FocusColumn[] = useMemo(
    () => (resolvedCycle === '12' ? (['hours', 'minutes', 'period'] as const) : (['hours', 'minutes'] as const)),
    [resolvedCycle],
  );

  const columnLength = useCallback(
    (col: FocusColumn): number => {
      if (col === 'hours') return hoursRows.length;
      if (col === 'minutes') return minuteRows.length;
      return 2; // period
    },
    [hoursRows.length, minuteRows.length],
  );

  // Return the row index of the currently-committed value within a column.
  // Used both for the initial focus on popover open AND when ArrowLeft /
  // ArrowRight switches columns — the destination column lands on its own
  // current row, not on the source column's index.
  const defaultFocusedIndexFor = useCallback(
    (col: FocusColumn): number => {
      if (col === 'hours') {
        const i = hoursRows.indexOf(currentDisplayHour);
        return i === -1 ? 0 : i;
      }
      if (col === 'minutes') {
        const i = minuteRows.indexOf(currentMinute);
        return i === -1 ? 0 : i;
      }
      return currentPeriod;
    },
    [currentDisplayHour, currentMinute, currentPeriod, hoursRows, minuteRows],
  );

  // ---- Roving tabIndex + arrow nav ----
  const [focused, setFocused] = useState<{ column: FocusColumn; index: number }>({
    column: 'hours',
    index: 0,
  });

  // Refs to each row, keyed by "column-index", so the post-state-change
  // effect can call .focus() on the row that now has tabIndex=0.
  const rowRefs = useRef(new Map<string, HTMLLIElement | null>());
  const setRowRef = useCallback(
    (key: string) =>
      (el: HTMLLIElement | null) => {
        if (el === null) rowRefs.current.delete(key);
        else rowRefs.current.set(key, el);
      },
    [],
  );

  // When the popover opens, set focused to the current hour row. Defer the
  // .focus() via rAF — the focus effect below runs after the next render,
  // by which time the portaled DOM is mounted and the row ref is attached.
  useEffect(() => {
    if (!open) return;
    setFocused({ column: 'hours', index: defaultFocusedIndexFor('hours') });
    // Intentionally don't depend on defaultFocusedIndexFor — we only want
    // to snap-focus once per open transition, not every time the row index
    // shifts because the user clicked a different value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus the row currently flagged with tabIndex=0. Runs after every
  // focused-state change while the popover is open. The rAF defer mirrors
  // the existing scrollIntoView pattern — the portaled `<li>` may not be
  // in the DOM yet on the same tick as the open transition.
  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      const el = rowRefs.current.get(`${focused.column}-${focused.index}`);
      el?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [focused, open]);

  const moveColumn = useCallback(
    (delta: number) => {
      setFocused((f) => {
        const i = columns.indexOf(f.column);
        const nextIndex = Math.min(Math.max(0, i + delta), columns.length - 1);
        const next = columns[nextIndex];
        if (next === f.column) return f;
        return { column: next, index: defaultFocusedIndexFor(next) };
      });
    },
    [columns, defaultFocusedIndexFor],
  );

  const handlePopoverKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLDivElement>) => {
      // Don't hijack the Now button's natural Tab / Enter behavior — its
      // own click handler commits via onChange; arrow keys on it have no
      // listbox semantics.
      const target = e.target as HTMLElement | null;
      if (target?.dataset.timefieldNowButton === 'true') return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocused((f) => ({ ...f, index: Math.min(f.index + 1, columnLength(f.column) - 1) }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocused((f) => ({ ...f, index: Math.max(f.index - 1, 0) }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        moveColumn(+1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        moveColumn(-1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setFocused((f) => ({ ...f, index: 0 }));
      } else if (e.key === 'End') {
        e.preventDefault();
        setFocused((f) => ({ ...f, index: columnLength(f.column) - 1 }));
      }
    },
    [columnLength, moveColumn],
  );

  // ---- Auto-scroll current row into view on open ----
  const hoursColumnRef = useRef<HTMLUListElement>(null);
  const minutesColumnRef = useRef<HTMLUListElement>(null);
  const periodColumnRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (!open) return;
    const scrollCurrent = (col: HTMLUListElement | null) => {
      if (!col) return;
      const current = col.querySelector<HTMLElement>('[data-current="true"]');
      // jsdom doesn't implement scrollIntoView; feature-test before calling.
      if (current && typeof current.scrollIntoView === 'function') {
        current.scrollIntoView({ block: 'center' });
      }
    };
    const id = window.requestAnimationFrame(() => {
      scrollCurrent(hoursColumnRef.current);
      scrollCurrent(minutesColumnRef.current);
      scrollCurrent(periodColumnRef.current);
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  // ---- Row click handlers ----
  // 12h hours-column click: map the displayed hour (12, 1..11) to a 24h
  // internal hour given the CURRENT period (so flipping AM ↔ PM is a
  // separate operation on the period column).
  const display12ToInternal = useCallback(
    (displayHour: number, isPm: boolean): number => {
      // 12 AM → 0; 12 PM → 12; 1..11 AM → 1..11; 1..11 PM → 13..23.
      const base = displayHour === 12 ? 0 : displayHour;
      return isPm ? base + 12 : base;
    },
    [],
  );

  const handleHourPick = useCallback(
    (rowValue: number) => {
      if (value == null) return;
      const internalHour =
        resolvedCycle === '24' ? rowValue : display12ToInternal(rowValue, currentPeriod === 1);
      const rounded = roundTimeToStep(internalHour, currentMinute, step);
      onChange({ hours: rounded.hours, minutes: rounded.minutes });
    },
    [
      currentMinute,
      currentPeriod,
      display12ToInternal,
      onChange,
      resolvedCycle,
      step,
      value,
    ],
  );

  const handleMinutePick = useCallback(
    (m: number) => {
      if (value == null) return;
      // Minute rows already align to `step`, but pass through roundTimeToStep
      // for defensive consistency (cheap, idempotent for aligned values).
      const rounded = roundTimeToStep(currentHour, m, step);
      onChange({ hours: rounded.hours, minutes: rounded.minutes });
    },
    [currentHour, onChange, step, value],
  );

  const handlePeriodPick = useCallback(
    (period: 0 | 1) => {
      if (value == null) return;
      // AM (0): clear PM bit if currently PM; else no-op.
      // PM (1): set PM bit if currently AM; else no-op.
      if (period === 0 && currentHour >= 12) {
        onChange({ hours: currentHour - 12, minutes: currentMinute });
      } else if (period === 1 && currentHour < 12) {
        onChange({ hours: currentHour + 12, minutes: currentMinute });
      }
      // Same-period click is a no-op (no onChange) — clicking AM when
      // already AM, or PM when already PM, doesn't churn the controlled
      // value. Consumers relying on every click firing onChange should
      // use the Now button instead.
    },
    [currentHour, currentMinute, onChange, value],
  );

  // ---- Now button ----
  const handleNow = useCallback(() => {
    const now = new Date();
    const rounded = roundTimeToStep(now.getHours(), now.getMinutes(), step);
    onChange({ hours: rounded.hours, minutes: rounded.minutes });
    // Popover stays open — user can fine-tune from the snapped Now value.
  }, [onChange, step]);

  const popoverId = `${inputId}-popover`;

  // Label helpers for the period rows (12h only).
  const periodLabels = useMemo(
    () => [t('datePicker.timePeriodAm'), t('datePicker.timePeriodPm')],
    [t],
  );

  return (
    // Wrapper is the public element — Pattern A (props last so consumer wins),
    // but role/aria-label are spread BEFORE so the group semantics survive
    // an unrelated wrapper-class override.
    <div
      role="group"
      aria-label={ariaLabel}
      {...rest}
      ref={setWrapperRef}
      className={clsx(styles.timeField, isDisabled && styles.disabled, className)}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        className={styles.timeInputCore}
        placeholder={placeholder}
        inputMode="numeric"
        maxLength={inputMaxLength}
        value={draft}
        autoComplete="off"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        disabled={isDisabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
      />
      <button
        type="button"
        className={styles.timeToggle}
        aria-label={`${ariaLabel}, ${t('datePicker.timeOpenList')}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        disabled={isDisabled}
        onClick={handleToggle}
        // Don't steal focus from the input on mousedown — the click handler
        // explicitly focuses the input after toggling.
        onMouseDown={(e) => e.preventDefault()}
      >
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            ref={refs.setFloating}
            id={popoverId}
            style={floatingStyles}
            className={styles.timePopover}
            // Marker attribute: TimeField may be embedded inside a parent
            // popover (the DatePicker's calendar dialog) whose own outside-
            // click handler also listens on document/capture. The parent
            // checks for `[data-timefield-popover]` and treats those clicks
            // as "inside" so the parent doesn't auto-close mid-interaction.
            data-timefield-popover="true"
            onKeyDown={handlePopoverKeyDown}
            // Don't steal focus when clicking inside the popover (rows).
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className={styles.timeColumns}>
              <ul
                ref={hoursColumnRef}
                className={styles.timeColumn}
                role="listbox"
                aria-label={t('datePicker.timeHoursLabel')}
              >
                {hoursRows.map((h, i) => {
                  const isCurrent = h === currentDisplayHour;
                  const isFocused = focused.column === 'hours' && focused.index === i;
                  const label =
                    resolvedCycle === '24' ? String(h).padStart(2, '0') : String(h);
                  return (
                    <li
                      key={h}
                      ref={setRowRef(`hours-${i}`)}
                      role="option"
                      aria-selected={isCurrent}
                      data-current={isCurrent ? 'true' : undefined}
                      tabIndex={isFocused ? 0 : -1}
                      className={clsx(styles.timeRow, isCurrent && styles.timeRowCurrent)}
                      onClick={() => handleHourPick(h)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleHourPick(h);
                        }
                      }}
                    >
                      <span className={styles.timeRowLabel}>{label}</span>
                      {isCurrent && (
                        <Check size={12} aria-hidden="true" className={styles.timeRowCheck} />
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className={styles.timeColumnDivider} aria-hidden="true" />
              <ul
                ref={minutesColumnRef}
                className={styles.timeColumn}
                role="listbox"
                aria-label={t('datePicker.timeMinutesLabel')}
              >
                {minuteRows.map((m, i) => {
                  const isCurrent = m === currentMinute;
                  const isFocused = focused.column === 'minutes' && focused.index === i;
                  return (
                    <li
                      key={m}
                      ref={setRowRef(`minutes-${i}`)}
                      role="option"
                      aria-selected={isCurrent}
                      data-current={isCurrent ? 'true' : undefined}
                      tabIndex={isFocused ? 0 : -1}
                      className={clsx(styles.timeRow, isCurrent && styles.timeRowCurrent)}
                      onClick={() => handleMinutePick(m)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleMinutePick(m);
                        }
                      }}
                    >
                      <span className={styles.timeRowLabel}>{String(m).padStart(2, '0')}</span>
                      {isCurrent && (
                        <Check size={12} aria-hidden="true" className={styles.timeRowCheck} />
                      )}
                    </li>
                  );
                })}
              </ul>
              {resolvedCycle === '12' && (
                <>
                  <div className={styles.timeColumnDivider} aria-hidden="true" />
                  <ul
                    ref={periodColumnRef}
                    className={clsx(styles.timeColumn, styles.timeColumnPeriod)}
                    role="listbox"
                    aria-label={t('datePicker.timePeriodLabel')}
                  >
                    {[0, 1].map((p) => {
                      const isCurrent = p === currentPeriod;
                      const isFocused = focused.column === 'period' && focused.index === p;
                      return (
                        <li
                          key={p}
                          ref={setRowRef(`period-${p}`)}
                          role="option"
                          aria-selected={isCurrent}
                          data-current={isCurrent ? 'true' : undefined}
                          tabIndex={isFocused ? 0 : -1}
                          className={clsx(styles.timeRow, isCurrent && styles.timeRowCurrent)}
                          onClick={() => handlePeriodPick(p as 0 | 1)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handlePeriodPick(p as 0 | 1);
                            }
                          }}
                        >
                          <span className={styles.timeRowLabel}>{periodLabels[p]}</span>
                          {isCurrent && (
                            <Check
                              size={12}
                              aria-hidden="true"
                              className={styles.timeRowCheck}
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
            {!hideNowButton && (
              <div className={styles.timeFooter}>
                <button
                  type="button"
                  className={styles.timeNowButton}
                  data-timefield-now-button="true"
                  onClick={handleNow}
                >
                  {t('datePicker.timeNow')}
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
});

TimeField.displayName = 'TimeField';
