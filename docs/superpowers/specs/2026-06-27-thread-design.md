# `<Thread>` — nested comment threading with connection lines — design

**Date:** 2026-06-27
**Status:** Design (autonomous, issue #220 grants "final shape is yours") → plan → build
**Component:** `@eocrm/design-system` › new `Thread`

---

## Context

Issue #220: no DS primitive renders nested-reply threading with connection lines.
`Indent` only pads; `Timeline` is a flat activity rail (not a nested tree). A
Jira/GitHub/Linear comment thread needs a continuous **left vertical rail per
nesting level** connecting a parent to its replies, with the comment's avatar as the
node. The issue grants design latitude — "the consumer just needs a left rail that
connects replies to their parent, depth-capped."

## API (chosen): recursive compound

```tsx
<Thread maxDepth={4}>
  <Thread.Item node={<Avatar name="Sarah" size="sm" />}>
    <Text size="sm">…comment body + actions…</Text>
    <Thread.Item node={<Avatar name="Marcus" size="sm" />}>
      <Text size="sm">…reply…</Text>
    </Thread.Item>
  </Thread.Item>
</Thread>
```

- **`<Thread>`** — root. Props: `maxDepth?: number` (default `4`), `compact?: boolean`
  (tighter node/gaps for sidebars, mirroring Timeline). Renders a `<ul>` of top-level
  items and provides `ThreadContext` (`depth: 0`, `maxDepth`).
- **`<Thread.Item node={ReactNode}>`** — one comment. `node` is the leading marker
  (`<Avatar>`/`<PersonDisplay.Avatar>`/icon) the rail connects to. Children split
  (like `PersonDisplay` sorts its slots): nested `<Thread.Item>` children are the
  **replies**; all other children are the **body** (text, actions). Body renders
  beside the node; replies render in an indented sub-list below, with a rail.

Mirrors the established compound + `node`-slot pattern of `Timeline`/`PersonDisplay`,
so it reads familiarly and reuses the connector technique.

## Layout & rail (mirrors Timeline's connector)

Each item is a CSS grid `[gutter 1fr]` (gutter = `--thread-node-size`, column-gap =
`--thread-content-gap`):

- **gutter**: a fixed-size `nodeBox` (centers the `node`) + an absolutely-positioned
  **rail** — a vertical line at the gutter's center (`inset-inline-start: 50%`,
  `transform: translateX(-50%)`, `inset-block: nodeSize → 0`, width
  `--thread-rail-width`, color `--thread-rail-color`). The rail spans from below the
  node to the bottom of the item's box — i.e. down past the item's replies — so it
  reads as descending from the avatar through the reply group. **Shown only when the
  item has indented replies** (otherwise no dangling line).
- **content**: the body, then (if replies) an indented `<ul class="replies">` of the
  nested `<Thread.Item>`s at `depth + 1`. The nested grid adds one gutter of indent
  per level automatically, and each reply draws its own node + rail — producing the
  per-level rail tree. RTL-aware via logical properties (`inset-inline-start`,
  `column-gap`, no physical left/right).

## Depth cap (the "stops compounding" requirement)

`ThreadContext.depth` increments per nesting level, clamped at `maxDepth`. The
effective next depth is `Math.min(depth + 1, maxDepth)`. While `depth < maxDepth`,
replies render **indented** (the `.replies` sub-list, with the parent's rail). Once
`depth >= maxDepth`, replies render **flat**: a `.repliesFlat` container with no
additional gutter/indent and no new rail, so the tree stops marching right and deep
chains stay readable. (Items at the cap keep their own node; only further _indent_
stops.) Default `maxDepth = 4`.

## Tokens (`Thread.tokens.scss`, mirroring Timeline)

```
--thread-node-size: var(--size-md);          // 32px node column / box
--thread-content-gap: var(--space-3);         // 12px node → content
--thread-row-gap: var(--space-4);             // 16px between items
--thread-rail-width: var(--border-width);     // hairline rail
--thread-rail-color: var(--color-border);
--thread-node-size-compact: var(--size-sm);   // 24px
--thread-content-gap-compact: var(--space-2); // 8px
--thread-row-gap-compact: var(--space-2);     // 8px
```

`compact` remaps the size/gap tokens (same mechanism as Timeline). No raw values
(Rule 3). No layout props on the component beyond the grid/rail it owns; `<ul>` margin
/padding resets use the documented `stylelint-disable` + reason (as Timeline does).

## Behaviour notes / edge cases

- **No replies** → no rail, no sub-list (just node + body row).
- **Children sorting**: nested `<Thread.Item>` (by element-type identity, like
  `PersonDisplay`) are replies; everything else is body. A reply wrapped in a Fragment
  won't be detected — documented as an anti-pattern (`@remarks`), mirroring
  PersonDisplay's Avatar-slot note.
- **`node` is a slot** (not a built-in avatar) — pass `<Avatar>`/icon. `@remarks`.
- **forwardRef + spread**: root forwards to `<ul>`, Item to `<li>`, spreading
  `HTMLAttributes` (Pattern A, props last).
- RTL: logical properties only.
- a11y: root `<ul>` / items `<li>` give an implicit list tree (assistive tech reads
  nesting). No ARIA roles invented; the connector is decorative (no text).

## Testing (`Thread.test.tsx`)

- Renders nested items; body + reply text both present.
- An item WITH replies renders the rail element; an item WITHOUT replies does not.
- Reply nesting produces nested `<ul>`/`<li>` (the reply is inside the parent item).
- `maxDepth` cap: beyond `maxDepth`, replies render flat (the deep reply is NOT in a
  further-indented `.replies` sub-list — assert the `.repliesFlat` path / no extra
  nesting). Use a small `maxDepth={1}` to exercise the cap cheaply.
- `compact` applies the compact class/token remap.
- `forwardRef` to `<ul>` (root) and `<li>` (item); `className` merges; arbitrary attrs
  spread.
- Children sorting: a non-Item child renders as body beside the node; an Item child
  renders as a reply.

Visual reflow / exact rail alignment is verified live in the playground (Playwright):
the rail descends from each avatar through its replies; depth cap stops indent.

## Core-invariant checklist (new component)

- `src/components/Thread/Thread.tsx` (forwardRef + spread + full JSDoc + `@remarks`
  When-NOT-to-use / Anti-patterns), `Thread.module.scss` (tokens only),
  `Thread.tokens.scss`, `Thread.test.tsx`, `index.ts`.
- Re-export from `src/index.ts` (`Thread` + `ThreadProps`, `ThreadItemProps`).
- Playground demo `pages/components/ThreadDemo.tsx` + wiring: `App.tsx` route,
  `AppShell.tsx` nav (Display group), `ComponentsIndex.tsx` overview card.
- `AGENTS.md` TL;DR section + canonical snippet.
- Manifest: CLUSTERS entry in **both** `_meta/manifest.ts` and
  `scripts/generate-manifest.mjs`, then `npm run build:manifest`.

## When NOT to use (for `@remarks`)

- A flat activity feed (one rail, no nesting) → `<Timeline>`.
- Plain indentation with no connecting line → `<Indent>`.
- A non-threaded list → `<Stack>`.
- Avatar + name row → `<PersonDisplay>` (use it as the item's `node` / body).
