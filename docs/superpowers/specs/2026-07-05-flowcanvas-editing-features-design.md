# FlowCanvas — edge rewiring, connection gate, drag confinement, selection controls

**Date:** 2026-07-05
**Component:** `packages/design-system/src/components/FlowCanvas/`
**Status:** Approved design, ready for planning
**Ships as:** one PR / one release, implemented feature-by-feature.

## Summary

Four additive FlowCanvas capabilities, built one at a time but shipped together:

1. **Drag-to-rewire edge endpoints** — select an edge, drag its source/target handle to another node; new intent `onEdgeReconnect(id, from, to)`. Includes a keyboard rewire mode.
2. **`allowConnections={false}`** — a narrow gate disabling connection *creation* and *rewiring* while keeping node drag/move/delete/select.
3. **`confineNodesToView`** — clamp a dragged node so its whole card stays inside the visible canvas rect.
4. **Selection floating controls** — `renderNodeActions`/`renderEdgeActions` render props that anchor a consumer toolbar to the selected node/edge, following pan/zoom.

Events-only architecture is preserved throughout (the canvas emits intents; consumers own data). No breaking changes.

## Decisions locked during brainstorming

- Rewire **reverts** on drop over empty canvas (edge unchanged; `onEdgeReconnect` not called). Not delete.
- Rewire supports **both pointer drag and keyboard**.
- Selection controls use **separate** `renderNodeActions?(id)` / `renderEdgeActions?(id)` props (no branch-on-type).
- `allowConnections` gates rewiring too (rewiring edits connections).
- Node anchor for the toolbar: **top-right corner** of the node rect. Edge anchor: **near the edge midpoint**.

## Current internals (grounding)

- `connect` state (`FlowCanvas.tsx:372`): `{ from, mode: 'pointer'|'keyboard', pointerId, target, cursor }` — the connect state machine. The root captures the pointer; move/up flow through `handleRootPointerMove`/`Up`.
- `isValid = isValidConnection ?? defaultIsValid` where `defaultIsValid(from,to) = from !== to && !edges.some(e => e.from===from && e.to===to)` (`FlowCanvas.tsx:386`). `canCommitConnect` gates commits.
- Node drag: `dragState` ref + `liveDrag`/`dragOverrides`; move accumulates `delta/viewport.z` per segment; commit calls `onNodeMove`. `positionOf` precedence: liveDrag > `node.position` > dragOverrides > layout.
- `FlowEdge.tsx` renders a visible `.edgePath` + a wide `.edgeHit` (`data-flow-edge`); it receives only `geometry` and exposes **no endpoint coordinates**.
- `EdgeGeometry` (`types.ts:15`) is only `{ path, midpoint }`; `edgeGeometry`/`selfLoopGeometry` compute but **discard** the source/target anchor points (`p0`/`p3`).
- Visible-canvas rect (canvas coords) from `viewport` + root size: `x=-tx/z, y=-ty/z, w=rootW/z, h=rootH/z`.
- `.handle` connect affordance in `FlowNode.tsx:58` is gated only on `!readOnly`.

## Feature 1 — Drag-to-rewire edge endpoints

### API
```ts
/**
 * Called when the user drags an existing edge's endpoint onto a different
 * node (pointer) or confirms a keyboard rewire. `id` is the edge; `from`/`to`
 * are its NEW endpoints. The canvas never mutates the edge — apply this to
 * your state. Not fired when the rewire is reverted (dropped on empty canvas,
 * invalid target, or no change).
 */
onEdgeReconnect?: (id: string, from: string, to: string) => void;
```

### `EdgeGeometry` extension (`types.ts` + `edgePath.ts`)
Add the endpoint anchor points that `edgeGeometry`/`selfLoopGeometry` already compute but discard:
```ts
export interface EdgeGeometry {
  path: string;
  midpoint: Point;
  source: Point; // p0 — anchor on the source node's facing side
  target: Point; // p3 — anchor on the target node's facing side
}
```
All call sites are in the `resolvedEdges` memo; the added fields are ignored by existing consumers.

### Endpoint handles (`FlowEdge.tsx`)
When an edge is **selected** (`active`) and editing is allowed (not `readOnly`, `allowConnections !== false`), render two small circle handles at `geometry.source` and `geometry.target` inside the edge's `<g>`. Each:
- carries `data-flow-edge-endpoint="source|target"` and the edge id,
- has a WCAG-sized invisible hit area (a transparent wide circle) + a visible dot (tokens, mirroring `.handle`),
- `onPointerDown` → `onEndpointPointerDown(edgeId, end, event)` (stops propagation so it doesn't select/drag the edge).

### Pointer rewire — connect-state-machine extension
Extend `connect` state with rewire fields:
```ts
{ ...existing, edgeId?: string; end?: 'source' | 'target'; fixed?: string }
```
- `onEndpointPointerDown`: sets `connect = { from: fixed, mode:'pointer', pointerId, target:null, cursor:null, edgeId, end, fixed }` where `fixed` is the *other* endpoint (dragging `target` keeps `source` fixed, and vice-versa). Root captures the pointer (same as connect).
- Move (`handleRootPointerMove`, pointer branch): identical target-hover + validation, but validity uses **rewire validation** (below) and the ghost is drawn `fixed → cursor` (for a `source` rewire the ghost must run `cursor → fixed`, i.e. inverted, so the arrowhead stays on the real target).
- Up (`handleRootPointerUp`, pointer branch): if `edgeId` set and there is a valid `target` and the resulting `(from,to)` differs from the current edge → `onEdgeReconnect(edgeId, newFrom, newTo)`; else revert. Always `setConnect(null)`.

`newFrom`/`newTo`: for `end==='target'` → `(fixed, target)`; for `end==='source'` → `(target, fixed)`.

### Keyboard rewire
On a selected/focused edge (not readOnly, connections allowed):
- **`R`** starts rewiring the **target** endpoint; **`Shift+R`** the **source** endpoint. Sets a keyboard-mode `connect` with `edgeId`/`end`/`fixed` (fixed = the other endpoint), `target=null`.
- Arrows step candidate nodes exactly like the C-key connect (reuse the same `nearestInDirection` + `isRewireValid` filtering + reveal/announce path).
- **Enter** commits via `onEdgeReconnect` (re-validates); **Escape** cancels (revert). Tab out cancels (existing focus-out cancel).
- Announcements via new i18n keys (`flowCanvas.rewireStart`, `flowCanvas.rewireDone`, reuse `connectNoTarget`/`connectCancelled` where apt). Instructions text (`flowCanvas.instructions`) gains an `R` mention.

### Rewire validation (`isRewireValid`)
```
isRewireValid(edgeId, from, to) =
  from !== to
  && !edges.some(e => e.id !== edgeId && e.from === from && e.to === to)  // no OTHER duplicate
  && (isValidConnection ? isValidConnection(from, to) : true)             // consumer rules
```
Dropping back on the current endpoint (result equals the current edge) is a silent no-op (revert, no callback). This is a distinct check from `defaultIsValid` (which would wrongly flag the edge itself as a duplicate), so rewire uses `isRewireValid`, not `isValid`.

### Gating & docs
Endpoint handles + `R` key are inert when `readOnly` or `allowConnections === false`. Remove the JSDoc bullet "Rewiring an existing edge's endpoints by dragging — not supported" (`FlowCanvas.tsx:121-122`) and document the new capability + `onEdgeReconnect`.

## Feature 2 — `allowConnections={false}`

```ts
/**
 * When false, disables creating and rewiring connections — the node connect
 * handle is hidden, pointer/keyboard connect (drag from the handle, `C`) and
 * edge-endpoint rewiring (`R`, endpoint drag) are inert. Node
 * drag/move/delete/selection still work. `readOnly` overrides this (it
 * disables everything). @default true
 */
allowConnections?: boolean;
```
Wiring points:
- `FlowNode.tsx` — render `.handle` only when `!readOnly && allowConnections` (thread `allowConnections` down, or compute a `canConnect` boolean passed to FlowNode).
- `handleHandlePointerDown` — early-return when `!allowConnections`.
- C-key start (`handleRootKeyDown`) — early-return when `!allowConnections`.
- Feature 1's endpoint handles + `R` — gated on the same flag.

## Feature 3 — `confineNodesToView`

```ts
/**
 * When true, a dragged node is clamped so its whole card stays within the
 * currently-visible canvas area (accounting for pan/zoom). Applies to live
 * drag and the committed `onNodeMove` position; keyboard nudges are also
 * clamped. @default false
 */
confineNodesToView?: boolean;
```
- Compute the visible-canvas rect from `viewport` + `rootRef` size: `{ x:-tx/z, y:-ty/z, w:rootW/z, h:rootH/z }`.
- Clamp helper: given a node position and its size (`sizes.get(id) ?? ESTIMATED_NODE_SIZE`), clamp `x ∈ [visible.x, visible.x + visible.w - nodeW]` and `y` likewise (so the whole card stays inside). If the node is larger than the viewport, clamp to the top-left corner (min wins).
- Apply in `handleRootPointerMove` (the live `drag.position`), `handleRootPointerUp` (commit), and the Shift+Arrow nudge path. Only when `confineNodesToView`.

## Feature 4 — Selection floating controls

```ts
/** Render a floating toolbar anchored to the top-right corner of the selected NODE. */
renderNodeActions?: (id: string) => ReactNode;
/** Render a floating toolbar anchored near the midpoint of the selected EDGE. */
renderEdgeActions?: (id: string) => ReactNode;
```
- Rendered only for the current `selection` (one at a time), when the matching render prop is provided and returns non-null.
- **Positioning (screen space, follows pan/zoom):** an absolutely-positioned overlay `<div>` inside the root (a sibling of the stage, NOT inside the transformed stage — so its content isn't scaled). Its `left/top` are computed in screen px from the element's canvas rect × viewport:
  - node: anchor at the node's top-right corner → `left = rect.x*z+tx + rect.width*z`, `top = rect.y*z+ty` (then offset by a token so the toolbar floats just outside the corner).
  - edge: anchor at `geometry.midpoint` → `left = mid.x*z+tx`, `top = mid.y*z+ty`.
- The overlay carries `data-flow-controls=""` (so pressing it never starts a pan / clears selection — the `isBackgroundTarget` + `#290` guards already exempt it), and is not `aria-hidden`. Recomputes every render (viewport/selection/drag changes trigger re-render).
- Near-canvas-edge clipping is accepted for v1 (root is `overflow:hidden`); documented. No collision flipping in v1 (YAGNI).

## Testing (`FlowCanvas.test.tsx`, `edgePath.test.ts`)

- **EdgeGeometry:** `edgeGeometry`/`selfLoopGeometry` now return `source`/`target` points at the expected node-facing anchors (unit, `edgePath.test.ts`).
- **Rewire (pointer):** selecting an edge renders two endpoint handles; a pointerdown on the target handle + move over another node + pointerup fires `onEdgeReconnect(id, from, newTo)`; dropping on empty canvas or an invalid target does NOT fire (revert); a source-handle drag rewires `from`.
- **Rewire (keyboard):** `R` on a selected edge enters rewire, arrows step, Enter fires `onEdgeReconnect`; `Shift+R` rewires source; Escape reverts. No-op when result equals the current edge.
- **Rewire validation:** rewiring to a node that would duplicate ANOTHER edge is rejected; rewiring back to the same endpoint is a no-op; `isValidConnection` is consulted.
- **allowConnections=false:** connect handle absent; handle-drag / `C` / `R` / endpoint handles all inert; node drag + delete still work.
- **confineNodesToView:** a drag that would move a node past the visible edge is clamped (assert committed `onNodeMove` position is within the visible rect inset by node size); off by default (unclamped).
- **Selection controls:** `renderNodeActions` output appears when a node is selected (and not for an edge); `renderEdgeActions` for an edge; both carry `data-flow-controls`; clicking one does not clear the selection / start a pan; absent when no selection or the prop returns null.
- **Browser-verify** (jsdom can't see geometry/paint): endpoint handles sit on the real edge ends and rewire visibly; the selection toolbar tracks the node through pan/zoom/drag; confinement stops a node at the viewport edge; a `ConfirmationPopover` inside `renderEdgeActions` works (post-#290).

## Demo (`FlowCanvasDemo.tsx`)

Extend the interactive "Workflow builder": wire `onEdgeReconnect` (update the edge in state), add `renderNodeActions`/`renderEdgeActions` (e.g. an edit + delete toolbar; the edge one behind a `ConfirmationPopover`), add a toggle for `allowConnections` and `confineNodesToView` so the demo exercises them.

## Documentation

JSDoc on every new prop/callback (Rule 7); remove the "rewiring not supported" bullet and add rewire/`onEdgeReconnect`, `allowConnections`, `confineNodesToView`, `renderNodeActions`/`renderEdgeActions` to the component `@remarks` and the `### <FlowCanvas>` AGENTS.md section. New i18n keys in `messages.ts`/`en.ts`/`ru.ts`. No new exported types beyond the extended `EdgeGeometry` (internal).

## Out of scope (YAGNI)

- Collision-aware flipping of the selection toolbar near canvas edges.
- Dragging an edge endpoint to create a *branch* (duplicating) — rewire moves, never copies.
- Confinement to arbitrary custom bounds (only the visible viewport).
- Multi-select and multi-selection toolbars (selection stays single).

## Primary risks

- **Rewire ghost direction for a `source` rewire** — the ghost/arrowhead must invert so the arrow stays on the fixed target; covered by browser verification.
- **`connect` state now serves three modes** (create-pointer, create-keyboard, rewire-pointer/keyboard). Keep the branches explicit (`edgeId` presence distinguishes rewire) and well-tested to avoid cross-mode leakage (e.g. a rewire pointerup must not run the create-commit branch).
