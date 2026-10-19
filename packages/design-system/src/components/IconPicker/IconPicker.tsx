import {
  forwardRef,
  useId,
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
import { PALETTE_COLORS, paletteTokens, type PaletteColor } from '../../palette';
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
// Also written to the swatch grid as --icon-picker-swatch-columns so CSS and Home/End agree.
const SWATCH_COLUMNS = 6;

const ICON_PICKER_TOKEN_NAMES = [
  '--icon-picker-trigger-size',
  '--icon-picker-trigger-size-sm',
  '--icon-picker-trigger-size-lg',
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
  '--icon-picker-disabled-opacity',
  '--icon-picker-section-gap',
  '--icon-picker-heading-fg',
  '--icon-picker-heading-font-size',
  '--icon-picker-heading-font-weight',
  '--icon-picker-swatch-size',
  '--icon-picker-swatch-gap',
  '--icon-picker-swatch-radius',
  '--icon-picker-swatch-selected-ring',
  '--icon-picker-swatch-selected-ring-width',
] as const;

type IconPickerTokenStyle = CSSProperties & {
  [token: `--icon-picker-${string}`]: string | number | undefined;
};

function swatchStyle(color: PaletteColor): IconPickerTokenStyle {
  return { '--icon-picker-swatch-fg': paletteTokens(color).fg };
}

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

/** Trigger size: `sm`/`md`/`lg` match the Field control heights. */
export type IconPickerSize = 'sm' | 'md' | 'lg';

/** Props shared by both modes of the controlled `<IconPicker>` popover and its root wrapper. */
export interface IconPickerBaseProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'color'
> {
  /** Currently selected option value. Controlled — required. */
  value: string;
  /**
   * Consumer-curated icons rendered in the supplied order. Values must be stable and unique.
   * An empty list disables the trigger.
   */
  options: IconPickerOption[];
  /**
   * Fires exactly once with the chosen option value, including when it equals the controlled
   * `value`. Closes the popover in icon-only mode; colour mode keeps it open.
   */
  onChange: (value: string) => void;
  /**
   * Disables the trigger, prevents opening and selection, and closes an open picker.
   * @default false
   */
  disabled?: boolean;
  /** Trigger size, matching the sm/md/lg field heights. @default 'md' */
  size?: IconPickerSize;
  /** Marks the focusable trigger invalid for Field composition. @default false */
  invalid?: boolean;
  /**
   * Consumed for Field composition so Field can render its visible required marker. Native
   * buttons do not support `aria-required`, so this does not add required semantics to the
   * trigger. @default false
   */
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
   * `iconPicker.triggerLabel` value when omitted OR empty — an empty string is
   * not an explicit name, so it takes the default too. In colour mode the default is
   * `iconPicker.triggerLabelWithColor` and the trigger appends the colour name as well.
   */
  'aria-label'?: string;
  /**
   * Id(s) of external elements that provide the picker purpose. They name the dialog and
   * radiogroup directly. The trigger also references hidden selected-option text so its name
   * remains the visible purpose plus the current selection.
   */
  'aria-labelledby'?: string;
  /** Id(s) of element(s) that describe the trigger button. */
  'aria-describedby'?: string;
}

/** Colour mode: `color` + `onColorChange` come together or not at all. */
export type IconPickerColorProps =
  | {
      /** Controlled palette colour. Passing it turns on colour mode. */
      color: PaletteColor;
      /** Fires with the chosen palette colour; the popover stays open. */
      onColorChange: (color: PaletteColor) => void;
      /** Offered colours, in order. @default PALETTE_COLORS */
      colors?: readonly PaletteColor[];
    }
  | { color?: never; onColorChange?: never; colors?: never };

/** Props for the controlled `<IconPicker>` popover and its root wrapper. */
export type IconPickerProps = IconPickerBaseProps & IconPickerColorProps;

/**
 * Controlled single-select icon picker with a compact Popover radio grid.
 * @see docs/components/IconPicker.md
 */
export const IconPicker = forwardRef<HTMLDivElement, IconPickerProps>(function IconPicker(
  {
    value,
    options,
    onChange,
    color,
    onColorChange,
    colors = PALETTE_COLORS,
    disabled = false,
    invalid = false,
    size = 'md',
    // Consumed for Field compatibility; native button triggers do not support required state.
    required: _required = false,
    popoverPlacement = 'bottom-start',
    id,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-required': _ariaRequired,
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
  const pendingOpenFocusRef = useRef<(() => HTMLButtonElement | undefined) | null>(null);
  const colorRefs = useRef(new Map<PaletteColor, HTMLButtonElement>());
  const baseId = useId();
  const selectedLabelId = `${baseId}-selected`;
  const colorNameId = `${baseId}-color`;
  const colorHeadingId = `${baseId}-color-heading`;
  const iconHeadingId = `${baseId}-icon-heading`;
  const colorMode = color !== undefined;
  const colorName = colorMode ? t(`palette.${color}`) : '';
  const checkedColorIndex = colorMode ? colors.indexOf(color) : -1;
  const tabbableColorIndex = Math.max(0, checkedColorIndex);
  const tintStyle: IconPickerTokenStyle | undefined = colorMode
    ? {
        '--icon-picker-tint-bg': paletteTokens(color).bg,
        '--icon-picker-tint-fg': paletteTokens(color).fg,
      }
    : undefined;
  const selected = options.find((option) => option.value === value);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const optionValues = JSON.stringify(options.map((option) => option.value));
  const unavailable = disabled || options.length === 0;
  const unavailableRef = useRef(unavailable);
  unavailableRef.current = unavailable;
  const purpose =
    ariaLabel || t(colorMode ? 'iconPicker.triggerLabelWithColor' : 'iconPicker.triggerLabel');
  const selectionLabel = [selected?.label, colorName].filter(Boolean).join(', ');
  const triggerLabel = selectionLabel ? `${purpose}: ${selectionLabel}` : purpose;
  const triggerLabelledBy = ariaLabelledBy
    ? clsx(ariaLabelledBy, selected && selectedLabelId, colorMode && colorNameId)
    : undefined;
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
    const getFocusTarget = pendingOpenFocusRef.current;
    pendingOpenFocusRef.current = null;
    queueMicrotask(() => {
      const cell = getFocusTarget();
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
    if (colorMode) {
      // Colour mode stays open (the user usually sets both); keep the roving stop on the pick.
      activeIndexRef.current = options.indexOf(option);
      setActiveValue(option.value);
      return;
    }
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  const commitColor = (next: PaletteColor) => {
    if (unavailableRef.current) return;
    onColorChange?.(next);
  };

  const handleOpenChange = (next: boolean) => {
    if (next && unavailable) return;
    if (next) {
      const seedIndex = selectedIndex >= 0 ? selectedIndex : 0;
      const seedValue = options[seedIndex]?.value ?? null;
      activeIndexRef.current = seedIndex;
      setActiveValue(seedValue);
      const seedColor = colorMode ? colors[tabbableColorIndex] : undefined;
      pendingOpenFocusRef.current = seedColor
        ? () => colorRefs.current.get(seedColor)
        : () => (seedValue === null ? undefined : cellRefs.current.get(seedValue));
    } else {
      pendingOpenFocusRef.current = null;
      focusWithinGridRef.current = false;
    }
    setOpen(next);
  };

  // Shared roving-radio keyboard handler for the icon grid and the colour swatches.
  const rovingKeyDown =
    (
      indexAttr: 'iconIndex' | 'colorIndex',
      count: number,
      columns: number,
      focusAt: (index: number) => void,
      selectAt: (index: number, viaArrow: boolean) => void,
    ) =>
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      const current = Number(event.currentTarget.dataset[indexAttr]);
      if (!Number.isInteger(current) || current < 0 || current >= count) return;

      const lastIndex = count - 1;
      const rowStart = current - (current % columns);
      let nextIndex: number;
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
          nextIndex = Math.min(rowStart + columns - 1, lastIndex);
          break;
        case 'Enter':
        case ' ':
        case 'Spacebar':
        case 'Space':
          event.preventDefault();
          selectAt(current, false);
          return;
        default:
          return;
      }

      event.preventDefault();
      focusAt(nextIndex);
      if (selectOnMove && !unavailableRef.current) selectAt(nextIndex, true);
    };

  const handleKeyDown = rovingKeyDown(
    'iconIndex',
    options.length,
    COLUMNS,
    focusCell,
    (index, viaArrow) => {
      const option = options[index];
      if (!option) return;
      // Arrows select without closing; Enter/Space commit (closes in icon-only mode).
      if (viaArrow) onChange(option.value);
      else commit(option);
    },
  );

  const handleColorKeyDown = rovingKeyDown(
    'colorIndex',
    colors.length,
    SWATCH_COLUMNS,
    (index) => {
      const target = colors[index];
      if (target) colorRefs.current.get(target)?.focus();
    },
    (index) => {
      const target = colors[index];
      if (target) commitColor(target);
    },
  );

  const iconGrid = (
    <div
      className={styles.grid}
      role="radiogroup"
      style={colorMode ? undefined : portaledTokenStyle}
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
      {...(colorMode ? { 'aria-labelledby': iconHeadingId } : purposeLabelProps)}
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
          className={clsx(
            styles.cell,
            colorMode && styles.tinted,
            option.value === value && styles.selected,
          )}
          onClick={() => commit(option)}
          onKeyDown={handleKeyDown}
        >
          <span className={styles.glyph} aria-hidden="true">
            {option.icon}
          </span>
        </button>
      ))}
    </div>
  );

  return (
    // {...rest} last so consumers can set native root attributes.
    <div
      ref={mergeRefs<HTMLDivElement>(rootRef, ref)}
      className={clsx(styles.root, className)}
      style={style}
      {...rest}
    >
      {ariaLabelledBy && selected && (
        <span id={selectedLabelId} className={styles.visuallyHidden}>
          {selected.label}
        </span>
      )}
      {ariaLabelledBy && colorMode && (
        <span id={colorNameId} className={styles.visuallyHidden}>
          {colorName}
        </span>
      )}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger>
          <button
            ref={triggerRef}
            id={id}
            type="button"
            className={clsx(styles.trigger, styles[`size-${size}`], colorMode && styles.tinted)}
            style={tintStyle}
            disabled={unavailable}
            aria-label={ariaLabelledBy ? undefined : triggerLabel}
            aria-labelledby={triggerLabelledBy}
            aria-describedby={ariaDescribedBy}
            aria-invalid={invalid ? true : ariaInvalid}
          >
            {selected && (
              <span className={styles.glyph} aria-hidden="true">
                {selected.icon}
              </span>
            )}
          </button>
        </Popover.Trigger>
        <Popover.Content side={side} align={align} {...purposeLabelProps}>
          {colorMode ? (
            <div className={styles.panel} style={{ ...portaledTokenStyle, ...tintStyle }}>
              {colors.length > 0 && (
                <>
                  <span id={colorHeadingId} className={styles.heading}>
                    {t('iconPicker.colorLabel')}
                  </span>
                  {/* Internal var, deliberately not in ICON_PICKER_TOKEN_NAMES. */}
                  <div
                    className={styles.swatches}
                    role="radiogroup"
                    aria-labelledby={colorHeadingId}
                    style={
                      { '--icon-picker-swatch-columns': SWATCH_COLUMNS } as IconPickerTokenStyle
                    }
                  >
                    {colors.map((paletteColor, index) => (
                      <button
                        key={paletteColor}
                        ref={(element) => {
                          if (element) {
                            colorRefs.current.set(paletteColor, element);
                          } else {
                            colorRefs.current.delete(paletteColor);
                          }
                        }}
                        type="button"
                        role="radio"
                        aria-label={t(`palette.${paletteColor}`)}
                        aria-checked={paletteColor === color}
                        tabIndex={index === tabbableColorIndex ? 0 : -1}
                        data-color-index={index}
                        className={clsx(
                          styles.swatch,
                          paletteColor === color && styles.swatchSelected,
                        )}
                        style={swatchStyle(paletteColor)}
                        onClick={() => commitColor(paletteColor)}
                        onKeyDown={handleColorKeyDown}
                      />
                    ))}
                  </div>
                </>
              )}
              <span id={iconHeadingId} className={styles.heading}>
                {t('iconPicker.iconLabel')}
              </span>
              {iconGrid}
            </div>
          ) : (
            iconGrid
          )}
        </Popover.Content>
      </Popover>
    </div>
  );
});
