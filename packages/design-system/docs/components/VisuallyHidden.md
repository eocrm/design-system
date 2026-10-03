# `<VisuallyHidden>` — content for assistive tech only

```tsx
<VisuallyHidden>Opens in a new tab</VisuallyHidden>
<VisuallyHidden as="div">…block content…</VisuallyHidden>
```

- `as?: 'span' | 'div'` — default `'span'`. Use `'div'` when the hidden content wraps other block elements.
- The "clip" technique (`position: absolute`, 1×1px, clipped) — NOT `display: none` / `visibility: hidden`, which would also remove it from assistive tech.
- `forwardRef` to the rendered element; spreads `HTMLAttributes<HTMLElement>` last (consumer wins — nothing here is semantic to protect).
- The building block `LiveRegion` renders its own announcement text into.

**When NOT to use:** to hide something from everyone, use the `hidden` attribute or a conditional render — VisuallyHidden stays reachable by assistive tech, it isn't a display toggle. On a focusable element (a skip link) — the content stays invisible even focused; there's no show-on-focus variant yet. To label a control, prefer `aria-label` or a visible `<label>` over a hidden span in the DOM flow. For announcements, use `LiveRegion` — a plain hidden span isn't live.
