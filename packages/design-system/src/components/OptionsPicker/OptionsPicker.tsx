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
import { Search } from 'lucide-react';
import { Popover } from '../Popover';
import { Button } from '../Button';
import { Checkbox } from '../Checkbox';
import { Radio } from '../Radio';
import { Cluster } from '../Cluster';
import { Input } from '../Input';
import { Badge, type BadgeTone } from '../Badge';
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

function defaultFooterCount(selected: number, total: number): string {
  return `${selected} of ${total}`;
}

type TriState = 'false' | 'mixed' | 'true';

function tristate(groupOptionValues: string[], draft: string[]): TriState {
  const selectedInGroup = groupOptionValues.filter((v) => draft.includes(v)).length;
  if (selectedInGroup === 0) return 'false';
  if (selectedInGroup === groupOptionValues.length) return 'true';
  return 'mixed';
}

const OptionsPickerContent = forwardRef<HTMLDivElement, OptionsPickerContentProps>(
  function OptionsPickerContent(props, ref) {
    const { label, className, searchPlaceholder = 'Filter…' } = props;
    const ctx = usePickerContext('Content');

    const [draft, setDraft] = useState<string[]>(ctx.selected);
    const [filter, setFilter] = useState('');

    useEffect(() => {
      if (ctx.open) {
        setDraft(ctx.selected);
        setFilter('');
      }
    }, [ctx.open, ctx.selected]);

    const matchesFilter = useCallback(
      (opt: OptionsPickerOption): boolean => {
        if (filter === '') return true;
        const haystack = (opt.searchText ?? opt.label).toLowerCase();
        return haystack.includes(filter.toLowerCase());
      },
      [filter],
    );

    const toggle = useCallback(
      (value: string) => {
        if (ctx.mode === 'multi') {
          setDraft((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
          );
        } else {
          ctx.commit([value]);
        }
      },
      [ctx],
    );

    const toggleGroup = useCallback(
      (groupOptions: OptionsPickerOption[]) => {
        if (ctx.mode !== 'multi') return;
        setDraft((prev) => {
          const allValues = groupOptions.map((o) => o.value);
          const allSelected = allValues.every((v) => prev.includes(v));
          if (allSelected) return prev.filter((v) => !allValues.includes(v));
          const next = [...prev];
          for (const v of allValues) if (!next.includes(v)) next.push(v);
          return next;
        });
      },
      [ctx.mode],
    );

    const visibleFlat = useMemo(() => {
      if (isGrouped(props)) return [];
      return (props.options ?? []).filter(matchesFilter);
    }, [props, matchesFilter]);

    const visibleGroups = useMemo(() => {
      if (!isGrouped(props)) return [];
      return props.groups
        .map((g) => ({ ...g, visibleOptions: g.options.filter(matchesFilter) }))
        .filter((g) => g.visibleOptions.length > 0);
    }, [props, matchesFilter]);

    const hasAnyVisible = isGrouped(props) ? visibleGroups.length > 0 : visibleFlat.length > 0;

    const allOptionsForCount = useMemo(() => getAllOptions(props), [props]);

    return (
      <Popover.Content ref={ref} className={clsx(styles.panel, className)} aria-label={label}>
        <Stack gap="xs">
          <div className={styles.searchBar}>
            <Search size={14} aria-hidden className={styles.searchIcon} />
            <Input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.currentTarget.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              autoFocus
              className={styles.searchInput}
            />
            {ctx.mode === 'multi' && (
              <Text size="xs" tone="subtle" aria-live="polite" className={styles.count}>
                {draft.length} sel
              </Text>
            )}
            {ctx.mode === 'single' && draft.length > 0 && (
              <Text size="xs" tone="subtle" aria-live="polite" className={styles.count}>
                1 sel
              </Text>
            )}
          </div>

          <div className={styles.list} role="listbox" aria-multiselectable={ctx.mode === 'multi'}>
            {!hasAnyVisible && (
              <Text size="sm" tone="muted" className={styles.empty}>
                {props.emptyState ?? 'No matches'}
              </Text>
            )}
            {hasAnyVisible && isGrouped(props) && visibleGroups.map((g) => (
              <div key={g.id} className={styles.group}>
                {ctx.mode === 'multi' ? (
                  <button
                    type="button"
                    className={styles.groupHeader}
                    aria-pressed={tristate(g.options.map((o) => o.value), draft)}
                    aria-label={`Toggle group ${g.label}`}
                    onClick={() => toggleGroup(g.options)}
                  >
                    <Badge tone={g.tone ?? 'neutral'} dot="start" size="sm" className={styles.groupDot} />
                    <Text size="xs" weight="semibold" className={styles.groupLabel}>
                      {g.label}
                    </Text>
                    {g.hint && (
                      <Text size="xs" tone="subtle" className={styles.groupHint}>
                        {g.hint}
                      </Text>
                    )}
                  </button>
                ) : (
                  <div className={styles.groupHeader} role="presentation">
                    <Badge tone={g.tone ?? 'neutral'} dot="start" size="sm" className={styles.groupDot} />
                    <Text size="xs" weight="semibold" className={styles.groupLabel}>
                      {g.label}
                    </Text>
                    {g.hint && (
                      <Text size="xs" tone="subtle" className={styles.groupHint}>
                        {g.hint}
                      </Text>
                    )}
                  </div>
                )}
                {g.visibleOptions.map((opt) => (
                  <OptionRow key={opt.value} option={opt} checked={draft.includes(opt.value)} mode={ctx.mode} onToggle={toggle} />
                ))}
              </div>
            ))}
            {hasAnyVisible && !isGrouped(props) && visibleFlat.map((opt) => (
              <OptionRow key={opt.value} option={opt} checked={draft.includes(opt.value)} mode={ctx.mode} onToggle={toggle} />
            ))}
          </div>

          {ctx.mode === 'multi' && (
            <div className={styles.footer}>
              <Text size="xs" tone="muted">
                {(props.footerCount ?? defaultFooterCount)(draft.length, allOptionsForCount.length)}
              </Text>
              <Cluster gap="sm">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setDraft(ctx.selected);
                    ctx.cancel();
                  }}
                >
                  {props.cancelLabel ?? 'Cancel'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => ctx.commit(draft)}
                >
                  {props.applyLabel ?? 'Apply'}
                </Button>
              </Cluster>
            </div>
          )}
        </Stack>
      </Popover.Content>
    );
  },
);

interface OptionRowProps {
  option: OptionsPickerOption;
  checked: boolean;
  mode: OptionsPickerMode;
  onToggle: (value: string) => void;
}

function OptionRow({ option, checked, mode, onToggle }: OptionRowProps) {
  // Checkbox onChange: (checked: boolean) => void — value ignored, drive via option.value
  const checkboxOnChange = useCallback(
    (_checked: boolean) => onToggle(option.value),
    [onToggle, option.value],
  );
  // Radio onChange: (value: string, event) => void — value is the radio's value prop
  const radioOnChange = useCallback(
    (_value: string) => onToggle(option.value),
    [onToggle, option.value],
  );
  return (
    <div className={clsx(styles.row, checked && styles.rowSelected)}>
      {mode === 'multi' ? (
        <Checkbox checked={checked} onChange={checkboxOnChange} aria-label={option.label} />
      ) : (
        <Radio value={option.value} checked={checked} onChange={radioOnChange} aria-label={option.label} />
      )}
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
