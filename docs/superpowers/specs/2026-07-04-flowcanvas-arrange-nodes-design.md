# FlowCanvas — pinned nodes ignore auto-layout + `arrangeNodes` API

**Date:** 2026-07-04
**Component:** `packages/design-system/src/components/FlowCanvas/`
**Status:** Approved design, ready for planning
**Follows:** the maximize + `controls` work (v0.2.19) which surfaced the reflow via a controls-slot "Add node" button.

## Summary

Two related, events-only changes to FlowCanvas's layout:

1. **Fix — `computeLayout` ignores pinned nodes.** Only nodes without an explicit `position` ("auto") participate in ranking/placement/centering. A pinned node no longer perturbs the auto-laid-out nodes.
2. **API — `arrangeNodes(nodes, edges)`.** A pure exported function that lays out **all** nodes into the layered layout and returns them with `position` set, for consumer-driven "re-arrange." No built-in button — the consumer wires their own (e.g. in the `controls` slot).

No new props, no new component. `FlowCanvas`'s events-only contract (it never mutates data) is preserved.

## Motivation

After v0.2.19 shipped a `controls` slot, an "Add node" button that inserts a node with an explicit `position` made the existing auto-laid-out nodes visibly shift. Root cause: `computeLayout` ranks and vertically-centers **every** node — so a pinned node (e.g. an edge-less one at rank 0) inflates its rank's height and re-centers the others. (The width-jitter component of the same symptom was already fixed by #284's `width: max-content`.) Separately, consumers want a one-click "tidy the whole graph" action, but the canvas owns no state.

## Decisions locked during brainstorming

- **Pinned = invisible to layout** (not "ranked but unplaced", not "obstacle avoidance"). Simplest, predictable: you place pinned nodes; auto nodes lay out among themselves; the two don't interact.
- **Re-arrange = a pure exported function**, `arrangeNodes(nodes, edges): FlowCanvasNode[]` — NOT a built-in button and NOT an imperative ref method. The consumer adds their own button and applies the result.
- **Return `FlowCanvasNode[]`** (drop-in `setNodes((prev) => arrangeNodes(prev, edges))`), name **`arrangeNodes`**.
- `arrangeNodes` uses `ESTIMATED_NODE_SIZE` (a standalone function can't see the live canvas's `ResizeObserver` measurements) — documented caveat; the marginal accuracy gain of a ref-based measured variant isn't worth the extra API surface (YAGNI).

## Design

### Part 1 — `computeLayout` ignores pinned nodes (`layout.ts`)

`computeLayout(nodes, edges, sizes)` keeps its signature and return type (`Map<string, FlowCanvasPoint>`). The only change: it operates on the **auto** subset.

- After the `nodes.length === 0` guard, add:
  ```ts
  const autoNodes = nodes.filter((node) => node.position === undefined);
  if (autoNodes.length === 0) return result;
  ```
- Everywhere the algorithm currently iterates `nodes`, iterate `autoNodes` instead:
  - `const ids = new Set(autoNodes.map((node) => node.id));`
  - the `out`/`incoming`/`indegree` init loop: `for (const node of autoNodes)`
  - `const sources = autoNodes.filter((node) => indegree.get(node.id) === 0);` and the source fallback `[autoNodes[0]]`
  - the unranked-cycle seed loop: `for (const node of autoNodes) if (!rank.has(node.id)) ...`
  - the rank-bucketing loop: `for (const node of autoNodes) { const r = rank.get(node.id)!; (ranks[r] ??= []).push(node); }`
- The edge loop is **unchanged**: its existing guard `if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) continue` now also skips any edge touching a pinned node, because pinned ids are no longer in `ids`. This is the same code path already used for edges to unknown nodes.
- The returned Map therefore contains positions only for auto nodes. `positionOf` (in `FlowCanvas.tsx`) is unchanged — it already prefers an explicit `position` for pinned nodes and falls back to the computed map for auto nodes; pinned nodes' computed positions were never read.

**JSDoc:** update `computeLayout`'s doc to state it lays out only nodes without an explicit `position`; pinned nodes are placed by the consumer and are ignored (they neither occupy layout space nor anchor edges).

**Out of scope:** a _dragged_ auto node (its `position` is still `undefined`; its live position lives in the canvas's separate `dragOverrides` map) remains "auto" and still participates — that is pre-existing behavior unrelated to this bug. Keyed strictly off `node.position !== undefined`.

### Part 2 — `arrangeNodes(nodes, edges)` (`layout.ts`, exported)

```ts
/**
 * Lay out every node into the layered left→right auto-layout and return the
 * nodes with `position` filled in — for a consumer-driven "re-arrange / tidy"
 * action. Unlike the internal auto-layout (which only places nodes without an
 * explicit `position`), this re-flows ALL nodes, overwriting any existing
 * `position`. Pure and deterministic; every other node field is preserved.
 *
 * Uses estimated node sizes, so vertical centering can differ by a few pixels
 * from the live in-canvas layout (a standalone function can't measure the
 * rendered DOM). Fine for a tidy action.
 *
 * @example
 * // A "Re-arrange" button in the consumer's UI (e.g. the FlowCanvas `controls` slot):
 * <Button onClick={() => setNodes((prev) => arrangeNodes(prev, edges))}>Re-arrange</Button>
 */
export function arrangeNodes(nodes: FlowCanvasNode[], edges: FlowCanvasEdge[]): FlowCanvasNode[] {
  // Strip positions so the whole graph is treated as auto and re-laid-out.
  const layout = computeLayout(
    nodes.map((node) => ({ ...node, position: undefined })),
    edges,
  );
  return nodes.map((node) => {
    const position = layout.get(node.id);
    return position ? { ...node, position } : node;
  });
}
```

Because every node is stripped to `position: undefined`, `computeLayout` treats all of them as auto and returns a position for each, so every node comes back with a fresh `position`. The `? : node` fallback is defensive (a node computeLayout somehow omitted keeps its prior value) and never triggers in practice.

### Exports

- `packages/design-system/src/components/FlowCanvas/index.ts`: `export { arrangeNodes } from './layout';`
- `packages/design-system/src/index.ts`: add `arrangeNodes` to the existing FlowCanvas export line. (`FlowCanvasNode`/`FlowCanvasEdge` types are already exported.)

## Testing

### `layout.test.ts` — `computeLayout` fix

- **Pinned excluded from result:** a mixed graph (some nodes with `position`, some without) → the result Map has keys only for the auto nodes.
- **Auto layout is pinned-independent:** the auto nodes' computed positions equal `computeLayout(<only the auto nodes>, edges)` byte-for-byte.
- **Reported repro:** given auto nodes A/B/C with edges, `computeLayout([A,B,C], e)` and `computeLayout([A,B,C, {id:'D', label:'D', position:{x:9,y:9}}], e)` return identical positions for A/B/C.
- **Edge to a pinned node is skipped:** an auto node whose only incoming edge comes from a pinned node is treated as a source (rank 0), no crash.
- **All-pinned → empty Map.**
- Existing all-auto tests must still pass unchanged.

### `layout.test.ts` — `arrangeNodes`

- Returns every input node with a `position` set (including nodes that were pinned — their old position is overwritten).
- Preserves other fields (`label`, `color`, `adornment`, `id`).
- Deterministic (two calls → equal output).
- Layered order sane (a source is left of its target: `x` ascending along an edge).

### `FlowCanvas.test.tsx` — integration

- Render auto nodes, capture each rendered node's `style.left`/`style.top`, rerender with an **added pinned node**, assert the pre-existing nodes' `left`/`top` are unchanged (jsdom uses `ESTIMATED_NODE_SIZE`, so positions are deterministic).

## Demo

`packages/playground/src/pages/components/FlowCanvasDemo.tsx`: in the "Workflow builder" example, change the second controls-slot button from **"Reset"** to **"Re-arrange"**, wired to `arrangeNodes`:

```tsx
<Button size="sm" variant="secondary" onClick={() => setNodes((prev) => arrangeNodes(prev, edges))}>
  Re-arrange
</Button>
```

Update the displayed `code` snippet and the imports (`arrangeNodes`) to match. Keep "Add node".

## Documentation

- `arrangeNodes` JSDoc as above (description + `@example` + the estimated-size caveat).
- `computeLayout` JSDoc updated (Part 1).
- `FlowCanvasNode.position` prop JSDoc (`types.ts`): add a sentence that a node with an explicit `position` is pinned and does not affect the auto-layout of the other nodes.
- `AGENTS.md` `### <FlowCanvas>`: one line noting pinned nodes don't perturb auto-layout, and that `arrangeNodes(nodes, edges)` re-flows the whole graph for a consumer "re-arrange" button.

Not a new component, so no `_meta/manifest.ts` CLUSTERS entry and no `props.manifest.json` change (no new props).

## Out of scope (YAGNI)

- A built-in re-arrange button (explicitly rejected — consumer adds their own).
- An imperative ref method / measured-size variant of `arrangeNodes`.
- Obstacle-avoidance layout around pinned nodes.
- Any change to the drag / `dragOverrides` behavior.
