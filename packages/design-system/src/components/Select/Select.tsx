import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import clsx from 'clsx';
import styles from './Select.module.scss';
import { SelectContext, type SelectContextValue } from './context';
import { sanitizeId } from '../_internal/refs';
import { useSelectState } from './useSelectState';
import { useAsyncOptions } from './useAsyncOptions';
import { flattenOptions, findOption, findOptions, hasExactLabelMatch } from './utils';
import type { FlatRow } from './utils';
import { Trigger } from './Trigger';
import { Listbox } from './Listbox';
import { HiddenInputs } from './HiddenInputs';

/**
 * Visual size of the trigger. Mirrors `<Input>` and `<Button>` sizes.
 * - `'sm'` — 24px tall; dense toolbars and tables.
 * - `'md'` — 32px tall (default).
 * - `'lg'` — 40px tall; hero-form prominence.
 */
export type SelectSize = 'sm' | 'md' | 'lg';

/**
 * How a multi-select renders its selections inside the trigger.
 * - `'chips'` — inline removable chips; wraps vertically as needed (default).
 * - `'summary'` — comma-joined labels with ellipsis on overflow; reads as a single line.
 */
export type SelectTriggerDisplay = 'chips' | 'summary';

/**
 * One row of selectable data.
 *
 * `value` is the identity that `onChange` emits and that `value` /
 * `defaultValue` reference. `label` is what the user sees and what
 * the substring filter searches against. `data` is an opaque payload
 * that flows through to `renderOption`, `renderValue`, and `renderTag`.
 */
export interface SelectOption<T = unknown> {
  /** Unique key. What `onChange` emits. */
  value: string;
  /** Displayed text. Used for substring search when `searchable` is on. */
  label: string;
  /** Optional secondary line shown under the label in default render. */
  description?: string;
  /** When true, the option is dimmed, `aria-disabled`, and skipped in keyboard nav. */
  disabled?: boolean;
  /** Arbitrary payload — surfaces in `renderOption`, `renderValue`, `renderTag`. */
  data?: T;
}

/**
 * A labelled bucket of options. Use grouped input when you want a header
 * row to appear above a chunk of options. Mixing flat options and groups
 * at the same level is not supported — the input must be all-flat or
 * all-grouped.
 */
export interface SelectGroup<T = unknown> {
  /** Header text shown above the group's options. */
  label: string;
  /** Members of the group. */
  options: SelectOption<T>[];
}

/**
 * Either a flat list of options or a list of groups, discriminated at
 * runtime by inspecting whether the first element has an `options` field.
 */
export type SelectOptions<T = unknown> = SelectOption<T>[] | SelectGroup<T>[];

export interface SelectProps<T = unknown> extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'defaultValue'
> {
  // ─── data ─────────────────────────────────────────────────────────────────
  /**
   * Sync options — flat list or list of groups. Ignored when `loadOptions`
   * is provided (dev warning fires if both are non-empty). For grouped
   * input, every element must carry an `options` field; mixing flat options
   * with groups at the same level is not supported.
   */
  options?: SelectOptions<T>;

  // ─── async data ───────────────────────────────────────────────────────────
  /**
   * Async fetcher that returns the options for a given query. When set, the
   * Select switches to async mode: the local substring filter is bypassed
   * (the server filters), loading/error/empty rows replace the listbox
   * body, and `options` is ignored (with a dev warning). The `signal`
   * argument is aborted whenever a newer query supersedes this one — wire
   * it through to `fetch` to cancel in-flight requests.
   */
  loadOptions?: (query: string, signal: AbortSignal) => Promise<SelectOptions<T>>;
  /**
   * When `true` (default), defers the first `loadOptions` call until the
   * user opens the listbox. Set to `false` to fetch eagerly on mount.
   */
  loadOnOpen?: boolean;
  /**
   * Debounce window (ms) between the last query keystroke and the next
   * `loadOptions` call. Default `250`.
   */
  searchDebounceMs?: number;

  // ─── mode ─────────────────────────────────────────────────────────────────
  /**
   * Enables multi-select. `value` / `defaultValue` become `string[]` and
   * `onChange` emits arrays. Picking a row toggles it in/out of the
   * selection instead of replacing-and-closing.
   */
  multiple?: boolean;
  /**
   * How the trigger renders the selected value(s) in multi mode. Ignored
   * in single mode. See `SelectTriggerDisplay`. Defaults to `'chips'`.
   */
  triggerDisplay?: SelectTriggerDisplay;
  /**
   * Renders the trigger as a combobox text input with substring filtering
   * over the (sync) options. In async mode the filter is delegated to the
   * server. Required by `creatable`.
   */
  searchable?: boolean;
  /**
   * When the searchable combobox opens, select the current text so the user
   * can immediately type to replace it (type-to-search). Default `false`.
   * Only affects the single searchable trigger.
   */
  selectOnOpen?: boolean;
  /**
   * Adds a "+ Create <query>" row when the trimmed query has no exact
   * label match. Activating it fires `onCreate(label)` and folds the new
   * value into the selection. Requires `searchable` (throws in dev otherwise).
   */
  creatable?: boolean;
  /**
   * Fires when the user activates the "+ Create" row (creatable mode).
   * The trimmed query string is passed as `label`. After this fires,
   * the Select also calls `onChange` with the new value: in single mode
   * the value replaces the current selection and the listbox closes; in
   * multi mode the value is appended to the current selection and the
   * query is cleared.
   *
   * Consumers typically use this hook to persist the new option upstream
   * (e.g. POST to a backend) and reconcile their `options` array.
   */
  onCreate?: (label: string) => void;

  // ─── value ────────────────────────────────────────────────────────────────
  /**
   * Controlled selection. `string` in single mode, `string[]` in multi.
   * Provide alongside `onChange` to drive the value externally.
   */
  value?: string | string[];
  /**
   * Initial selection for uncontrolled usage. `string` in single mode,
   * `string[]` in multi. Ignored when `value` is provided.
   */
  defaultValue?: string | string[];
  /**
   * Fires when the selection changes. The first argument is the next
   * value (`string` in single mode, `string[]` in multi). The second
   * argument is the matched `SelectOption` (single), the matched array
   * (multi), or `null` when the selection clears in single mode. For
   * creatable rows not present in `options`, a synthetic
   * `{ value, label: value }` is supplied.
   */
  onChange?: (value: string | string[], option: SelectOption<T> | SelectOption<T>[] | null) => void;

  // ─── open state (controlled, rare) ────────────────────────────────────────
  /**
   * Controlled open state. Pair with `onOpenChange`. Omit both to let
   * Select own its open state (the common case).
   */
  open?: boolean;
  /** Initial open state for uncontrolled usage. Defaults to `false`. */
  defaultOpen?: boolean;
  /** Fires whenever Select wants to change open state. */
  onOpenChange?: (open: boolean) => void;

  // ─── visuals ──────────────────────────────────────────────────────────────
  /** Trigger height + type scale. See `SelectSize`. Defaults to `'md'`. */
  size?: SelectSize;
  /**
   * Marks the trigger as invalid — applies the error border + sets
   * `aria-invalid="true"`. Pair with an external error message linked via
   * `aria-describedby`.
   */
  invalid?: boolean;
  /**
   * Placeholder shown when nothing is selected. In searchable mode, also
   * the input's `placeholder` until the user types.
   */
  placeholder?: string;
  /**
   * Shows a `✕` button in the trigger that clears the selection. Opt-in:
   * defaults to `false`. Always forced `false` when `disabled` or `readOnly`.
   */
  clearable?: boolean;

  // ─── states ───────────────────────────────────────────────────────────────
  /**
   * Disables the trigger entirely — non-interactive, dimmed, focusable
   * only via assistive tech. Hidden form inputs are also disabled.
   */
  disabled?: boolean;
  /**
   * Read-only — trigger is focusable but cannot open or change the
   * selection. Useful for displaying a value inside a form that's not yet
   * editable.
   */
  readOnly?: boolean;

  // ─── form integration ─────────────────────────────────────────────────────
  /**
   * Name attribute for native form submission. In multi mode, one hidden
   * `<input>` per selected value is emitted (so `FormData.getAll(name)`
   * returns the array).
   */
  name?: string;
  /**
   * Marks the field as required. The trigger exposes `aria-required="true"` to
   * assistive technology. Hidden inputs still serialize named values, but they do
   * not participate in native constraint validation; validate the selection in
   * your form layer.
   */
  required?: boolean;
  /** `form` attribute forwarded to the hidden `<input>` elements. */
  form?: string;

  // ─── render escape hatches ────────────────────────────────────────────────
  /**
   * Custom renderer for a row inside the listbox. Receives the option and
   * its current `{ active, selected }` state (active = keyboard-focused
   * row, selected = part of the current value). The returned node
   * replaces the default label / description layout — chrome (padding,
   * background, `aria-*`) stays.
   */
  renderOption?: (opt: SelectOption<T>, state: { active: boolean; selected: boolean }) => ReactNode;
  /**
   * Custom renderer for the selected value inside the single-mode trigger.
   * Ignored in multi mode (see `renderTag`).
   */
  renderValue?: (opt: SelectOption<T>) => ReactNode;
  /**
   * Custom renderer for a chip inside the multi-mode `chips` trigger.
   * Receives the option and a `remove` callback that deselects it. Ignored
   * in single mode and in `triggerDisplay='summary'`.
   */
  renderTag?: (opt: SelectOption<T>, remove: () => void) => ReactNode;
  /**
   * Custom empty-state renderer. Fires when the filtered listbox has no
   * rows. Receives the current trimmed query for use in messages like
   * "No matches for 'foo'".
   */
  renderEmpty?: (query: string) => ReactNode;
  /** Custom loading-state renderer for async mode. */
  renderLoading?: () => ReactNode;
  /**
   * Custom error-state renderer for async mode. Receives the thrown
   * `Error` and a `retry` callback that re-invokes `loadOptions` with the
   * current query.
   */
  renderError?: (err: Error, retry: () => void) => ReactNode;

  // ─── ARIA ─────────────────────────────────────────────────────────────────
  /**
   * Accessible name for the trigger. Use this when a visible `<label>` is
   * not present. Mutually exclusive with `aria-labelledby`.
   */
  'aria-label'?: string;
  /**
   * ID of an element that labels the trigger. Use when the label is a
   * sibling node (e.g. a `<Field>` label).
   */
  'aria-labelledby'?: string;
  /**
   * ID of an element that describes the trigger — e.g. an error message
   * or helper hint paired with `invalid`.
   */
  'aria-describedby'?: string;
}

const SelectImpl = forwardRef<HTMLDivElement, SelectProps>(function Select(
  props: SelectProps,
  ref: Ref<HTMLDivElement>,
) {
  const {
    options = [],
    loadOptions,
    loadOnOpen = true,
    searchDebounceMs = 250,
    multiple = false,
    triggerDisplay = 'chips',
    searchable = false,
    creatable = false,
    onCreate,
    value: controlledValue,
    defaultValue,
    onChange,
    open: controlledOpen,
    defaultOpen,
    onOpenChange,
    size = 'md',
    invalid = false,
    placeholder,
    clearable,
    selectOnOpen = false,
    disabled = false,
    readOnly = false,
    name,
    required,
    form,
    'aria-required': ariaRequired,
    renderOption,
    renderValue,
    renderTag,
    renderEmpty,
    renderLoading,
    renderError,
    className,
    ...rest
  } = props;

  // Dev-only invariant: a creatable picker without a search input has no
  // way to capture the new label. Throw early so the misconfiguration is
  // obvious during development; stripped in prod builds.
  if (process.env.NODE_ENV !== 'production' && creatable && !searchable) {
    throw new Error(
      '<Select>: `creatable` requires `searchable`. A creatable picker without a search input has no way to capture the new label.',
    );
  }

  const reactId = useId();
  const idBase = sanitizeId(reactId);
  const listboxId = `select-listbox-${idBase}`;
  const triggerId = `select-trigger-${idBase}`;
  const getOptionId = useCallback((v: string) => `select-opt-${idBase}-${sanitizeId(v)}`, [idBase]);
  const getGroupHeaderId = useCallback(
    (label: string) => `select-grp-${idBase}-${sanitizeId(label)}`,
    [idBase],
  );

  // `onChange` is wrapped to look up the SelectOption(s) and pass them as
  // the second arg. `findOption` / `findOptions` are O(n); for the option
  // counts a Select handles in practice this is fine and keeps the public
  // API ergonomic (consumers get the matched payload, not just the id).
  //
  // Creatable: when the user accepts the "+ Create" row, the new value is
  // not in `options`. Back-fill a synthetic `{ value: v, label: v }` so
  // consumers still receive a stable option payload for the new row —
  // mirrors the shape the create-row carries internally.
  const state = useSelectState({
    multiple,
    value: controlledValue,
    defaultValue,
    onChange: (v) => {
      if (multiple) {
        const values = Array.isArray(v) ? v : [];
        const found = findOptions(options, values);
        const byValue = new Map(found.map((o) => [o.value, o]));
        const opts = values.map((val) => byValue.get(val) ?? { value: val, label: val });
        onChange?.(v, opts);
      } else {
        if (typeof v === 'string' && v !== '') {
          const opt = findOption(options, v) ?? { value: v, label: v };
          onChange?.(v, opt);
        } else {
          onChange?.(v, null);
        }
      }
    },
    open: controlledOpen,
    defaultOpen,
    onOpenChange,
  });

  // Dev-only sanity check: a Select can't sensibly take both `options` and
  // `loadOptions`. We pick `loadOptions` (the more specific API) and warn
  // so the consumer notices their config conflict during dev. Stripped in
  // prod builds by the bundler dead-code path.
  if (
    process.env.NODE_ENV !== 'production' &&
    loadOptions &&
    Array.isArray(options) &&
    options.length > 0
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      '<Select> received both `options` and `loadOptions`. `loadOptions` wins; `options` is ignored.',
    );
  }

  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [query, setQuery] = useState<string>('');

  // `hasOpenedOnce` gates the first async fetch. The `loadOnOpen` semantic
  // is: don't fetch anything until the user opens the popover at least
  // once. `loadOnOpen=false` flips the gate immediately on mount.
  const [hasOpenedOnce, setHasOpenedOnce] = useState<boolean>(!loadOnOpen);
  useEffect(() => {
    if (state.open && !hasOpenedOnce) setHasOpenedOnce(true);
  }, [state.open, hasOpenedOnce]);

  const asyncEnabled = !!loadOptions && hasOpenedOnce;
  const asyncResult = useAsyncOptions({
    loadOptions,
    query,
    enabled: asyncEnabled,
    debounceMs: searchDebounceMs,
  });

  // In async mode, the backend's response replaces the local `options`
  // entirely. The label cache for already-selected values is a Phase 8+
  // concern — chips may temporarily render `<unknown>` while the latest
  // server response filters their option out.
  const effectiveOptions = loadOptions ? asyncResult.options : options;
  const allRows = useMemo(() => flattenOptions(effectiveOptions), [effectiveOptions]);

  // When `searchable`, filter `allRows` by the query (case-insensitive
  // substring on label OR description). Group headers are retained only
  // when at least one option underneath them matches — a header sitting
  // alone in the listbox is noise.
  //
  // Empty query short-circuits to the unfiltered list so the open-effect
  // in Listbox lands on the user's selected row, and so the first
  // ArrowDown after open lands on row 0 instead of row 0-of-filtered.
  const rows = useMemo(() => {
    // Async mode: the backend already filtered to the current query, so
    // local re-filtering would double-filter (e.g. backend matches by
    // word-prefix, we'd then drop rows whose label doesn't contain the
    // exact substring).
    if (loadOptions) return allRows;
    if (!searchable || query.trim() === '') return allRows;
    const q = query.toLowerCase();
    const out: typeof allRows = [];
    let pendingHeader: (typeof allRows)[number] | null = null;
    for (const row of allRows) {
      if (row.kind === 'header') {
        pendingHeader = row;
        continue;
      }
      const matches =
        row.option.label.toLowerCase().includes(q) ||
        (row.option.description?.toLowerCase().includes(q) ?? false);
      if (matches) {
        if (pendingHeader) {
          out.push(pendingHeader);
          pendingHeader = null;
        }
        out.push(row);
      }
    }
    return out;
  }, [allRows, searchable, query, loadOptions]);

  // Creatable: compute an extra "+ Create <query>" row when the trimmed
  // query has no exact label match in the available options AND, in multi
  // mode, isn't already in the current selection. The sentinel
  // `{ __create: true }` on `data` is what `isCreateRow` matches, and what
  // the listbox + keyboard handlers branch on to fire `onCreate` instead
  // of the normal select/toggle flow.
  const createRow: FlatRow | null = useMemo(() => {
    const trimmed = query.trim();
    if (!creatable || !searchable || trimmed === '') return null;
    if (hasExactLabelMatch(effectiveOptions, trimmed)) return null;
    if (multiple) {
      const currentValues = Array.isArray(state.value) ? (state.value as string[]) : [];
      if (currentValues.some((v) => v.toLowerCase() === trimmed.toLowerCase())) return null;
    }
    return {
      kind: 'option' as const,
      option: {
        value: trimmed,
        label: trimmed,
        data: { __create: true } as unknown,
      },
    };
  }, [creatable, searchable, query, effectiveOptions, multiple, state.value]);

  // Append the create row to the end of the filtered (or async) rows. The
  // unfiltered `allRows` deliberately does NOT include the create row —
  // chip / summary label lookups walk `allRows` and the create row has no
  // selected counterpart there.
  const rowsWithCreate = useMemo(() => {
    return createRow ? [...rows, createRow] : rows;
  }, [rows, createRow]);

  // #309: filtering while open rebuilds `rows`, but `activeIndex` is a flat
  // index — keeping it points the highlight at whatever row now occupies
  // that slot (or past the end, hiding it). Re-seed to the first selectable
  // row whenever the QUERY changes while open. The open transition is
  // excluded (the Listbox open-seed effect highlights the current selection
  // there); non-query row changes (multi toggle, async refresh with the
  // same query) keep the cursor.
  // ponytail: in async mode this fires against the pre-fetch rows (results
  // land after the debounce); first-selectable is almost always index 0
  // either way. Re-seed on async arrival too if a palette with leading
  // disabled rows ever makes this visible.
  const prevQueryRef = useRef(query);
  useEffect(() => {
    if (prevQueryRef.current === query) return;
    prevQueryRef.current = query;
    if (!state.open) return;
    setActiveIndex(rowsWithCreate.findIndex((r) => r.kind === 'option' && !r.option.disabled));
    // rowsWithCreate is read fresh (it recomputes in the same render as the
    // query) but must not itself re-trigger the reseed — non-query row
    // changes keep the cursor (see above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, state.open]);

  // Safety net for every OTHER row-shrink path (async results landing after
  // arrow-key navigation, a mid-open `options` prop change): a cursor past
  // the end of the rebuilt list is meaningless — re-seed it. Never fires for
  // an in-bounds cursor, so it cannot steal a valid position.
  useEffect(() => {
    if (!state.open || activeIndex < rowsWithCreate.length) return;
    setActiveIndex(rowsWithCreate.findIndex((r) => r.kind === 'option' && !r.option.disabled));
  }, [state.open, activeIndex, rowsWithCreate]);

  const triggerRef = useRef<HTMLElement | null>(null);
  const triggerRootRef = useRef<HTMLElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);

  // `clearable` is opt-in: the ✕ clear button defaults OFF and only shows when a
  // consumer explicitly sets `clearable`. `disabled` / `readOnly` always suppress it
  // (the trigger is non-interactive in those states).
  const effectiveClearable = (clearable ?? false) && !disabled && !readOnly;

  // Defined inline rather than via useCallback because it captures the
  // current `setOpen` and `triggerRef` — both stable identities — and is
  // only consumed downstream via context, which already memoizes nothing.
  const closeAndFocusTrigger = () => {
    state.setOpen(false);
    queueMicrotask(() => triggerRef.current?.focus({ preventScroll: true }));
  };

  const ctxValue: SelectContextValue = {
    multiple,
    searchable,
    creatable,
    triggerDisplay,
    rows: rowsWithCreate,
    allRows,
    loading: loadOptions ? asyncResult.loading : false,
    error: loadOptions ? asyncResult.error : null,
    value: state.value,
    setValue: state.setValue,
    toggleValue: state.toggleValue,
    open: state.open,
    setOpen: state.setOpen,
    activeIndex,
    setActiveIndex,
    query,
    setQuery,
    listboxId,
    triggerId,
    getOptionId,
    getGroupHeaderId,
    triggerRef,
    triggerRootRef,
    listboxRef,
    closeAndFocusTrigger,
    retry: asyncResult.retry,
    onCreate,
    renderOption: renderOption as SelectContextValue['renderOption'],
    renderValue: renderValue as SelectContextValue['renderValue'],
    renderTag: renderTag as SelectContextValue['renderTag'],
    renderEmpty,
    renderLoading,
    renderError,
  };

  return (
    <SelectContext.Provider value={ctxValue}>
      <div
        ref={ref}
        {...rest}
        className={clsx(
          styles.root,
          styles[`size-${size}`],
          invalid && styles.invalid,
          disabled && styles.disabled,
          readOnly && styles.readOnly,
          className,
        )}
      >
        <Trigger
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          invalid={invalid}
          clearable={effectiveClearable}
          selectOnOpen={selectOnOpen}
          aria-label={props['aria-label']}
          aria-labelledby={props['aria-labelledby']}
          aria-describedby={props['aria-describedby']}
          aria-required={required ? true : ariaRequired}
        />
        {state.open && <Listbox />}
        <HiddenInputs
          name={name}
          value={state.value}
          multiple={multiple}
          required={required ?? false}
          form={form}
          disabled={disabled}
        />
      </div>
    </SelectContext.Provider>
  );
});

/**
 * Value picker — covers single, multi (chips and summary), searchable,
 * grouped, async-loaded, and creatable patterns in one component.
 * Implements the WAI-ARIA combobox 1.2 pattern with a `role="listbox"`
 * popup, full keyboard navigation (Arrow keys, Home/End, typeahead,
 * Enter/Space to select, Escape to dismiss), and ARIA wiring suitable for
 * screen readers.
 *
 * The mode matrix is `multiple` × `triggerDisplay: 'chips' | 'summary'` ×
 * `searchable`. Tag-input is the composition
 * `multiple + searchable + creatable + triggerDisplay='chips'`.
 *
 * @example
 * // Single, non-searchable status picker
 * <Select
 *   options={[{ value: 'active', label: 'Active' }, { value: 'pending', label: 'Pending' }]}
 *   value={status}
 *   onChange={(v) => setStatus(v as Status)}
 *   placeholder="Pick a status"
 * />
 *
 * @example
 * // Async assignee picker with custom rendering
 * <Select
 *   searchable
 *   loadOptions={async (q, signal) => {
 *     const users = await api.searchUsers(q, { signal });
 *     return users.map((u) => ({ value: u.id, label: u.name, data: u }));
 *   }}
 *   renderOption={(opt) => (
 *     <Cluster gap="sm">
 *       <Avatar name={opt.label} src={opt.data?.avatarUrl} size="sm" />
 *       <span>{opt.label}</span>
 *     </Cluster>
 *   )}
 *   value={assigneeId}
 *   onChange={(id) => setAssigneeId(id as string)}
 * />
 *
 * @example
 * // Tag input with creatable
 * <Select
 *   multiple
 *   searchable
 *   creatable
 *   options={existingTags}
 *   value={tags}
 *   onChange={(v) => setTags(v as string[])}
 *   onCreate={(label) => api.tags.create({ label })}
 *   placeholder="Add tags…"
 * />
 *
 * @remarks When NOT to use
 * - For action menus (Edit / Delete / Duplicate) → use `<DropdownMenu>`.
 * - For free-form text with no constrained value set → use `<Input>`.
 * - For yes/no/maybe with strong defaults → use `<Tabs>` or radio buttons.
 *
 * @remarks Anti-patterns
 * - ❌ Passing both `options` and `loadOptions`. `loadOptions` always
 *   wins; the conflict is logged as a dev warning.
 * - ❌ `creatable` without `searchable`. There's no way to capture the
 *   new label without a search input. Throws in dev.
 * - ❌ Using `triggerDisplay='summary'` for tag input. Summary collapses
 *   the active set into a comma-joined line; chips communicate selection
 *   at a glance and expose per-item remove affordances.
 * - ❌ Embedding stale-closure business logic in `loadOptions`. The
 *   fetcher is called on every debounced query — read fresh props from a
 *   stable reference (e.g. `useCallback` in the consumer) instead of
 *   capturing values that drift.
 *
 * @remarks Keyboard limitations (v1)
 * - In chips-mode, Backspace on an empty input removes the trailing chip;
 *   full chip-to-chip arrow navigation (ArrowLeft from empty input stepping
 *   into chips, ArrowLeft/Right cycling chips) is not implemented in v1.
 */
// `Select` is exposed via a cast so the public type is generic over `T`
// — `forwardRef` does not preserve the generic parameter through its own
// signature. Internally `SelectImpl` is the forwardRef component; the cast
// only rewrites its type surface. Do not "fix" this by dropping the cast —
// you'll lose the `T` inference that flows from `options` into `onChange`'s
// option payload.
export const Select = SelectImpl as <T = unknown>(
  props: SelectProps<T> & { ref?: Ref<HTMLDivElement> },
) => React.ReactElement;
