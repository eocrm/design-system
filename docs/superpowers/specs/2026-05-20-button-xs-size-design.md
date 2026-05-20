# Button — `xs` size

**Date:** 2026-05-20
**Status:** Spec — awaiting review
**Component:** `packages/design-system/src/components/Button/`

## Goal

Add an `xs` size to `Button` for icon-only and dense inline actions. It must continue to support a short text label alongside an icon — that requirement is why this is a size variant rather than a dedicated `IconButton` component.

## Non-goals

- Building a separate `IconButton` component. The wishlist entry in `packages/design-system/CLAUDE.md` stays open in case a strictly-icon API later proves ergonomically necessary, but it is not part of this change.
- Extending `xs` to `Input` or `Avatar`. Their size unions stay as-is. The `--size-xs` token is added to the shared scale but no other component opts in.

## Sizing & token

- Height: **20px**.
- Token: add `--size-xs: 20px` to `packages/design-system/src/styles/tokens.scss`, slotted directly above `--size-sm: 24px`.
- `--font-size-xs: 11px` already exists in tokens and is used for the label.
- `--space-1` (4px) and `--space-2` (8px) already exist and are reused for gap/padding.

Avatar's JSDoc claim that its diameter "matches the shared `--size-*` scale" stays accurate — adding `--size-xs` extends the scale, it does not require every component to support every step.

## SCSS

Add an `.xs` block to `Button.module.scss`, ordered above `.sm`:

```scss
.xs {
  height: var(--size-xs);
  padding: 0 var(--space-2);
  font-size: var(--font-size-xs);
  gap: var(--space-1);
}
```

Notes:

- `padding: 0 var(--space-2)` (8px horizontal) gives icon-only buttons a tidy ~28×20 footprint with a 12px icon and works for the short-text case without needing a second rule.
- `gap: var(--space-1)` overrides the base `.button { gap: var(--space-2) }` because `.xs` is declared after the base block. Tighter inter-child gap reads correctly at this size.
- No icon-only special case (no `iconOnly` prop, no `:has(> svg:only-child)` rule). Consumer passes a single icon child + `aria-label`. YAGNI confirmed during brainstorming.

## Component code (`Button.tsx`)

1. Extend `ButtonSize` union:
   ```ts
   export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';
   ```
2. Update the `size` prop JSDoc to list `xs` first:
   ```
   - `xs` (20px) — icon-only or very dense inline actions (row controls,
     chip-adjacent buttons). Pass `aria-label` when icon-only.
   - `sm` (24px) — dense toolbars, tables, inline actions.
   - `md` (32px, default) — most contexts.
   - `lg` (40px) — marketing-style empty states or emphasized primary actions.
   ```
3. Add an `@example` for icon-only:
   ```tsx
   <Button size="xs" variant="ghost" aria-label="Remove">
     <X size={12} />
   </Button>
   ```
4. Add an anti-pattern to the `@remarks Anti-patterns` block:
   ```
   - ❌ Using `size="xs"` for the primary or most prominent action in a
     section. `xs` is for inline density, not emphasis.
   ```
5. Add a "When NOT to use" entry on touch-target acceptance:
   ```
   - On a touch-first surface, prefer `sm` or larger. `xs` is acceptable on
     this codebase because the CRM is desktop-first, but 20×~28 is below
     WCAG 2.5.5 Level AAA guidance (24×24).
   ```

No change to the spread order or `forwardRef` shape.

## Tests (`Button.test.tsx`)

1. Extend the existing `'applies the variant and size class names'` test to also assert `size="xs"` adds the `xs` class.
2. Add a new test: `'renders icon-only at xs with aria-label'` — render `<Button size="xs" aria-label="Remove"><svg data-testid="icon" /></Button>`, assert the button has the accessible name "Remove" and the icon is present.

Both tests use the existing global Vitest setup (`globals: true`) and the same imports already used elsewhere in the file.

## Demo (`ButtonDemo.tsx`)

1. **Sizes example.** Add `<Button size="xs">Extra small</Button>` to the existing "Sizes" Example, ordered first. Update the inlined `code={`…`}` string so the snippet stays self-contained (per the recent inline-constants pattern in `e383598`).
2. **New icon-only example.** Add a new `<Example>` titled "Icon-only at xs" with two buttons in a `Cluster gap="sm"`:
   - `<Button size="xs" variant="ghost" aria-label="Remove"><X size={12} /></Button>`
   - `<Button size="xs" variant="secondary" aria-label="Edit"><Pencil size={12} /></Button>`

   Code snippet shows both, with `aria-label` highlighted as required.

`X` and `Pencil` are added to the existing `lucide-react` import in `ButtonDemo.tsx` (the file currently imports `Check, Plus, Search, Trash2`; `lucide-react` is already a playground dependency).

## `AGENTS.md` update

Replace line 43:

```
- `size`: `sm` / `md` (default) / `lg`
```

with:

```
- `size`: `xs` / `sm` / `md` (default) / `lg` — `xs` for icon-only or dense inline actions; pass `aria-label` when icon-only.
```

## Files touched

- `packages/design-system/src/styles/tokens.scss` — add `--size-xs: 20px`
- `packages/design-system/src/components/Button/Button.tsx` — union, JSDoc, anti-pattern, when-not-to-use note
- `packages/design-system/src/components/Button/Button.module.scss` — `.xs` block
- `packages/design-system/src/components/Button/Button.test.tsx` — extend class assertion + icon-only render test
- `packages/design-system/AGENTS.md` — size list update on line 43
- `packages/playground/src/pages/components/ButtonDemo.tsx` — extend Sizes example, add Icon-only example

## Verification (post-implementation)

This change touches `packages/design-system/**`, so Hard rule 8 (pre-push review-fix cycle) applies. Gates: `npm test`, `npm run typecheck`, `npm run lint:css`, `npm run build`, `npm pack --dry-run -w @eocrm/design-system`. Then a fresh-context reviewer pass until verdict is `clean enough to stop`.

Manual visual check at `make up`:

- `xs` buttons across all five variants render correctly and stay legible at 11px.
- Disabled `xs` icon-only ghost button is still visually readable (the open risk flagged during design).
- Focus ring at `xs` is not clipped or visually awkward.
- Icon at 12px is centered and not cramped against the edges.

## Risks

- **Disabled visual at xs.** A 12px icon at `--opacity-disabled` on a ghost background may read as nearly invisible. If the manual visual check confirms this, raise it during the review-fix cycle and consider lifting disabled opacity slightly at xs (token addition, not Button-local override).
- **Touch targets.** Below WCAG 2.5.5 AAA guidance. Accepted for desktop-first CRM; documented in JSDoc so consumers see the constraint at the point of use.

## Addendum — 2026-05-20 — `iconOnly` boolean prop

After visually checking the xs Icon-only example at `/components/button`, the rectangular shape (~28×20 with 8px horizontal padding) looked off compared to the square icon-only buttons used by Material, Radix, Ant, and Bootstrap. The initial decision was to leave Button with one padding rule and let icon-only shake out as a slightly-wider rectangle. We are reversing that — adding an opt-in `iconOnly` boolean prop.

**What changes from the original spec:**

- Add `iconOnly?: boolean` to `ButtonProps`.
- When `iconOnly` is `true`, the button renders as a square: `aspect-ratio: 1; padding: 0;`. Width derives from the size's `height` token (`xs` → 20×20, `sm` → 24×24, `md` → 32×32, `lg` → 40×40).
- The prop is independent of `size` — works at every step on the scale, not just `xs`.
- Consumer must pass `aria-label`. JSDoc says so prominently. No type-level enforcement in this iteration (would require a discriminated union over `ButtonHTMLAttributes`); revisit if misuse appears in code review.
- `IconButton` stays off the wishlist as a separate component — the prop covers the same ground without duplicating Button's variant/disabled/focus story.

**SCSS approach:**

```scss
.iconOnly {
  aspect-ratio: 1;
  padding: 0;
}
```

Source order matters — `.iconOnly` is declared **after** all size blocks so its `padding: 0` overrides the size-class horizontal padding. `aspect-ratio: 1` is not a layout property in the sense Rule 4 prohibits (it derives width from already-set height; it doesn't take parent space).

**Files affected by the addendum (delta from original file list):**

- `packages/design-system/src/components/Button/Button.tsx` — add `iconOnly?: boolean` to `ButtonProps`, JSDoc, class wiring.
- `packages/design-system/src/components/Button/Button.module.scss` — add `.iconOnly` rule at the bottom of the size section.
- `packages/design-system/src/components/Button/Button.test.tsx` — add a test that `iconOnly` adds the class.
- `packages/playground/src/pages/components/ButtonDemo.tsx` — update the Icon-only at xs example to pass `iconOnly`; update the inline code string to match. Optionally add an md `iconOnly` example for contrast.
- `packages/design-system/AGENTS.md` — mention `iconOnly` in the Button section.

**Visual verification:** Re-screenshot `/components/button` after implementation and confirm the icon-only buttons render as 20×20 squares (xs) with the icon centered.
