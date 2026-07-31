# Sticky Scroll Bottom Gap Design

## Problem

`Sticky` currently uses its top offset twice when `scroll` caps the pinned box: `100dvh - (2 * offset)`. That is correct for a symmetric visual gap, but consumers now encode pinned top-bar clearance in `--sticky-top-*`. A 72px top offset made from a 56px bar plus a 16px gap therefore creates an unwanted 72px bottom gap and loses 56px of usable height.

## Design

Add `--sticky-bottom-gap` as an optional component custom-property override. The scroll cap subtracts the top offset once and then subtracts `var(--sticky-bottom-gap, var(--sticky-offset, 0px))`.

When the new property is unset, the fallback equals the selected top offset and reproduces the existing symmetric calculation for every `top` size. A consumer clearing pinned chrome can set the bottom gap independently, for example:

```css
.recordAside {
  --sticky-top-lg: calc(var(--topbar-height) + var(--space-4));
  --sticky-bottom-gap: var(--space-4);
}
```

At a 700px viewport this produces `700 - 72 - 16 = 612px` instead of `556px`.

## Scope and verification

Update both the `vh` fallback and `dvh` declaration, the `scroll` JSDoc, consumer guidance, and the Sticky playground example. Unit/source tests protect the exact fallback contract. Playwright measures computed `top`, `max-height`, and remaining bottom gap in a 1400×700 browser viewport.
