# Kanban status zones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `Kanban.Column` gets optional `statuses`. While a card is being dragged, a multi-status column turns into Jira-style drop zones, one per status. A drop on a zone fires a new `onStatusChange`. An optional `canDrop` dims targets and refuses drops on them.

**Architecture:** The root keeps the active drag (card id, origin column, card status) in React state and shares it through a new `KanbanDragContext`. While a drag is active, a multi-status column renders a zone overlay over its card area. Each zone is a plain `useDroppable` with namespaced id and `data.kanbanZone`. Kanban's own `collisionDetection` decides zone and column targets before delegating to the unchanged `containerAwareClosestCorners`. `handleDragEnd` branches to `onStatusChange` when `over` is a zone. Plain columns keep every existing code path.

**Tech Stack:** React 19, TypeScript, `@dnd-kit/core` + `@dnd-kit/sortable` (already installed), SCSS modules with component tokens, Vitest + Testing Library (jsdom), playground (Vite).

**Spec:** `docs/superpowers/specs/2026-11-12-kanban-status-zones-design.md`

## Global Constraints

- Boards without `statuses` must behave exactly as today: every existing `Kanban.test.tsx` test passes **unmodified**, and the plain-column DOM is unchanged.
- `KanbanMoveEvent` stays assignable from today's shape. The only change is the additive optional `from.statusId`. `to.index` stays `number`.
- Tokens only, with no raw colour, spacing or radius values. New tokens go in `Kanban.tokens.scss` and are built only from existing semantic tokens.
- Rule 4: the column's outer box gets no new layout properties. An internal overlay may use `position: relative` on an internal wrapper plus `position: absolute; inset: 0` on its child, following the precedent in `ColorPicker.module.scss` / `ImageCrop.module.scss`. `stylelint` and `structure.test.ts` must pass.
- No new dependencies.
- All user-visible and announced strings go through i18n (`messages.ts` type, `en.ts`, `ru.ts`), per Hard rule 9.
- Run tests from `packages/design-system` (vitest cwd quirk).

## Review Focus

1. **Card `status` missing or not in the column's `statuses`:** dev `console.warn` once per card id; the card is treated as having no status, so all zones in its own column are shown. Test in Task 1 (warn) and Task 2 (all zones).
2. **Origin column with a single status equal to the card's:** zero zones render. A release anywhere in that column cancels (no `onMove`, no `onStatusChange`). Test in Task 2.
3. **Numeric vs string ids (`statusId: 1` vs `'1'`):** zones are matched with strict equality and the ids are `JSON.stringify`-namespaced, so `1` and `'1'` are distinct zones. Test in Task 2.
4. **Board made only of multi-status columns:** a release past every column still cancels, and a release in the gap between two multi-status columns cancels too (no nearest-zone fallback). Test in Task 2.
5. **A drag that hovers a zone and is then released in a plain column:** fires `onMove` (with an index and `from.statusId`), never `onStatusChange`. Test in Task 2.

---

## File map

- Modify `packages/design-system/src/components/Kanban/Kanban.tsx`: types, context, zone overlay, collision, drag handlers, announcements.
- Modify `Kanban.module.scss` and `Kanban.tokens.scss`: overlay, zone and dimmed styles.
- Modify `Kanban.test.tsx`: new `describe` blocks only. Extend the `stubLayout` / `Board` helpers additively.
- Modify `src/components/Kanban/index.ts` and `src/index.ts`: export new types.
- Modify `src/components/_internal/dragAnnouncements.ts`: zone-aware `DragTarget`.
- Modify `src/i18n/messages.ts`, `en.ts`, `ru.ts`: new `drag.*` keys.
- Modify `docs/components/Kanban.md` and `AI-PRIMER.md` (index line, if the summary changes).
- Modify `packages/playground/src/pages/components/KanbanDemo.tsx`: new demo section.

---

### Task 1: Public types, props, parsing, dev warning (idle behaviour)

**Files:**

- Modify: `src/components/Kanban/Kanban.tsx`, `src/components/Kanban/index.ts`, `src/index.ts`
- Test: `src/components/Kanban/Kanban.test.tsx` (new `describe('Kanban — statuses (idle)')`)

**Interfaces — Produces:**

```ts
export interface KanbanStatus {
  id: string | number;
  label: string;
}
export interface KanbanDropTarget {
  columnId: string | number;
  statusId?: string | number;
}
export interface KanbanStatusChangeEvent {
  cardId: string | number;
  from: { columnId: string | number; index: number; statusId?: string | number };
  to: { columnId: string | number; statusId: string | number };
}
// KanbanMoveEvent.from gains: statusId?: string | number
// KanbanProps gains: onStatusChange?: (e: KanbanStatusChangeEvent) => void;
//                    canDrop?: (cardId: string | number, to: KanbanDropTarget) => boolean;
// KanbanColumnProps gains: statuses?: readonly KanbanStatus[];
// KanbanCardProps gains:   status?: string | number;
```

- Root parse memo additionally builds `columnStatuses: Map<colId, readonly KanbanStatus[]>` (multi-status columns only) and `cardStatus: Map<cardId, string | number | undefined>`. A status that is unknown or missing in a multi-status column resolves to `undefined`.
- `statuses`, `status` and `canDrop` / `onStatusChange` are **not** spread onto the DOM.

- [ ] **Step 1: Write the failing tests**
  - `it('renders a multi-status column as one mixed list with no zones while idle')`: render a column with `statuses=[{id:'new',label:'New'},{id:'won',label:'Won'}]` and 3 cards. Assert all 3 card texts are present, `queryByText('New')` and `queryByText('Won')` are null, and the container has no `[data-kanban-zone]`.
  - `it('does not leak statuses / status onto the DOM')`: no element has a `statuses` or `status` attribute.
  - `it('warns once when a card in a multi-status column has no or an unknown status')`: one card has no `status` and one has `status="zzz"`. Spy on `console.warn` and expect 2 calls, each mentioning the card id. A re-render with the same props adds no calls.
  - `it('does not warn for cards in plain columns without a status')`
- [ ] **Step 2: Run** `npx vitest run src/components/Kanban/Kanban.test.tsx -t "statuses (idle)"`. Expected: FAIL (the type errors and warns are missing).
- [ ] **Step 3: Implement** the types, props and parse maps. The warn runs in a `useEffect` keyed on the parse result, guarded by `process.env.NODE_ENV !== 'production'`, de-duplicated per card id with a `useRef<Set>`. Export the three new types from `Kanban/index.ts` and `src/index.ts`.
- [ ] **Step 4: Run** the whole `Kanban.test.tsx`. Expected: all PASS, including every pre-existing test.
- [ ] **Step 5: Commit** `feat(kanban): statuses / status props and status-change types`

### Task 2: Zones while dragging, collision, `onStatusChange`

**Files:**

- Modify: `Kanban.tsx`, `Kanban.module.scss` (functional structure only; visuals come in Task 5)
- Test: `Kanban.test.tsx` (new `describe('Kanban — status zones')`)

**Interfaces:**

- Consumes: the Task 1 maps and types.
- Produces (internal, not exported from `src/index.ts`):
  - `kanbanZoneId(columnId, statusId): string` returns `` `kanban-zone:${JSON.stringify([columnId, statusId])}` ``.
  - Zone droppable `data`: `{ kanbanZone: { columnId, statusId, label: string, allowed: boolean } }`.
  - `KanbanDragContext` value: `{ activeCardId: string | number | null; originColumn: string | number | null; activeStatus: string | number | undefined; canDropTo: (to: KanbanDropTarget) => boolean } | null`. `canDropTo` wraps `canDrop` with the active card and returns `true` when `canDrop` is unset. Task 3 uses it for plain columns.
  - The zone DOM is `<div data-kanban-zone data-zone-status={String(statusId)} data-disabled={!allowed || undefined}>{label}</div>` inside an overlay `<div className={styles.zones}>`.
- **Column structure:** only when `statuses` is passed, the column renders `before` slice → `<div className={styles.body}>` (holds cards, `after` slice, and the overlay while dragging). Plain columns render exactly today's DOM. The overlay covers `.body` (position relative/absolute, see Global Constraints), so the dragged card's layout box never moves.
- **Zones shown** = the column's `statuses`, minus `activeStatus` when `columnId === originColumn` and `activeStatus !== undefined`. Use strict equality.
- **Collision (Kanban's own `collisionDetection`), in order:**
  1. Split `droppableContainers` into `zones` (`data.current?.kanbanZone`) and `rest`.
  2. Compute `outsideBoardRef` with `isPointerOutsideContainers` over `rest`. Column droppables stay registered, so multi-status columns still give the full board bounds. If outside, return `[]`.
  3. With a pointer: `pointerWithin` over `zones`. If there is a hit, return that zone (allowed or not; Task 4 announces a disallowed one).
  4. With a pointer, inside a multi-status column (`pointerWithin` over `rest` containers whose id is in `columnStatuses`): return `[]`.
  5. With a pointer, in no container (the gutter): if the nearest column from `closestCorners` over `rest` containers is multi-status, return `[]`. Otherwise use the existing behaviour.
  6. Without a pointer (keyboard): candidates = `zones` plus `rest` minus multi-status columns and minus their cards. Then use `containerAwareClosestCorners`.
  7. Otherwise: `containerAwareClosestCorners({ ...args, droppableContainers: rest without multi-status columns and their cards })`.
- **Handlers:**
  - `handleDragStart` also sets the active state: card id, origin column, `cardStatus.get(id)`.
  - `handleDragOver` returns `prev` when `over` is a zone.
  - `handleDragEnd`: if `over` is a zone, then if `allowed` is false the drag cancels; otherwise fire `onStatusChange({ cardId, from: { columnId, index, statusId: cardStatus.get(cardId) }, to: { columnId, statusId } })`. The `onMove` path adds `from.statusId` when the origin column is multi-status.
  - End and cancel clear the active state and `liveItems`.
  - `isRejectedDrop` also returns `true` for a disallowed zone.

- [ ] **Step 1: Extend the test helpers (additive)**
  - `stubLayout`: an element matching `[data-kanban-zone]` gets the rect of zone `k` of `n` among its siblings, filling its column: `(left, k*h/n, COL_W, h/n)`. Check this before the card lookup.
  - `Board` gains an optional `statuses?: Record<string, KanbanStatus[]>`, plus `cardStatus?: Record<string, string | number>`, `onStatusChange`, `canDrop`.
  - `dragTo(cardId, path)` is the existing `drag`. Add `zoneCentre(col, k, n, h = 300)`.
- [ ] **Step 2: Write the failing tests**
  - `it('shows one zone per status in every multi-status column while dragging, none in plain columns')`: press and move with no release. Expect `[data-kanban-zone]` counts per column to match the statuses. After release, the count is 0.
  - `it('omits the dragged card’s own status zone in its own column')`
  - `it('dropping on a zone fires onStatusChange with from/to status and never onMove')`: assert the exact payload `{cardId:'a1', from:{columnId:'a', index:0, statusId:'new'}, to:{columnId:'b', statusId:'won'}}`.
  - `it('dropping on another status zone in the card’s own column changes status')`
  - `it('a release in a multi-status column outside any zone cancels')`: release in the column but above the zones, using a header stub row, or in a single-status origin column. Expect no callbacks. (Review Focus 2.)
  - `it('a release in the gutter beside a multi-status column cancels')` (Review Focus 4)
  - `it('a release past every column still cancels on an all-multi-status board')` (Review Focus 4)
  - `it('hovering a zone then releasing in a plain column fires onMove with from.statusId')` (Review Focus 5)
  - `it('a card with an unknown status sees every zone of its own column')` (Review Focus 1)
  - `it('numeric and string status ids are distinct zones')`: statuses `[{id:1},{id:'1'}]`. Dropping on the second zone gives `to.statusId === '1'`. (Review Focus 3.)
  - `it('plain-column boards render no .body wrapper')`: assert the plain column's child structure is unchanged.
- [ ] **Step 3: Run** `npx vitest run src/components/Kanban/Kanban.test.tsx -t "status zones"`. Expected: FAIL.
- [ ] **Step 4: Implement** the context, the zone component (`KanbanZone`, internal), the column structure, the collision steps and the handler changes described above.
- [ ] **Step 5: Run** the whole `Kanban.test.tsx` plus `src/components/Sortable`. Expected: all PASS, with existing tests unmodified.
- [ ] **Step 6: Commit** `feat(kanban): drag-time status zones and onStatusChange`

### Task 3: `canDrop` for plain columns (origin exempt)

**Files:** `Kanban.tsx`, `Kanban.test.tsx` (`describe('Kanban — canDrop')`)

**Interfaces — Consumes:** `KanbanDragContext.canDropTo`; the zone `allowed` flag from Task 2. In this task, set zone `allowed` = `canDropTo({ columnId, statusId })`.

- **Collision:** with a pointer inside a plain column `c` where `c !== originColumn && !canDropTo({ columnId: c })`, return `[]` before step 7. Keyboard step 6 also drops rejected plain columns and their cards from the candidates. `[]` means no live re-seat, and a release there cancels.
- The column sets `data-drop-disabled="true"` while dragging when it is rejected (never on the origin column). Zones set `data-disabled` when not allowed.
- `canDrop` is called **only during an active drag** and never for the origin plain column.

- [ ] **Step 1: Write the failing tests**
  - `it('a rejected zone is marked disabled and a drop on it cancels')`
  - `it('a rejected plain column takes no live re-seat and a release there cancels')`: during the hover, `boardOrder()` is unchanged. After release, no `onMove` fired.
  - `it('never asks canDrop about the origin plain column; in-column reorder still works')`: `canDrop = vi.fn(() => false)`. Reorder within the origin column fires `onMove`, and no `canDrop` call has `to.columnId === origin && to.statusId === undefined`.
  - `it('canDrop receives the dragged card id and { columnId, statusId }')`
  - `it('canDrop is not called while idle')`
- [ ] **Step 2: Run** `npx vitest run src/components/Kanban/Kanban.test.tsx -t "canDrop"`. Expected: FAIL.
- [ ] **Step 3: Implement** the above.
- [ ] **Step 4: Run** the whole `Kanban.test.tsx`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(kanban): canDrop for zones and plain columns`

### Task 4: Announcements, keyboard, i18n

**Files:** `src/components/_internal/dragAnnouncements.ts`, `src/i18n/messages.ts`, `en.ts`, `ru.ts`, `Kanban.tsx`, `Kanban.test.tsx` (`describe('Kanban — zone announcements')`)

**Interfaces — Produces:**

- `DragTarget` gains `zone?: string` (the status label) and `unavailable?: boolean`. When `zone` is set, `index` / `total` are ignored. `useDragAccessibility` routes:
  - `movedOver` with `zone` → `drag.movedOverZone({ item, zone, container })`
  - with `unavailable` → `drag.zoneUnavailable({ item, zone, container })`
  - `dropped` with `zone` → `drag.droppedInZone({ item, zone, container })`
  - a rejected drop is already `drag.cancelled`.

  `index` / `total` stay required for the existing callers: pass `0` and `0` for zone targets.

- New `messages.ts` keys under `drag`: `movedOverZone`, `droppedInZone`, `zoneUnavailable`, each `(params: { item: string; zone: string; container: string }) => string`, with JSDoc.
- en copy (exact):
  - `${item}, over ${zone} in ${container}.`
  - `Dropped ${item} in ${zone} in ${container}.`
  - `${item}, ${zone} in ${container} is unavailable.`
- ru copy (exact):
  - `${item}, над «${zone}» в ${container}.`
  - `${item} перемещена в «${zone}» в ${container}.`
  - `${item}: «${zone}» в ${container} недоступно.`

  Match the existing ru drag phrasing in `ru.ts` for gender and case conventions; adjust wording if they differ.

- `describeDrag` in `Kanban.tsx`: for a zone entry, return `{ label, index: 0, total: 0, container: columnLabel(columnId), zone: label, unavailable: !allowed }`.

- [ ] **Step 1: Write the failing tests** (use `NamedBoard`-style labelled columns plus statuses)
  - `it('announces the zone and column while hovering a zone')`: expect `live()` to match `/^Draft Q3 OKRs, over Won in Done\.$/`.
  - `it('announces a drop into a zone')`
  - `it('announces a disabled zone as unavailable and its release as cancelled')`
  - `it('announces zones in Russian')`
  - `it('keyboard drag reaches a zone and fires onStatusChange')`: focus the card, press Space, then arrows, then Space. If jsdom keyboard coordinates can't reach a zone under the stub, mark this test `it.todo`, and record a manual Playwright keyboard check in Task 5 Step 4 instead (do not fake it).
- [ ] **Step 2: Run** `npx vitest run src/components/Kanban/Kanban.test.tsx -t "zone announcements"` plus `src/i18n`. Expected: FAIL.
- [ ] **Step 3: Implement** the above.
- [ ] **Step 4: Run** the whole `npm test` from `packages/design-system`. Expected: PASS. This includes the i18n catalogue parity tests and the other drag surfaces using `dragAnnouncements`.
- [ ] **Step 5: Commit** `feat(kanban): zone drag announcements (en/ru)`

### Task 5: Visuals, docs, playground demo

**Files:** `Kanban.module.scss`, `Kanban.tokens.scss`, `docs/components/Kanban.md`, `AI-PRIMER.md`, `packages/playground/src/pages/components/KanbanDemo.tsx`

**New tokens (names fixed, values from existing semantic tokens; the builder picks matching ones):**

- `--kanban-zone-gap`
- `--kanban-zone-padding`
- `--kanban-zone-radius`
- `--kanban-zone-bg`
- `--kanban-zone-border` (dashed border colour)
- `--kanban-zone-bg-active` / `--kanban-zone-border-active` (hovered zone; the zone droppable's `isOver` sets `data-over="true"`)
- `--kanban-zone-disabled-opacity`
- `--kanban-zone-label-color`

Zone label: centred, `--font-size-sm`-equivalent token. `prefers-reduced-motion`: no transitions on zones. A rejected plain column (`data-drop-disabled`) uses the disabled opacity.

- [ ] **Step 1: Styles + tokens.** Run `npm run lint:styles` (or the repo stylelint script) and `npx vitest run src/structure.test.ts`. Expected: PASS.
- [ ] **Step 2: Docs.**
  - Add a `## Multi-status columns` section to `docs/components/Kanban.md` with a short example using `statuses`, `status`, `onStatusChange` and `canDrop`, and say that drops on zones carry no index.
  - Add "When NOT to use" bullets: zones when users need to reorder within a stage; relying on zones to show status while idle (render a badge in the card).
  - Run `npm run build:docs`.
  - Update the AI-PRIMER Kanban line only if the H1 summary changed.
- [ ] **Step 3: Demo.** Add a "Multi-status columns" section to `KanbanDemo.tsx`:
  - one plain column ("Lead");
  - two multi-status columns ("Qualification": New / Contacted / Meeting set; "Closing": Proposal / Negotiation);
  - a `canDrop` that blocks moving back into "Lead" from "Closing";
  - each card shows its status as a `Badge`;
  - state updates in `onMove` / `onStatusChange` (status-change places the card at the top of the target column).

  Imports only from `@eocrm/design-system`.

- [ ] **Step 4: Browser check** with the playground dev server on port 8090+ and Playwright:
  - pointer drag onto a zone, to another status in the same column, onto a disabled zone, and into the gutter;
  - keyboard drag (Space, arrows, Space) to a zone;
  - no layout jump of the dragged card at drag start;
  - light and dark theme.

  Kill the Playwright Chrome afterwards.

- [ ] **Step 5: Run** `npm test`, `npm run typecheck` and lint from the repo root. Expected: PASS.
- [ ] **Step 6: Commit** `feat(kanban): zone styles, docs, playground demo`

### Task 6: Pre-push review and PR

- [ ] Branch was cut from fresh `main` (`git checkout main && git pull && git checkout -b feat/kanban-status-zones`) before Task 1.
- [ ] Pause and give the user a live playground link to check the demo before opening the PR.
- [ ] Invoke the `pre-push-review` skill (library variant) and run its review-fix loop until it is clean. Then wait for `Quality / check` and merge.
