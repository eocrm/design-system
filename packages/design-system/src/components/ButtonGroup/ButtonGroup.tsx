import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import clsx from 'clsx';
import { Button, type ButtonProps } from '../Button';
import {
  ButtonGroupContext,
  type ButtonGroupContextValue,
  type ButtonGroupSize,
} from './context';
import { ButtonGroupItem } from './ButtonGroupItem';
import styles from './ButtonGroup.module.scss';

export type { ButtonGroupSize } from './context';
export type { ButtonGroupItemProps } from './ButtonGroupItem';

interface ButtonGroupBase {
  /**
   * Size propagated to children. Per-child `size` (Button or Item) wins
   * when explicitly set. In visual mode this happens via cloneElement on
   * Button children. In segmented mode, `<ButtonGroup.Item>` reads from
   * context.
   */
  size?: ButtonGroupSize;
  /**
   * Disabled state for the whole group. In segmented mode this is
   * authoritative (all items become aria-disabled, clicks no-op). In
   * visual mode this is a no-op — pass `disabled` per `<Button>` instead.
   */
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

interface ButtonGroupVisualProps
  extends ButtonGroupBase,
    Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Visual mode marker. Never set; absence flips to visual. */
  value?: never;
  onValueChange?: never;
  /** Accessible name for the group landmark. Optional but recommended. */
  'aria-label'?: string;
}

interface ButtonGroupSegmentedProps
  extends ButtonGroupBase,
    Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Currently-selected item value. Triggers segmented mode. */
  value: string;
  /**
   * Fired when a different Item is selected.
   *
   * Consumers wanting literal-union narrowing can cast the setter:
   * `onValueChange={(v) => setView(v as 'grid' | 'list')}`.
   */
  onValueChange: (next: string) => void;
  /** Required in segmented mode (radiogroup needs a label). */
  'aria-label': string;
  /** Alternative to aria-label: id of an external labelling element. */
  'aria-labelledby'?: string;
}

export type ButtonGroupProps = ButtonGroupVisualProps | ButtonGroupSegmentedProps;

/**
 * Compound. Two modes:
 *
 * - **Visual** (no `value` prop): joins `<Button>` children into a single
 *   visual unit with shared borders and outer-only rounded corners. Use
 *   for toolbar action groups (Cut/Copy/Paste).
 *
 * - **Segmented** (`value` + `onValueChange`): single-select radiogroup
 *   with `<ButtonGroup.Item>` children. Use for view-mode toggles,
 *   timeframe filters, etc.
 *
 * Mode is determined by the presence of `value`. TypeScript enforces
 * "value AND onValueChange together OR neither" via a discriminated
 * union — passing one without the other is a compile error.
 *
 * @example
 * // Visual mode
 * <ButtonGroup aria-label="Edit actions">
 *   <Button>Cut</Button>
 *   <Button>Copy</Button>
 *   <Button>Paste</Button>
 * </ButtonGroup>
 *
 * @example
 * // Segmented mode
 * const [view, setView] = useState<'grid' | 'list' | 'calendar'>('grid');
 * <ButtonGroup value={view} onValueChange={setView} aria-label="View mode">
 *   <ButtonGroup.Item value="grid">Grid</ButtonGroup.Item>
 *   <ButtonGroup.Item value="list">List</ButtonGroup.Item>
 *   <ButtonGroup.Item value="calendar">Calendar</ButtonGroup.Item>
 * </ButtonGroup>
 *
 * @example
 * // Size propagation — group-level size flows to children.
 * <ButtonGroup size="sm">
 *   <Button>Cut</Button>      // size="sm"
 *   <Button>Copy</Button>     // size="sm"
 *   <Button size="md">Paste</Button>  // per-child override wins
 * </ButtonGroup>
 *
 * @remarks When NOT to use
 * - For routing-style tab strips that change page content — use `<Tabs>`.
 * - For multi-select toggles — compose with checkboxes.
 * - For non-button content groupings — use `<Cluster>` or `<Stack>`.
 *
 * @remarks Anti-patterns
 * - Mixing visual `<Button>` children with `<ButtonGroup.Item>` in the
 *   same group. Undefined behavior — pick one mode per ButtonGroup.
 * - Passing only `value` (no `onValueChange`) or only `onValueChange`
 *   (no `value`). TypeScript catches this; the runtime is also broken.
 * - Wrapping a `<ButtonGroup.Item>` in a user component. The Item's
 *   ref-registration depends on being a direct child so the parent can
 *   focus it on Arrow nav.
 */
export function ButtonGroupRoot(props: ButtonGroupProps) {
  const isSegmented = 'value' in props && props.value !== undefined;
  return isSegmented ? (
    <Segmented {...(props as ButtonGroupSegmentedProps)} />
  ) : (
    <Visual {...(props as ButtonGroupVisualProps)} />
  );
}

function Visual({
  size = 'md',
  disabled: _disabled,
  children,
  className,
  style,
  'aria-label': ariaLabel,
  ...rest
}: ButtonGroupVisualProps) {
  // Inject size into Button children whose size isn't already set.
  const processed = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    if (child.type !== Button) return child;
    const childProps = child.props as ButtonProps;
    if (childProps.size !== undefined) return child;
    return cloneElement(child as ReactElement<ButtonProps>, { size });
  });

  return (
    <div
      {...rest}
      // {...rest} first so the ARIA contract (role, aria-label, data-mode)
      // can't be silently broken by a stray consumer prop.
      role="group"
      aria-label={ariaLabel}
      data-mode="visual"
      className={clsx(styles.group, className)}
      style={style}
    >
      {processed}
    </div>
  );
}

function Segmented({
  size = 'md',
  disabled = false,
  value,
  onValueChange,
  children,
  className,
  style,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...rest
}: ButtonGroupSegmentedProps) {
  // groupRef enables DOM-order querying for keyboard nav so that consumer-
  // reordered children are always walked in their actual visual order.
  const groupRef = useRef<HTMLDivElement | null>(null);

  // Dev warning: aria-label or aria-labelledby required in segmented mode.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!ariaLabel && !ariaLabelledBy) {
        // eslint-disable-next-line no-console
        console.warn(
          '<ButtonGroup> in segmented mode requires an `aria-label` or `aria-labelledby` prop for screen readers.',
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ariaLabel, ariaLabelledBy]);

  const handleItemKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, currentValue: string) => {
      const root = groupRef.current;
      if (!root) return;
      // Query DOM order so reordered children are walked correctly.
      const allButtons = Array.from(
        root.querySelectorAll<HTMLButtonElement>('button[role="radio"]'),
      );
      const enabledButtons = allButtons.filter(
        (btn) => btn.getAttribute('aria-disabled') !== 'true',
      );
      if (enabledButtons.length === 0) return;

      // Find the focused button in the enabled list. If the currently-selected
      // item is itself disabled (per-item disabled), fall back to the active
      // element so Arrow nav still works from wherever focus is.
      let idx = enabledButtons.findIndex((btn) => btn.dataset.value === currentValue);
      if (idx === -1) {
        // Selected item is disabled — use whichever enabled button is focused.
        idx = enabledButtons.findIndex((btn) => btn === document.activeElement);
      }
      if (idx === -1) return;

      let nextIdx: number | null = null;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIdx = (idx + 1) % enabledButtons.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIdx = (idx - 1 + enabledButtons.length) % enabledButtons.length;
          break;
        case 'Home':
          nextIdx = 0;
          break;
        case 'End':
          nextIdx = enabledButtons.length - 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      const next = enabledButtons[nextIdx]!;
      if (!disabled) onValueChange(next.dataset.value!);
      next.focus();
    },
    [disabled, onValueChange],
  );

  const contextValue = useMemo<ButtonGroupContextValue>(
    () => ({
      value,
      onValueChange,
      size,
      disabled,
      handleItemKeyDown,
    }),
    [value, onValueChange, size, disabled, handleItemKeyDown],
  );

  return (
    <ButtonGroupContext.Provider value={contextValue}>
      <div
        ref={groupRef}
        {...rest}
        // {...rest} first so the ARIA contract (role, aria-label, data-mode)
        // can't be silently broken by a stray consumer prop.
        role="radiogroup"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-disabled={disabled || undefined}
        data-mode="segmented"
        className={clsx(styles.group, className)}
        style={style}
      >
        {children}
      </div>
    </ButtonGroupContext.Provider>
  );
}

/** Compound: `<ButtonGroup>` with `<ButtonGroup.Item>` attached. */
export const ButtonGroup = Object.assign(ButtonGroupRoot, { Item: ButtonGroupItem });
