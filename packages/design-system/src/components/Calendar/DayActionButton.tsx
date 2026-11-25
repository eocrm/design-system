import { Plus } from 'lucide-react';
import { Button } from '../Button';
import type { CalendarDayAction, CalendarView } from './types';

export interface DayActionButtonProps {
  /** The consumer's per-day action (label, handler, optional icon). */
  action: CalendarDayAction;
  /** The day this button acts on. */
  date: Date;
  /** The view rendering the button; forwarded to `action.onActivate`. */
  view: CalendarView;
  /** False renders `tabIndex={-1}` (month view: only the roving cell's action is a tab stop). Default true. */
  tabbable?: boolean;
  /** Per-view visibility/placement class. */
  className?: string;
}

/**
 * Internal: the icon-only per-day action button shared by every Calendar view.
 * Click and keydown stop propagation so the surrounding cell's `onDayClick`
 * (click, Enter/Space) never also fires.
 */
export function DayActionButton({
  action,
  date,
  view,
  tabbable = true,
  className,
}: DayActionButtonProps) {
  const label = action.label(date);
  return (
    <Button
      iconOnly
      size="xs"
      variant="ghost"
      className={className}
      aria-label={label}
      title={label}
      tabIndex={tabbable ? undefined : -1}
      onClick={(e) => {
        e.stopPropagation();
        action.onActivate(date, { view });
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      {action.icon ?? <Plus aria-hidden="true" />}
    </Button>
  );
}
