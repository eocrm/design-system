# OptionsPicker — multi/single-select picker with search

**Status:** approved (design phase) · **Date:** 2026-05-26 · **Branch:** `feat/options-picker`

## Problem

The audit log mockup (`/mockups/audit`) needs a real filter picker — today the "Events ▾" and "Tenant ▾" trigger buttons are visual-only Buttons that don't open anything. The eocrm production code (`frontend/src/modules/platform/audit/components/filters/EventPicker.tsx`) provides the canonical UX: a popover-anchored panel with search, grouped checkboxes, group-toggle headers, namespace hints, and draft-then-Apply commit. That pattern is also used for the Tenant picker on the same page and will be reused for future CRM filter surfaces (Contacts owner picker, Deals stage picker, Members role picker).

The design system today exposes `DropdownMenu` (action menu — closes on item click) and `Select` (form-shaped, single-select, no search). Neither models this UX: a filter picker holds a draft selection, supports multi-select with search and grouping, and offers Apply/Cancel commit semantics. Mockups currently can't render the real filter UX without ad-hoc Popover + Checkbox + Input composition, which fights the design system's Hard rule 6 (no in-mockup hand-rolled primitives).

## Goal

Ship `OptionsPicker` — a new compound primitive in `@eocrm/design-system` that models the filter-picker pattern. Single component handles both multi-select (default) and single-select via a `mode` prop. Composable from existing primitives (`Popover`, `Input`, `Checkbox`, `Radio`, `Badge`, `Button`, `Text`, `Cluster`). Builds the Audit mockup's "Events ▾" picker as its first consumer.

**Non-goals:** async option loading, virtualization, creatable/free-form values, inline (non-popover) mode, disabled-option rendering, mobile-specific layouts. See Section "Out of scope".

## Design

### API shape

A compound primitive with a root `OptionsPicker` that holds the open state and the `selected`/`onApply` contract, plus `OptionsPicker.Trigger` (the button that opens the panel) and `OptionsPicker.Content` (the panel itself).

```tsx
import { OptionsPicker, Button, Badge } from '@eocrm/design-system';

<OptionsPicker
  mode="multi"
  selected={['auth.login_succeeded', 'domain.created']}
  onApply={(next) => setFilter({ events: next })}
>
  <OptionsPicker.Trigger>
    <Button variant="secondary">
      <Badge tone="info" dot="start" />
      Event
      <ChevronDown size={14} />
    </Button>
  </OptionsPicker.Trigger>

  <OptionsPicker.Content
    label="Filter events"
    searchPlaceholder="Filter events…"
    groups={[
      {
        id: 'auth',
        label: 'Authentication',
        tone: 'success',
        hint: 'auth.*',
        options: [
          { value: 'auth.login_succeeded', label: 'login_succeeded' },
          { value: 'auth.login_failed', label: 'login_failed' },
          { value: 'auth.logout', label: 'logout' },
        ],
      },
      {
        id: 'domain',
        label: 'Domains',
        tone: 'info',
        hint: 'domain.*',
        options: [
          { value: 'domain.created', label: 'created' },
          { value: 'domain.removed', label: 'removed' },
        ],
      },
    ]}
  />
</OptionsPicker>
```

### Types

```tsx
export type OptionsPickerMode = 'multi' | 'single';

export interface OptionsPickerOption {
  /** Unique identifier; persisted as the selected value. */
  value: string;
  /** Displayed text. Consumer controls font (use the `monospace` CSS class via wrapping if needed). */
  label: string;
  /** Override what the search input matches against. Defaults to `label`. */
  searchText?: string;
}

export interface OptionsPickerGroup {
  /** Unique per group, used as React key and as the ns hint fallback. */
  id: string;
  /** Header text shown in the group label slot. */
  label: string;
  options: OptionsPickerOption[];
  /** Colored dot tone for the group header. Defaults to `'neutral'`. */
  tone?: BadgeTone;
  /**
   * Right-side hint label (e.g., `"auth.*"`). When omitted, no hint renders.
   * Multi-mode group headers color this hint per tri-state (none / some / all).
   */
  hint?: string;
}

/**
 * Root props — discriminated by `mode`. Multi mode is the default.
 *
 * `selected` is required-controlled: the consumer owns the committed
 * selection. The picker manages its own draft state between open and Apply.
 */
export type OptionsPickerProps =
  | {
      mode?: 'multi';
      selected: string[];
      onApply: (next: string[]) => void;
      onCancel?: () => void;
      open?: boolean;
      onOpenChange?: (open: boolean) => void;
      children: ReactNode;
    }
  | {
      mode: 'single';
      /** `null` when nothing is selected. */
      selected: string | null;
      onApply: (next: string | null) => void;
      onCancel?: () => void;
      open?: boolean;
      onOpenChange?: (open: boolean) => void;
      children: ReactNode;
    };

/**
 * Content props — XOR `options` vs `groups`. Passing both is a TS error.
 *
 * Both shapes share search/placeholder/label/footer-text props; `applyLabel`
 * and `cancelLabel` are ignored in single mode (no footer renders).
 */
export type OptionsPickerContentProps = (
  | { options: OptionsPickerOption[]; groups?: never }
  | { groups: OptionsPickerGroup[]; options?: never }
) & {
  /** Accessible label on the panel (used as the dialog's `aria-label`). */
  label: string;
  /** Search input placeholder. Defaults to `'Filter…'`. */
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
```

### Panel anatomy

```
┌─────────────────────────────────────────────────┐
│ 🔍 Filter events…                       2 sel   │  search bar
├─────────────────────────────────────────────────┤
│ ● AUTHENTICATION                       auth.*   │  group header (clickable multi)
│   ☑ login_succeeded                             │  option row
│   ☐ login_failed                                │
│ ● DOMAINS                              domain.* │
│   ☐ created                                     │
├─────────────────────────────────────────────────┤
│ 2 of 58 events            [Cancel] [Apply]      │  footer (multi only)
└─────────────────────────────────────────────────┘
```

Three vertically stacked regions:

1. **Search bar** — `<Input>` with a `<Search>` (lucide) leading icon. Selection count (`{N} sel`) on the right via `<Text size="xs" tone="subtle" aria-live="polite">`. The live region announces draft changes to screen readers. Hidden when the picker has zero options total.

2. **List** — scrollable area. Renders either a flat option list (when `options` is passed) or grouped sections (when `groups` is passed). Group headers in multi mode are clickable (`role="button"`) with tri-state (`aria-pressed="false" | "mixed" | "true"`) and toggle every option in the namespace. In single mode, group headers are `role="presentation"` — visual only, no interaction. Empty groups (zero matches after search) hide entirely. If every group is empty, render the `emptyState` slot.

3. **Footer (multi mode only)** — `<Cluster justify="between">` with `'N of TOTAL events'` text on the left and `[Cancel]` + `[Apply]` buttons on the right. Hidden entirely in single mode.

### Internal state

Held in `OptionsPicker.Content` via `useState`:

- `draft: string[]` — current draft selection. Initialized from `selected` on every open transition. Toggled by checkbox clicks (multi) or replaced by a single value (single). Committed via `onApply(draft)` (multi) or `onApply(value)` (single).
- `filter: string` — search input value. Empty → all options visible. Reset to `''` on every open transition.
- `focusedValue: string | null` — keyboard-focused option for arrow navigation. Reset to first visible option on open.

The open state is held in `OptionsPicker` root via `useState` unless `open` + `onOpenChange` are passed (controlled). On open transition (any → true): draft resets to selected, filter resets, focusedValue resets to first visible option, search input gets focus. On Cancel / Esc / click-outside: draft is discarded, panel closes, focus returns to Trigger.

### Mode-specific behavior

| Behavior | Multi (default) | Single |
|---|---|---|
| Selection count | `{N} sel`; hidden when N=0 | `1 sel`; hidden when nothing selected |
| Option rendering | `<Checkbox>` | `<Radio>` |
| Click on option | Toggles draft | Sets draft to value, fires `onApply(value)`, closes panel |
| Click on group header | Toggles all options in group | No-op (header is `role="presentation"`) |
| Footer (Apply/Cancel) | Visible | Hidden |
| `Enter` on focused option | Toggle draft | Select + commit + close |
| `Cmd/Ctrl+Enter` | Commit draft (same as Apply) | No-op |

### Keyboard navigation

Active when panel is open. Focus model uses `aria-activedescendant` on the list rather than per-row focus, so the search input retains DOM focus throughout — typing always goes to search.

| Key | Action |
|---|---|
| `↓` / `↑` | Move `focusedValue` to next/previous visible option (skip group headers; wrap at ends) |
| `Home` / `End` | First / last visible option |
| `Enter` (on option) | Multi: toggle; Single: select + commit + close |
| `Space` (on option) | Same as Enter |
| `Enter` (in search input, exactly one match) | Multi: toggle the match; Single: select + commit + close |
| `Tab` | Search → first option → footer Cancel (multi) → Apply → close; Shift+Tab reverses |
| `Esc` | Cancel (revert draft, close, return focus to Trigger) |
| `Cmd/Ctrl + Enter` | Multi: commit (same as Apply); Single: no-op |

### Accessibility

- **Trigger** — native `<button>` (whatever Button renders). Adds `aria-haspopup="listbox"`, `aria-expanded={open}`, `aria-controls={contentId}`.
- **Panel** — `role="dialog"`, `aria-label={label}`. Focus trap inside via `Popover`'s built-in focus management.
- **Search input** — native `<input type="text">`, `aria-label={searchPlaceholder}`. Autofocused on open.
- **Selection count** — `aria-live="polite"`, so toggle changes are announced as `"2 sel" → "3 sel"`.
- **List** — `role="listbox"`, `aria-multiselectable={mode === 'multi'}`, `aria-activedescendant={focusedOptionId}`.
- **Group header (multi, clickable)** — `role="button"`, `aria-pressed="false" | "mixed" | "true"` reflecting tri-state, `aria-label="{label}, {tristate} selected"`, `aria-controls={spaceSeparatedOptionIds}`.
- **Group header (single, passive)** — `role="presentation"`. No interactive semantics.
- **Option row** — `role="checkbox"` (multi) or `role="option"` (single). `aria-checked={isSelected}` (checkbox) or `aria-selected={isSelected}` (option). `id="${pickerId}-opt-${value}"` so the list's `aria-activedescendant` can target it.
- **Footer buttons** — standard `<button>`s, no special ARIA.

### File layout

```
packages/design-system/src/components/OptionsPicker/
  OptionsPicker.tsx              ← root + Trigger + Content + helpers (one file)
  OptionsPicker.module.scss      ← all visual styling
  OptionsPicker.test.tsx         ← Hard rule 1 minimum + behavior tests
  index.ts                       ← public re-exports
```

Single `.tsx` keeps the compound API close-coupled to its shared context. Internal helpers (the search-filter function, the tri-state computation, the option-id generator) are local to the file — not exported.

### Composition — built on existing primitives

| Layer | Built from |
|---|---|
| Trigger wrapper | thin pass-through to `children`; open state injected via context |
| Popover panel | `<Popover>` (existing, uses Floating UI) |
| Search input | `<Input>` with `<Search>` lucide icon as leading slot |
| Selection count | `<Text size="xs" tone="subtle">` with `aria-live="polite"` |
| Group header (multi) | role="button" container + `<Badge tone={group.tone} dot="start" size="sm">` for dot + `<Text size="xs">` label + `<Text size="xs" tone="subtle">` for hint |
| Group header (single) | same visual, `role="presentation"` |
| Option row | row container + `<Checkbox>` (multi) or `<Radio>` (single) + `<Text>` for label |
| Footer | `<Cluster justify="between">` + `<Button variant="secondary">` Cancel + `<Button variant="primary">` Apply |
| Empty state | inline `<Text tone="muted">` (no `<EmptyState>` — too heavy for a popover panel) |

### Public exports

Added to `packages/design-system/src/index.ts`:

```ts
export { OptionsPicker } from './components/OptionsPicker';
export type {
  OptionsPickerProps,
  OptionsPickerContentProps,
  OptionsPickerMode,
  OptionsPickerOption,
  OptionsPickerGroup,
} from './components/OptionsPicker';
```

## Tests

Per Hard rule 1 minimum + key behavior tests:

**Render-level (rule 1):**
- Renders Trigger + closed panel without crash.
- Opens on Trigger click; closes on Esc; closes on click-outside.
- `mode='multi'` (or omitted) renders Apply/Cancel footer; `mode='single'` does not.
- Renders flat `options` correctly; renders grouped `groups` correctly. (Passing both is a TS-level error — not runtime-tested.)
- `className` on Content merges, doesn't replace.
- Ref forwarding on Trigger.

**Behavior:**
- Multi: clicking a checkbox toggles draft; Apply fires `onApply(draft)`; Cancel reverts; close-without-apply reverts; reopening shows the last-committed selection.
- Single: clicking a row fires `onApply(value)` and closes the panel.
- Search filter hides non-matching options; group sections with zero visible options hide entirely.
- Group toggle (multi): clicking a partially-selected header selects all; clicking a fully-selected header deselects all.
- Tri-state header reflects none → 'false', some → 'mixed', all → 'true'.
- Keyboard: ↓/↑ navigates options skipping group headers; Enter on focused option toggles (multi) or commits (single); Esc reverts.
- Selection count text updates as draft changes; has `aria-live="polite"`.
- Empty state renders when search has zero matches across all groups.

## Demo + cross-link wiring

Per Hard rule 2 (mockups must have a demo) and the playground's nav conventions:

- Create `packages/playground/src/pages/components/OptionsPickerDemo.tsx` using the `DemoLayout` + `Example` pattern, with at least these examples:
  - Multi-select flat options.
  - Multi-select grouped options with namespace hints (the audit Event picker shape).
  - Single-select grouped (auto-closes on pick).
  - Controlled open state.
- Wire into `App.tsx`, `AppShell.tsx`, `ComponentsIndex.tsx`.
- Add `'OptionsPicker'` to the `ComponentName` union in `packages/playground/src/pages/mockups/registry.ts`.
- Update `packages/design-system/AGENTS.md` with a TL;DR + canonical snippet.

## Audit mockup integration

After OptionsPicker ships, update the Audit mockup (`packages/playground/src/pages/mockups/Audit/Audit.tsx`):

- Replace the static `Events ▾` Button with `<OptionsPicker mode="multi" …>` using a hand-rolled audit event catalog (sourced from `packages/playground/src/data/audit.ts`) — start with ~10–15 events across 3–4 namespaces, matching what's in the mock entries.
- Replace the static `Tenant ▾` Button with `<OptionsPicker mode="single" …>` of the four tenant slugs.
- Add 'OptionsPicker' to the Audit mockup's `usesComponents` array in `registry.ts`.

Leave the `Last 7 days ▾` Button static — DateRangePicker is a separate primitive.

## Out of scope

Explicit YAGNI cuts for the first ship. Each is its own future spec if needed.

1. **Async option loading.** No `loadOptions: (search) => Promise<Option[]>` API. Options must be passed synchronously.
2. **Virtualization.** No windowing. Performance is OK up to ~500 options. Audit event catalog is ~60 events.
3. **Free-form / creatable values.** No "Add 'foo' as a new option" UX. This is a filter, not a tag input.
4. **Multi-column grid layout.** Single vertical list only.
5. **Persistence / URL sync.** Consumer handles via `onApply`.
6. **Inline (non-popover) mode.** Always uses a Popover. If you need always-open, compose Checkbox + Input directly.
7. **Disabled options.** No `Option.disabled`, no `Option.description`, no `Option.icon`. Label-only.
8. **Bulk-select-all across groups.** Group toggles handle per-namespace bulk; cross-group bulk select is deferred.
9. **Mobile-specific layout.** Standard popover behavior. No fullscreen bottom-sheet variant.
10. **Per-option count badges.** No `Option.count = 42` rendering. Future spec extension if needed.
