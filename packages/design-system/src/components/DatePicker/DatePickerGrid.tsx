import { useCallback, useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMonth } from '../../calendar/useMonth';
import { useLocale } from '../../i18n/useLocale';
import { isSameDay, startOfDay, toDateKey } from '../../calendar/dateMath';
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
  /** Selection model. Defaults to 'single'. */
  selectionMode?: 'single' | 'range';
  /** Range start (when mode='range'). The left boundary of the committed range. */
  rangeStart?: Date | null;
  /** Range end (when mode='range'). The right boundary. */
  rangeEnd?: Date | null;
  /** In-flight hover preview (when mode='range' and only rangeStart is set). */
  hoverDate?: Date | null;
  /** Fires on cell mouseenter (the date) and on grid mouseleave (null). */
  onHoverDate?: (date: Date | null) => void;
  /** Show the prev / next month chevrons. Defaults to true; the month label is always shown. */
  chevrons?: boolean;
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
  selectionMode = 'single',
  rangeStart = null,
  rangeEnd = null,
  hoverDate = null,
  onHoverDate,
  chevrons = true,
}: DatePickerGridProps) {
  const contextLocale = useLocale();
  const locale = localeOverride ?? contextLocale;
  const grid = useMonth(cursor, { locale });
  const today = useMemo(() => startOfDay(new Date()), []);

  const cellsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  // After the cursor changes from a keyboard event we want focus to land
  // on the equivalent date in the new month. The effect runs after render.
  const pendingFocusKey = useRef<string | null>(null);

  const goPrev = useCallback(() => {
    // Invalidate any pending keyboard focus target — chevron clicks are
    // pointer-driven and should not steal focus to a stale cell.
    pendingFocusKey.current = null;
    onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  }, [cursor, onCursorChange]);
  const goNext = useCallback(() => {
    pendingFocusKey.current = null;
    onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  }, [cursor, onCursorChange]);

  const isDisabled = useCallback(
    (date: Date) => isDateOutOfRange(date, min, max, isDateDisabled),
    [min, max, isDateDisabled],
  );

  // Range-mode helpers — no-op when selectionMode === 'single'.
  const rangeAnchorStart = selectionMode === 'range' ? rangeStart : null;
  const rangeAnchorEnd = selectionMode === 'range' ? (rangeEnd ?? hoverDate) : null;
  const isInRange = useCallback(
    (date: Date) => {
      if (!rangeAnchorStart || !rangeAnchorEnd) return false;
      const a = startOfDay(rangeAnchorStart).getTime();
      const b = startOfDay(rangeAnchorEnd).getTime();
      const t = startOfDay(date).getTime();
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      return t >= lo && t <= hi;
    },
    [rangeAnchorStart, rangeAnchorEnd],
  );
  const isRangeStartCell = (date: Date) =>
    selectionMode === 'range' && rangeStart != null && isSameDay(date, rangeStart);
  const isRangeEndCell = (date: Date) =>
    selectionMode === 'range' &&
    (rangeEnd != null
      ? isSameDay(date, rangeEnd)
      : rangeStart != null && hoverDate != null && isSameDay(date, hoverDate));

  const tabIndexFor = (date: Date, isTodayCell: boolean): number => {
    if (selectionMode === 'range') {
      if (rangeStart != null && isSameDay(date, rangeStart)) return 0;
      if (rangeStart == null && isTodayCell) return 0;
      return -1;
    }
    return value != null && isSameDay(date, value)
      ? 0
      : value == null && isTodayCell
        ? 0
        : -1;
  };

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
        // Stop walking once we'd leave the allowed range — never moves
        // silently into a no-op. (Caller must not pass an all-disabled
        // predicate with no bounds — that's an unwinnable input.)
        if ((min && target < startOfDay(min)) || (max && target > startOfDay(max))) return;
        if (!isDisabled(target)) steps -= 1;
      }
      const key = toDateKey(target);
      const inSameMonth =
        target.getMonth() === cursor.getMonth() && target.getFullYear() === cursor.getFullYear();
      if (!inSameMonth) {
        pendingFocusKey.current = key;
        onCursorChange(new Date(target.getFullYear(), target.getMonth(), 1));
        return;
      }
      cellsRef.current.get(key)?.focus();
    },
    [cursor, isDisabled, max, min, onCursorChange],
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
        const week = grid.weeks.find((w) => w.some((d) => isSameDay(d.date, date)));
        if (week) cellsRef.current.get(toDateKey(week[0].date))?.focus();
        break;
      }
      case 'End': {
        e.preventDefault();
        const week = grid.weeks.find((w) => w.some((d) => isSameDay(d.date, date)));
        if (week) cellsRef.current.get(toDateKey(week[6].date))?.focus();
        break;
      }
      case 'PageDown':
        e.preventDefault();
        pendingFocusKey.current = toDateKey(
          new Date(date.getFullYear(), date.getMonth() + 1, date.getDate()),
        );
        onCursorChange(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
        break;
      case 'PageUp':
        e.preventDefault();
        pendingFocusKey.current = toDateKey(
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
    <div className={styles.grid}>
      <header className={styles.header}>
        {chevrons && (
          <button
            type="button"
            className={styles.navButton}
            aria-label={labels.previousMonth}
            onClick={goPrev}
          >
            <ChevronLeft size={14} />
          </button>
        )}
        <span className={styles.monthLabel} aria-live="polite">
          {grid.monthLabel}
        </span>
        {chevrons && (
          <button
            type="button"
            className={styles.navButton}
            aria-label={labels.nextMonth}
            onClick={goNext}
          >
            <ChevronRight size={14} />
          </button>
        )}
      </header>
      <div role="grid" className={styles.cells} onMouseLeave={() => onHoverDate?.(null)}>
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
              const key = toDateKey(day.date);
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
                    isInRange(day.date) && styles.inRange,
                    isRangeStartCell(day.date) && styles.rangeStart,
                    isRangeEndCell(day.date) && styles.rangeEnd,
                  )}
                  aria-selected={
                    isSelected || isRangeStartCell(day.date) || isRangeEndCell(day.date) || undefined
                  }
                  aria-disabled={disabled || undefined}
                  tabIndex={tabIndexFor(day.date, isTodayCell)}
                  onClick={() => {
                    if (!disabled) onSelect(day.date);
                  }}
                  onKeyDown={(e) => handleCellKeyDown(e, day.date)}
                  onMouseEnter={() => {
                    if (!disabled && onHoverDate) onHoverDate(day.date);
                  }}
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
