# FlowCanvas editing features — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add drag-and-keyboard edge rewiring (`onEdgeReconnect`), an `allowConnections` gate, `confineNodesToView` drag clamping, and `renderNodeActions`/`renderEdgeActions` selection toolbars to `FlowCanvas` — one PR, built feature by feature.

**Architecture:** Extend the existing `connect` state machine to a third mode (rewire) keyed by an `edgeId`; expose edge endpoint points from `EdgeGeometry`; add gating/clamping props threaded into the existing pointer/keyboard handlers; render selection toolbars as screen-positioned overlay siblings of the transformed stage. Events-only — the canvas emits intents; no data mutation; no breaking changes.

**Tech Stack:** React + TypeScript, SVG, CSS Modules (SCSS), Vitest + `@testing-library/react` (the file uses `fireEvent`, not userEvent), the repo i18n (`useTranslation`).

**Reference spec:** `docs/superpowers/specs/2026-07-05-flowcanvas-editing-features-design.md`
**Working branch:** `feat/flowcanvas-editing-features` (already created).

## Conventions

- Tests: `npm test -w @eocrm/design-system -- FlowCanvas` and `... -- edgePath` (Vitest globals — do NOT import describe/it/expect/vi). Typecheck: `npm run typecheck -w @eocrm/design-system`. SCSS lint (repo ROOT): `npm run lint:css`. Format before push: `npm run format`.
- The FlowCanvas test file uses `import { act, fireEvent, render, screen } from '@testing-library/react';`. Match that. Node/edge/handle pointer interactions are simulated with `fireEvent.pointerDown/Move/Up` on the relevant element (see existing rewire/connect tests for the pattern).
- Commit per task with the message shown. Do NOT push until Task 10. Read the current function at each anchor before editing (line numbers drift).

## File map

- `edgePath.ts` / `types.ts` — extend `EdgeGeometry` (Task 1).
- `FlowEdge.tsx` — endpoint handle elements (Task 2).
- `FlowCanvas.tsx` — the bulk: `onEdgeReconnect` prop, connect-state rewire fields, pointer + keyboard rewire, `allowConnections`/`confineNodesToView`/`renderNodeActions`/`renderEdgeActions` props and wiring, selection overlay (Tasks 2–7).
- `FlowNode.tsx` — gate `.handle` on `allowConnections` (Task 5).
- `FlowCanvas.module.scss` / `FlowCanvas.tokens.scss` — endpoint-handle + selection-overlay styles/tokens (Tasks 2, 7).
- i18n `messages.ts`/`en.ts`/`ru.ts` — rewire strings (Task 4).
- `FlowCanvasDemo.tsx` — demo (Task 8). `AGENTS.md` + JSDoc (Task 9).

---

## Task 1: Expose edge endpoint points from `EdgeGeometry`

**Files:**

- Modify: `packages/design-system/src/components/FlowCanvas/edgePath.ts`
- Modify: `packages/design-system/src/components/FlowCanvas/types.ts` (the `EdgeGeometry` interface)
- Test: `packages/design-system/src/components/FlowCanvas/edgePath.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `edgePath.test.ts`:

```ts
describe('edgeGeometry endpoints', () => {
  it('returns source/target points on the facing sides of the two rects', () => {
    const source = { x: 0, y: 0, width: 100, height: 40 };
    const target = { x: 300, y: 0, width: 100, height: 40 };
    const g = edgeGeometry(source, target);
    // horizontal layout: source anchor on source's right edge, target on target's left edge
    expect(g.source).toEqual({ x: 100, y: 20 });
    expect(g.target).toEqual({ x: 300, y: 20 });
  });

  it('selfLoopGeometry exposes its start/end points', () => {
    const g = selfLoopGeometry({ x: 0, y: 0, width: 100, height: 40 });
    expect(g.source).toEqual({ x: 75, y: 0 });
    expect(g.target).toEqual({ x: 100, y: 10 });
  });
});
```

(The `edgePath.test.ts` file already imports `edgeGeometry`; add `selfLoopGeometry` to that import if missing.)

- [ ] **Step 2: Run to verify fail**

Run: `npm test -w @eocrm/design-system -- edgePath --run`
Expected: FAIL — `g.source`/`g.target` are `undefined`.

- [ ] **Step 3: Add `source`/`target` to `EdgeGeometry` and `cubic`**

In `types.ts`, `EdgeGeometry` gains two fields:

```ts
export interface EdgeGeometry {
  /** `d` attribute for the SVG `<path>`. */
  path: string;
  /** True cubic midpoint (t = 0.5) — where the label chip is anchored. */
  midpoint: Point;
  /** Source anchor point (on the source node's facing side). */
  source: Point;
  /** Target anchor point (on the target node's facing side). */
  target: Point;
}
```

> NOTE: `edgePath.ts` declares its OWN `EdgeGeometry` (`edgePath.ts:16-21`) — check which one is canonical. If `edgePath.ts` re-declares it, update THAT interface (and keep `types.ts` in sync if it re-exports). Grep `interface EdgeGeometry` first; edit the one `cubic` returns.

In `edgePath.ts`, extend `cubic` to return the endpoints (it already receives `p0`/`p3`):

```ts
function cubic(p0: Point, c1: Point, c2: Point, p3: Point): EdgeGeometry {
  return {
    path: `M ${p0.x} ${p0.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p3.x} ${p3.y}`,
    midpoint: {
      x: (p0.x + 3 * c1.x + 3 * c2.x + p3.x) / 8,
      y: (p0.y + 3 * c1.y + 3 * c2.y + p3.y) / 8,
    },
    source: p0,
    target: p3,
  };
}
```

`edgeGeometry` and `selfLoopGeometry` need no other change — they call `cubic` with the anchor points.

- [ ] **Step 4: Run to verify pass**

Run: `npm test -w @eocrm/design-system -- edgePath --run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/FlowCanvas/edgePath.ts packages/design-system/src/components/FlowCanvas/types.ts packages/design-system/src/components/FlowCanvas/edgePath.test.ts
git commit -m "feat(FlowCanvas): EdgeGeometry exposes source/target endpoint points"
```

---

## Task 2: Endpoint handles on a selected editable edge

**Files:**

- Modify: `FlowEdge.tsx` (add endpoint handle elements + props)
- Modify: `FlowCanvas.tsx` (add `onEdgeReconnect` prop + `onEndpointPointerDown` stub + `isRewireValid`; pass new props into `<FlowEdge>`)
- Modify: `FlowCanvas.module.scss` + `FlowCanvas.tokens.scss` (endpoint styles)
- Test: `FlowCanvas.test.tsx`

- [ ] **Step 1: Write the failing test**

Append to `FlowCanvas.test.tsx`:

```tsx
describe('FlowCanvas edge endpoint handles', () => {
  it('shows two endpoint handles on the selected edge and none otherwise', () => {
    const { container, rerender } = render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    expect(container.querySelectorAll('[data-flow-edge-endpoint]')).toHaveLength(0);
    rerender(<FlowCanvas nodes={NODES} edges={EDGES} selection={{ type: 'edge', id: 't1' }} />);
    const endpoints = container.querySelectorAll('[data-flow-edge-endpoint]');
    expect(endpoints).toHaveLength(2);
    expect(container.querySelector('[data-flow-edge-endpoint="source"]')).toBeInTheDocument();
    expect(container.querySelector('[data-flow-edge-endpoint="target"]')).toBeInTheDocument();
  });

  it('does not show endpoint handles on a selected edge when readOnly', () => {
    const { container } = render(
      <FlowCanvas nodes={NODES} edges={EDGES} readOnly selection={{ type: 'edge', id: 't1' }} />,
    );
    expect(container.querySelectorAll('[data-flow-edge-endpoint]')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -w @eocrm/design-system -- FlowCanvas --run`
Expected: FAIL — no `[data-flow-edge-endpoint]` elements.

- [ ] **Step 3: Add the `onEdgeReconnect` prop + `isRewireValid` to `FlowCanvas.tsx`**

In `FlowCanvasProps` (near the other edge callbacks ~`FlowCanvas.tsx:44-49`), add:

```ts
/**
 * Called when the user drags an existing edge's endpoint onto a different
 * node, or confirms a keyboard rewire (`R` / `Shift+R`). `id` is the edge;
 * `from`/`to` are its NEW endpoints. The canvas never mutates the edge — apply
 * this to your state. Not fired on revert (empty-canvas drop, invalid target,
 * or no change). Disabled by `readOnly` and `allowConnections={false}`.
 */
onEdgeReconnect?: (id: string, from: string, to: string) => void;
```

Destructure `onEdgeReconnect` in the component signature (alongside `onEdgeCreate`).

After `defaultIsValid`/`isValid` (~`FlowCanvas.tsx:386-390`), add rewire validation (excludes the edge being rewired so it isn't flagged as its own duplicate):

```ts
const isRewireValid = useCallback(
  (edgeId: string, from: string, to: string): boolean =>
    from !== to &&
    !edges.some((e) => e.id !== edgeId && e.from === from && e.to === to) &&
    (isValidConnection ? isValidConnection(from, to) : true),
  [edges, isValidConnection],
);
```

- [ ] **Step 4: Add an `onEndpointPointerDown` handler (stub for now — full logic in Task 3)**

Add near `handleHandlePointerDown` (~`FlowCanvas.tsx:1241`):

```ts
const handleEndpointPointerDown = useCallback(
  (
    edgeId: string,
    end: 'source' | 'target',
    event: ReactPointerEvent<HTMLElement | SVGElement>,
  ) => {
    if (event.button !== 0 || readOnly) return;
    event.stopPropagation();
    const edge = edges.find((e) => e.id === edgeId);
    if (!edge) return;
    const fixed = end === 'target' ? edge.from : edge.to;
    setConnect({
      from: fixed,
      mode: 'pointer',
      pointerId: event.pointerId,
      target: null,
      cursor: null,
      edgeId,
      end,
      fixed,
    });
    try {
      rootRef.current?.setPointerCapture(event.pointerId);
    } catch {
      /* jsdom */
    }
  },
  [edges, readOnly],
);
```

This requires the `connect` state to accept the new fields — do that now: change the `connect` `useState` type (~`FlowCanvas.tsx:372-379`) to add:

```ts
const [connect, setConnect] = useState<{
  from: string;
  mode: 'pointer' | 'keyboard';
  pointerId: number | null;
  target: string | null;
  cursor: FlowCanvasPoint | null;
  edgeId?: string;
  end?: 'source' | 'target';
  fixed?: string;
} | null>(null);
```

- [ ] **Step 5: Add endpoint handles to `FlowEdge.tsx`**

`FlowEdge` currently receives `edge`, `geometry`, `active`, `markerId`, `markerActiveId`, `ariaLabel`, `roleDescription`, `registerEl`, `onEdgePointerDown`, `onEdgeDoubleClick`. Add two props and render endpoint circles when `active && editable`:

Add to `FlowEdgeProps`:

```ts
editable: boolean;
onEndpointPointerDown: (
  edgeId: string,
  end: 'source' | 'target',
  event: ReactPointerEvent<SVGCircleElement>,
) => void;
```

Inside the `<g>`, after the two existing `<path>`s, add:

```tsx
{
  active && editable
    ? (['source', 'target'] as const).map((end) => (
        <circle
          key={end}
          className={styles.endpoint}
          data-flow-edge-endpoint={end}
          cx={geometry[end].x}
          cy={geometry[end].y}
          r={/* visible radius; hit area via a wider transparent sibling below */ 4}
          onPointerDown={(event) => onEndpointPointerDown(edge.id, end, event)}
        />
      ))
    : null;
}
{
  active && editable
    ? (['source', 'target'] as const).map((end) => (
        <circle
          key={`hit-${end}`}
          className={styles.endpointHit}
          data-flow-edge-endpoint-hit={end}
          cx={geometry[end].x}
          cy={geometry[end].y}
          r={12}
          onPointerDown={(event) => onEndpointPointerDown(edge.id, end, event)}
        />
      ))
    : null;
}
```

(Import `ReactPointerEvent` type in FlowEdge if not present.)

- [ ] **Step 6: Pass the new props from `FlowCanvas.tsx` into `<FlowEdge>`**

In the edges `.map(...)` render (`resolvedEdges.map` around the FlowEdge usage), add:

```tsx
editable={!readOnly}
onEndpointPointerDown={handleEndpointPointerDown}
```

(Task 5 will change `editable` to `!readOnly && allowConnections`.)

- [ ] **Step 7: Add the SCSS + tokens**

`FlowCanvas.module.scss`:

```scss
.endpoint {
  fill: var(--flow-endpoint-bg);
  stroke: var(--flow-endpoint-ring);
  stroke-width: var(--border-width-emphasis);
  vector-effect: non-scaling-stroke; // constant thickness regardless of zoom
  pointer-events: none; // the wider .endpointHit takes the pointer
}

.endpointHit {
  fill: transparent;
  cursor: grab;
  // 24px screen-constant target regardless of stage zoom (WCAG 2.5.8) — the
  // visual dot is .endpoint above.
  vector-effect: non-scaling-stroke;
}
```

`FlowCanvas.tokens.scss` (add near the other `--flow-*`):

```scss
--flow-endpoint-bg: var(--color-accent);
--flow-endpoint-ring: var(--color-bg);
```

> NOTE: SVG `r` scales with the stage transform, so the 24px hit target isn't truly screen-constant via `r` alone. If browser verification (Task 10) shows the hit area too small at low zoom, switch `.endpointHit` to a screen-space overlay (like the selection toolbar in Task 7) instead of an SVG circle. Keep the visual `.endpoint` in the SVG either way.

- [ ] **Step 8: Run tests + commit**

Run: `npm test -w @eocrm/design-system -- FlowCanvas --run && npm run lint:css`
Expected: PASS (the two new endpoint tests + existing suite).

```bash
git add packages/design-system/src/components/FlowCanvas/
git commit -m "feat(FlowCanvas): endpoint handles on the selected editable edge + onEdgeReconnect prop"
```

---

## Task 3: Pointer rewire — move + commit

**Files:**

- Modify: `FlowCanvas.tsx` (the connect branches of `handleRootPointerMove` / `handleRootPointerUp`, and the ghost render)
- Test: `FlowCanvas.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
describe('FlowCanvas pointer rewire', () => {
  // NODES has 'open'/'done'; add a third node so we can rewire onto it.
  const N3: FlowCanvasNode[] = [
    ...NODES,
    { id: 'later', label: 'Later', position: { x: 300, y: 200 } },
  ];

  const rewire = (
    container: HTMLElement,
    end: 'source' | 'target',
    overNodeLabel: string | null,
  ) => {
    const root = screen.getByRole('application');
    const hit = container.querySelector(`[data-flow-edge-endpoint-hit="${end}"]`)!;
    fireEvent.pointerDown(hit, { button: 0, pointerId: 1 });
    if (overNodeLabel) {
      const node =
        screen.getByLabelText(overNodeLabel).closest('[data-flow-node]') ??
        screen.getByLabelText(overNodeLabel);
      const r = node.getBoundingClientRect();
      fireEvent.pointerMove(root, { pointerId: 1, clientX: r.left + 5, clientY: r.top + 5 });
    }
    fireEvent.pointerUp(root, { pointerId: 1 });
  };

  it('rewires the target endpoint onto another node', () => {
    const onEdgeReconnect = vi.fn();
    const { container } = render(
      <FlowCanvas
        nodes={N3}
        edges={EDGES}
        onEdgeReconnect={onEdgeReconnect}
        selection={{ type: 'edge', id: 't1' }}
      />,
    );
    rewire(container, 'target', 'Later');
    expect(onEdgeReconnect).toHaveBeenCalledWith('t1', 'open', 'later');
  });

  it('reverts when dropped on empty canvas', () => {
    const onEdgeReconnect = vi.fn();
    const { container } = render(
      <FlowCanvas
        nodes={N3}
        edges={EDGES}
        onEdgeReconnect={onEdgeReconnect}
        selection={{ type: 'edge', id: 't1' }}
      />,
    );
    rewire(container, 'target', null); // no move over a node
    expect(onEdgeReconnect).not.toHaveBeenCalled();
  });
});
```

> Note: jsdom `getBoundingClientRect` returns zeros, so the pointer-move hover uses `nodeAtPoint` over canvas coordinates that also resolve to 0 — the existing connect tests solve this by relying on the node rects from `positionOf`, not DOM rects. Check how the existing pointer-CONNECT tests simulate hovering a target (search `handleRootPointerMove`/`nodeAtPoint` tests) and mirror that exact technique; adjust the `rewire` helper to match (the assertion — `onEdgeReconnect` called with the right ids / not called — is the fixed point).

- [ ] **Step 2: Run to verify fail**

Run: `npm test -w @eocrm/design-system -- FlowCanvas --run`
Expected: FAIL — `onEdgeReconnect` never called (no rewire branch yet).

- [ ] **Step 3: Branch the pointer-move connect handler for rewire**

In `handleRootPointerMove`, the pointer-connect branch (~`FlowCanvas.tsx:610-616`) currently computes `target` via `isValid(connect.from, over)`. Change the validity to use `isRewireValid` when `connect.edgeId` is set:

```ts
if (connect?.mode === 'pointer' && event.pointerId === connect.pointerId) {
  const point = toCanvasPoint(event.clientX, event.clientY);
  const over = nodeAtPoint(point);
  const valid = (candidate: string) =>
    connect.edgeId
      ? candidate !== connect.fixed &&
        isRewireValid(
          connect.edgeId,
          connect.end === 'target' ? connect.fixed! : candidate,
          connect.end === 'target' ? candidate : connect.fixed!,
        )
      : over !== connect.from && isValid(connect.from, candidate);
  const target = over && valid(over) ? over : null;
  setConnect({ ...connect, target, cursor: point });
  return;
}
```

- [ ] **Step 4: Branch the pointer-up connect handler for rewire**

In `handleRootPointerUp`, the pointer-connect completion (~`FlowCanvas.tsx:659-679`): when `connect.edgeId` is set, commit via `onEdgeReconnect` (computing new from/to by which end moved), else the existing `onEdgeCreate`:

```ts
if (connect?.mode === 'pointer' && event.pointerId === connect.pointerId) {
  if (connect.edgeId) {
    if (connect.target && !event.defaultPrevented) {
      const newFrom = connect.end === 'target' ? connect.fixed! : connect.target;
      const newTo = connect.end === 'target' ? connect.target : connect.fixed!;
      if (isRewireValid(connect.edgeId, newFrom, newTo)) {
        onEdgeReconnect?.(connect.edgeId, newFrom, newTo);
        announce(
          t('flowCanvas.rewireDone', {
            from: nodeById.get(newFrom)?.label ?? newFrom,
            to: nodeById.get(newTo)?.label ?? newTo,
          }),
        );
      }
    }
    setConnect(null);
    return;
  }
  // ...existing create-edge branch unchanged...
}
```

- [ ] **Step 5: Invert the ghost for a source rewire**

In the ghost render (~`FlowCanvas.tsx:1417-1432`), the ghost currently always draws `connect.from → cursor/target`. For a `source` rewire the moving end IS the source, so the ghost must run `cursor/target → fixed` (arrowhead stays on the fixed target). Update:

```tsx
{
  connect
    ? (() => {
        const anchorRect = rects.get(connect.fixed ?? connect.from);
        if (!anchorRect) return null;
        const otherId = connect.target ?? null;
        const otherRect = otherId ? rects.get(otherId) : null;
        const movingEnd: Rect = otherRect ?? {
          x: (connect.cursor?.x ?? anchorRect.x + anchorRect.width + 40) - 1,
          y: (connect.cursor?.y ?? anchorRect.y) - 1,
          width: 2,
          height: 2,
        };
        // For a `source` rewire the moving end is the source, so draw moving→fixed
        // to keep the arrowhead on the fixed target; otherwise fixed→moving.
        const [a, b] = connect.end === 'source' ? [movingEnd, anchorRect] : [anchorRect, movingEnd];
        return <path className={styles.ghostEdge} d={edgeGeometry(a, b).path} />;
      })()
    : null;
}
```

(`connect.fixed` is only set for rewire; for create it's `undefined`, so `connect.fixed ?? connect.from` = `connect.from` — create ghost unchanged.)

- [ ] **Step 6: Run tests + commit**

Run: `npm test -w @eocrm/design-system -- FlowCanvas --run && npm run typecheck -w @eocrm/design-system`
Expected: PASS.

```bash
git add packages/design-system/src/components/FlowCanvas/
git commit -m "feat(FlowCanvas): pointer drag-to-rewire edge endpoints"
```

---

## Task 4: Keyboard rewire (`R` / `Shift+R`) + i18n

**Files:**

- Modify: `FlowCanvas.tsx` (`handleRootKeyDown`: R/Shift+R start; the existing keyboard-connect Enter/Escape/arrow branches to also handle rewire)
- Modify: i18n `messages.ts` / `en.ts` / `ru.ts`
- Test: `FlowCanvas.test.tsx`

- [ ] **Step 1: Add i18n keys**

`messages.ts` `flowCanvas` block — add:

```ts
/** Live announcement when keyboard rewire mode starts. */
rewireStart: (params: { end: string }) => string;
/** Live announcement when an edge is rewired. */
rewireDone: (params: { from: string; to: string }) => string;
```

`en.ts`:

```ts
    rewireStart: ({ end }) => `Rewiring the ${end as string} of this connection. Arrow keys pick a node, Enter confirms, Escape cancels.`,
    rewireDone: ({ from, to }) => `Reconnected ${from as string} to ${to as string}`,
```

`ru.ts`:

```ts
    rewireStart: ({ end }) => `Переподключение ${end as string} связи. Стрелки — выбор узла, Enter — подтвердить, Escape — отмена.`,
    rewireDone: ({ from, to }) => `Переподключено: «${from as string}» → «${to as string}»`,
```

- [ ] **Step 2: Write the failing test**

```tsx
describe('FlowCanvas keyboard rewire', () => {
  const N3: FlowCanvasNode[] = [
    ...NODES,
    { id: 'later', label: 'Later', position: { x: 0, y: 200 } },
  ];
  it('R re-targets the edge to the node stepped to, Enter commits', () => {
    const onEdgeReconnect = vi.fn();
    render(
      <FlowCanvas
        nodes={N3}
        edges={EDGES}
        onEdgeReconnect={onEdgeReconnect}
        defaultSelection={{ type: 'edge', id: 't1' }}
      />,
    );
    const root = screen.getByRole('application');
    root.focus();
    fireEvent.keyDown(root, { key: 'r' }); // start rewiring target
    fireEvent.keyDown(root, { key: 'ArrowDown' }); // step to 'later' (below)
    fireEvent.keyDown(root, { key: 'Enter' }); // commit
    expect(onEdgeReconnect).toHaveBeenCalledWith('t1', 'open', 'later');
  });
});
```

> The arrow-step landing on `later` depends on `nearestInDirection` with these fixed positions; if the step doesn't reach `later`, adjust `later`'s position in the fixture so it is the nearest candidate in the pressed direction. The commit assertion is the fixed point.

- [ ] **Step 3: Add the `R` start branch to `handleRootKeyDown`**

The Escape/Enter/arrow handling for keyboard connect is at `FlowCanvas.tsx:906-978` and the `C` start at `984-998`. Add an `R` start that only acts when a **edge** is selected/focused. Place it near the `C` handler (both are plain letters gated on editing). Compute the focused/selected edge id:

```ts
if ((key === 'r' || key === 'R') && !ctrlKey && !metaKey) {
  if (readOnly) return;
  if (connect?.mode === 'pointer') return; // one gesture at a time
  const edgeId =
    targetEl.getAttribute('data-flow-edge') ?? (selection?.type === 'edge' ? selection.id : null);
  if (!edgeId) return;
  const edge = edges.find((e) => e.id === edgeId);
  if (!edge) return;
  event.preventDefault();
  const end: 'source' | 'target' = event.shiftKey ? 'source' : 'target';
  const fixed = end === 'target' ? edge.from : edge.to;
  setConnect({
    from: fixed,
    mode: 'keyboard',
    pointerId: null,
    target: null,
    cursor: null,
    edgeId,
    end,
    fixed,
  });
  announce(t('flowCanvas.rewireStart', { end }));
  return;
}
```

(Place this BEFORE the Shift+Arrow nudge branch so `Shift+R` isn't swallowed — `R` is not an arrow so order vs. the nudge branch is fine, but keep it with the other letter handlers.)

- [ ] **Step 4: Make the keyboard-connect Enter / arrow / Escape branches rewire-aware**

The existing keyboard-mode block (`connect?.mode === 'keyboard'`, ~`FlowCanvas.tsx:906`) handles arrows (candidate stepping), Enter (commit via `onEdgeCreate`), Escape (cancel). Two changes inside it:

- **Arrow candidate filter** (~`949`): when `connect.edgeId` is set, filter candidates with `isRewireValid(connect.edgeId, from, to)` (computing from/to by `connect.end`) and exclude `connect.fixed`, instead of `isValid(connect.from, id)`.
- **Enter commit** (~`921-945`): when `connect.edgeId` is set, commit via `onEdgeReconnect(connect.edgeId, newFrom, newTo)` (same new-from/to computation as Task 3 Step 4) + `announce(rewireDone)`, instead of `onEdgeCreate`. Escape path is unchanged (it just `setConnect(null)` + announces cancel — reuse `connectCancelled`).

Extract the "new from/to from connect" into a small local helper to avoid duplicating the Task 3 logic:

```ts
const rewireEndpoints = (c: NonNullable<typeof connect>): [string, string] =>
  c.end === 'source' ? [c.target ?? c.fixed!, c.fixed!] : [c.fixed!, c.target ?? c.fixed!];
```

Use it in both the pointer-up (Task 3) and keyboard-Enter commits.

- [ ] **Step 5: Instructions text**

In `en.ts`/`ru.ts` append to `flowCanvas.instructions` a sentence: press R (or Shift+R) to rewire a selected connection's target (or source). (Keep `instructionsReadOnly` unchanged — rewire is inert in readOnly.)

- [ ] **Step 6: Run tests + commit**

Run: `npm test -w @eocrm/design-system -- FlowCanvas --run && npm run typecheck -w @eocrm/design-system`
Expected: PASS.

```bash
git add packages/design-system/src/components/FlowCanvas/FlowCanvas.tsx packages/design-system/src/i18n/ packages/design-system/src/components/FlowCanvas/FlowCanvas.test.tsx
git commit -m "feat(FlowCanvas): keyboard rewire (R / Shift+R)"
```

---

## Task 5: `allowConnections={false}` gate

**Files:**

- Modify: `FlowCanvas.tsx` (prop + gate the connect/rewire entry points)
- Modify: `FlowNode.tsx` (gate `.handle`)
- Test: `FlowCanvas.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
describe('FlowCanvas allowConnections', () => {
  it('hides the node connect handle when allowConnections is false', () => {
    const { container, rerender } = render(<FlowCanvas nodes={NODES} edges={EDGES} />);
    expect(container.querySelector('[data-flow-handle]')).toBeInTheDocument();
    rerender(<FlowCanvas nodes={NODES} edges={EDGES} allowConnections={false} />);
    expect(container.querySelector('[data-flow-handle]')).not.toBeInTheDocument();
  });

  it('does not create an edge on C when allowConnections is false', () => {
    const onEdgeCreate = vi.fn();
    render(
      <FlowCanvas
        nodes={NODES}
        edges={EDGES}
        allowConnections={false}
        onEdgeCreate={onEdgeCreate}
        defaultSelection={{ type: 'node', id: 'open' }}
      />,
    );
    const root = screen.getByRole('application');
    root.focus();
    fireEvent.keyDown(root, { key: 'c' });
    fireEvent.keyDown(root, { key: 'ArrowRight' });
    fireEvent.keyDown(root, { key: 'Enter' });
    expect(onEdgeCreate).not.toHaveBeenCalled();
  });

  it('hides edge endpoint handles when allowConnections is false', () => {
    const { container } = render(
      <FlowCanvas
        nodes={NODES}
        edges={EDGES}
        allowConnections={false}
        selection={{ type: 'edge', id: 't1' }}
      />,
    );
    expect(container.querySelectorAll('[data-flow-edge-endpoint]')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -w @eocrm/design-system -- FlowCanvas --run`
Expected: FAIL — `allowConnections` not accepted / handle still present.

- [ ] **Step 3: Add the prop + a `canConnect` boolean**

In `FlowCanvasProps` (after `readOnly`), add:

```ts
/**
 * When false, disables creating and rewiring connections — the node connect
 * handle is hidden, pointer/keyboard connect (`C`, handle drag) and edge
 * rewiring (`R`, endpoint drag) are inert. Node drag/move/delete/selection
 * still work. `readOnly` overrides this (it disables everything). @default true
 */
allowConnections?: boolean;
```

Destructure `allowConnections = true`. Add a derived const near the top of the body:

```ts
const canConnect = !readOnly && allowConnections;
```

- [ ] **Step 4: Gate the entry points**

- `handleHandlePointerDown` — change the guard `if (event.button !== 0 || readOnly) return;` to `if (event.button !== 0 || !canConnect) return;`.
- `handleEndpointPointerDown` (Task 2) — same: guard on `!canConnect` instead of `readOnly`.
- The `C` start (`984`) — change its `if (readOnly) return;` to `if (!canConnect) return;`.
- The `R` start (Task 4) — change its `if (readOnly) return;` to `if (!canConnect) return;`.
- The `<FlowEdge editable=...>` prop (Task 2 Step 6) — change `editable={!readOnly}` to `editable={canConnect}`.

- [ ] **Step 5: Gate the node handle in `FlowNode.tsx`**

`FlowNode.tsx:58` renders `.handle` when `!readOnly`. Thread a `canConnect` prop from `FlowCanvas` (pass `canConnect` into `<FlowNode canConnect={canConnect} .../>`) and render the handle when `canConnect` instead of `!readOnly`. Add `canConnect: boolean` to `FlowNodeProps`.

- [ ] **Step 6: Run tests + commit**

Run: `npm test -w @eocrm/design-system -- FlowCanvas --run && npm run typecheck -w @eocrm/design-system`
Expected: PASS.

```bash
git add packages/design-system/src/components/FlowCanvas/
git commit -m "feat(FlowCanvas): allowConnections gate for create + rewire"
```

---

## Task 6: `confineNodesToView` drag clamp

**Files:**

- Modify: `FlowCanvas.tsx` (prop + visible-rect + clamp in drag move/commit + Shift+Arrow nudge)
- Test: `FlowCanvas.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
describe('FlowCanvas confineNodesToView', () => {
  it('clamps a node drag so its whole card stays within the visible area', () => {
    const onNodeMove = vi.fn();
    render(
      <FlowCanvas
        nodes={[{ id: 'a', label: 'A', position: { x: 10, y: 10 } }]}
        edges={[]}
        confineNodesToView
        onNodeMove={onNodeMove}
      />,
    );
    const root = screen.getByRole('application');
    const a = screen.getByLabelText('A');
    // Drag far to the left/up (negative) — should clamp to >= 0 (visible origin).
    fireEvent.pointerDown(a, { button: 0, pointerId: 1, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(root, { pointerId: 1, clientX: -500, clientY: -500 });
    fireEvent.pointerUp(root, { pointerId: 1, clientX: -500, clientY: -500 });
    expect(onNodeMove).toHaveBeenCalled();
    const [, pos] = onNodeMove.mock.calls[0];
    expect(pos.x).toBeGreaterThanOrEqual(0);
    expect(pos.y).toBeGreaterThanOrEqual(0);
  });
});
```

> In jsdom the root rect is 0×0 and viewport is identity, so the visible rect is `{x:0,y:0,w:0,h:0}`; clamping a negative drag to `>= 0` (the min edge) is still observable and correct. The assertion targets the min-edge clamp.

- [ ] **Step 2: Run to verify fail**

Run: `npm test -w @eocrm/design-system -- FlowCanvas --run`
Expected: FAIL — `confineNodesToView` not accepted / position still negative.

- [ ] **Step 3: Add the prop + clamp helper**

Add to `FlowCanvasProps` (after `confine`-adjacent props):

```ts
/**
 * When true, a dragged node is clamped so its whole card stays within the
 * currently-visible canvas area (accounting for pan/zoom). Applies to pointer
 * drag, the committed `onNodeMove`, and Shift+Arrow nudges. @default false
 */
confineNodesToView?: boolean;
```

Destructure `confineNodesToView = false`. Add:

```ts
const clampToView = useCallback(
  (id: string, position: FlowCanvasPoint): FlowCanvasPoint => {
    if (!confineNodesToView) return position;
    const root = rootRef.current;
    if (!root) return position;
    const { width: rw, height: rh } = root.getBoundingClientRect();
    const { tx, ty, z } = viewport;
    const visX = -tx / z;
    const visY = -ty / z;
    const visW = rw / z;
    const visH = rh / z;
    const size = sizes.get(id) ?? ESTIMATED_NODE_SIZE;
    const maxX = Math.max(visX, visX + visW - size.width);
    const maxY = Math.max(visY, visY + visH - size.height);
    return {
      x: Math.min(Math.max(position.x, visX), maxX),
      y: Math.min(Math.max(position.y, visY), maxY),
    };
  },
  [confineNodesToView, viewport, sizes],
);
```

(`ESTIMATED_NODE_SIZE` and `sizes` are already in scope.)

- [ ] **Step 4: Apply the clamp**

- In `handleRootPointerMove` drag branch (~`634-640`), wrap the new position: `drag.position = clampToView(drag.id, { x: ..., y: ... });` then `setLiveDrag({ id: drag.id, position: drag.position });`.
- In `handleRootPointerUp` commit (~`693-702`), clamp the committed `position` before `setDragOverrides`/`onNodeMove`: `const position = clampToView(drag.id, { x: ..., y: ... });`.
- In the Shift+Arrow nudge path (search the keydown handler for the nudge that calls `onNodeMove`), clamp the nudged position with `clampToView(nodeId, next)` before committing.

- [ ] **Step 5: Run tests + commit**

Run: `npm test -w @eocrm/design-system -- FlowCanvas --run && npm run typecheck -w @eocrm/design-system`
Expected: PASS.

```bash
git add packages/design-system/src/components/FlowCanvas/
git commit -m "feat(FlowCanvas): confineNodesToView drag clamp"
```

---

## Task 7: Selection floating controls (`renderNodeActions` / `renderEdgeActions`)

**Files:**

- Modify: `FlowCanvas.tsx` (props + a screen-positioned overlay)
- Modify: `FlowCanvas.module.scss` + tokens (overlay styles)
- Test: `FlowCanvas.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
describe('FlowCanvas selection actions', () => {
  it('renders node actions for a selected node, in a data-flow-controls overlay', () => {
    render(
      <FlowCanvas
        nodes={NODES}
        edges={EDGES}
        selection={{ type: 'node', id: 'open' }}
        renderNodeActions={(id) => <button data-testid="node-act">act {id}</button>}
      />,
    );
    const act = screen.getByTestId('node-act');
    expect(act).toHaveTextContent('act open');
    expect(act.closest('[data-flow-controls]')).not.toBeNull();
  });

  it('renders edge actions for a selected edge, not node actions', () => {
    render(
      <FlowCanvas
        nodes={NODES}
        edges={EDGES}
        selection={{ type: 'edge', id: 't1' }}
        renderNodeActions={() => <button data-testid="node-act">n</button>}
        renderEdgeActions={(id) => <button data-testid="edge-act">e {id}</button>}
      />,
    );
    expect(screen.queryByTestId('node-act')).not.toBeInTheDocument();
    expect(screen.getByTestId('edge-act')).toHaveTextContent('e t1');
  });

  it('renders no actions when there is no selection', () => {
    render(<FlowCanvas nodes={NODES} edges={EDGES} renderNodeActions={() => <button>n</button>} />);
    expect(screen.queryByRole('button', { name: 'n' })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -w @eocrm/design-system -- FlowCanvas --run`
Expected: FAIL — props not accepted / actions not rendered.

- [ ] **Step 3: Add the props**

In `FlowCanvasProps`:

```ts
/** Render a floating toolbar anchored to the top-right corner of the selected NODE. Return null for none. */
renderNodeActions?: (id: string) => ReactNode;
/** Render a floating toolbar anchored near the midpoint of the selected EDGE. Return null for none. */
renderEdgeActions?: (id: string) => ReactNode;
```

Destructure them. (Import `ReactNode` type if not already imported.)

- [ ] **Step 4: Compute the anchor + render the overlay**

Add a derived `selectionActions` block before `return`:

```ts
const selectionActions = (() => {
  if (!selection) return null;
  const { tx, ty, z } = viewport;
  if (selection.type === 'node' && renderNodeActions) {
    const rect = rects.get(selection.id);
    if (!rect) return null;
    const content = renderNodeActions(selection.id);
    if (content == null) return null;
    const left = rect.x * z + tx + rect.width * z; // node top-right, screen px
    const top = rect.y * z + ty;
    return { left, top, content };
  }
  if (selection.type === 'edge' && renderEdgeActions) {
    const resolved = resolvedEdges.find((r) => r.edge.id === selection.id);
    if (!resolved) return null;
    const content = renderEdgeActions(selection.id);
    if (content == null) return null;
    const mid = resolved.geometry.midpoint;
    return { left: mid.x * z + tx, top: mid.y * z + ty, content };
  }
  return null;
})();
```

Render it as a sibling of the stage (NOT inside `.stage`, so it isn't scaled), near the existing control overlays inside the root `<div>`:

```tsx
{
  selectionActions ? (
    <div
      className={styles.selectionActions}
      data-flow-controls=""
      style={{ left: selectionActions.left, top: selectionActions.top }}
    >
      {selectionActions.content}
    </div>
  ) : null;
}
```

- [ ] **Step 5: SCSS + tokens**

`FlowCanvas.module.scss`:

```scss
.selectionActions {
  position: absolute;
  z-index: var(--flow-selection-actions-z);
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  // Anchor point is a corner/midpoint; nudge the toolbar just outside it.
  transform: translate(
    var(--flow-selection-actions-offset-x),
    var(--flow-selection-actions-offset-y)
  );
}
```

`FlowCanvas.tokens.scss`:

```scss
--flow-selection-actions-z: 1; // above the stage within the canvas
--flow-selection-actions-offset-x: var(--space-1);
--flow-selection-actions-offset-y: calc(-1 * var(--space-6));
```

(`position: absolute`/`top`/`left`/`z-index` here are internal chrome anchored inside the `position: relative` root — the same allowance the existing `.controls`/`.controlsTopLeft` clusters use. Guard `position` with the scoped stylelint-disable pattern if lint flags it — `position: absolute` is NOT in the disallowed-value list, only `fixed` is, so no disable is needed.)

- [ ] **Step 6: Run tests + lint + commit**

Run: `npm test -w @eocrm/design-system -- FlowCanvas --run && npm run lint:css`
Expected: PASS.

```bash
git add packages/design-system/src/components/FlowCanvas/
git commit -m "feat(FlowCanvas): renderNodeActions/renderEdgeActions selection toolbars"
```

---

## Task 8: Playground demo

**Files:**

- Modify: `packages/playground/src/pages/components/FlowCanvasDemo.tsx`

- [ ] **Step 1: Wire the new capabilities into the interactive example**

Add local state + handlers and pass to the live `<FlowCanvas>`:

- `onEdgeReconnect={(id, from, to) => setEdges((prev) => prev.map((e) => (e.id === id ? { ...e, from, to } : e)))}` and set `setLastEvent` to `onEdgeReconnect(...)`.
- `renderNodeActions={(id) => (<Cluster gap="xs"><Button size="xs" iconOnly aria-label="Delete node" variant="ghost" onClick={() => handleNodeDelete(id)}><Trash2 size={12} /></Button></Cluster>)}` (import `Trash2` from lucide-react; reuse `handleNodeDelete`).
- `renderEdgeActions={(id) => (<ConfirmationPopover title="Delete connection?" confirmLabel="Delete" variant="danger" onConfirm={() => handleEdgeDelete(id)}><Button size="xs" iconOnly aria-label="Delete connection" variant="ghost"><Trash2 size={12} /></Button></ConfirmationPopover>)}` (exercises the #290 fix from within a selection toolbar).
- Two demo toggles (a `Switch` or `Button`) bound to local state for `allowConnections` and `confineNodesToView`, passed to `<FlowCanvas>`. Keep it in the same "Workflow builder" example (or add a small controls row above the canvas). Verify the `Switch` API (`checked` + `onChange(next)`), per the earlier finding.
- Update the example `description` + the displayed `code` snippet to mention rewiring (drag an edge's endpoint or press R), `allowConnections`, `confineNodesToView`, and the selection toolbars.

- [ ] **Step 2: Build the playground**

Run: `npm run build -w playground`
Expected: PASS (workspace name is `playground`).

- [ ] **Step 3: Commit**

```bash
git add packages/playground/src/pages/components/FlowCanvasDemo.tsx
git commit -m "docs(FlowCanvas): demo rewiring, allowConnections, confineNodesToView, selection toolbars"
```

---

## Task 9: Docs — JSDoc `@remarks` + AGENTS.md

**Files:**

- Modify: `FlowCanvas.tsx` (component JSDoc `@remarks`)
- Modify: `packages/design-system/AGENTS.md` (`### <FlowCanvas>` section)

- [ ] **Step 1: Update `@remarks`**

- **Remove** the bullet "Rewiring an existing edge's endpoints by dragging — not supported; delete + recreate instead." (`FlowCanvas.tsx:121-122`).
- Add to the opening paragraph a sentence: selecting an edge exposes endpoint handles to drag onto another node (or press `R` / `Shift+R`), firing `onEdgeReconnect`; `allowConnections={false}` disables all connect/rewire; `confineNodesToView` keeps dragged nodes on-screen; `renderNodeActions`/`renderEdgeActions` float a toolbar on the selection.

- [ ] **Step 2: Update AGENTS.md**

In the `### <FlowCanvas>` section, add a line documenting `onEdgeReconnect(id, from, to)` (drag an edge endpoint / `R`), `allowConnections`, `confineNodesToView`, and `renderNodeActions`/`renderEdgeActions`. Extend the keyboard list (arrows/E/C/…) with `R` / `Shift+R` = rewire selected connection's target/source.

- [ ] **Step 3: Typecheck + commit**

Run: `npm run typecheck -w @eocrm/design-system`
Expected: PASS.

```bash
git add packages/design-system/src/components/FlowCanvas/FlowCanvas.tsx packages/design-system/AGENTS.md
git commit -m "docs(FlowCanvas): document rewiring, allowConnections, confineNodesToView, selection actions"
```

---

## Task 10: Gates, review, browser-verify, PR

- [ ] **Step 1: Full gates**

```bash
npm test -w @eocrm/design-system
npm run typecheck -w @eocrm/design-system
npm run lint:css
npm run build -w playground
npm pack --dry-run -w @eocrm/design-system
npm run format:check   # run `npm run format` if it flags files, then commit
```

All pass; tarball clean.

- [ ] **Step 2: Browser-verify** (playground http://localhost:8080, `/components/flow-canvas`) — jsdom can't see geometry/paint:
- Select an edge → two endpoint handles sit on the real ends. Drag the target handle onto another node → the edge rewires; drop on empty canvas → reverts. Drag the source handle → source rewires and the arrowhead stays on the target (ghost inverted correctly).
- Keyboard: select an edge, `R` + arrows + Enter rewires the target; `Shift+R` the source; Escape reverts.
- `allowConnections` off → connect handle gone, endpoint handles gone, `C`/`R` inert; node drag still works.
- `confineNodesToView` on → a node can't be dragged off-screen; commit position stays within view.
- Selection toolbar tracks the node's top-right / edge midpoint through pan + zoom + drag; the edge toolbar's `ConfirmationPopover` Confirm works (post-#290); clicking a toolbar button doesn't start a pan or clear selection.
- Endpoint-handle hit target is comfortable at min zoom (if not, apply Task 2 Step 7's screen-space-overlay fallback).

- [ ] **Step 3: Fresh-context review** (CLAUDE.md Rule 8)

Spawn a `general-purpose` reviewer over `git diff main...HEAD` (design-system + demo), briefed on the 10 categories — especially: the three-mode `connect` state (no cross-mode leakage: a rewire pointerup must not run the create branch; a create must not call `onEdgeReconnect`), `isRewireValid` vs `isValid` correctness (edge not flagged as its own duplicate; no-op on unchanged), a11y of the endpoint handles + keyboard rewire, `allowConnections` gating completeness, the clamp math, the selection-overlay `data-flow-controls` carve-out, Rule 7 JSDoc on all new props, Rule 9 i18n for the new strings, no Rule-4/stylelint violations. Fix Critical/Important; document skips; re-run gates; re-review until `clean enough to stop`.

- [ ] **Step 4: Push + PR**

```bash
git push -u origin feat/flowcanvas-editing-features
gh pr create --title "feat(FlowCanvas): edge rewiring, allowConnections, confineNodesToView, selection toolbars" --body "$(cat <<'EOF'
Four FlowCanvas editing features (one PR, built feature-by-feature).

- **Rewire edge endpoints** — select an edge, drag a source/target handle to another node (or `R` / `Shift+R`) → `onEdgeReconnect(id, from, to)`. Reverts on empty/invalid drop; reuses `isValidConnection`.
- **`allowConnections={false}`** — disables create + rewire, keeps node drag/move/delete/select.
- **`confineNodesToView`** — clamps a dragged node to the visible canvas rect.
- **`renderNodeActions` / `renderEdgeActions`** — a floating toolbar anchored to the selected node/edge, following pan/zoom.

Events-only; no breaking changes. Extends internal `EdgeGeometry` with `source`/`target` points. Removes the "rewiring not supported" JSDoc note.

Spec: docs/superpowers/specs/2026-07-05-flowcanvas-editing-features-design.md

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5:** Wait for `Quality / check`. Merge is HUMAN-authorized (auto-publishes) — confirm with the user before merging.

---

## Self-review notes

- **Spec coverage:** EdgeGeometry endpoints (T1) · endpoint handles + `onEdgeReconnect` (T2) · pointer rewire + inverted ghost (T3) · keyboard rewire + i18n (T4) · `allowConnections` (T5) · `confineNodesToView` (T6) · selection toolbars (T7) · demo (T8) · JSDoc + AGENTS.md (T9) · gates/review/browser/PR (T10). All spec sections mapped.
- **Type consistency:** `onEdgeReconnect(id, from, to)`, `connect.{edgeId,end,fixed}`, `isRewireValid(edgeId, from, to)`, `rewireEndpoints`, `canConnect`, `clampToView(id, position)`, `confineNodesToView`, `renderNodeActions`/`renderEdgeActions`, `data-flow-edge-endpoint`, `EdgeGeometry.source/target` are used identically across tasks.
- **Cross-mode `connect` risk** flagged in the spec + the T10 review brief (the pointerup/keyboard-Enter branches switch on `connect.edgeId`).
- **Execution-time verifies:** which `EdgeGeometry` declaration is canonical (T1 Step 3 note); the existing pointer-connect test technique for simulating target hover in jsdom (T3 Step 1 note); the endpoint-handle hit-size at low zoom (T2/T10, with a documented fallback); the `Switch` API for the demo toggles (T8).
- **Merge gated on human approval** (T10 Step 5).

```

```
