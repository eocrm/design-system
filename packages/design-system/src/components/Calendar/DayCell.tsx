import { type MouseEvent, type KeyboardEvent } from 'react';
import clsx from 'clsx';
import type { Day } from '../../calendar/types';
import styles from './DayCell.module.scss';

export interface DayCellProps {
  /** The calendar day descriptor produced by `useMonth`. */
  day: Day;
  /** True when this cell currently has roving-tab-index focus in the grid. */
  isFocused?: boolean;
  /** Count of hidden events for this day (events past `maxLanesPerWeek`). 0 means no overflow chip. */
  hiddenCount?: number;
  /** Click on the cell or "+N more" chip — fires with the day's date. */
  onDayClick?: (date: Date) => void;
  /** Roving-tab-index keyboard handler from MonthView. */
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>, date: Date) => void;
}

/**
 * Internal: one day's header cell in the month grid. Owns the day number, the
 * today/weekend/leading-trailing styling, and the optional "+N more" overflow
 * chip. Event bars live in the per-week lane stack, not inside this component.
 *
 * @remarks
 * **When NOT to use:** Do not render `DayCell` directly in application code —
 * it is an internal building block consumed by `MonthView`. Use `Calendar` (or
 * `MonthView`) from the design system and pass events via the `events` prop.
 */
export function DayCell({
  day,
  isFocused = false,
  hiddenCount = 0,
  onDayClick,
  onKeyDown,
}: DayCellProps) {
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    // Bars/chips stop propagation; this handler only fires on the cell itself.
    if ((e.target as HTMLElement).closest(`.${styles.moreChip}`)) return;
    onDayClick?.(day.date);
  };

  const handleMoreClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onDayClick?.(day.date);
  };

  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e, day.date);
  };

  return (
    <div
      role="gridcell"
      tabIndex={isFocused ? 0 : -1}
      aria-selected={false}
      data-date-key={day.key}
      className={clsx(
        styles.cell,
        day.isToday && styles.today,
        day.isWeekend && styles.weekend,
        !day.isCurrentMonth && styles.otherMonth,
      )}
      onClick={handleClick}
      onKeyDown={handleKey}
    >
      <div className={styles.dayNumber}>{day.dayOfMonth}</div>
      {hiddenCount > 0 && (
        <div className={styles.moreChipWrapper}>
          <button
            type="button"
            className={styles.moreChip}
            onClick={handleMoreClick}
            aria-label={`${hiddenCount} more events`}
          >
            +{hiddenCount} more
          </button>
        </div>
      )}
    </div>
  );
}
