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
  /** Marks the group `aria-invalid` (the radios themselves do not support it). Field / SettingRow inject it. @default false */
  invalid?: boolean;
  /**
   * Native `required` on the radios (the group then fails form validation
   * until one is chosen). Field / SettingRow inject it; it used to land on the
   * root as a stray attribute (#568).
   */
  required?: boolean;
}

/**
 * Selectable time-slot tiles grouped by part of the day, with an empty state.
 * @see docs/components/SlotGrid.md
 */
export const SlotGrid = forwardRef<HTMLDivElement, SlotGridProps>(function SlotGrid(
  {
    groups,
    value,
    onChange,
    empty,
    titleOrder = 3,
    name,
    invalid = false,
    required = false,
    className,
    ...props
  },
  ref,
) {
  const t = useTranslation();
  const generatedName = useId();
  const groupName = name ?? generatedName;
  const visible = groups.filter((g) => g.slots.length > 0);

  return (
    // role="group" so a wrapping Field / SettingRow's injected aria-labelledby
    // / aria-describedby / aria-invalid actually apply — on a generic div
    // they are ignored and the radios lost the row label and error (#568).
    <div
      ref={ref}
      role="group"
      aria-invalid={invalid || undefined}
      className={clsx(styles.root, className)}
      {...props}
    >
      {visible.length === 0
        ? (empty ?? <Text tone="muted">{t('slotGrid.empty')}</Text>)
        : visible.map((group, i) => (
            <fieldset key={`${i}-${group.label}`} className={styles.group}>
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
                      required={required}
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
