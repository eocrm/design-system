# DropdownMenu component

**Status:** approved (design phase) · **Date:** 2026-05-19 · **Branch:** `feat/dropdown-menu`

## Problem

The CRM needs a button that opens a floating menu of actions — kebab overflow menus on table rows, "Add ▾" split-action buttons in toolbars, "More" wells on detail pages. The library has no such primitive. Today these get hand-rolled per page with raw `<button>` and ad-hoc `<div>` floating panels, none of which is keyboard- or screen-reader-correct. The `@eocrm/design-system` `CLAUDE.md` wishlist (`packages/design-system/CLAUDE.md:154-172`) called this out as a known gap.

## Goal

Ship `<DropdownMenu>` as a fully accessible (WAI-ARIA menu pattern), token-styled, composable component that:

1. Renders a trigger of the consumer's choice (typically `<Button>`).
2. Opens a floating panel of items aligned to the trigger.
3. Auto-flips and shifts to stay in the viewport.
4. Implements full keyboard navigation (Arrow/Home/End/Enter/Space/Escape/Tab/typeahead).
5. Closes on outside click, Escape, item selection, or Tab-out.
6. Does all of this without depending on any UI/component library.

**Non-goals:** submenus, checkbox / radio menu items, custom item rendering beyond `{ label, icon, shortcut, tone }`, navigation menu items with `href`, mobile-only behavior. These are revisitable post-v1 if the CRM demands them.

## Dependency decision

This is the first new runtime dependency since the library shipped.

- **Add `@floating-ui/react-dom`** (~6-7kb gz) to `packages/design-system/package.json` `dependencies`. It is a positioning math primitive, not a UI library — it renders nothing, sets no styles, has no opinions about ARIA. Same category as `clsx`. It does one thing (compute floating-element coordinates with `flip`/`shift`/`size` middleware) and does it better than any reasonable hand-rolled version.
- **Do NOT add Radix or any other component library.** The wishlist in `packages/design-system/CLAUDE.md` previously listed several Radix primitives; that section will be updated as part of this PR to reflect the new direction: hand-roll behavior on top of Floating UI for any future popover-shaped component (Tooltip, Popover, Select, Combobox, Toast, Dialog).
- Migration off Floating UI is intentionally clean: when CSS anchor positioning (`anchor-name` / `position-try-fallbacks`) has acceptable browser support (~2027), the dependency can be removed without changing the public API.

## API — compound component

The component is a tree of optional, composable parts. A flat `items` config was considered and rejected: discriminated unions over `{ label, separator, icon, shortcut, group, danger, … }` grow brittle as soon as v2 features land, and consumers can't conditionally render items inline without rebuilding the array imperatively. Tabs is correctly config-based because tabs are a flat bounded list; menus are not.

### Canonical usage

```tsx
import { DropdownMenu, Button } from '@eocrm/design-system';

<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Actions</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    <DropdownMenu.Item onSelect={edit}>Edit</DropdownMenu.Item>
    <DropdownMenu.Item onSelect={duplicate} shortcut="⌘D">
      Duplicate
    </DropdownMenu.Item>
    <DropdownMenu.Separator />
    <DropdownMenu.Item onSelect={remove} tone="danger">
      Delete
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu>;
```

### Subcomponent surface

| Subcomponent             | Renders                  | Required        | Notes                                                                                                                                                                                                    |
| ------------------------ | ------------------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DropdownMenu`           | nothing (provider)       | yes             | Owns open state, refs, ids, item registry. No DOM.                                                                                                                                                       |
| `DropdownMenu.Trigger`   | the child element        | exactly 1 child | Clones its single React-element child to inject `ref`, `aria-haspopup="menu"`, `aria-expanded`, `aria-controls`, `onClick`, `onKeyDown`. Child must accept a ref via `forwardRef`. `<Button>` qualifies. |
| `DropdownMenu.Content`   | a `div role="menu"`      | yes when open   | Portaled to `document.body`. Positioned by Floating UI. Owns keyboard nav, dismissal, focus management.                                                                                                  |
| `DropdownMenu.Item`      | a `div role="menuitem"`  | 0+              | Optional `icon`, `shortcut`, `disabled`, `tone` (`'default'` \| `'danger'`), required `onSelect`.                                                                                                        |
| `DropdownMenu.Separator` | a `div role="separator"` | 0+              | Decorative divider. Not focusable. No props beyond `className`.                                                                                                                                          |

### Props in detail

```ts
export interface DropdownMenuProps {
  /** Children. Must contain exactly one Trigger and one Content. */
  children: ReactNode;
  /** Optional controlled-open API. If both are provided, the consumer owns open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Default open for uncontrolled usage. Defaults to `false`. */
  defaultOpen?: boolean;
}

export interface DropdownMenuTriggerProps {
  /** Exactly one React element. Must forward refs and accept the injected handlers. */
  children: ReactElement;
}

export type DropdownMenuSide = 'top' | 'bottom';
export type DropdownMenuAlign = 'start' | 'center' | 'end';

export interface DropdownMenuContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Preferred side. Floating UI auto-flips to the opposite side if it doesn't fit. Default `'bottom'`. */
  side?: DropdownMenuSide;
  /** Edge of the menu that aligns to the corresponding trigger edge. Default `'start'`. */
  align?: DropdownMenuAlign;
  /** Gap in px between trigger and menu. Default `4` (one `--space-1`). */
  sideOffset?: number;
  /** Optional explicit min-width. Default: menu sizes to its content with a minimum equal to trigger width. */
  minWidth?: number | string;
}

export type DropdownMenuItemTone = 'default' | 'danger';

export interface DropdownMenuItemProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /** Called when the item is activated (click or Enter/Space). The consumer should perform the action. */
  onSelect: () => void;
  /** Visual tone. `'danger'` for destructive actions (Delete, Revoke). Default `'default'`. */
  tone?: DropdownMenuItemTone;
  /** Optional leading icon. Rendered in a fixed-size slot so labels stay aligned. */
  icon?: ReactNode;
  /** Optional trailing shortcut hint (e.g. `'⌘D'`). Pure visual cue — does NOT register a global handler. */
  shortcut?: string;
  /** Disabled items are skipped by keyboard nav, dimmed visually, and won't fire `onSelect` on click. */
  disabled?: boolean;
}

export interface DropdownMenuSeparatorProps extends HTMLAttributes<HTMLDivElement> {}
```

### Type exports

From `src/index.ts`:

```ts
export { DropdownMenu } from './components/DropdownMenu';
export type {
  DropdownMenuProps,
  DropdownMenuTriggerProps,
  DropdownMenuContentProps,
  DropdownMenuItemProps,
  DropdownMenuSeparatorProps,
  DropdownMenuSide,
  DropdownMenuAlign,
  DropdownMenuItemTone,
} from './components/DropdownMenu';
```

## Behavior

### Open / close

- Click trigger → toggle open.
- Enter / Space / ArrowDown on focused trigger → open and focus first non-disabled item.
- ArrowUp on focused trigger → open and focus last non-disabled item.
- Escape while open → close, return focus to trigger.
- Tab / Shift+Tab while open → close, programmatically focus the trigger, do NOT `preventDefault`. The browser then continues Tab traversal from the trigger to the next (or previous) focusable element in normal DOM order — this is the WAI-ARIA menu pattern, and it's why we don't simply trap focus.
- Click outside → close. "Outside" means `pointerdown` whose `target` is not inside Content **and** not inside the Trigger element. Excluding the Trigger from outside-click detection prevents a double-fire when the user clicks the Trigger to close (the click handler toggles open=false; without the exclusion, the outside-click listener would then fight it).
- Outside click does not return focus to the trigger (the user is interacting elsewhere).
- Click on an enabled item → fire `onSelect`, close, return focus to trigger.

The provider exposes a controlled-open API (`open` + `onOpenChange`) for consumers who need to drive it externally (rare — e.g., opening programmatically after an async event).

### Keyboard navigation inside Content

The `role="menu"` panel implements roving tabindex: exactly one item has `tabindex="0"` (the "active" one) at a time, others have `tabindex="-1"`.

| Key                 | Action                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| ArrowDown           | Move active to next non-disabled item; wrap to first at end.                                                                          |
| ArrowUp             | Move active to previous non-disabled item; wrap to last at start.                                                                     |
| Home                | Move active to first non-disabled item.                                                                                               |
| End                 | Move active to last non-disabled item.                                                                                                |
| Enter / Space       | Activate the active item (fire its `onSelect`, close menu, return focus to trigger).                                                  |
| Escape              | Close, return focus to trigger.                                                                                                       |
| Tab / Shift+Tab     | Close, focus trigger, do not preventDefault — browser continues Tab from the trigger.                                                 |
| Printable character | Typeahead: append to a 500ms-debounced buffer; jump to first non-disabled item whose label starts with the buffer (case-insensitive). |

Separators are not focusable and are skipped entirely by all navigation keys.

### Focus management

- Trigger keeps a ref so we can `triggerRef.current?.focus()` on close-via-Escape and close-via-select.
- Content focuses itself on open (so keyboard nav works without an extra Tab), then the active item gets `tabindex="0"` and is focused.
- Re-opening the menu resets active to first non-disabled item (or last, if opened via ArrowUp).

### Positioning

`@floating-ui/react-dom`'s `useFloating` with middleware:

```ts
useFloating({
  open,
  placement: `${side}-${align}`, // e.g. 'bottom-start'
  middleware: [
    offset(sideOffset),
    flip(),
    shift({ padding: 8 }),
    size({
      apply({ availableHeight, rects, elements }) {
        elements.floating.style.maxHeight = `${availableHeight}px`;
        elements.floating.style.minWidth =
          typeof minWidth === 'number'
            ? `${minWidth}px`
            : (minWidth ?? `${rects.reference.width}px`);
      },
    }),
  ],
  whileElementsMounted: autoUpdate,
});
```

The menu portals into `document.body` to escape `overflow: hidden` and stacking-context traps. Floating UI handles cross-portal coordinate math correctly.

### Compound state via context

A single `DropdownMenuContext` carries:

```ts
interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean, source?: 'mouse' | 'keyboard-start' | 'keyboard-end') => void;
  triggerRef: RefObject<HTMLElement | null>;
  contentId: string;
  // Item registry — items self-register on mount so Content can do roving tabindex / typeahead.
  registerItem: (
    id: string,
    ref: RefObject<HTMLDivElement | null>,
    label: string,
    disabled: boolean,
  ) => () => void;
  items: RegisteredItem[];
  activeIndex: number;
  setActiveIndex: (i: number) => void;
}
```

`registerItem` returns the unregister cleanup. Items self-register in a `useEffect` so the Content can iterate them in DOM order without children prop-drilling.

### ARIA

| Element                | Attributes                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------- | --- | ------------------------------- |
| Trigger (cloned child) | `aria-haspopup="menu"`, `aria-expanded={open}`, `aria-controls={open ? contentId : undefined}` |
| Content (`div`)        | `role="menu"`, `id={contentId}`, `tabIndex={-1}`, `aria-orientation="vertical"`                |
| Item (`div`)           | `role="menuitem"`, `tabIndex={active ? 0 : -1}`, `aria-disabled={disabled                      |     | undefined}`, `data-tone={tone}` |
| Separator (`div`)      | `role="separator"`                                                                             |

`role="menuitem"` is correct here per the WAI-ARIA APG menu pattern. The looser `role="button"` pattern is for non-menu popovers; we're a menu of actions.

### Trigger child cloning

`Trigger` accepts exactly one React element child. Implementation:

```tsx
function Trigger({ children }: DropdownMenuTriggerProps) {
  const ctx = useContext(DropdownMenuContext);
  if (!isValidElement(children)) {
    throw new Error('<DropdownMenu.Trigger> requires exactly one React element child.');
  }
  const childRef = (children as any).ref ?? null;
  return cloneElement(children, {
    ref: mergeRefs(ctx.triggerRef, childRef),
    'aria-haspopup': 'menu',
    'aria-expanded': ctx.open,
    'aria-controls': ctx.open ? ctx.contentId : undefined,
    onClick: chain(children.props.onClick, () => ctx.setOpen(!ctx.open, 'mouse')),
    onKeyDown: chain(children.props.onKeyDown, (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        ctx.setOpen(true, 'keyboard-start');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        ctx.setOpen(true, 'keyboard-end');
      }
    }),
  });
}
```

`mergeRefs` and `chain` are small local utilities (not exported). The Button's existing `forwardRef` makes this work cleanly. A dev-only `console.error` fires if the child isn't a valid element.

### Styling and tokens

All styles in `DropdownMenu.module.scss` against tokens only (Hard rule 3). Anticipated rules:

```scss
.content {
  background: var(--color-bg);
  border: var(--border-width) solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  padding: var(--space-1);
  min-width: 160px;
  z-index: var(--z-dropdown);
  outline: none; // Content itself is focusable but doesn't show a ring; items show focus
}

.item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-md);
  color: var(--color-fg);
  cursor: default;
  user-select: none;
}

.item[data-tone='danger'] {
  color: var(--color-danger);
}

.item[tabindex='0'],
.item:hover:not([aria-disabled='true']) {
  background: var(--color-bg-muted);
}

.item[data-tone='danger'][tabindex='0'],
.item[data-tone='danger']:hover:not([aria-disabled='true']) {
  background: var(--color-bg-danger-subtle); // new token if missing
  color: var(--color-danger);
}

.item[aria-disabled='true'] {
  color: var(--color-fg-disabled);
  cursor: not-allowed;
}

.icon {
  /* fixed-size slot */
}
.shortcut {
  margin-left: auto;
  color: var(--color-fg-subtle);
  font-size: var(--font-size-sm);
}
.separator {
  height: var(--border-width);
  background: var(--color-border);
  margin: var(--space-1) 0;
}
```

**New token to evaluate during implementation:** `--color-bg-danger-subtle` for the highlighted-danger-item background. If `--color-badge-danger-bg` already reads correctly under this usage, reuse it instead of adding a new token (per Hard rule 3, prefer reusing existing tokens). Decision deferred to implementation phase.

### Layout discipline

Per Hard rule 4 (`packages/design-system/CLAUDE.md`), the component's SCSS cannot use `margin`, ancestor `position`, viewport-anchoring `top`/`left`, etc. The exception applies because:

- The Content is portaled to `document.body`, so its `position: fixed` is set inline by Floating UI (not by our SCSS) — this is not "owning layout", it's the floating-element's intrinsic positioning, and is the only way Floating UI works.
- All other layout (margin between trigger and surrounding elements, page-level placement) is the consumer's responsibility as usual.

This nuance gets a one-line comment in `DropdownMenu.module.scss` so a future reviewer doesn't flag it as a rule violation.

## Tests

`DropdownMenu.test.tsx` against the matrix from Hard rule 1, plus behavior:

**Rendering:**

- Renders trigger; menu is not in the DOM until opened.
- `ref` forwarded to Content's `div`.
- `className` on Content / Item / Separator is merged, not replaced.
- Empty Content (no items) renders without crashing.

**Variants:**

- `tone="danger"` applies the `data-tone='danger'` attribute on the item.
- `disabled` sets `aria-disabled="true"` and prevents `onSelect`.
- `align="start" | "center" | "end"` and `side="top" | "bottom"` are passed to Floating UI (verify via the resulting `data-side` / `data-align` attributes our component writes; the actual computed coordinates aren't asserted because jsdom doesn't lay out).
- Icon and shortcut render in the correct slots.

**Open/close:**

- Click trigger → opens.
- Click trigger again → closes.
- Click outside Content and outside Trigger → closes.
- Click Trigger while open → closes (does NOT re-open due to outside-click double-fire).
- Escape → closes and trigger is focused.
- Click an enabled item → `onSelect` fires, menu closes, trigger is focused.
- Click a disabled item → no `onSelect`, menu stays open.
- Tab from inside menu → closes.

**Keyboard nav:**

- ArrowDown / ArrowUp cycle through enabled items, skipping disabled and separators.
- Home / End jump to first / last enabled items.
- Enter and Space activate the focused item.
- ArrowDown on trigger opens with first item active.
- ArrowUp on trigger opens with last item active.
- Typeahead: typing `"de"` jumps to the first item starting with "de".

**ARIA:**

- Trigger has `aria-haspopup="menu"`, `aria-expanded` toggles.
- Content has `role="menu"`.
- Items have `role="menuitem"`.
- Separator has `role="separator"`.

**Controlled mode:**

- Pass `open={true}` + `onOpenChange`: parent owns state; internal toggles call `onOpenChange` without mutating internal state.

Some interaction tests (typeahead timing, blur-out detection) use `vi.useFakeTimers()` so the debounce and `pointerdown` handlers fire deterministically.

## Playground demo

`packages/playground/src/pages/components/DropdownMenuDemo.tsx`. Three examples:

1. **Toolbar overflow** — a `Cluster` toolbar with a "More ▾" trigger revealing secondary actions.
2. **Table row actions** — a small mock table where each row's last cell is a kebab `<Button variant="ghost">⋯</Button>` opening a per-row menu. Demonstrates `align="end"` and that the menu doesn't overflow the row.
3. **Destructive grouping** — a menu with a leading group of edit-y actions, separator, and a `tone="danger"` Delete. Demonstrates separator + danger styling.

Wired into:

- `App.tsx` route `/components/dropdown-menu`.
- `AppShell.tsx` Components sidebar nav.
- `DemoIndex.tsx` overview card.

## Documentation

- JSDoc on every exported symbol (Hard rule 7): component, each subcomponent, each prop, each variant type. Includes `@example` blocks (canonical, table-row kebab, danger), `@remarks When NOT to use` (use `<Select>` for value selection; use a `<Toolbar>` for an always-visible action strip; don't put a navigation link in a menuitem — that's a `<Link>` job), `@remarks Anti-patterns` (multiple Triggers under one DropdownMenu, putting raw `<button>` as Trigger child without `forwardRef`, using `tone="danger"` for non-destructive actions, nesting DropdownMenus).
- `packages/design-system/AGENTS.md` gets a `<DropdownMenu>` section in TL;DR style matching existing entries.
- `packages/design-system/CLAUDE.md` wishlist is updated: remove the "(Radix DropdownMenu)" annotation, update other wishlist entries to reflect the new "no UI libs; Floating UI for positioning" stance.

## Scope checklist (Core invariant)

Per the root `CLAUDE.md` core invariant, this component is not done until all six are true:

1. `DropdownMenu.test.tsx` exists with the matrix above.
2. `DropdownMenuDemo.tsx` exists in the playground.
3. Demo is wired into `App.tsx`, `AppShell.tsx`, `DemoIndex.tsx`.
4. Re-exported from `packages/design-system/src/index.ts`.
5. JSDoc `@remarks When NOT to use` + `@remarks Anti-patterns` on the component function, AND `AGENTS.md` updated.
6. Updates to `packages/design-system/CLAUDE.md` wishlist reflect the new dependency stance.

## Out of scope (deferred)

- Submenus (`<DropdownMenu.SubTrigger>`, `<DropdownMenu.SubContent>`)
- Checkbox items (`<DropdownMenu.CheckboxItem>`) and radio groups
- Labels / groups (`<DropdownMenu.Label>`, `<DropdownMenu.Group>`)
- Hover-to-open trigger (we only support click / keyboard activation)
- Animations on open/close
- Custom item rendering beyond `{ label, icon, shortcut, tone }`
- Anchor positioning via CSS (`anchor-name`) instead of Floating UI — revisit when browser support is broad
- Mobile/touch-specific behavior (we rely on `pointerdown` which works on touch, but no special bottom-sheet treatment)

Each of these is a clean addition on top of the v1 surface; none requires a redesign of the existing API.

## Implementation order (preview — full plan in writing-plans step)

1. Add `@floating-ui/react-dom` to library `dependencies`. Verify it doesn't pull in unexpected transitive deps.
2. Scaffold `DropdownMenu/` directory with empty files.
3. Build context + `<DropdownMenu>` provider + `<Trigger>` cloning behavior. First test: trigger toggles open.
4. Build `<Content>` with Floating UI positioning + portal + outside-click + Escape.
5. Build `<Item>` with self-registration, `onSelect`, disabled handling.
6. Implement roving tabindex + ArrowDown/Up/Home/End.
7. Implement Enter/Space activation + Tab dismissal.
8. Implement typeahead.
9. Implement `<Separator>`.
10. Style with tokens. Add `--color-bg-danger-subtle` if needed.
11. JSDoc everything.
12. Playground demo + wiring.
13. `AGENTS.md` and `CLAUDE.md` updates.
14. Pre-push review-fix cycle (Hard rule 8): gates green, fresh-context review agent, fix Critical+Important, repeat.
