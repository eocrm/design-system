# DropdownMenu: open-only entrance animation

**Status:** approved, ready for plan
**Author:** dpws + Claude
**Date:** 2026-05-19
**Scope:** `packages/design-system/src/components/DropdownMenu/`

## Goal

When `DropdownMenu.Content` (and `SubContent`) opens, the panel scale-fades in from the trigger side using a short, restrained motion (140 ms `ease-out`, 4 % scale, 4 px directional translate). When the panel closes, it disappears instantly.

## Non-goals

- **No close animation.** `Content` returns `null` the instant `open` flips false, exactly as today. Adding exit animation requires a mount-lifecycle state machine that this change explicitly avoids.
- **No item-level animation.** Menu hover/focus highlights remain instantaneous. Material 3 and Apple HIG both call this out — transitioning the highlight introduces perceived input lag and is wrong for menus.
- **No "animation engine," motion module, or shared primitive.** Same posture as Tabs: extract only when 3+ components prove the need.
- **No new public API.** `Content` props are unchanged. Consumers do not opt in or out of animation; it just happens.

## Approach

Use CSS `@starting-style` to interpolate from a pre-mount state (`opacity: 0; transform: scale(0.96) translate(...)`) to the resting state (`opacity: 1; transform: none`) on initial render. The `data-side` attribute that `Content` already sets drives `transform-origin` and the translate direction so the panel always appears to come *toward* the trigger.

`@starting-style` browser support in May 2026: Chrome 117+ (Sep 2023), Safari 17.5+ (May 2024), Firefox 129+ (Aug 2024) — universal across the last two major versions of every supported browser. Falls back gracefully (panel just appears at final state, no animation) on older browsers.

### The one JS change

`Content.tsx` calls `useFloating(...)`. Floating UI positions the panel by setting `transform: translate(Xpx, Ypx)` on the floating element by default. If we also animate the panel with `transform: scale(...) translate(...)`, our CSS `transform` **overrides Floating UI's positioning transform**, breaking placement.

The standard fix is to pass `transform: false` to `useFloating`, which makes Floating UI position the element via inline `top` / `left` instead of `transform`. This is the documented escape hatch for exactly this situation. Negligible paint-perf impact (top/left instead of transform-layer promotion) for an element that exists only for the duration of an interaction.

### The CSS

The project's `.stylelintrc.json` polices `opacity` via `scale-unlimited/declaration-strict-value`. Existing code uses `var(--opacity-disabled)` (0.5). For the `0` end of the animation, add a paired token `--opacity-hidden: 0` to `src/styles/tokens.scss`. The resting state's `opacity: 1` is the CSS default, so it never needs to be written — only the `@starting-style` block names opacity, via the token.

Append to `DropdownMenu.module.scss`:

```scss
// Base resting state for the animated open. transition + transform-origin
// here; the @starting-style blocks below set the pre-paint state per side.
// On close, Content returns null — there is no exit animation by design.
.content {
  // ...existing rules unchanged...
  transform: none;
  transition:
    opacity var(--transition-base),
    transform var(--transition-base);

  @starting-style {
    opacity: var(--opacity-hidden);
  }
}

// Direction-aware transform-origin + initial offset. The panel always
// appears to grow toward the trigger.
.content[data-side='bottom'] {
  transform-origin: top center;
  @starting-style { transform: scale(0.96) translateY(-4px); }
}
.content[data-side='top'] {
  transform-origin: bottom center;
  @starting-style { transform: scale(0.96) translateY(4px); }
}
.content[data-side='right'] {
  transform-origin: left center;
  @starting-style { transform: scale(0.96) translateX(-4px); }
}
.content[data-side='left'] {
  transform-origin: right center;
  @starting-style { transform: scale(0.96) translateX(4px); }
}

@media (prefers-reduced-motion: reduce) {
  // @starting-style only applies when a transition is active. With transition: none
  // the @starting-style block above becomes inert and the panel renders directly
  // at its computed style (opacity: 1, transform: none — both CSS defaults).
  .content {
    transition: none;
  }
}
```

**Note on stylelint:** `@starting-style` may not be in `stylelint-config-standard-scss`'s built-in at-rule allowlist yet. If `make lint` flags it (`at-rule-no-unknown` or similar), add `@starting-style` to an allowlist or disable the rule for that file. Verify before committing.

### Token usage

- `--transition-base` (`140ms ease-out`, exists) — controls both the opacity and transform transitions.
- All other values (`scale(0.96)`, `4px`, `top center`, etc.) are intrinsic animation parameters, not design tokens. Adding tokens for one-off animation magic numbers would be premature abstraction.

## Implementation

### Files changed

1. `packages/design-system/src/components/DropdownMenu/Content.tsx` — add `transform: false` to `useFloating` options.
2. `packages/design-system/src/components/DropdownMenu/DropdownMenu.module.scss` — append the rules above.
3. `packages/design-system/src/components/DropdownMenu/DropdownMenu.test.tsx` — add two tests (see below).
4. `packages/design-system/AGENTS.md` — one line under the DropdownMenu section noting the entrance animation + reduced-motion respect.

### Tests

Two new tests in `DropdownMenu.test.tsx`:

1. **Floating UI positions via `top` / `left`, not `transform`.** Open a menu, assert that the rendered Content element has inline `top` and `left` styles, and that its inline `transform` style is either empty or `none`. This locks in the `transform: false` contract so a future refactor doesn't silently break the animation by re-enabling Floating UI's transform-based positioning.
2. **`@starting-style` rule exists for `.content`.** Use the same CSSOM-traversal pattern as the Tabs reduced-motion test: walk `document.styleSheets`, find a rule matching `.content` (or a substring match), confirm it has a `@starting-style` block. This passes in jsdom because the CSS is parsed; the actual animation doesn't run.

Existing 100+ DropdownMenu tests must still pass. None of them assert on Floating UI's specific transform output (verified during exploration).

### Playground

No new demo. The existing `DropdownMenuDemo` in `packages/playground/src/pages/components/DropdownMenuDemo.tsx` already exercises open/close. Verify visually in `make up`.

### Docs

`packages/design-system/AGENTS.md`, in the DropdownMenu section: append a single bullet like:

> Opens with a short scale-fade from the trigger side (140 ms). Closes instantly by design (menu close = "get out of the way", not "perform a transition"). Respects `prefers-reduced-motion: reduce`.

No JSDoc changes — the animation is implementation detail, not API.

## Risks & mitigations

- **Stylelint trips on `@starting-style`.** Likely if `.stylelintrc.json` uses `at-rule-no-unknown`. Mitigation: extend the allowlist. Catch in CI via `make lint` before push.
- **Consumer CSS reaches into the portal and overrides `transform`.** Very unlikely; consumers shouldn't be targeting our portal's inline styles. Documented in AGENTS.md.
- **Floating UI's `transform: false` mode interacts subtly with auto-update during scroll.** Same auto-update mechanism, different write target (top/left vs transform). Verified by reading Floating UI docs; no behavior change at the layout level.
- **Performance.** Animating `transform` + `opacity` is the cheap pair (compositor-only). `top`/`left` writes from Floating UI cause layout but only on open + on scroll/resize while open, identical to the existing autoUpdate cadence. Net: imperceptible.
- **Rapid open/close in quick succession.** Each open re-mounts `Content`, so `@starting-style` re-runs every time. Animation plays from start on each reopen. Close is instant. No animation queue, no half-closed state. Robust by construction.

## Acceptance

- `make test` green (existing + 2 new tests).
- `make typecheck`, `make lint`, `make build`, `npm pack --dry-run` green.
- Visual in `make up`:
  - Open a top-level DropdownMenu: panel scales/fades in from above the trigger (default `side="bottom"`). Close: panel vanishes instantly.
  - Open a SubContent: same effect anchored to the left edge (default `side="right"`).
  - Open menus on each `side` (top / bottom / left / right) via the demo: origin and translate direction flip correctly.
  - DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion" = "reduce": menu appears instantly with no transform or fade.
- Hard Rule 8 pre-push review-fix loop completes with verdict `clean enough to stop`.
