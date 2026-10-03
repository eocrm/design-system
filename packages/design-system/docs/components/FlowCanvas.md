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
the host (Escape closes the host, deselect is incidental) (#282). Pass `controls` (a
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

When NOT to use: >100-node graphs (no virtualization); list/column reordering (use
Kanban/Sortable); undirected/free-form drawing; as the only editing surface for complex
attributes (anchor your own modals via the open callbacks — keep a form-based fallback).
