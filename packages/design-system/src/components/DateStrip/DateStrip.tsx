import { forwardRef, useEffect, useId, useRef, useState, type FieldsetHTMLAttributes } from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../Button';
import { Cluster } from '../Cluster';
import { Title, type TitleOrder } from '../Title';
import { LiveRegion } from '../LiveRegion';
import { VisuallyHidden } from '../VisuallyHidden';
import { useTranslation } from '../../i18n/useTranslation';
import { useLocale } from '../../i18n/useLocale';
import { formatIsoDay, formatIsoRange } from '../_internal/isoDay';
import styles from './DateStrip.module.scss';

/** One day tile. */
export interface DateStripDay {
  /** Calendar day as `'YYYY-MM-DD'`. Formatted in UTC, so the host timezone never shifts it. */
  date: string;
  /** Free times that day. `0` renders "No times" and disables the tile. */
  free: number;
}

export interface DateStripProps extends Omit<
  FieldsetHTMLAttributes<HTMLFieldSetElement>,
  'onChange'
> {
  /** The days to show, in order — usually one week (7). The month heading is derived from the first and last. */
  days: DateStripDay[];
  /** Selected day (`'YYYY-MM-DD'`), or `null`. A value not in `days` checks nothing. */
  value: string | null;
  /** Called with the chosen day's `'YYYY-MM-DD'`. Controlled — update `value` yourself. */
  onChange: (date: string) => void;
  /** Previous-week button handler. Replace `days` with the earlier week. */
  onPrevious: () => void;
  /** Next-week button handler. Replace `days` with the later week. */
  onNext: () => void;
  /** `false` disables the previous-week button (e.g. the current week). Default `true`. */
  canPrevious?: boolean;
  /** `false` disables the next-week button (end of the booking window). Default `true`. */
  canNext?: boolean;
  /** Heading level of the month label. Default `2`. */
  titleOrder?: TitleOrder;
  /** Radio group `name` (also submitted with a form). Default: a generated id. */
  name?: string;
}

/**
 * One week of selectable day tiles under a month heading with previous/next
 * week buttons. Each tile shows the short weekday, the day number and how
 * many free times the day has; a day with none reads "No times" and is
 * disabled. Built on native radios sharing one `name`: the strip is one Tab
 * stop, arrow keys move and select, disabled days are skipped.
 *
 * @example
 * const [day, setDay] = useState<string | null>(null);
 * <DateStrip
 *   days={week} // [{ date: '2026-10-05', free: 3 }, …]
 *   value={day}
 *   onChange={setDay}
 *   onPrevious={() => setWeekStart(addDays(weekStart, -7))}
 *   onNext={() => setWeekStart(addDays(weekStart, 7))}
 *   canPrevious={weekStart > today}
 * />
 *
 * @example
 * // Booking time step: DateStrip picks the day, SlotGrid the time.
 * <Stack gap="lg">
 *   <DateStrip days={week} value={day} onChange={setDay} onPrevious={prev} onNext={next} />
 *   <SlotGrid groups={slotsFor(day)} value={slot} onChange={setSlot} />
 * </Stack>
 *
 * @remarks When NOT to use
 * - Picking any date across months → `<InlineDatePicker>` / `<DatePicker>`.
 * - Scheduling / showing events → `<Calendar>`.
 * - Picking a time of day → `<SlotGrid>` (offered slots) or `<TimeField>` (free-form).
 *
 * @remarks Anti-patterns
 * - ❌ Passing `Date` objects or locale-formatted strings in `date` — it is an
 *   ISO `'YYYY-MM-DD'` calendar day; the strip formats it.
 * - ❌ Building `date` from `toISOString()` of a local-midnight `Date` — that
 *   shifts a day west of UTC. Produce the business-timezone calendar day.
 * - ❌ An `aria-label` on the strip — the month heading names the group.
 * - ❌ Hiding days with no times instead of passing `free: 0` — the week
 *   loses its shape and the user can't see the day is full.
 * - ❌ In an intrinsic-width context (`Split`'s default `auto` aside track, a
 *   `Cluster` item, `width: max-content`) it renders at width 0 —
 *   `container-type: inline-size` zeroes its intrinsic-width contribution;
 *   give the parent a concrete width (e.g. `asideWidth` on a Split). It is
 *   also the containing block for absolutely-positioned descendants (layout
 *   containment).
 */
export const DateStrip = forwardRef<HTMLFieldSetElement, DateStripProps>(function DateStrip(
  {
    days,
    value,
    onChange,
    onPrevious,
    onNext,
    canPrevious = true,
    canNext = true,
    titleOrder = 2,
    name,
    className,
    ...props
  },
  ref,
) {
  const t = useTranslation();
  const locale = useLocale();
  const titleId = useId();
  const generatedName = useId();
  const groupName = name ?? generatedName;

  const first = days[0]?.date;
  const last = days[days.length - 1]?.date;
  const monthLabel =
    first && last ? formatIsoRange(first, last, locale, { month: 'long', year: 'numeric' }) : '';

  // Rule 10: activating Next keeps focus on the button while the week under
  // it changes — announce the new range. Computed in an effect keyed on the
  // first day, so it is silent on mount and on same-week refetches.
  const [announcement, setAnnouncement] = useState('');
  const announcedFirst = useRef(first);
  useEffect(() => {
    if (first === announcedFirst.current) return;
    announcedFirst.current = first;
    setAnnouncement(
      first && last
        ? t('dateStrip.range', {
            range: formatIsoRange(first, last, locale, { month: 'long', day: 'numeric' }),
          })
        : '',
    );
  }, [first, last, locale, t]);

  return (
    // {...props} first so the month heading always names the group (Pattern B).
    <fieldset
      {...props}
      ref={ref}
      className={clsx(styles.root, className)}
      aria-label={undefined}
      aria-labelledby={titleId}
    >
      <div className={styles.header}>
        <Title id={titleId} order={titleOrder} size="md">
          {monthLabel}
        </Title>
        <Cluster gap="xs">
          <Button
            variant="secondary"
            size="lg"
            iconOnly
            aria-label={t('dateStrip.previousWeek')}
            disabled={!canPrevious}
            onClick={onPrevious}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            size="lg"
            iconOnly
            aria-label={t('dateStrip.nextWeek')}
            disabled={!canNext}
            onClick={onNext}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </Button>
        </Cluster>
      </div>
      <div className={styles.tiles}>
        {days.map((day) => {
          const availability =
            day.free > 0 ? t('dateStrip.free', { count: day.free }) : t('dateStrip.noTimes');
          return (
            <label key={day.date} className={styles.tile}>
              <input
                type="radio"
                className={styles.input}
                name={groupName}
                value={day.date}
                checked={value === day.date}
                disabled={!(day.free > 0)}
                onChange={() => onChange(day.date)}
              />
              {/* Visual body hidden from AT: its spans would concatenate into
                  "Wed79 free". The name is the full sentence below. */}
              <span className={styles.body} aria-hidden="true">
                <span className={styles.dow}>
                  {formatIsoDay(day.date, locale, { weekday: 'short' })}
                </span>
                <span className={styles.num}>
                  {formatIsoDay(day.date, locale, { day: 'numeric' })}
                </span>
                <span className={styles.count}>{availability}</span>
              </span>
              <VisuallyHidden>
                {t('dateStrip.day', {
                  date: formatIsoDay(day.date, locale, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  }),
                  availability,
                })}
              </VisuallyHidden>
            </label>
          );
        })}
      </div>
      <LiveRegion>{announcement}</LiveRegion>
    </fieldset>
  );
});
