import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { useLocale } from '../../i18n/useLocale';
import { useTranslation } from '../../i18n/useTranslation';
import { formatHour, formatTime } from '../../calendar';
import { isSameDay } from '../../calendar/dateMath';
import { TimedEvent } from './TimedEvent';
import { useEventDrag, type DragMode } from './useEventDrag';
import { isResourceGrid, type HourGridColumnRef } from './utils';
import type {
  BackgroundBlock,
  CalendarDropCandidate,
  CalendarDropResult,
  CalendarEvent,
  CalendarEventMove,
  CalendarEventResize,
  CalendarView,
  RenderEvent,
  TimedEventBlock,
} from './types';
import styles from './HourGrid.module.scss';

/** Default hour-gutter width in pixels. */
export const HOUR_GUTTER_WIDTH = 60;

/** One rendered column: a date (week/day) or a resource lane (resource day view). */
export type HourGridColumn = HourGridColumnRef & { isWeekend?: boolean };

export interface HourGridProps {
  /**
   * One entry per column: seven dates in week view, one in a plain day view,
   * one per resource (plus the trailing unassigned lane) in a resource day
   * view. All columns share a single time axis and a single scroll container.
   */
  columns: readonly HourGridColumn[];
  /** Localized column header content (one per column). */
  columnHeaders: readonly ReactNode[];
  /** Inclusive start, exclusive end. */
  hourRange: readonly [number, number];
  /** Pixel height per hour row. */
  hourRowHeight: number;
  /** Timed events positioned within columns. */
  timedBlocks: readonly TimedEventBlock[];
  /** Availability underlay bands, painted beneath the events. */
  backgroundBlocks?: readonly BackgroundBlock[];
  /** Today's date (injected for testability). Defaults to `new Date()`. */
  now?: Date;
  /** Which view is rendering this grid (`'week'` or `'day'`). Passed to `renderEvent`. */
  view?: CalendarView;
  /** Optional custom event renderer (replaces the inner chip content). */
  renderEvent?: RenderEvent;
  /** Fires when a timed-event block in a day column is clicked. */
  onEventClick?: (event: CalendarEvent) => void;
  /** Fires when empty space inside a day column is clicked, with that column's date. */
  onDayClick?: (date: Date) => void;
  /** Enables drag-to-move. Absent → blocks are not movable. */
  onEventMove?: (event: CalendarEvent, next: CalendarEventMove) => CalendarDropResult;
  /** Enables drag-to-resize. Absent → blocks have no resize handle. */
  onEventResize?: (event: CalendarEvent, next: CalendarEventResize) => CalendarDropResult;
  /** Live veto during a drag. */
  canDropEvent?: (event: CalendarEvent, next: CalendarDropCandidate) => boolean;
  /** Snap granularity for drags, in minutes. */
  dragSnapMinutes?: number;
  /** ARIA label for the outer `role="grid"` container (e.g., week range or day label). */
  ariaLabel: string;
}

/**
 * Internal: hour-grid scaffold for Week and Day views. Renders the column
 * headers, hour gutter labels, the column bodies (with the availability
 * underlay behind and timed events positioned absolutely inside), and a
 * horizontal "now" line in today's column when today is in the rendered
 * range. Re-renders every minute so the now-line stays accurate.
 *
 * @remarks
 * **When NOT to use:** Do not render `HourGrid` directly in application code —
 * it is an internal building block consumed by `WeekView`/`DayView`. Use `Calendar`
 * from the design system and pass events via the `events` prop.
 */
export function HourGrid({
  columns,
  columnHeaders,
  hourRange,
  hourRowHeight,
  timedBlocks,
  backgroundBlocks,
  now,
  view = 'week',
  renderEvent,
  onEventClick,
  onDayClick,
  onEventMove,
  onEventResize,
  canDropEvent,
  dragSnapMinutes = 15,
  ariaLabel,
}: HourGridProps) {
  const locale = useLocale();
  const t = useTranslation();
  const [tick, setTick] = useState(0);
  const dragHintId = useId();

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);
  // `tick` only exists to invalidate the time-derived memos
  void tick;

  const currentTime = now ?? new Date();

  const hourLabels = useMemo(() => {
    const labels: string[] = [];
    for (let h = hourRange[0]; h < hourRange[1]; h++) {
      labels.push(formatHour(h, locale));
    }
    return labels;
  }, [hourRange, locale]);

  const columnCount = columns.length;

  // Live column nodes, for horizontal hit-testing during a drag.
  const columnElements = useRef<(HTMLElement | null)[]>([]);

  const drag = useEventDrag({
    columns,
    hourRowHeight,
    hourRange,
    snapMinutes: dragSnapMinutes,
    columnElements,
    onEventMove,
    onEventResize,
    canDropEvent,
  });
  const draggable = drag.canMove || drag.canResize;

  // Live-region copy for the drag. Without it the keyboard path is silent: an
  // Alt+Arrow that lands on 9:15 — or that gets refused — is indistinguishable
  // from one that did nothing.
  const { announcement } = drag;
  const dragMessage = (() => {
    if (!announcement) return '';
    // Every message names the event, matching how the rest of the library's
    // drag surfaces announce (see `_internal/dragAnnouncements.ts`): with a
    // week of blocks on screen, a bare time says nothing about which one moved.
    const name = announcement.event.title;
    if (announcement.cancelled) return t('calendar.dragCancelled', { event: name });
    if (announcement.unchanged) return t('calendar.dragUnchanged', { event: name });
    if (announcement.atEdge) return t('calendar.dragAtEdge', { event: name });
    if (announcement.refused) return t('calendar.dragRefused', { event: name });
    if (announcement.mode === 'resize') {
      return t('calendar.dragEndsAt', {
        event: name,
        time: formatTime(announcement.endsAt, locale),
      });
    }
    // A move states the whole slot — the end moves with the start, and a
    // receptionist needs both to know whether it still fits.
    const range = `${formatTime(announcement.startsAt, locale)} – ${formatTime(announcement.endsAt, locale)}`;
    return t('calendar.dragMovedTo', { event: name, time: range });
  })();

  const blocksByDay = useMemo(() => {
    const m = new Map<number, TimedEventBlock[]>();
    for (const b of timedBlocks) {
      // A block being dragged into another column renders there, not where
      // its `events` entry still places it.
      const index =
        drag.preview && drag.preview.eventId === b.event.id ? drag.preview.columnIndex : b.dayIndex;
      const list = m.get(index) ?? [];
      list.push(b);
      m.set(index, list);
    }
    return m;
  }, [timedBlocks, drag.preview]);

  const backgroundByDay = useMemo(() => {
    const m = new Map<number, BackgroundBlock[]>();
    for (const b of backgroundBlocks ?? []) {
      const list = m.get(b.dayIndex) ?? [];
      list.push(b);
      m.set(b.dayIndex, list);
    }
    return m;
  }, [backgroundBlocks]);

  const totalHours = hourRange[1] - hourRange[0];
  const nowMinutesFromStart =
    (currentTime.getHours() - hourRange[0]) * 60 + currentTime.getMinutes();
  // Strict inequality on the upper bound so the now-line doesn't render
  // on top of the bottom border when current time hits the end of hourRange.
  const nowVisible = nowMinutesFromStart >= 0 && nowMinutesFromStart < totalHours * 60;
  // A predicate, not a findIndex: every column of a resource day view carries
  // the SAME date, so "the first column whose date is today" would tint only
  // the first practitioner's lane and draw the now-line only there — reading
  // as "Ana is today".
  const isTodayColumn = (i: number) => isSameDay(columns[i].date, currentTime);
  // In a resource day view every column is today, so tinting each header says
  // nothing — the date is already in the Calendar header. The now-line still
  // draws in every lane, which is the part that carries information.
  const resourceGrid = isResourceGrid(columns);

  const handleDragStart = (block: TimedEventBlock, mode: DragMode, e: PointerEvent) => {
    drag.startPointerDrag(block, mode, e);
  };

  // A click with `detail === 0` came from the keyboard (Enter/Space), not from
  // a pointer. Only pointer clicks can be the tail of a drag, and only they
  // reset the suppression flag on their `pointerdown` — so consuming it for a
  // keyboard activation would let a gesture abandoned without a pointerup
  // silently eat the user's next Enter press.
  const isPointerClick = (e: { detail: number }) => e.detail > 0;

  const handleEventClick = (event: CalendarEvent, e: ReactMouseEvent<HTMLButtonElement>) => {
    // The click that terminates a drag must not also open the consumer's
    // detail UI — the user was rescheduling, not inspecting.
    if (isPointerClick(e) && drag.consumeClickSuppression()) return;
    onEventClick?.(event);
  };

  return (
    <div
      className={clsx(styles.scroll, drag.dragging && styles.scrollDragging)}
      onPointerDownCapture={draggable ? drag.resetClickSuppression : undefined}
    >
      {draggable && (
        <>
          {/* One description, referenced by every block. It has to live on the
              blocks rather than on the grid: `role="grid"` here is not
              focusable, and a description on a node that never receives focus
              is never announced. Repeating it per draggable is also what the
              library's dnd-kit surfaces do (`screenReaderInstructions.draggable`
              in `_internal/dragAnnouncements.ts`), so the shortcut list stays
              discoverable from wherever the user actually lands. */}
          <span id={dragHintId} className={styles.dragHint}>
            {t('calendar.dragInstructions')}
          </span>
          {/* Assertive, matching dnd-kit's live region: during a drag the newest
              slot supersedes the last rather than queueing behind it. `key` on
              the seq so an identical message (two refused drops in a row) is a
              fresh text node and still gets read. */}
          <span role="status" aria-live="assertive" className={styles.dragHint}>
            <span key={announcement?.seq ?? 0}>{dragMessage}</span>
          </span>
        </>
      )}
      <div
        role="grid"
        aria-readonly={draggable ? undefined : 'true'}
        aria-label={ariaLabel}
        className={styles.grid}
        style={{
          // Plain `1fr`, deliberately: `AllDayBand` is a sibling of the
          // horizontal scroller and lays its own columns out with `1fr`, so
          // giving the hour grid a minimum width would let the two disagree —
          // all-day chips would sit over the wrong columns and stay put while
          // the grid scrolled under them. Many resource lanes squash rather
          // than scroll until both can share one scroll container.
          gridTemplateColumns: `${HOUR_GUTTER_WIDTH}px repeat(${columnCount}, 1fr)`,
          gridTemplateRows: `auto repeat(${totalHours}, ${hourRowHeight}px)`,
        }}
      >
        {/* `display: contents` flattens this ARIA-row wrapper so each header
           is a direct grid child of `.grid` while still satisfying the
           WAI-ARIA grid contract (columnheader must live inside a row). */}
        <div role="row" className={styles.headerRow}>
          <div className={styles.cornerCell} aria-hidden="true" />
          {columnHeaders.map((header, i) => (
            <div
              key={`header-${columns[i].key}`}
              role="columnheader"
              className={clsx(
                styles.columnHeader,
                columns[i].isWeekend && styles.weekendHeader,
                !resourceGrid && isTodayColumn(i) && styles.todayHeader,
              )}
            >
              {header}
            </div>
          ))}
        </div>
        {hourLabels.map((label, h) => (
          <div
            key={`hour-${h}`}
            className={styles.hourLabel}
            style={{ gridColumn: 1, gridRow: h + 2 }}
          >
            {label}
          </div>
        ))}
        {columns.map((column, i) => {
          const blocks = blocksByDay.get(i) ?? [];
          const bands = backgroundByDay.get(i) ?? [];
          // Background clicks on the day column fire `onDayClick`; clicks on
          // a TimedEvent button stopPropagation in TimedEvent so they don't
          // also fire this handler.
          // A drag whose pointerup landed on the column background rather
          // than on the block still dispatches `click` here — without the
          // guard, finishing a reschedule would immediately open the
          // consumer's "create a booking at this slot" UI.
          const handleColumnClick = onDayClick
            ? (e: ReactMouseEvent<HTMLDivElement>) => {
                if (isPointerClick(e) && drag.consumeClickSuppression()) return;
                onDayClick(column.date);
              }
            : undefined;
          return (
            <div
              key={column.key}
              ref={(node) => {
                columnElements.current[i] = node;
              }}
              className={clsx(styles.dayColumn, column.isWeekend && styles.weekendColumn)}
              style={{ gridColumn: i + 2, gridRow: `2 / span ${totalHours}` }}
              onClick={handleColumnClick}
            >
              {/* Availability underlay: painted first so it sits beneath the
                  hour separators, the now-line and every event block, and
                  `pointer-events: none` keeps `onDayClick` reachable through
                  it. It takes no part in the event collision cascade. */}
              {bands.map((band) => (
                <div
                  key={band.key}
                  className={clsx(
                    styles.backgroundBand,
                    band.tone === 'available' ? styles.bandAvailable : styles.bandUnavailable,
                  )}
                  style={{
                    top: (band.startMinutes / 60) * hourRowHeight,
                    height: ((band.endMinutes - band.startMinutes) / 60) * hourRowHeight,
                  }}
                  aria-hidden="true"
                />
              ))}
              {Array.from({ length: totalHours }).map((_, h) => (
                <div
                  key={`sep-${h}`}
                  className={styles.hourSeparator}
                  style={{ top: h * hourRowHeight }}
                  aria-hidden="true"
                />
              ))}
              {nowVisible && isTodayColumn(i) && (
                <div
                  className={styles.nowLine}
                  style={{ top: (nowMinutesFromStart / 60) * hourRowHeight }}
                  aria-hidden="true"
                />
              )}
              {blocks.map((b) => (
                <TimedEvent
                  key={b.event.id}
                  block={b}
                  hourRowHeight={hourRowHeight}
                  view={view}
                  renderEvent={renderEvent}
                  onClick={handleEventClick}
                  preview={drag.preview?.eventId === b.event.id ? drag.preview : null}
                  canMove={drag.canMove}
                  canResize={drag.canResize}
                  onDragStart={handleDragStart}
                  onNudge={drag.nudge}
                  dragHintId={draggable ? dragHintId : undefined}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
