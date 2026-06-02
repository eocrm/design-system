# Floating content stacks above Modal/Drawer (overlay z-fix)

**Date:** 2026-06-02
**Status:** Approved (brainstorm) → ready for implementation plan
**Package:** `@eocrm/design-system`

## Problem

A `Select`, `Popover`, or `DropdownMenu` opened **from inside** a `Modal` or `Drawer` renders **behind** the overlay panel, so it's invisible/unusable (you click the trigger and "nothing happens").

Root cause is purely z-index. All three floating surfaces portal to `document.body` with a z-index **below** `--z-modal` (1100):

- `Select` listbox — `Select.module.scss` `z-index: var(--z-popover)` (1050)
- `Popover` content — `--popover-z` → `var(--z-popover)` (1050)
- `DropdownMenu` content — `--dropdown-menu-z` → `var(--z-dropdown)` (1000)
- `Modal` / `Drawer` overlay+panel — `var(--z-modal)` (1100) and `+1`

Since the portaled floating element and the overlay portal are both `document.body` children, the higher z-index (the overlay) wins and the floating content is occluded.

This combination was never exercised before (no demo/mockup put a Select/menu/popover inside an overlay), so it went unnoticed. The focus trap is **not** the problem — `useFocusTrap` already exempts `[role="listbox"]`, `[data-popover-content]`, and `[data-dropdown-menu-content]` from recapture. Only the z-index is wrong.

## Goal

When a floating surface (`Select` / `Popover` / `DropdownMenu`) is opened with its trigger **inside** a `Modal`/`Drawer`, its content renders **above** that overlay. Page-level layering (a modal covering page-level popovers/menus) is unchanged.

## Approach — context-aware z elevation (chosen)

A floating surface elevates its own z-index **only when** its trigger lives inside an overlay portal. This is surgical: it changes nothing for floating content opened at page level.

1. **New token** `--z-overlay-floating` in `styles/tokens.scss`, valued **above** `--z-modal` and **below** `--z-toast` (proposed **1190**; the scale is dropdown 1000 < popover 1050 < modal 1100 < **overlay-floating 1190** < toast 1200 < tooltip 1300). Covers a realistically-stacked overlay (`--z-modal + depth*2`, a few levels) while staying under toasts/tooltips.

2. **Shared hook** `useInOverlay(reference, active)` in `src/components/_internal/overlay/`, exported from its `index.ts`:
   - Returns `true` when `reference`'s element is within `[data-drawer-portal-root], [data-modal-portal-root]`.
   - Computes on open via `useLayoutEffect` keyed on `active` (so it's correct on the first painted frame and re-checks each open); returns `false` when `active` is false.
   - `reference` is the floating surface's trigger/reference element — each component already has it (Floating UI's `refs.reference`, or the trigger ref in component context).

3. **Each floating Content** calls the hook and, when `true`, sets a `data-in-overlay=""` attribute on its portaled root (alongside the existing `data-*-content` / `role="listbox"` attribute). Its SCSS adds an elevation rule:

   ```scss
   &[data-in-overlay] {
     z-index: var(--z-overlay-floating);
   }
   ```

   - `Select` → `Select.module.scss` `.listbox[data-in-overlay]`
   - `Popover` → `Popover.module.scss` `.content[data-in-overlay]`
   - `DropdownMenu` → `DropdownMenu.module.scss` `.content[data-in-overlay]`

   Submenus (`DropdownMenu.SubContent`) inherit the same treatment so a submenu opened in a drawer also elevates.

No change to the base z-scale, to page-level layering, or to the focus-trap exemptions.

## Components in scope

`Select` (listbox), `Popover` (content; this also fixes `ConfirmationPopover`, which is built on `Popover`), `DropdownMenu` (content + sub-content). Out of scope (potential follow-ups, not part of this change): `OptionsPicker` (separate floating impl), `Tooltip`/`Toast` (already above modal), `Calendar`/`DatePicker` popovers (built on their own surfaces — verify separately if needed).

## Files

- **Create:** `src/components/_internal/overlay/useInOverlay.ts` + `useInOverlay.test.ts`
- **Modify:** `src/components/_internal/overlay/index.ts` (export `useInOverlay`)
- **Modify:** `src/styles/tokens.scss` (add `--z-overlay-floating`)
- **Modify:** `Select/Listbox.tsx` + `Select/Select.module.scss`
- **Modify:** `Popover/Content.tsx` + `Popover/Popover.module.scss`
- **Modify:** `DropdownMenu/Content.tsx` + `DropdownMenu/DropdownMenu.module.scss`
- **Modify (demo / validation):** add an `Example` to the `Drawer` demo page (`packages/playground/src/pages/components/DrawerDemo.tsx`) that opens a `Select` **and** a `DropdownMenu` inside the drawer — documents the fix and gives a manual-verification surface. (Per playground Rule 4 the demo already exists; this only adds an example.)

## Testing

- **`useInOverlay.test.ts`** — element inside a `[data-drawer-portal-root]` (and `[data-modal-portal-root]`) → `true`; element at body root → `false`; `active=false` → `false`.
- **Per component** (extend `Select`/`Popover`/`DropdownMenu` test files): rendered **inside** a `Drawer` (or a `[data-drawer-portal-root]` wrapper) and opened → the portaled content carries `data-in-overlay`; rendered at page level and opened → it does **not**. (jsdom has no layout/stacking, so the contract is asserted via the attribute, which is what drives the SCSS elevation.)
- Existing Select/Popover/DropdownMenu/Modal/Drawer tests must stay green (no regression to page-level behavior).
- Library Rule 8 gates: `npm test`, `npm run typecheck`, `npm run lint:css`, `npm run build`, `npm pack --dry-run`.

## Conventions / constraints

- **Token discipline:** the elevated z is a token (`--z-overlay-floating`) applied via SCSS keyed on `data-in-overlay` — no inline z-index, no raw values.
- **Rule 8 (library):** run the pre-push review-fix loop (fresh-context reviewer over `packages/design-system/**`) until clean.
- No public API change — purely internal behavior. No new exported props (the elevation is automatic). `useInOverlay` stays internal (`_internal/overlay`), not re-exported from the package root.

## Non-goals

- Deeply-stacked overlays beyond what the fixed `--z-overlay-floating` covers (e.g. a popover inside a 40-deep modal stack) — not a real scenario here.
- Reordering the base z-scale or changing "a page-level modal covers page-level popovers/menus."
- `OptionsPicker` and other non-listed floating surfaces (follow-up if they exhibit the same issue).

## Branch

`fix/overlay-floating-z`, off `main` (independent of the form-primitives / mockup branches). Its own PR to `main`.
