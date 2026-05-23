# ButtonGroup — design spec

**Date:** 2026-05-23
**Branch:** `feat/button-group`
**Scope:** New `<ButtonGroup>` compound component with two modes — visual joining of `<Button>` children (stateless) and segmented control with single-select radiogroup behavior (state-managed). Same component, mode determined by presence of `value` + `onValueChange` props.

## Goal

Provide a primitive for grouping related action buttons into a single visual unit (toolbar Cut/Copy/Paste style) AND for state-managed single-select toggles (Day/Week/Month, Grid/List/Calendar view switchers). The unified-component approach keeps API surface small while the discriminated-union TypeScript types and clear JSDoc disambiguate the modes at consumption.

## Why now

- Toolbar action groups currently use `<Cluster>` with no visual joining — fine for spacing, missing the "this is one cohesive unit of related actions" affordance.
- View-mode toggles in DataTable and dashboard pages are open-coded; segmented controls are a recurring need that no shipped primitive covers.
- Tabs is the wrong primitive for a stateful single-value selector that doesn't change routes.

## Non-goals (v1)

- **No vertical orientation.** Horizontal only. Vertical button groups are rare and the border-radius logic doubles. Defer until requested.
- **No multi-select segmented mode.** Only the single-value radiogroup pattern. For multi-select toggles, compose checkboxes.
- **No "tab" semantics for routing.** That belongs to `<Tabs>` — ButtonGroup is for stateful single-value selection within a page, not for switching page content.
- **No `<Button>` API extension.** ButtonGroup uses cloneElement to inject `size` into existing Button children. Button is untouched.
- **No icon-only auto-sizing inside Items.** Items render whatever children you give them with the segmented padding scheme. Smaller icons → smaller `size`.
- **No floating-element behavior** (no popovers, no portals). ButtonGroup is inline content.
- **No theme variants of the segmented look** (e.g., outlined-segmented vs filled-segmented). One look — pill-inset, matching iOS / Material precedent.

## Architecture

### Dependencies

No new packages, no new tokens. Reuses `--color-bg-muted`, `--color-bg`, `--color-fg`, `--color-fg-muted`, `--radius-md`, `--shadow-xs`, `--space-3`, `--border-width`, plus Button's existing size tokens via cloneElement propagation.

### File layout

```
packages/design-system/src/components/ButtonGroup/
  ButtonGroup.tsx          ← <ButtonGroup> root — owns mode branching + visual-mode size cloneElement + segmented-mode keyboard handlers + context provider
  ButtonGroupItem.tsx      ← <ButtonGroup.Item> — segmented-mode item (role="radio")
  ButtonGroup.module.scss  ← Visual joined-border styling + segmented pill-inset styling, branched via data-mode
  ButtonGroup.test.tsx     ← Unit tests
  context.ts               ← ButtonGroupContext + useButtonGroupContext("ComponentName") guard
  index.ts                 ← Public re-exports
```

Plus standard integration points:

- `packages/design-system/src/index.ts` — re-export `ButtonGroup` + types
- `packages/design-system/AGENTS.md` — TL;DR near Button
- `packages/playground/src/pages/components/ButtonGroupDemo.tsx` — 6-example demo
- `packages/playground/src/App.tsx` — route
- `packages/playground/src/layout/AppShell/AppShell.tsx` — sidebar entry (Forms or new Inputs group; existing layout has Forms with Button/Checkbox/Radio so ButtonGroup slots there)
- `packages/playground/src/pages/components/ComponentsIndex.tsx` — overview card
- `packages/playground/src/pages/mockups/registry.ts` — `'ButtonGroup'` in `ComponentName` union

### Composition

- Visual mode wraps **existing Button children directly**. No Button modification; ButtonGroup uses `React.Children.map` + `cloneElement` to inject `size` into Button children whose `size` is undefined.
- Segmented mode uses **the new `<ButtonGroup.Item>` subcomponent** with its own ARIA contract (`role="radio"`, `aria-checked`, roving tabindex).
- No shared overlay infrastructure; no portal, no focus trap.

## Public API

```ts
import type { ButtonSize } from '../Button';

/** Matches Button's size scale. */
export type ButtonGroupSize = ButtonSize; // 'xs' | 'sm' | 'md' | 'lg'

interface ButtonGroupBase {
  /**
   * Size propagated to children. Per-child `size` set explicitly wins. In
   * visual mode, propagation happens via cloneElement on Button children;
   * non-Button children pass through unchanged. In segmented mode,
   * `<ButtonGroup.Item>` reads size from context.
   */
  size?: ButtonGroupSize;
  /**
   * Disabled state for the entire group. In visual mode, consumers should
   * pass `disabled` per Button — `disabled` on ButtonGroup itself is a
   * no-op in visual mode. In segmented mode, sets `aria-disabled` on the
   * radiogroup and prevents `onValueChange` from firing.
   */
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

interface ButtonGroupVisual
  extends ButtonGroupBase, Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Visual mode marker — never set. TypeScript enforces this branch when value is absent. */
  value?: never;
  onValueChange?: never;
  /** Accessible name for the group landmark. Recommended for screen readers; optional. */
  'aria-label'?: string;
}

interface ButtonGroupSegmented<V extends string = string>
  extends ButtonGroupBase, Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /**
   * Currently-selected value. Setting this flips the component into
   * segmented mode — children must be `<ButtonGroup.Item>` instead of
   * `<Button>`.
   */
  value: V;
  /** Fired when a different Item is selected. */
  onValueChange: (next: V) => void;
  /** Required for a11y in segmented mode (radiogroup needs a label). */
  'aria-label': string;
  /** Alternative to aria-label: the id of an external labelling element. */
  'aria-labelledby'?: string;
}

export type ButtonGroupProps = ButtonGroupVisual | ButtonGroupSegmented;

export interface ButtonGroupItemProps {
  /** Value emitted to `onValueChange` when this item is selected. */
  value: string;
  /** Disabled state for this item only. Arrow nav skips over disabled items. */
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}
```

The discriminated union enforces:

- Visual mode: `<ButtonGroup>` or `<ButtonGroup size="sm">` — no `value`, no `onValueChange`.
- Segmented mode: `<ButtonGroup value={x} onValueChange={fn} aria-label="...">`. Both `value` AND `onValueChange` required together. `aria-label` required.
- Mixed: type error.

**Compound assembly:**

```ts
export const ButtonGroup = Object.assign(ButtonGroupRoot, { Item: ButtonGroupItem });
```

**Folder `index.ts` exports:**

```ts
export { ButtonGroup } from './ButtonGroup';
export type { ButtonGroupProps, ButtonGroupSize, ButtonGroupItemProps } from './ButtonGroup';
```

## Architecture flow

### Mode detection

```tsx
function ButtonGroupRoot(props: ButtonGroupProps) {
  const isSegmented = 'value' in props && props.value !== undefined;
  // ... branch ...
}
```

### Visual mode

Children are rendered as direct siblings inside a `<div data-mode="visual" role="group">`. `cloneElement` runs on each child:

```tsx
const children = React.Children.map(rawChildren, (child) => {
  if (!isValidElement(child)) return child;
  // Only propagate size into Button-typed elements; leave others (e.g., divider spans) untouched.
  if (child.type === Button && (child.props as { size?: ButtonSize }).size === undefined) {
    return cloneElement(child, { size });
  }
  return child;
});
```

SCSS uses native element selectors so we don't have to know Button's CSS Module hash:

```scss
.group[data-mode='visual'] {
  display: inline-flex;
}

.group[data-mode='visual'] > button {
  border-radius: 0;
  margin-left: calc(var(--border-width) * -1);
}

.group[data-mode='visual'] > button:first-child {
  margin-left: 0;
  border-top-left-radius: var(--radius-md);
  border-bottom-left-radius: var(--radius-md);
}

.group[data-mode='visual'] > button:last-child {
  border-top-right-radius: var(--radius-md);
  border-bottom-right-radius: var(--radius-md);
}

.group[data-mode='visual'] > button:hover,
.group[data-mode='visual'] > button:focus-visible {
  position: relative;
  z-index: 1;
}
```

The `position: relative; z-index: 1` lift on hover/focus prevents adjacent borders from clipping the focus ring.

**Mixed variants** are intentionally allowed. A "Save | Discard" group with `primary` + `secondary` Buttons looks correct in the join — the primary visually dominates.

### Segmented mode

Context provider holds `value`, `onValueChange`, `size`, `disabled`, and a `handleItemKeyDown` callback.

```tsx
interface ButtonGroupContextValue {
  value: string;
  onValueChange: (next: string) => void;
  size: ButtonGroupSize;
  disabled: boolean;
  // Item registration so the parent can compute next/prev for keyboard nav.
  registerItem: (value: string, disabled: boolean) => void;
  unregisterItem: (value: string) => void;
  handleItemKeyDown: (e: KeyboardEvent, value: string) => void;
}
```

Items register themselves on mount and unregister on unmount. The parent maintains an ordered list of registered (value, disabled) pairs for keyboard navigation.

**Item rendering:**

```tsx
function ButtonGroupItem({ value, disabled, children, className }: ButtonGroupItemProps) {
  const ctx = useButtonGroupContext('Item');
  useEffect(() => {
    ctx.registerItem(value, disabled ?? false);
    return () => ctx.unregisterItem(value);
  }, [ctx, value, disabled]);

  const isSelected = ctx.value === value;
  const effectiveDisabled = (disabled ?? false) || ctx.disabled;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-disabled={effectiveDisabled || undefined}
      tabIndex={isSelected ? 0 : -1}
      data-selected={isSelected ? '' : undefined}
      onClick={() => {
        if (effectiveDisabled) return;
        if (isSelected) return; // no-op on re-select
        ctx.onValueChange(value);
      }}
      onKeyDown={(e) => ctx.handleItemKeyDown(e, value)}
      className={clsx(styles.item, sizeClass[ctx.size], className)}
    >
      {children}
    </button>
  );
}
```

**Keyboard handling** in `ButtonGroupRoot`:

```tsx
function handleItemKeyDown(e: KeyboardEvent, currentValue: string) {
  const enabledItems = registeredItems.filter((it) => !it.disabled);
  if (enabledItems.length === 0) return;
  const idx = enabledItems.findIndex((it) => it.value === currentValue);
  if (idx === -1) return;

  let nextIdx: number | null = null;
  switch (e.key) {
    case 'ArrowRight':
    case 'ArrowDown':
      nextIdx = (idx + 1) % enabledItems.length;
      break;
    case 'ArrowLeft':
    case 'ArrowUp':
      nextIdx = (idx - 1 + enabledItems.length) % enabledItems.length;
      break;
    case 'Home':
      nextIdx = 0;
      break;
    case 'End':
      nextIdx = enabledItems.length - 1;
      break;
    default:
      return;
  }

  e.preventDefault();
  const nextValue = enabledItems[nextIdx]!.value;
  onValueChange(nextValue);
  // Focus the new item. Query by value via data-value attr OR via stored ref.
  // Implementation detail: items expose a registerItem(value, ref) so we can focus(ref.current).
  focusItem(nextValue);
}
```

**Roving tabindex**: only the currently-selected item has `tabIndex={0}`; others have `-1`. Tab moves IN/OUT of the group landing on the selected item; Arrow keys move within.

**Auto-select-on-focus**: Arrow keys move BOTH focus AND selection together. This is the WAI-ARIA APG "radio group" pattern.

**Segmented visual treatment:**

```scss
.group[data-mode='segmented'] {
  background: var(--color-bg-muted);
  border-radius: var(--radius-md);
  padding: 2px;
  display: inline-flex;
  gap: 2px;
}

.item {
  border: none;
  background: transparent;
  color: var(--color-fg-muted);
  cursor: pointer;
  font: inherit;
  padding: 4px var(--space-3);
  border-radius: calc(var(--radius-md) - 2px);
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}

.item[data-selected] {
  background: var(--color-bg);
  color: var(--color-fg);
  box-shadow: var(--shadow-xs);
}

.item:hover:not([data-selected]):not([aria-disabled]) {
  color: var(--color-fg);
}

.item[aria-disabled] {
  cursor: not-allowed;
  opacity: 0.5;
}

.item:focus-visible {
  @include focus-ring;
  outline: none;
}

// Size variants — match Button's height scale for visual consistency.
// camelCase naming matches Stack/Cluster/Grid precedent.
.item.sizeXs {
  height: var(--size-xs);
  padding: 0 var(--space-2);
  font-size: var(--font-size-xs);
}
.item.sizeSm {
  height: var(--size-sm);
  padding: 0 var(--space-3);
  font-size: var(--font-size-sm);
}
.item.sizeMd {
  height: var(--size-md);
  padding: 0 var(--space-3);
  font-size: var(--font-size-md);
}
.item.sizeLg {
  height: var(--size-lg);
  padding: 0 var(--space-4);
  font-size: var(--font-size-md);
}

// Consumed via a lookup table in ButtonGroupItem.tsx:
//   const sizeClass: Record<ButtonGroupSize, string> = {
//     xs: styles.sizeXs, sm: styles.sizeSm, md: styles.sizeMd, lg: styles.sizeLg,
//   };
```

### ARIA contract

| Mode      | Element                   | Role                | Attributes                                                                              |
| --------- | ------------------------- | ------------------- | --------------------------------------------------------------------------------------- |
| Visual    | `<div>` root              | `role="group"`      | `aria-label` (optional but recommended)                                                 |
| Visual    | child `<button>` (Button) | (button defaults)   | unchanged from Button                                                                   |
| Segmented | `<div>` root              | `role="radiogroup"` | `aria-label` **required** OR `aria-labelledby`; `aria-disabled` if group-level disabled |
| Segmented | `<button>` (Item)         | `role="radio"`      | `aria-checked`, `aria-disabled`, `tabIndex={selected ? 0 : -1}`                         |

**Dev warning**: if segmented mode is rendered without `aria-label` or `aria-labelledby`, log a `console.warn` (deferred via `queueMicrotask`).

## Testing strategy

`ButtonGroup.test.tsx` — ~22 cases:

### Visual mode

1. Renders without crashing with default props.
2. Root has `role="group"` and `data-mode="visual"`.
3. `aria-label` passes through to root.
4. Children render as direct siblings.
5. `size` propagates: `<ButtonGroup size="sm"><Button>x</Button></ButtonGroup>` → child Button has `size="sm"`.
6. Per-child `size` overrides group `size`.
7. Non-Button children pass through unchanged (a `<span>` element receives no size injection).
8. `className` merges onto root.

### Segmented mode

9. `<ButtonGroup value="a" onValueChange={fn} aria-label="x">` sets `role="radiogroup"` and `data-mode="segmented"`.
10. Item with matching `value` has `aria-checked="true"`; others `aria-checked="false"`.
11. Selected item has `tabIndex={0}`; others have `tabIndex={-1}`.
12. Click an unselected item → `onValueChange` called with that item's value.
13. Click an already-selected item → `onValueChange` NOT called.
14. `ArrowRight` from selected item → next item selected and focused.
15. `ArrowLeft` from selected item → previous item selected and focused.
16. `ArrowRight` from last item → wraps to first.
17. `ArrowLeft` from first item → wraps to last.
18. `Home` → first item selected and focused.
19. `End` → last item selected and focused.
20. Disabled item is skipped by Arrow navigation (selection jumps over it).
21. Group-level `disabled` → all items `aria-disabled`; clicks no-op; `onValueChange` is NOT called.
22. Dev warning fires when segmented mode used without `aria-label` or `aria-labelledby`.

### TypeScript-level

23. A `@ts-expect-error` test asserts that passing `value` without `onValueChange` (or vice versa) is a compile-time error. The discriminated union enforces "both or neither."

## Demo page

`packages/playground/src/pages/components/ButtonGroupDemo.tsx` — 6 examples:

1. **Visual: simple action group** — three Buttons (Cut / Copy / Paste), joined.
2. **Visual: mixed variants** — Save (primary) + Discard (secondary) in one joined group.
3. **Segmented: view toggle** — Grid / List / Calendar, controlled with `useState`.
4. **Segmented: timeframe filter** — Day / Week / Month.
5. **Size propagation** — group with `size="sm"`, all children pick it up; one child overrides with `size="md"` to show the override behavior.
6. **Disabled segmented** — group-level `disabled` set, demonstrates clicks no-op and the visual disabled state.

Standard nav wiring (route, AppShell entry under **Forms**, ComponentsIndex card, `'ButtonGroup'` in mockups registry).

## AGENTS.md TL;DR

Slot near Button (it's a Button-shaped composite). Section content:

````markdown
### `<ButtonGroup>` — joined Buttons + segmented control

```tsx
// Visual mode — joined Buttons, no shared state.
<ButtonGroup aria-label="Edit actions">
  <Button>Cut</Button>
  <Button>Copy</Button>
  <Button>Paste</Button>
</ButtonGroup>

// Segmented mode — single-select toggle group.
<ButtonGroup value={view} onValueChange={setView} aria-label="View mode">
  <ButtonGroup.Item value="grid">Grid</ButtonGroup.Item>
  <ButtonGroup.Item value="list">List</ButtonGroup.Item>
  <ButtonGroup.Item value="calendar">Calendar</ButtonGroup.Item>
</ButtonGroup>
```

- **Mode detection** is by props: with `value` + `onValueChange` you get segmented; without, you get visual joining.
- **Children differ by mode.** Visual: `<Button>` children. Segmented: `<ButtonGroup.Item>` children. Mixing the two is undefined behavior.
- **Size propagation** — `size` on the group propagates to children. Per-child override wins.
- **Keyboard nav (segmented only)** — Arrow keys move selection + focus; Home / End jump to ends; Tab moves IN/OUT of the group on the currently-selected item.
- **ARIA** — visual mode is `role="group"`; segmented mode is `role="radiogroup"` (requires `aria-label`).

**Anti-patterns:**

- ❌ Mixing visual `<Button>` children with `<ButtonGroup.Item>` in the same ButtonGroup — undefined behavior.
- ❌ Using ButtonGroup as a routing tab strip. That's what `<Tabs>` is for.
- ❌ Passing only `value` without `onValueChange` — type error.
- ❌ Multi-select via clever workarounds. Compose Checkboxes for that.

**See also:** `<Tabs>` for routing-style content switching, `<Radio>` for vertical radio lists.
````

## Hard Rule 8 cycle

Same shape as Modal / Drawer / Grid:

1. Run all gates (`make test`, `make build-lib`, `make lint`, `make build`, `npm pack --dry-run`).
2. Spawn fresh-context reviewer (opus) with the 10 review categories.
3. Fix Critical + Important findings; re-run gates; re-review.
4. Loop until "clean enough to stop".

## Out-of-PR follow-ups (noted, not in v1)

- Vertical orientation (`orientation="vertical"`).
- Multi-select segmented mode (would require a different ARIA model — toggle buttons with `aria-pressed`).
- Outlined-segmented variant (alternative segmented look without the muted background tray).
- An optional `<ButtonGroup.Separator>` for visual mode that injects an explicit divider between two action sub-groups (e.g., "Save | Cancel | Delete" with a separator before Delete).
