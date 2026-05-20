import {
  forwardRef,
  useCallback,
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
import { flattenOptions, findOption, findOptions } from './utils';
import { Trigger } from './Trigger';
import { Listbox } from './Listbox';

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

  // ─── mode ─────────────────────────────────────────────────────────────────
  multiple?: boolean;
  triggerDisplay?: SelectTriggerDisplay;
  searchable?: boolean;
  creatable?: boolean;

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
    multiple = false,
    triggerDisplay = 'chips',
    searchable = false,
    creatable = false,
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
    name: _name,
    required: _required,
    form: _form,
    renderOption,
    renderValue,
    renderTag,
    renderEmpty,
    renderLoading,
    renderError,
    className,
    ...rest
  } = props;

  // `_name` / `_required` / `_form` are accepted in the prop surface so the
  // public API is stable across phases; form integration is wired in Phase 9.
  void _name;
  void _required;
  void _form;

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
  const state = useSelectState({
    multiple,
    value: controlledValue,
    defaultValue,
    onChange: (v) => {
      if (multiple) {
        const opts = findOptions(options, Array.isArray(v) ? v : []);
        onChange?.(v, opts);
      } else {
        const opt = typeof v === 'string' && v !== '' ? findOption(options, v) : null;
        onChange?.(v, opt);
      }
    },
    open: controlledOpen,
    defaultOpen,
    onOpenChange,
  });

  const allRows = useMemo(() => flattenOptions(options), [options]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [query, setQuery] = useState<string>('');

  // When `searchable`, filter `allRows` by the query (case-insensitive
  // substring on label OR description). Group headers are retained only
  // when at least one option underneath them matches — a header sitting
  // alone in the listbox is noise.
  //
  // Empty query short-circuits to the unfiltered list so the open-effect
  // in Listbox lands on the user's selected row, and so the first
  // ArrowDown after open lands on row 0 instead of row 0-of-filtered.
  const rows = useMemo(() => {
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
  }, [allRows, searchable, query]);

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
    rows,
    allRows,
    loading: false,
    error: null,
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
    retry: () => {},
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
