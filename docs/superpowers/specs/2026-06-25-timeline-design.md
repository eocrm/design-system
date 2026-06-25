# `<Timeline>` — vertical activity-feed primitive — Design

**Status:** design approved (user said "all good"), ready for plan
**Date:** 2026-06-25
**Component:** `@eocrm/design-system` → `src/components/Timeline/` (new component)
**Resolves:** GitHub issue eocrm/design-system#203

## Goal

A `<Timeline>` + `<Timeline.Item node>` compound primitive: a vertical connector line
running between per-item **node** slots (avatar / dot / icon) with content to the right. The
line connects consecutive nodes, touches each node's edges, and **stops at the last node**
(no trailing line). A **compact** variant for dense sidebar widgets. Drives the eoCRM
Activity feed (avatar node + name·type·time + body/system text) in both a full tab view and a
compact sidebar widget; retires the `apps/web/src/shared/ds-shims/Timeline.tsx` shim.

## Resolved decisions (from brainstorm)

1. **Compound `<Timeline compact>` + `<Timeline.Item node={ReactNode}>children</Timeline.Item>`.**
2. **Connector touches each node's edges** (option A) — works with any node including a
   transparent dot; no need for an opaque node background.
3. **Semantic `<ol>` / `<li>`** (an ordered activity sequence).
4. **`compact` is a boolean** that sets the `--timeline-*` CSS vars on the root; items read
   them through the cascade (no prop drilling).
5. **Last-item detection is pure CSS** (`:last-child`) — no JS.

## Public API

```ts
import type { HTMLAttributes, ReactNode } from 'react';

export interface TimelineProps extends HTMLAttributes<HTMLOListElement> {
  /** Tighter gutter, node box, and spacing for dense sidebar widgets. Default `false`. */
  compact?: boolean;
  /** `<Timeline.Item>`s. */
  children: ReactNode;
}

export interface TimelineItemProps extends Omit<HTMLAttributes<HTMLLIElement>, 'children'> {
  /** The gutter node — an `<Avatar>`, `<Dot>`, icon, etc. Centered in a fixed node box so
   *  the connector aligns regardless of node content. */
  node: ReactNode;
  /** The item content (right of the node) — e.g. name·type·time, body, system text. */
  children: ReactNode;
}

export const Timeline: typeof TimelineRoot & { Item: typeof TimelineItem };
```

`TimelineRoot` is `forwardRef<HTMLOListElement>` (+ spread); `TimelineItem` is
`forwardRef<HTMLLIElement>` (+ spread). Attached via `Object.assign` (the established compound
pattern, e.g. `Modal`/`SortableGroup`).

Consumer usage (the Activity feed):

```tsx
<Timeline>
  {activities.map((a) => (
    <Timeline.Item key={a.id} node={<Avatar name={a.actor} size="sm" src={a.avatarUrl} />}>
      <Text size="sm">
        <strong>{a.actor}</strong> · {a.type} · {a.time}
      </Text>
      <Text size="sm" tone="muted">
        {a.body}
      </Text>
    </Timeline.Item>
  ))}
</Timeline>

// compact sidebar widget with dot nodes:
<Timeline compact>
  {events.map((e) => (
    <Timeline.Item key={e.id} node={<Dot tone={e.tone} />}>
      <Text size="sm">{e.label}</Text>
      <Text size="xs" tone="muted">{e.time}</Text>
    </Timeline.Item>
  ))}
</Timeline>
```

## Render structure

```tsx
// TimelineRoot
<ol ref={ref} className={clsx(styles.root, compact && styles.compact, className)} {...rest}>
  {children}
</ol>

// TimelineItem
<li ref={ref} className={clsx(styles.item, className)} {...rest}>
  <div className={styles.gutter}>
    <div className={styles.nodeBox}>{node}</div>
    <span className={styles.connector} aria-hidden="true" />
  </div>
  <div className={styles.content}>{children}</div>
</li>
```

## SCSS (`Timeline.module.scss`)

```scss
@use './Timeline.tokens';

// stylelint-disable property-disallowed-list -- internal grid + connector positioning

.root {
  list-style: none;
  margin: 0; // UA <ol> reset (justified disable)
  padding: 0; // UA <ol> reset
  display: block;
}

.item {
  display: grid;
  grid-template-columns: var(--timeline-gutter) 1fr;
  column-gap: var(--timeline-content-gap);
}

.gutter {
  position: relative;
}

.nodeBox {
  height: var(--timeline-node-size);
  display: flex;
  align-items: center;
  justify-content: center;
}

.connector {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: var(--timeline-node-size); // start just below the node box
  bottom: 0; // span this item's remaining height + the row gap
  width: var(--timeline-line-width);
  background: var(--timeline-line-color);
}

.item:last-child .connector {
  display: none; // the line stops at the last node
}

.content {
  padding-block-end: var(--timeline-row-gap); // inter-item vertical gap
  min-width: 0; // allow truncation inside the content
}

.item:last-child .content {
  padding-block-end: 0;
}

// Compact density — overrides the CSS vars on the root; items inherit via the cascade.
.compact {
  --timeline-gutter: var(--timeline-gutter-compact);
  --timeline-node-size: var(--timeline-node-size-compact);
  --timeline-row-gap: var(--timeline-row-gap-compact);
  --timeline-content-gap: var(--timeline-content-gap-compact);
}
```

Rule 4: the only positioned element is the connector (`position: absolute` inside the
`position: relative` gutter — the same internal-anchor exception `Image`/`Modal` use), plus
the component's own internal grid; the `<ol>` `margin: 0`/`padding: 0` are the UA reset
(justified `stylelint-disable`, like `Sortable`/`SortableGroup`'s list reset). No
consumer-facing layout props.

## Tokens (`Timeline.tokens.scss`)

```scss
:root {
  --timeline-gutter: var(--size-md); // 32px node column (default)
  --timeline-node-size: var(--size-md); // 32px fixed node box
  --timeline-row-gap: var(--space-4); // 16px between items
  --timeline-content-gap: var(--space-3); // 12px node→content
  --timeline-line-width: var(--border-width); // hairline connector
  --timeline-line-color: var(--color-border);

  --timeline-gutter-compact: var(--size-sm); // 24px
  --timeline-node-size-compact: var(--size-sm); // 24px
  --timeline-row-gap-compact: var(--space-2); // 8px
  --timeline-content-gap-compact: var(--space-2); // 8px
}
```

(Verify `--size-md`/`--size-sm` and `--border-width` exist; if a smaller default node box
reads better against the mockup, tune the values — they're component tokens. The node box is
fixed-size so the line aligns; the consumer's `node` (Dot/Avatar/icon) sizes itself within it.)

## Accessibility / i18n

- Structural `<ol>` + `<li>` conveys the ordered sequence; the connector is decorative
  (`aria-hidden`). No imposed ARIA beyond list semantics. Accessibility of the node + content
  is the consumer's (`<Avatar name>`, real text).
- **No new i18n strings** (all visible text is consumer data).

## Testing (`Timeline.test.tsx`)

- Renders an `<ol>` with one `<li>` per `Timeline.Item`.
- The `node` renders in the gutter; `children` render as the content.
- `<Timeline compact>` adds the compact class to the `<ol>`.
- The connector element is present in every item (the "stop at last" is CSS `:last-child`,
  not conditional render) — assert each item contains a `[class*="connector"]` and that the
  rule is driven by `:last-child` (the connector is in the DOM for all items, including the
  last; verify via structure — the CSS hides it on the last).
- `ref` forwarded to the `<ol>` (root) and `<li>` (item).
- `className` merged on both; arbitrary HTML attrs spread (`data-*`, `aria-label`).
- `Timeline.Item` used outside `Timeline` still renders (no context dependency — it's pure
  layout; unlike `SortableGroup.Container` it needs no provider).

(The visual connector geometry + the last-node stop are CSS — browser-verified, not jsdom.)

## Packaging (Core invariant — new component)

- Component + tests beside it (`Timeline.tsx`, `Timeline.module.scss`, `Timeline.tokens.scss`,
  `Timeline.test.tsx`, `index.ts`).
- **Exports** `src/index.ts`: `Timeline`, `TimelineProps`, `TimelineItemProps`.
- **Manifest CLUSTERS:** `Timeline: 'Display'` in BOTH `src/_meta/manifest.ts` and
  `scripts/generate-manifest.mjs`; then `npm run build:manifest`. Timeline imports no other
  component (node/content are consumer slots) → `tier: "primitive"`. Commit the regenerated JSON.
- **Demo** `packages/playground/src/pages/components/TimelineDemo.tsx`: an Activity feed
  (avatar + icon nodes, name·type·time + body/system text) AND a compact dot-node sidebar
  variant. Wire into `App.tsx` route `/components/timeline`, `navItems.ts` **Display** group,
  `ComponentsIndex.tsx` overview card, `registry.ts` `ComponentName` union (`'Timeline'`).
- **JSDoc (Rule 7):** description + `@example` (Activity feed) + `@remarks` anti-patterns
  (don't use for a plain vertical list → `<Stack>`; the `node` is a slot, not a built-in dot —
  pass `<Dot>`/`<Avatar>`/icon; don't hand-roll the connector; the last item's line stops
  automatically).
- **AGENTS.md** TL;DR in the Display area.

## Risks / decisions (resolved)

- **Connector alignment** is anchored to the fixed-height `nodeBox`, so it aligns regardless
  of the consumer node's intrinsic size; the consumer ensures their node fits the node box (a
  `Dot`/`Avatar size="sm"`/small icon all do at the default 32 / compact 24).
- **Last-item stop** is pure CSS (`:last-child`) — robust to reordering, no JS.
- **Compact** flows via CSS-var cascade from the root — items need no `compact` prop.
- **No context** — `Timeline.Item` is pure layout; it renders standalone (the demo/tests can
  use it without a provider).
