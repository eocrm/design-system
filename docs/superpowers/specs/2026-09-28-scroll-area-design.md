# ScrollArea + Popover viewport cap (#598)

## Problem

eocrm's notification centre is built on `DropdownMenu` and needs a
height-capped, scrolling body under a fixed header ("Mark all as read"),
plus roomier padding. #598 asked for `DropdownMenu.Content padding` and a
`DropdownMenu.ScrollBody`.

We redirect instead. `DropdownMenu.Content` is `role="menu"`, which may only
own menu items, groups and separators. A header with a button inside it is
invalid ARIA, and menu keyboard handling (arrow keys between items) leaves that
button hard or impossible to reach. The panel is a dialog, so it belongs on
`Popover` (`role="dialog"`). `--popover-padding` (12px) already fixes the
padding complaint, and `Popover.Content`'s existing `minWidth`/`maxWidth`
props cover the width.

Two gaps remain:

1. There is no primitive for a height-capped region that scrolls only its body.
2. `Popover.Content` has no `size()` middleware, so a tall popover runs off
   the viewport.

## Decisions

| Question | Decision |
|---|---|
| Height API | Token scale `'sm' \| 'md' \| 'lg'` plus an escape hatch: a `number` (px) or `string` (any CSS length) |
| Keyboard tab stop | Only while it overflows AND contains no focusable descendant |
| Popover padding prop | None; 12px default fits |
| Popover cap scope | Only popovers that contain a ScrollArea (`:has([data-scroll-area])`) |
| Branch | Same branch as #593–#597 |

## 1. `ScrollArea`

```tsx
<ScrollArea maxHeight="md" aria-label="Notifications">{rows}</ScrollArea>
```

- `src/components/ScrollArea/`: `ScrollArea.tsx`, `.module.scss`,
  `.tokens.scss`, `.test.tsx`, `index.ts`.
- Renders a `<div data-scroll-area>`, `forwardRef<HTMLDivElement>`, spreads
  `HTMLAttributes<HTMLDivElement>` **last** (consumer wins, Pattern A).
- `maxHeight?: ScrollAreaMaxHeight` where
  `type ScrollAreaMaxHeight = 'sm' | 'md' | 'lg' | number | string`.
  - A scale value maps to a class `max-height-{sm|md|lg}`, which reads the
    component tokens `--scroll-area-max-height-{sm|md|lg}`. Those alias the new
    primitives `--size-scroll-area-sm/md/lg` = **240px / 400px / 560px**,
    added in `packages/design-tokens/src/tokens.json` (non-themed, web only).
  - A number is inline `max-height: {n}px`. A string is inline as-is.
  - No default. Without `maxHeight` the area fills the height its parent
    gives it. This supports a bounded flex parent.
- Styles (not layout under Rule 4): `overflow-y: auto; min-height: 0;
  overscroll-behavior: contain;` plus a `:focus-visible` ring through the
  `focus-ring` mixin and a component token aliasing the default ring.
- **Keyboard reachability.** State `focusable` =
  `scrollHeight > clientHeight && !el.querySelector(FOCUSABLE)`. It is
  recomputed:
  - in a layout effect on mount,
  - from a `ResizeObserver` observing the element and its direct children,
  - from a `MutationObserver` (`childList`, `subtree`, `attributes` filtered
    to `tabindex`, `disabled`, `href`, `hidden`), which also re-observes new
    direct children with the ResizeObserver.

  `FOCUSABLE` is the selector already used in the repo for focus trapping (reuse
  it if one exists in `_internal`; otherwise a local constant covering
  `a[href]`, `button:not([disabled])`, `input:not([disabled])`, `select`,
  `textarea`, `[tabindex]:not([tabindex="-1"])`, `[contenteditable="true"]`).

  While `focusable`, it renders `tabIndex={0}` and `role="region"`. The
  accessible name comes from the consumer's `aria-label` / `aria-labelledby`.
  In dev only, a `console.warn` fires once per instance when it becomes
  focusable with neither.
- Full JSDoc: the component with 2–3 `@example`s (standalone, the Popover
  notification recipe), every prop, and `ScrollAreaMaxHeight`. `@remarks`:
  - When NOT to use: whole-page scrolling (AppLayout owns it); a Card with a
    fixed header (`<Card fill>` + `<Card.Body scroll>`); horizontal scrolling
    (vertical only).
  - Anti-patterns: nested ScrollAreas; `overflow` via a className instead;
    a focusable ScrollArea without a name; wrapping the ScrollArea more than
    one level deep inside `Popover.Content` (the viewport cap won't reach it).

## 2. Popover changes

- `Popover/Content.tsx`: middleware becomes
  `[offset(sideOffset), flip(), shift({ padding: 8 }), size({ padding: 8, apply({ availableHeight, elements }) { elements.floating.style.setProperty('--popover-available-height', `${availableHeight}px`) } }), arrow({ element: arrowRef })]`.
- `Popover.module.scss`:
  ```scss
  .content:has([data-scroll-area]) {
    display: flex;
    flex-direction: column;
    max-height: var(--popover-available-height);

    > * { flex-shrink: 0; }
    > [data-scroll-area],
    > :has([data-scroll-area]) { flex-shrink: 1; min-height: 0; }
  }
  ```
  This is a compound-internal layout exception like Card's `.scroll`, with a
  comment. No `overflow` on `.content`, so the arrow is never clipped.
- Supported shapes: a ScrollArea as a direct child of `Popover.Content`, or
  wrapped exactly once (e.g. `Content > Stack > [Header, ScrollArea]`).
- Popovers without a ScrollArea are unchanged. A tall one still overflows, and
  the Popover JSDoc points to ScrollArea as the fix.
- `ConfirmationPopover` and `ColorPicker` use `Popover.Content`. Neither
  contains a ScrollArea, so neither changes.

## 3. DropdownMenu guidance

A new anti-pattern in the `DropdownMenu` JSDoc `@remarks` and in AGENTS.md:
a panel with a header action, or a feed of rich rows, is not a menu. Use
`Popover` + `ScrollArea`.

## 4. Tests

`ScrollArea.test.tsx`:

- Default render: base class, `data-scroll-area`, no `tabIndex`/`role`.
- `ref` reaches the div; `className` is merged.
- Each scale value applies its class; `maxHeight={320}` gives inline `320px`;
  `maxHeight="50vh"` passes through.
- With a `ResizeObserver` stub and stubbed `scrollHeight`/`clientHeight`:
  - overflowing with text only: `tabIndex=0`, `role=region`
  - overflowing with a link: neither
  - not overflowing: neither
  - a link appended later (MutationObserver): `tabIndex` is removed
  - a resize that makes it overflow: `tabIndex` is added
- Dev warn: fires once when focusable and unnamed; silent with `aria-label`.
- A consumer `tabIndex`/`role` wins.
- SCSS: the overflow/min-height/overscroll rules and the ring token.

Popover tests:

- `--popover-available-height` is set on the open content.
- The SCSS pins the `:has([data-scroll-area])` block.

Browser check (Playwright, dev server on 8090+): in the demo's notification
recipe at a short viewport height, the header stays visible, the feed
scrolls, and the popover stays inside the viewport.

## 5. Demo & wiring (Core invariant)

- `packages/playground/src/pages/components/ScrollAreaDemo.tsx`, with examples:
  - the scale (sm/md/lg plus `maxHeight={320}`)
  - the notification centre (Popover, header with "Mark all as read", 30
    link rows)
  - keyboard: a list of links (no extra tab stop) vs plain text (a named
    region that is a tab stop)
- `App.tsx` route, `navItems.ts` `componentGroups`, `ComponentsIndex.tsx`,
  `overviewSchematics.tsx`, and the `ComponentName` union in `registry.ts`.
- `src/index.ts` exports `ScrollArea`, `ScrollAreaProps`, `ScrollAreaMaxHeight`.
- AGENTS.md: a ScrollArea TL;DR section; the Popover section notes the
  viewport cap with ScrollArea.
- `CLUSTERS` entry in `src/_meta/manifest.ts` AND
  `scripts/generate-manifest.mjs`, then `npm run build:manifest`.
- design-tokens: the three new primitives and the updated pins (count,
  fixture, source counts). `npm run tokens:check`.

## Out of scope

- Horizontal scrolling, custom scrollbars, scroll shadows.
- Viewport-capping popovers that contain no ScrollArea.
- Changing `DropdownMenu` itself.
