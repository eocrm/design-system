import { forwardRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n/useTranslation';
import { Popover, type PopoverAlign, type PopoverSide } from '../Popover';
import styles from './IconPicker.module.scss';

const COLUMNS = 4;

type PopoverPlacement = 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end';

const PLACEMENT_MAP: Record<PopoverPlacement, { side: PopoverSide; align: PopoverAlign }> = {
  top: { side: 'top', align: 'center' },
  'top-start': { side: 'top', align: 'start' },
  'top-end': { side: 'top', align: 'end' },
  bottom: { side: 'bottom', align: 'center' },
  'bottom-start': { side: 'bottom', align: 'start' },
  'bottom-end': { side: 'bottom', align: 'end' },
};

/** A selectable icon with the stable value and accessible label that represent it. */
export interface IconPickerOption {
  /** Stable value returned from `onChange` when this icon is selected. */
  value: string;
  /** Human-readable name announced for this icon's radio control. */
  label: string;
  /** The icon glyph to render in the trigger and option cell. */
  icon: ReactNode;
}

/** Props for the controlled `<IconPicker>` popover and its root wrapper. */
export interface IconPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Currently selected option value. Controlled — required. */
  value: string;
  /** All icons available in the single-select grid. An empty list disables the trigger. */
  options: IconPickerOption[];
  /** Fires with the selected option value, then closes the popover. */
  onChange: (value: string) => void;
  /** Disables the trigger and prevents the popover from opening. Defaults to `false`. */
  disabled?: boolean;
  /** Preferred popover placement. Defaults to `'bottom-start'`. */
  popoverPlacement?: PopoverPlacement;
  /**
   * Accessible purpose for the trigger. Defaults to the localized
   * `iconPicker.triggerLabel` value and is suffixed with the selected icon name.
   */
  'aria-label'?: string;
  /** Id(s) of element(s) that label the trigger button. */
  'aria-labelledby'?: string;
  /** Id(s) of element(s) that describe the trigger button. */
  'aria-describedby'?: string;
}

/**
 * Controlled single-select icon picker with a compact Popover radio grid.
 *
 * @example
 * const [icon, setIcon] = useState('flame');
 * <IconPicker value={icon} options={iconOptions} onChange={setIcon} />
 *
 * @example
 * <IconPicker
 *   value={icon}
 *   options={iconOptions}
 *   onChange={setIcon}
 *   aria-label="Status icon"
 * />
 *
 * @example
 * <Cluster gap="sm" align="center">
 *   <IconPicker value={icon} options={iconOptions} onChange={setIcon} />
 *   <Text>{icon}</Text>
 * </Cluster>
 *
 * @remarks When NOT to use
 * - For a small, always-visible set of mutually exclusive text choices; use
 *   `<RadioGroup>` instead.
 * - For actions rather than a persistent value; use `<DropdownMenu>`.
 * - For an uncontrolled selection; IconPicker is controlled-only.
 */
export const IconPicker = forwardRef<HTMLDivElement, IconPickerProps>(function IconPicker(
  {
    value,
    options,
    onChange,
    disabled = false,
    popoverPlacement = 'bottom-start',
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    className,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const unavailable = disabled || options.length === 0;
  const purpose = ariaLabel ?? t('iconPicker.triggerLabel');
  const triggerLabel = selected ? `${purpose}: ${selected.label}` : purpose;
  const { side, align } = PLACEMENT_MAP[popoverPlacement];

  const commit = (option: IconPickerOption) => {
    onChange(option.value);
    setOpen(false);
  };

  return (
    // {...rest} last so consumers can set native root attributes.
    <div ref={ref} className={clsx(styles.root, className)} {...rest}>
      <Popover open={open} onOpenChange={(next) => !unavailable && setOpen(next)}>
        <Popover.Trigger>
          <button
            type="button"
            className={styles.trigger}
            disabled={unavailable}
            aria-label={ariaLabelledBy ? undefined : triggerLabel}
            aria-labelledby={ariaLabelledBy}
            aria-describedby={ariaDescribedBy}
          >
            {selected && (
              <span className={styles.glyph} aria-hidden="true">
                {selected.icon}
              </span>
            )}
          </button>
        </Popover.Trigger>
        <Popover.Content side={side} align={align}>
          <div className={styles.grid} role="radiogroup">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-label={option.label}
                aria-checked={option.value === value}
                className={clsx(styles.cell, option.value === value && styles.selected)}
                onClick={() => commit(option)}
              >
                <span className={styles.glyph} aria-hidden="true">
                  {option.icon}
                </span>
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover>
    </div>
  );
});
