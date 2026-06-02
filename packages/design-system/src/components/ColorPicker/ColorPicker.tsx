import {
  forwardRef,
  isValidElement,
  useCallback,
  useState,
  Children,
  cloneElement,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { Popover } from '../Popover';
import { useTranslation } from '../../i18n/useTranslation';
import { ColorPickerPanel } from './ColorPickerPanel';
import { normalizeHex } from './colorMath';
import styles from './ColorPicker.module.scss';

const FALLBACK_HEX = '#000000';

type PopoverPlacement = 'top' | 'top-start' | 'top-end' | 'bottom' | 'bottom-start' | 'bottom-end';

type PopoverSide = 'top' | 'right' | 'bottom' | 'left';
type PopoverAlign = 'start' | 'center' | 'end';

const PLACEMENT_MAP: Record<PopoverPlacement, { side: PopoverSide; align: PopoverAlign }> = {
  top: { side: 'top', align: 'center' },
  'top-start': { side: 'top', align: 'start' },
  'top-end': { side: 'top', align: 'end' },
  bottom: { side: 'bottom', align: 'center' },
  'bottom-start': { side: 'bottom', align: 'start' },
  'bottom-end': { side: 'bottom', align: 'end' },
};

export interface ColorPickerTriggerProps {
  /**
   * Currently always behaves as `true` (the child is merged with trigger
   * semantics via `<Popover.Trigger>`'s cloneElement). Reserved for a
   * future Slot-style variant where `false` would wrap the child instead
   * of merging. Documented for API stability.
   */
  asChild?: boolean;
  /** The element to render as the trigger. Must accept `ref` and `onClick`. */
  children: ReactNode;
}

/**
 * Marker child used INSIDE `<ColorPicker>` to override the default trigger.
 * Doesn't render anything by itself — `<ColorPicker>` reads its
 * `children` and passes them to `<Popover.Trigger>`. The child element
 * must `forwardRef` and accept `onClick` for the popover to work.
 *
 * @example
 * <ColorPicker value={hex} onChange={setHex}>
 *   <ColorPicker.Trigger asChild>
 *     <Button variant="secondary">Pick a color</Button>
 *   </ColorPicker.Trigger>
 * </ColorPicker>
 *
 * @remarks Anti-patterns
 * - ❌ Using `<ColorPicker.Trigger>` outside `<ColorPicker>`. It only has
 *   meaning as a marker child read by the parent.
 * - ❌ Wrapping a non-forwardRef component. `<Popover.Trigger>` calls
 *   cloneElement to inject the ref; non-forwardRef components silently
 *   drop it and the popover never positions correctly.
 * - ❌ Forgetting to wire `disabled` into the custom trigger element when
 *   `<ColorPicker disabled>` is passed. The wrapper dims with
 *   `pointer-events: none` for click-blocking, but the consumer's button
 *   itself doesn't know it's disabled unless YOU pass the prop through.
 */
export function ColorPickerTrigger(_props: ColorPickerTriggerProps): null {
  return null;
}
ColorPickerTrigger.displayName = 'ColorPickerTrigger';

export interface ColorPickerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Current color as `#RRGGBB`. Controlled — required. */
  value: string;
  /** Fires per drag tick + on input change + on preset click. High frequency during drags. */
  onChange: (hex: string) => void;
  /** Fires on the trailing edge of an interaction. Use for commit-style logic. */
  onChangeEnd?: (hex: string) => void;
  /**
   * Optional preset color swatches. If provided, rendered as a grid below
   * the hue slider in the panel.
   */
  presets?: string[];
  /** Disable interaction. Trigger doesn't open; panel is non-interactive. */
  disabled?: boolean;
  /**
   * Accessible label for the default trigger. Defaults to the i18n value at
   * `colorPicker.triggerLabel` (`'Pick a color'` in English). Ignored when
   * a custom trigger is provided via `<ColorPicker.Trigger>`.
   */
  triggerLabel?: string;
  /**
   * Id(s) of element(s) that label the trigger button. Forwarded onto the
   * focusable trigger (not the root wrapper) and takes precedence over the
   * generated `aria-label`. Set automatically when wrapped in `<Field label>`.
   */
  'aria-labelledby'?: string;
  /**
   * Id(s) of element(s) that describe the trigger button (e.g. a Field error or
   * helper text). Forwarded onto the focusable trigger, not the root wrapper.
   */
  'aria-describedby'?: string;
  /** Popover placement (split internally into side + align). Default `'bottom-start'`. */
  popoverPlacement?: PopoverPlacement;
  /** Optional `<ColorPicker.Trigger asChild>` override for custom triggers. */
  children?: ReactNode;
}

interface DefaultTriggerProps {
  hex: string;
  label: string;
  disabled: boolean;
  open: boolean;
  labelledBy?: string;
  describedBy?: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const DefaultTrigger = forwardRef<HTMLButtonElement, DefaultTriggerProps>(function DefaultTrigger(
  { hex, label, disabled, open, onClick, labelledBy, describedBy },
  ref,
) {
  const display = normalizeHex(hex) ?? FALLBACK_HEX;
  return (
    <button
      ref={ref}
      type="button"
      className={styles.trigger}
      disabled={disabled}
      // An external label (e.g. <Field label>) wins; otherwise fall back to
      // the self-describing generated label. Never set both.
      aria-label={labelledBy ? undefined : `${label}, current value ${display}`}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-haspopup="true"
      aria-expanded={open}
      onClick={onClick}
    >
      <span
        className={styles.triggerSwatch}
        style={{ backgroundColor: display }}
        aria-hidden="true"
      />
      <span className={styles.triggerHex} aria-hidden="true">
        {display}
      </span>
    </button>
  );
});

/**
 * Controlled HEX color picker with a Popover trigger by default. For the
 * inline (always-visible) variant, use `<ColorPicker.Panel>` directly.
 *
 * @example
 * // Default popover with the library's trigger swatch:
 * const [hex, setHex] = useState('#4F46E5');
 * <ColorPicker value={hex} onChange={setHex} triggerLabel="Brand color" />
 *
 * @example
 * // Custom trigger via the slot-style override:
 * <ColorPicker value={hex} onChange={setHex}>
 *   <ColorPicker.Trigger asChild>
 *     <Button variant="secondary">Pick a color</Button>
 *   </ColorPicker.Trigger>
 * </ColorPicker>
 *
 * @example
 * // With preset swatches:
 * <ColorPicker
 *   value={hex}
 *   onChange={setHex}
 *   presets={['#4F46E5', '#10B981', '#F59E0B', '#EF4444']}
 * />
 *
 * @remarks When NOT to use
 * - For an inline always-visible picker. Use `<ColorPicker.Panel>` directly.
 * - For an uncontrolled picker. Component is controlled-only.
 * - For non-HEX color formats (named colors, rgb(), hsl()). Convert in
 *   the consumer.
 *
 * @remarks Anti-patterns
 * - ❌ Passing non-HEX `value`. Use one of `#RGB` / `#RRGGBB`, with or
 *   without the leading `#`. Anything else falls back to `#000000` with
 *   a dev-only warning.
 * - ❌ Reaching into the picker's internal HSV state. The consumer's
 *   contract is HEX-only.
 * - ❌ Hand-rolling a color picker per page when this exists.
 * - ❌ Bundling a default palette in a consumer instead of passing
 *   `presets`. The library doesn't ship a default palette by design.
 * - ❌ Calling expensive work in `onChange`. Use `onChangeEnd` (fires once
 *   per gesture).
 */
const ColorPickerRoot = forwardRef<HTMLDivElement, ColorPickerProps>(function ColorPickerRoot(
  {
    value,
    onChange,
    onChangeEnd,
    presets,
    disabled = false,
    triggerLabel,
    popoverPlacement = 'bottom-start',
    'aria-labelledby': ariaLabelledBy,
    'aria-describedby': ariaDescribedBy,
    children,
    className,
    ...rest
  },
  ref,
) {
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const { side, align } = PLACEMENT_MAP[popoverPlacement];
  const resolvedTriggerLabel = triggerLabel ?? t('colorPicker.triggerLabel');

  // Find a <ColorPicker.Trigger> marker child if present; extract its
  // children to use as the popover trigger element. Other children types
  // are ignored (no error — keeps the API forgiving).
  const customTrigger = Children.toArray(children).find(
    (c): c is ReactElement<ColorPickerTriggerProps> =>
      isValidElement(c) && c.type === ColorPickerTrigger,
  );

  const triggerElement = customTrigger ? (
    // The consumer's child is cloned to inject the label/description ids so a
    // custom trigger is named too; <Popover.Trigger> then clones it again to
    // inject onClick + aria-* + ref.
    cloneElement(customTrigger.props.children as ReactElement<Record<string, unknown>>, {
      'aria-labelledby': ariaLabelledBy,
      'aria-describedby': ariaDescribedBy,
    })
  ) : (
    <DefaultTrigger
      hex={value}
      label={resolvedTriggerLabel}
      disabled={disabled}
      open={open}
      labelledBy={ariaLabelledBy}
      describedBy={ariaDescribedBy}
      // onClick is overridden by Popover.Trigger's cloneElement; we set a
      // no-op here so DefaultTrigger's prop type is satisfied.
      onClick={() => {}}
    />
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (disabled) return;
      setOpen(next);
    },
    [disabled],
  );

  return (
    <div ref={ref} className={clsx(disabled && styles.disabled, className)} {...rest}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger>{triggerElement}</Popover.Trigger>
        <Popover.Content side={side} align={align}>
          <ColorPickerPanel
            value={value}
            onChange={onChange}
            onChangeEnd={onChangeEnd}
            presets={presets}
            disabled={disabled}
          />
        </Popover.Content>
      </Popover>
    </div>
  );
});
ColorPickerRoot.displayName = 'ColorPicker';

/** Compound API: `<ColorPicker>` + `<ColorPicker.Trigger>` + `<ColorPicker.Panel>`. */
export const ColorPicker = Object.assign(ColorPickerRoot, {
  Trigger: ColorPickerTrigger,
  Panel: ColorPickerPanel,
});

// Re-export types from the panel for consumers who use `<ColorPicker.Panel>` directly.
export type { ColorPickerPanelProps } from './ColorPickerPanel';
