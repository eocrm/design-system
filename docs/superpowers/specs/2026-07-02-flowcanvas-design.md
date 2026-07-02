# FlowCanvas — node-edge flow canvas primitive

**Date:** 2026-07-02
**Issue:** [#265](https://github.com/eocrm/design-system/issues/265) — Graph/flow canvas primitive for node-edge diagrams (Workflows builder)
**Status:** Approved

## Context

The eoCRM Workflows module needs a visual workflow builder (Slice 2c): colored state
nodes connected by directed transition edges. The form-first builder (Slice 2b,
`apps/web/src/tenant/workflows/` in the eocrm repo) is shipped and remains the
reference behavior and the accessible fallback. This component fills the DS gap so
Slice 2c consumes a native primitive instead of a bespoke solution.

Reference-domain facts that shaped the design (from the eocrm repo):

- States: `{ id, workflow_id, key, name, category: 'to_do'|'in_progress'|'done', color (free hex), position (list-order int), is_initial }`. **No x/y coordinates exist anywhere** — `position` is list order.
- Transitions: `{ id, workflow_id, from_state_id, to_state_id, required_permission, guard (Liquid string), position }`. From/to are immutable (rewire = delete + recreate). No self-loops, no duplicate `(from, to)` pairs (DB-enforced). Exactly one initial state per workflow.
- Category→Badge-tone mapping, guard editing (server-validated Liquid), color presets, and permission semantics all live in the CRM app, not the DS.

## Decisions (brainstorm outcomes)

1. **Hand-rolled SVG + HTML — no new dependency.** `@xyflow/react` conflicts with the package dependency policy ("no UI/component libraries"); `dagre` is unmaintained (last publish 2022). Precedents already in the library: ImageCrop (pointer-capture pan, `translate/scale` transform, `role="application"` keyboard), SVSquare (2D pointer math), CircularProgress/BrandIcon (hand-written SVG).
2. **Generic API + adornment slots.** Nodes/edges are domain-free; the CRM renders "Initial" badges, category badges, and "Guard" chips into `ReactNode` slots. Matches how Kanban/DataTable stay domain-free.
3. **Events-only editing.** The canvas owns spatial interactions and emits intents; it never mutates data and hosts no editors. The CRM anchors its existing Slice 2b modals to the events.
4. **Optional positions + built-in auto-layout.** `position?: {x, y}`; positionless nodes get a hand-rolled layered layout. Works day-1 with zero backend changes.
5. **Full keyboard parity, including a keyboard connect mode.**
6. **Rendering: HTML nodes + SVG edge underlay** (real DOM focus/ARIA/slots; crisp SVG edges).
7. **Visual: accent-bar nodes** — white card, 4px colored left bar, selection = accent outline.

## Public API

```ts
interface FlowCanvasNode {
  id: string;
  label: string; // plain string — also used for live-region announcements
  color?: string; // hex accent bar; default: var(--color-accent)
  position?: { x: number; y: number }; // canvas units (px @ zoom 1); missing → auto-layout
  adornment?: ReactNode; // slot after label (e.g. <Badge>Initial</Badge>)
}

interface FlowCanvasEdge {
  id: string;
  from: string; // source node id
  to: string; // target node id
  label?: ReactNode; // mid-edge chip slot (e.g. "Guard" badge)
}

type FlowCanvasSelection = { type: 'node' | 'edge'; id: string } | null;

interface FlowCanvasProps extends HTMLAttributes<HTMLDivElement> {
  nodes: FlowCanvasNode[];
  edges: FlowCanvasEdge[];

  // Intents — the canvas NEVER mutates data; the consumer owns it.
  onNodeCreate?(position: { x: number; y: number }): void; // double-click empty canvas
  onNodeMove?(id: string, position: { x: number; y: number }): void; // drag/nudge commit
  onNodeOpen?(id: string): void; // Enter or double-click on node
  onNodeDelete?(id: string): void; // Delete/Backspace on selected node
  onEdgeCreate?(from: string, to: string): void; // pointer draw or keyboard connect
  onEdgeOpen?(id: string): void; // Enter or double-click on edge
  onEdgeDelete?(id: string): void; // Delete/Backspace on selected edge

  /** Live validation during edge drawing / connect mode.
   *  Default: rejects self-loops and duplicate (from, to) pairs. */
  isValidConnection?(from: string, to: string): boolean;

  // Selection — single-select, controlled or uncontrolled (useControllableState).
  selection?: FlowCanvasSelection;
  defaultSelection?: FlowCanvasSelection;
  onSelectionChange?(selection: FlowCanvasSelection): void;

  /** Render-only mode: all mutation gestures/keys are inert; selection/open still work. */
  readOnly?: boolean;
}
```

Exports from `src/index.ts`: `FlowCanvas`, `FlowCanvasProps`, `FlowCanvasNode`,
`FlowCanvasEdge`, `FlowCanvasSelection`.

### Position semantics (semi-uncontrolled)

An explicit `node.position` always wins. Nodes without one get a computed position:
auto-layout first, then any user drags, kept in an internal map for the component's
lifetime. So the day-1 CRM (no persisted coordinates) still gets drag-to-arrange for
the session; `onNodeMove` fires on every commit so the consumer can start persisting
when the backend adds columns. Mixed explicit+auto placement may overlap — documented;
consumers typically supply all or none.

## Rendering & viewport

- Root `div` — `forwardRef`, `role="application"`, the single tab stop
  (`tabIndex={0}`), `width/height: 100%` (parent owns sizing, Rule 4). Dot-grid
  background.
- Inner stage `div` — `transform: translate(tx, ty) scale(z)`, `transform-origin: 0 0`
  (ImageCrop pattern). Viewport state is internal (not a prop).
- One `<svg>` underlay renders every edge: cubic beziers between nearest-side anchor
  points, arrowhead `<marker>` at the target, perpendicular offset when a reverse edge
  exists (A→B and B→A never overlap), small loop arc if data contains a self-loop.
  Each edge has a wide transparent hit-area path over the visible stroke.
- Nodes are absolutely-positioned HTML divs above the SVG. Edge label chips are HTML
  overlays at the bezier midpoint (t = 0.5).
- Node sizes: estimated constants on first paint, then measured via ResizeObserver →
  one relayout. In jsdom (all rects 0) the estimates keep geometry deterministic.
- Zoom 0.25–2×: Ctrl/Cmd+wheel zooms toward the cursor; plain wheel/trackpad pans;
  drag on empty canvas pans (pointer capture). Initial viewport fits content.
- Built-in control cluster (bottom-left): zoom in / zoom out / fit — `Button iconOnly`
  with lucide icons and i18n `aria-label`s.

## Pointer interactions

| Gesture                   | Behavior                                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Click node / edge         | Select it                                                                                                                               |
| Click empty canvas        | Clear selection                                                                                                                         |
| Drag node body            | Move node — live local position during drag, `onNodeMove(id, pos)` commit at pointerup (ColorPicker drag-then-commit pattern)           |
| Drag from connect handle  | Ghost edge follows cursor; targets highlight per `isValidConnection`; drop on valid target → `onEdgeCreate(from, to)`; Esc/miss cancels |
| Double-click empty canvas | `onNodeCreate({x, y})` in canvas coordinates                                                                                            |
| Double-click node         | `onNodeOpen(id)`                                                                                                                        |
| Double-click edge / chip  | `onEdgeOpen(id)`                                                                                                                        |
| Delete / Backspace        | `onNodeDelete` / `onEdgeDelete` for the current selection                                                                               |

The connect handle appears on node hover/focus at the node's right edge; it is a
pointer-only affordance (`aria-hidden`, not focusable) — keyboard users use connect
mode. All mutation gestures are inert under `readOnly`.

## Keyboard model (full parity)

Single tab stop; roving focus inside; selection follows focus.

| Key                | Behavior                                                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Arrows             | Move node focus spatially (nearest node in that direction); viewport auto-pans to reveal the focused node                         |
| Home / End         | First / last node (document order)                                                                                                |
| Ctrl+Arrows        | Pan the canvas                                                                                                                    |
| + / −              | Zoom in / out; `0` = fit to content                                                                                               |
| Enter / Space      | `onNodeOpen` (node) / `onEdgeOpen` (edge)                                                                                         |
| Delete / Backspace | `onNodeDelete` / `onEdgeDelete`                                                                                                   |
| Shift+Arrows       | Nudge focused node 8 px, committing via `onNodeMove`                                                                              |
| E                  | Cycle focus through edges attached to the focused node (outgoing, then incoming; "Edge Open → Resolved, 2 of 3")                  |
| Any arrow on edge  | Return to node navigation                                                                                                         |
| C                  | Connect mode: ghost edge from the focused node; arrows pick a valid target (invalid skipped); Enter → `onEdgeCreate`; Esc cancels |
| Esc                | Cancel mode, else clear selection                                                                                                 |

### ARIA

No APG pattern exists for node-edge canvases (the same situation SVSquare/ImageCrop
document). Approach:

- Root: `role="application"`, default `aria-label` via i18n, `aria-describedby` →
  visually-hidden instructions text (keyboard cheat-sheet).
- Nodes and edges: focusable (`tabIndex={-1}`, real `.focus()` — HTML divs and SVG
  paths both support it), localized `aria-roledescription`, `aria-label` from node
  labels ("Open", "Open → Resolved").
- A polite visually-hidden `role="status"` live region announces focus moves,
  selection, connect-mode progress, zoom level, and node moves, using `label` strings
  only (ReactNode slots are not announced).
- All strings under `flowCanvas.*` in `src/i18n/messages.ts` + `en.ts` + `ru.ts`
  (Rule 9). Function leaves for parameterized announcements.
- Focus styling via `:focus-visible` (Rule 3a); `prefers-reduced-motion` respected.

## Auto-layout (`layout.ts`, pure)

Longest-path layering over the directed graph: sources = nodes with no incoming edges
(fallback: first node), rank = longest path from a source, ranks flow left → right,
one barycenter pass orders nodes within a rank to reduce crossings, vertical stacking
with token-derived gaps. Deterministic, cycle-safe (visited guard), pure function of
`(nodes, edges, sizes)` → unit-tested directly.

## Theming (accent-bar visual)

`FlowCanvas.tokens.scss` (component tokens defaulting to primitives):
`--flow-canvas-bg`, `--flow-canvas-grid-dot`, `--flow-node-bg`, `--flow-node-border`,
`--flow-node-radius`, `--flow-node-shadow`, `--flow-node-accent-width`,
`--flow-edge-stroke`, `--flow-edge-stroke-active`, chip surface tokens.

Per-node hex flows through an inline `--flow-node-color` custom property consumed by
the SCSS (`border-left-color: var(--flow-node-color)`), keeping stylelint's
no-raw-values rule intact. Selected elements get the accent outline (`--ring-accent`).

## File layout

```
src/components/FlowCanvas/
  FlowCanvas.tsx          ← root orchestrator (viewport, focus, live region)
  FlowNode.tsx            ← node card + connect handle
  FlowEdge.tsx            ← edge path + hit area + chip overlay
  FlowControls.tsx        ← zoom in/out/fit cluster
  useViewport.ts          ← pan/zoom state, wheel + background-drag handling
  useConnect.ts           ← pointer edge-draw + keyboard connect mode
  types.ts                ← FlowCanvasNode/Edge/Selection + props
  layout.ts (+test)       ← auto-layout
  edgePath.ts (+test)     ← bezier anchors, pair offsets, self-loops, midpoint
  spatialNav.ts (+test)   ← nearest-in-direction node focus
  FlowCanvas.module.scss
  FlowCanvas.tokens.scss
  FlowCanvas.test.tsx
  index.ts
```

## Testing

Rule 1 minimums plus, using the library's established jsdom tricks (mocked
`getBoundingClientRect`, `fireEvent.pointerDown/Move/Up`, `PointerEvent` dispatched on
`window`, stubbed `setPointerCapture`):

- Nodes/edges render from data; edges referencing missing nodes are skipped (with a
  one-time dev `console.warn`).
- `ref` forwarded to root; `className` merged; prop spread.
- Selection: controlled + uncontrolled round-trip.
- Every intent callback: click/double-click routing, drag-move coordinate math,
  edge-draw gesture, `isValidConnection` gating (default self-loop/duplicate rules).
- Full keyboard model: arrows/Home/End roving, E edge cycling, C connect mode
  end-to-end, Shift+arrow nudge, Delete, +/−/0 zoom (assert stage `transform`),
  Ctrl+arrow pan.
- Live-region announcement text; i18n keys resolve in en and ru.
- `readOnly` inertness.
- `layout.ts` / `edgePath.ts` / `spatialNav.ts` as pure-function tests.

## Integration checklist (meta-machinery)

1. `src/index.ts` — value + type exports.
2. `CLUSTERS` entry `FlowCanvas: 'Display'` in **both** `src/_meta/manifest.ts` and
   `scripts/generate-manifest.mjs`, then `npm run build:manifest` (commit the JSON).
3. `npm run build:props` in the playground (commit `props.manifest.json`).
4. Playground: `src/pages/components/FlowCanvasDemo.tsx` (DemoLayout + Example;
   workflow-flavored demo exercising the real component — state in `useState`, Badge
   adornments, guard chips, live create/move/connect/delete, `readOnly` example,
   auto-layout example); route `/components/flow-canvas` in `App.tsx`; `navItems.ts`
   entry (Display group, `Workflow` lucide icon); `ComponentsIndex.tsx` card;
   `registry.ts` `ComponentName` union.
5. `AGENTS.md` TL;DR section + canonical snippet.
6. JSDoc `@remarks` anti-patterns on the component function: not for >~100-node
   graphs (no virtualization), not a Kanban/Sortable substitute, not for
   undirected/free-form drawing, the form-first builder remains the accessible
   fallback for workflow editing.

## Out of scope (v1)

Minimap, multi-select, undo/redo, snapping/alignment guides, edge rewiring by drag
(rewire = delete + recreate, matching the domain's immutable from/to), controlled
viewport props, pinch-zoom, RTL coordinate flipping.
