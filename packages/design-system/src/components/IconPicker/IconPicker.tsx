import {
  forwardRef,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../i18n/useTranslation';
import { mergeRefs } from '../_internal/refs';
import { Popover, type PopoverAlign, type PopoverSide } from '../Popover';
import styles from './IconPicker.module.scss';

/**
 * Preferred side and alignment for the IconPicker popover.
 *
 * - `'top'` — above the trigger, centered.
 * - `'top-start'` — above the trigger, aligned to its start edge.
 * - `'top-end'` — above the trigger, aligned to its end edge.
 * - `'bottom'` — below the trigger, centered.
 * - `'bottom-start'` — below the trigger, aligned to its start edge.
 * - `'bottom-end'` — below the trigger, aligned to its end edge.
 */
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

const ICON_PICKER_TOKEN_NAMES = [
  '--icon-picker-trigger-size',
  '--icon-picker-cell-size',
  '--icon-picker-grid-gap',
  '--icon-picker-grid-padding',
  '--icon-picker-radius',
  '--icon-picker-border',
  '--icon-picker-border-width',
  '--icon-picker-bg',
  '--icon-picker-fg',
  '--icon-picker-hover-bg',
  '--icon-picker-focus-ring',
  '--icon-picker-focus-ring-width',
  '--icon-picker-selected-border',
  '--icon-picker-selected-border-width',
  '--icon-picker-selected-ring',
  '--icon-picker-selected-ring-width',
  '--icon-picker-glyph-size',
  '--icon-picker-disabled-bg',
  '--icon-picker-disabled-border',
  '--icon-picker-disabled-fg',
  '--icon-picker-cursor',
  '--icon-picker-cursor-disabled',
] as const;

type IconPickerTokenStyle = CSSProperties & {
  [token: `--icon-picker-${string}`]: string | number | undefined;
};

function readIconPickerTokenStyle(
  element: HTMLDivElement | null,
): IconPickerTokenStyle | undefined {
  if (!element || typeof window === 'undefined') return undefined;
  const computedStyle = window.getComputedStyle(element);
  const tokenStyle = {} as IconPickerTokenStyle;
  let hasToken = false;

  for (const tokenName of ICON_PICKER_TOKEN_NAMES) {
    const tokenValue = computedStyle.getPropertyValue(tokenName).trim();
    if (!tokenValue) continue;
    tokenStyle[tokenName] = tokenValue;
    hasToken = true;
  }

  return hasToken ? tokenStyle : undefined;
}

/** A selectable icon with the stable value, readable label, and decorative glyph it represents. */
export interface IconPickerOption {
  /** Stable, unique value returned from `onChange` when this icon is selected. */
  value: string;
  /** Human-readable name announced for this icon's radio control; do not use an icon code. */
  label: string;
  /**
   * Decorative glyph rendered in the trigger and option cell. It is hidden from assistive
   * technology and must not contain interactive or focusable descendants.
   */
  icon: ReactNode;
}

/** Props for the controlled `<IconPicker>` popover and its root wrapper. */
export interface IconPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Currently selected option value. Controlled — required. */
  value: string;
  /**
   * Consumer-curated icons rendered in the supplied order. Values must be stable and unique.
   * An empty list disables the trigger.
   */
  options: IconPickerOption[];
  /**
   * Fires exactly once with the chosen option value, including when it equals the controlled
   * `value`, then closes the popover.
   */
  onChange: (value: string) => void;
  /**
   * Disables the trigger, prevents opening and selection, and closes an open picker.
   * @default false
   */
  disabled?: boolean;
  /** Marks the focusable trigger invalid for Field composition. @default false */
  invalid?: boolean;
  /** Marks the focusable trigger required for Field composition. @default false */
  required?: boolean;
  /**
   * Preferred popover placement. Floating UI may flip it to remain visible.
   *
   * - `'top'` — above, centered.
   * - `'top-start'` — above, start-aligned.
   * - `'top-end'` — above, end-aligned.
   * - `'bottom'` — below, centered.
   * - `'bottom-start'` — below, start-aligned.
   * - `'bottom-end'` — below, end-aligned.
   * @default 'bottom-start'
   */
  popoverPlacement?: IconPickerPopoverPlacement;
  /**
   * Accessible picker purpose. It names the trigger with the selected icon appended and names
   * the dialog plus radiogroup without that suffix. Defaults to the localized
   * `iconPicker.triggerLabel` value.
   */
  'aria-label'?: string;
  /**
   * Id(s) of external elements that provide the picker purpose. They name the dialog and
   * radiogroup directly; the trigger also appends an internal selected-icon label when matched.
   */
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
 * <Field label="Status icon">
 *   <IconPicker value={icon} options={iconOptions} onChange={setIcon} />
 * </Field>
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
 *
 * @remarks Anti-patterns
 * - Do not pass duplicate option values; values are React keys and stable selection identities.
 * - Do not use icon codes such as `"flame"` or `"zap"` as labels; provide readable names such
 *   as `"Flame"` or `"Lightning"`.
 * - Do not place buttons, links, or other focusable content inside an option glyph.
 */
export const IconPicker = forwardRef<HTMLDivElement, IconPickerProps>(function IconPicker(
  {
    value,
    options,
    onChange,
    disabled = false,
    invalid = false,
    required = false,
    popoverPlacement = 'bottom-start',
    id,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-required': ariaRequired,
    className,
    style,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const [activeValue, setActiveValue] = useState<string | null>(
    () => options.find((option) => option.value === value)?.value ?? options[0]?.value ?? null,
  );
  const [portaledTokenStyle, setPortaledTokenStyle] = useState<IconPickerTokenStyle>();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef(new Map<string, HTMLButtonElement>());
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const activeIndexRef = useRef(
    Math.max(
      0,
      options.findIndex((option) => option.value === value),
    ),
  );
  const focusWithinGridRef = useRef(false);
  const pendingOpenFocusRef = useRef<string | null>(null);
  const selected = options.find((option) => option.value === value);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const optionValues = JSON.stringify(options.map((option) => option.value));
  const unavailable = disabled || options.length === 0;
  const unavailableRef = useRef(unavailable);
  unavailableRef.current = unavailable;
  const purpose = ariaLabel ?? t('iconPicker.triggerLabel');
  const triggerLabel = selected ? `${purpose}: ${selected.label}` : purpose;
  const { side, align } = PLACEMENT_MAP[popoverPlacement];
  const purposeLabelProps = ariaLabelledBy
    ? { 'aria-labelledby': ariaLabelledBy }
    : { 'aria-label': purpose };
  const activeIndex = options.findIndex((option) => option.value === activeValue);
  const reconciledIndex =
    activeIndex >= 0
      ? activeIndex
      : options.length > 0
        ? Math.min(activeIndexRef.current, options.length - 1)
        : -1;
  const renderedActiveValue =
    reconciledIndex >= 0 ? (options[reconciledIndex]?.value ?? null) : null;

  const focusCell = (index: number) => {
    const option = options[index];
    if (!option) return;
    activeIndexRef.current = index;
    setActiveValue(option.value);
    cellRefs.current.get(option.value)?.focus();
  };

  useLayoutEffect(() => {
    if (!open) return;
    if (unavailable) {
      setOpen(false);
    }
  }, [open, unavailable]);

  useLayoutEffect(() => {
    if (!open) return;
    setPortaledTokenStyle(readIconPickerTokenStyle(rootRef.current));
  }, [className, open, style]);

  useLayoutEffect(() => {
    if (!open || pendingOpenFocusRef.current === null) return;
    const valueToFocus = pendingOpenFocusRef.current;
    pendingOpenFocusRef.current = null;
    queueMicrotask(() => {
      const cell = cellRefs.current.get(valueToFocus);
      if (cell?.isConnected) {
        cell.focus({ preventScroll: true });
      }
    });
  }, [open]);

  useLayoutEffect(() => {
    if (!open || options.length === 0) return;
    if (activeIndex >= 0) {
      activeIndexRef.current = activeIndex;
      return;
    }
    if (renderedActiveValue === null) return;

    const shouldMoveFocus = focusWithinGridRef.current;
    activeIndexRef.current = reconciledIndex;
    setActiveValue(renderedActiveValue);
    if (shouldMoveFocus) {
      queueMicrotask(() => {
        const cell = cellRefs.current.get(renderedActiveValue);
        if (cell?.isConnected) {
          cell.focus({ preventScroll: true });
        }
      });
    }
  }, [activeIndex, open, optionValues, options.length, reconciledIndex, renderedActiveValue]);

  const commit = (option: IconPickerOption) => {
    if (unavailableRef.current) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  const handleOpenChange = (next: boolean) => {
    if (next && unavailable) return;
    if (next) {
      const seedIndex = selectedIndex >= 0 ? selectedIndex : 0;
      const seedValue = options[seedIndex]?.value ?? null;
      activeIndexRef.current = seedIndex;
      setActiveValue(seedValue);
      pendingOpenFocusRef.current = seedValue;
    } else {
      pendingOpenFocusRef.current = null;
      focusWithinGridRef.current = false;
    }
    setOpen(next);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const current = Number(event.currentTarget.dataset.iconIndex);
    if (!Number.isInteger(current) || !options[current]) return;

    const lastIndex = options.length - 1;
    const rowStart = current - (current % COLUMNS);
    let nextIndex: number | undefined;
    let selectOnMove = false;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = current === 0 ? lastIndex : current - 1;
        selectOnMove = true;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = current === lastIndex ? 0 : current + 1;
        selectOnMove = true;
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
    if (selectOnMove && !unavailableRef.current) {
      onChange(options[nextIndex].value);
    }
  };

  return (
    // {...rest} last so consumers can set native root attributes.
    <div
      ref={mergeRefs<HTMLDivElement>(rootRef, ref)}
      className={clsx(styles.root, className)}
      style={style}
      {...rest}
    >
      <Popover open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger>
          <button
            ref={triggerRef}
            id={id}
            type="button"
            className={styles.trigger}
            disabled={unavailable}
            aria-label={ariaLabelledBy ? undefined : triggerLabel}
            aria-labelledby={ariaLabelledBy}
            aria-describedby={ariaDescribedBy}
            aria-invalid={invalid ? true : ariaInvalid}
            aria-required={required ? true : ariaRequired}
          >
            {selected && (
              <span className={styles.glyph} aria-hidden="true">
                {selected.icon}
              </span>
            )}
          </button>
        </Popover.Trigger>
        <Popover.Content side={side} align={align} {...purposeLabelProps}>
          <div
            className={styles.grid}
            role="radiogroup"
            style={portaledTokenStyle}
            onFocusCapture={() => {
              focusWithinGridRef.current = true;
            }}
            onBlurCapture={(event) => {
              if (
                !(event.relatedTarget instanceof Node) ||
                !event.currentTarget.contains(event.relatedTarget)
              ) {
                focusWithinGridRef.current = false;
              }
            }}
            {...purposeLabelProps}
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                ref={(element) => {
                  if (element) {
                    cellRefs.current.set(option.value, element);
                  } else {
                    cellRefs.current.delete(option.value);
                  }
                }}
                type="button"
                role="radio"
                aria-label={option.label}
                aria-checked={option.value === value}
                tabIndex={option.value === renderedActiveValue ? 0 : -1}
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
