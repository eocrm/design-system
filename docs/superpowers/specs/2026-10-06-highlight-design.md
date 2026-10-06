# Highlight — generic attention primitive (#628)

Consumer: eocrm/eocrm#1225. A newly added dashboard widget, a just-created
list row, a deep-linked record section or a just-saved field must be able to
draw the user's attention for a moment. The app ships a shim with the API below
and swaps to the DS component when it lands.

## Scope

- **In:** one new component, `Highlight`.
- **Out:** `DashboardWidget highlighted` and `DashboardCanvas` scroll-to-item
  (the issue's original ask). Point 3 of the revised ask makes them optional:
  `<Highlight scrollIntoView focus>` around `renderItem`'s widget covers both.
  The demo and docs show that composition.

## API

```tsx
<Highlight
  active={boolean}
  duration={3000} // ms; Infinity = until `active` clears
  onDone={() => void}
  scrollIntoView={false}
  focus={false}
>
  <SingleElementChild />
</Highlight>
```

- **Clone, not wrap.** `Highlight` renders no DOM of its own. It
  `cloneElement`s its single element child and merges in:
  - `className` (concatenated with the child's own)
  - `data-highlight="on" | "fading"` (absent when idle)
  - a ref, through `_internal/refs.ts` `mergeRefs` (the child's own ref keeps
    working)

  A wrapper `<div>` was rejected: it is invalid inside `<tbody>`/`<ul>`, and it
  changes sizing in grid and flex cells.

- The child must forward `ref` and `className`. Every DS component and every
  native element does.
- No `forwardRef` and no prop spread: there is no own DOM node. This is the
  same exemption as `Tooltip`.
- **Decorative only.** No `role`, no `aria-*`, no `tabIndex` changes. The app
  owns any announcement (for example a polite "<widget> added" through
  `LiveRegion`). Hard rule 10 doesn't apply: this isn't a transient state the
  user needs to perceive, it's visual emphasis on content that is already
  announced, or that needs no announcement.

## Behaviour

All of the following is triggered by `active` changing from false to true,
including mounting with `active` already true.

1. The ring turns on (`data-highlight="on"`).
   - If `scrollIntoView` is set: `child.scrollIntoView({ block: 'center',
inline: 'nearest', behavior })`. `behavior` is `'smooth'`, or `'auto'` under
     `prefers-reduced-motion: reduce`.
   - If `focus` is set: `child.focus({ preventScroll: true })`. A
     non-focusable child (a `Card`, a `<section>`) needs `tabIndex={-1}` from
     the consumer. The docs say so.
2. After `duration` ms, `data-highlight` becomes `"fading"`.
3. After the fade (`--transition-slow`, read as a fixed 260ms timer, not a
   `transitionend` event, which jsdom doesn't fire and which is unreliable
   when a property doesn't change), `data-highlight` is removed and
   `onDone()` fires once.
   - Under reduced motion there is no fading phase: removal and `onDone`
     happen straight after `duration`.
   - `duration={Infinity}` never starts the timer.
4. If `active` goes false early, the ring is removed at once, the timers are
   cleared and `onDone` is **not** called.
5. Re-triggering: toggle `active` false→true. A steady `true` doesn't restart
   the highlight.
6. `onDone` is held in a ref, so a new function identity on each render
   doesn't restart the timers. Unmounting clears the timers.

## Visuals

`Highlight.module.scss` + `Highlight.tokens.scss`, tokens only:

- `--highlight-ring` → `var(--ring-accent)` (1px solid accent ring)
- `--highlight-ring-peak` → `var(--color-accent-hover)` (outline colour at each wave's start)
- `--highlight-ring-width` → `var(--border-width)` (1px)
- `--highlight-glow` → an accent tint (`color-mix` of `--ring-accent` with
  `transparent`, following the existing `color-mix` precedent in
  `*.tokens.scss`)
- `--highlight-glow-blur` → `var(--space-4)`
- `--highlight-wave` → a stronger accent tint (`color-mix`, 55%), the colour
  at each wave's leading edge
- `--highlight-wave-reach` → `var(--space-6)` (how far inward a wave grows)
- `--highlight-wave-blur` → `var(--space-3)` (soft leading edge)
- `--highlight-wave-duration` → `1000ms` (per wave)
- `--highlight-wave-count` → `3`
- `--highlight-fade` → `var(--transition-slow)`

Styling:

- **Ring:** a 1px solid accent ring, drawn as an inset `outline` (`outline-offset` = −ring width). Inset, so the
  child's own `overflow: hidden` (`Card`) and the parent's `overflow: auto`
  (the `DashboardCanvas` cell) can't clip it. That's the same reasoning as
  `DashboardCanvas`'s inset focus ring.
- **Glow:** a blurred inset `box-shadow`, so the edge reads as light; the
  softness comes from the glow and waves, not the line.
- **Inward waves:** on entry, three waves (`highlight-wave`, 1000ms each,
  `ease-out`). Each wave is an extra blurred inset `box-shadow` band that
  starts at the edge and grows inward to `--space-6` while fading out; the
  keyframes repeat the steady glow layer so it never drops out. Each wave also
  pulses the outline from `--highlight-ring-peak` back to `--highlight-ring`.
  No `animation-fill-mode`: after the last wave the steady ring and glow from
  the base rule remain. Inward, because outward ripples would be clipped by
  `Card`/canvas-cell overflow; finite (~3s), because endless motion over 5s
  must be pausable (WCAG 2.2.2). A `duration` under 3000 cuts the waves short.
- **Fading:** opacity can't apply to an outline alone, so the outline colour
  and the glow transition to transparent over `--transition-slow`.
- **Reduced motion:** a static ring and glow, with no animation and no
  transition.
- **No layout shift:** only outline and box-shadow are used, never border,
  margin or padding.
- **Works on `<tr>`:** ring and glow both paint (verified in Chromium).
- **Replaces the child's own `box-shadow`/`outline` while highlighted** (e.g. a
  Card's elevation and tone stripe); they return when the highlight ends. The
  glow also paints beneath descendants' own backgrounds (a filled Card header,
  `<td>` fills); the outline normally paints above them (a positioned
  descendant, or one with its own stacking context, can cover it).
- Correct in light and dark through `--ring-accent`'s theme values.

## Testing (`Highlight.test.tsx`, jsdom, fake timers)

- The class is concatenated onto the child. Both the child's ref and the
  internal ref resolve to the node.
- `data-highlight` goes on → fading → absent, at `duration` and at
  `duration + 260`.
- `onDone` fires exactly once. It doesn't fire when `active` clears early, and
  it never fires with `Infinity`.
- A new `onDone` identity on re-render doesn't restart the timer.
- Toggling false→true re-triggers.
- `scrollIntoView` and `focus` are called with the specified arguments, and
  aren't called when their flags are off.
- With reduced motion (mocked `matchMedia`): `behavior: 'auto'`, no fading
  phase, and `onDone` fires at `duration`.
- No `role`, `aria-*` or `tabindex` is added to the child.

## Deliverables (Core invariant)

1. `src/components/Highlight/` holds `Highlight.tsx`, `.module.scss`,
   `.tokens.scss`, `.test.tsx` and `index.ts`.
2. `src/index.ts` exports `Highlight` and `HighlightProps`.
3. Playground `HighlightDemo.tsx`, covering:
   - a widget added to a `DashboardCanvas` (scroll + focus)
   - a just-created `Table` row
   - a deep-linked section
   - a reduced-motion note

   It's wired into `App.tsx`, `navItems.ts`, `ComponentsIndex.tsx`,
   `overviewSchematics.tsx` and the `ComponentName` union.

4. `docs/components/Highlight.md` (TL;DR, anti-patterns, generated props
   table) and its `AI-PRIMER.md` index line.
5. A CLUSTERS entry in both `_meta/manifest.ts` and
   `scripts/generate-manifest.mjs`, then `npm run build:manifest`.
