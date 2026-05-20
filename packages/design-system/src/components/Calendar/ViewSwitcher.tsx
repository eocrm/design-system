import { Tabs } from '../Tabs';
import type { CalendarView } from './types';
import styles from './ViewSwitcher.module.scss';

export interface ViewSwitcherProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  monthLabel: string;
  weekLabel: string;
  dayLabel: string;
}

const ITEMS = (monthLabel: string, weekLabel: string, dayLabel: string) => [
  { id: 'month', label: monthLabel },
  { id: 'week', label: weekLabel },
  { id: 'day', label: dayLabel },
];

/**
 * Internal: segmented control for switching between month / week / day views.
 * Uses the design system's `<Tabs>` for ARIA + keyboard navigation.
 *
 * @remarks
 * **When NOT to use:** Do not render `ViewSwitcher` directly. It is composed
 * by the `Calendar` shell. Use `<Calendar view ... onViewChange ...>`.
 */
export function ViewSwitcher({
  view,
  onViewChange,
  monthLabel,
  weekLabel,
  dayLabel,
}: ViewSwitcherProps) {
  return (
    <div className={styles.switcher}>
      <Tabs
        activeId={view}
        onChange={(id) => onViewChange(id as CalendarView)}
        items={ITEMS(monthLabel, weekLabel, dayLabel)}
      />
    </div>
  );
}
