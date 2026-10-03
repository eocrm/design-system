# `<FlowCanvas>` — pan/zoom canvas for directed node-edge diagrams

Pan/zoom canvas for directed node-edge diagrams (workflow builders). Events-only: you own
`nodes`/`edges`; the canvas emits intents (`onNodeCreate`, `onNodeMove`, `onNodeOpen`,
`onNodeDelete`, `onEdgeCreate`, `onEdgeOpen`, `onEdgeDelete`, `onEdgeReconnect`) and never
mutates data. Nodes
without `position` auto-layout left → right and stay draggable for the session. Nodes with an
explicit `position` are pinned and don't affect the auto-layout of the others (nodes without a
`position` are auto-laid-out). `arrangeNodes(nodes, edges)` (exported) re-flows the whole graph
and returns the nodes with fresh positions — wire it to your own "Re-arrange" button. Selection is
single (`selection`/`defaultSelection`/`onSelectionChange`); `readOnly` disables editing but
keeps select/open. Validation of new connections via `isValidConnection` (default: no
self-loops, no duplicate pairs). **Rewire an existing edge:** select it, then drag either
endpoint handle onto another node (or press `R` / `Shift+R`) → `onEdgeReconnect(id, from, to)`
(reuses `isValidConnection`; reverts on empty/invalid drop). `allowConnections={false}` disables
all create + rewire while keeping node drag/move/delete/select. `confineNodesToView` clamps a
dragged node to the visible canvas area. `renderNodeActions(id)` / `renderEdgeActions(id)` return
a `ReactNode` floated as a toolbar on the selected node/edge, tracking it through pan/zoom (e.g.
a delete icon-button, or one behind a `ConfirmationPopover`). The canvas fills its parent — give
the wrapper a height. Full keyboard: arrows rove nodes, E cycles a node's edges, C connect mode,
R / Shift+R rewire the selected edge's target / source, Shift+arrows nudge, +/−/0 zoom/fit,
Ctrl+arrows pan, Delete deletes, Enter opens. Inside a `Modal`/`Drawer`, an armed connect gesture
(and a `Sortable`/`DataTable` reorder drag — keyboard or pointer) is an Escape-consuming **mode**:
the first Escape cancels the mode and the host survives that press; a mere selection does NOT hold
the host (Escape closes the host, deselect is incidental). Pass `controls` (a
`ReactNode`) to render your own buttons top-left; a built-in Maximize toggle (top-right / `F`
key, Escape to restore) expands the canvas in place to fill the viewport. `maximizeControl={false}`
hides the toggle if you drive `maximized` yourself. The canvas fits-to-content once on mount; to
re-center afterward — on a maximize toggle, a viewport resize, or a programmatic re-arrange that
moves every node — change the **`refitKey`** prop (any `string | number | boolean`): a new value
re-runs the fit **without a remount**, preserving viewport/selection/focus. Don't force a re-fit
with a changing React `key` — that remounts and drops focus to `<body>`. Bind `refitKey={maximized}`
to re-fit on maximize enter/exit, or bump a counter after a re-arrange.

```tsx
const [nodes, setNodes] = useState<FlowCanvasNode[]>([
  { id: 'open', label: 'Open', color: '#0052CC', adornment: <Badge tone="info">Initial</Badge> },
  { id: 'done', label: 'Done', color: '#1F845A' },
]);
const [edges, setEdges] = useState<FlowCanvasEdge[]>([
  { id: 't1', from: 'open', to: 'done', label: <Badge tone="purple">Guard</Badge> },
]);

<div style={{ height: 480 }}>
  <FlowCanvas
    nodes={nodes}
    edges={edges}
    controls={
      <Button size="sm" onClick={addNode}>
        Add node
      </Button>
    }
    onEdgeCreate={(from, to) => createTransition(from, to)}
    onNodeOpen={(id) => openStateModal(id)}
    onNodeDelete={(id) => confirmDeleteState(id)}
  />
</div>;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `nodes` | `FlowCanvasNode[]` | yes | Nodes to render. The canvas never mutates this array. |
| `edges` | `FlowCanvasEdge[]` | yes | Directed edges between nodes. Edges referencing unknown ids are skipped (dev warning). |
| `onNodeCreate` | `((position: FlowCanvasPoint) => void)` | no | Called when the user requests a node at a canvas point (double-click empty canvas). |
| `onNodeMove` | `((id: string, position: FlowCanvasPoint) => void)` | no | Called when a node's position is committed (drag end, keyboard nudge). |
| `onNodeOpen` | `((id: string) => void)` | no | Called when a node is opened (Enter/Space or double-click). |
| `onNodeDelete` | `((id: string) => void)` | no | Called when deletion of the selected node is requested (Delete/Backspace). |
| `onEdgeCreate` | `((from: string, to: string) => void)` | no | Called when the user draws or confirms a connection between two nodes. |
| `onEdgeReconnect` | `((id: string, from: string, to: string) => void)` | no | Called when the user drags an existing edge's endpoint onto a different node, or confirms a keyboard rewire (`R` / `Shift+R`). `id` is the edge; `from`/`to` are its NEW endpoints. The canvas never mutates the edge — apply this to your state. Not fired on revert (empty-canvas drop, invalid target, or no change). Disabled by `readOnly` and `allowConnections={false}`. |
| `onEdgeOpen` | `((id: string) => void)` | no | Called when an edge is opened (Enter/Space or double-click). |
| `onEdgeDelete` | `((id: string) => void)` | no | Called when deletion of the selected edge is requested (Delete/Backspace). |
| `isValidConnection` | `((from: string, to: string) => boolean)` | no | Live validation while drawing a connection. Invalid targets can't be dropped on (pointer) and are skipped (keyboard). Default: `rejects self-loops and duplicate (from, to) pairs`. |
| `selection` | `FlowCanvasSelection` | no | Controlled selection. Use with `onSelectionChange`. A selection whose id is not (or no longer) in `nodes`/`edges` acts as no selection — e.g. after applying a delete intent — until the id reappears in the graph. |
| `defaultSelection` | `FlowCanvasSelection` | no | Initial selection when uncontrolled. Stale ids act as no selection. Default: `null`. |
| `onSelectionChange` | `((selection: FlowCanvasSelection) => void)` | no | Fires whenever the selection changes (click, focus, Escape). |
| `readOnly` | `boolean` | no | Render-only mode: create/move/connect/delete are disabled; selection and open still work. Default: `false`. |
| `allowConnections` | `boolean` | no | When false, disables creating and rewiring connections — the node connect handle is hidden, pointer/keyboard connect (`C`, handle drag) and edge rewiring (`R`, endpoint drag) are inert. Node drag/move/delete/selection still work. `readOnly` overrides this (it disables everything). Default: `true`. |
| `confineNodesToView` | `boolean` | no | When true, a dragged node is clamped so its whole card stays within the currently-visible canvas area (accounting for pan/zoom). Applies to pointer drag, the committed `onNodeMove`, and Shift+Arrow nudges. Default: `false`. |
| `renderNodeActions` | `((id: string) => ReactNode)` | no | Render a floating toolbar anchored to the top-right corner of the selected NODE. Called with the node id; return `null` to show nothing for that node. The toolbar is a screen-positioned overlay (a sibling of the transformed stage, so it is not scaled) that follows pan/zoom. Pressing it never starts a pan or clears the selection. Only rendered for the current single selection. Default: `none`. |
| `renderEdgeActions` | `((id: string) => ReactNode)` | no | Render a floating toolbar anchored near the midpoint of the selected EDGE. Called with the edge id; return `null` to show nothing for that edge. Same screen-positioned, pan/zoom-following overlay as `renderNodeActions`; safe to host a `ConfirmationPopover` here. Default: `none`. |
| `controls` | `ReactNode` | no | Consumer-rendered controls shown in a top-left toolbar overlay. Put design- system `<Button>`s here (e.g. an "Add node" button wired to your own state). Stays pinned when the canvas is maximized. Default: `none`. |
| `maximizeControl` | `boolean` | no | Show the built-in maximize / restore toggle (top-right). Set false to drive maximize entirely via the `maximized` prop. Default: `true`. |
| `maximized` | `boolean` | no | Controlled maximize state. Use with `onMaximizedChange`. |
| `defaultMaximized` | `boolean` | no | Initial maximize state when uncontrolled. Default: `false`. |
| `onMaximizedChange` | `((maximized: boolean) => void)` | no | Fires whenever maximize is toggled (button, `F` key, or Escape). |
| `refitKey` | `string \| number \| boolean` | no | Re-fit signal. Whenever this value CHANGES, the canvas re-runs its fit-to-content — the same fit as the Fit control / `0` key — re-centering and re-zooming to frame all content. It does this WITHOUT remounting, so the viewport, selection, keyboard focus, and the built-in maximize focus management are all preserved (unlike forcing a re-fit with a changing React `key`, which remounts and drops focus to `<body>`). Bind it to whatever should trigger a re-center: `refitKey={maximized}` to re-fit on maximize enter/exit (the container resizes), or bump a counter after a programmatic re-arrange that moves every node. The FIRST value never fits on its own — the mount fit handles the first frame — so any initial value is safe. Default: `none`. |
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

When NOT to use: >100-node graphs (no virtualization); list/column reordering (use
Kanban/Sortable); undirected/free-form drawing; as the only editing surface for complex
attributes (anchor your own modals via the open callbacks — keep a form-based fallback).

```tsx
// Read-only diagram (record page): no editing intents, still zoomable
<FlowCanvas nodes={nodes} edges={edges} readOnly aria-label="Deal workflow" />
```

- Not for undirected / free-form drawing (mind maps, whiteboards): edges are directed with arrowheads and the interaction model assumes a digraph.
- The inline surface is selection + spatial arrangement only; editors belong to you (anchor modals / popovers via the open callbacks).
- ❌ Hiding primary, always-needed actions solely behind Maximize or the `controls` slot — that is canvas chrome, not a substitute for the page's own toolbar.
- ❌ Relying on maximize inside an ancestor that creates a containing block via `transform` / `filter` / `perspective` / `will-change`: in-page maximize uses `position: fixed`, so it anchors to that ancestor instead of the viewport and won't fill the screen.
