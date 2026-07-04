# FlowCanvas arrange-nodes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop pinned (explicitly-positioned) nodes from perturbing FlowCanvas auto-layout, and add a pure `arrangeNodes(nodes, edges)` export for consumer-driven "re-arrange".

**Architecture:** Two changes to `layout.ts`: (1) `computeLayout` filters to the `position === undefined` subset so pinned nodes are invisible to ranking/placement/centering; the existing unknown-node edge guard skips edges touching pinned nodes for free. (2) a new pure `arrangeNodes` that strips all positions, runs `computeLayout`, and returns the nodes with fresh `position`s. Events-only — no new props, no built-in UI; the consumer wires their own button.

**Tech Stack:** TypeScript, Vitest + React Testing Library (`globals: true`).

**Reference spec:** `docs/superpowers/specs/2026-07-04-flowcanvas-arrange-nodes-design.md`
**Working branch:** `feat/flowcanvas-arrange-nodes` (already created).

## Conventions

- Tests: `npm test -w @eocrm/design-system -- <pattern> --run` (Vitest globals — do NOT import `describe`/`it`/`expect`/`vi`).
- Typecheck: `npm run typecheck -w @eocrm/design-system`. Lint SCSS (root): `npm run lint:css`. Prettier: `npm run format` before pushing.
- `layout.test.ts` already defines helpers: `const n = (id) => ({ id, label: id })` and `const e = (from, to) => ({ id: \`${from}-${to}\`, from, to })`. Reuse them; write pinned nodes as inline literals with a `position`.
- Commit per task. Do NOT push until Task 6.

---

## Task 1: `computeLayout` ignores pinned nodes

**Files:**
- Modify: `packages/design-system/src/components/FlowCanvas/layout.ts` (the `computeLayout` function + its JSDoc)
- Test: `packages/design-system/src/components/FlowCanvas/layout.test.ts`

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe('computeLayout', () => { ... })` block in `layout.test.ts`:

```ts
  it('ignores pinned nodes (explicit position) — absent from the result', () => {
    const pos = computeLayout(
      [n('a'), n('b'), { id: 'pinned', label: 'P', position: { x: 5, y: 5 } }],
      [e('a', 'b')],
    );
    expect(pos.has('pinned')).toBe(false);
    expect(pos.has('a')).toBe(true);
    expect(pos.has('b')).toBe(true);
  });

  it('lays out auto nodes independently of pinned nodes', () => {
    const autoOnly = computeLayout([n('a'), n('b'), n('c')], [e('a', 'b'), e('b', 'c')]);
    const withPinned = computeLayout(
      [n('a'), n('b'), n('c'), { id: 'd', label: 'D', position: { x: 9, y: 9 } }],
      [e('a', 'b'), e('b', 'c')],
    );
    expect(withPinned.get('a')).toEqual(autoOnly.get('a'));
    expect(withPinned.get('b')).toEqual(autoOnly.get('b'));
    expect(withPinned.get('c')).toEqual(autoOnly.get('c'));
  });

  it('treats an auto node fed only by a pinned node as a source (edge to pinned skipped)', () => {
    const pos = computeLayout(
      [{ id: 'p', label: 'P', position: { x: 0, y: 0 } }, n('b')],
      [e('p', 'b')],
    );
    expect(pos.has('p')).toBe(false);
    expect(pos.get('b')!.x).toBe(0); // rank-0 source, no incoming
  });

  it('returns an empty map when every node is pinned', () => {
    const pos = computeLayout(
      [
        { id: 'a', label: 'A', position: { x: 0, y: 0 } },
        { id: 'b', label: 'B', position: { x: 1, y: 1 } },
      ],
      [e('a', 'b')],
    );
    expect(pos.size).toBe(0);
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test -w @eocrm/design-system -- layout --run`
Expected: FAIL — pinned nodes currently ARE in the result and DO shift the auto nodes.

- [ ] **Step 3: Implement — filter to auto nodes**

In `layout.ts`, make these edits to `computeLayout` (the body operates on `autoNodes` instead of `nodes`; the edge loop is unchanged).

(a) Right after `if (nodes.length === 0) return result;`, insert:

```ts
  // Only nodes WITHOUT an explicit position participate in auto-layout. Pinned
  // nodes are placed by the consumer and must not perturb the others' ranking
  // or centering; edges touching a pinned node fall through the unknown-node
  // guard below (the pinned id is absent from `ids`).
  const autoNodes = nodes.filter((node) => node.position === undefined);
  if (autoNodes.length === 0) return result;
```

(b) Change the `ids` line from `new Set(nodes.map(...))` to:

```ts
  const ids = new Set(autoNodes.map((node) => node.id));
```

(c) The init loop `for (const node of nodes) {` that sets `out`/`incoming`/`indegree` → change to `for (const node of autoNodes) {`.

(d) The sources line and fallback:

```ts
  const sources = autoNodes.filter((node) => indegree.get(node.id) === 0);
  for (const source of sources.length > 0 ? sources : [autoNodes[0]]) visit(source.id, 0);
```

(e) The unranked-cycle seed line → `for (const node of autoNodes) if (!rank.has(node.id)) visit(node.id, 0);`

(f) The rank-bucketing loop `for (const node of nodes) {` (the one doing `(ranks[r] ??= []).push(node)`) → `for (const node of autoNodes) {`.

Leave the edge loop, ranking, barycenter, and placement code unchanged — they already key off `ids`/`ranks`, now auto-only.

- [ ] **Step 4: Update the `computeLayout` JSDoc**

Append to the JSDoc block above `computeLayout` (after the "Self-loops and edges to unknown nodes are ignored." sentence):

```
 * Only nodes without an explicit `position` are laid out; a node WITH a
 * `position` is pinned by the consumer and is ignored here — it neither
 * occupies layout space nor anchors edges, so it never shifts the others.
```

- [ ] **Step 5: Run tests to verify pass**

Run: `npm test -w @eocrm/design-system -- layout --run`
Expected: PASS — the 4 new tests plus all pre-existing `computeLayout` tests (all-auto behavior unchanged).

- [ ] **Step 6: Commit**

```bash
git add packages/design-system/src/components/FlowCanvas/layout.ts packages/design-system/src/components/FlowCanvas/layout.test.ts
git commit -m "fix(FlowCanvas): computeLayout ignores pinned nodes"
```

---

## Task 2: `arrangeNodes` export + tests

**Files:**
- Modify: `packages/design-system/src/components/FlowCanvas/layout.ts` (add `arrangeNodes`)
- Modify: `packages/design-system/src/components/FlowCanvas/index.ts` (export)
- Modify: `packages/design-system/src/index.ts` (export)
- Test: `packages/design-system/src/components/FlowCanvas/layout.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `layout.test.ts`, importing `arrangeNodes` — change the top import line from `import { computeLayout, ESTIMATED_NODE_SIZE } from './layout';` to:

```ts
import { arrangeNodes, computeLayout, ESTIMATED_NODE_SIZE } from './layout';
```

Then add a new describe block at the end of the file (before the final `});` closes nothing — it's a top-level describe):

```ts
describe('arrangeNodes', () => {
  it('gives every node a position and lays the graph out left → right', () => {
    const result = arrangeNodes([n('a'), n('b'), n('c')], [e('a', 'b'), e('b', 'c')]);
    expect(result.every((node) => node.position !== undefined)).toBe(true);
    const x = (id: string) => result.find((node) => node.id === id)!.position!.x;
    expect(x('a')).toBeLessThan(x('b'));
    expect(x('b')).toBeLessThan(x('c'));
  });

  it('overwrites existing (pinned) positions — it re-flows ALL nodes', () => {
    const result = arrangeNodes(
      [{ id: 'a', label: 'A', position: { x: 999, y: 999 } }, n('b')],
      [e('a', 'b')],
    );
    expect(result.find((node) => node.id === 'a')!.position).not.toEqual({ x: 999, y: 999 });
    expect(result.find((node) => node.id === 'b')!.position).toBeDefined();
  });

  it('preserves all other node fields', () => {
    const result = arrangeNodes([{ id: 'a', label: 'A', color: '#123456', adornment: 'x' }], []);
    const a = result.find((node) => node.id === 'a')!;
    expect(a.label).toBe('A');
    expect(a.color).toBe('#123456');
    expect(a.adornment).toBe('x');
  });

  it('is deterministic', () => {
    const nodes = [n('a'), n('b'), n('c')];
    const edges = [e('a', 'b')];
    expect(arrangeNodes(nodes, edges)).toEqual(arrangeNodes(nodes, edges));
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm test -w @eocrm/design-system -- layout --run`
Expected: FAIL — `arrangeNodes` is not exported (import error / not a function).

- [ ] **Step 3: Implement `arrangeNodes`**

In `layout.ts`, after the `computeLayout` function, add:

```ts
/**
 * Lay out every node into the layered left→right auto-layout and return the
 * nodes with `position` filled in — for a consumer-driven "re-arrange / tidy"
 * action. Unlike {@link computeLayout} (which only places nodes without an
 * explicit `position`), this re-flows ALL nodes, overwriting any existing
 * `position`. Pure and deterministic; every other node field is preserved.
 *
 * Uses estimated node sizes, so vertical centering can differ by a few pixels
 * from the live in-canvas layout (a standalone function cannot measure the
 * rendered DOM). Fine for a tidy action.
 *
 * @example
 * // A "Re-arrange" button in your own UI (e.g. the FlowCanvas `controls` slot):
 * <Button onClick={() => setNodes((prev) => arrangeNodes(prev, edges))}>Re-arrange</Button>
 */
export function arrangeNodes(
  nodes: FlowCanvasNode[],
  edges: FlowCanvasEdge[],
): FlowCanvasNode[] {
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

- [ ] **Step 4: Export from the FlowCanvas barrel**

In `packages/design-system/src/components/FlowCanvas/index.ts`, add after the `FlowCanvas` export line:

```ts
export { FlowCanvas } from './FlowCanvas';
export { arrangeNodes } from './layout';
export type { FlowCanvasProps } from './FlowCanvas';
export type { FlowCanvasPoint, FlowCanvasNode, FlowCanvasEdge, FlowCanvasSelection } from './types';
```

- [ ] **Step 5: Export from the package root**

In `packages/design-system/src/index.ts`, the FlowCanvas export currently reads `export { FlowCanvas } from './components/FlowCanvas';`. Change it to:

```ts
export { FlowCanvas, arrangeNodes } from './components/FlowCanvas';
```

(Leave the adjacent `export type { FlowCanvasProps, FlowCanvasNode, ... }` block unchanged.)

- [ ] **Step 6: Run tests + typecheck**

Run: `npm test -w @eocrm/design-system -- layout --run && npm run typecheck -w @eocrm/design-system`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/design-system/src/components/FlowCanvas/layout.ts packages/design-system/src/components/FlowCanvas/layout.test.ts packages/design-system/src/components/FlowCanvas/index.ts packages/design-system/src/index.ts
git commit -m "feat(FlowCanvas): arrangeNodes API for consumer-driven re-arrange"
```

---

## Task 3: FlowCanvas integration test — added pinned node moves nothing

**Files:**
- Test: `packages/design-system/src/components/FlowCanvas/FlowCanvas.test.tsx`

- [ ] **Step 1: Write the failing/guard test**

`FlowCanvas.test.tsx` already imports `FlowCanvas` and `import type { FlowCanvasEdge, FlowCanvasNode } from './types';`. Append this describe block:

```tsx
describe('FlowCanvas auto-layout with pinned nodes', () => {
  it('adding a pinned node does not move the auto-laid-out nodes', () => {
    const auto: FlowCanvasNode[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ];
    const edges: FlowCanvasEdge[] = [{ id: 'ab', from: 'a', to: 'b' }];
    const { rerender } = render(<FlowCanvas nodes={auto} edges={edges} />);
    const posOf = (label: string) => {
      const el = screen.getByLabelText(label);
      return { left: el.style.left, top: el.style.top };
    };
    const before = { a: posOf('A'), b: posOf('B') };
    rerender(
      <FlowCanvas
        nodes={[...auto, { id: 'p', label: 'Pinned', position: { x: 500, y: 500 } }]}
        edges={edges}
      />,
    );
    expect(posOf('A')).toEqual(before.a);
    expect(posOf('B')).toEqual(before.b);
  });
});
```

- [ ] **Step 2: Run**

Run: `npm test -w @eocrm/design-system -- FlowCanvas --run`
Expected: PASS (Task 1 already fixed the underlying behavior; jsdom uses `ESTIMATED_NODE_SIZE`, so positions are deterministic). If it FAILS, Task 1's filter is incomplete — revisit before proceeding.

- [ ] **Step 3: Commit**

```bash
git add packages/design-system/src/components/FlowCanvas/FlowCanvas.test.tsx
git commit -m "test(FlowCanvas): adding a pinned node leaves auto nodes in place"
```

---

## Task 4: Playground demo — Reset → Re-arrange

**Files:**
- Modify: `packages/playground/src/pages/components/FlowCanvasDemo.tsx`

- [ ] **Step 1: Import `arrangeNodes`**

Change the `@eocrm/design-system` import to add `arrangeNodes`:

```tsx
import {
  Badge,
  Button,
  Cluster,
  FlowCanvas,
  Stack,
  Text,
  Title,
  arrangeNodes,
  type FlowCanvasEdge,
  type FlowCanvasNode,
} from '@eocrm/design-system';
```

- [ ] **Step 2: Replace `handleReset` with `handleArrange`**

Change the `handleReset` callback to:

```tsx
  const handleArrange = useCallback(() => {
    setNodes((prev) => arrangeNodes(prev, edges));
    setLastEvent('controls: re-arrange');
  }, [edges]);
```

- [ ] **Step 3: Swap the live button**

In the interactive `<FlowCanvas>` `controls` prop, change the second button from Reset to Re-arrange:

```tsx
              controls={
                <Cluster gap="xs">
                  <Button size="sm" variant="primary" onClick={handleAddNode}>
                    Add node
                  </Button>
                  <Button size="sm" variant="secondary" onClick={handleArrange}>
                    Re-arrange
                  </Button>
                </Cluster>
              }
```

- [ ] **Step 4: Update the displayed code snippet**

In the `code={\`...\`}` template string, change the snippet import line to include `Cluster` and `arrangeNodes`:

```
import { Badge, Button, Cluster, FlowCanvas, arrangeNodes, type FlowCanvasEdge, type FlowCanvasNode } from '@eocrm/design-system';
```

and change the snippet's `controls={...}` (the single Add-node button) to show both actions:

```
        controls={
          <Cluster gap="xs">
            <Button size="sm" onClick={() => setNodes((prev) => [...prev, { id: crypto.randomUUID(), label: 'New state', position: { x: 40, y: 40 } }])}>Add node</Button>
            <Button size="sm" variant="secondary" onClick={() => setNodes((prev) => arrangeNodes(prev, edges))}>Re-arrange</Button>
          </Cluster>
        }
```

(No literal `${` — it's inside a template literal. `crypto.randomUUID()`, arrow functions, and `arrangeNodes(prev, edges)` contain none.)

- [ ] **Step 5: Note it in the example description**

Append to the "Workflow builder" `Example`'s `description` string: ` The top-left controls show a custom Add-node button and a Re-arrange button wired to arrangeNodes().`

- [ ] **Step 6: Typecheck / build the playground**

Run: `npm run build -w playground`
Expected: PASS (the playground workspace name is `playground`, not `@eocrm/playground`).

- [ ] **Step 7: Commit**

```bash
git add packages/playground/src/pages/components/FlowCanvasDemo.tsx
git commit -m "docs(FlowCanvas): demo Re-arrange via arrangeNodes"
```

---

## Task 5: Docs — node `position` JSDoc + AGENTS.md

**Files:**
- Modify: `packages/design-system/src/components/FlowCanvas/types.ts` (the `position` field on `FlowCanvasNode`)
- Modify: `packages/design-system/AGENTS.md` (the `### <FlowCanvas>` section)

- [ ] **Step 1: Update the `position` prop JSDoc**

In `types.ts`, find the `position?` field of `FlowCanvasNode` and append to its JSDoc a sentence:

```
   * A node with an explicit `position` is *pinned*: it stays where you place it
   * and does not participate in — or perturb — the auto-layout of the other
   * nodes. Use `arrangeNodes(nodes, edges)` to re-flow the whole graph.
```

(Match the file's existing comment style/indentation.)

- [ ] **Step 2: Update AGENTS.md**

In `packages/design-system/AGENTS.md`, find the `### \`<FlowCanvas>\`` section. Add a sentence to its prose:

> Nodes with an explicit `position` are pinned and don't affect the auto-layout of the others (nodes without a `position` are auto-laid-out). `arrangeNodes(nodes, edges)` (exported) re-flows the whole graph and returns the nodes with fresh positions — wire it to your own "Re-arrange" button.

- [ ] **Step 3: Typecheck (JSDoc shouldn't break it, confirm)**

Run: `npm run typecheck -w @eocrm/design-system`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/FlowCanvas/types.ts packages/design-system/AGENTS.md
git commit -m "docs(FlowCanvas): document pinned nodes + arrangeNodes"
```

---

## Task 6: Gates, review, browser-verify, PR

- [ ] **Step 1: Full gates**

```bash
npm test -w @eocrm/design-system
npm run typecheck -w @eocrm/design-system
npm run lint:css
npm run build -w playground
npm pack --dry-run -w @eocrm/design-system
npm run format:check
```
All must pass; `npm pack --dry-run` shows no test/internal files. If `format:check` flags files, run `npm run format` and amend/commit.

- [ ] **Step 2: Browser-verify** (playground on http://localhost:8080)

Open `/components/flow-canvas`. Confirm: clicking "Add node" no longer nudges the existing nodes; clicking "Re-arrange" tidies all nodes (including any you dragged/added) into the layered layout. Capture a before/after if useful.

- [ ] **Step 3: Fresh-context review** (CLAUDE.md Rule 8)

Spawn a `general-purpose` reviewer scoped to `git diff main...HEAD` for `packages/design-system` + the demo, briefed on the 10 categories. Fix Critical/Important; document skips; re-run gates; re-review until `clean enough to stop`.

- [ ] **Step 4: Push + PR**

```bash
git push -u origin feat/flowcanvas-arrange-nodes
gh pr create --title "fix(FlowCanvas): pinned nodes ignore auto-layout + arrangeNodes API" --body "$(cat <<'EOF'
- `computeLayout` now lays out only nodes without an explicit `position`; pinned nodes no longer perturb the auto-laid-out ones (fixes the reflow observed when adding a positioned node).
- New pure export `arrangeNodes(nodes, edges): FlowCanvasNode[]` — re-flows the whole graph and returns nodes with fresh positions, for a consumer-driven "Re-arrange" button (no built-in UI). Demo's controls now show it.

Spec: docs/superpowers/specs/2026-07-04-flowcanvas-arrange-nodes-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5:** Wait for `Quality / check` to pass. Merging is a HUMAN-authorized step (auto-publish on merge) — confirm with the user before merging.

---

## Self-review notes

- **Spec coverage:** computeLayout filter (T1) · arrangeNodes + exports (T2) · integration test (T3) · demo (T4) · position JSDoc + AGENTS.md (T5) · computeLayout JSDoc (T1 Step 4) · arrangeNodes JSDoc (T2 Step 3) · gates/review/PR (T6). All spec sections mapped.
- **No new props / no manifest change** — `arrangeNodes` is a function export, so `props.manifest.json` and the CLUSTERS manifest are untouched.
- **Type consistency:** `arrangeNodes(nodes: FlowCanvasNode[], edges: FlowCanvasEdge[]): FlowCanvasNode[]`, `autoNodes`, `node.position === undefined` used identically across tasks.
- **Merge is gated on human approval** (T6 Step 5) — the auto-publish makes it outward-facing.
