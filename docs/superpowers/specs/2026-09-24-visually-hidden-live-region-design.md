# VisuallyHidden + LiveRegion — design (#554)

## Goal

Give consumers a DS primitive for (a) text that only assistive tech should
perceive and (b) announcing an outcome that has no visible text of its own
(e.g. "Authenticator app added"), without hand-writing an element with an
inline visually-hidden style.

## Components

Two components, one new cluster: **`Accessibility`**.

### `VisuallyHidden`

```tsx
<VisuallyHidden>Opens in a new tab</VisuallyHidden>
<VisuallyHidden as="div">…block content…</VisuallyHidden>
```

- `as?: 'span' | 'div'` — default `'span'`.
- `forwardRef` to the rendered element; spreads `HTMLAttributes<HTMLElement>`
  (props last — consumer wins; nothing semantic to protect).
- Styles: `@include visually-hidden` from `styles/mixins.scss`. The mixin's
  `position: absolute` / `margin: -1px` are the visually-hidden technique, not
  layout — stylelint disables are justified inline.
- Out of scope: a focusable "show on focus" variant (skip links). Add when
  asked.

### `LiveRegion`

```tsx
<LiveRegion>{status}</LiveRegion>
<LiveRegion politeness="assertive">{error}</LiveRegion>
<LiveRegion announceKey={saveCount}>{t('saved')}</LiveRegion>
```

- `children?: ReactNode` — the message. Empty / `null` / `false` clears the
  region and announces nothing.
- `politeness?: 'polite' | 'assertive'` — default `'polite'`.
  - `polite` → `role="status"` + `aria-live="polite"`
  - `assertive` → `role="alert"` + `aria-live="assertive"`
  - Both set `aria-atomic="true"`.
- `announceKey?: string | number` — change it to re-announce an identical
  message.
- `forwardRef` to the region element (a `VisuallyHidden` `span`); spreads
  `HTMLAttributes<HTMLSpanElement>` FIRST so role / aria-live / aria-atomic
  cannot be overridden (Pattern B, commented in JSX).
- The region is **always mounted**; only its text changes (Hard rule 10).

#### Announcement mechanism — clear, then set

On mount and whenever `children` or `announceKey` changes, the rendered
content is set to empty, then the message is written after a short timeout
(`ANNOUNCE_DELAY_MS = 50`, internal constant). Consequences:

- A region that mounts with a message still announces (text arrives after
  the region is in the tree — Hard rule 10's "compute in an effect").
- An identical message re-announces when `announceKey` changes (the region
  goes empty → text, which screen readers treat as a new change).
- Rapid changes: a pending timeout is cleared on the next change / unmount,
  so only the latest message is written.
- Change detection for `children` is by render (React re-render with new
  children). For string/number children compare by value; for element
  children any re-render with a new element identity would restart the
  cycle, so JSDoc steers consumers to pass a string. Implementation: key the
  effect on a derived `messageKey` (the string when children is a string /
  number, otherwise the children identity).

## Docs

- JSDoc on both components with `@example`s and `@remarks` anti-patterns:
  - ❌ LiveRegion for text that is already visible and focused (announce twice).
  - ❌ Mounting a LiveRegion only when there is a message (won't announce) —
    the component already handles this; don't wrap it in a condition.
  - ❌ LiveRegion for a component's own transient state — library components
    own their regions (Rule 10); this is for consumer-level outcomes.
  - ❌ `assertive` for routine success — reserve it for errors that need
    immediate attention.
  - ❌ VisuallyHidden to hide something from everyone — use `hidden`.
- AGENTS.md TL;DR section.

## Testing

- VisuallyHidden: renders span by default, `as="div"`, ref, className merge,
  applies the hidden class.
- LiveRegion (fake timers): empty on first render, message after the delay;
  roles/aria per politeness; props can't override role; changing children
  swaps the text via empty; changing `announceKey` with identical text clears
  then re-sets; null children → empty; unmount clears the pending timer; ref
  forwarded.

## Wiring

Core invariant: index exports, playground demo + route + nav + overview grid +
schematic + `ComponentName` union, AGENTS.md, CLUSTERS in both manifest maps,
`npm run build:manifest`.
