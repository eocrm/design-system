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

/** Trigger height + type-scale step. Mirrors `<Input>`'s `size`. */
export type SelectSize = 'sm' | 'md' | 'lg';

/**
 * How multi-select renders the selected value(s) inside the trigger.
 * - `'chips'` — render one removable chip per value (the default).
 * - `'summary'` — render a single condensed string like "Foo, Bar, …".
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
  options?: SelectOptions<T>;

  // ─── async data ───────────────────────────────────────────────────────────
  /**
   * Async fetcher that returns the options for a given query. When set, the
   * Select switches to async mode: the local substring filter is bypassed
   * (the server filters), loading/error/empty rows replace the listbox
   * body, and `options` is ignored (with a dev warning).
   */
  loadOptions?: (query: string, signal: AbortSignal) => Promise<SelectOptions<T>>;
  /**
   * When `true` (default), defers the first `loadOptions` call until the
   * user opens the listbox. Set to `false` to fetch eagerly on mount.
   */
  loadOnOpen?: boolean;
  /**
   * Debounce window (ms) between the last `query` keystroke and the next
   * `loadOptions` call. Default 250 ms.
   */
  searchDebounceMs?: number;

  // ─── mode ─────────────────────────────────────────────────────────────────
  multiple?: boolean;
  triggerDisplay?: SelectTriggerDisplay;
  searchable?: boolean;
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
  value?: string | string[];
  defaultValue?: string | string[];
  onChange?: (value: string | string[], option: SelectOption<T> | SelectOption<T>[] | null) => void;

  // ─── open state (controlled, rare) ────────────────────────────────────────
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  // ─── visuals ──────────────────────────────────────────────────────────────
  size?: SelectSize;
  invalid?: boolean;
  placeholder?: string;
  clearable?: boolean;

  // ─── states ───────────────────────────────────────────────────────────────
  disabled?: boolean;
  readOnly?: boolean;

  // ─── form integration (wired in later phases) ─────────────────────────────
  name?: string;
  required?: boolean;
  form?: string;

  // ─── render escape hatches (wired in later phases) ────────────────────────
  renderOption?: (opt: SelectOption<T>, state: { active: boolean; selected: boolean }) => ReactNode;
  renderValue?: (opt: SelectOption<T>) => ReactNode;
  renderTag?: (opt: SelectOption<T>, remove: () => void) => ReactNode;
  renderEmpty?: (query: string) => ReactNode;
  renderLoading?: () => ReactNode;
  renderError?: (err: Error, retry: () => void) => ReactNode;

  // ─── ARIA ─────────────────────────────────────────────────────────────────
  'aria-label'?: string;
  'aria-labelledby'?: string;
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
    disabled = false,
    readOnly = false,
    name,
    required,
    form,
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

  const triggerRef = useRef<HTMLElement | null>(null);
  const listboxRef = useRef<HTMLUListElement | null>(null);

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
          clearable={clearable}
          aria-label={props['aria-label']}
          aria-labelledby={props['aria-labelledby']}
          aria-describedby={props['aria-describedby']}
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
 * `<Select>` — combo of trigger + popover listbox.
 *
 * Phase 2 covers the single-value, non-searchable, sync-options shape:
 * button-styled trigger that opens a portaled listbox. Click an option
 * (or `Enter` on the active row) to select; `Escape` / outside click
 * dismisses. The full prop surface is declared on `SelectProps` so the
 * type-level contract is stable across later phases.
 *
 * @example
 *   const [status, setStatus] = useState('');
 *   <Select
 *     options={STATUSES}
 *     value={status}
 *     onChange={(v) => setStatus(v as string)}
 *     placeholder="Pick one"
 *   />
 */
export const Select = SelectImpl as <T = unknown>(
  props: SelectProps<T> & { ref?: Ref<HTMLDivElement> },
) => React.ReactElement;
