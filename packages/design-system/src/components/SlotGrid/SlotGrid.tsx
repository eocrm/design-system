import { forwardRef, useId, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Text } from '../Text';
import { Title, type TitleOrder } from '../Title';
import { useTranslation } from '../../i18n/useTranslation';
import styles from './SlotGrid.module.scss';

/** One selectable time. */
export interface SlotGridSlot {
  /** Stable id passed to `onChange` and matched against `value`. */
  key: string;
  /** Visible text and accessible name, already formatted in the business's timezone (e.g. "9:30"). */
  label: string;
}

/** A part of the day ("Morning", "Afternoon") and its slots. */
export interface SlotGridGroup {
  /** Visible heading; also names the group for assistive tech. */
  label: string;
  /** Slots in display order. A group with none is not rendered. */
  slots: SlotGridSlot[];
}

export interface SlotGridProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Groups in display order. */
  groups: SlotGridGroup[];
  /** Selected slot `key`, or `null`. A key not in `groups` checks nothing. */
  value: string | null;
  /** Called with the chosen slot's `key`. Controlled — update `value` yourself. */
  onChange: (key: string) => void;
  /** Shown when no group has any slot. Default: the localized "No available times". */
  empty?: ReactNode;
  /** Heading level of each group label. Default `3`. */
  titleOrder?: TitleOrder;
  /** Radio group `name` (also submitted with a form). Default: a generated id. */
  name?: string;
}

/**
 * Selectable time-slot tiles grouped by part of the day, with an empty state.
 * Every slot is a native radio sharing one `name`, so the whole grid is one
 * Tab stop with a single exclusive choice across groups; arrow keys move and
 * select (linearly, in reading order). Each group is a `<fieldset>` named by
 * its `<legend>` heading. 6 columns, 3 when the grid's own width is ≤ 48rem.
 *
 * @example
 * <SlotGrid
 *   groups={[
 *     { label: 'Morning', slots: [{ key: '2026-10-07T09:00', label: '9:00' }] },
 *     { label: 'Afternoon', slots: [{ key: '2026-10-07T14:00', label: '14:00' }] },
 *   ]}
 *   value={slot}
 *   onChange={setSlot}
 * />
 *
 * @example
 * // Custom empty state
 * <SlotGrid groups={[]} value={null} onChange={setSlot} empty={<EmptyState title="Fully booked" />} />
 *
 * @example
 * // Booking time step: DateStrip picks the day, SlotGrid the time.
 * <Stack gap="lg">
 *   <DateStrip days={week} value={day} onChange={setDay} onPrevious={prev} onNext={next} />
 *   <SlotGrid groups={slotsFor(day)} value={slot} onChange={setSlot} />
 * </Stack>
 *
 * @remarks When NOT to use
 * - A free-form time → `<TimeField>`.
 * - Two to five mutually exclusive options → `<ButtonGroup value>` or `<RadioGroup>`.
 *
 * @remarks Anti-patterns
 * - ❌ Filtering out full slots by rendering them disabled — pass only the
 *   bookable ones; there is no per-slot `disabled`.
 * - ❌ Reusing a `key` across groups — the choice is exclusive across the whole grid.
 * - ❌ Wrapping in your own `role="radiogroup"` — the native radios already
 *   form the group.
 */
export const SlotGrid = forwardRef<HTMLDivElement, SlotGridProps>(function SlotGrid(
  { groups, value, onChange, empty, titleOrder = 3, name, className, ...props },
  ref,
) {
  const t = useTranslation();
  const generatedName = useId();
  const groupName = name ?? generatedName;
  const visible = groups.filter((g) => g.slots.length > 0);

  return (
    <div ref={ref} className={clsx(styles.root, className)} {...props}>
      {visible.length === 0
        ? (empty ?? <Text tone="muted">{t('slotGrid.empty')}</Text>)
        : visible.map((group) => (
            <fieldset key={group.label} className={styles.group}>
              <legend className={styles.legend}>
                <Title order={titleOrder} size="sm">
                  {group.label}
                </Title>
              </legend>
              <div className={styles.tiles}>
                {group.slots.map((slot) => (
                  <label key={slot.key} className={styles.tile}>
                    <input
                      type="radio"
                      className={styles.input}
                      name={groupName}
                      value={slot.key}
                      checked={value === slot.key}
                      onChange={() => onChange(slot.key)}
                    />
                    {slot.label}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
    </div>
  );
});
