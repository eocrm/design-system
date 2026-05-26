import {
  Children,
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import clsx from 'clsx';
import { Search } from 'lucide-react';
import { mergeRefs } from '../_internal/refs';
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
export type OptionsPickerContentProps = (FlatContentProps | GroupedContentProps) &
  SharedContentProps;

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
  /** Stable id for the Content panel; shared with Trigger for aria-controls. */
  contentId: string;
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

/**
 * Compound multi/single-select picker with search, optional grouping, and
 * draft-then-Apply commit semantics. Built on `Popover`, `Input`, `Checkbox`,
 * `Radio`, `Badge`. Use it for filter UX (audit log Events / Tenant, contact
 * list owner picker, deal stage picker) — NOT as a form field (use `Select`
 * for forms).
 *
 * Multi mode (default): draft state until Apply. Cancel/Esc/click-outside
 * revert. Single mode: each click commits via onApply + closes the panel
 * (no Apply/Cancel footer).
 *
 * @example
 * // Multi-select with grouped options + namespace hints
 * <OptionsPicker
 *   selected={selectedEvents}
 *   onApply={(next) => setSelectedEvents(next)}
 * >
 *   <OptionsPicker.Trigger>
 *     <Button variant="secondary">Events <ChevronDown size={14}/></Button>
 *   </OptionsPicker.Trigger>
 *   <OptionsPicker.Content
 *     label="Filter events"
 *     groups={[
 *       { id: 'auth', label: 'Authentication', tone: 'success', hint: 'auth.*',
 *         options: [{ value: 'auth.login_succeeded', label: 'login_succeeded' }] },
 *     ]}
 *   />
 * </OptionsPicker>
 *
 * @example
 * // Single-select flat list (auto-commits on click)
 * <OptionsPicker mode="single" selected={tenantId} onApply={setTenantId}>
 *   <OptionsPicker.Trigger>
 *     <Button variant="secondary">Tenant</Button>
 *   </OptionsPicker.Trigger>
 *   <OptionsPicker.Content
 *     label="Filter tenant"
 *     options={tenants.map((t) => ({ value: t.id, label: t.slug }))}
 *   />
 * </OptionsPicker>
 *
 * @remarks When NOT to use
 * - Form fields with one required selection — use `<Select>` instead. OptionsPicker
 *   has no notion of a `name` attribute, no implicit form association.
 * - Action menus (Edit / Delete / Archive on a row) — use `<DropdownMenu>`. Those
 *   are commands, not filters.
 * - Settings toggles or single-checkbox prompts — use `<Checkbox>` directly.
 *
 * @remarks Anti-patterns
 * - ❌ Passing BOTH `options` and `groups` to Content — TypeScript rejects it. Pick one.
 * - ❌ Calling onApply yourself inside Content's render. The picker owns commit
 *   via Apply/click-on-radio; consumers should treat `onApply(next)` as the
 *   single source of truth and update React state from it.
 * - ❌ Holding open state externally without `open` + `onOpenChange` both being
 *   passed. Partial control breaks invariants.
 */
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

  // justCommittedRef: true when the most-recent open→close was triggered by
  // a commit (Apply button / radio-click). When false on close, we fire onCancel.
  const justCommittedRef = useRef(false);
  // justFiredCancelRef: guards against double-fire when both Popover's
  // document-level Escape listener AND Content's synthetic onKeyDown both
  // call setOpen(false) in the same React event batch.
  const justFiredCancelRef = useRef(false);

  const setOpenRaw = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      props.onOpenChange?.(next);
    },
    [isControlled, props],
  );

  // Intercepts every open→close transition and fires onCancel exactly once
  // when the close was NOT preceded by a commit (i.e., Esc or click-outside).
  const setOpen = useCallback(
    (next: boolean) => {
      if (!next && open && !justCommittedRef.current && !justFiredCancelRef.current) {
        justFiredCancelRef.current = true;
        (props as { onCancel?: () => void }).onCancel?.();
      }
      if (next) {
        // Reset both guards when reopening.
        justCommittedRef.current = false;
        justFiredCancelRef.current = false;
      }
      setOpenRaw(next);
    },
    [open, props, setOpenRaw],
  );

  const commit = useCallback(
    (next: string[]) => {
      justCommittedRef.current = true;
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
    // Explicit cancel (Cancel button, Esc keydown on content) — mark as NOT a
    // commit so setOpen fires onCancel via the interceptor above.
    setOpen(false);
  }, [setOpen]);

  const contentId = useId();

  const ctxValue = useMemo<PickerContextValue>(
    () => ({ mode, selected: normalizedSelected, open, setOpen, commit, cancel, contentId }),
    [mode, normalizedSelected, open, setOpen, commit, cancel, contentId],
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

/**
 * The element that opens the picker panel. Pass a single child (typically a
 * `<Button>`) — the ref + click-to-open wiring + ARIA (`aria-haspopup`,
 * `aria-expanded`, `aria-controls`) are injected automatically.
 *
 * The consumer's ref is forwarded to the child element via `mergeRefs`, so
 * both the picker's internal ref and any external ref receive the same DOM node.
 *
 * @example
 * <OptionsPicker.Trigger>
 *   <Button variant="secondary">Events <ChevronDown size={14}/></Button>
 * </OptionsPicker.Trigger>
 */
const OptionsPickerTrigger = forwardRef<HTMLButtonElement, OptionsPickerTriggerProps>(
  function OptionsPickerTrigger({ children }, ref) {
    // usePickerContext validates that this component is inside an OptionsPicker.
    usePickerContext('Trigger');

    if (!isValidElement(children)) {
      throw new Error('<OptionsPicker.Trigger> requires exactly one React element child.');
    }

    // Merge the consumer's ref with the existing child ref so both receive the
    // same DOM node. mergeRefs handles callback refs and object refs alike.
    const child = Children.only(children) as ReactElement<{ ref?: Ref<HTMLButtonElement> }>;
    const childRef = (child as ReactElement & { ref?: Ref<HTMLButtonElement> }).ref;
    const mergedRef = ref ? mergeRefs<HTMLButtonElement>(ref, childRef ?? null) : childRef;
    const childWithRef = cloneElement(child, { ref: mergedRef } as Partial<{
      ref: Ref<HTMLButtonElement>;
    }>);

    return (
      // Popover.Trigger handles aria-expanded, aria-controls, and click/keydown
      // internally. We only override aria-haspopup to 'listbox' because the
      // content panel surfaces a listbox role, not a generic dialog.
      <Popover.Trigger aria-haspopup="listbox">{childWithRef}</Popover.Trigger>
    );
  },
);

// ----------------------------------------------------------------------------
// Content
// ----------------------------------------------------------------------------

function isGrouped(
  props: OptionsPickerContentProps,
): props is GroupedContentProps & SharedContentProps {
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

/**
 * The panel rendered inside the Popover. Provide either `options` (flat) OR
 * `groups` (grouped) — passing both is a TypeScript error. The panel hosts a
 * search bar, an options list, and (in multi mode) an Apply/Cancel footer.
 *
 * @example
 * <OptionsPicker.Content
 *   label="Filter events"
 *   groups={[{ id: 'auth', label: 'Authentication', tone: 'success', hint: 'auth.*', options: [...] }]}
 * />
 *
 * @example
 * // Flat options:
 * <OptionsPicker.Content
 *   label="Filter tenant"
 *   options={tenants.map((t) => ({ value: t.id, label: t.slug }))}
 * />
 */
const OptionsPickerContent = forwardRef<HTMLDivElement, OptionsPickerContentProps>(
  function OptionsPickerContent(props, ref) {
    const { label, className, searchPlaceholder = 'Filter…' } = props;
    const ctx = usePickerContext('Content');

    const contentId = ctx.contentId;

    const [draft, setDraft] = useState<string[]>(ctx.selected);
    const [filter, setFilter] = useState('');

    // Ref for the search input — used to focus it on open (see effect below).
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (ctx.open) {
        setDraft(ctx.selected);
        setFilter('');
      }
    }, [ctx.open, ctx.selected]);

    // Focus the search input on open. Deferred past Popover.Content's own
    // queueMicrotask that focuses the panel div, so our microtask runs after.
    useEffect(() => {
      if (ctx.open) {
        queueMicrotask(() => searchInputRef.current?.focus());
      }
    }, [ctx.open]);

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

    const visibleOptionsInOrder = useMemo<OptionsPickerOption[]>(() => {
      if (isGrouped(props)) return visibleGroups.flatMap((g) => g.visibleOptions);
      return visibleFlat;
    }, [props, visibleGroups, visibleFlat]);

    const [focusedValue, setFocusedValue] = useState<string | null>(null);

    useEffect(() => {
      if (!ctx.open) {
        setFocusedValue(null);
        return;
      }
      if (focusedValue && !visibleOptionsInOrder.some((o) => o.value === focusedValue)) {
        setFocusedValue(null);
      }
    }, [ctx.open, visibleOptionsInOrder, focusedValue]);

    const handleKeyDown = useCallback(
      (e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (visibleOptionsInOrder.length === 0) return;
        const idx = focusedValue
          ? visibleOptionsInOrder.findIndex((o) => o.value === focusedValue)
          : -1;
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = idx + 1 >= visibleOptionsInOrder.length ? 0 : idx + 1;
          setFocusedValue(visibleOptionsInOrder[next]!.value);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const next = idx <= 0 ? visibleOptionsInOrder.length - 1 : idx - 1;
          setFocusedValue(visibleOptionsInOrder[next]!.value);
        } else if (e.key === 'Home') {
          e.preventDefault();
          setFocusedValue(visibleOptionsInOrder[0]!.value);
        } else if (e.key === 'End') {
          e.preventDefault();
          setFocusedValue(visibleOptionsInOrder[visibleOptionsInOrder.length - 1]!.value);
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && ctx.mode === 'multi') {
          e.preventDefault();
          ctx.commit(draft);
        } else if (e.key === 'Enter' || e.key === ' ') {
          if (focusedValue) {
            e.preventDefault();
            toggle(focusedValue);
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setDraft(ctx.selected);
          ctx.cancel();
        }
      },
      [visibleOptionsInOrder, focusedValue, toggle, ctx, draft],
    );

    return (
      <Popover.Content
        ref={ref}
        className={clsx(styles.panel, className)}
        aria-label={label}
        onKeyDown={handleKeyDown}
      >
        <Stack gap="xs">
          <div className={styles.searchBar}>
            <Search size={14} aria-hidden className={styles.searchIcon} />
            <Input
              ref={searchInputRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.currentTarget.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
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

          <div
            className={styles.list}
            role="listbox"
            aria-multiselectable={ctx.mode === 'multi'}
            aria-activedescendant={focusedValue ? `${contentId}-opt-${focusedValue}` : undefined}
          >
            {!hasAnyVisible && (
              <Text size="sm" tone="muted" className={styles.empty}>
                {props.emptyState ?? 'No matches'}
              </Text>
            )}
            {hasAnyVisible &&
              isGrouped(props) &&
              visibleGroups.map((g) => (
                <div key={g.id} className={styles.group}>
                  {ctx.mode === 'multi' ? (
                    <button
                      type="button"
                      className={styles.groupHeader}
                      aria-pressed={tristate(
                        g.options.map((o) => o.value),
                        draft,
                      )}
                      aria-label={`Toggle group ${g.label}`}
                      aria-controls={g.options.map((o) => `${contentId}-opt-${o.value}`).join(' ')}
                      onClick={() => toggleGroup(g.options)}
                    >
                      <Badge
                        tone={g.tone ?? 'neutral'}
                        dot="start"
                        size="sm"
                        className={styles.groupDot}
                      />
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
                      <Badge
                        tone={g.tone ?? 'neutral'}
                        dot="start"
                        size="sm"
                        className={styles.groupDot}
                      />
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
                    <OptionRow
                      key={opt.value}
                      option={opt}
                      checked={draft.includes(opt.value)}
                      mode={ctx.mode}
                      rowId={`${contentId}-opt-${opt.value}`}
                      focused={focusedValue === opt.value}
                      onToggle={toggle}
                    />
                  ))}
                </div>
              ))}
            {hasAnyVisible &&
              !isGrouped(props) &&
              visibleFlat.map((opt) => (
                <OptionRow
                  key={opt.value}
                  option={opt}
                  checked={draft.includes(opt.value)}
                  mode={ctx.mode}
                  rowId={`${contentId}-opt-${opt.value}`}
                  focused={focusedValue === opt.value}
                  onToggle={toggle}
                />
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
                <Button variant="primary" size="sm" onClick={() => ctx.commit(draft)}>
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
  rowId: string;
  focused: boolean;
  onToggle: (value: string) => void;
}

function OptionRow({ option, checked, mode, rowId, focused, onToggle }: OptionRowProps) {
  const checkboxOnChange = useCallback(() => onToggle(option.value), [onToggle, option.value]);
  const radioOnChange = useCallback(() => onToggle(option.value), [onToggle, option.value]);
  // Pass the label THROUGH Checkbox/Radio so the whole text becomes part of the
  // native <label> click target — clicking the text toggles the option (I8).
  return (
    <div
      id={rowId}
      className={clsx(styles.row, checked && styles.rowSelected, focused && styles.rowFocused)}
    >
      {mode === 'multi' ? (
        <Checkbox
          checked={checked}
          onChange={checkboxOnChange}
          label={<Text size="sm">{option.label}</Text>}
        />
      ) : (
        <Radio
          value={option.value}
          checked={checked}
          onChange={radioOnChange}
          label={<Text size="sm">{option.label}</Text>}
        />
      )}
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
