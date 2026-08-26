import { type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import clsx from 'clsx';
import { useLocale } from '../../i18n/useLocale';
import { formatTime } from '../../calendar';
import { Tooltip } from '../Tooltip';
import { resolveEventColor } from './eventColor';
import { formatEventDuration } from './utils';
import type { DragMode, DragPreview } from './useEventDrag';
import type { CalendarEvent, CalendarView, RenderEvent, TimedEventBlock } from './types';
import styles from './TimedEvent.module.scss';

export interface TimedEventProps {
  /** Placed block produced by `layoutEventsForHourGrid`. */
  block: TimedEventBlock;
  /** Pixel height per hour row (matches the hour-grid scaffold). */
  hourRowHeight: number;
  /** Which view is rendering this chip (`'week'` or `'day'`). Passed to `renderEvent` for branching. */
  view?: CalendarView;
  /** Optional custom inner content. When set, replaces the default time + title spans. */
  renderEvent?: RenderEvent;
  /** Fires when the chip is clicked; receives the `CalendarEvent` and the raw click. */
  onClick?: (event: CalendarEvent, e: MouseEvent<HTMLButtonElement>) => void;
  /** The live drag placement for THIS block, when it is the one being dragged. */
  preview?: DragPreview | null;
  /** Whether the grid accepts move gestures (`onEventMove` is wired). */
  canMove?: boolean;
  /** Whether the grid accepts resize gestures (`onEventResize` is wired). */
  canResize?: boolean;
  /** Starts a pointer drag. Called from `pointerdown` on the block or its resize handle. */
  onDragStart?: (block: TimedEventBlock, mode: DragMode, e: PointerEvent) => void;
  /** Keyboard equivalent of a drag — whole snap steps, and whole columns for a move. */
  onNudge?: (
    block: TimedEventBlock,
    delta: { mode: DragMode; steps: number; columns?: number },
  ) => void;
  /** `id` of the visually-hidden element describing the keyboard drag shortcuts. */
  dragHintId?: string;
}

/**
 * Internal: a single timed-event block, absolutely positioned inside an
 * hour-grid day column. Tone-styled, wrapped in a Tooltip so the full
 * "time range + title" is reachable even when the chip is short.
 *
 * @remarks
 * **When NOT to use:** Do not render `TimedEvent` directly in application code —
 * it is an internal building block consumed by `HourGrid`. Use `Calendar` (or
 * `WeekView`/`DayView`) from the design system and pass events via the `events` prop.
 */
const MIN_BLOCK_HEIGHT_PX = 20;
/** Percent of the day column each cascade lane is offset to the right. */
const LANE_OFFSET_PERCENT = 10;
/** Z-index used for the hovered / focused block — sits above any lane. */
const HOVER_Z_INDEX = 100;

export function TimedEvent({
  block,
  hourRowHeight,
  view = 'week',
  renderEvent,
  onClick,
  preview = null,
  canMove = false,
  canResize = false,
  onDragStart,
  onNudge,
  dragHintId,
}: TimedEventProps) {
  const locale = useLocale();
  const {
    toneClass,
    hasStripe,
    style: colorStyle,
  } = resolveEventColor(block.event, '--calendar-timed-event-fg-');
  const isDragging = preview !== null;

  // While a drag is in flight the block renders at the proposed placement,
  // not at the one its `events` entry describes — that only changes if and
  // when the consumer commits the drop.
  const startMinutes = preview ? preview.startMinutes : block.startMinutes;
  const endMinutes = preview ? preview.endMinutes : block.endMinutes;

  const top = (startMinutes / 60) * hourRowHeight;
  const rawHeight = ((endMinutes - startMinutes) / 60) * hourRowHeight;
  const height = Math.max(rawHeight, MIN_BLOCK_HEIGHT_PX);
  // Google-Calendar-style cascade: each lane shifts right by a small,
  // constant step but every block still extends to the column's right edge.
  // Higher lanes overlay earlier ones via z-index, so later events
  // partially cover the one beneath them while keeping the predecessor's
  // left edge visible. On hover, the block lifts to full width and on top
  // — see `:hover` rules in TimedEvent.module.scss.
  //
  // A dragging block leaves the cascade entirely: full width, top of the
  // stack, so it reads as lifted off the grid.
  const leftPercent = isDragging ? 0 : LANE_OFFSET_PERCENT * block.lane;
  const zIndex = isDragging ? HOVER_Z_INDEX : block.lane + 1;

  // While dragging, the time label must describe the PROPOSED placement, not
  // the one the event still has. For a snap-to-15 gesture the label is the
  // feedback — a block that visibly slides to 11:00 while still reading
  // "9:00 – 10:00" is telling the user the wrong thing at the moment they
  // decide whether to release.
  const displayStart = preview ? preview.startsAt : block.event.startsAt;
  const displayEnd = preview ? preview.endsAt : block.event.endsAt;

  const startLabel = formatTime(displayStart, locale);
  const endLabel = displayEnd ? formatTime(displayEnd, locale) : null;

  // For zero-duration events the start and end times are the same (or there's
  // no endsAt) — collapse to a single time label rather than "9:30 AM – 9:30 AM".
  const isZeroDuration = !endLabel || endLabel === startLabel;
  const timeLabel = isZeroDuration ? startLabel : `${startLabel} – ${endLabel}`;

  const duration = formatEventDuration(displayStart, displayEnd);
  const tooltipContent = (
    <span className={styles.tooltipBody}>
      <span className={styles.tooltipTime}>
        {timeLabel} · {duration}
      </span>
      <span className={styles.tooltipTitle}>{block.event.title}</span>
    </span>
  );

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onClick?.(block.event, e);
  };

  const handlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (!canMove) return;
    onDragStart?.(block, 'move', e);
  };

  const handleHandlePointerDown = (e: PointerEvent<HTMLSpanElement>) => {
    if (!canResize) return;
    onDragStart?.(block, 'resize', e);
  };

  // Keyboard equivalent of the pointer gesture, so rescheduling isn't
  // mouse-only. Alt is the modifier throughout: bare arrows stay free for
  // the browser's own scrolling, and Alt+Arrow is not claimed by the grid.
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!e.altKey || !onNudge) return;
    if (e.ctrlKey || e.metaKey) return;
    const resize = e.shiftKey;
    if (resize && !canResize) return;
    if (!resize && !canMove) return;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        onNudge(block, { mode: resize ? 'resize' : 'move', steps: -1 });
        break;
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        onNudge(block, { mode: resize ? 'resize' : 'move', steps: 1 });
        break;
      case 'ArrowLeft':
        // Column changes are a move concept only — there is nothing to
        // resize sideways.
        if (resize) return;
        e.preventDefault();
        e.stopPropagation();
        onNudge(block, { mode: 'move', steps: 0, columns: -1 });
        break;
      case 'ArrowRight':
        if (resize) return;
        e.preventDefault();
        e.stopPropagation();
        onNudge(block, { mode: 'move', steps: 0, columns: 1 });
        break;
      default:
        break;
    }
  };

  // Short events use a single-line row layout (time + title side-by-side)
  // so the start time stays visible even on min-height blocks. Tall events
  // stack time above title in a column for more breathing room.
  const isShort = height < MIN_BLOCK_HEIGHT_PX + 10;

  const customContent = renderEvent
    ? renderEvent(block.event, {
        view,
        asAllDay: false,
        timeLabel,
        duration,
      })
    : null;

  const draggable = canMove || canResize;

  return (
    <Tooltip content={tooltipContent}>
      <button
        type="button"
        className={clsx(
          styles.block,
          toneClass && styles[toneClass],
          colorStyle && styles.colored,
          hasStripe && styles.striped,
          isShort && styles.short,
          canMove && styles.movable,
          isDragging && styles.dragging,
          preview?.invalid && styles.invalidDrop,
        )}
        style={
          {
            ...colorStyle,
            top,
            height,
            '--cal-block-left': `${leftPercent}%`,
            '--cal-block-width': `${100 - leftPercent}%`,
            '--cal-block-z': zIndex,
            '--cal-block-z-hover': HOVER_Z_INDEX,
          } as CSSProperties
        }
        // `aria-grabbed` is deprecated in ARIA 1.1 and unsupported in practice;
        // the drag capability is announced through the description instead.
        aria-describedby={draggable ? dragHintId : undefined}
        data-dragging={isDragging || undefined}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onKeyDown={draggable ? handleKeyDown : undefined}
      >
        {customContent !== null ? (
          customContent
        ) : (
          <>
            <span className={styles.time}>{timeLabel}</span>
            <span className={styles.title}>{block.event.title}</span>
          </>
        )}
        {canResize && (
          // A span, not a nested <button> (illegal inside the block button).
          // Keyboard users reach the same capability through Alt+Shift+Arrow
          // on the block itself, so the handle is purely a pointer affordance.
          <span
            role="presentation"
            aria-hidden="true"
            className={styles.resizeHandle}
            onPointerDown={handleHandlePointerDown}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </button>
    </Tooltip>
  );
}
