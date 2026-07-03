# Overview Schematics Implementation Plan

> **For agentic workers:** executed via a Workflow fan-out (batched schematic
> authoring with structured outputs, assembled by the orchestrator) — the
> per-card JSX is generated content, not pre-written plan code.

**Goal:** Replace all 87 overview-card previews with blueprint-accent
schematics per `docs/superpowers/specs/2026-07-03-overview-schematics-design.md`.

**Branch:** `feat/overview-schematics` off `origin/main`.

---

## Task 1 — Vocabulary

Create `packages/playground/src/pages/components/overviewSchematics.module.scss`
(token-only values) and the vocabulary components in
`packages/playground/src/pages/components/overviewSchematics.tsx`:

| Component  | Renders                                                      |
| ---------- | ------------------------------------------------------------ |
| `Row`      | flex row, `gap` prop (`4/6/8/10`), align center              |
| `Col`      | flex column, same `gap` prop                                 |
| `Box`      | tinted fill (`--color-accent-subtle-bg`, `--radius-sm`)      |
| `Solid`    | solid accent fill (`--color-accent`) — the ONE focal element |
| `Outline`  | surface: `--color-bg` bg + neutral border                    |
| `Panel`    | `Outline` + `--shadow-md` (floating surfaces)                |
| `Dashed`   | dashed accent-tint border region (slots, columns, dropzones) |
| `Bar`      | 5px-high tinted line, `w` in px or %                         |
| `SolidBar` | 5px-high accent line                                         |
| `Dot`      | 8px circle, tinted; `solid` prop for accent                  |
| `Pill`     | 16px-high `--radius-full` tinted chip                        |

All shapes accept `w`, `h` (number → px, string passthrough), and `style`
(for positional/clip-path/transform tweaks only). Exactly one exported
`SCHEMATICS: Record<string, ReactNode>`.

## Task 2 — Generate 87 schematics (Workflow)

- 6 parallel batches (~15 cards each, page order). Each agent receives: the
  vocabulary API (verbatim from Task 1), its batch of `{name, description}`
  pairs, and instructions to consult the component's current preview/demo/
  JSDoc for structure.
- Hard rules per schematic: fits 230×110; exactly one `Solid*`/`Dot solid`
  focal element; vocabulary elements only; no text, no icons, no raw colors;
  minimal inline styles (position/clip-path/transform only).
- Structured output: `{ name, jsx }[]` — orchestrator assembles the file,
  compiles, and fixes mechanical issues.

## Task 3 — Wire `ComponentsIndex.tsx`

- `preview: SCHEMATICS['<Name>']` for every item; dev-only warn on a missing
  key (render empty preview, don't crash).
- Delete: all `@eocrm/design-system` imports, `DataTablePreview` + its
  types/data, the `Block` helper, preview-only lucide icons, `toast` usage.
- Move/retire `.skeleton/.bar/.tile` from `ComponentsIndex.module.scss` if
  unused after the swap.

## Task 4 — Docs

`packages/playground/CLAUDE.md` Rule 4.3: live preview → schematic preview
(point at `overviewSchematics.tsx`).

## Task 5 — Verify + ship

- Browser (Playwright): full-page screenshots in light AND dark; a reviewer
  agent Reads both screenshots and flags unrecognizable/broken/overflowing
  cards; fix and repeat until clean. Uniform heights re-asserted (one
  distinct card height); zero console errors.
- Gates: `make test`, `make build`, `make lint`, `npm run format:check`.
- PR (playground-only; no version bump expected), user merges.
