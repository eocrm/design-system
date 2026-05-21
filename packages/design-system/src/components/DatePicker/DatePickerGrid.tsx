import { useCallback, useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMonth } from '../../calendar/useMonth';
import { useLocale } from '../../i18n/useLocale';
import { isSameDay, startOfDay } from '../../calendar/dateMath';
import { isDateOutOfRange } from './utils';
import styles from './DatePickerGrid.module.scss';

export interface DatePickerGridProps {
  /** Cursor month — controls which month is rendered. */
  cursor: Date;
  /** Currently selected date (highlighted). `null` for no selection. */
  value: Date | null;
  /** Fires when the user picks a cell. */
  onSelect: (date: Date) => void;
  /** Fires when prev/next chevron or PageUp/PageDown changes the cursor. */
  onCursorChange: (date: Date) => void;
  /** Earliest selectable date (inclusive). */
  min?: Date;
  /** Latest selectable date (inclusive). */
  max?: Date;
  /** Per-date disable predicate. */
  isDateDisabled?: (date: Date) => boolean;
  /** Override locale (otherwise reads `useLocale()`). */
  locale?: string;
  /** Localized strings for the chevrons. */
  labels: { previousMonth: string; nextMonth: string };
}

/**
 * Internal: month-grid surface rendered inside the DatePicker popover.
 * Built on `useMonth`; renders a header row (prev / month label / next),
 * a weekday-name row, and a 6x7 grid of focusable day buttons.
 *
 * Keyboard contract:
 * - Arrow keys: move focus by 1 day / 1 week, skipping disabled cells,
 *   crossing month boundaries (updates `cursor` when needed).
 * - Home / End: first / last day of the focused week.
 * - PageUp / PageDown: previous / next month, preserving day-of-month
 *   where possible.
 * - Enter / Space: select the focused cell.
 *
 * @remarks
 * **When NOT to use:** Do not render directly — use `<DatePicker>`,
 * which composes this inside its popover with proper open/close state
 * and focus management.
 */
export function DatePickerGrid({
  cursor,
  value,
  onSelect,
  onCursorChange,
  min,
  max,
  isDateDisabled,
  locale: localeOverride,
  labels,
}: DatePickerGridProps) {
  const contextLocale = useLocale();
  const locale = localeOverride ?? contextLocale;
  const grid = useMonth(cursor, { locale });
  const today = useMemo(() => startOfDay(new Date()), []);

  const goPrev = useCallback(() => {
    onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  }, [cursor, onCursorChange]);
  const goNext = useCallback(() => {
    onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  }, [cursor, onCursorChange]);

  const cellsRef = useRef<Map<string, HTMLButtonElement>>(new Map());

  const isDisabled = useCallback(
    (date: Date) => isDateOutOfRange(date, min, max, isDateDisabled),
    [min, max, isDateDisabled],
  );

  // After the cursor changes from a keyboard event we want focus to land
  // on the equivalent date in the new month. The effect runs after render.
  const pendingFocusKey = useRef<string | null>(null);
  useEffect(() => {
    if (pendingFocusKey.current) {
      const el = cellsRef.current.get(pendingFocusKey.current);
      el?.focus();
      pendingFocusKey.current = null;
    }
  }, [cursor]);

  const moveFocus = useCallback(
    (from: Date, deltaDays: number) => {
      let target = new Date(from);
      // Walk by deltaDays in single-day steps, skipping disabled cells.
      const dir = deltaDays > 0 ? 1 : -1;
      let steps = Math.abs(deltaDays);
      while (steps > 0) {
        target = new Date(target.getFullYear(), target.getMonth(), target.getDate() + dir);
        if (!isDisabled(target)) steps -= 1;
        // Hard stop so an entirely-disabled future doesn't loop forever.
        if (Math.abs(target.getTime() - from.getTime()) > 366 * 86_400_000) return;
      }
      const key = isoKey(target);
      const inSameMonth =
        target.getMonth() === cursor.getMonth() && target.getFullYear() === cursor.getFullYear();
      if (!inSameMonth) {
        pendingFocusKey.current = key;
        onCursorChange(new Date(target.getFullYear(), target.getMonth(), 1));
        return;
      }
      cellsRef.current.get(key)?.focus();
    },
    [cursor, isDisabled, onCursorChange],
  );

  const handleCellKeyDown = (e: KeyboardEvent<HTMLButtonElement>, date: Date) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        moveFocus(date, 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moveFocus(date, -1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        moveFocus(date, 7);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveFocus(date, -7);
        break;
      case 'Home': {
        e.preventDefault();
        const day = date.getDay();
        const firstDow = grid.weekdayLabels.length > 0 ? 0 : 0; // grid is already locale-rotated
        // Find the week's first day by walking back to the start of its row.
        const week = grid.weeks.find((w) => w.some((d) => isSameDay(d.date, date)));
        if (week) cellsRef.current.get(isoKey(week[0].date))?.focus();
        void day;
        void firstDow;
        break;
      }
      case 'End': {
        e.preventDefault();
        const week = grid.weeks.find((w) => w.some((d) => isSameDay(d.date, date)));
        if (week) cellsRef.current.get(isoKey(week[6].date))?.focus();
        break;
      }
      case 'PageDown':
        e.preventDefault();
        pendingFocusKey.current = isoKey(
          new Date(date.getFullYear(), date.getMonth() + 1, date.getDate()),
        );
        onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
        break;
      case 'PageUp':
        e.preventDefault();
        pendingFocusKey.current = isoKey(
          new Date(date.getFullYear(), date.getMonth() - 1, date.getDate()),
        );
        onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isDisabled(date)) onSelect(date);
        break;
    }
  };

  return (
    <div className={styles.grid} role="dialog" aria-label="Choose date">
      <header className={styles.header}>
        <button
          type="button"
          className={styles.navButton}
          aria-label={labels.previousMonth}
          onClick={goPrev}
        >
          <ChevronLeft size={14} />
        </button>
        <span className={styles.monthLabel} aria-live="polite">
          {grid.monthLabel}
        </span>
        <button
          type="button"
          className={styles.navButton}
          aria-label={labels.nextMonth}
          onClick={goNext}
        >
          <ChevronRight size={14} />
        </button>
      </header>
      <div role="grid" className={styles.cells}>
        <div role="row" className={styles.weekdayRow}>
          {grid.weekdayLabels.map((label, i) => (
            <span key={i} role="columnheader" className={styles.weekday}>
              {label}
            </span>
          ))}
        </div>
        {grid.weeks.map((week, wIdx) => (
          <div role="row" key={wIdx} className={styles.weekRow}>
            {week.map((day) => {
              const disabled = isDisabled(day.date);
              const isSelected = value != null && isSameDay(day.date, value);
              const isTodayCell = isSameDay(day.date, today);
              const key = isoKey(day.date);
              return (
                <button
                  key={key}
                  ref={(el) => {
                    if (el) cellsRef.current.set(key, el);
                    else cellsRef.current.delete(key);
                  }}
                  type="button"
                  role="gridcell"
                  className={clsx(
                    styles.cell,
                    !day.isCurrentMonth && styles.outside,
                    isSelected && styles.selected,
                    isTodayCell && styles.today,
                    disabled && styles.disabled,
                  )}
                  aria-selected={isSelected || undefined}
                  aria-disabled={disabled || undefined}
                  tabIndex={isSelected || (value == null && isTodayCell) ? 0 : -1}
                  onClick={() => {
                    if (!disabled) onSelect(day.date);
                  }}
                  onKeyDown={(e) => handleCellKeyDown(e, day.date)}
                >
                  {day.dayOfMonth}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function isoKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}
