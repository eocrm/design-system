import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactElement,
} from 'react';
import clsx from 'clsx';
import { Button, type ButtonProps } from '../Button';
import { ButtonGroupContext, type ButtonGroupContextValue, type ButtonGroupSize } from './context';
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
  /**
   * Segmented mode: `aria-invalid` on the radiogroup. Visual mode: consumed
   * and ignored. Field / SettingRow inject it — it used to leak onto the
   * group div as a stray attribute (#568). @default false
   */
  invalid?: boolean;
  /**
   * Segmented mode: `aria-required` on the radiogroup. Visual mode: consumed
   * and ignored. Field / SettingRow inject it (#568). @default false
   */
  required?: boolean;
  className?: string;
  style?: CSSProperties;
}

interface ButtonGroupVisualProps
  extends ButtonGroupBase, Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Visual mode marker. Never set; absence flips to visual. */
  value?: never;
  onValueChange?: never;
  /** Accessible name for the group landmark. Optional but recommended. */
  'aria-label'?: string;
}

interface ButtonGroupSegmentedProps
  extends ButtonGroupBase, Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
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
 * Compound. Visual mode joins Buttons; segmented mode (`value` + `onValueChange`) is a single-select radiogroup.
 * @see docs/components/ButtonGroup.md
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
  // Consumed so Field-injected props never reach the div (#568).
  invalid: _invalid,
  required: _required,
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
  invalid = false,
  required = false,
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
        console.warn(
          '<ButtonGroup> in segmented mode requires an `aria-label` or `aria-labelledby` prop for screen readers.',
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ariaLabel, ariaLabelledBy]);

  // Which item holds the tab stop when nothing is selected. Read from the DOM
  // after each commit so consumer-reordered children resolve in visual order,
  // exactly like handleItemKeyDown below. Runs unconditionally but only sets
  // state when the answer actually changes, so it cannot loop.
  const [rovingFallbackValue, setRovingFallbackValue] = useState<string | null>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs after every commit by design; the setter bails out when unchanged
  useEffect(() => {
    const root = groupRef.current;
    if (!root) return;
    const items = [...root.querySelectorAll<HTMLButtonElement>('button[role="radio"]')];
    const anySelected = items.some((el) => el.getAttribute('aria-checked') === 'true');
    const firstEnabled = items.find((el) => el.getAttribute('aria-disabled') !== 'true');
    // `?? items[0]` for the all-disabled group. Items carry `aria-disabled`,
    // not the native `disabled`, precisely so they STAY focusable — a user can
    // tab to them and hear why the choice is unavailable. Falling back to null
    // here left every item at `tabIndex={-1}`, so the group vanished from the
    // tab order entirely, which is the behaviour `aria-disabled` was chosen to
    // avoid.
    const next = anySelected ? null : ((firstEnabled ?? items[0])?.dataset.value ?? null);
    setRovingFallbackValue((prev) => (prev === next ? prev : next));
  });

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
      rovingFallbackValue,
    }),
    [value, onValueChange, size, disabled, handleItemKeyDown, rovingFallbackValue],
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
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
        data-mode="segmented"
        className={clsx(styles.group, className)}
        style={style}
      >
        {children}
      </div>
    </ButtonGroupContext.Provider>
  );
}

/**
 * Compound: `<ButtonGroup>` with `<ButtonGroup.Item>` attached.
 * @see docs/components/ButtonGroup.md
 */
export const ButtonGroup = Object.assign(ButtonGroupRoot, { Item: ButtonGroupItem });
