import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { parseTime, roundTimeToStep, toTimeInputValue } from './utils';
import styles from './TimeField.module.scss';

/**
 * Props for the internal `<TimeField>` used by the DatePicker family. Not
 * exported from the package barrel — promote to a public primitive only when
 * a consumer needs a standalone time input.
 */
export interface TimeFieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange' | 'defaultValue'> {
  /**
   * Current value. `null` means the parent has no date yet (the field is
   * disabled in that case — you can't pick a time without a date).
   */
  value: Date | null;
  /**
   * Called when the user commits a new time, either by typing + blur/Enter
   * or by clicking a row in the popover.
   */
  onChange: (hours: number, minutes: number) => void;
  /**
   * Minutes step. Defaults to `15`. Controls the row count in the minutes
   * column (e.g., 15 → 4 rows: 00, 15, 30, 45) AND rounds typed input on
   * commit (e.g., `"14:22"` with step=15 → `14:15`). Set `1` to disable
   * rounding.
   */
  step?: number;
  /**
   * Accessible label for the input. Required — `<TimeField>` is a
   * primitive with no implicit i18n default.
   */
  'aria-label': string;
  /** Disables the input + popover trigger. */
  disabled?: boolean;
  /** Stable id for the input (so an external `<label htmlFor>` can target it). */
  id?: string;
  /** Additional className on the wrapper. */
  className?: string;
}

const HOURS: readonly number[] = Array.from({ length: 24 }, (_, i) => i);

/**
 * Combo time input — bare text input with our chrome plus a chevron that
 * opens a Floating-UI popover containing two scrollable lists (hours +
 * minutes). Free typing parses on blur / Enter via `parseTime`; popover
 * clicks commit immediately and leave the popover open so the user can
 * dial in both columns.
 *
 * @example
 * // Inside a DatePicker, after a date has been chosen:
 * <TimeField
 *   value={value}
 *   step={timeStep}
 *   onChange={(h, m) => setValue(combineDateAndTime(value, h, m))}
 *   aria-label={t('datePicker.timeLabel')}
 *   disabled={value == null}
 *   id={`${inputId}-time`}
 * />
 *
 * @remarks Internal component. Not exported from the package barrel.
 */
export const TimeField = forwardRef<HTMLDivElement, TimeFieldProps>(function TimeField(
  {
    value,
    onChange,
    step = 15,
    'aria-label': ariaLabel,
    disabled = false,
    id: idProp,
    className,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const generatedId = useId();
  const inputId = idProp ?? generatedId;

  // Field is effectively disabled when there is no date to attach a time to.
  const isDisabled = disabled || value == null;

  // Local draft so partial keystrokes don't immediately mutate state.
  const [draft, setDraft] = useState<string>(value ? toTimeInputValue(value) : '');
  useEffect(() => {
    setDraft(value ? toTimeInputValue(value) : '');
  }, [value]);

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
      // forward to forwardRef target
      if (typeof ref === 'function') ref(node);
      else if (ref != null) (ref as { current: HTMLDivElement | null }).current = node;
    },
    [refs, ref],
  );

  // Force-close whenever the field becomes disabled (value cleared upstream).
  useEffect(() => {
    if (isDisabled && open) setOpen(false);
  }, [isDisabled, open]);

  // ---- Commit (text → onChange) ----
  const commit = useCallback(() => {
    if (value == null) return;
    const parsed = parseTime(draft);
    if (parsed == null) {
      // Revert to last-known good.
      setDraft(toTimeInputValue(value));
      return;
    }
    const rounded = roundTimeToStep(parsed.hours, parsed.minutes, step);
    // If the typed value, post-round, matches current value, no-op (don't
    // call onChange for an unchanged value — keeps controlled-update churn down).
    if (rounded.hours === value.getHours() && rounded.minutes === value.getMinutes()) {
      setDraft(toTimeInputValue(value));
      return;
    }
    onChange(rounded.hours, rounded.minutes);
  }, [draft, onChange, step, value]);

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
      if (e.key === 'ArrowDown' && !open && !isDisabled) {
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
        // remain intuitive — chevron click also focuses the input.
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

  // ---- Popover row sets ----
  const minuteCount = Math.max(1, Math.floor(60 / Math.max(1, step)));
  const minuteRows: readonly number[] = Array.from({ length: minuteCount }, (_, i) => i * step);

  const currentHour = value?.getHours() ?? 0;
  const currentMinute = value?.getMinutes() ?? 0;

  // ---- Auto-scroll current row into view on open ----
  const hoursColumnRef = useRef<HTMLUListElement>(null);
  const minutesColumnRef = useRef<HTMLUListElement>(null);
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
    // Defer to the next microtask so the portaled DOM is mounted.
    const id = window.requestAnimationFrame(() => {
      scrollCurrent(hoursColumnRef.current);
      scrollCurrent(minutesColumnRef.current);
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  // ---- Row click handlers ----
  const handleHourPick = useCallback(
    (h: number) => {
      if (value == null) return;
      const rounded = roundTimeToStep(h, currentMinute, step);
      onChange(rounded.hours, rounded.minutes);
    },
    [currentMinute, onChange, step, value],
  );
  const handleMinutePick = useCallback(
    (m: number) => {
      if (value == null) return;
      // Minute rows already align to `step`, but pass through roundTimeToStep
      // for defensive consistency (cheap, idempotent for aligned values).
      const rounded = roundTimeToStep(currentHour, m, step);
      onChange(rounded.hours, rounded.minutes);
    },
    [currentHour, onChange, step, value],
  );

  const popoverId = `${inputId}-popover`;

  return (
    // Wrapper is the public element — Pattern A (props last so consumer wins),
    // but role/aria-label are spread BEFORE so the group semantics survive
    // an unrelated wrapper-class override. Role/label can still be overridden
    // intentionally by passing them in `...rest`.
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
        placeholder="HH:mm"
        inputMode="numeric"
        maxLength={5}
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
        // Intentionally Tab-reachable (default tabIndex for <button>): the
        // chevron is the only discoverable affordance for the list-based
        // picker. Without a Tab stop, keyboard users could not reach the
        // hour/minute popover at all (the input handles ArrowDown to open,
        // but only keyboard users who already know the gesture would find
        // it). The chevron's aria-label includes the field's aria-label so
        // screen readers get full context.
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
            // checks for `[data-timefield-popover]` in the target's
            // ancestor chain and treats those clicks as "inside" so the
            // parent doesn't auto-close mid-interaction.
            data-timefield-popover="true"
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
                {HOURS.map((h) => {
                  const isCurrent = h === currentHour;
                  return (
                    // WAI-ARIA APG listbox pattern: the `<li>` IS the option
                    // (not a wrapper around an interactive `<button>`). A
                    // nested button caused screen readers to announce both
                    // "option" and "button" per row.
                    <li
                      key={h}
                      role="option"
                      aria-selected={isCurrent}
                      data-current={isCurrent ? 'true' : undefined}
                      tabIndex={-1}
                      className={clsx(styles.timeRow, isCurrent && styles.timeRowCurrent)}
                      onClick={() => handleHourPick(h)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleHourPick(h);
                        }
                      }}
                    >
                      <span className={styles.timeRowLabel}>
                        {String(h).padStart(2, '0')}
                      </span>
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
              <div className={styles.timeColumnDivider} aria-hidden="true" />
              <ul
                ref={minutesColumnRef}
                className={styles.timeColumn}
                role="listbox"
                aria-label={t('datePicker.timeMinutesLabel')}
              >
                {minuteRows.map((m) => {
                  const isCurrent = m === currentMinute;
                  return (
                    // See Hours column for the listbox-pattern rationale.
                    <li
                      key={m}
                      role="option"
                      aria-selected={isCurrent}
                      data-current={isCurrent ? 'true' : undefined}
                      tabIndex={-1}
                      className={clsx(styles.timeRow, isCurrent && styles.timeRowCurrent)}
                      onClick={() => handleMinutePick(m)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleMinutePick(m);
                        }
                      }}
                    >
                      <span className={styles.timeRowLabel}>
                        {String(m).padStart(2, '0')}
                      </span>
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
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
});

TimeField.displayName = 'TimeField';
