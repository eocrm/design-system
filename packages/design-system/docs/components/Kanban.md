# `<Kanban>` — multi-column board (drag-to-reorder + cross-column drag with live reflow)

Trello/Jira-style board UI. Compound: `Kanban`, `Kanban.Column`, `Kanban.Card`, `Kanban.Handle` (re-exported `Sortable.Handle`). Built on the same `@dnd-kit/sortable` plumbing as `<Sortable>` with internal items state that re-arranges cards live as the dragged card crosses column boundaries.

```tsx
import { Kanban, type KanbanMoveEvent } from '@eocrm/design-system';

const [board, setBoard] = useState({
  todo: [{ id: 'a', title: 'Buy milk' }],
  doing: [{ id: 'b', title: 'Write spec' }],
  done: [{ id: 'c', title: 'Ship Sortable' }],
});

function handleMove(event: KanbanMoveEvent) {
  const { from, to, cardId } = event;
  setBoard((curr) => {
    const next = { ...curr };
    const source = [...next[from.columnId as keyof typeof curr]];
    const [moved] = source.splice(from.index, 1);
    next[from.columnId as keyof typeof curr] = source;
    const target =
      from.columnId === to.columnId ? source : [...(next[to.columnId as keyof typeof curr] ?? [])];
    target.splice(to.index, 0, moved);
    next[to.columnId as keyof typeof curr] = target;
    return next;
  });
}

<Kanban onMove={handleMove}>
  {(['todo', 'doing', 'done'] as const).map((colId) => (
    <Kanban.Column key={colId} id={colId}>
      <Title order={3}>{colId}</Title>
      {board[colId].map((c) => (
        <Kanban.Card key={c.id} id={c.id}>
          <Card>{c.title}</Card>
        </Kanban.Card>
      ))}
    </Kanban.Column>
  ))}
</Kanban>;
```

<!-- props:start -->

## Props

### `KanbanProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `onMove` | `((event: KanbanMoveEvent) => void)` | no | — | Fires once per drag (on drop) with the from/to positions and the cardId. NOT fired on drag cancel. NOT fired when from === to (no-op drop). Consumer should update their items state immutably, e.g.: ```ts const [cols, setCols] = useState({ todo: ['a', 'b'], done: ['c'] }); const handleMove = ({ from, to, cardId }) => { setCols((prev) => { const next = { ...prev }; next[from.columnId] = [...prev[from.columnId]]; next[from.columnId].splice(from.index, 1); next[to.columnId] = [...prev[to.columnId]]; next[to.columnId].splice(to.index, 0, cardId); return next; }); }; ``` |
| …native | | | | plus native `<div>` attributes |

### `KanbanCardProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string \| number` | yes | — | Stable identifier for this card. Must be unique across ALL columns in the `<Kanban>`. Used by dnd-kit to track the card during drag. |
| `children` | `ReactNode` | yes | — |  |
| …native | | | | plus native `<div>` attributes |

### `KanbanColumnProps`

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | `string \| number` | yes | — | Stable identifier for this column. Must be unique within a `<Kanban>`. Used internally to track which cards belong to which column. |
| `children` | `ReactNode` | no | — |  |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

Props on the root: `onMove?: (event: KanbanMoveEvent) => void` — fires once per drop with the diff between the initial layout and the final layout. Consumer applies the move (immutable splice in/out). Columns and Cards both need stable `id` props (`string | number`).

**Drag origin** (hybrid): `<Kanban.Handle>` inside a Card restricts drag origin to the Handle. Without a Handle, the whole Card is draggable (and dnd-kit assigns it `role="button"`).

**Cross-column drag is LIVE**: as the dragged card crosses into a new column, cards in the target column shift to make room in real time. `onMove` still fires only once on release. This is driven by internal Kanban state — consumer's state is untouched until drop, so re-renders are scoped to the Kanban subtree (avoids the measureRect cascade that would happen if mid-drag mutations went through consumer setState).

**Drop slot**: `to.index` is the slot the preview showed at release — it re-evaluates as the cursor moves inside the target column, not only when the card crosses the boundary.

**Releasing off the board cancels**: release with the cursor outside the columns — over unrelated page content, past the last column — and the card snaps back with NO `onMove`. "Outside" means outside the columns' collective bounding box, so the gutter between two columns still commits to the nearer one; only leaving the band of columns entirely cancels. Escape and a release that never left the card's own slot cancel the same way.

**Overflowing boards auto-scroll**: the board is its own horizontal scroll container, so dragging a card near the left/right edge scrolls it — that is how you reach an off-screen column. The dragged card is confined to the board's scrollable content box on both axes (it stops at the outer edge of the first/last column rather than following the cursor out of the board). That bound is what keeps auto-scroll from running away: the card renders in flow, so an unbounded one would extend the board's own `scrollWidth` and auto-scroll would chase the edge it just created. Nothing to configure. Caveat: the bound is the card's NEAREST scrolling ancestor. Capping a column (`overflow-y: auto` + `max-height` on `<Kanban.Column>`) makes the column that ancestor, and the dragged card is then confined to its own column while dragging — the drop still lands wherever the cursor is, but the card won't visibly cross into the neighbour. Scroll the board, not the columns.

**Keyboard reorder** works WITHIN a column (Tab to Card/Handle, Space pick up, Arrow keys move, Space drop). Cross-column keyboard moves are NOT supported in v1.

**Anti-patterns**

- ❌ Expecting cross-column keyboard reorder. dnd-kit's stock coordinate-getter is per-`SortableContext`. v2 will ship a custom getter that bridges columns.
- ❌ Leaving `<Kanban.Column>` unnamed. Screen-reader drag announcements name the destination column from its `aria-label` or `aria-labelledby`; without either they fall back to "column 2 of 3". A named column also renders as `role="group"` so the name isn't inert.
- ❌ A content-heavy `<Kanban.Card>` with no `aria-label`. The card announces itself by its rendered text, so a card carrying title + assignee + due date + badges reads all of it on every drag step. One `aria-label` fixes it.
- ❌ Interleaving non-`Kanban.Card` children with cards inside a `<Kanban.Column>`. The Root walks each column's children to extract a contiguous card block; if non-cards appear between cards, the rendering re-arranges them awkwardly. Keep header / count badges BEFORE the cards, footer / "Add card" buttons AFTER.
- ❌ Wrapping `<Kanban.Card>` inside a custom component. The Root walks direct descendants of `<Kanban.Column>` to find cards; nested cards are invisible to it.
- ❌ Non-stable column / card ids (e.g. array indices). Both must persist across reorders.
- ❌ Mutating board state in place inside `onMove`. Always return a new object/array reference.
