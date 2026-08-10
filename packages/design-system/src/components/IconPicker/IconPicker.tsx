import {
  forwardRef,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n/useTranslation';
import { Popover, type PopoverAlign, type PopoverSide } from '../Popover';
import styles from './IconPicker.module.scss';

/** Preferred side and alignment for the IconPicker popover. */
export type IconPickerPopoverPlacement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end';

const PLACEMENT_MAP: Record<
  IconPickerPopoverPlacement,
  { side: PopoverSide; align: PopoverAlign }
> = {
  top: { side: 'top', align: 'center' },
  'top-start': { side: 'top', align: 'start' },
  'top-end': { side: 'top', align: 'end' },
  bottom: { side: 'bottom', align: 'center' },
  'bottom-start': { side: 'bottom', align: 'start' },
  'bottom-end': { side: 'bottom', align: 'end' },
};

const COLUMNS = 4;

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
  popoverPlacement?: IconPickerPopoverPlacement;
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
  const [activeIndex, setActiveIndex] = useState(0);
  const cellRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const selectedLabelId = `icon-picker-selected-${useId()}`;
  const selected = options.find((option) => option.value === value);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const optionValues = JSON.stringify(options.map((option) => option.value));
  const unavailable = disabled || options.length === 0;
  const purpose = ariaLabel ?? t('iconPicker.triggerLabel');
  const triggerLabel = selected ? `${purpose}: ${selected.label}` : purpose;
  const labelledBy = ariaLabelledBy
    ? selected
      ? `${ariaLabelledBy} ${selectedLabelId}`
      : ariaLabelledBy
    : undefined;
  const { side, align } = PLACEMENT_MAP[popoverPlacement];
  const purposeLabelProps = ariaLabelledBy
    ? { 'aria-labelledby': ariaLabelledBy }
    : { 'aria-label': purpose };

  const focusCell = (index: number) => {
    setActiveIndex(index);
    cellRefs.current[index]?.focus();
  };

  useLayoutEffect(() => {
    if (!open) return;
    if (options.length === 0) {
      setOpen(false);
      return;
    }
    const nextIndex =
      selectedIndex >= 0 ? selectedIndex : Math.min(activeIndex, options.length - 1);
    setActiveIndex(nextIndex);
    queueMicrotask(() => {
      if (cellRefs.current[nextIndex]?.isConnected) {
        cellRefs.current[nextIndex]?.focus({ preventScroll: true });
      }
    });
  }, [open, selectedIndex, optionValues]);

  const commit = (option: IconPickerOption) => {
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  const handleOpenChange = (next: boolean) => {
    if (unavailable) return;
    if (next) {
      setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
    setOpen(next);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const current = Number(event.currentTarget.dataset.iconIndex);
    if (!Number.isInteger(current) || !options[current]) return;

    const lastIndex = options.length - 1;
    const rowStart = current - (current % COLUMNS);
    let nextIndex: number | undefined;

    switch (event.key) {
      case 'ArrowLeft':
        nextIndex = Math.max(0, current - 1);
        break;
      case 'ArrowRight':
        nextIndex = Math.min(lastIndex, current + 1);
        break;
      case 'ArrowUp':
        nextIndex = Math.max(0, current - COLUMNS);
        break;
      case 'ArrowDown':
        nextIndex = Math.min(lastIndex, current + COLUMNS);
        break;
      case 'Home':
        nextIndex = rowStart;
        break;
      case 'End':
        nextIndex = Math.min(rowStart + COLUMNS - 1, lastIndex);
        break;
      case 'Enter':
      case ' ':
      case 'Spacebar':
      case 'Space':
        event.preventDefault();
        commit(options[current]);
        return;
      default:
        return;
    }

    event.preventDefault();
    focusCell(nextIndex);
  };

  return (
    // {...rest} last so consumers can set native root attributes.
    <div ref={ref} className={clsx(styles.root, className)} {...rest}>
      {ariaLabelledBy && selected && (
        <span id={selectedLabelId} className={styles.visuallyHidden}>
          {selected.label}
        </span>
      )}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger>
          <button
            ref={triggerRef}
            type="button"
            className={styles.trigger}
            disabled={unavailable}
            aria-label={labelledBy ? undefined : triggerLabel}
            aria-labelledby={labelledBy}
            aria-describedby={ariaDescribedBy}
          >
            {selected && (
              <span className={styles.glyph} aria-hidden="true">
                {selected.icon}
              </span>
            )}
          </button>
        </Popover.Trigger>
        <Popover.Content side={side} align={align} {...purposeLabelProps}>
          <div className={styles.grid} role="radiogroup" {...purposeLabelProps}>
            {options.map((option, index) => (
              <button
                key={option.value}
                ref={(element) => {
                  cellRefs.current[index] = element;
                }}
                type="button"
                role="radio"
                aria-label={option.label}
                aria-checked={option.value === value}
                tabIndex={index === activeIndex ? 0 : -1}
                data-icon-index={index}
                className={clsx(styles.cell, option.value === value && styles.selected)}
                onClick={() => commit(option)}
                onKeyDown={handleKeyDown}
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
