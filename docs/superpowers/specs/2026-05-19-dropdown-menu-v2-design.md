# DropdownMenu v2 — submenus, checkbox/radio items, groups, indicators

**Status:** approved (design phase) · **Date:** 2026-05-19 · **Branch:** `feat/dropdown-menu-v2`

## Problem

The shipped `<DropdownMenu>` covers basic action menus, but the CRM has four families of use cases the v1 surface doesn't reach:

1. **Nested actions** — "More" → submenu of less-common actions ("Export → CSV / JSON / PDF"). Currently consumers flatten the whole list, which scales poorly.
2. **Multi-select filters** — "Show: ☑ Active ☑ Pending ☐ Churned". Today the CRM uses bespoke popovers or inline checkbox columns.
3. **Single-select pickers that aren't form values** — "Sort by: ● Name ○ Date". A radio group inside a menu — neither a form Select nor a series of action items.
4. **Grouped + labeled items** — "Sort by [label] / View as [label] / ..." sections inside one menu. Visual grouping with accessible labels.

All four were explicitly deferred in the v1 spec (`docs/superpowers/specs/2026-05-19-dropdown-menu-design.md`, "Out of scope for v1"). v1 has been in production through one PR cycle; the foundations (Floating UI positioning, portaled content, roving tabindex, dismissal, typeahead) are stable and ready to extend.

## Goal

Ship four new subcomponent families on the existing `<DropdownMenu>` API:

1. `<DropdownMenu.Sub>` + `<DropdownMenu.SubTrigger>` + `<DropdownMenu.SubContent>` — nested menus.
2. `<DropdownMenu.CheckboxItem>` + `<DropdownMenu.ItemIndicator>` — toggleable items with state.
3. `<DropdownMenu.RadioGroup>` + `<DropdownMenu.RadioItem>` — mutually exclusive selection.
4. `<DropdownMenu.Group>` + `<DropdownMenu.Label>` — visual + accessible grouping with section labels.

Also refactor: split `DropdownMenu.tsx` (currently ~700 lines) into focused files so each one stays under ~300 lines.

**Non-goals:** hover-to-open on the root trigger (still click-only), animations on open/close, `href` items for navigation, "safe triangle" submenu hover heuristic, mobile touch-specific behavior, `<DropdownMenu.ItemGroup>` for general non-radio grouping with grid alignment of indicators (the indicator slot is per-CheckboxItem/RadioItem, not a Content-level grid column in v2).

## Dependency decision

**No new runtime dependencies.** Everything builds on the existing `@floating-ui/react-dom` + the hand-rolled patterns from v1. Submenu hover delays use `setTimeout` (no debounce library). Recursive context is React's `createContext` shadowed at each `<Sub>` level.

## File split (Task 1 of the plan)

Current layout:

```
src/components/DropdownMenu/
  DropdownMenu.tsx              ~700 lines — all subcomponents
  DropdownMenu.module.scss
  DropdownMenu.test.tsx
  index.ts
```

After this PR:

```
src/components/DropdownMenu/
  context.ts                    types: DropdownMenuContextValue, RegisteredItem, GroupContextValue, etc.; the contexts themselves; the useDropdownMenuContext / useGroupContext hooks
  utils.ts                      mergeRefs, chain, sanitizeId
  Root.tsx                      DropdownMenuRoot (provider) — handles controlled-open + registry
  Trigger.tsx                   Trigger (the cloneElement pattern + keyboard open)
  Content.tsx                   Content (Floating UI, portal, outside-click, document keydown, handleKeyDown)
  Item.tsx                      Item, Separator
  CheckboxItem.tsx              CheckboxItem
  Radio.tsx                     RadioGroup, RadioItem
  ItemIndicator.tsx             ItemIndicator (used by CheckboxItem and RadioItem)
  Group.tsx                     Group, Label
  Sub.tsx                       Sub, SubTrigger, SubContent
  DropdownMenu.tsx              composes the Object.assign(Root, { Trigger, Content, ... })
  DropdownMenu.module.scss      one file, additive
  DropdownMenu.test.tsx         one file, one suite per subcomponent (suites grow; structure stays)
  index.ts                      re-exports
```

Reasoning for keeping tests as one file: cross-feature interactions (CheckboxItem inside a Sub; RadioGroup inside a Group; SubTrigger inside a Group) are real and want shared `setup()` helpers. Splitting tests by file would force duplicating helpers or extracting them. One file with multiple `describe` blocks is the pragmatic call.

Tests stay green through the split (Task 2 of the plan is "split, all 186 existing tests still pass").

## Architecture

### Context hierarchy

A single `DropdownMenuContext` is created in `context.ts`. **Each `<Sub>` creates a new instance of the same context** that shadows the parent. The provider stack at any node looks like:

```
<DropdownMenuContext.Provider value={rootCtx}>      ← from <DropdownMenu>
  ... root trigger and items ...
  <DropdownMenuContext.Provider value={subCtx1}>    ← from <DropdownMenu.Sub>
    ... sub items ...
    <DropdownMenuContext.Provider value={subCtx2}>  ← from a nested <DropdownMenu.Sub>
      ...
    </>
  </>
</>
```

Inside any subtree, `useContext(DropdownMenuContext)` resolves to the **nearest** provider — which is the level you're "in". A SubTrigger is the boundary: it reads the **parent** context (to register itself as a menuitem in the parent) but its `<SubContent>` reads the **sub** context. The `<Sub>` provider sits between SubTrigger and SubContent, so SubTrigger is in the parent context, SubContent and its children are in the sub context. This works without any explicit threading.

For checkbox/radio close-on-select cascading (closing all menus when a leaf item is selected), `<Sub>` exposes a `closeAll()` function via context that walks up to the root. Each Sub's `closeAll` calls its own `setOpen(false)` AND the parent's `closeAll`. Root's `closeAll` just calls `setOpen(false)`.

### Extended context value

`DropdownMenuContextValue` (in `context.ts`) extends from v1 with:

```ts
interface DropdownMenuContextValue {
  // ... existing v1 fields ...
  open: boolean;
  setOpen: (next: boolean) => void;
  triggerRef: RefObject<HTMLElement | null>;
  contentId: string;
  openIntent: 'first' | 'last' | null;
  setOpenIntent: (intent: 'first' | 'last' | null) => void;
  registerItem: (item: RegisteredItem) => () => void;
  itemsRef: RefObject<RegisteredItem[]>;
  activeIndex: number;
  setActiveIndex: (i: number) => void;

  // New in v2:
  /** Walks up to root and closes every menu in the chain. */
  closeAll: () => void;
  /** Depth in the menu chain. 0 = root. Used by SubContent to know how to position relative to its trigger. */
  depth: number;
}
```

`RegisteredItem` gets one new field:

```ts
interface RegisteredItem {
  id: string;
  ref: RefObject<HTMLDivElement | null>;
  disabled: boolean;
  label: string;
  /** If this item is a SubTrigger, the function that opens its submenu. ArrowRight on this item calls it. */
  openSubmenu?: () => void;
}
```

### Group context (separate, smaller)

A second context tracks `<Group>`'s label id for `aria-labelledby` wiring. `<Label>` reads the context and applies the id to itself.

```ts
interface GroupContextValue {
  labelId: string;
}
```

If `<Label>` is rendered outside a `<Group>`, it just renders without the id — no error, no special handling. Labels are useful standalone for "Quick actions" / "View options" style section headings.

### Radio group context (separate, smaller)

```ts
interface RadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
}
```

`<RadioItem>` requires a parent `<RadioGroup>` (throws in dev if not found, like Sub subcomponents require their parents).

## Subcomponent API surfaces

### `<DropdownMenu.Group>` + `<DropdownMenu.Label>`

```tsx
<DropdownMenu.Group>
  <DropdownMenu.Label>Sort by</DropdownMenu.Label>
  <DropdownMenu.RadioGroup value={sort} onValueChange={setSort}>
    <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
    <DropdownMenu.RadioItem value="date">Date</DropdownMenu.RadioItem>
  </DropdownMenu.RadioGroup>
</DropdownMenu.Group>
```

```ts
export interface DropdownMenuGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Group contents — typically a Label followed by items, RadioGroup, etc. */
  children: ReactNode;
}

export interface DropdownMenuLabelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}
```

**Group** renders `<div role="group" aria-labelledby={labelId}>`, generates `labelId` via `useId`, provides it through `GroupContext`. The `aria-labelledby` attribute is only set when there's actually a Label child — but since we can't introspect children, we just always set `aria-labelledby={labelId}`; if no Label uses the id, the attribute points to a non-existent element. **Fix:** make Group's `aria-labelledby` reactive — `<Label>` registers presence with the group, and Group emits the attribute conditionally. Slightly fiddly; the simpler "always emit, gracefully degrade if no Label" is acceptable per APG which says "ideally has an accessible name".

Going with the simpler form: always emit `aria-labelledby={labelId}`. If no Label is present, the attribute points nowhere — most screen readers ignore broken references gracefully, and the visual presentation is the same. Tradeoff documented in JSDoc.

**Label** renders `<div id={labelId} className={styles.label}>` with no role (decorative). Styled small/muted/uppercase. Not focusable, not part of the item registry.

### `<DropdownMenu.CheckboxItem>`

```tsx
<DropdownMenu.CheckboxItem checked={isOn} onCheckedChange={setOn}>
  <DropdownMenu.ItemIndicator>
    <CheckIcon size={14} />
  </DropdownMenu.ItemIndicator>
  Show archived
</DropdownMenu.CheckboxItem>

// Or without explicit indicator — default ✓ is rendered when checked:
<DropdownMenu.CheckboxItem checked={isOn} onCheckedChange={setOn}>
  Show archived
</DropdownMenu.CheckboxItem>
```

```ts
export interface DropdownMenuCheckboxItemProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  /** Whether the item is checked. */
  checked: boolean;
  /** Called with the new checked state when the item is activated. */
  onCheckedChange: (checked: boolean) => void;
  /**
   * Whether activating closes the entire menu chain. Defaults to `false`
   * — checkbox items typically toggle in place inside a multi-select menu.
   */
  closeOnSelect?: boolean;
  /** Disabled items don't fire onCheckedChange, are skipped by keyboard nav, render dimmed. */
  disabled?: boolean;
  /** Optional trailing shortcut hint. */
  shortcut?: string;
  children: ReactNode;
}
```

**ARIA:** `role="menuitemcheckbox"`, `aria-checked={checked}`, `aria-disabled={disabled || undefined}`.

**Behavior:**

- Activating (click / Enter / Space): fires `onCheckedChange(!checked)`.
- If `closeOnSelect={true}`: also calls `ctx.closeAll()` (closes the entire menu chain).
- If `closeOnSelect={false}` (default): the menu stays open, focus stays on the item.

**Layout:** the JSX has TWO leading slots — indicator (left) and icon (right of indicator, left of label). The indicator slot is always rendered (a `<span>` of fixed width); content inside is only shown when `checked` is true. This gives label alignment when CheckboxItems are stacked. No `icon` prop on CheckboxItem in v2 — the indicator slot is the only leading visual element. (Rationale: combining `icon` + indicator complicates layout and is rarely needed.)

**Why a separate `ItemIndicator` component instead of a prop:** the user asked for a slot. The slot can render anything (custom icon, animated check, etc.) and its visibility is controlled by the parent CheckboxItem/RadioItem's checked state — the consumer doesn't need to thread `checked` to a render prop. When omitted entirely, a default `✓` glyph is rendered. This is the Radix idiom.

### `<DropdownMenu.RadioGroup>` + `<DropdownMenu.RadioItem>`

```tsx
<DropdownMenu.RadioGroup value={sort} onValueChange={setSort}>
  <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
  <DropdownMenu.RadioItem value="date">
    <DropdownMenu.ItemIndicator>
      <DotIcon size={8} />
    </DropdownMenu.ItemIndicator>
    Date
  </DropdownMenu.RadioItem>
  <DropdownMenu.RadioItem value="size">Size</DropdownMenu.RadioItem>
</DropdownMenu.RadioGroup>
```

```ts
export interface DropdownMenuRadioGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** The currently-selected value. */
  value: string;
  /** Called with the new value when a RadioItem is activated. */
  onValueChange: (value: string) => void;
  children: ReactNode;
}

export interface DropdownMenuRadioItemProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  /** The value this item represents. Activating sets the group's value to this. */
  value: string;
  /**
   * Whether activating closes the entire menu chain. Defaults to `true` —
   * radio is "the selection IS the action", so closing matches user expectation.
   */
  closeOnSelect?: boolean;
  disabled?: boolean;
  shortcut?: string;
  children: ReactNode;
}
```

**ARIA:** RadioGroup renders `<div role="group" aria-labelledby={groupLabelId}>` (or `<div role="radiogroup">` — both are valid per APG; `radiogroup` is more specific). Going with `role="radiogroup"` to be explicit.

RadioItem: `role="menuitemradio"`, `aria-checked={value === groupValue}`, `aria-disabled={disabled || undefined}`.

**Behavior:** Same as CheckboxItem, but instead of toggling, sets the group's value. Default `closeOnSelect={true}`.

**Indicator slot:** same `<ItemIndicator>` pattern. Default glyph is `●` instead of `✓`.

### `<DropdownMenu.ItemIndicator>`

```tsx
<DropdownMenu.CheckboxItem checked={x}>
  <DropdownMenu.ItemIndicator>
    {/* Custom indicator rendered only when checked */}
    <AnimatedCheck />
  </DropdownMenu.ItemIndicator>
  Label
</DropdownMenu.CheckboxItem>
```

```ts
export interface DropdownMenuItemIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}
```

**Behavior:**

ItemIndicator is a marker component that CheckboxItem and RadioItem detect in their children and place into the indicator slot. **CheckboxItem and RadioItem own the visibility decision** (based on `checked`); ItemIndicator is a thin wrapper that just renders its own children.

```ts
// ItemIndicator — pure passthrough:
function ItemIndicator({ children, ...rest }: DropdownMenuItemIndicatorProps) {
  return <span {...rest}>{children}</span>;
}
```

CheckboxItem extracts the indicator from `children` via `React.Children.toArray + React.isValidElement + c.type === ItemIndicator`, then renders it conditionally in the slot:

```ts
// CheckboxItem internals:
const childrenArray = React.Children.toArray(children);
const indicator = childrenArray.find(
  (c) => React.isValidElement(c) && c.type === ItemIndicator,
);
const labelContent = childrenArray.filter((c) => c !== indicator);

return (
  <div role="menuitemcheckbox" aria-checked={checked} ...>
    <span className={styles.indicatorSlot}>
      {checked && (indicator ?? <span className={styles.defaultIndicator}>✓</span>)}
    </span>
    <span className={styles.itemLabel}>{labelContent}</span>
    {shortcut !== undefined && <span className={styles.shortcut}>{shortcut}</span>}
  </div>
);
```

**Three usage forms work:**

```tsx
// 1. Default check ✓ (no ItemIndicator child):
<DropdownMenu.CheckboxItem checked={x}>Show archived</DropdownMenu.CheckboxItem>

// 2. Custom indicator:
<DropdownMenu.CheckboxItem checked={x}>
  <DropdownMenu.ItemIndicator>
    <AnimatedCheck />
  </DropdownMenu.ItemIndicator>
  Show archived
</DropdownMenu.CheckboxItem>

// 3. RadioItem with default bullet ● (per type — RadioItem uses ● as fallback, not ✓):
<DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
```

**Detection is shallow** — only direct children of CheckboxItem/RadioItem are inspected. Nesting ItemIndicator deeper (e.g., inside a wrapper div) means CheckboxItem won't find it and will render the default. Document this in JSDoc.

**ItemIndicator's location in children is irrelevant** — CheckboxItem extracts it and places it in the slot regardless of where the consumer put it in the JSX. Conventional placement is before the label; nothing enforces it.

**No `IndicatorContext` is needed** — ItemIndicator doesn't need to know about `checked`; CheckboxItem/RadioItem decide whether to render it.

### `<DropdownMenu.Sub>` + `<DropdownMenu.SubTrigger>` + `<DropdownMenu.SubContent>`

```tsx
<DropdownMenu.Sub>
  <DropdownMenu.SubTrigger>More options</DropdownMenu.SubTrigger>
  <DropdownMenu.SubContent>
    <DropdownMenu.Item onSelect={exportCsv}>Export CSV</DropdownMenu.Item>
    <DropdownMenu.Item onSelect={exportJson}>Export JSON</DropdownMenu.Item>
    <DropdownMenu.Sub>
      <DropdownMenu.SubTrigger>Share</DropdownMenu.SubTrigger>
      <DropdownMenu.SubContent>
        <DropdownMenu.Item onSelect={shareLink}>Copy link</DropdownMenu.Item>
        <DropdownMenu.Item onSelect={shareEmail}>Email</DropdownMenu.Item>
      </DropdownMenu.SubContent>
    </DropdownMenu.Sub>
  </DropdownMenu.SubContent>
</DropdownMenu.Sub>
```

```ts
export interface DropdownMenuSubProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

export interface DropdownMenuSubTriggerProps extends HTMLAttributes<HTMLDivElement> {
  /** Disabled trigger renders dimmed, doesn't open the sub, skipped by keyboard nav. */
  disabled?: boolean;
  /** Optional leading icon, matching Item's icon slot. */
  icon?: ReactNode;
  children: ReactNode;
}

export type DropdownMenuSubContentProps = DropdownMenuContentProps;
```

**Sub** is a provider that:

- Creates a new context instance (its own open state, registry, etc.).
- Reads the PARENT context to grab `closeAll` and increments `depth`.
- Wraps its `closeAll` to call parent's `closeAll` after closing self.

**SubTrigger** is a hybrid:

- Renders an Item-like row (`role="menuitem"`) WITH an `aria-haspopup="menu"` + `aria-expanded={subOpen}` because it's also a trigger.
- Has a right-side chevron `▶` (rendered via CSS `::after` or as an explicit child).
- Registers with the PARENT context's `registerItem`, including an `openSubmenu` callback that opens the sub.
- Reads the SUB context's `setOpen` for its trigger behavior.
- Mouse enter → 100ms timer → setSubOpen(true).
- Mouse leave from SubTrigger → 200ms timer → setSubOpen(false). Cancelled if mouse enters SubContent within the timeout.
- Click on SubTrigger → always-open (not toggle). Toggle-on-click conflicts with the hover delay; if mouse hover already opened the sub, a click would close it (annoying). Once open, the sub closes via hover-leave, ArrowLeft, Escape, click-outside, or cascading selection.
- Keyboard ArrowRight (when this SubTrigger is the active item in parent): setSubOpen(true), focus first item in sub.
- Enter / Space (when active): same as ArrowRight.

**SubContent** is a Content variant:

- Uses Floating UI with `placement` defaulting to `'right-start'` (submenus open to the right of the trigger; flip to left if no room).
- Same portal + outside-click + dismissal as Content, with extra:
  - ArrowLeft inside SubContent → close this sub, focus its SubTrigger.
- The `closeAll` propagates: selecting any Item inside the sub closes EVERYTHING up to root.

**Hover interaction with sibling items in parent menu:**
When mouse moves over a sibling Item in the parent menu (or another SubTrigger), it cancels any pending "open this sub" timer AND, if a sub is currently open, starts a "close that sub" timer. The "close" timer is also 200ms. If mouse moves back into SubTrigger or SubContent, cancel close.

**SubTrigger's data-state:** while the sub is open, SubTrigger gets `data-state="open"` so SCSS can keep it visually highlighted (looks active when focus has moved into the sub).

**Maximum depth:** no enforced limit. CRM use cases rarely go past 2 levels; 3+ is allowed but discouraged.

### Combined keyboard semantics across the chain

| Key                         | Action                                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ArrowDown / Up / Home / End | Move active item in the CURRENT (deepest open) menu. Skips disabled and separators.                                                                           |
| ArrowRight                  | If active is a SubTrigger: open its sub, focus its first item. Otherwise no-op.                                                                               |
| ArrowLeft                   | If we're in a sub (depth > 0): close THIS sub, focus its SubTrigger. Otherwise no-op.                                                                         |
| Enter / Space               | Activate the active item. SubTrigger → open the sub + focus first. CheckboxItem → toggle. RadioItem → set + (default) close all. Item → onSelect + close all. |
| Escape                      | Close the current (deepest) menu, return focus to its trigger (which may be a SubTrigger in the parent). Pressing Escape again closes the next level up.      |
| Tab / Shift+Tab             | Close ENTIRE chain (root and all subs), focus root trigger, do NOT preventDefault (browser continues Tab from root trigger).                                  |
| Printable char              | Typeahead in the CURRENT menu only. Buffer is per-menu, not shared.                                                                                           |

**Implementation note on the keyboard handlers:** the existing v1 `handleKeyDown` and document-level keydown listener in Content stay as-is for the root. SubContent has its own equivalents (the same logic applies at any level — each Content/SubContent instance has its own listeners scoped to `ctx.open` of its own context).

### Cascading close

When a leaf item selects with `closeOnSelect=true` (Item, RadioItem default, CheckboxItem if explicitly opted in), call `ctx.closeAll()` on the leaf's nearest context. closeAll walks up: each Sub's closeAll calls its parent's closeAll. Root's closeAll just calls `setOpen(false)` and focuses the root trigger.

When `closeOnSelect=false` (CheckboxItem default, RadioItem if opted out): only fire the state change; don't close anything.

When Escape: close ONLY the current level. The current level's setOpen(false) doesn't cascade.

When click-outside: each Content's outside-click listener calls its OWN setOpen(false). If we're 3 levels deep and the user clicks far outside, all three listeners fire and close their own levels independently. Order doesn't matter — they all end up closed.

### Styling and tokens

Existing SCSS module gets additions, no fundamental restructuring.

**New tokens** (add to `tokens.scss`):

- None expected. The check and bullet are colored with `--color-fg` or `--color-accent`. Layout uses existing spacing.

Possible additions if needed:

- `--size-dropdown-indicator-slot: 16px` — width of the leading indicator slot. If we don't add this, hardcode in SCSS (raw value warning from stylelint may force us to add the token).

**SCSS additions** (will land in implementation):

- `.indicatorSlot` — fixed-width leading column, centered content.
- `.subTriggerChevron` — pseudo-element or span on the right side of SubTrigger.
- `.label` (for `<Label>` component, distinct from `.label` for item text) — small uppercase muted text. Rename existing `.label` (item-text) to `.itemLabel` to avoid collision.
- `.group` — `padding-block` to separate groups visually. NO `margin` (Hard rule 4).

### Test plan (high level — full matrix in the plan)

Add new test suites:

1. `'DropdownMenu — Label and Group'` — render, aria-labelledby wiring, not focusable.
2. `'DropdownMenu — CheckboxItem'` — checked rendering, onCheckedChange firing, default close-on-select=false, opt-in close, ItemIndicator default glyph + custom child + omitted (no indicator at all if no `<ItemIndicator>`).
3. `'DropdownMenu — RadioGroup'` — value/onValueChange, aria-checked, default close-on-select=true, RadioGroup requires parent contract.
4. `'DropdownMenu — Sub'` — open via click, open via ArrowRight, open via hover delay, ArrowLeft closes sub, Escape closes only current level, click-outside closes all, selecting an item closes all, nested 2-level sub.
5. `'DropdownMenu — keyboard across chain'` — typeahead scoped per menu, focus management across open/close, data-state="open" on SubTrigger while sub open.

Existing 186 tests must continue to pass through the v1 refactor (Tasks 1-2 of the plan).

## JSDoc, AGENTS.md, README updates

- Every new exported symbol gets full JSDoc per Hard rule 7.
- `AGENTS.md` gets new TL;DRs for each subcomponent family, with canonical usage snippets.
- Anti-patterns table grows: "Don't use CheckboxItem for one-off actions"; "Don't nest more than 2 sub-levels"; "Don't put a SubTrigger outside a Sub"; etc.
- `README.md`: no changes (the table already lists DropdownMenu).

## Scope checklist (Core invariant)

Per root `CLAUDE.md`:

1. **Unit tests** — new suites listed above; cross-feature tests for compositions; existing 186 tests still pass.
2. **Playground demo** — DropdownMenuDemo gets 4 new Examples: nested actions, multi-select checkbox filter, radio group sort picker, grouped + labeled mixed menu (Checkbox + Radio + Sub in one).
3. **Demo wired** — already wired (Task 18 of v1 plan); no changes.
4. **Re-exports** — all new types from `src/index.ts`.
5. **JSDoc + AGENTS.md** — comprehensive.
6. (v1's #6 about CLAUDE.md wishlist) — wishlist already updated in v1.

## Out of scope (deferred to v3+)

- Hover-to-open root trigger
- Animations (open/close transitions on Content and SubContent)
- "Safe triangle" submenu hover heuristic
- `href` items for navigation (use a wrapping Link when shipped)
- Mobile / touch-specific submenu behavior (no good story today; consumers should avoid deep nests on touch)
- Content-level grid alignment of indicators (indicator slot is per-CheckboxItem/RadioItem only)
- `<DropdownMenu.Arrow>` (visual arrow pointing to the trigger)
- Roving tabindex extension to handle SubTrigger keyboard semantics (`aria-activedescendant` pattern) — sticking with roving for now

Each is a clean addition on top of v2's surface.

## Implementation order (preview)

The plan will break this into tasks. Rough order:

1. Refactor: split `DropdownMenu.tsx` into the file structure above. Behavior unchanged. All 186 tests pass.
2. Add `<Group>` + `<Label>` (smallest, no behavior changes elsewhere).
3. Add `<ItemIndicator>` (used by CheckboxItem and RadioItem next; pure passthrough, no context needed).
4. Add `<CheckboxItem>` (uses ItemIndicator).
5. Add `<RadioGroup>` + `<RadioItem>` (uses ItemIndicator + Group for a11y).
6. Add `<Sub>` + `<SubTrigger>` + `<SubContent>` — biggest task. Hover, ArrowRight/Left, recursive context, cascading close.
7. Cross-feature tests (CheckboxItem in Sub, Group around RadioGroup, etc.).
8. SCSS + new tokens (if needed).
9. JSDoc + AGENTS.md + index.ts re-exports.
10. Playground demo additions.
11. Pre-push review-fix cycle.
