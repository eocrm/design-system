# ImageCrop — design spec

**Date:** 2026-05-24
**Branch:** `feat/image-crop-and-docs`
**Scope:** Add `<ImageCrop>` to `@eocrm/design-system` — a controlled, inline image-crop primitive built on `<canvas>` with Pattern-A drag (centered crop box, draggable image, slider-controlled zoom). Bundles a small docs correction removing stale TanStack-Table references (DataTable shipped hand-rolled, NOT a TanStack wrapper).

## Goal

Ship the library's first image-cropping primitive so the CRM can crop avatars, deal images, and attachment thumbnails without hand-rolling canvas math per page. Composes with `<Slider>` (PR #58) for zoom and the existing `<Modal>` for the canonical "FileUpload → crop → save" flow.

## Why now

- The CRM is about to add profile-photo upload (contact + user avatars) and deal-attachment thumbnails. Both need crop.
- `<Slider>` just merged (PR #58) — the zoom-control pre-req is in place.
- `<FileUpload>` (PR #57) handles file picking but stops at "consumer owns the upload." Adding an image-crop primitive completes the picker → crop → upload triangle.

## Why bundled with the docs correction

The Slider spec's "Follow-up tasks" section flagged a docs correction: references to TanStack Table as a dep of DataTable are stale (DataTable shipped hand-rolled). Two source-of-truth files need editing:

1. `packages/design-system/CLAUDE.md:194` — "Components we don't have yet" wishlist still lists `Table (TanStack Table headless is acceptable here ...)`. Both `Table` AND `DataTable` have shipped; the entry is stale.
2. `packages/design-system/src/components/Table/Table.tsx:173` — JSDoc says "DataTable composes this primitive + TanStack Table headless." DataTable shipped without TanStack.

User asked to bundle this correction into the ImageCrop PR. Trade-off acknowledged: a trivial docs fix is hostage to the ImageCrop HR8 cycle. Defensible because the docs fix is small (one wishlist removal + one JSDoc edit) and a separate PR for ~5 lines of edits is its own ceremony cost.

Historical spec/plan files in `docs/superpowers/` are immutable artifacts of past sessions and are NOT edited.

## Non-goals (v1)

- **No multi-touch / pinch-zoom.** Single-pointer drag for the image; zoom via the embedded `<Slider>` only.
- **No rotation.** Defer; consumer rotates server-side or uses a future v2.
- **No drag-resize of the crop box.** Pattern A (crop box centered, image dragged) — the box itself is fixed in viewport space per `aspectRatio`. Resize-by-dragging-corners is Pattern B, deferred.
- **No inline edit handles.** No corner / edge handles to drag.
- **No `<ImageCropModal>` wrapper.** Inline-only. Consumers compose `<Modal>` + `<ImageCrop>` + `<Button>` themselves — the modal save handler is consumer-specific (network code, abort, error handling).
- **No FileUpload integration.** `<FileUpload>` and `<ImageCrop>` ship independently; consumers wire them together (drop file → open Modal → render ImageCrop with the picked File).
- **No grid overlay / rule-of-thirds lines.** Could add later; not in v1.
- **No `circular crop` / `roundCrop` mode.** Rectangular only. Consumers wanting a circular avatar render with a CSS mask after cropping.
- **No EXIF orientation handling.** Browsers handle this for `<img>` natively (after Chrome 81, Firefox 77, Safari 13.1). Consumer pre-corrects if they need to support older browsers.
- **No imperative ref API.** No `<ImageCrop ref>` with `.getBlob()` etc. The extraction utility is a top-level export.
- **No internal state-machine for upload progress.** ImageCrop only handles the crop UI; consumer owns the save+upload network.

## Architecture

### Dependencies

No new packages. Reuses:

- React (peer)
- `clsx` (existing dep)
- `<Slider>` (PR #58) for the zoom control
- `<Skeleton>` for the image-loading placeholder
- Existing tokens: `--color-accent`, `--color-bg`, `--color-bg-muted`, `--color-fg`, `--color-fg-muted`, `--color-border`, `--color-danger`, `--space-2`, `--space-3`, `--radius-md`, `--border-width`, `--transition-base`, `--shadow-sm`, `--opacity-disabled`.

No new tokens needed.

### File layout

```
packages/design-system/src/components/ImageCrop/
  ImageCrop.tsx                ← root component (canvas + image render, drag math, zoom slider integration)
  ImageCrop.module.scss        ← .root + .viewport + .image + .cropBox + .errorState + .skeleton
  ImageCrop.test.tsx           ← ~22 cases
  extractCropBlob.ts           ← top-level exported utility (canvas extraction, MIME + quality + resize)
  index.ts                     ← exports ImageCrop + extractCropBlob + CropArea + ImageCropProps + ExtractCropOptions

packages/design-system/src/index.ts                                ← MODIFY: re-exports
packages/design-system/AGENTS.md                                   ← MODIFY: add ImageCrop section after Slider (Forms cluster)
packages/design-system/CLAUDE.md                                   ← MODIFY: remove stale Table/TanStack wishlist line
packages/design-system/src/components/Table/Table.tsx              ← MODIFY: JSDoc — drop "+ TanStack Table headless"

packages/playground/src/pages/components/ImageCropDemo.tsx         ← NEW
packages/playground/src/App.tsx                                    ← MODIFY: route
packages/playground/src/layout/AppShell/AppShell.tsx               ← MODIFY: Forms group (between Input and PasswordInput alphabetically)
packages/playground/src/pages/components/ComponentsIndex.tsx       ← MODIFY: card
packages/playground/src/pages/mockups/registry.ts                  ← MODIFY: extend ComponentName union with 'ImageCrop'
```

### Composition example

```tsx
function ProfilePhotoCrop({ file, onComplete }: { file: File; onComplete: (blob: Blob) => void }) {
  const [crop, setCrop] = useState<CropArea | null>(null);

  const handleSave = async () => {
    if (!crop) return;
    const blob = await extractCropBlob(file, crop, {
      type: 'image/jpeg',
      quality: 0.9,
      outputWidth: 512,
    });
    onComplete(blob);
  };

  return (
    <Modal isOpen onClose={() => { /* consumer-owned */ }}>
      <Modal.Header>Crop your photo</Modal.Header>
      <Modal.Body>
        <ImageCrop src={file} value={crop} onChange={setCrop} aspectRatio={1} />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary">Cancel</Button>
        <Button onClick={handleSave} disabled={!crop}>Save</Button>
      </Modal.Footer>
    </Modal>
  );
}
```

## Public API

### Types

```ts
import type { HTMLAttributes } from 'react';

/** Crop region in SOURCE-IMAGE pixel coordinates (not viewport pixels). */
export interface CropArea {
  /** Top-left X in source-image pixels. */
  x: number;
  /** Top-left Y in source-image pixels. */
  y: number;
  /** Crop width in source-image pixels. */
  width: number;
  /** Crop height in source-image pixels. */
  height: number;
}

export interface ImageCropProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /**
   * Image source. String URLs (HTTP/HTTPS, data:, blob:) pass through.
   * File/Blob are normalized to object URLs internally via
   * `URL.createObjectURL()`, with cleanup on unmount and `src` change.
   */
  src: string | File | Blob;
  /**
   * Controlled crop area in source-image pixel coordinates. Pass `null` to
   * use the component's default centered crop (the largest centered region
   * matching `aspectRatio` at zoom=1). The component computes the visual
   * position from this + the image's natural size + the viewport size.
   */
  value: CropArea | null;
  /** Fires on every drag/zoom tick. High frequency. */
  onChange: (area: CropArea) => void;
  /** Fires once when the user releases the drag or releases the zoom slider thumb. */
  onChangeEnd?: (area: CropArea) => void;
  /**
   * Fixed aspect ratio for the crop box (e.g. `1` for square, `16/9` for
   * landscape, `4/3` for traditional photo). Omit for free aspect — the crop
   * box fills the entire viewport and the user controls the cropped region
   * via zoom only.
   */
  aspectRatio?: number;
  /** Minimum zoom level. Default `1` (image fits viewport at zoom=1). */
  minZoom?: number;
  /** Maximum zoom level. Default `3`. */
  maxZoom?: number;
  /**
   * Render the embedded `<Slider>` zoom control below the canvas. Default
   * `true`. Set `false` for a pure canvas with no UI; consumers wanting a
   * custom zoom UI render their own and pass nothing — but the component's
   * internal zoom state isn't exposed (this is a v2 feature).
   */
  showZoomControl?: boolean;
  /**
   * Disable all interaction (drag, zoom). Default `false`. Image still
   * renders; the zoom slider is also disabled.
   */
  disabled?: boolean;
}

export interface ExtractCropOptions {
  /** Output MIME type. Default `'image/png'` (lossless). */
  type?: 'image/png' | 'image/jpeg' | 'image/webp';
  /** Encoding quality for lossy formats (0..1). Default `0.92`. Ignored for PNG. */
  quality?: number;
  /**
   * Resize the output to this width in pixels (height proportional). Omit to
   * keep the source-pixel crop dimensions (no resize). Useful for capping
   * avatar uploads (e.g. `outputWidth: 512` for a 512×512 max).
   */
  outputWidth?: number;
}
```

### Exported utility

```ts
/**
 * Extract the cropped region of an image as a Blob via an off-screen canvas.
 *
 * Accepts the same `src` shape as `<ImageCrop>` (string URL, File, or Blob)
 * and a `CropArea` in source-image pixel coordinates. Returns a Promise
 * resolving to a Blob with the configured type/quality/resize.
 *
 * Used as the "Save handler" recipe — the consumer's submit code calls this
 * to produce the cropped Blob, then uploads to their backend / S3 / etc.
 */
export async function extractCropBlob(
  src: string | File | Blob,
  area: CropArea,
  options?: ExtractCropOptions,
): Promise<Blob>;
```

### Internal-only state shape (NOT exposed)

The component holds three pieces of internal state:

- `imageNatural: { width: number; height: number } | null` — populated when the `<img>` finishes loading.
- `zoom: number` — current zoom level. Initialized from `value` (or 1 if `value=null`).
- `loadState: 'loading' | 'loaded' | 'error'` — drives the loading skeleton vs error message vs canvas.

The drag state (image translation) is computed each render from `value` + `imageNatural` + viewport, not held as state. During an active drag, a `useRef` tracks the in-progress crop area before committing via `onChange`.

## Drag math

### Pattern A coordinate systems

Three coordinate spaces are in play:

- **Source-image pixels** — natural dimensions of the loaded image (e.g. 4000×3000).
- **Viewport pixels** — the rendered container's dimensions (e.g. 800×600 in the modal).
- **Image-rendered pixels** — the image as visually rendered (source dimensions × current zoom).

### Crop box dimensions in viewport

Given viewport `(vw, vh)` and `aspectRatio` (or undefined for free):

- If `aspectRatio` is set: crop box is the largest centered rectangle inside the viewport matching the ratio. `boxW = min(vw, vh * aspectRatio)`, `boxH = boxW / aspectRatio`.
- If `aspectRatio` is undefined (free): crop box = viewport. `boxW = vw, boxH = vh`.

### Value-to-render conversion

Given the consumer's `value: CropArea` (in source-image pixels), image natural `(iw, ih)`, viewport `(vw, vh)`, and crop-box dimensions `(boxW, boxH)`:

- **Compute the visual scale**: `scale = boxW / value.width` (equivalent: `boxH / value.height` — both must agree if aspect ratio is respected).
- **Compute the image's visual position**: the source point `(value.x, value.y)` must map to the box's top-left in viewport space. Box top-left = `((vw - boxW) / 2, (vh - boxH) / 2)`. So image origin in viewport = `(boxLeft - value.x * scale, boxTop - value.y * scale)`.
- **Image rendered with**: `transform: translate(originX, originY) scale(scale)`. Or set `width` / `height` to the scaled dimensions and use `left` / `top` translations.

### Drag handler

On `pointerdown` on the image:

1. `setPointerCapture` (try/catch for jsdom safety, same pattern as Slider).
2. Track `dragStart` = `(clientX, clientY)`.
3. Snapshot the current `value` as `dragStartValue`.

On `pointermove`:

1. Compute `dx = clientX - dragStart.x`, `dy = clientY - dragStart.y` (viewport pixels).
2. Convert to source-image pixels: `dxSource = -dx / scale`, `dySource = -dy / scale`. (Sign flip — moving the pointer right pans the image left, which moves the crop region right.)
3. Compute next `value`: `{ x: dragStartValue.x + dxSource, y: dragStartValue.y + dySource, width, height }` (width/height unchanged during drag).
4. **Clamp**: `value.x` must satisfy `0 <= value.x <= iw - value.width`. Same for `value.y`. Out-of-bounds drags clamp at the edge — the user can't drag the image off the viewport.
5. Fire `onChange(clamped)`.

On `pointerup`:

1. `releasePointerCapture` (try/catch).
2. Fire `onChangeEnd(value)`.

### Zoom handler

The embedded `<Slider>` controls internal `zoom` state. On zoom change:

1. Compute new `value.width = boxW / newZoom`, `value.height = boxH / newZoom`. (Higher zoom → smaller crop region.)
2. Clamp `value.x` and `value.y` so the new (smaller) region still fits. Center the new region on the previous region's center if possible.
3. Fire `onChange(newValue)`.

### Keyboard handler

On the canvas root with `tabIndex={0}` and focus:

- `ArrowLeft` / `ArrowRight` / `ArrowUp` / `ArrowDown`: pan by 5px in source-image pixels (matches the visual feel of typical image editors).
- `Home`: pan to (0, 0) — crop region snaps to top-left of image.
- `End`: pan to bottom-right (`x = iw - value.width`, `y = ih - value.height`).
- `PageUp` / `PageDown`: zoom by ±0.25 (sent through the embedded Slider).

## Styling — `ImageCrop.module.scss`

```scss
.root {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
}

.viewport {
  position: relative;
  background: var(--color-bg-muted);
  border-radius: var(--radius-md);
  overflow: hidden;
  // Reserve canvas space before image loads so the layout doesn't shift.
  // Consumer can override via className.
  min-height: 320px;
  // Prevent accidental browser selection of the image during drag.
  user-select: none;
  -webkit-user-select: none;
}

.image {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  cursor: grab;
  // Disable native image dragging (Firefox; Chrome respects pointer events).
  -webkit-user-drag: none;
}

.imageDragging {
  cursor: grabbing;
}

.cropBox {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border: var(--border-width) solid var(--color-accent);
  box-shadow: 0 0 0 9999px rgb(0 0 0 / 50%);
  pointer-events: none;
  // The box covers the centered crop region; the box-shadow trick produces
  // a darkened backdrop everywhere else without an extra DOM element.
}

.skeleton {
  position: absolute;
  inset: 0;
}

.errorState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4);
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  text-align: center;
}

.zoomControl {
  width: 100%;
}

.disabled .viewport {
  opacity: var(--opacity-disabled);
}

.disabled .image {
  cursor: not-allowed;
  pointer-events: none;
}
```

**Rule 4 check:**

- `.root width: 100%` — intrinsic, allowed.
- `.viewport position: relative + min-height: 320px` — internal-anchor positioning for the absolute children (image, cropBox, skeleton, errorState). Standard internal-positioning carve-out (same as Avatar's `.presence`, CircularProgress's centered label). `min-height` is internal child sizing to prevent collapse before image load.
- `.image position: absolute + top/left: 0` — internal positioning for the draggable image inside `.viewport`.
- `.cropBox position: absolute + top: 50% / left: 50% / transform: translate(-50%, -50%)` — centered child of `.viewport`. Internal positioning.
- `.skeleton position: absolute + inset: 0` — fills `.viewport`.
- No `margin` at boundary. No `flex: 1`. No `width` other than `100%`.

The `box-shadow: 0 0 0 9999px rgb(0 0 0 / 50%)` on `.cropBox` is the canonical "darkened backdrop" trick that avoids adding a 4th DOM element (a separate overlay div). The 9999px spread paints the dim color everywhere outside the box. `pointer-events: none` ensures the dim layer doesn't intercept drag events on the image below.

`rgb(0 0 0 / 50%)` is a raw RGB value — flag this for the spec compliance reviewer. The alternative is a token `--color-overlay-50` which doesn't exist; adding a new token for this single use is overkill. Inline `// stylelint-disable-next-line scale-unlimited/declaration-strict-value -- one-off overlay paint with no token equivalent` is the right call.

## ARIA + behavior reference

| Concern                | Behavior                                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Root element**       | Plain `<div>` with `tabIndex={0}` (for keyboard focus + drag). No locked role — image cropping has no WAI-ARIA contract role.                                          |
| **Image element**      | Native `<img>` with `alt=""` (decorative; the cropping interaction IS the meaning). Consumer can override `alt` via root spread if they want a screen-reader description. |
| **Crop box**           | Pure visual marker (`pointer-events: none`). Not announced to SR.                                                                                                       |
| **Zoom slider**        | Embedded `<Slider>` carries its own ARIA (role=slider, aria-valuemin/max/now). `aria-label="Zoom"` set by ImageCrop.                                                    |
| **Drag**               | Pointer events on the image. `setPointerCapture` wrapped in try/catch (jsdom safety).                                                                                  |
| **Keyboard**           | Arrow keys pan image by 5px in source coords. Home/End jump to top-left / bottom-right. PageUp/Down zoom by 0.25. preventDefault to suppress page scroll.               |
| **Loading state**      | `<Skeleton variant="rectangular" />` fills the viewport until image's `onload` fires.                                                                                  |
| **Error state**        | Image error event sets `loadState='error'`; viewport shows danger-toned message ("Couldn't load image") in `.errorState`. No retry button in v1 — consumer remounts.   |
| **Disabled**           | Drag handlers no-op. Zoom slider receives `disabled`. Viewport opacity dimmed. Image cursor: not-allowed.                                                                |
| **Object URL cleanup** | When `src` is File/Blob, `URL.createObjectURL(src)` is created in useEffect, revoked in cleanup AND on `src` change. Prevents memory leak.                              |

## Testing

`ImageCrop.test.tsx` (~25 cases):

### Rendering / loading

1. Renders the viewport container with the image element
2. Shows `<Skeleton>` while image is loading (image `naturalWidth === 0`)
3. Replaces skeleton with image once `onload` fires
4. Shows error message when image fails to load
5. `disabled` adds the `.disabled` class and disables zoom slider

### Object URL lifecycle (mocked URL.createObjectURL)

6. `src` as File: calls `URL.createObjectURL(file)` once
7. `src` as Blob: same
8. `src` as string: does NOT call `createObjectURL`
9. Unmount: calls `URL.revokeObjectURL(url)`
10. `src` change from File-A to File-B: revokes A, creates B

### Crop area / value handling

11. `value=null` initial: component computes default centered crop and fires `onChange` once with the default
12. Controlled `value`: component renders the image positioned per the value
13. `aspectRatio=1` with `value=null`: default crop is square (boxW === boxH)
14. `aspectRatio` undefined (free): default crop matches viewport aspect

### Drag

15. Pointerdown on image starts drag (adds `.imageDragging` class)
16. Pointermove during drag fires `onChange` with the new value (x/y shifted, width/height unchanged)
17. Pointerup ends drag and fires `onChangeEnd`
18. Drag clamps so `value.x` stays in `[0, iw - width]` and `value.y` stays in `[0, ih - height]`
19. `disabled`: pointerdown does not start drag

### Zoom

20. Embedded `<Slider>` `onChange` updates the crop area `width` and `height` (smaller when zoom increases)
21. Zoom recomputes `value.x` / `value.y` to stay within bounds after the dimension change
22. `showZoomControl=false`: no slider rendered

### Utility

23. `extractCropBlob(stringSrc, area)` returns a Blob with the correct dimensions (mocked canvas in tests; verify via `canvas.getContext('2d').drawImage` call args)
24. `extractCropBlob` with `outputWidth=200` returns a Blob proportionally resized
25. `extractCropBlob` with `type='image/jpeg', quality=0.5` passes those args to `canvas.toBlob`


## Demo additions

`ImageCropDemo.tsx` — 5 examples:

1. **Basic (square)** — `aspectRatio={1}`, default zoom, default crop. Drag and zoom.
2. **Landscape (16:9)** — `aspectRatio={16/9}`. Demonstrates non-square ratio.
3. **Free aspect** — `aspectRatio` omitted. Crop box fills viewport.
4. **File-input integration** — small demo wiring a `<FileUpload>` → renders `<ImageCrop>` on the picked file → Save button → calls `extractCropBlob` and shows the resulting Blob URL in a thumbnail.
5. **Disabled** — grayed viewport.

## TanStack docs correction (bundled in this PR)

### Edit 1: `packages/design-system/CLAUDE.md` line 194 (wishlist)

Current line in "Components we don't have yet":

```markdown
- `Table` (TanStack Table headless is acceptable here — it's a behavioral hook, not a UI library, and the alternative is rebuilding sort/filter/pagination state. Revisit when we actually need it.)
```

Action: **REMOVE this line entirely.** `Table` AND `DataTable` have both shipped. The wishlist line is stale, AND the TanStack carve-out turned out to be moot (DataTable was hand-rolled).

### Edit 2: `packages/design-system/src/components/Table/Table.tsx` JSDoc

Current `@remarks When NOT to use` reads:

```tsx
 * @remarks When NOT to use
 * - For data that needs sorting / filtering / pagination state — wait for
 *   `<DataTable>` (not yet shipped). DataTable composes this primitive +
 *   TanStack Table headless.
```

Action: rewrite the line:

```tsx
 * @remarks When NOT to use
 * - For data that needs sorting / filtering / pagination state — use
 *   `<DataTable>` (composes this primitive with a hand-rolled state machine
 *   covering sort, filter, pagination, selection, column visibility).
```

The change updates two things: (a) drops the "not yet shipped" (DataTable shipped), (b) drops "TanStack Table headless" (DataTable is hand-rolled).

### Out of scope

Historical files in `docs/superpowers/specs/` and `docs/superpowers/plans/` mention TanStack in their immutable artifact form. NOT edited. Those are records of what was decided at the time.

## AGENTS.md update

Add a `<ImageCrop>` section in `packages/design-system/AGENTS.md` placed AFTER the `<Slider>` section (which sits between FileUpload and Card in the Forms cluster — see PR #58). The Forms cluster order becomes: Input → Textarea → PasswordInput → PasswordStrengthMeter → Checkbox → Switch → Radio → RadioGroup → FileUpload → Slider → **ImageCrop**.

Section contents:

- API table (src, value, onChange, onChangeEnd, aspectRatio, minZoom, maxZoom, showZoomControl, disabled).
- The `CropArea` and `ExtractCropOptions` type tables.
- The `extractCropBlob` utility signature + canonical Save-handler snippet.
- Two canonical snippets: (a) profile-photo crop with `aspectRatio=1`, (b) free-form crop with `aspectRatio` omitted.
- "Hard rule" callout:
  - ❌ Hand-rolling a `<canvas>` + drag math per page. Use this.
  - ❌ Wrapping `<img>` in CSS clip-path for a "crop preview" — that doesn't produce a cropped Blob. Use `extractCropBlob`.
  - ❌ Trying to crop server-side by passing source pixels + crop coords to your backend without `extractCropBlob`. That's a legitimate flow but the CRM uploads client-side cropped Blobs; if you need server-side, use the consumer-side coords from `value` and skip `extractCropBlob`.
  - ❌ Calling `extractCropBlob` on every `onChange` tick. Call it ONCE in the consumer's Save handler — the encode is expensive.

## Self-imposed constraints / decisions baked in

- **Controlled-only.** `value` is required. Pass `null` for "use default centered crop."
- **Pattern A drag**: crop box centered, image pannable. Single drag target.
- **Hand-rolled canvas**: no react-easy-crop / cropperjs / react-image-crop dep. Matches library convention (DataTable was hand-rolled despite spec carving out TanStack).
- **`extractCropBlob` as a top-level export**, not a component method. Pure-declarative pattern.
- **Object URL lifecycle owned by component** for File/Blob `src`. Cleanup on unmount + `src` change.
- **Zoom is INTERNAL state, not controlled.** The component embeds `<Slider>` and owns the zoom number. Consumer never sees it (the crop area captures the effective output).
- **Embedded zoom slider** uses the new `<Slider>` (PR #58). `showZoomControl={false}` hides it for consumers who want a custom UI (but expose-zoom-via-prop is a v2 feature).
- **No internal save button.** Consumer renders their own and calls `extractCropBlob` in the handler.
- **`role` is NOT locked.** The root is a plain `<div>` with `tabIndex={0}`. No WAI-ARIA contract role applies.
- **Default `minZoom=1`, `maxZoom=3`.** Matches common crop-UI ranges.

## Hard Rule 8

Standard cycle: gates green, fresh-context reviewer, fix Critical + Important, repeat until clean.

## Open questions

None — all design-space questions from the brainstorm were resolved during the API draft. Pre-implementation open questions (image-load error UX, min crop size, layout shift) are answered in the spec body above:

- Image-load error: built-in `.errorState` danger-toned message. No retry button in v1.
- Min crop size: zoom controls effective crop size; no separate min.
- Layout shift: `.viewport` has `min-height: 320px` default.

## Follow-up tasks (not part of this PR)

1. **`<ImageCropModal>` wrapper** — if the Modal scaffolding boilerplate proves repetitive across 3+ consumers, ship a thin convenience wrapper.
2. **Multi-touch / pinch-zoom** — touch gesture support for mobile.
3. **Rotation** — 90° increments via a separate UI (rotate button) + math in `extractCropBlob`.
4. **Pattern B drag (resizable crop box)** — if a consumer needs precise rectangular selection on a fixed image, ship a second drag mode.
5. **Grid overlay / rule-of-thirds** — visual guides.
6. **Controlled zoom prop** — expose `zoom` / `onZoomChange` for consumers who want to persist zoom state.
