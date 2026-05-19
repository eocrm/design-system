# Tabs: animated underline indicator

**Status:** approved, ready for plan
**Author:** dpws + Claude
**Date:** 2026-05-19
**Scope:** `packages/design-system/src/components/Tabs/`

## Goal

When the active tab changes, the blue underline slides from the previous tab to the new one instead of disappearing and reappearing.

## Non-goals

- **No "animation engine," motion library, or new abstractions.** This is a focused change to one component. If 2–3 other components later need similar measure-then-translate animation, extract a shared primitive at that point — not before.
- No new public API surface on `Tabs`. The change is internal.
- No animation on tab content (panels). Only the indicator.
- No support for tabs whose width changes mid-transition (the indicator measures on activation; if a label's count chip changes while the indicator sits on it, the indicator does not re-measure). Acceptable trade-off; can be revisited if it matters.

## Approach

A single absolutely-positioned `<span>` inside the tablist replaces the current `.active::after` pseudo-element. After every render, `useLayoutEffect` reads the active tab's `offsetLeft` and `offsetWidth` and writes them as inline `transform: translateX(...)` and `width` on the indicator. A CSS `transition` on `transform` and `width` produces the slide.

**Why this approach (vs. View Transitions API or FLIP via `element.animate()`):**

- Zero dependencies, ~30 lines added.
- Works in every browser the library already supports.
- Same well-understood pattern used by MUI, Radix, Chakra. Easy for the next maintainer (human or agent) to read.
- View Transitions API in 2026 still has Firefox gaps and needs a `startViewTransition?.(...)` fallback; curve control is more awkward than CSS transitions. Not worth the rough edges here.
- FLIP via `element.animate()` is more flexible than needed and pulls timing config into JS where it doesn't belong — design tokens own timing.

## Implementation

### `Tabs.tsx`

1. Add an `indicatorRef = useRef<HTMLSpanElement>(null)` alongside `tabRefs`.
2. Render `<span ref={indicatorRef} className={styles.indicator} aria-hidden="true" />` as the last child of the tablist `<div>`, after the buttons. `aria-hidden` because the active state is already conveyed by `aria-selected` on the tab button — the indicator is purely decorative.
3. Add a `useLayoutEffect` keyed on `[activeId, items]` that:
   - Looks up `const node = tabRefs.current[activeId]`.
   - If `node` and `indicatorRef.current` both exist, writes `indicator.style.transform = translateX(${node.offsetLeft}px)` and `indicator.style.width = ${node.offsetWidth}px`.
   - Tracks an `isFirstMeasureRef` (or equivalent) so that on the very first measurement, we set `indicator.style.transition = 'none'`, write the position, force a reflow (`indicator.offsetWidth`), then clear the inline `transition` style. This avoids an unwanted slide-in from `(0, 0)` on mount.
   - If `node` does not exist (invalid `activeId` or empty `items`), set `indicator.style.opacity = '0'` so the bar disappears cleanly; restore `'1'` when measurable again.
4. No changes to keyboard handling, ARIA, or any other behavior.

**Spread/ARIA contract unchanged.** Component still uses Pattern B (props first) — the indicator is appended after the buttons but inside the same tablist `<div>`, which doesn't affect role/aria-orientation semantics.

### `Tabs.module.scss`

1. Add `position: relative;` to `.tabs` so the absolutely-positioned indicator anchors to the tablist. This is permitted by **Rule 4** of `packages/design-system/CLAUDE.md` — "`position` (when not `relative` for an internal child anchor)" — i.e., `relative` for the purpose of anchoring an internal child is explicitly allowed.
2. Remove the `.active::after` block (lines ~53–61 of the current file) — the indicator replaces it.
3. Add `.indicator`:
   ```scss
   .indicator {
     position: absolute;
     left: 0;
     bottom: calc(-1 * var(--border-width-emphasis));
     height: var(--border-width-emphasis);
     width: 0;
     background: var(--color-accent);
     transform: translateX(0);
     transition:
       transform var(--transition-base),
       width var(--transition-base);
     will-change: transform, width;
     pointer-events: none;
   }
   ```
4. Wrap the transition in a reduced-motion guard:
   ```scss
   @media (prefers-reduced-motion: reduce) {
     .indicator {
       transition: none;
     }
   }
   ```

**Tokens:** none added. `--transition-base` (140ms ease-out) and `--color-accent` and `--border-width-emphasis` already exist in `tokens.scss`.

### `Tabs.test.tsx`

Add cases — jsdom doesn't do layout, so we test what's testable:

1. **Indicator renders.** The tablist contains a child element with the `indicator` class (or alternately, `aria-hidden="true"` matching our indicator selector). Use the existing `data-testid`-free convention — query by class through `container.querySelector`.
2. **Indicator gets inline `transform` and `width` styles after mount.** Assert that `indicator.getAttribute('style')` contains `transform` and `width`. We can't assert numeric correctness (jsdom returns `0` for `offsetLeft`/`offsetWidth`), only that the effect ran.
3. **Inline styles update on `activeId` change.** Rerender with a different `activeId`. Assert the indicator still has `style` set (the effect ran again). Use a spy / before-after style snapshot rather than asserting specific numbers.
4. **Indicator is `aria-hidden`.** Direct attribute check.

Existing tests (keyboard nav, ARIA, controlled props, ref forwarding) all continue to pass without modification.

### Playground

No new demo. The existing demo at `packages/playground/src/pages/components/TabsDemo.tsx` already exercises tab switching — the animation is now visible there. Verify in `make up`.

### Docs

- `packages/design-system/AGENTS.md` — append one line to the Tabs section: "Active-tab underline slides between tabs; respects `prefers-reduced-motion`."
- `Tabs.tsx` JSDoc — no changes required. The behavior is implementation detail; the public contract (`activeId`, `onChange`, ARIA) is unchanged.

## Risks & mitigations

- **Indicator drifts when the tablist scrolls horizontally.** Because `.indicator` is absolutely positioned inside `.tabs` (which is `inline-flex`, not scroll container — `.scrollWrap` is the scroll container), the indicator scrolls with the tablist content. Verified by the existing structure. No extra work needed.
- **Initial flicker on mount.** Mitigated by the `isFirstMeasureRef` guard that disables the transition for the first measurement.
- **Invalid `activeId` (e.g., consumer passes an id not in `items`).** The effect's lookup fails; we set `opacity: 0` so the bar disappears instead of getting stuck mid-position.
- **`items` changes (tab added/removed).** The effect is keyed on `[activeId, items]` so a re-measure runs. Width may animate to the new value — acceptable.
- **SSR.** `useLayoutEffect` warns in SSR. The existing `Tabs` already uses `useEffect`/`useState`/`useId` and isn't SSR-special; we accept the same posture. If SSR becomes a concern later, swap for the `useIsomorphicLayoutEffect` pattern.

## Out of scope (explicitly)

- Tab panel transitions (cross-fade, slide).
- Indicator color/thickness variants. The indicator inherits from existing tokens.
- A general motion utility module under `src/motion/` or similar. Will be created only if multiple components later prove the need.

## Acceptance

- `make test` green (existing + new indicator tests).
- `make build` green.
- `make lint` green.
- Visual check in `make up`: clicking between tabs in the playground demo slides the underline; using arrow keys (auto activation mode) slides it; the underline does not animate in on first mount.
- `prefers-reduced-motion: reduce` (toggled in DevTools) disables the slide — the underline jumps instantly.
- Mandatory pre-push review-fix loop completes with verdict `clean enough to stop`.
