# `<MediaTile>` — media tile with revealed overlay bars — Design

**Status:** design approved (user said "yes"), ready for plan
**Date:** 2026-06-24
**Component:** `@eocrm/design-system` → `src/components/MediaTile/` (new component)
**Resolves:** GitHub issue eocrm/design-system#200

## Goal

A DS-clean media tile for gallery / file-grid views: a full-bleed image (or a centered
file-type icon) as the body, a **top bar (name + size)** and a **bottom bar (controls)**,
each over a **semi-opaque gradient gray scrim** for legibility, **revealed on hover /
keyboard focus** (so the image isn't permanently cluttered). The driving consumer is
`apps/web`'s Files module — the Masonry **Tiles** view of attachments. Replaces the
`apps/web/src/shared/ds-shims/HoverReveal.tsx` shim.

## Resolved decisions (from brainstorm)

1. **Focused `<MediaTile media title meta actions>`** (slots), NOT a generic `Overlay`/
   compound. Matches the Files-tiles consumer 1:1; clear, discoverable name.
2. **Top bar = `title` (name, left, truncates) + `meta` (size, right); bottom bar =
   `actions` (controls, centered).** Each bar sits on a gradient gray scrim and renders
   only when it has content.
3. **`revealOn: 'hover' | 'focus' | 'visible'`, default `'hover'`.**
   - `'hover'` — revealed on pointer hover OR keyboard focus-within (focus ALWAYS included
     for a11y).
   - `'focus'` — revealed only on focus-within (no mouse-over reveal).
   - `'visible'` — always shown.
4. **Keyboard-accessible reveal via `opacity` (not `visibility`/`display`)** so the action
   buttons stay in the tab order — tabbing in fires `:focus-within` → reveal.

## Architecture

```
src/components/MediaTile/
  MediaTile.tsx          ← (new) forwardRef<HTMLDivElement> + spread; root + two bars
  MediaTile.module.scss  ← (new) relative root, gradient scrim bars, reveal selectors
  MediaTile.tokens.scss  ← (new) --mediatile-* → primitives
  MediaTile.test.tsx     ← (new)
  index.ts               ← (new)
```

`<MediaTile>` is presentational — a `<div>` container. It imports only `clsx` (tier
`primitive`). It composes WITH `<Image>` / `<Button>` (the consumer passes them in slots)
but doesn't import them.

## Public API

```ts
import type { HTMLAttributes, ReactNode } from 'react';

/** When the overlay bars reveal. */
export type MediaTileReveal = 'hover' | 'focus' | 'visible';
/** Corner rounding (clips the media). */
export type MediaTileRadius = 'none' | 'sm' | 'md' | 'lg';

export interface MediaTileProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> {
  /** Tile body — full-bleed media (an `<Image>`, or a centered file-type icon). */
  media: ReactNode;
  /** Top-bar leading content (e.g. the file name). Truncates with an ellipsis. */
  title?: ReactNode;
  /** Top-bar trailing content (e.g. the file size). Sits at the end of the row. */
  meta?: ReactNode;
  /** Bottom-bar controls (e.g. preview / download / delete icon buttons), centered. */
  actions?: ReactNode;
  /**
   * When the bars + scrims reveal. Default `'hover'`.
   * - `'hover'` — on pointer hover OR keyboard focus-within (focus always included for a11y).
   * - `'focus'` — only on focus-within (no mouse-over reveal).
   * - `'visible'` — always shown.
   */
  revealOn?: MediaTileReveal;
  /** Corner rounding (clips the media). Default `'md'`. */
  radius?: MediaTileRadius;
}

export const MediaTile: React.ForwardRefExoticComponent<
  MediaTileProps & React.RefAttributes<HTMLDivElement>
>;
```

Note: the native `title` HTML attribute is `Omit`-ed from the base so our `title` slot
(ReactNode) doesn't collide with the tooltip-string `title`.

Consumer usage (the Files masonry):

```tsx
<Masonry minColumnWidth="180px" gap="sm">
  {files.map((f) => (
    <MediaTile
      key={f.id}
      media={<Image src={f.thumbUrl} alt={f.name} aspectRatio={1} objectFit="cover" />}
      title={f.name}
      meta={formatBytes(f.size)}
      actions={
        <Cluster gap="xs">
          <Button iconOnly variant="ghost" size="sm" aria-label={`Preview ${f.name}`} onClick={...}>
            <Maximize2 size={16} />
          </Button>
          <Button iconOnly variant="ghost" size="sm" aria-label={`Download ${f.name}`} onClick={...}>
            <Download size={16} />
          </Button>
          <Button iconOnly variant="ghost" size="sm" aria-label={`Delete ${f.name}`} onClick={...}>
            <Trash2 size={16} />
          </Button>
        </Cluster>
      }
    />
  ))}
</Masonry>
```

## Render structure

```tsx
const hasTopBar = title != null || meta != null;
return (
  <div
    ref={ref}
    className={clsx(
      styles.root,
      styles[`radius-${radius}`],
      styles[`reveal-${revealOn}`],
      className,
    )}
    {...rest}
  >
    <div className={styles.media}>{media}</div>

    {hasTopBar && (
      <div className={clsx(styles.bar, styles.barTop)}>
        {title != null && <span className={styles.title}>{title}</span>}
        {meta != null && <span className={styles.meta}>{meta}</span>}
      </div>
    )}

    {actions != null && <div className={clsx(styles.bar, styles.barBottom)}>{actions}</div>}
  </div>
);
```

- The bars are ALWAYS rendered when they have content (not conditionally on hover) — the
  reveal is pure CSS (opacity), so the action buttons stay tabbable. A bar with no content
  is omitted entirely (no empty scrim).
- `{...rest}` last (Pattern A) — consumer can add `onClick`, `data-*`, etc. to the tile.

## SCSS (`MediaTile.module.scss`)

```scss
@use './MediaTile.tokens';

// stylelint-disable property-disallowed-list -- internal overlay positioning, not consumer layout

.root {
  position: relative;
  overflow: hidden;
  display: block;
}

.radius-none {
  border-radius: var(--mediatile-radius-none);
}
.radius-sm {
  border-radius: var(--mediatile-radius-sm);
}
.radius-md {
  border-radius: var(--mediatile-radius-md);
}
.radius-lg {
  border-radius: var(--mediatile-radius-lg);
}

.media {
  display: block;
}

.bar {
  position: absolute;
  inset-inline: 0;
  display: flex;
  align-items: center;
  gap: var(--mediatile-bar-gap);
  padding: var(--mediatile-bar-padding);
  color: var(--mediatile-fg);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--mediatile-reveal-transition);
}

.barTop {
  inset-block-start: 0;
  background: linear-gradient(to bottom, var(--mediatile-scrim), transparent);
}

.barBottom {
  inset-block-end: 0;
  justify-content: center;
  background: linear-gradient(to top, var(--mediatile-scrim), transparent);
}

// Reveal models — apply per `revealOn` modifier class on the root.
.reveal-hover:hover .bar,
.reveal-hover:focus-within .bar,
.reveal-focus:focus-within .bar,
.reveal-visible .bar {
  opacity: 1;
  pointer-events: auto;
}

.title {
  flex: 1;
  min-width: 0; // allow truncation
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: var(--mediatile-title-size);
  font-weight: var(--mediatile-title-weight);
}

.meta {
  flex: none;
  font-size: var(--mediatile-meta-size);
  opacity: var(--mediatile-meta-opacity);
}

@media (prefers-reduced-motion: reduce) {
  .bar {
    transition: none;
  }
}
```

Rule 4: the only positioned elements are the component's OWN internal overlay bars
(`position: relative` root + `position: absolute` bars) — the same overlay-child exception
`Image.module.scss` / `Modal.module.scss` already use, with the justified
`stylelint-disable`. Logical `inset-inline` / `inset-block-*` (RTL-aware). No `margin`, no
consumer-facing `width`/layout. (If stylelint's property-disallowed-list also flags
`inset-inline`/`inset-block-*`, the file-level `stylelint-disable property-disallowed-list`
at the top covers them; keep it scoped to this file.)

## Tokens (`MediaTile.tokens.scss`)

```scss
:root {
  --mediatile-radius-none: 0;
  --mediatile-radius-sm: var(--radius-sm);
  --mediatile-radius-md: var(--radius-md);
  --mediatile-radius-lg: var(--radius-lg);

  // Semi-opaque slate scrim behind the bars (fades to transparent toward the center).
  --mediatile-scrim: rgb(15 23 42 / 72%);
  --mediatile-fg: var(--color-fg-on-overlay); // #fff — text/controls on the scrim

  --mediatile-bar-gap: var(--space-2);
  --mediatile-bar-padding: var(--space-2);
  --mediatile-reveal-transition: var(--transition-fast);

  --mediatile-title-size: var(--font-size-sm);
  --mediatile-title-weight: var(--font-weight-semibold);
  --mediatile-meta-size: var(--font-size-xs);
  --mediatile-meta-opacity: var(--opacity-muted, 0.8);
}
```

(`--color-fg-on-overlay` already exists in `tokens.scss`. Verify `--font-weight-semibold`
and `--opacity-muted` exist; if not, use the literal weight token that does — e.g.
`--font-weight-600` — or hoist a token. The `, 0.8` fallback covers a missing
`--opacity-muted`.)

## Accessibility

- Purely presentational `<div>` — imposes no `role`/ARIA. Accessibility comes from the
  consumer's slots: `media` (an `<Image alt>`), the visible `title`/`meta` text, and the
  `actions` (`<Button iconOnly aria-label>`).
- **Keyboard reveal:** bars are `opacity: 0` (NOT `visibility/display`), so their buttons
  remain focusable + in the tab order. `revealOn='hover'`/`'focus'` both reveal on
  `:focus-within`, so tabbing to a control shows the bar and makes it interactive
  (`pointer-events: auto`). `revealOn='visible'` is always shown.
- No new i18n strings (all text is consumer data).

## Testing (`MediaTile.test.tsx`)

- Renders the `media`; renders `title`/`meta` in the top bar and `actions` in the bottom bar.
- The bars are present in the DOM at rest (not conditionally rendered) — assert the action
  buttons exist without any hover, proving they're tabbable (reveal is CSS-only).
- Default `revealOn='hover'` → root has the `reveal-hover` class; `'focus'`/`'visible'` →
  the matching class.
- Default `radius='md'` → `radius-md` class; other values map correctly.
- No `title` and no `meta` → no top bar element; no `actions` → no bottom bar element.
- `ref` forwarded to the root `<div>`.
- `className` merged, not replaced; arbitrary HTML attrs (`data-*`, `onClick`) spread.
- (The hover/focus opacity reveal + gradient scrim are CSS — verified in the browser, not
  jsdom.)

## Packaging (Core invariant — new component)

- Component + tests beside it.
- **Exports** `src/index.ts`: `MediaTile`, `MediaTileProps`, `MediaTileReveal`,
  `MediaTileRadius`.
- **Manifest CLUSTERS:** `MediaTile: 'Display'` in BOTH `src/_meta/manifest.ts` and
  `scripts/generate-manifest.mjs`; then `npm run build:manifest` (entry: `tier: "primitive"`,
  `cluster: "Display"`). Commit the regenerated JSON.
- **Demo** `packages/playground/src/pages/components/MediaTileDemo.tsx`: a `<Masonry>` of
  file tiles — mostly images (`<Image aspectRatio>`), plus one non-image tile with a
  centered file-type icon — each with `title` (name) + `meta` (size) + `actions`
  (preview/download/delete `<Button iconOnly>`); plus a small example row showing the three
  `revealOn` modes side by side. Wire into `App.tsx` route `/components/media-tile`,
  `navItems.ts` **Display** group, `ComponentsIndex.tsx` overview card, `registry.ts`
  `ComponentName` union (`'MediaTile'`).
- **JSDoc (Rule 7):** description + `@example` (the Files masonry) + `@remarks` anti-patterns
  (don't use for a non-revealing media block — that's just `<Image>` in a `<Card>`; don't
  put the only copy of critical info in a hover-revealed bar; actions need `aria-label`s;
  the body sizing is the `media`'s job).
- **AGENTS.md** TL;DR in the Display area.
- **i18n:** none.

## Risks / decisions (resolved)

- **Keyboard accessibility:** `opacity`-based reveal + `:focus-within` keeps controls
  tabbable and reveals them on focus — the issue's hard requirement. Verified in tests
  (buttons present at rest) + browser (focus reveals).
- **Body sizing is the consumer's job** — `MediaTile` is a relative wrapper that clips to
  its radius; the `media` (`<Image aspectRatio>` or a fixed-height icon box) owns the tile's
  natural aspect for masonry. MediaTile imposes no aspect.
- **Scrim raw value** lives in `MediaTile.tokens.scss` (component tokens are the sanctioned
  place); `--mediatile-fg` reuses the existing `--color-fg-on-overlay`.
- **`title` collision** with the native HTML `title` attr — resolved by `Omit<…, 'title'>`.
