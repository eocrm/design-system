import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import clsx from 'clsx';
import { Popover } from '../Popover';
import { Checkbox } from '../Checkbox';
import { type BadgeTone } from '../Badge';
import { Text } from '../Text';
import { Stack } from '../Stack';
import styles from './OptionsPicker.module.scss';

// ----------------------------------------------------------------------------
// Public types
// ----------------------------------------------------------------------------

export type OptionsPickerMode = 'multi' | 'single';

export interface OptionsPickerOption {
  /** Unique identifier; persisted as the selected value. */
  value: string;
  /** Displayed text. */
  label: string;
  /** Override what the search filter matches against. Defaults to `label`. */
  searchText?: string;
}

export interface OptionsPickerGroup {
  /** Unique per group; used as React key and ARIA target. */
  id: string;
  /** Header text shown in the group label slot. */
  label: string;
  options: OptionsPickerOption[];
  /** Colored dot tone for the group header. Default `'neutral'`. */
  tone?: BadgeTone;
  /** Right-side hint label (e.g., `"auth.*"`). Omitted → no hint renders. */
  hint?: string;
}

interface MultiProps {
  mode?: 'multi';
  selected: string[];
  onApply: (next: string[]) => void;
  onCancel?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

interface SingleProps {
  mode: 'single';
  selected: string | null;
  onApply: (next: string | null) => void;
  onCancel?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

export type OptionsPickerProps = MultiProps | SingleProps;

type FlatContentProps = {
  options: OptionsPickerOption[];
  groups?: never;
};
type GroupedContentProps = {
  groups: OptionsPickerGroup[];
  options?: never;
};
type SharedContentProps = {
  /** Accessible label on the panel (the dialog's `aria-label`). */
  label: string;
  /** Search input placeholder. Default `'Filter…'`. */
  searchPlaceholder?: string;
  /** Footer Apply button text (multi only). Default `'Apply'`. */
  applyLabel?: string;
  /** Footer Cancel button text (multi only). Default `'Cancel'`. */
  cancelLabel?: string;
  /** Rendered when search produces zero matches. Default `'No matches'`. */
  emptyState?: ReactNode;
  /** Footer count formatter (multi only). Default `'${selected} of ${total}'`. */
  footerCount?: (selected: number, total: number) => ReactNode;
  className?: string;
};
export type OptionsPickerContentProps = (FlatContentProps | GroupedContentProps) & SharedContentProps;

// ----------------------------------------------------------------------------
// Context
// ----------------------------------------------------------------------------

interface PickerContextValue {
  mode: OptionsPickerMode;
  /** Always normalized to string[] internally; single mode uses [] or [value]. */
  selected: string[];
  open: boolean;
  setOpen: (next: boolean) => void;
  /** Called when Apply (multi) or click (single) commits draft to consumer. */
  commit: (next: string[]) => void;
  /** Called on Cancel/Esc/click-outside. */
  cancel: () => void;
}

const PickerContext = createContext<PickerContextValue | null>(null);

function usePickerContext(label: string): PickerContextValue {
  const ctx = useContext(PickerContext);
  if (!ctx) {
    throw new Error(`<OptionsPicker.${label}> must be used inside <OptionsPicker>.`);
  }
  return ctx;
}

// ----------------------------------------------------------------------------
// Root
// ----------------------------------------------------------------------------

function OptionsPickerRoot(props: OptionsPickerProps) {
  const mode: OptionsPickerMode = props.mode ?? 'multi';

  // Normalize selected to string[] internally.
  const normalizedSelected = useMemo<string[]>(() => {
    if (mode === 'multi') return (props as MultiProps).selected;
    const sv = (props as SingleProps).selected;
    return sv == null ? [] : [sv];
  }, [mode, props]);

  // Open state — controlled or uncontrolled.
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = props.open !== undefined;
  const open = isControlled ? (props.open as boolean) : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      props.onOpenChange?.(next);
    },
    [isControlled, props],
  );

  const commit = useCallback(
    (next: string[]) => {
      if (mode === 'multi') {
        (props as MultiProps).onApply(next);
      } else {
        (props as SingleProps).onApply(next[0] ?? null);
      }
      setOpen(false);
    },
    [mode, props, setOpen],
  );

  const cancel = useCallback(() => {
    (props as { onCancel?: () => void }).onCancel?.();
    setOpen(false);
  }, [props, setOpen]);

  const ctxValue = useMemo<PickerContextValue>(
    () => ({ mode, selected: normalizedSelected, open, setOpen, commit, cancel }),
    [mode, normalizedSelected, open, setOpen, commit, cancel],
  );

  return (
    <PickerContext.Provider value={ctxValue}>
      <Popover open={open} onOpenChange={setOpen}>
        {props.children}
      </Popover>
    </PickerContext.Provider>
  );
}

// ----------------------------------------------------------------------------
// Trigger
// ----------------------------------------------------------------------------

export interface OptionsPickerTriggerProps {
  /** Must be a single React element that accepts a ref (e.g. `<Button>`). */
  children: ReactElement;
}

const OptionsPickerTrigger = forwardRef<HTMLButtonElement, OptionsPickerTriggerProps>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function OptionsPickerTrigger({ children }, _ref) {
    usePickerContext('Trigger'); // assert inside root
    // ref: Popover.Trigger injects the ref into its child via cloneElement;
    // OptionsPickerTrigger's own forwarded ref is not plumbed further in this task.
    return <Popover.Trigger>{children}</Popover.Trigger>;
  },
);

// ----------------------------------------------------------------------------
// Content
// ----------------------------------------------------------------------------

function isGrouped(props: OptionsPickerContentProps): props is GroupedContentProps & SharedContentProps {
  return 'groups' in props && props.groups !== undefined;
}

function getAllOptions(props: OptionsPickerContentProps): OptionsPickerOption[] {
  if (isGrouped(props)) return props.groups.flatMap((g) => g.options);
  return props.options ?? [];
}

const OptionsPickerContent = forwardRef<HTMLDivElement, OptionsPickerContentProps>(
  function OptionsPickerContent(props, ref) {
    const { label, className } = props;
    const ctx = usePickerContext('Content');

    // Draft state — initialized from committed selected on every open.
    const [draft, setDraft] = useState<string[]>(ctx.selected);
    useEffect(() => {
      if (ctx.open) setDraft(ctx.selected);
    }, [ctx.open, ctx.selected]);

    // Will be used by Task 3 search filtering.
    const _allOptions = useMemo(() => getAllOptions(props), [props]);
    void _allOptions;

    const toggle = useCallback(
      (value: string) => {
        if (ctx.mode === 'multi') {
          setDraft((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
          );
        } else {
          // Single mode commits immediately + closes.
          ctx.commit([value]);
        }
      },
      [ctx],
    );

    return (
      <Popover.Content ref={ref} className={clsx(styles.panel, className)} aria-label={label}>
        <Stack gap="xs">
          <div className={styles.list} role="listbox" aria-multiselectable={ctx.mode === 'multi'}>
            {isGrouped(props)
              ? null /* grouped rendering ships in Task 5 */
              : (props.options ?? []).map((opt) => (
                  <OptionRow key={opt.value} option={opt} checked={draft.includes(opt.value)} onToggle={toggle} />
                ))}
          </div>
        </Stack>
      </Popover.Content>
    );
  },
);

interface OptionRowProps {
  option: OptionsPickerOption;
  checked: boolean;
  onToggle: (value: string) => void;
}

function OptionRow({ option, checked, onToggle }: OptionRowProps) {
  const handleChange = useCallback(() => onToggle(option.value), [onToggle, option.value]);
  // Checkbox onChange receives (checked, event) — we ignore both and drive
  // toggle via the option's value in the outer callback.
  const checkboxOnChange = useCallback(
    (_checked: boolean) => handleChange(),
    [handleChange],
  );
  return (
    <div className={clsx(styles.row, checked && styles.rowSelected)}>
      <Checkbox checked={checked} onChange={checkboxOnChange} aria-label={option.label} />
      <Text size="sm">{option.label}</Text>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Compound export
// ----------------------------------------------------------------------------

export const OptionsPicker = Object.assign(OptionsPickerRoot, {
  Trigger: OptionsPickerTrigger,
  Content: OptionsPickerContent,
});
