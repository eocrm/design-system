# Kanban — multi-status columns with drag-time status zones

## Intent

CRM pipelines have stages (Kanban columns) that contain several statuses. Example: the "Qualification" stage holds "New", "Contacted" and "Meeting set". Jira solves this by showing one mixed card list per column while idle. While a card is being dragged, every multi-status column splits into one drop zone per status, so the drop tells you both the stage and the status. We want the same thing in `<Kanban>`.

## Goals

- A `Kanban.Column` can declare a list of statuses. Each card in that column declares which status it is in.
- **Idle:** a multi-status column looks exactly like today's column: one mixed list, no sections, no status headers.
- **While dragging:** every multi-status column, including the card's own, replaces its drop behaviour with stacked drop zones, one per status, each labelled with the status name.
  - The card's own column omits the zone for the card's current status.
  - Dropping on a zone fires a status-change event naming the column and the status. **No index:** the consumer decides where the card goes in its list (top, bottom, sorted by rank).
  - A multi-status column is never sortable. Reordering inside it is not possible (decided).
- **Plain columns** (no statuses) behave exactly as today: sortable with live cross-column reflow, and `onMove` with an index. A board can mix both kinds.
- **`canDrop`:** an optional `canDrop(cardId, target)` on `<Kanban>`. A zone it rejects is visibly dimmed and refuses the drop; releasing there is a cancel. It applies to plain columns too (my call): a rejected plain column takes no live re-seat, is dimmed, and a release there is a cancel.

## Non-goals

- Always-visible status sections inside a column. That option was considered and rejected in favour of Jira-style zones.
- Collapsible groups and swimlanes (horizontal rows).
- Reordering cards inside a multi-status column.
- Showing a card's status while idle. The consumer can render a badge in the card if they want one.

## Anti-goals (failure even if it "works")

- Any behaviour change for existing boards that don't pass `statuses`. All existing `Kanban.test.tsx` tests must pass unchanged.
- A breaking change to the `KanbanMoveEvent` / `onMove` type.
- The drop committing a different status from the zone the user saw highlighted. The #387 rule (release outside the board = cancel) carries over.
- Zones that can't be reached by keyboard dragging, or that screen readers don't announce.

## API (my call — builder may adjust names, not semantics)

```tsx
<Kanban
  onMove={handleMove}                  // plain-column drops, unchanged
  onStatusChange={handleStatusChange}  // zone drops
  canDrop={(cardId, to) => boolean}    // to: { columnId, statusId? }
>
  <Kanban.Column id="qual" aria-label="Qualification"
    statuses={[{ id: 'new', label: 'New' }, { id: 'contacted', label: 'Contacted' }]}>
    <Kanban.Card id="a" status="new">…</Kanban.Card>
  </Kanban.Column>
  <Kanban.Column id="won" aria-label="Won">…</Kanban.Column>
</Kanban>
```

- **Separate `onStatusChange` callback (my call).** Adding an optional `statusId` and an optional `index` to `onMove`'s `to` would make `to.index` possibly `undefined`, which breaks every existing consumer's `splice`. Payload:
  `{ cardId, from: { columnId, index, statusId? }, to: { columnId, statusId } }`.
- `onMove`'s `from` gains an optional `statusId`, filled in when a card leaves a multi-status column for a plain column. This is additive.
- Status `label` is a string (a ReactNode is not needed). It is used both as the zone text and in announcements.
- A column is "multi-status" whenever `statuses` is passed. A single-entry list is allowed. With the card's own status omitted, that leaves zero zones in its own column, so the column gets no droppable and a release there is a cancel.
- Dev-mode `console.warn` when a card in a multi-status column has no `status`, or a `status` that isn't in the column's `statuses`. In that case the card is treated as having no current status (all zones shown).

## Behaviour details

- **Card leaving a plain column toward a zone:** no live re-seat into the zone column, because zone columns have no list order to seat into. The card's origin column keeps its slot open until the drop (or the card re-seats into another plain column as today).
- **Card from a multi-status column over a plain column:** live reflow into that plain column as today. The drop fires `onMove` with `from.statusId`.
- **Zones** fill the column's card area, stacked vertically and sharing the height equally. Column content outside the card block (the header slice before the cards) stays visible. Hovering a zone highlights it. Disabled (`canDrop` false) zones are dimmed and never highlight.
- **No layout shift at drag start (my call).** Turning a column into zones never changes its size. Columns already stretch to the height of the tallest column on the board (flex `align-items: stretch`). The zones split whatever card area exists, so droppable rects and the #373 drag-bounds measurement stay stable. Zones get no minimum height beyond their label row. A board with no tall column at all (for example, all columns empty) relies on the column's existing `min-height`. Raising that `min-height` token is the knob if it proves too tight.
- **Collision:** zones are droppables with ids namespaced so they can't collide with card or column ids. A pointer over a zone must resolve to that zone.
- **Release inside the board but not on a zone or plain column = cancel (my call).** This covers a multi-status column's header slice, the gap between columns, and a column with zero zones. The rule is: a status is committed only when the pointer is inside an enabled zone, so a drop never commits a zone that wasn't highlighted. Concretely, a zone counts as `over` only if the pointer is within it; there is no nearest-zone fallback. For the "outside the board" test (`isPointerOutsideContainers`), multi-status columns still contribute their **whole column rect** while dragging, so the board's bounds don't shrink. Announcements report "not over a drop target" in these spots.
- **`canDrop` never runs for the card's own plain column (my call).** The origin column is always exempt: reordering in it and dropping back into it always work. Blocking in-column reordering is not a goal. `canDrop` does run for the card's own **multi-status** column's zones, since those are status changes.
- **Keyboard:** keyboard dragging (KeyboardSensor) can reach each enabled zone with arrow keys.
- **Announcements:** for example "over Contacted in Qualification" and "dropped in Contacted in Qualification". A disabled zone is announced as unavailable, and a drop there is announced as cancelled. New strings go in the i18n catalogues (en + ru).
- **Tokens:** new component tokens in `Kanban.tokens.scss` for the zone surface, border, active highlight and disabled state, built only from existing semantic tokens. No raw values. Reduced motion is respected.

## Constraints

- Lives entirely inside the existing `Kanban` component. Nothing new to add to `CLUSTERS`; the existing export is enough.
- Follows `packages/design-system/CLAUDE.md` rules: no layout on the component's outside, tokens only, `transient-state-a11y` / Hard rule 9 announcements, Hard rule 8 pre-push review loop.
- No new dependencies. `@dnd-kit/core` / `sortable` already cover droppables and collision.

## Deliverables

- `Kanban.tsx` and SCSS/tokens changes, with unit tests in `Kanban.test.tsx` covering:
  - zones appear only while dragging
  - own-status zone is omitted
  - `onStatusChange` payload
  - `canDrop` blocking both zones and plain columns
  - cancel outside the board
  - keyboard drag to a zone
  - announcements
  - warn on a missing or unknown status
- `docs/components/Kanban.md`: new section "Multi-status columns" plus anti-patterns (don't use zones when you need reordering; don't rely on zones to show status while idle). Regenerate the props table with `npm run build:docs`.
- Playground `KanbanDemo.tsx`: a mixed board (one plain column, two multi-status columns, one `canDrop` rule).
- AI-PRIMER index line updated if the summary changes.

## Left to the builder

- Zone positioning technique, within package rule 4.
- Exact zone visual design (match the existing Kanban look; tokens only).
- Internal structure of the drag state (how zone mode coexists with `liveItems`).
- Exact announcement wording beyond the examples above.
