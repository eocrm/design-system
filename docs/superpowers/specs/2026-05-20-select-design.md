# Select — design

**Status:** approved, ready for plan
**Author:** dpws + Claude
**Date:** 2026-05-20
**Scope:** new component `packages/design-system/src/components/Select/`

## Goal

Ship `<Select>` — the Select/Combobox primitive listed first in the wishlist in `packages/design-system/CLAUDE.md`. One generalist component that covers the three high-frequency CRM use cases: form-field value pickers, table-filter multi-selects, and tag-input fields. Hand-rolled on `@floating-ui/react-dom` (same as `<DropdownMenu>` and `<Popover>`), declarative API with render-prop escape hatches, full WAI-ARIA combobox 1.2 semantics.

## Non-goals

- **No virtualization in v1.** Long lists render every option. Revisit when CRM hits a real 500+ option case.
- **No sticky group headers** while scrolling the listbox. Headers scroll with content. Cheap to add later if needed.
- **No "Select all" / "Clear all"** affordances inside the listbox.
- **No max-selections cap** in v1.
- **No async pagination** ("load more on scroll"). `loadOptions` returns the full set per query.
- **No `minSearchChars` gate.** Consumer can early-return `[]` from `loadOptions` when the query is too short.
- **No `searchPlacement` override.** Search lives in the trigger for input-style modes (combobox single, chips-multi) and inside the popover for button-style modes (summary-multi). Not configurable.
- **No async `onCreate`.** Creatable rows fire `onCreate(label)` and add `{ value: label, label }` to the selection optimistically. Consumer persists on their own; if persistence fails they remove the value externally.
- **No native mobile fallback** to `<select>`. The combobox UI is used on every viewport.
- **No multi-select chips _outside_ the trigger.** Selections always live in the trigger (chips or summary).
- **No animation on close.** Same posture as DropdownMenu / Tooltip / Popover — panel unmounts immediately.

## Public API

```tsx
import { Select } from '@eocrm/design-system';

// 1. Form field — single, no search:
<Select
  options={[
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'archived', label: 'Archived' },
  ]}
  value={status}
  onChange={(v) => setStatus(v as Status)}
  placeholder="Pick a status"
/>;

// 2. Form field — single, searchable, grouped:
<Select
  searchable
  options={[
    { label: 'Americas', options: [{ value: 'us', label: 'United States' }, ...] },
    { label: 'Europe',   options: [{ value: 'de', label: 'Germany' }, ...] },
  ]}
  value={country}
  onChange={(v) => setCountry(v as CountryCode)}
/>;

// 3. Assignee picker — single, async:
<Select
  searchable
  loadOptions={async (q, signal) => {
    const users = await api.searchUsers(q, { signal });
    return users.map((u) => ({ value: u.id, label: u.name, data: u }));
  }}
  renderOption={(opt) => (
    <Cluster gap="sm">
      <Avatar name={opt.label} src={opt.data?.avatarUrl} size="sm" />
      <span>{opt.label}</span>
    </Cluster>
  )}
  value={assigneeId}
  onChange={(id) => setAssigneeId(id as string)}
/>;

// 4. Table filter — multi, summary, searchable:
<Select
  multiple
  triggerDisplay="summary"
  searchable
  options={statusOptions}
  value={selected}
  onChange={(values) => setSelected(values as string[])}
  placeholder="Filter by status"
/>;

// 5. Tag input — multi, chips, searchable, creatable:
<Select
  multiple
  triggerDisplay="chips"
  searchable
  creatable
  options={existingTags}
  value={tags}
  onChange={(values) => setTags(values as string[])}
  onCreate={(label) => api.tags.create({ label })}
  placeholder="Add tags…"
/>;
```

### Types

```ts
export type SelectSize = 'sm' | 'md' | 'lg';
export type SelectTriggerDisplay = 'chips' | 'summary';

export type SelectOption<T = unknown> = {
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
};

export type SelectGroup<T = unknown> = {
  /** Header text shown above the group's options. */
  label: string;
  /** Members of the group. */
  options: SelectOption<T>[];
};

/**
 * Discriminated at runtime: if the first element has an `options` field, it's a grouped shape.
 * Mixing groups and ungrouped options at the same level is not supported.
 */
export type SelectOptions<T = unknown> = SelectOption<T>[] | SelectGroup<T>[];

export type SelectProps<T = unknown> = {
  // ─── data ─────────────────────────────────────────────────────────────────
  options?: SelectOptions<T>;
  loadOptions?: (query: string, signal: AbortSignal) => Promise<SelectOptions<T>>;
  /** Fire `loadOptions('', signal)` on first open. Default `true`. Ignored when no `loadOptions`. */
  loadOnOpen?: boolean;
  /** Debounce window for `loadOptions` calls and local-filter recomputation. Default `250`. */
  searchDebounceMs?: number;

  // ─── mode ─────────────────────────────────────────────────────────────────
  /** Default `false`. When `true`, `value`/`onChange` operate on `string[]`. */
  multiple?: boolean;
  /** Default `'chips'`. Ignored when `multiple` is `false`. */
  triggerDisplay?: SelectTriggerDisplay;
  /** Enables typing-to-filter and (with `loadOptions`) async search. Default `false`. */
  searchable?: boolean;
  /** Adds a "+ Create '<query>'" row when no exact match exists. Requires `searchable`. Default `false`. */
  creatable?: boolean;

  // ─── value ────────────────────────────────────────────────────────────────
  value?: string | string[];
  defaultValue?: string | string[];
  /**
   * Fired on every selection change. Second arg is the matched option(s):
   *  - single: the SelectOption or `null` (when cleared)
   *  - multi: the array of currently selected options
   */
  onChange?: (
    value: string | string[],
    option: SelectOption<T> | SelectOption<T>[] | null,
  ) => void;
  /** Fired when the user activates a "+ Create" row. `onChange` fires immediately after with the new value included. */
  onCreate?: (label: string) => void;

  // ─── open state (controlled, rare) ────────────────────────────────────────
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;

  // ─── visuals ──────────────────────────────────────────────────────────────
  size?: SelectSize; // default 'md'
  /** Adds error border + `aria-invalid="true"`. Pair with `aria-describedby` to an error message. */
  invalid?: boolean;
  placeholder?: string;
  /**
   * Adds a ✕ on the trigger that clears the entire selection.
   * Default: `true` when `!multiple && !required`, `false` otherwise.
   * Multi mode handles per-chip removal regardless.
   */
  clearable?: boolean;

  // ─── states ───────────────────────────────────────────────────────────────
  disabled?: boolean;
  /** Renders the trigger non-interactive (no click, no focus-to-open) but still shows the current value. */
  readOnly?: boolean;

  // ─── form integration ─────────────────────────────────────────────────────
  /** Renders hidden `<input>`(s) so `new FormData(form)` picks up the value. */
  name?: string;
  /** Sets `required` on the underlying input(s) (single) or runs our own validation (multi — see Behaviors). */
  required?: boolean;
  /** Targets a specific form by id when the Select is rendered outside the form. */
  form?: string;

  // ─── render escape hatches ────────────────────────────────────────────────
  renderOption?: (
    opt: SelectOption<T>,
    state: { active: boolean; selected: boolean },
  ) => ReactNode;
  /** Renders the selected label in single-mode triggers. Defaults to `opt.label`. */
  renderValue?: (opt: SelectOption<T>) => ReactNode;
  /** Renders a single chip in chips-mode triggers. Defaults to `<Chip>{opt.label}</Chip>` with ✕. */
  renderTag?: (opt: SelectOption<T>, remove: () => void) => ReactNode;
  renderEmpty?: (query: string) => ReactNode;
  renderLoading?: () => ReactNode;
  renderError?: (err: Error, retry: () => void) => ReactNode;

  // ─── ARIA + DOM forwarding ────────────────────────────────────────────────
  id?: string;
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
};
```

### Prop defaults table

| Prop | Default | Notes |
|---|---|---|
| `multiple` | `false` | — |
| `triggerDisplay` | `'chips'` | Ignored when `!multiple` |
| `searchable` | `false` | — |
| `creatable` | `false` | Throws in dev when `creatable && !searchable` |
| `loadOnOpen` | `true` | Only consulted when `loadOptions` is set |
| `searchDebounceMs` | `250` | — |
| `size` | `'md'` | Mirrors `<Input>` |
| `invalid` | `false` | — |
| `clearable` | `!multiple && !required` | Multi handles per-chip removal regardless |
| `disabled` | `false` | — |
| `readOnly` | `false` | — |
| `required` | `false` | — |

## Mode matrix

| `multiple` | `triggerDisplay` | `searchable` | Trigger | Search input lives in |
|---|---|---|---|---|
| `false` | (n/a) | `false` | Button-styled, chevron right | — |
| `false` | (n/a) | `true` | **Combobox input** — typing replaces displayed label and filters | trigger itself |
| `true` | `'chips'` | `false` | Input-shell with inline chips, no caret editor | — |
| `true` | `'chips'` | `true` | Input-shell with inline chips + inline caret editor after last chip | trigger itself |
| `true` | `'summary'` | `false` | Button-styled, shows "Foo, Bar, …" or "N selected" | — |
| `true` | `'summary'` | `true` | Button-styled, shows summary | inside popover, top |

Tag-input pattern is `multiple={true} triggerDisplay='chips' searchable={true} creatable={true}` — no separate component.

### Summary text logic

When `triggerDisplay='summary'` with N selections:

- N = 0 → render `placeholder` text in muted color.
- N ≥ 1 → render comma-joined labels (`"Foo, Bar, Baz"`), truncated with ellipsis when overflowing the trigger width. Whole text is the `aria-label` of the trigger so SR users hear all of them.

We deliberately avoid the `"N selected"` shortcut by default — the comma-joined form is denser information and ellipsis handles overflow. `renderValue` is single-mode only in v1 (signature: one option). Customizing the multi-summary text (e.g. `"N selected"`) is deferred to v2 — see the future-work list.

## Behaviors

### Single, non-searchable

- Trigger: button-styled, identical metrics to `<Input>` (border, focus ring, sizes). Right edge has chevron-down icon; on `clearable && hasValue`, a `✕` appears before the chevron.
- Open triggers: click, `Enter`, `Space`, `ArrowDown` (opens with first selectable item active), `ArrowUp` (opens with last selectable item active), typeahead (printable character — starts a 500ms typeahead buffer like `<DropdownMenu>`).
- While open: `ArrowDown`/`ArrowUp` move active row; `Home`/`End` jump; `PageDown`/`PageUp` ±5; `Enter`/`Space` selects active and closes; `Escape` closes without changing selection; `Tab` closes and commits the selection.

### Single, searchable (combobox input-as-trigger)

- Trigger: an actual `<input>` styled exactly like `<Input>`. When closed and a value is selected, the input shows the selected label (read-only-looking but actually focusable + editable).
- Focusing the trigger does NOT open the listbox. Open triggers: click, `ArrowDown`/`ArrowUp`, or any printable keystroke. When opening via keystroke, the typed char replaces the displayed label and becomes the query (first keystroke is preserved). The selected label is restored on close-without-change.
- Behavior matches Headless UI's Combobox / Radix's Combobox v2 / MUI Autocomplete.
- Selection: `Enter` on the active row or click. Closes immediately, focus returns to trigger, input shows new label.
- Dismissal: `Escape` closes and reverts the query to the selected label. Click-outside closes without changing the selection (active-row highlight is not "applied" on outside click — only explicit `Enter` or click on a row commits). The input reverts to the selected label. `Tab` is the same as click-outside.
- `Backspace` on the empty input does NOT remove the selection — clearable handles that. (Backspace-clears-on-empty is a chips-mode behavior, not a single-mode one.)

### Multi, chips, searchable

- Trigger: input-shell that grows vertically as chips wrap. Chips render left-to-right top-to-bottom; the editable caret area is the last child, taking remaining width with `min-width: 4ch` so it always has somewhere to type.
- Adding: typing filters, `Enter` selects active row (and immediately keeps popover open, clears query, refocuses input caret).
- Removing: click on a chip's `✕` removes that one; `Backspace` on an empty caret removes the trailing chip and moves focus to its `✕` (next `Backspace` removes again, or arrow-keys navigate among chips like macOS pill UI).
- `ArrowLeft` at start of empty input → focus moves to the trailing chip's `✕`. `ArrowLeft`/`ArrowRight` while on a chip navigate between chips. `Enter`/`Backspace`/`Delete` on a focused chip removes it. `Escape` returns focus to caret without removing.

### Multi, chips, non-searchable

- Trigger: same shape as searchable-chips, but no inline caret editor — clicking anywhere on the trigger opens the popover.
- Chip removal via click on `✕`, or keyboard chip-nav as described above.

### Multi, summary, searchable

- Trigger: button-styled, shows comma-joined labels or `placeholder`. Click opens.
- Popover has a search input at the top of the panel. Pattern matches `<DropdownMenu.Content>` with a leading input + listbox.
- Selecting a row toggles its membership without closing the popover. Search input retains focus.

### Multi, summary, non-searchable

- Same trigger as the searchable variant; popover has no search input, just the listbox.
- Toggling rows does not close the popover.

### Common keyboard model (across all modes)

| Key | Closed | Open |
|---|---|---|
| `Enter` | Open (single/chips), open + activate (button-styled) | Select active row; close on single, keep on multi |
| `Space` | Open (button-styled triggers only) | Button-styled triggers: same as `Enter`. Input-style triggers (searchable single, chips-multi): Space is a literal space char in the query |
| `ArrowDown` | Open with first active | Move active +1 (skips disabled, header rows, separators) |
| `ArrowUp` | Open with last active | Move active -1 |
| `Home` | (no-op) | Active = first option |
| `End` | (no-op) | Active = last option |
| `PageDown` | (no-op) | Active +5 (clamped) |
| `PageUp` | (no-op) | Active -5 (clamped) |
| `Escape` | (no-op) | Close, revert search query to last selected label (single-search) |
| `Tab` | (no-op, normal traversal) | Close, commit current selection |
| Printable char | Typeahead-open for non-searchable; first char of query for searchable | Typeahead step in non-searchable; query input in searchable |
| `Backspace` | (no-op) | Remove last chip in chips-mode if input is empty; otherwise normal input behavior |

### ARIA

- **Single, non-searchable trigger:** `<button>` with `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls={listboxId}` while open.
- **Single, searchable trigger:** `<input role="combobox" aria-autocomplete="list" aria-expanded aria-controls={listboxId} aria-activedescendant={activeOptionId}>`.
- **Multi, chips trigger:** searchable variant — the inline `<input role="combobox" aria-autocomplete="list" aria-expanded aria-controls={listboxId} aria-activedescendant={activeOptionId}>` carries the combobox role; the surrounding `<div>` is a presentational shell. Non-searchable variant — surrounding `<div role="button" tabIndex={0}>` (or a `<button>` wrapper) with `aria-haspopup="listbox"`. Each chip is a `<button type="button" aria-label="Remove {label}">` so chips are individually focusable and removable.
- **Multi, summary trigger:** `<button>` with `aria-haspopup="listbox" aria-expanded`. The popover's search input (if any) is `role="combobox"` inside the panel.
- **Listbox:** `<ul role="listbox" aria-multiselectable={multiple} aria-labelledby={triggerId}>`. Active row tracked via `aria-activedescendant` on the trigger (or on the in-panel search input for summary-multi-searchable).
- **Options:** `<li role="option" id={optionId} aria-selected={isSelected} aria-disabled={isDisabled}>`. Default render also visually flags selection via background tint, but `aria-selected` is the truth.
- **Groups:** `<li role="group" aria-labelledby={groupHeaderId}>` wraps the group's options; the header is a non-focusable `<div id={groupHeaderId}>` with `aria-hidden="false"` (it's a label, not an option).

### Async lifecycle

- **Initial:** if `loadOptions` is set and `loadOnOpen` is `true`, the first time the popover opens for a given mount the component calls `loadOptions('', signal)` and shows the loading state until the promise resolves. Subsequent opens reuse the cached results until the query changes.
- **On query change:** debounced `searchDebounceMs` (default 250). On every actual fire, the in-flight request (if any) is aborted via `AbortController` and a new `loadOptions(currentQuery, signal)` is issued.
- **Resolved:** options render. Active row resets to the first non-disabled item.
- **Rejected (non-abort):** `renderError(err, retry)` is invoked. `retry` calls `loadOptions(currentQuery, freshSignal)` afresh. Default error UI: `"Failed to load options."` text + `<Button size="sm" variant="secondary">Retry</Button>`.
- **Aborted:** swallowed silently. The next response takes over.
- **`options` + `loadOptions` together:** `loadOptions` wins. In dev, a `console.warn` flags the redundant `options` prop.

### Creatable

- Enabled by `creatable && searchable`. Throws in dev when `creatable && !searchable` (an opaque sync-only "creatable picker without a query field" is incoherent).
- When the current query (trimmed, non-empty) does NOT exactly match any option's label (case-insensitive), a special row is appended after all real options:
  - Label: `+ Create "<query>"` (the literal label uses curly quotes; the visible query is trimmed; tab characters dropped).
  - `role="option"`, focusable like any other option.
- Activating the row:
  1. Calls `onCreate(trimmedQuery)`.
  2. Adds `{ value: trimmedQuery, label: trimmedQuery }` to the selection (multi) or replaces selection (single).
  3. Fires `onChange` with the post-update value and matched option(s) including the newly created one.
  4. Closes the popover (single) or clears the query and keeps open (multi).
- The created option is NOT added to `options` — that's the consumer's job in response to `onCreate`. Until the consumer persists and updates `options`, the chip's label is the only place the value exists in the UI.
- Duplicate guard: if the trimmed query case-insensitively matches an already-selected value, the create row is hidden (we don't offer to recreate something already picked).

### Clear

- Single mode, `clearable` true, value set → ✕ icon appears in the trigger before the chevron. Click → `onChange('', null)`, popover stays closed.
- Multi mode, `clearable` true (uncommon — chips already handle this), value non-empty → ✕ icon at the right of the trigger. Click → `onChange([], [])`. Chips also have their own ✕ for per-item removal.

### Form integration

- When `name` is set:
  - Single mode: render one `<input type="hidden" name={name} value={selectedValue} required={required} form={form}>`. The empty selection renders `value=""`; with `required`, native form-submit will block on it (browsers respect `required` on hidden inputs).
  - Multi mode with at least one selection: render one hidden input per selected value with the same `name`, no `required` attribute. `new FormData(form).getAll(name)` returns the array.
  - Multi mode with **zero** selections + `required={true}`: render a single hidden input `<input type="hidden" name={name} value="" required form={form}>`. The empty `required` blocks native submit until the user picks at least one. Once the first selection arrives, swap to the per-value form above (no `required`).
- `form` attribute on the hidden inputs lets a Select live outside its target `<form>`.
- `aria-required` is set on the trigger when `required={true}`.
- The hidden inputs are not focusable or labeled — the trigger carries all the a11y wiring. The hidden inputs exist only so FormData picks them up.

### Width / sizing

- Trigger: takes full width of its parent (`width: 100%`), same as `<Input>`. Consumers control width by wrapping with `<Stack>` / `<Cluster>` or sizing the parent.
- Popover listbox: matches trigger width by default. Default `max-height: 320px` with `overflow-y: auto` beyond. Width override and max-height override are NOT exposed on the public API in v1 — consumers needing custom popover sizing wait for v2 (tracked in future-work). Internal `<Listbox>` carries the dimensions as constants for now.
- Listbox scroll: vertical only; `overflow-y: auto`.

### Animation

- Open: scale-fade in 140ms `ease-out` from the trigger's anchor edge — same as `<DropdownMenu>` and `<Popover>`.
- Close: instant unmount.
- `prefers-reduced-motion: reduce` strips the transition.

### Dismissal

- Click-outside: closes. For single + searchable, commits the current selection (Escape behavior reverts query; click-outside accepts).
- Escape: closes. For single + searchable, reverts query to selected label. For multi-summary + searchable, just closes; selections are already committed.
- Tab: closes and commits.
- Blur of trigger without focus moving into the popover: closes immediately (handled via Floating UI's `useDismiss` + manual focus tracking).

## Visual rules

All values come from tokens (Rule 3); no layout properties on the component (Rule 4).

- **Trigger background/border:** identical to `<Input>` for input-style modes (`--color-border-default`, `--color-bg-surface`, focus ring via `--color-border-focus`). Button-style modes use the same border tokens but with `--color-bg-button-secondary` for the background, matching the secondary Button.
- **Trigger sizes:** `sm` 28px, `md` 36px, `lg` 44px tall — same scale as `<Input>` and `<Button>`. When chip-wrap pushes the trigger taller, the minimum height tracks the size.
- **Chips inside trigger:** small rounded pill, neutral background (`--color-bg-neutral-subtle`), text color `--color-text-default`. ✕ icon on hover and keyboard focus. Use the same chip token set used by `<Badge size="sm">`.
- **Listbox panel:** `--color-bg-surface`, `--color-border-default`, `--radius-md`, `--shadow-md`. Matches `<DropdownMenu.Content>` and `<Popover.Content>` exactly.
- **Option row:** padding from `--space-2` / `--space-3`. Active row (keyboard or mouse hover): `--color-bg-subtle`. Selected row: `--color-bg-info-subtle` + 2px left accent (`--color-border-info`) — matches `<DropdownMenu.CheckboxItem>`.
- **Disabled option:** `--color-text-muted`, `cursor: not-allowed`, no hover bg, `aria-disabled`.
- **Group header:** `--color-text-muted`, `font-size` one step smaller than option label, `--space-2` top padding, `--space-3` horizontal padding, `text-transform: uppercase`, `letter-spacing` small. Non-interactive, non-focusable.
- **Empty/loading/error rows:** centered text in the listbox area, `--color-text-muted`. Loading row uses the existing spinner styles from `<ConfirmationPopover>` (extract to `_internal/Spinner` if needed).
- **Focus ring:** `:focus-visible` on the trigger (Rule 3a). Mouse click on trigger does not get the keyboard ring.
- **Chevron + ✕ icons:** inline SVG, `currentColor`, sized to match the trigger size token (12/14/16px for sm/md/lg).
- **Z-layer:** uses the existing popover z-layer (`--z-popover`). Tooltip stays above it per existing tokens.

## File layout

```
src/components/Select/
  Select.tsx               ← public component (forwardRef on the trigger element)
  Select.module.scss
  Select.test.tsx
  Trigger.tsx              ← internal: picks one of 6 trigger variants based on props
  Listbox.tsx              ← internal: panel + option rendering + ARIA roles
  Chip.tsx                 ← internal: removable chip for chips-mode trigger
  Empty.tsx                ← internal: default empty-state row
  Loading.tsx              ← internal: default loading-state row
  Error.tsx                ← internal: default error-state row with Retry button
  useSelectState.ts        ← internal: open/active/value reducer, controlled/uncontrolled merge
  useAsyncOptions.ts       ← internal: debounce + AbortController + cache lifecycle
  context.ts               ← internal context for Trigger/Listbox/Chip to read state
  utils.ts                 ← internal: flatten groups, filter logic, normalize value
  index.ts                 ← export { Select } + types
```

Public API exports only `Select`. Internal files are not re-exported.

## src/index.ts additions

```ts
export { Select } from './components/Select';
export type {
  SelectProps,
  SelectOption,
  SelectGroup,
  SelectOptions,
  SelectSize,
  SelectTriggerDisplay,
} from './components/Select';
```

## Testing matrix (minimum)

Follow `<DropdownMenu>`'s depth (~1800 LoC test file is acceptable). Vitest globals, `userEvent` from `@testing-library/user-event`.

Coverage groups:

1. **Render & structure**
   - Renders without crashing in every mode (single/multi × chips/summary × searchable/non-searchable).
   - `ref` forwards to the trigger DOM node.
   - `className` merges, not replaces, on the trigger.
   - `id`, `aria-label`, `aria-labelledby`, `aria-describedby` thread to the trigger.
2. **Sync options**
   - Flat options render. Grouped options render headers in order.
   - `disabled` options are dimmed and `aria-disabled`.
   - Mixed flat + grouped is detected as grouped (per first-element rule) and flat items are ignored — log a dev warning.
3. **Multi-chips**
   - Selecting a row adds a chip; clicking chip ✕ removes; chip-keyboard nav works (arrows, Backspace, Delete).
   - Wrap behavior with N=20 chips renders multi-line trigger; popover anchors to the bottom edge.
4. **Multi-summary**
   - Trigger shows comma-joined labels; ellipsis on overflow; `aria-label` carries the full list.
   - In-popover search filters; selecting toggles without closing.
5. **Single, searchable (combobox)**
   - Closed shows selected label. Click opens, label remains. Typing replaces label with query.
   - Escape reverts query to selected label. Click-outside commits with current selection.
   - Open-by-arrow-key activates the selected row.
6. **Async load**
   - `loadOptions` invoked once on first open when `loadOnOpen`.
   - Debounce coalesces rapid keystrokes to a single call after 250ms (use `vi.useFakeTimers`).
   - Stale promise aborted via signal when query changes (assert `signal.aborted` was checked or the rejection is swallowed).
   - Rejection renders the error state; clicking Retry re-invokes `loadOptions` with the current query.
   - `options` + `loadOptions` together: `loadOptions` wins; dev warning fires.
7. **Creatable**
   - With a unique query, create row appears as last option.
   - Activating create row fires `onCreate(query)`, then `onChange` with the new value.
   - Exact-match (case-insensitive) suppresses the create row.
   - Already-selected value (in multi) is not offered for re-creation.
   - `creatable && !searchable` throws in dev.
8. **Keyboard**
   - Every key in the matrix in every mode (focus on the trigger, simulate, assert the next state).
9. **ARIA**
   - Roles: combobox (where applicable), listbox, option, group.
   - `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-multiselectable`, `aria-selected`, `aria-disabled` set correctly across state transitions.
10. **Form integration**
    - With `name`, single renders one hidden input; multi renders one per value.
    - `FormData(form).getAll(name)` returns the multi values.
    - `required` blocks submit on empty single (via the hidden input).
    - `required` blocks submit on empty multi (via our own intercept).
    - `form` attribute lets a Select sibling-of-form submit into it.
11. **Controlled vs uncontrolled**
    - `defaultValue` initializes; `value` overrides; `onChange` fires on every interaction.
    - `defaultOpen` initializes the open state; controlled `open` + `onOpenChange` round-trips.
12. **Disabled / readOnly / invalid**
    - `disabled` — no click, no focus-to-open.
    - `readOnly` — focus works but click/Enter don't open; existing value still shows.
    - `invalid` — adds the right class + `aria-invalid="true"`.
13. **Clearable**
    - Default-on for single-non-required, default-off for single-required and for multi.
    - Clicking ✕ fires `onChange('', null)` for single, `onChange([], [])` for multi (when manually enabled).
14. **Render escape hatches**
    - `renderOption` receives `{active, selected}` and renders.
    - `renderValue`/`renderTag`/`renderEmpty`/`renderLoading`/`renderError` all wire through.
15. **Sizes**
    - `sm` / `md` / `lg` apply the right classes on the trigger.

## Demo plan

`packages/playground/src/pages/components/SelectDemo.tsx` covers:

1. **Status picker** — single, non-searchable, 3 options. Smallest possible Select.
2. **Country picker** — single, searchable, grouped (Americas / Europe / Asia-Pacific).
3. **Assignee picker** — single, async, custom `renderOption` with `<Avatar>`. Includes a forced error+retry interaction.
4. **Status filter** — multi-summary, searchable, simulating a table-filter toolbar Cluster.
5. **Owner filter** — multi-chips, searchable.
6. **Tags input** — multi-chips, searchable, creatable. Show the `onCreate` callback wiring (logging to a paragraph above the field).
7. **Disabled / readOnly / invalid** — three side-by-side small Selects.
8. **Sizes** — sm / md / lg in a row, all with `<Input>` siblings so visual parity is obvious.

Wire into:

- `packages/playground/src/App.tsx` — route `/demo/select`.
- `packages/playground/src/layout/AppShell/AppShell.tsx` — sidebar nav entry, alphabetical-ish among existing demos.
- `packages/playground/src/pages/components/ComponentsIndex.tsx` — overview grid tile.

## AGENTS.md update

Add a new section after `<ConfirmationPopover>`:

```md
### `<Select>` — value picker (single, multi, searchable, async, creatable)

```tsx
// Form field — single:
<Select
  options={statuses}
  value={status}
  onChange={(v) => setStatus(v as Status)}
  placeholder="Pick a status"
/>

// Filter — multi, summary:
<Select
  multiple
  triggerDisplay="summary"
  searchable
  options={owners}
  value={selectedOwners}
  onChange={(v) => setSelectedOwners(v as string[])}
/>

// Tag input — multi, chips, creatable:
<Select
  multiple
  searchable
  creatable
  options={existingTags}
  value={tags}
  onChange={(v) => setTags(v as string[])}
  onCreate={api.tags.create}
/>
```

- One generalist; the mode matrix is `multiple` × `triggerDisplay` × `searchable`. See JSDoc for the matrix.
- Async via `loadOptions(query, signal)`. Debounce and AbortSignal are built-in; do NOT debounce externally.
- Tag input pattern = `multiple + searchable + creatable + triggerDisplay='chips'`. No separate Tags component.
- For pure ACTION menus (Edit/Delete buttons), use `<DropdownMenu>`. Select is for value selection.
- For free-form text, use `<Input>`. Select always picks from a (possibly async) set.
- Don't reach for `triggerDisplay='summary'` for tag input — chips communicate the active filter set at a glance.
```

## Open / future-work items (NOT v1)

Listed so plan reviewers know what's deliberately excluded:

- Virtualization (`react-window` or hand-rolled). Add when CRM hits a real perf wall.
- Sticky group headers (`position: sticky` inside listbox).
- "Select all" / "Clear all" row at top of listbox in multi mode.
- `maxSelections?: number` cap with auto-disable of unselected rows.
- Async pagination (load-more-on-scroll). Would extend `loadOptions` to return a cursor.
- `minSearchChars` gate.
- `searchPlacement` override.
- Async `onCreate` returning `Promise<string>` for deferred adoption.
- `multiple + summary` with `"N selected"` shortened render (consumer-overridable via an extended `renderValue` or a new `renderSummary` prop). Today summary is always comma-joined-with-ellipsis.
- Popover width override (e.g., `popoverWidth: 'trigger' | 'auto' | number`) and `maxHeight` override on the listbox.

## Implementation order (suggestion for the plan)

1. Scaffold + smoke test (renders, ref forwards, className merges).
2. `useSelectState` — controlled/uncontrolled value + open + active row.
3. Trigger variants (button-style first; then combobox-input; then chips-shell).
4. Listbox + sync options (flat then grouped) + option rendering.
5. Keyboard (every key in the matrix), one mode at a time, with tests.
6. Multi mode (chips + summary).
7. Searchable (local filter only).
8. Async (loadOptions + debounce + AbortSignal + loading/error/empty states + retry).
9. Creatable.
10. Form integration (hidden inputs).
11. Clearable, disabled, readOnly, invalid, sizes.
12. Render escape hatches.
13. JSDoc pass per Rule 7.
14. Playground demo + nav wiring.
15. AGENTS.md update.
16. Pre-push review-fix cycle (Rule 8) until clean.
