# DashboardCanvas — Implementation Plan (#337)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** New library component `<DashboardCanvas>` — Datadog-style 2D snap-grid dashboard: items with `(x, y, w, h)` on a 12-column grid with a fixed row unit; drag-to-move with push-down collision + vertical compaction; E/S/SE resize handles; full-width collapsible sections (own sub-grids, header-drag band reorder, cross-container item moves incl. top level); controlled `value` + one `onChange` per completed gesture; `readOnly` mode; keyboard parity + live-region announcements; single stacked column below the `md` container width with editing disabled.

**Authority:** Issue #337 + the approved consumer design (Part A) at `/home/dpws/projects/eocrm/docs/superpowers/specs/2026-07-26-dashboard-grid-canvas-design.md` (read-only reference; lives in the consumer repo).

**Architecture (locked):**

- **Raw pointer events, NOT dnd-kit** — FlowCanvas's architecture (pointer capture, dragState in refs, live in-flight state discarded on cancel, commit on pointerup). Deviation from the issue's literal "on dnd-kit" wording, justified: the issue's operative constraint is "no react-grid-layout-class dependency"; FlowCanvas (cited in the issue as the precedent) is raw-pointer; dnd-kit's sortable abstractions don't fit snap-grid push-down physics; and dnd-kit pointer drags are untestable in jsdom (SortableGroup's own tests document this) while FlowCanvas-style `fireEvent.pointer*` sequences fully exercise gestures. State the deviation in the PR body.
- **Pure engine modules + one orchestrator** (FlowCanvas file-layout precedent): all geometry/physics in `engine.ts` (headless, exhaustively unit-tested); `DashboardCanvas.tsx` wires pointer/keyboard events to it.
- **CSS grid placement via injected custom properties** (Grid/#318 precedent): each container is `display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); grid-auto-rows: var(--dashboard-canvas-row)`; items stamp `--dc-col: <x+1> / span <w>` and `--dc-row: <y+1> / span <h>` inline; class rules consume them. Below-`md` container query re-templates to one column and overrides item placement at higher specificity (the #318 step mechanism) — stacking order = DOM order, so containers render their items sorted by `(y, x)`.
- **Live region + i18n**: FlowCanvas's nonce-keyed `announce()` pattern; full `dashboardCanvas` namespace in messages.ts with en + ru (no dnd-kit announcer to lean on).
- **Escape-consuming keyboard drag** registers `useFloatingSurface` (Sortable/FlowCanvas precedent).
- Editing gate below `md` uses a ResizeObserver width check (JS mirror of the CSS container query; FlowCanvas has ResizeObserver fallback precedent), with jsdom-safe fallback (no RO / zero width → editing allowed so tests can exercise gestures).

**Tech Stack:** React 18, TypeScript, SCSS modules, raw Pointer Events, Vitest + RTL (globals — no describe/it/expect imports; jsdom drags via inline `fireEvent.pointerDown/Move/Up` sequences with explicit `clientX/clientY/pointerId`, FlowCanvas.test.tsx:173-175 pattern; stub `getBoundingClientRect` where geometry is needed, Sortable.test.tsx:218-252 `stubStackedRects` convention).

## Global Constraints

- Repo `/home/dpws/projects/design-system`, branch `feat/dashboard-canvas` (already checked out).
- NEW component → FULL core invariant (package CLAUDE.md + root CLAUDE.md): tests, playground demo + 4-point wiring + mockups registry union, `src/index.ts` re-exports, JSDoc rule 7 incl. `@remarks` When-NOT-to-use/anti-patterns, AGENTS.md TL;DR, CLUSTERS in BOTH manifest maps (`DashboardCanvas: 'Display'` — FlowCanvas precedent) + `npm run build:manifest`.
- Hard rules 1–9: tokens-only SCSS; `:focus-visible` only; layout-owning exception applies ONLY to the canvas's own internal placement (grid-column/grid-row on its items need the sanctioned stylelint-disable comments, GridItem precedent); forwardRef + spread with pattern comments; i18n via `useTranslation` for EVERY user-facing string (aria-labels, instructions, announcements) in en AND ru.
- Tests run from inside the package (`cd packages/design-system && npx vitest run src/components/DashboardCanvas`); gates from repo root. Commit per task; do NOT push.
- Public API names below are LOCKED — later tasks and the consumer spec depend on them verbatim.

## Public API (locked)

```ts
/** One placed item: grid units within its container. */
export interface DashboardPlacement {
  id: string | number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardSection {
  id: string | number;
  title: string;
  collapsed: boolean;
  items: DashboardPlacement[];
}

/** Controlled value. Section array order = band order; top-level items render above the first section. */
export interface DashboardCanvasValue {
  items: DashboardPlacement[];
  sections: DashboardSection[];
}

/** Per-item size constraints, by item id. */
export interface DashboardItemConstraints {
  minW?: number;
  minH?: number;
  maxH?: number;
}

export interface DashboardCanvasProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: DashboardCanvasValue;
  /** Fires ONCE per completed gesture (drop, resize-end, collapse toggle, section reorder, cross-container move) with the whole next value. */
  onChange?: (next: DashboardCanvasValue) => void;
  /** Render the body of an item by id. */
  renderItem: (id: string | number) => ReactNode;
  /** Optional extras for a section header (title editor, menus) by section id. */
  renderSectionHeader?: (id: string | number) => ReactNode;
  /** Constraints lookup; missing entry → minW 1, minH 1, no maxH. */
  constraints?:
    | Record<string, DashboardItemConstraints>
    | ((id: string | number) => DashboardItemConstraints | undefined);
  /** View mode: identical geometry, zero drag/resize wiring; collapse toggles stay active. */
  readOnly?: boolean;
}
```

Engine (all pure, exported for tests; `engine.ts`):

```ts
export const DASHBOARD_COLUMNS = 12;
export function clampPlacement(
  p: DashboardPlacement,
  c: DashboardItemConstraints | undefined,
): DashboardPlacement; // bounds: 0≤x, x+w≤12, w≥minW≥1, h≥minH≥1, h≤maxH if set
export function collides(a: DashboardPlacement, b: DashboardPlacement): boolean;
export function compact(items: DashboardPlacement[]): DashboardPlacement[]; // pull every item up to the lowest free y, stable (y,x) processing order
export function placeWithPushDown(
  items: DashboardPlacement[],
  moved: DashboardPlacement,
): DashboardPlacement[]; // moved item claims its dropped spot for collision resolution (colliding items push down, chains recursively), then the WHOLE layout — moved included — compacts vertically (full Datadog behavior; a drop into free space below content rises back up immediately, no floating placements)
export function applyMove(
  value: DashboardCanvasValue,
  from: ContainerRef,
  to: ContainerRef,
  id: string | number,
  x: number,
  y: number,
): DashboardCanvasValue;
export function applyResize(
  value: DashboardCanvasValue,
  container: ContainerRef,
  id: string | number,
  w: number,
  h: number,
  c?: DashboardItemConstraints,
): DashboardCanvasValue;
export function toggleSection(
  value: DashboardCanvasValue,
  sectionId: string | number,
): DashboardCanvasValue;
export function reorderSection(
  value: DashboardCanvasValue,
  sectionId: string | number,
  toIndex: number,
): DashboardCanvasValue;
export type ContainerRef = { kind: 'top' } | { kind: 'section'; id: string | number };
export function stackOrder(
  value: DashboardCanvasValue,
): { container: ContainerRef; id: string | number }[]; // (container-band order, then y, then x) — the below-md order
export function cellFromPoint(
  px: number,
  py: number,
  containerRect: DOMRect,
  colWidth: number,
  rowHeight: number,
  gap: number,
): { x: number; y: number }; // snap helper
```

---

### Task 1: Engine (pure geometry + exhaustive tests)

**Files:**

- Create: `packages/design-system/src/components/DashboardCanvas/engine.ts`
- Create: `packages/design-system/src/components/DashboardCanvas/engine.test.ts`

**Interfaces:** exactly the engine block above. All functions immutable (never mutate inputs), deterministic, stable ordering.

- [ ] **Step 1 (TDD):** write failing tests FIRST covering at minimum: clamp bounds (x<0, x+w>12, minW/minH/maxH); collides truth table (touching edges do NOT collide); compact pulls items up past gaps, preserves x, stable for ties; placeWithPushDown — drop onto an occupied cell pushes the occupant (and chains) down exactly enough, moved item keeps its dropped spot, non-colliding items compact upward, idempotent when dropped on free space; applyMove within container / cross-container (removed from source, source compacts; inserted+pushed in target) / to empty container; applyResize grows pushing neighbors down, shrink compacts, respects constraints; toggleSection flips only `collapsed`; reorderSection moves band, clamps index; stackOrder (top-level first, then sections in band order; within container by y then x); cellFromPoint snapping incl. gap arithmetic and negative/overshoot clamping.
- [ ] **Step 2:** RED, then implement, then GREEN. No React imports in engine.ts.
- [ ] **Step 3:** `cd packages/design-system && npm run typecheck`; root `make lint` (n/a for .ts but run anyway) + `npm run format:check`.
- [ ] **Step 4:** Commit — `feat(DashboardCanvas): pure 2D grid engine — compaction, push-down, moves, resize, sections (#337)`

---

### Task 2: Component core — rendering, sections, collapse, readOnly, tokens (no gestures)

**Files:**

- Create: `DashboardCanvas.tsx` (orchestrator; public types + JSDoc), `DashboardCanvasItem.tsx`, `DashboardCanvasSection.tsx` (internal child components), `DashboardCanvas.module.scss`, `DashboardCanvas.tokens.scss`, `index.ts`
- Modify: `src/index.ts` (component + ALL public types), `src/i18n/messages.ts` + `en.ts` + `ru.ts` (initial keys: `dashboardCanvas.canvas` region label, `sectionCollapse`/`sectionExpand` toggle labels — more keys come in Task 4)
- Modify: `src/_meta/manifest.ts` + `scripts/generate-manifest.mjs` (CLUSTERS `DashboardCanvas: 'Display'`) + `npm run build:manifest` (commit regenerated output)
- Test: `DashboardCanvas.test.tsx`

**Spec:**

- Root `<div role="group" aria-label={t('dashboardCanvas.canvas')}>` (forwardRef, Pattern A spread with comment). Top-level container grid, then one band per section in array order.
- Container grid CSS: `display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); grid-auto-rows: var(--dashboard-canvas-row); gap: var(--dashboard-canvas-gap);`. Items render sorted by (y, x) (stacking-order requirement) and stamp `--dc-col: ${x + 1} / span ${w}`, `--dc-row: ${y + 1} / span ${h}` inline; `.item { grid-column: var(--dc-col); grid-row: var(--dc-row); overflow: auto; }` with the sanctioned stylelint-disable comments (Grid.Item precedent).
- Tokens (`DashboardCanvas.tokens.scss`, all defaulting to primitives): `--dashboard-canvas-row: var(--space-12)` (48px row unit — the spec's "~48px + gap"), `--dashboard-canvas-gap: var(--space-3)`, item surface (`--dashboard-canvas-item-bg: var(--color-bg)`, border/radius/shadow), section band surface + header tokens, drop-preview + ghost tokens (used in Task 3; define now).
- Section band: full-width; header row (collapse toggle `<button>` with `aria-expanded`, i18n'd accessible label incl. section title interpolation; the title text; `renderSectionHeader?.(id)` slot), body = the section's own container grid; `collapsed` hides the body (body unmounted — geometry preserved in value). Collapse toggle click → `onChange(toggleSection(value, id))` — works in readOnly too.
- `readOnly`: no gesture wiring (Task 3 gates on it), no resize handles rendered, items not focusable-for-editing; collapse toggles active. Identical geometry.
- Tests: renders items with correct inline custom props; items DOM-sorted (y,x); sections in band order with titles; collapse toggle fires onChange with toggled value (and in readOnly); renderItem called per id; renderSectionHeader slot renders; ref forwarded; className merged; region label from i18n.
- [ ] TDD → implement → package tests + typecheck + root lint/format → Commit — `feat(DashboardCanvas): rendering core — grids, sections, collapse, readOnly, tokens (#337)`

---

### Task 3: Pointer gestures — move, resize, cross-container, section reorder

**Files:** Modify `DashboardCanvas.tsx` / `DashboardCanvasItem.tsx` / `DashboardCanvasSection.tsx` / SCSS; extend `DashboardCanvas.test.tsx`.

**Spec (FlowCanvas gesture architecture — dragState in refs, live preview in state, commit once on pointerup, discard on cancel/Escape):**

- **Move:** pointerdown on item body (edit mode, primary button, 5px activation distance before drag arms — Sortable precedent) → capture pointer; live ghost follows cursor (transform, original cell dims); snapped **drop preview** cell computed via `cellFromPoint` against the container under the pointer + `placeWithPushDown` preview of the target container (preview state renders neighbors in their pushed positions — this is the Datadog live-reflow feel); pointerup commits `onChange(applyMove(...))` once; no-op drop (same container+cell) fires nothing; pointercancel/Escape restores.
- **Cross-container:** containers (top + each expanded section body) register their DOMRects in a ref map (re-measured per dragmove via `getBoundingClientRect` — cheap enough at pointermove granularity); the container whose rect contains the pointer is the drop target; dragging over a collapsed section's band does NOT drop into it (bands auto-fit; no hover-to-expand in v1 — document).
- **Resize:** E / S / SE handles (small `<button>`-free divs with `role="presentation"`, pointer-only — keyboard resize is Task 4; handles hidden in readOnly; hit target ≥ WCAG comment, FlowCanvas token precedent); pointerdown on handle → live preview of snapped w/h (clamped by constraints + 12-col bound), neighbors preview-pushed; pointerup commits `applyResize` once.
- **Section reorder:** pointerdown on the section header's drag zone (not the collapse button / not header-extras) → vertical drag; live band-gap indicator at the insertion index; pointerup commits `reorderSection`.
- Cursor states, `data-dragging` attrs, ghost/preview styled via the Task-2 tokens; `touch-action: none` on draggable surfaces (Sortable precedent).
- **Tests (jsdom, FlowCanvas inline-pointer-sequence style + getBoundingClientRect stubbing for container rects):** move commits applyMove result once (assert onChange payload equals engine result); drop on same cell → no onChange; Escape mid-drag → no onChange; resize commits once with clamped dims; cross-container move (stub two container rects, drag from one into the other) commits with target container placement; section header drag commits reorderSection; readOnly wires nothing (pointerdown does not start a drag); activation distance respected (4px move → click passes through, no drag).
- [ ] TDD → implement → tests/typecheck/lint/format → Commit — `feat(DashboardCanvas): pointer gestures — snap move with push-down preview, E/S/SE resize, cross-container drag, band reorder (#337)`

---

### Task 4: Keyboard + a11y + i18n

**Files:** Modify component files + `messages.ts`/`en.ts`/`ru.ts`; extend tests.

**Spec (FlowCanvas keyboard/announce architecture):**

- Edit mode: each item gets `tabIndex={0}` + `role="button"` semantics documented (or `aria-roledescription` — match what FlowCanvas nodes do; read it first). Focused item: **Enter/Space = pick up**; while picked: **arrows = move one cell** (live preview, same engine path as pointer), **Enter/Space = drop (commit once)**, **Escape = cancel** (restore, `useFloatingSurface(picked != null)` so host modals yield Escape). **Without pickup: Shift+arrows = resize one cell** (commit per keypress like FlowCanvas nudges — or pickup-style? LOCKED: Shift+arrows commit per keypress via `applyResize`, simplest and matches FlowCanvas's nudge-commits). Cross-container keyboard move: while picked, ArrowUp/Down past a container's edge moves the item into the adjacent band at the nearest x — engine's applyMove handles it; announce the container change.
- Section header: collapse toggle is a real button (Task 2); the header drag-zone gets keyboard band reorder: focused header + Shift+ArrowUp/Down = reorderSection (commit per keypress + announce).
- Live region: nonce `announce()` + `role="status"` sr-only span (FlowCanvas.tsx:568/1902 pattern). Announcements (all i18n'd, en+ru, typed params): picked up, moved (x/y in human terms: t('dashboardCanvas.movedTo', {x, y, container})), dropped, cancelled, resized (w×h), section collapsed/expanded, section moved, item entered section/top level.
- Visually-hidden instructions block wired via `aria-describedby` (edit mode; shorter readOnly variant) — FlowCanvas precedent.
- Tests: full keyboard move cycle (focus → Enter → ArrowRight → Enter → onChange once with engine-equal payload); Escape cancels (no onChange); Shift+ArrowRight resizes (+1 w, commit); announcements appear in the status region (assert textContent); aria-expanded on collapse toggles; instructions present; readOnly: items not tabbable for editing, toggles still work.
- [ ] TDD → implement → tests/typecheck/lint/format → Commit — `feat(DashboardCanvas): keyboard parity, live-region announcements, i18n en+ru (#337)`

---

### Task 5: Below-md stacking + editing gate

**Files:** Modify component files + SCSS; extend tests.

**Spec:**

- Root gets `container-type: inline-size` ONLY always? NO — mirror #318: the canvas is inherently responsive per the spec, so the root is always `.canvas` with containment ON (document the intrinsic-sizing caveat in JSDoc like Grid's collapseBelow anti-pattern note). `@container (max-width: #{bp.$collapse-md})` (shared `_internal/collapse.scss` breakpoint): containers re-template to one column (`grid-template-columns: repeat(1, minmax(0, 1fr))`), items override to `grid-column: 1 / -1; grid-row: auto;` at (0,3,0)+ specificity over the custom-prop rules (the #318 step mechanism — item rule reads nothing inline below md). DOM order already = stack order (Task 2 sorts (y,x); bands in order) → correct (section, y, x) stacking for free. Item height below md: `grid-auto-rows: auto` with a min-height token? LOCKED: rows keep `var(--dashboard-canvas-row)` auto-rows and items keep their h via `grid-row: span h`? NO — spec says single stacked column; keep each item's height = `span h` rows (content-true) — simplest: keep `--dc-row` span but `grid-row: auto / span var(--dc-h)`… simplest correct: stamp `--dc-h-span: span ${h}` inline in Task 2 and below-md rule uses `grid-row: var(--dc-h-span)`. (Implementer: verify visually in Task 6's demo; adjust with a comment if heights look wrong.)
- Editing gate: ResizeObserver on root sets `isNarrow` when width < 640 (same value as `$collapse-md`; hardcode 640 with a comment pointing at collapse.scss — SCSS constants aren't readable from TS; add a meta-test? NO — one comment each side, keep in sync manually like the existing JSDoc/SCSS pairs). `isNarrow` → gestures + keyboard editing disabled, handles hidden (readOnly-like), collapse toggles active. jsdom: no RO / 0 width → treat as wide (tests keep working).
- Tests: below-md class present; narrow gate (mock RO or call the handler) disables pointerdown drag; collapse toggle still fires when narrow.
- [ ] TDD → implement → tests/typecheck/lint/format → Commit — `feat(DashboardCanvas): below-md single-column stacking + narrow editing gate (#337)`

---

### Task 6: Demo, wiring, docs, gates

**Files:**

- Create: `packages/playground/src/pages/components/DashboardCanvasDemo.tsx`
- Modify: `App.tsx` (route `/components/dashboard-canvas`), `navItems.ts` (**Display** group, distinct lucide icon e.g. `LayoutDashboard`), `ComponentsIndex.tsx` + `overviewSchematics.tsx` (`SCHEMATICS['DashboardCanvas']` — bands + mixed-size tiles blueprint), `pages/mockups/registry.ts` (ComponentName union)
- Modify: `packages/design-system/AGENTS.md` (TL;DR section near FlowCanvas/Sortable: model, per-gesture onChange, readOnly, below-md, when NOT to use — flow reorder → Sortable; kanban columns → Kanban; free-form node graphs → FlowCanvas)
- JSDoc final pass on DashboardCanvas.tsx: 3+ @examples (edit-mode dashboard with sections + constraints; readOnly view; controlled persistence pattern), @remarks When-NOT-to-use + anti-patterns (❌ uncontrolled usage; ❌ nesting canvases; ❌ using it for simple ordered lists).

**Demo sections:** (1) stateful edit-mode canvas: ~6 widgets in top-level + two sections, mixed sizes, constraints on a couple of items, onChange wired to local state with the current value JSON shown collapsibly; (2) readOnly twin of the same value; (3) a narrow-container frame (resizable box, #318 demo pattern) showing the below-md stack.

- [ ] Implement; `npx prettier --write docs/superpowers/plans/2026-07-26-dashboard-canvas.md` and include the plan doc; full gates `make test && make build-lib && make lint && npm run format:check && make build` (commit regenerated manifests).
- [ ] Commit — `docs(DashboardCanvas): playground demo + wiring + AGENTS.md TL;DR (#337)`

---

### Task 7 (controller-run): visual validation + final review + ship

Playwright on :8091 — real drag/resize/section gestures in the browser, both themes, narrow frame; screenshots to scratchpad. Then whole-branch rule-8 review (most capable model), fix loop, push/PR/merge/release/close per implement-issue.

## Self-review notes

- Raw-pointer over dnd-kit is the plan's one deliberate deviation from the issue's wording — flagged in the PR body; every other decision traces to the issue or the approved consumer spec.
- `placeWithPushDown` semantics ("moved wins, others push down, rest compacts") is THE product-defining algorithm — Task 1's tests are the contract; Task 3 must render ITS results, never invent parallel geometry.
- Keyboard resize commits per keypress (no resize "mode") — FlowCanvas nudge precedent, keeps the state machine small.
- Collapsed sections don't accept drops in v1 (documented); hover-to-expand is future work.
- Row unit 48px = `--space-12`; consumers theme via the component token.
