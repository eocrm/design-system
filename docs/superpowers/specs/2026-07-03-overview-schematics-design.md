# Components overview: schematic previews

**Date:** 2026-07-03
**Status:** Approved
**Scope:** playground only (`/components` overview page); no library changes.

## Decision

Replace all 87 live-component previews on the components overview grid with
**blueprint-accent schematics** — stylized wireframe drawings composed from a
small shared vocabulary. All cards, no exceptions (visual-identity cards like
Palette/Logo/Avatar included). The real components remain one click away on
their demo pages.

Why: uniform visual language across the grid, no live-component edge cases
(portals, theme quirks, loading states, heavy mounts like RTE/DataTable/
Calendar), and previews that communicate _structure_ at thumbnail size better
than shrunken real renders.

## Visual language (chosen in brainstorm: "Blueprint accent")

- **Tinted shapes** sketch structure: `--color-accent-subtle-bg` fills with
  `--radius-sm`, optional 1px `--color-border`-style accent-tinted borders.
- **Exactly one solid-accent element per card** (`--color-accent`) marking the
  component's key affordance: Button → primary button; Select → chevron;
  Kanban → the dragged card; Slider → the thumb; Pagination → current page;
  Modal → the confirm action; etc.
- **Dashed containers** (1.5px dashed accent-tint) for "region/slot" concepts
  (Kanban columns, Dropzone, layout primitives).
- Colors come ONLY from tokens → dark mode works with no special-casing.
  No raw hex anywhere.
- Nothing interactive: no pointer events, no state, no portals. Static JSX.

## Structure

- **New file** `packages/playground/src/pages/components/overviewSchematics.tsx`
  - Internal vocabulary: ~10 tiny presentational components (e.g. `Box`,
    `Solid`, `Bar`, `Dashed`, `Dot`, `Pill`, `Row`, `Col`, `Panel`, `Chip`)
    styled via a co-located CSS module
    (`overviewSchematics.module.scss`) using tokens exclusively.
  - Exports `SCHEMATICS: Record<string, ReactNode>` keyed by card `name`
    (exact `items[].name` strings from `ComponentsIndex.tsx`).
  - Each schematic ≤ ~15 lines of vocabulary JSX; every schematic fits the
    fixed 150px preview box (max content height ~118px).
- **`ComponentsIndex.tsx`**
  - `preview: SCHEMATICS['<Name>']` per item; the `preview` field stays in the
    items array so per-card lookup is explicit and greppable.
  - DELETE: all `@eocrm/design-system` component imports, `DataTablePreview`,
    `_previewRow/_previewCols/_previewData`, the `Block` helper, skeleton/bar/
    tile usages in previews, and lucide icons used only by previews.
  - A meta-guard: dev-only `console.warn` if an item has no schematic (missing
    key) — the card then renders an empty preview rather than crashing.
- **`ComponentsIndex.module.scss`**: `.skeleton/.bar/.tile` primitives move to
  (or are superseded by) the schematic vocabulary; remove if unused after the
  swap. `.cardPreview` (fixed 150px + overflow hidden) and the 2-line clamped
  description stay as-is.
- **`packages/playground/CLAUDE.md`** Rule 4.3: "add a card to the overview
  grid with a small live preview" → "…with a schematic preview built from the
  shared vocabulary in `overviewSchematics.tsx`" (same PR).

## Acceptance

- All 87 cards render a schematic; grid heights stay uniform (one distinct
  card height).
- Zero console errors/warnings on the page.
- Verified in a real browser in BOTH light and dark themes (full-page pass +
  spot checks); no shape uses a non-token color.
- `make test`, `make build`, `make lint`, `npm run format:check` green.
- Each schematic is recognizable: a reviewer pass confirms every card's
  drawing plausibly evokes its component (subjective, but checked one by one).

## Out of scope

Demo pages themselves (still live components), mockups, library code, the
card/grid layout (kept from the previous fix).
