# ImageCrop — "move the box" interaction

Date: 2026-10-20 · Branch: `feat/imagecrop-move-the-box` · Approved by user in chat.

## Why

Today `<ImageCrop>` centers a fixed crop box and the user drags the **image** under it; zoom
is a `<Slider>` below the canvas. The default crop is the largest region that fits, so on one
axis the box already touches the image edges and the image cannot move at all until the user
zooms (e.g. square crop on a portrait photo → no sideways movement). User feedback: "can't move
image freely to right and left", slider at the bottom, "looks not modern".

Chosen direction (user picked prototype A over an Instagram-style alternative): **the image is
still, the crop box moves** — the Photos / Figma model.

## Goals

- Whole image visible and stationary (contain-fit inside the viewport, centered, with padding).
- Crop box draggable anywhere within the image bounds, on both axes, from the first frame.
- Resize via handles; aspect locked when `aspectRatio` is set.
- No slider. Wheel resizes the box. Modern visual (dim outside, L-corners, thirds grid).
- Public data contract unchanged: `CropArea` in source-image pixels, `onChange` /
  `onChangeEnd` semantics, `extractCropBlob`, `useCropPreview`.

## Non-goals

- Zooming/panning the image itself. Rotation. Pinch gestures. Ratio-picker chips (consumer sets
  one `aspectRatio` per screen; add a prop later if a screen needs switching).

## Anti-goals

- Any state where the box can't move on an axis at default position (the bug being fixed).
- A box that can leave the image or produce a `CropArea` outside image bounds.

## Behavior

**Layout.** Image scale `s = min((vpW − 2p)/iw, (vpH − 2p)/ih)` where `p` is a viewport padding
token (builder picks, ~`--space-4`), centered. Image rendered via transform as today
(keep the `max-width: none` override). Viewport keeps `min-height: 320px`. Toolbar floats over
the canvas bottom; image fit area must not sit under the toolbar (reserve its height at the
bottom, as the prototype does).

**Default crop** (when `value === null`): centered box with `aspectRatio` (or the image's own
ratio when free), sized to **80%** of the largest such box that fits in the image. Fired once via
`onChange` exactly as today. _(My call — 100% would recreate the locked-axis bug.)_

**Drag box.** Pointer down inside the box → move. Clamped to image bounds. Pointer capture as
today. `onChange` per move, `onChangeEnd` on pointerup.

**Resize.** 4 corner handles always; with free aspect also 4 edge handles. Opposite corner/edge is
the anchor. With `aspectRatio`, keep ratio and clamp to image bounds without breaking the ratio.
Minimum box size: 32 viewport px on the shorter side _(my call)_. Pointer down outside the box does
nothing _(my call)_.

**Wheel** over the viewport: scale the box ±6% per tick around its center, clamped to image
bounds and the minimum; `preventDefault` only while the pointer is over the viewport (non-passive
listener). `onChangeEnd` fires debounced (~200ms after the last wheel tick) _(my call)_.

**Double-click** in the viewport: reset to the default crop (fires `onChange` + `onChangeEnd`).

**Toolbar**: floating pill, centered at the bottom of the viewport, single **Reset** button
(`Button`/`IconButton` from the library, i18n label `imageCrop.reset`). Hidden while
loading/error; disabled when `disabled`.

**Visuals**: box outline; outside dimmed with the existing box-shadow scrim; L-shaped corner
handles; rule-of-thirds grid visible only while dragging/resizing. Cursors: `move` on box, resize
cursors on handles. All values through `ImageCrop.tokens.scss`; existing scrim raw value keeps
its stylelint disable.

**Keyboard** (viewport focused, as today `tabIndex=0`): Arrows move box 5 source px; Shift+Arrows
resize (grow right/down with Right/Down, shrink with Left/Up; ratio-locked when `aspectRatio` set);
Home/End move box to top-left / bottom-right. Each key fires `onChange` and `onChangeEnd`. PageUp/
PageDown removed.

**A11y**: viewport gets `role="group"` + `aria-label` (i18n `imageCrop.label`, "Crop area") and an
`aria-describedby` hint with the keyboard instructions (i18n). No live region _(my call — position
changes are continuous and would be noisy; transient-state skill only applies to loading/error,
which keep current behavior)_.

**Unchanged**: object-URL lifecycle, load/error/skeleton, ResizeObserver, `disabled` (dims, no
interaction), the #574 render-time src reset, `{...rest}` spread.

**`aspectRatio` changing at runtime**: same documented behavior as today (does not refit `value`).

## API change (breaking → 0.6.0)

Remove `minZoom`, `maxZoom`, `showZoomControl` from `ImageCropProps` and the `imageCrop.zoom`
i18n key (en/ru/messages). Add i18n keys `reset`, `label`, `keyboardHint`.

Release: latest tag is `v0.5.35`. Set `BUMP: minor` in `.github/workflows/release.yml` in this PR
→ publishes **0.6.0** (user's choice; matches repo precedent of breaking changes as 0.x minors).
Immediately after the release, a follow-up PR returns `BUMP` to `patch`
(precedent: #575 "chore(release): return BUMP to patch after v0.5.0").

CRM migration: checked `../eocrm` — single use, `apps/web/src/account/ProfileTab.tsx:195`
(`<ImageCrop src={file} value={crop} onChange={setCrop} aspectRatio={1} />` in a Modal, avatar
flow); passes none of the removed props, and its test mocks ImageCrop. No CRM change needed. Still add a **Breaking in 0.6.0** note at the top of
`docs/components/ImageCrop.md`: delete `minZoom` / `maxZoom` / `showZoomControl` (no replacement);
the component is shorter (no slider row) and now shows a floating Reset button.

## Ripple (per repo invariant)

- `ImageCrop.test.tsx`: replace zoom/pan-image tests with box drag, corner resize (locked + free),
  edge resize (free only), clamp at edges, default 80% crop, wheel, double-click reset, Reset
  button, keyboard (move, Shift-resize, Home/End), disabled no-ops. Keep load/error/src tests.
- `ImageCrop.md` rewrite of interaction bullets + hard rules; `npm run build:docs`.
- Playground `ImageCropDemo.tsx` descriptions (drop "Pattern-A", slider, "canvas" wording);
  `SliderDemo.tsx` line 340 drops the "canonical ImageCrop zoom control" mention.
- `SVSquare.tsx` comments referencing ImageCrop: check they still hold.
- `overviewSchematics.tsx` schematic if it draws a slider.
- Manifest (`manifest.ts` + `generate-manifest.mjs`) unchanged unless description text changes;
  run `npm run build:manifest` regardless. AI-PRIMER line OK as is.

## Left to the builder

Exact token names/values, handle hit-area size (≥ 24px touch target suggested), internal code
structure, whether the box is one element with child handles (prototype) or otherwise.

Reference prototype: `.superpowers/brainstorm/*/content/crop-directions-v2.html` (option A).
