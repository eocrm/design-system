import { type CSSProperties, type KeyboardEvent } from 'react';
import clsx from 'clsx';
import type { Day } from '../../calendar/types';
import styles from './DayCell.module.scss';

export interface DayCellProps {
  /** The calendar day descriptor produced by `useMonth`. */
  day: Day;
  /** True when this cell currently has roving-tab-index focus in the grid. */
  isFocused?: boolean;
  /** Click on the cell — fires with the day's date. */
  onDayClick?: (date: Date) => void;
  /** Roving-tab-index keyboard handler from MonthView. */
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>, date: Date) => void;
  /** Inline grid placement set by MonthView (e.g. `{ gridColumn: 3, gridRow: 1 }`). */
  style?: CSSProperties;
}

/**
 * Internal: the day-number content for one cell in the month grid. Background,
 * border, and today/weekend tints come from MonthView's per-week `.dayColumn`
 * background layers; this component only owns the day-number text and the
 * gridcell ARIA role.
 *
 * @remarks
 * **When NOT to use:** Do not render `DayCell` directly in application code —
 * it is an internal building block consumed by `MonthView`. Use `Calendar` (or
 * `MonthView`) from the design system and pass events via the `events` prop.
 */
export function DayCell({ day, isFocused = false, onDayClick, onKeyDown, style }: DayCellProps) {
  const handleClick = () => onDayClick?.(day.date);
  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => onKeyDown?.(e, day.date);

  return (
    <div
      role="gridcell"
      tabIndex={isFocused ? 0 : -1}
      aria-selected={false}
      data-date-key={day.key}
      className={clsx(styles.cell, !day.isCurrentMonth && styles.otherMonth)}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKey}
    >
      <div className={clsx(styles.dayNumber, day.isToday && styles.todayNumber)}>
        {day.dayOfMonth}
      </div>
    </div>
  );
}
