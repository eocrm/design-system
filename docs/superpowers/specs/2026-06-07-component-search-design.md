# Component search (⌘K typeahead) — design

**Date:** 2026-06-07
**Status:** Approved (brainstorm) → ready for implementation plan
**Package:** playground only (`packages/playground`). **No library change, no version bump.**

## Problem / goal

The playground ships ~60 components; finding one means scanning a long grouped rail. Make the list searchable: type to jump to any component (or page) fast. Reuse the existing TopBar search box as a live typeahead with a results panel anchored directly under it, triggered/focused by ⌘K.

## Decision (from brainstorming)

- **Anchored typeahead, not a centered modal.** Reuse `TopBar.Search` as a live combobox input; a results panel drops in **directly under it**.
- **⌘K (and Ctrl+K) focuses the combobox** (and selects its text so you can type immediately). The TopBar's existing ⌘K hint — which the DS documents as visual-only — becomes functional.
- **Global jump-to contents:** all navigable destinations — every component (all rail groups), the references (Components overview, Design tokens, Architecture), and the mockups.
- **Hand-rolled anchored panel** in the playground. The DS `<Popover>` is a non-modal dialog that **moves focus into the panel on open**, which would break a typeahead (the input must keep focus so you keep typing). There is no standalone focus-retaining anchored-listbox primitive (that behavior lives inside `<Select>`, tied to value-selection). The playground is tooling (Rule 6/7 apply only to mockups), so a small hand-rolled dropdown is the right call here.

## Mechanism

A new playground component `CommandSearch` renders inside `TopBar.Start` in place of the bare `<TopBar.Search>`:

- **Input:** `TopBar.Search` is `forwardRef` and spreads input attrs, so it's driven as the combobox input — controlled `value`/`onChange`, plus `onKeyDown`, a `ref` (for ⌘K focus), and combobox ARIA: `role="combobox"`, `aria-expanded`, `aria-controls={listboxId}`, `aria-activedescendant={activeOptionId}`, `aria-autocomplete="list"`. Placeholder → `"Search components & pages…"`, keeping the `hotkey={['⌘','K']}` hint.
- **Anchoring:** `TopBar.Search` is wrapped in a `position: relative` container; the results panel is its absolutely-positioned sibling (`position: absolute; top: calc(100% + var(--space-1)); left: 0`, a sensible min/!max width, `max-height` + `overflow-y: auto`). No Floating UI — it always drops straight down; the top bar has room.
- **Panel:** `role="listbox"` with `id={listboxId}`; each row is a `role="option"` with a stable `id` (icon + label + a muted section tag). The active row gets `aria-selected` + a highlight; `aria-activedescendant` on the input points to it. Focus never leaves the input.

## Data source (single source of truth, no drift)

Extract the rail's destination data out of `AppShell.tsx` into a new `layout/AppShell/navItems.ts`:

- Move the existing `mockupItems`, `componentOverview`, `tokensReference`, `architectureReference`, and `componentGroups` definitions there and export them (AppShell imports them — the rail renders unchanged).
- Export a derived flat `SEARCH_ITEMS: { to: string; label: string; section: string; icon: LucideIcon }[]` built from those, with `section` = the component group heading (`Layout` / `Forms` / `Display` / `Feedback` / `Navigation` / `Overlays`) for components, `"Reference"` for the three reference pages, and `"Mockups"` for mockup items. Because `SEARCH_ITEMS` derives from the same arrays the rail uses, a newly-added component appears in search automatically.

## Behavior

- **Filter:** case-insensitive substring on `label` (trimmed query). Empty query → panel closed. Matches → listed in `SEARCH_ITEMS` order (components first, then reference, then mockups), scrollable. No matches → a single non-interactive "No results" row.
- **Keyboard** (handled on the input's `onKeyDown`):
  - `↑` / `↓` move the active index (wrapping); opening with a non-empty query sets active to the first match.
  - `Enter` → `navigate(activeItem.to)` (react-router `useNavigate`), then close + clear.
  - `Esc` → close the panel, clear the query, keep focus in the input (one predictable behavior — no two-step).
  - `⌘K` / `Ctrl+K` (global `keydown` in `AppShell`, `preventDefault`) → focus + select the input so typing replaces any prior query.
- **Mouse:** click a row → navigate + close; click outside the container → close (keep/clear text — clear on navigate, keep on outside-click). Hovering a row sets the active index.
- **On navigate:** clear the query and close the panel (so the box is ready for the next search).

## Files (all playground tooling)

- **Create** `packages/playground/src/layout/AppShell/navItems.ts` — the moved nav data + derived `SEARCH_ITEMS`.
- **Create** `packages/playground/src/layout/AppShell/CommandSearch.tsx` — the combobox (input + anchored results panel + keyboard nav). Exposes an imperative focus handle (or accepts a `ref`) so AppShell's ⌘K listener can focus it.
- **Create** `packages/playground/src/layout/AppShell/CommandSearch.module.scss` — the relative wrapper + absolute panel + row styles (tokens only; playground tooling may use its own module CSS — this is not a mockup).
- **Modify** `packages/playground/src/layout/AppShell/AppShell.tsx` — import nav data from `navItems.ts` (remove the inline arrays); render `<CommandSearch>` in `TopBar.Start`; add the global ⌘K/Ctrl+K `keydown` effect that focuses the CommandSearch input.

## Accessibility

WAI-ARIA combobox-with-listbox pattern: input `role="combobox"` + `aria-expanded`/`aria-controls`/`aria-activedescendant`/`aria-autocomplete="list"`; panel `role="listbox"`; rows `role="option"` + `aria-selected`. DOM focus stays on the input; the active option is indicated via `aria-activedescendant` (not focus). Esc dismisses; click-outside dismisses; the "No results" row is `aria-disabled`/non-interactive.

## Verification

- Gates: `make build` (typecheck + bundle), `make lint`, `npm run format:check`. (`make test` is library-only — the playground has no test setup; do not add one.)
- **Playwright** (the functional gate):
  - Press ⌘K (Meta+K) → the TopBar search is focused; type `tooltip` → the panel appears anchored under the box listing Tooltip; `↓` then `Enter` → URL is `/components/tooltip`, panel closed, query cleared.
  - Type `dash` → Dashboard (mockup) appears with a "Mockups" tag; click it → `/mockups/dashboard`.
  - Type a nonsense string → "No results" row.
  - `Esc` closes the panel; click-outside closes it.
  - Confirm the panel is positioned directly beneath the search box (its top edge ≈ the input's bottom edge).
- Light + dark both legible (the panel uses tokens, so it flips with the theme).

## Non-goals

- A centered modal command palette (rejected in favor of the anchored typeahead).
- A general command executor (actions/toggles) — navigation only.
- Fuzzy ranking — plain substring is enough for ~70 items.
- Any library change (no new DS component; the DS `Popover`/`Select` are intentionally not used here).
- ⌘K on full-bleed routes (`/mockups/login`, `404`/`error` standalone) — those render outside `AppShell`, so there's no TopBar/search there; ⌘K is inert on them, consistent with today.

## Branch

`feat/component-search`, off `main` (`v0.1.28`). Its own PR. Touches only `packages/playground/**` → a Release run is created but its `publish` job is **skipped** (no `packages/design-system` change); `deploy-playground` runs, so the live playground gets the feature with no library version bump.
