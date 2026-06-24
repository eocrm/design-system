# Interactive `<Image>` — flush clickable thumbnail — Design

**Status:** design approved (user said "yes"), ready for plan
**Date:** 2026-06-24
**Component:** `@eocrm/design-system` → `src/components/Image/` (enhancement, NOT a new component)
**Resolves:** GitHub issue eocrm/design-system#195

## Goal

Make `<Image>` an optional **flush, no-chrome, keyboard-accessible click target** — a
thumbnail that opens a preview/lightbox on click/Enter/Space — without the inset/border/
hover paint that `Button iconOnly` forces or the navigation semantics of `Link`. The
driving use case is `apps/web`'s `AttachmentsTable.tsx`: a dense ~40px image cell in a
`Table` row that opens a full-size preview `Modal`. This retires the
`apps/web/src/shared/ds-shims/Thumbnail.tsx` shim.

## Resolved decisions (from brainstorm)

1. **Extend `<Image>`** with `interactive` / `onClick` / `ariaLabel` (NOT a separate
   `<Pressable>` primitive). When interactive, the image renders inside a chromeless
   `<button>`.
2. **Wrap, with the error overlay kept as a sibling.** The `<img>` (+ loading skeleton)
   render inside the trigger `<button>`; the broken-image error overlay — which has its
   own retry `<button>` — stays a SIBLING of the trigger, never nested (nested `<button>`s
   are invalid HTML). The trigger is `disabled` in the error state so the retry control
   takes over.
3. **Focus ring on the wrapper via `:has`.** The wrapper has `overflow:hidden` (to clip the
   image to rounded corners), which would clip a ring drawn on the inner button, so the
   `:focus-visible` ring is applied to the wrapper itself
   (`.wrapper:has(.trigger:focus-visible)`) — an element's own `overflow:hidden` does not
   clip its own `box-shadow`.

## Public API (additions to `ImageProps`)

```ts
import type { MouseEventHandler } from 'react';

export interface ImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'alt' | 'children' | 'src' | 'loading' | 'onClick' // ← add 'onClick' to the Omit
> {
  // …all existing props unchanged (src, alt, objectFit, aspectRatio, size, radius,
  //   fallback, loading)…

  /**
   * Make the image a flush, keyboard-accessible click target — renders the image
   * inside a chromeless `<button>` (no padding/border/background; DS focus ring on
   * `:focus-visible`). Implied when `onClick` is set. Use for a thumbnail that opens
   * a preview/lightbox. The broken-image error state is non-interactive (its retry
   * control takes over).
   */
  interactive?: boolean;
  /**
   * Click handler for the interactive trigger. Setting it implies `interactive`.
   * Fires on click and on Enter/Space (native `<button>` keyboard behavior).
   */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  /**
   * Accessible label for the interactive trigger — action-oriented, e.g.
   * `"Preview report.png"`. Defaults to `alt`. Only used when interactive.
   */
  ariaLabel?: string;
}
```

No new exported type (the props live on the existing `ImageProps`). `ref` continues to
forward to the underlying `<img>` (backward-compatible); the trigger button is internal.

Consumer usage (the `AttachmentsTable` case):

```tsx
<Image
  src={att.url}
  alt={att.filename}
  size="lg"
  objectFit="cover"
  onClick={() => openPreview(att)}
  ariaLabel={`Preview ${att.filename}`}
/>
```

## Render structure

```tsx
const isInteractive = interactive || onClick != null;

return (
  <span className={clsx(styles.wrapper, RADIUS_CLASS[radius], size && SIZE_CLASS[size], className)}
        style={wrapperStyle} data-state={state}>
    {isInteractive ? (
      <button
        type="button"
        className={styles.trigger}
        onClick={onClick}
        aria-label={ariaLabel ?? alt}
        disabled={state === 'error'}
      >
        {imgNode}
        {state === 'loading' && <Skeleton variant="rectangular" className={styles.overlay} />}
      </button>
    ) : (
      <>
        {imgNode}
        {state === 'loading' && <Skeleton variant="rectangular" className={styles.overlay} />}
      </>
    )}

    {state === 'error' && (fallback ?? (/* existing error span with retry Button */))}
  </span>
);
```

Where `imgNode` is the existing `<img {...rest} key ref src alt … onLoad onError />` JSX,
extracted to a `const` so it is the SAME element in both branches. `isInteractive` is
derived from stable props (not from `state`), so it does not change across the
loading→loaded→error lifecycle — the `<img>` never remounts (no refetch). Only the
trigger's `disabled` flips when the state becomes `error`.

Notes:

- `onClick` is destructured out of props (added to the `Omit`), so it does NOT land on the
  `<img>` via `{...rest}`; it routes to the trigger button.
- The error overlay is rendered as a sibling of the trigger in all cases, so its retry
  `<button>` is never a descendant of the trigger `<button>`.

## SCSS (`Image.module.scss` additions)

```scss
@use '../../styles/mixins' as *; // adds focus-ring(); existing @use './Image.tokens' stays

.trigger {
  display: block;
  width: 100%; // fills the wrapper box (Rule 4: 100% OK)
  height: 100%;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  border-radius: inherit; // hug the wrapper's rounded corners
  color: inherit;
}

.trigger:disabled {
  cursor: default;
}

// The wrapper has overflow:hidden, which would clip a ring on the inner button.
// Render the focus ring on the wrapper instead (its own overflow doesn't clip its
// own box-shadow); it follows the wrapper's border-radius.
.wrapper:has(.trigger:focus-visible) {
  @include focus-ring();
}
```

`focus-ring()` resolves to `outline: none; box-shadow: 0 0 0 var(--ring-width) var(--ring-accent)`
(2px accent ring) — the same ring `<Button>` uses. No new token needed.

Rule 4: only `width`/`height: 100%`, `padding: 0`, `border: 0` — no `margin`/`position`/
`top…`/`flex`/`grid`. Clean. (The wrapper already owns `position: relative` for its overlays.)

## Accessibility

- Native `<button type="button">` → focusable, Enter/Space activate, no extra JS.
- Accessible name = `ariaLabel ?? alt` (alt is required, so there is always a name).
- `ariaLabel` is consumer-provided data (like `alt`), so Hard rule 9 (i18n) does NOT apply
  — no new hardcoded library string is introduced.
- Error state: trigger `disabled` (removed from the tab order); the retry button (a
  sibling) is the only focusable control — correct, since a broken image is not a preview
  target.

## Testing (`Image.test.tsx` additions)

- **Non-interactive (default) renders no trigger button** in the loaded state (regression
  guard — existing behavior unchanged).
- `interactive` renders a `<button>` and the `<img>` is a descendant of it.
- `onClick` implies interactive: a `<button>` is rendered; `userEvent.click` on it fires
  the handler; `{Enter}` on the focused button fires it (native button keyboard).
- The trigger's accessible name is `ariaLabel` when provided, else falls back to `alt`
  (`getByRole('button', { name })`).
- **Error state:** fire the `<img>` `onError`; assert the trigger button is `disabled` AND
  the retry button is present and is NOT a descendant of the trigger (no nested buttons).
- `ref` still forwards to the `<img>` (not the button).
- Existing Image tests continue to pass unchanged.

## Packaging (enhancement — NOT the full new-component invariant)

`<Image>` already ships with a demo, route, nav entry, overview card, manifest entry, and
AGENTS section. This change only:

- **Component + tests:** `Image.tsx` (props + render) + `Image.module.scss` (`.trigger` +
  `:has` ring) + `Image.test.tsx` (above).
- **No** `src/index.ts` change (no new exported type; `ImageProps` already exported).
- **No** manifest change (Image is already an entry; it already imports `Button`/`Skeleton`
  so its tier is unchanged).
- **Demo:** add an interactive example to `packages/playground/src/pages/components/ImageDemo.tsx`
  — a clickable ~40px thumbnail that opens a `Modal` preview (the `AttachmentsTable`
  pattern), exercising the real component's interactive path.
- **JSDoc (Rule 7):** add an `@example` (interactive thumbnail → preview) and an
  `@remarks` anti-pattern (don't wrap a `<Button>`/`<Link>` around `<Image>` for a flush
  trigger — use `interactive`; the error state is intentionally non-interactive).
- **AGENTS.md:** extend the `<Image>` TL;DR with the `interactive`/`onClick`/`ariaLabel`
  trigger.

## Risks / decisions (resolved)

- **Nested buttons:** avoided — the trigger wraps only the img + loading skeleton; the
  error overlay (with retry) is always a sibling, and the trigger is `disabled` in error.
- **`<img>` remount / refetch:** avoided — `isInteractive` is derived from stable props, so
  the branch holding the (single, extracted) `imgNode` does not toggle across the load
  lifecycle.
- **Focus ring clipped by `overflow:hidden`:** avoided — ring is on the wrapper via `:has`.
- **`onClick` type:** the base `ImgHTMLAttributes['onClick']` (`HTMLImageElement`) is
  Omit-ed and re-declared as `MouseEventHandler<HTMLButtonElement>` (the trigger is a
  button). Consumers who previously relied on an img-level `onClick` (uncommon) get a
  button-level handler instead — acceptable and documented.
- **`ariaLabel` optional:** defaults to `alt` so the trigger always has a name; an
  action-oriented label is recommended via JSDoc but not required.
