# ImageCrop + TanStack Docs Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `<ImageCrop>` — a controlled, inline image-crop primitive built on `<canvas>` with Pattern-A drag (centered crop box, draggable image, slider-controlled zoom) — plus a top-level `extractCropBlob` utility for the consumer's Save handler. Also bundle a small docs correction removing stale TanStack-Table references.

**Architecture:** One component (`ImageCrop.tsx`) plus a separate utility (`extractCropBlob.ts`) in `packages/design-system/src/components/ImageCrop/`. Controlled `value: CropArea | null` in source-image pixel coordinates. Pattern A drag (crop box centered in viewport, image is what the user drags around). Object URL lifecycle owned by the component when `src` is File/Blob. Embedded `<Slider>` (PR #58) for zoom. Pure-declarative — no imperative ref API; `extractCropBlob` is a top-level export the consumer calls in their Save handler.

**Tech Stack:** React 19, TypeScript, CSS Modules + SCSS, Vitest + React Testing Library. No new packages. Reuses `<Slider>` (PR #58) for zoom and `<Skeleton>` for loading state. All tokens (`--color-accent`, `--color-bg`, `--color-bg-muted`, `--color-fg`, `--color-fg-muted`, `--color-border`, `--color-danger`, `--space-2/3/4`, `--radius-md`, `--border-width`, `--transition-base`, `--shadow-sm`, `--opacity-disabled`) verified present in `src/styles/tokens.scss`.

---

**Reference spec:** `docs/superpowers/specs/2026-05-24-image-crop-design.md` (commit `7f01797`).

**Branch:** `feat/image-crop-and-docs` (already checked out, currently at spec commit).

**Conventions used throughout this plan:**

- **Plan-verbatim:** every code block is the literal file contents the implementer commits. Don't paraphrase, fold types, reorder imports, or rename props.
- **CSS-Modules class naming:** camelCase (matches Title/Progress/FileUpload — NOT the kebab-case + bracket-access deviation Slider used; the orientation × size × tone matrix doesn't apply here).
- **Stable CSS Modules strategy:** generated class names contain the literal local-name as substring (e.g. `_viewport_<hash>`). Tests use substring regex matching (`/viewport/`, `/cropBox/`). For the base-class merge test, use `/root_/` (trailing underscore) to reject hypothetical future siblings.
- **Commit format:** subject line + blank line + body (1–3 short sentences) + blank line + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- **`git add` discipline:** stage by explicit path. No `git add -A` / `git add .`.
- **Pattern A spread** (props last so consumer wins): `{...rest}` last on the root `<div>`. `onChange` is `Omit`ted from `HTMLAttributes` — owned by the component's typed prop.
- **Stylelint requirements:**
  - `property-disallowed-list` blocks `margin`, `position` outside the component-internal positioning exception, `top/left/right/bottom`, `width` (when not 100%), `flex: 1/grow/self`. The `position: relative` on `.viewport` + `position: absolute` on `.image`/`.cropBox`/`.skeleton`/`.errorState` are the established internal-child positioning exception (same precedent as Avatar's `.presence`, CircularProgress's `.label`).
  - `rule-empty-line-before` requires a blank line between adjacent rule blocks. Add proactively.
  - `scss/double-slash-comment-empty-line-before` requires a blank line BEFORE `//` comments inside a rule. Add proactively.
  - CSS keyword values (`user-select: none`, `cursor: grab`, `pointer-events: none`, `-webkit-user-drag: none`) need `// stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword` immediately before. Same pattern as Slider/FileUpload.
  - The `box-shadow: 0 0 0 9999px rgb(0 0 0 / 50%)` overlay trick needs `// stylelint-disable-next-line scale-unlimited/declaration-strict-value -- one-off overlay paint with no token equivalent` for the raw rgba.
- **Gates after each source-touching task:** `make test`, `make build-lib`, `make build`, `make lint`. All four must pass before commit + advance.
- **If pre-push hook flags prettier:** run `npx prettier --write <flagged files>` and create a follow-up commit `<scope>: prettier --write` with the same Co-Authored-By footer. Don't squash.
- **`src/index.ts` re-export added per-task to satisfy `structure.test.ts`:** T3 (tests task, after creating ImageCrop.test.tsx) adds the ImageCrop + extractCropBlob + types re-exports. T4 (AGENTS.md) is the thinner edit.
- **Note on AppShell placement:** ImageCrop slots between **FileUpload and Input** alphabetically in the Forms group (I-m comes before I-n; the user-provided "between Input and PasswordInput" was a slip). T5 uses the corrected slot.

---

## File structure

### NEW files

```
packages/design-system/src/components/ImageCrop/
  ImageCrop.tsx              ← root component (canvas + image render, drag math, zoom slider integration, keyboard handler)
  ImageCrop.module.scss      ← .root + .viewport + .image + .imageDragging + .cropBox + .errorState + .skeleton + .zoomControl + .disabled
  ImageCrop.test.tsx         ← ~25 cases
  extractCropBlob.ts         ← top-level exported utility (canvas extraction, MIME + quality + outputWidth resize)
  index.ts                   ← exports ImageCrop + extractCropBlob + CropArea + ImageCropProps + ExtractCropOptions
```

### MODIFIED files

```
packages/design-system/src/index.ts                                ← T3 adds ImageCrop + extractCropBlob + types re-export
packages/design-system/AGENTS.md                                   ← T4 inserts ImageCrop section after Slider, before Card
packages/design-system/CLAUDE.md                                   ← T1 removes stale Table+TanStack wishlist line
packages/design-system/src/components/Table/Table.tsx              ← T1 rewrites JSDoc @remarks line about DataTable + TanStack
packages/playground/src/App.tsx                                    ← T5: add import + <Route>
packages/playground/src/layout/AppShell/AppShell.tsx               ← T5: add lucide Crop icon + Forms-group item between FileUpload and Input
packages/playground/src/pages/components/ComponentsIndex.tsx       ← T5: add import + card
packages/playground/src/pages/mockups/registry.ts                  ← T5: extend ComponentName union with 'ImageCrop'
```

No mockup files modified — no current mockup uses image crop.

---

## Task 1: TanStack docs correction

**Files:**

- Modify: `packages/design-system/CLAUDE.md` (line 194: remove stale wishlist entry)
- Modify: `packages/design-system/src/components/Table/Table.tsx` (line 173: rewrite JSDoc @remarks)

This ships FIRST so it's a clean, isolated docs fix — not entangled with the ImageCrop work in case the ImageCrop tasks need fix-iteration rounds.

### Step 1.1: Edit `CLAUDE.md` — remove stale Table+TanStack wishlist entry

Use the Edit tool with `replace_all: false`.

**old_string:**

```markdown
- `Toast` / notification (hand-roll; no Floating UI — fixed corner placement)
- `Textarea`
- `Checkbox`, `Radio`, `Switch`
- `Table` (TanStack Table headless is acceptable here — it's a behavioral hook, not a UI library, and the alternative is rebuilding sort/filter/pagination state. Revisit when we actually need it.)
- `Skeleton` (loading state)
```

**new_string:**

```markdown
- `Toast` / notification (hand-roll; no Floating UI — fixed corner placement)
- `Textarea`
- `Checkbox`, `Radio`, `Switch`
- `Skeleton` (loading state)
```

The Table+TanStack line is dropped entirely. `Table` and `DataTable` have both shipped — Table as the visual primitive and DataTable as the state-machine compose-on-top, both hand-rolled. The TanStack carve-out turned out to be moot.

### Step 1.2: Edit `Table.tsx` — rewrite JSDoc @remarks line

In `packages/design-system/src/components/Table/Table.tsx`, find the `@remarks When NOT to use` block around line 170-178.

**old_string:**

```tsx
 * @remarks When NOT to use
 * - For data that needs sorting / filtering / pagination state — wait for
 *   `<DataTable>` (not yet shipped). DataTable composes this primitive +
 *   TanStack Table headless.
 * - For non-tabular content (cards, lists). Use `<Stack>` / `<Cluster>` /
 *   `<Card>` instead.
```

**new_string:**

```tsx
 * @remarks When NOT to use
 * - For data that needs sorting / filtering / pagination state — use
 *   `<DataTable>` (composes this primitive with a hand-rolled state machine
 *   covering sort, filter, pagination, selection, column visibility).
 * - For non-tabular content (cards, lists). Use `<Stack>` / `<Cluster>` /
 *   `<Card>` instead.
```

The line drops two stale claims: "not yet shipped" (DataTable shipped) and "TanStack Table headless" (DataTable is hand-rolled).

### Step 1.3: Verify gates

- [ ] Run `make build-lib`. Expected: clean (JSDoc edit doesn't affect typecheck but confirms nothing else broke).
- [ ] Run `make lint`. Expected: clean.

### Step 1.4: Commit

```bash
git add packages/design-system/CLAUDE.md \
        packages/design-system/src/components/Table/Table.tsx
git commit -m "$(cat <<'EOF'
docs: correct stale TanStack Table references

CLAUDE.md: remove the wishlist entry "Table (TanStack Table headless is
acceptable here…)" — both <Table> and <DataTable> have shipped, and the
TanStack carve-out turned out to be moot because DataTable was hand-rolled.

Table.tsx @remarks: drop "DataTable (not yet shipped). DataTable composes
this primitive + TanStack Table headless." Replace with a description of
what actually ships — DataTable composes Table with a hand-rolled state
machine covering sort/filter/pagination/selection/column visibility.

Historical spec/plan files in docs/superpowers/ are immutable artifacts of
past sessions and remain unchanged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: extractCropBlob utility + ImageCrop source bundle

**Files:**

- Create: `packages/design-system/src/components/ImageCrop/extractCropBlob.ts`
- Create: `packages/design-system/src/components/ImageCrop/ImageCrop.tsx`
- Create: `packages/design-system/src/components/ImageCrop/ImageCrop.module.scss`
- Create: `packages/design-system/src/components/ImageCrop/index.ts`

### Step 2.1: Create `extractCropBlob.ts`

- [ ] Write file contents (verbatim):

```ts
/**
 * Output MIME type and encoding options for `extractCropBlob`.
 */
export interface ExtractCropOptions {
  /**
   * Output MIME type. Default `'image/png'` (lossless).
   * - `'image/png'` — lossless, larger file size, supports transparency.
   * - `'image/jpeg'` — smaller, lossy, no transparency. Use for photos.
   * - `'image/webp'` — smaller than JPEG at similar quality, good browser support since 2020.
   */
  type?: 'image/png' | 'image/jpeg' | 'image/webp';
  /**
   * Encoding quality for lossy formats (0..1). Default `0.92`. Ignored for
   * PNG. Lower values = smaller file + more artifacts.
   */
  quality?: number;
  /**
   * Resize the output to this width in pixels (height proportional). Omit
   * to keep the source-pixel crop dimensions (no resize). Useful for capping
   * avatar uploads (e.g. `outputWidth: 512` for a 512×512 max). The height
   * is computed from the source crop aspect ratio.
   */
  outputWidth?: number;
}

/**
 * Crop region in SOURCE-IMAGE pixel coordinates (not viewport pixels). Re-
 * exported from `./ImageCrop` to keep `extractCropBlob`'s signature self-
 * contained (consumers can import this utility without importing the
 * component).
 */
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

/**
 * Internal helper — load an image source (string URL, File, or Blob) into
 * an HTMLImageElement and resolve when it's ready for canvas operations.
 *
 * Object URLs created from File/Blob are revoked after load to avoid leaks.
 */
function loadImage(src: string | File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    let createdObjectUrl = false;
    const url =
      typeof src === 'string' ? src : ((createdObjectUrl = true), URL.createObjectURL(src));
    const img = new Image();
    // crossOrigin: 'anonymous' lets us read pixels from cross-origin images
    // IF the server returns the right CORS headers. Same-origin / data: /
    // blob: URLs are unaffected. Without this, drawImage on cross-origin
    // sources taints the canvas and toBlob() throws SecurityError.
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (createdObjectUrl) URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      if (createdObjectUrl) URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for cropping'));
    };
    img.src = url;
  });
}

/**
 * Extract the cropped region of an image as a Blob via an off-screen canvas.
 *
 * Accepts the same `src` shape as `<ImageCrop>` (string URL, File, or Blob)
 * and a `CropArea` in source-image pixel coordinates. Returns a Promise
 * resolving to a Blob with the configured type/quality/resize.
 *
 * The canonical "Save handler" recipe — the consumer's submit code calls
 * this to produce the cropped Blob, then uploads to their backend / S3 /
 * etc.
 *
 * @example
 * const handleSave = async () => {
 *   if (!crop) return;
 *   const blob = await extractCropBlob(file, crop, {
 *     type: 'image/jpeg',
 *     quality: 0.9,
 *     outputWidth: 512,
 *   });
 *   await uploadToS3(blob);
 * };
 *
 * @throws Error if the image fails to load OR the canvas's `toBlob` returns
 *   `null` (very rare; typically means the source tainted the canvas).
 */
export async function extractCropBlob(
  src: string | File | Blob,
  area: CropArea,
  options: ExtractCropOptions = {},
): Promise<Blob> {
  const { type = 'image/png', quality = 0.92, outputWidth } = options;
  const img = await loadImage(src);

  // Determine output dimensions. If outputWidth is set, scale proportionally;
  // otherwise keep source-pixel crop dimensions.
  const outW = outputWidth ?? area.width;
  const outH = outputWidth ? outputWidth * (area.height / area.width) : area.height;

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D canvas context');
  }
  // drawImage(src, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) — the
  // 9-arg form crops + scales in one call.
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, outW, outH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob returned null'));
        }
      },
      type,
      quality,
    );
  });
}
```

### Step 2.2: Create `ImageCrop.tsx`

- [ ] Write file contents (verbatim):

```tsx
import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import clsx from 'clsx';
import { Slider } from '../Slider';
import { Skeleton } from '../Skeleton';
import type { CropArea } from './extractCropBlob';
import styles from './ImageCrop.module.scss';

// Re-export from the utility so consumers have a single import for the type.
export type { CropArea } from './extractCropBlob';

export interface ImageCropProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /**
   * Image source. String URLs (HTTP/HTTPS, data:, blob:) pass through.
   * File/Blob are normalized to object URLs internally via
   * `URL.createObjectURL()`, with cleanup on unmount and `src` change.
   */
  src: string | File | Blob;
  /**
   * Controlled crop area in SOURCE-IMAGE pixel coordinates. Pass `null` to
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
   * `true`. Set `false` for a pure canvas with no zoom UI — but the
   * component's internal zoom state isn't exposed (v2 feature).
   */
  showZoomControl?: boolean;
  /**
   * Disable all interaction (drag, zoom). Default `false`. Image still
   * renders; the zoom slider is also disabled.
   */
  disabled?: boolean;
}

/**
 * Compute the viewport-space crop box dimensions given the viewport and
 * optional aspect ratio. Returns the largest centered rectangle inside the
 * viewport that satisfies the ratio. If `aspectRatio` is undefined, the box
 * fills the viewport.
 */
function computeCropBox(
  viewportWidth: number,
  viewportHeight: number,
  aspectRatio: number | undefined,
): { boxW: number; boxH: number } {
  if (aspectRatio === undefined) {
    return { boxW: viewportWidth, boxH: viewportHeight };
  }
  // Largest centered rectangle in viewport satisfying aspectRatio.
  const fitByWidth = viewportWidth;
  const fitByHeight = viewportHeight * aspectRatio;
  const boxW = Math.min(fitByWidth, fitByHeight);
  const boxH = boxW / aspectRatio;
  return { boxW, boxH };
}

/**
 * Default centered crop region given image natural size + viewport box
 * dimensions. The default fits the box's aspect inside the image, centered.
 */
function defaultCropArea(
  imageWidth: number,
  imageHeight: number,
  boxW: number,
  boxH: number,
): CropArea {
  const boxAspect = boxW / boxH;
  const imageAspect = imageWidth / imageHeight;
  let cropW: number;
  let cropH: number;
  if (imageAspect > boxAspect) {
    // Image is wider than the box. Match heights; trim sides.
    cropH = imageHeight;
    cropW = cropH * boxAspect;
  } else {
    // Image is taller. Match widths; trim top/bottom.
    cropW = imageWidth;
    cropH = cropW / boxAspect;
  }
  return {
    x: (imageWidth - cropW) / 2,
    y: (imageHeight - cropH) / 2,
    width: cropW,
    height: cropH,
  };
}

/**
 * Clamp a crop area so it stays inside the image bounds. Preserves width
 * and height; only shifts x/y if needed.
 */
function clampCropArea(area: CropArea, imageWidth: number, imageHeight: number): CropArea {
  const maxX = Math.max(0, imageWidth - area.width);
  const maxY = Math.max(0, imageHeight - area.height);
  return {
    x: Math.max(0, Math.min(maxX, area.x)),
    y: Math.max(0, Math.min(maxY, area.y)),
    width: area.width,
    height: area.height,
  };
}

/**
 * Controlled, inline image-crop primitive built on `<canvas>` with Pattern-A
 * drag: the crop box stays centered in the viewport; the user drags the
 * IMAGE to reposition the source region under the box. Zoom adjusts via an
 * embedded `<Slider>`.
 *
 * Output is produced via the top-level `extractCropBlob` utility (NOT a ref
 * method) — pure-declarative pattern. Consumer holds the crop area state,
 * calls `extractCropBlob(src, area, options)` in their Save handler to
 * produce the cropped Blob.
 *
 * @example
 * // Profile photo crop with square aspect:
 * const [crop, setCrop] = useState<CropArea | null>(null);
 * const handleSave = async () => {
 *   if (!crop) return;
 *   const blob = await extractCropBlob(file, crop, {
 *     type: 'image/jpeg',
 *     quality: 0.9,
 *     outputWidth: 512,
 *   });
 *   onComplete(blob);
 * };
 * return <ImageCrop src={file} value={crop} onChange={setCrop} aspectRatio={1} />;
 *
 * @example
 * // Free-aspect crop (no aspectRatio prop):
 * <ImageCrop src={imageUrl} value={crop} onChange={setCrop} />
 *
 * @example
 * // Inside a Modal (the canonical "pick → crop → save" flow):
 * <Modal isOpen onClose={cancel}>
 *   <Modal.Header>Crop your photo</Modal.Header>
 *   <Modal.Body>
 *     <ImageCrop src={file} value={crop} onChange={setCrop} aspectRatio={1} />
 *   </Modal.Body>
 *   <Modal.Footer>
 *     <Button variant="secondary" onClick={cancel}>Cancel</Button>
 *     <Button onClick={handleSave} disabled={!crop}>Save</Button>
 *   </Modal.Footer>
 * </Modal>
 *
 * @remarks When NOT to use
 * - For server-side cropping. Pass `value` (CropArea coords) to your backend
 *   instead of using `extractCropBlob`.
 * - For circular avatars. Crop rectangular, then CSS-mask in the consumer.
 * - For rotation. v1 doesn't rotate. Use a future v2 or rotate server-side.
 * - For multi-touch / pinch-zoom. v1 is single-pointer drag + slider zoom.
 *
 * @remarks Anti-patterns
 * - ❌ Hand-rolling a `<canvas>` + drag math per page. Use this.
 * - ❌ Calling `extractCropBlob` on every `onChange` tick. The encode is
 *   expensive — call ONCE in the Save handler.
 * - ❌ Wrapping `<img>` in CSS clip-path for a "crop preview" — that doesn't
 *   produce a cropped Blob. Use `extractCropBlob`.
 * - ❌ `<ImageCrop ref={ref}>` expecting a `.getBlob()` method. There's no
 *   imperative API. Use the top-level `extractCropBlob(src, value)` utility.
 */
export const ImageCrop = forwardRef<HTMLDivElement, ImageCropProps>(function ImageCrop(
  {
    src,
    value,
    onChange,
    onChangeEnd,
    aspectRatio,
    minZoom = 1,
    maxZoom = 3,
    showZoomControl = true,
    disabled = false,
    className,
    ...rest
  },
  ref,
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Object URL lifecycle for File/Blob sources. When src is a string, pass-
  // through. When it's a File/Blob, create an object URL and revoke on
  // unmount or src change.
  const [resolvedSrc, setResolvedSrc] = useState<string>(() =>
    typeof src === 'string' ? src : '',
  );
  useEffect(() => {
    if (typeof src === 'string') {
      setResolvedSrc(src);
      return;
    }
    const url = URL.createObjectURL(src);
    setResolvedSrc(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [src]);

  // Image load state + natural dimensions. Reset whenever src changes.
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageNatural, setImageNatural] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    setLoadState('loading');
    setImageNatural(null);
  }, [resolvedSrc]);

  // Viewport size — measured after layout via getBoundingClientRect. We
  // re-measure on mount AND on window resize.
  const [viewport, setViewport] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  useLayoutEffect(() => {
    const measure = () => {
      const el = viewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setViewport({ width: rect.width, height: rect.height });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
    };
  }, []);

  // Internal zoom state (1.0 = fit). The embedded Slider drives this; we
  // recompute value whenever zoom changes.
  const [zoom, setZoom] = useState<number>(minZoom);

  // Compute viewport-space crop box dimensions.
  const { boxW, boxH } = useMemo(
    () => computeCropBox(viewport.width, viewport.height, aspectRatio),
    [viewport.width, viewport.height, aspectRatio],
  );

  // Initialize value on first load if consumer passed null. Fire onChange
  // once with the default so the consumer's controlled state catches up.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (loadState !== 'loaded' || !imageNatural || initializedRef.current) return;
    if (value === null && boxW > 0 && boxH > 0) {
      const defaultArea = defaultCropArea(imageNatural.width, imageNatural.height, boxW, boxH);
      initializedRef.current = true;
      onChange(defaultArea);
    } else if (value !== null) {
      initializedRef.current = true;
    }
  }, [loadState, imageNatural, value, boxW, boxH, onChange]);

  // Reset initialization flag on src change so the new image gets its
  // default crop applied.
  useEffect(() => {
    initializedRef.current = false;
  }, [resolvedSrc]);

  // Drag state: pointer-down captures the starting position and the value
  // snapshot. Drag is in a ref (not state) so handlers read it synchronously.
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    startValue: CropArea;
    scale: number;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleImageLoad = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;
    setImageNatural({ width: img.naturalWidth, height: img.naturalHeight });
    setLoadState('loaded');
  }, []);

  const handleImageError = useCallback(() => {
    setLoadState('error');
  }, []);

  // Compute visual scale + image translate position from the current value.
  // The image is rendered with transform: translate + scale.
  const imageTransform = useMemo(() => {
    if (!imageNatural || !value || boxW === 0 || boxH === 0) {
      return { display: 'none' as const };
    }
    const scale = boxW / value.width;
    const boxLeft = (viewport.width - boxW) / 2;
    const boxTop = (viewport.height - boxH) / 2;
    const originX = boxLeft - value.x * scale;
    const originY = boxTop - value.y * scale;
    return {
      transform: `translate(${originX}px, ${originY}px) scale(${scale})`,
    } satisfies CSSProperties;
  }, [imageNatural, value, boxW, boxH, viewport.width, viewport.height]);

  // Apply a new crop value with clamping, then fire onChange.
  const applyValue = useCallback(
    (next: CropArea) => {
      if (!imageNatural) return;
      const clamped = clampCropArea(next, imageNatural.width, imageNatural.height);
      onChange(clamped);
    },
    [imageNatural, onChange],
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLImageElement>) => {
      if (disabled || !imageNatural || !value || boxW === 0) return;
      e.preventDefault();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // jsdom or pre-PointerEvents browsers — drag still works via pointermove.
      }
      const scale = boxW / value.width;
      dragStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startValue: { ...value },
        scale,
      };
      setIsDragging(true);
    },
    [disabled, imageNatural, value, boxW],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLImageElement>) => {
      if (disabled || !dragStateRef.current) return;
      const { startX, startY, startValue, scale } = dragStateRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      // Sign flip: pointer right pans image right (in viewport) which moves
      // the crop region LEFT (the user is showing more of the right side).
      const next: CropArea = {
        x: startValue.x - dx / scale,
        y: startValue.y - dy / scale,
        width: startValue.width,
        height: startValue.height,
      };
      applyValue(next);
    },
    [applyValue, disabled],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent<HTMLImageElement>) => {
      if (disabled || !dragStateRef.current) return;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore — same rationale as pointerdown.
      }
      dragStateRef.current = null;
      setIsDragging(false);
      if (value) onChangeEnd?.(value);
    },
    [disabled, onChangeEnd, value],
  );

  // Zoom handler — recompute value dimensions, keep center, clamp.
  const handleZoomChange = useCallback(
    (sliderValue: number | [number, number]) => {
      if (disabled || !imageNatural || !value || boxW === 0) return;
      const newZoom = typeof sliderValue === 'number' ? sliderValue : sliderValue[0];
      setZoom(newZoom);
      const newWidth = boxW / newZoom;
      const newHeight = boxH / newZoom;
      const centerX = value.x + value.width / 2;
      const centerY = value.y + value.height / 2;
      const next: CropArea = {
        x: centerX - newWidth / 2,
        y: centerY - newHeight / 2,
        width: newWidth,
        height: newHeight,
      };
      applyValue(next);
    },
    [applyValue, boxW, boxH, disabled, imageNatural, value],
  );

  const handleZoomChangeEnd = useCallback(() => {
    if (value) onChangeEnd?.(value);
  }, [onChangeEnd, value]);

  // Keyboard handler — arrows pan, Home/End jump, PageUp/Down zoom.
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (disabled || !imageNatural || !value) return;
      const PAN_STEP = 5; // source-image pixels
      const ZOOM_STEP = 0.25;
      let next: CropArea | null = null;
      switch (e.key) {
        case 'ArrowLeft':
          next = { ...value, x: value.x - PAN_STEP };
          break;
        case 'ArrowRight':
          next = { ...value, x: value.x + PAN_STEP };
          break;
        case 'ArrowUp':
          next = { ...value, y: value.y - PAN_STEP };
          break;
        case 'ArrowDown':
          next = { ...value, y: value.y + PAN_STEP };
          break;
        case 'Home':
          next = { ...value, x: 0, y: 0 };
          break;
        case 'End':
          next = {
            ...value,
            x: imageNatural.width - value.width,
            y: imageNatural.height - value.height,
          };
          break;
        case 'PageUp':
          handleZoomChange(Math.min(maxZoom, zoom + ZOOM_STEP));
          e.preventDefault();
          return;
        case 'PageDown':
          handleZoomChange(Math.max(minZoom, zoom - ZOOM_STEP));
          e.preventDefault();
          return;
        default:
          return;
      }
      e.preventDefault();
      if (next) applyValue(next);
    },
    [applyValue, disabled, handleZoomChange, imageNatural, maxZoom, minZoom, value, zoom],
  );

  return (
    <div ref={ref} className={clsx(styles.root, disabled && styles.disabled, className)} {...rest}>
      <div
        ref={viewportRef}
        className={styles.viewport}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
      >
        {loadState === 'loading' && <Skeleton variant="rectangular" className={styles.skeleton} />}
        {loadState === 'error' && <div className={styles.errorState}>Couldn't load image</div>}
        {/* eslint-disable-next-line jsx-a11y/alt-text -- alt is intentionally empty; the cropping interaction IS the meaning, consumer overrides via rest if needed. */}
        <img
          ref={imageRef}
          src={resolvedSrc}
          alt=""
          className={clsx(styles.image, isDragging && styles.imageDragging)}
          style={imageTransform}
          onLoad={handleImageLoad}
          onError={handleImageError}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          draggable={false}
        />
        {loadState === 'loaded' && (
          <div
            className={styles.cropBox}
            style={{ width: boxW, height: boxH } satisfies CSSProperties}
          />
        )}
      </div>
      {showZoomControl && (
        <Slider
          className={styles.zoomControl}
          value={zoom}
          onChange={handleZoomChange}
          onChangeEnd={handleZoomChangeEnd}
          min={minZoom}
          max={maxZoom}
          step={0.01}
          disabled={disabled || loadState !== 'loaded'}
          aria-label="Zoom"
        />
      )}
    </div>
  );
});
```

### Step 2.3: Create `ImageCrop.module.scss`

- [ ] Write file contents (verbatim):

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

  // CSS keyword; prevents browser text selection during drag.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  user-select: none;
}

.viewport:focus-visible {
  outline: var(--border-width-emphasis) solid var(--color-accent);

  // CSS keyword; offset the outline to keep it visible.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- raw px is the focus-ring offset, no token equivalent
  outline-offset: 2px;
}

.image {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;

  // CSS keyword for the grab cursor affordance.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  cursor: grab;
}

.image:hover {
  // Inherit the grab cursor from .image; no override needed.
}

.imageDragging {
  // CSS keyword.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  cursor: grabbing;
}

.cropBox {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border: var(--border-width) solid var(--color-accent);

  // The box-shadow trick paints a dim overlay everywhere OUTSIDE the box
  // without an extra DOM element. The 9999px spread covers the viewport.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- one-off overlay paint with no token equivalent
  box-shadow: 0 0 0 9999px rgb(0 0 0 / 50%);

  // CSS keyword — dim layer doesn't intercept drag events on the image below.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  pointer-events: none;
}

.skeleton {
  position: absolute;
  inset: 0;
}

.errorState {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-4);
  color: var(--color-danger);
  font-size: var(--font-size-sm);

  // CSS keyword — text alignment.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  text-align: center;
}

.zoomControl {
  width: 100%;
}

.disabled .viewport {
  opacity: var(--opacity-disabled);
}

.disabled .image {
  // CSS keyword.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  cursor: not-allowed;

  // CSS keyword.
  // stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS keyword
  pointer-events: none;
}
```

If stylelint flags additional properties not pre-disabled above (e.g. some keyword on `border` shorthand), add the matching inline disable in place.

### Step 2.4: Create `index.ts`

- [ ] Write file contents (verbatim):

```ts
export { ImageCrop } from './ImageCrop';
export type { ImageCropProps, CropArea } from './ImageCrop';
export { extractCropBlob } from './extractCropBlob';
export type { ExtractCropOptions } from './extractCropBlob';
```

### Step 2.5: Verify gates

- [ ] Run `make build-lib`. Expected: clean (typecheck passes).
- [ ] Run `make lint`. Expected: clean (the proactive disable comments should cover all the CSS-keyword warnings; if a new one surfaces, add the matching disable).

DO NOT run `make test` — tests don't exist yet (T3), and `src/index.ts` doesn't re-export ImageCrop yet (T3 adds it). The structure meta-test would fail at this point.

### Step 2.6: Commit

```bash
git add packages/design-system/src/components/ImageCrop/ImageCrop.tsx \
        packages/design-system/src/components/ImageCrop/ImageCrop.module.scss \
        packages/design-system/src/components/ImageCrop/extractCropBlob.ts \
        packages/design-system/src/components/ImageCrop/index.ts
git commit -m "$(cat <<'EOF'
ImageCrop: source bundle + extractCropBlob utility

Pattern-A drag (crop box centered, image dragged, slider-controlled zoom).
Controlled value: CropArea | null in source-image pixel coordinates;
component initializes with a centered default if value is null.

extractCropBlob is a top-level exported utility (NOT a ref method) so the
consumer's Save handler can produce the cropped Blob without an imperative
API. Supports outputWidth resize, JPEG/PNG/WebP, quality. Object URL
lifecycle owned by the component when src is File/Blob.

Embedded <Slider> (PR #58) for zoom. pointer events with setPointerCapture
(try/catch for jsdom). Keyboard: arrows pan ±5px in source coords;
Home/End to corners; PageUp/Down zoom by 0.25.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: ImageCrop tests + src/index.ts re-export

**Files:**

- Create: `packages/design-system/src/components/ImageCrop/ImageCrop.test.tsx`
- Modify: `packages/design-system/src/index.ts`

### Step 3.1: Create `ImageCrop.test.tsx`

- [ ] Write file contents (verbatim):

```tsx
import { render, screen, fireEvent, act } from '@testing-library/react';
import { createRef } from 'react';
import { ImageCrop, extractCropBlob, type CropArea } from './index';

// jsdom doesn't implement setPointerCapture; stub it.
function ensurePointerCaptureShim() {
  if (
    typeof (HTMLElement.prototype as unknown as { setPointerCapture?: unknown })
      .setPointerCapture !== 'function'
  ) {
    (
      HTMLElement.prototype as unknown as { setPointerCapture: (id: number) => void }
    ).setPointerCapture = () => {};
  }
  if (
    typeof (HTMLElement.prototype as unknown as { releasePointerCapture?: unknown })
      .releasePointerCapture !== 'function'
  ) {
    (
      HTMLElement.prototype as unknown as { releasePointerCapture: (id: number) => void }
    ).releasePointerCapture = () => {};
  }
}

ensurePointerCaptureShim();

// Mock URL.createObjectURL / revokeObjectURL globally for File/Blob src tests.
const objectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:mock-url-1');
const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

beforeEach(() => {
  objectUrlSpy.mockClear();
  revokeSpy.mockClear();
});

// Helper — mock viewport getBoundingClientRect so the component has a known
// canvas. Default: 400×400 viewport.
function mockViewportRect(container: HTMLElement, opts: { width?: number; height?: number } = {}) {
  const { width = 400, height = 400 } = opts;
  const viewport = container.querySelector<HTMLElement>('[class*="viewport"]')!;
  viewport.getBoundingClientRect = () =>
    ({
      width,
      height,
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return viewport;
}

// Helper — fire load on the image with given natural dimensions.
function fireImageLoad(container: HTMLElement, naturalWidth = 1000, naturalHeight = 800) {
  const img = container.querySelector<HTMLImageElement>('img')!;
  // jsdom doesn't decode the image so naturalWidth is 0 — mock it.
  Object.defineProperty(img, 'naturalWidth', { configurable: true, value: naturalWidth });
  Object.defineProperty(img, 'naturalHeight', { configurable: true, value: naturalHeight });
  act(() => {
    fireEvent.load(img);
  });
  return img;
}

describe('ImageCrop', () => {
  describe('rendering / loading', () => {
    it('renders the viewport container with the image element', () => {
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={null} onChange={() => {}} />,
      );
      expect(container.querySelector('[class*="viewport"]')).toBeInTheDocument();
      expect(container.querySelector('img')).toBeInTheDocument();
    });

    it('shows Skeleton while image is loading', () => {
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={null} onChange={() => {}} />,
      );
      expect(container.querySelector('[class*="skeleton"]')).toBeInTheDocument();
    });

    it('removes skeleton and renders crop box once image loads', () => {
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={null} onChange={() => {}} />,
      );
      mockViewportRect(container);
      fireImageLoad(container);
      expect(container.querySelector('[class*="skeleton"]')).not.toBeInTheDocument();
      expect(container.querySelector('[class*="cropBox"]')).toBeInTheDocument();
    });

    it('shows error message when image fails to load', () => {
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={null} onChange={() => {}} />,
      );
      const img = container.querySelector('img')!;
      act(() => {
        fireEvent.error(img);
      });
      expect(screen.getByText(/Couldn't load image/i)).toBeInTheDocument();
    });

    it('disabled: adds disabled class and disables zoom slider', () => {
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={null} onChange={() => {}} disabled />,
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toMatch(/disabled/);
      // Zoom slider has aria-disabled on its thumb when disabled.
      const sliderThumb = container.querySelector('[role="slider"]');
      expect(sliderThumb).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('object URL lifecycle', () => {
    it('src as File: calls URL.createObjectURL once', () => {
      const file = new File([new Uint8Array(10)], 'a.png', { type: 'image/png' });
      render(<ImageCrop src={file} value={null} onChange={() => {}} />);
      expect(objectUrlSpy).toHaveBeenCalledTimes(1);
      expect(objectUrlSpy).toHaveBeenCalledWith(file);
    });

    it('src as Blob: calls URL.createObjectURL', () => {
      const blob = new Blob([new Uint8Array(10)], { type: 'image/png' });
      render(<ImageCrop src={blob} value={null} onChange={() => {}} />);
      expect(objectUrlSpy).toHaveBeenCalledWith(blob);
    });

    it('src as string: does NOT call createObjectURL', () => {
      render(<ImageCrop src="data:,placeholder" value={null} onChange={() => {}} />);
      expect(objectUrlSpy).not.toHaveBeenCalled();
    });

    it('unmount: revokes the object URL', () => {
      const file = new File([new Uint8Array(10)], 'a.png', { type: 'image/png' });
      const { unmount } = render(<ImageCrop src={file} value={null} onChange={() => {}} />);
      unmount();
      expect(revokeSpy).toHaveBeenCalledWith('blob:mock-url-1');
    });

    it('src change: revokes the old URL', () => {
      const file1 = new File([new Uint8Array(10)], 'a.png', { type: 'image/png' });
      const file2 = new File([new Uint8Array(10)], 'b.png', { type: 'image/png' });
      const { rerender } = render(<ImageCrop src={file1} value={null} onChange={() => {}} />);
      objectUrlSpy.mockReturnValueOnce('blob:mock-url-2');
      rerender(<ImageCrop src={file2} value={null} onChange={() => {}} />);
      expect(revokeSpy).toHaveBeenCalledWith('blob:mock-url-1');
    });
  });

  describe('crop area / value handling', () => {
    it('value=null initial: fires onChange once with the default centered crop after image loads', () => {
      const onChange = vi.fn();
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={null} onChange={onChange} aspectRatio={1} />,
      );
      mockViewportRect(container, { width: 400, height: 400 });
      fireImageLoad(container, 1000, 800);
      expect(onChange).toHaveBeenCalledTimes(1);
      const fired = onChange.mock.calls[0][0] as CropArea;
      // 1000×800 image, aspectRatio=1, default centered square should be 800×800.
      expect(fired.width).toBe(800);
      expect(fired.height).toBe(800);
      expect(fired.x).toBe(100); // (1000 - 800) / 2
      expect(fired.y).toBe(0); // (800 - 800) / 2
    });

    it('controlled value: image rendered with transform reflecting value position', () => {
      const value: CropArea = { x: 100, y: 50, width: 400, height: 400 };
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={value} onChange={() => {}} aspectRatio={1} />,
      );
      mockViewportRect(container, { width: 400, height: 400 });
      fireImageLoad(container, 1000, 800);
      const img = container.querySelector<HTMLImageElement>('img')!;
      // scale = boxW / value.width = 400 / 400 = 1; box centered at (0, 0) — but viewport is 400×400 too.
      // boxLeft = 0, boxTop = 0, originX = 0 - 100*1 = -100, originY = 0 - 50*1 = -50.
      expect(img.style.transform).toContain('translate(-100px, -50px)');
      expect(img.style.transform).toContain('scale(1)');
    });

    it('aspectRatio=1 with null value: default crop is square', () => {
      const onChange = vi.fn();
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={null} onChange={onChange} aspectRatio={1} />,
      );
      mockViewportRect(container);
      fireImageLoad(container, 1200, 600);
      const fired = onChange.mock.calls[0][0] as CropArea;
      expect(fired.width).toBe(fired.height);
    });

    it('aspectRatio undefined: default crop matches image aspect (no constraint)', () => {
      const onChange = vi.fn();
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={null} onChange={onChange} />,
      );
      mockViewportRect(container, { width: 400, height: 400 });
      fireImageLoad(container, 1000, 800);
      const fired = onChange.mock.calls[0][0] as CropArea;
      // Free aspect = viewport aspect = 1 (400×400 viewport). Default centered crop should be
      // 800×800 in a 1000×800 image (limited by the smaller dimension).
      expect(fired.width).toBe(800);
      expect(fired.height).toBe(800);
    });
  });

  describe('drag', () => {
    it('pointerdown on image starts drag (adds imageDragging class)', () => {
      const { container } = render(
        <ImageCrop
          src="data:,placeholder"
          value={{ x: 100, y: 50, width: 400, height: 400 }}
          onChange={() => {}}
          aspectRatio={1}
        />,
      );
      mockViewportRect(container);
      fireImageLoad(container, 1000, 800);
      const img = container.querySelector('img')!;
      fireEvent.pointerDown(img, { clientX: 200, clientY: 200, pointerId: 1 });
      expect(img.className).toMatch(/imageDragging/);
    });

    it('pointermove during drag fires onChange with shifted value', () => {
      const onChange = vi.fn();
      const value: CropArea = { x: 100, y: 50, width: 400, height: 400 };
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={value} onChange={onChange} aspectRatio={1} />,
      );
      mockViewportRect(container, { width: 400, height: 400 });
      fireImageLoad(container, 1000, 800);
      onChange.mockClear();
      const img = container.querySelector('img')!;
      fireEvent.pointerDown(img, { clientX: 200, clientY: 200, pointerId: 1 });
      fireEvent.pointerMove(img, { clientX: 250, clientY: 220, pointerId: 1 });
      // scale = 1; dx = 50, dy = 20. Sign-flipped: new x = 100 - 50 = 50, new y = 50 - 20 = 30.
      // width/height unchanged.
      const fired = onChange.mock.calls.at(-1)?.[0] as CropArea;
      expect(fired.x).toBe(50);
      expect(fired.y).toBe(30);
      expect(fired.width).toBe(400);
      expect(fired.height).toBe(400);
    });

    it('pointerup ends drag and fires onChangeEnd', () => {
      const onChangeEnd = vi.fn();
      const { container } = render(
        <ImageCrop
          src="data:,placeholder"
          value={{ x: 100, y: 50, width: 400, height: 400 }}
          onChange={() => {}}
          onChangeEnd={onChangeEnd}
          aspectRatio={1}
        />,
      );
      mockViewportRect(container);
      fireImageLoad(container, 1000, 800);
      const img = container.querySelector('img')!;
      fireEvent.pointerDown(img, { clientX: 200, clientY: 200, pointerId: 1 });
      fireEvent.pointerMove(img, { clientX: 250, clientY: 220, pointerId: 1 });
      fireEvent.pointerUp(img, { clientX: 250, clientY: 220, pointerId: 1 });
      expect(onChangeEnd).toHaveBeenCalled();
    });

    it('drag clamps so value.x stays in [0, imageWidth - width]', () => {
      const onChange = vi.fn();
      const { container } = render(
        <ImageCrop
          src="data:,placeholder"
          value={{ x: 100, y: 50, width: 400, height: 400 }}
          onChange={onChange}
          aspectRatio={1}
        />,
      );
      mockViewportRect(container, { width: 400, height: 400 });
      fireImageLoad(container, 1000, 800);
      onChange.mockClear();
      const img = container.querySelector('img')!;
      fireEvent.pointerDown(img, { clientX: 200, clientY: 200, pointerId: 1 });
      // Huge rightward drag — should clamp x at 0 (can't go below).
      fireEvent.pointerMove(img, { clientX: 5000, clientY: 200, pointerId: 1 });
      const fired = onChange.mock.calls.at(-1)?.[0] as CropArea;
      expect(fired.x).toBe(0);
    });

    it('disabled: pointerdown does not start drag', () => {
      const onChange = vi.fn();
      const { container } = render(
        <ImageCrop
          src="data:,placeholder"
          value={{ x: 100, y: 50, width: 400, height: 400 }}
          onChange={onChange}
          disabled
        />,
      );
      mockViewportRect(container);
      fireImageLoad(container);
      onChange.mockClear();
      const img = container.querySelector('img')!;
      fireEvent.pointerDown(img, { clientX: 200, clientY: 200, pointerId: 1 });
      fireEvent.pointerMove(img, { clientX: 250, clientY: 220, pointerId: 1 });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('zoom', () => {
    it('Slider onChange updates crop area dimensions (smaller at higher zoom)', () => {
      const onChange = vi.fn();
      const value: CropArea = { x: 100, y: 50, width: 400, height: 400 };
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={value} onChange={onChange} aspectRatio={1} />,
      );
      mockViewportRect(container, { width: 400, height: 400 });
      fireImageLoad(container, 1000, 800);
      onChange.mockClear();
      // Find the embedded zoom slider thumb and fire ArrowRight twice (the Slider's
      // own keyboard handler will move zoom up by 0.01 × 2 = 0.02).
      const sliderThumb = container.querySelector<HTMLElement>('[role="slider"]')!;
      sliderThumb.focus();
      fireEvent.keyDown(sliderThumb, { key: 'ArrowRight' });
      const fired = onChange.mock.calls.at(-1)?.[0] as CropArea;
      // At zoom > 1, width should be less than 400.
      expect(fired.width).toBeLessThan(400);
      expect(fired.height).toBeLessThan(400);
    });

    it('showZoomControl=false: no slider rendered', () => {
      const { container } = render(
        <ImageCrop
          src="data:,placeholder"
          value={null}
          onChange={() => {}}
          showZoomControl={false}
        />,
      );
      expect(container.querySelector('[role="slider"]')).not.toBeInTheDocument();
    });
  });

  describe('extractCropBlob utility', () => {
    // Helper: mock canvas getContext + drawImage + toBlob.
    function mockCanvas() {
      const ctxDrawImage = vi.fn();
      const ctx = { drawImage: ctxDrawImage } as unknown as CanvasRenderingContext2D;
      const toBlob = vi.fn((cb: (blob: Blob | null) => void) => {
        cb(new Blob([new Uint8Array(10)], { type: 'image/png' }));
      });
      const getContext = vi.fn(() => ctx);
      const originalCreate = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((
        tag: string,
      ) => {
        if (tag === 'canvas') {
          return {
            getContext,
            toBlob,
            set width(_v: number) {},
            set height(_v: number) {},
          } as unknown as HTMLCanvasElement;
        }
        return originalCreate(tag);
      }) as typeof document.createElement);
      return { ctxDrawImage, toBlob, getContext, createElementSpy };
    }

    // Helper: stub Image constructor so loading "succeeds" synchronously
    // without a real network/decode.
    function stubImageLoad(naturalWidth = 1000, naturalHeight = 800) {
      const RealImage = window.Image;
      class StubImage {
        crossOrigin = '';
        naturalWidth = naturalWidth;
        naturalHeight = naturalHeight;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_v: string) {
          // Fire onload on next microtask to mimic real image load.
          queueMicrotask(() => this.onload?.());
        }
      }
      (window as unknown as { Image: typeof Image }).Image = StubImage as unknown as typeof Image;
      return () => {
        (window as unknown as { Image: typeof Image }).Image = RealImage;
      };
    }

    it('returns a Blob for the cropped region', async () => {
      const { ctxDrawImage, toBlob, createElementSpy } = mockCanvas();
      const restoreImage = stubImageLoad(1000, 800);
      const area: CropArea = { x: 100, y: 50, width: 400, height: 400 };
      const blob = await extractCropBlob('data:,placeholder', area);
      expect(blob).toBeInstanceOf(Blob);
      // drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
      expect(ctxDrawImage).toHaveBeenCalledWith(
        expect.anything(),
        100,
        50,
        400,
        400,
        0,
        0,
        400,
        400,
      );
      // Default type is 'image/png', default quality 0.92.
      expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png', 0.92);
      restoreImage();
      createElementSpy.mockRestore();
    });

    it('outputWidth scales the canvas dimensions proportionally', async () => {
      const { ctxDrawImage, createElementSpy } = mockCanvas();
      const restoreImage = stubImageLoad(1000, 800);
      const area: CropArea = { x: 100, y: 50, width: 400, height: 400 };
      await extractCropBlob('data:,placeholder', area, { outputWidth: 200 });
      // outputWidth=200, area aspect 1 → outH = 200 * (400/400) = 200.
      expect(ctxDrawImage).toHaveBeenCalledWith(
        expect.anything(),
        100,
        50,
        400,
        400,
        0,
        0,
        200,
        200,
      );
      restoreImage();
      createElementSpy.mockRestore();
    });

    it('passes type and quality to canvas.toBlob', async () => {
      const { toBlob, createElementSpy } = mockCanvas();
      const restoreImage = stubImageLoad();
      const area: CropArea = { x: 0, y: 0, width: 100, height: 100 };
      await extractCropBlob('data:,placeholder', area, { type: 'image/jpeg', quality: 0.5 });
      expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.5);
      restoreImage();
      createElementSpy.mockRestore();
    });
  });

  describe('misc', () => {
    it('className merges with the base class', () => {
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={null} onChange={() => {}} className="custom" />,
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toMatch(/custom/);
      expect(root.className).toMatch(/root_/);
    });

    it('forwards ref to the outermost div', () => {
      const ref = createRef<HTMLDivElement>();
      render(<ImageCrop ref={ref} src="data:,placeholder" value={null} onChange={() => {}} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });
});
```

### Step 3.2: Modify `src/index.ts` — add ImageCrop + extractCropBlob re-exports

Read `packages/design-system/src/index.ts` first. Find an alphabetically-adjacent insertion point — `ImageCrop` slots between `FileUpload` and `Input` (or near other I-named exports).

Apply this Edit (use `replace_all: false`):

**old_string:**

```ts
export { FileUpload } from './components/FileUpload';
export type {
  FileUploadProps,
  FileEntry,
  FileUploadStatus,
  FileRejectReason,
} from './components/FileUpload';
```

**new_string:**

```ts
export { FileUpload } from './components/FileUpload';
export type {
  FileUploadProps,
  FileEntry,
  FileUploadStatus,
  FileRejectReason,
} from './components/FileUpload';

export { ImageCrop, extractCropBlob } from './components/ImageCrop';
export type { ImageCropProps, CropArea, ExtractCropOptions } from './components/ImageCrop';
```

If the FileUpload block isn't in that exact form (e.g. additional fields were added), expand the `old_string` until unique.

### Step 3.3: Verify gates

- [ ] Run `make test`. Expected: all ImageCrop tests pass + the structure meta-test passes.
- [ ] Run `make build-lib`. Expected: clean.

### Step 3.4: Commit

```bash
git add packages/design-system/src/components/ImageCrop/ImageCrop.test.tsx \
        packages/design-system/src/index.ts
git commit -m "$(cat <<'EOF'
ImageCrop: unit tests (~25 cases) + barrel re-export

Tests cover rendering / loading (skeleton, error, disabled), object URL
lifecycle (File/Blob creates+revokes; string passes through; src-change
revokes old; unmount revokes), crop area / value handling (null → fires
default; controlled value renders correct transform; aspectRatio
constraints), drag (pointerdown/move/up + clamping + disabled), zoom
(Slider integration + showZoomControl=false), extractCropBlob utility
(drawImage args, outputWidth resize, type/quality passthrough). Includes a
setPointerCapture shim and Image-constructor stub for jsdom.

Also re-exports ImageCrop + extractCropBlob + types (CropArea, ImageCropProps,
ExtractCropOptions) from src/index.ts so structure meta-test passes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: AGENTS.md ImageCrop section

**Files:**

- Modify: `packages/design-system/AGENTS.md`

### Step 4.1: Verify the ImageCrop re-export exists

- [ ] Read `packages/design-system/src/index.ts` and confirm the `export { ImageCrop, extractCropBlob }` block is present (T3 added it). If missing, STOP and report.

### Step 4.2: Insert the ImageCrop section after `<Slider>` and before `<Card>`

The Slider section (PR #58) sits at the end of the Forms cluster, right before Card. Insert the ImageCrop section AFTER Slider and BEFORE Card.

Read `packages/design-system/AGENTS.md` to find the exact boundary. The anchor pattern: the Slider section's last "Hard rule" bullet + a blank line + the Card heading.

Use the Edit tool with `replace_all: false`. The `old_string` should include the closing line of the Slider section combined with the Card heading. The implementer reads the file first to capture the exact closing line.

Suggested anchor (verify against the current file):

**old_string:**

```markdown
- ❌ Passing `value[0] > value[1]` in range mode. The component clamps but the inverted tuple is a consumer bug — fix the state shape.

### `<Card>` — bordered container
```

**new_string:**

````markdown
- ❌ Passing `value[0] > value[1]` in range mode. The component clamps but the inverted tuple is a consumer bug — fix the state shape.

### `<ImageCrop>` — controlled image cropper

```tsx
const [crop, setCrop] = useState<CropArea | null>(null);

<ImageCrop src={file} value={crop} onChange={setCrop} aspectRatio={1} />;

// In the Save handler:
const handleSave = async () => {
  if (!crop) return;
  const blob = await extractCropBlob(file, crop, {
    type: 'image/jpeg',
    quality: 0.9,
    outputWidth: 512,
  });
  await uploadToS3(blob);
};
```

- **Controlled-only.** `value: CropArea | null` (in source-image pixels). Pass `null` initially — the component computes the default centered crop on first image load and fires `onChange` once. From then on, the consumer owns the state.
- **`src: string | File | Blob`** — string URLs pass through; File/Blob are normalized to object URLs internally with cleanup on unmount + src change. Consumer never sees the URL.
- **Pattern A drag**: the crop box is centered in the viewport; the user drags the IMAGE to reposition. Zoom adjusts via the embedded `<Slider>`. No corner / edge resize handles.
- **`aspectRatio?: number`** — pass `1` for square, `16/9` for landscape, etc. Omit for free aspect (crop box fills the viewport; zoom controls effective cropped region).
- **`onChange` fires per drag/zoom tick (high frequency).** Debounce in the consumer OR use `onChangeEnd` (fires on pointerup / slider release).
- **`extractCropBlob(src, area, options?)`** is a top-level utility (NOT a ref method). Call it in the Save handler to produce the cropped Blob. Supports `type` (PNG/JPEG/WebP), `quality` (0..1 for lossy), and `outputWidth` (proportional resize — useful for capping avatar size).
- **Keyboard** (when the viewport is focused): Arrow keys pan by 5px (source coords). Home/End jump to top-left / bottom-right. PageUp/Down zoom by ±0.25.
- **Loading state**: shows `<Skeleton variant="rectangular">` until the image's `onload` fires. Errors show "Couldn't load image" in danger tone.
- **`disabled`**: drag and zoom both disabled. Viewport opacity dimmed.

#### `CropArea` (in source-image pixels)

```ts
interface CropArea {
  x: number; // top-left X in source-image pixels
  y: number; // top-left Y in source-image pixels
  width: number; // crop width in source-image pixels
  height: number; // crop height in source-image pixels
}
```

#### `ExtractCropOptions`

```ts
interface ExtractCropOptions {
  type?: 'image/png' | 'image/jpeg' | 'image/webp'; // default 'image/png'
  quality?: number; // 0..1, default 0.92 (ignored for PNG)
  outputWidth?: number; // resize output width; height proportional
}
```

#### Hard rule

- ❌ Hand-rolling a `<canvas>` + drag math per page. Use this.
- ❌ Calling `extractCropBlob` on every `onChange` tick. The encode is expensive — call ONCE in the consumer's Save handler.
- ❌ Wrapping `<img>` in CSS clip-path for a "crop preview" — that doesn't produce a cropped Blob. Use `extractCropBlob`.
- ❌ `<ImageCrop ref={ref}>` expecting `.getBlob()`. There's no imperative API. The extraction utility is a top-level export.
- ❌ Cropping a circular avatar at the canvas level. Crop rectangular, then CSS-mask in the consumer.

### `<Card>` — bordered container
````

If the Slider section's closing bullet doesn't match exactly, expand the anchor with one more preceding line.

### Step 4.3: Verify gates

- [ ] Run `make build`. Expected: clean.
- [ ] Run `make lint`. Expected: clean.

### Step 4.4: Commit

```bash
git add packages/design-system/AGENTS.md
git commit -m "$(cat <<'EOF'
AGENTS.md: add ImageCrop section after Slider, before Card

API table, canonical snippets (profile-photo crop, free aspect, Modal
integration), CropArea + ExtractCropOptions type tables, extractCropBlob
utility signature + Save-handler recipe, and the "Hard rule" callout with
the 5 anti-patterns the primitive replaces.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Playground demo + 4-place wiring

**Files:**

- Create: `packages/playground/src/pages/components/ImageCropDemo.tsx`
- Modify: `packages/playground/src/App.tsx`
- Modify: `packages/playground/src/layout/AppShell/AppShell.tsx`
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx`
- Modify: `packages/playground/src/pages/mockups/registry.ts`

### Step 5.1: Create `ImageCropDemo.tsx`

- [ ] Write file contents (verbatim):

```tsx
import { useEffect, useState } from 'react';
import {
  ImageCrop,
  extractCropBlob,
  FileUpload,
  type CropArea,
  type FileEntry,
} from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { Text } from '@eocrm/design-system';
import { Code } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/ImageCrop/ImageCrop.tsx?raw';
import scssSource from '@lib-source/components/ImageCrop/ImageCrop.module.scss?raw';

// Public sample image used across all examples — a generic photo from picsum.
// Using a fixed seed so the image is stable across page loads.
const SAMPLE_IMAGE = 'https://picsum.photos/seed/eocrm-imagecrop/1200/800';

function makeId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2)}`;
}

function BasicSquare() {
  const [crop, setCrop] = useState<CropArea | null>(null);
  return (
    <Stack gap="sm">
      <ImageCrop src={SAMPLE_IMAGE} value={crop} onChange={setCrop} aspectRatio={1} />
      <Text size="sm" tone="muted">
        Crop:{' '}
        <Code>
          {crop
            ? `${Math.round(crop.x)}, ${Math.round(crop.y)} — ${Math.round(crop.width)}×${Math.round(crop.height)}`
            : 'computing...'}
        </Code>
      </Text>
    </Stack>
  );
}

function Landscape() {
  const [crop, setCrop] = useState<CropArea | null>(null);
  return <ImageCrop src={SAMPLE_IMAGE} value={crop} onChange={setCrop} aspectRatio={16 / 9} />;
}

function FreeAspect() {
  const [crop, setCrop] = useState<CropArea | null>(null);
  return <ImageCrop src={SAMPLE_IMAGE} value={crop} onChange={setCrop} />;
}

function FileUploadIntegration() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [crop, setCrop] = useState<CropArea | null>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);

  // Reset crop when the file changes.
  const pickedFile = files[0]?.file ?? null;
  useEffect(() => {
    setCrop(null);
    setSavedUrl(null);
  }, [pickedFile]);

  const handleSave = async () => {
    if (!pickedFile || !crop) return;
    const blob = await extractCropBlob(pickedFile, crop, {
      type: 'image/jpeg',
      quality: 0.9,
      outputWidth: 256,
    });
    if (savedUrl) URL.revokeObjectURL(savedUrl);
    setSavedUrl(URL.createObjectURL(blob));
  };

  return (
    <Stack gap="md">
      <FileUpload
        files={files}
        accept="image/*"
        maxSize={5 * 1024 * 1024}
        onFilesAdded={(added) =>
          setFiles(added.map((f) => ({ id: makeId(), file: f, status: 'done' as const })))
        }
        onFileRemove={(entry) => setFiles((prev) => prev.filter((e) => e.id !== entry.id))}
      />
      {pickedFile && (
        <>
          <ImageCrop src={pickedFile} value={crop} onChange={setCrop} aspectRatio={1} />
          <Cluster gap="sm" align="center">
            <Button onClick={handleSave} disabled={!crop}>
              Save crop (256×256 JPEG)
            </Button>
            {savedUrl && (
              <img
                src={savedUrl}
                alt="Cropped preview"
                style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)' }}
              />
            )}
          </Cluster>
        </>
      )}
    </Stack>
  );
}

function DisabledDemo() {
  const [crop, setCrop] = useState<CropArea | null>(null);
  return <ImageCrop src={SAMPLE_IMAGE} value={crop} onChange={setCrop} aspectRatio={1} disabled />;
}

export function ImageCropDemo() {
  return (
    <DemoLayout
      name="ImageCrop"
      description="Controlled image-crop primitive. Pattern-A drag (crop box centered, image dragged, slider-controlled zoom). Hand-rolled on <canvas>. extractCropBlob utility for the consumer's Save handler."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="ImageCrop.tsx"
      scssFilename="ImageCrop.module.scss"
      componentName="ImageCrop"
    >
      <Example
        title="Basic (square aspect)"
        description="aspectRatio={1}. The crop box is centered as a square inside the viewport. Drag the image to reposition; zoom slider scales it."
        code={`function BasicSquare() {
  const [crop, setCrop] = useState<CropArea | null>(null);
  return <ImageCrop src={SAMPLE_IMAGE} value={crop} onChange={setCrop} aspectRatio={1} />;
}`}
      >
        <BasicSquare />
      </Example>

      <Example
        title="Landscape (16:9)"
        description="aspectRatio={16/9}. Crop box matches the configured ratio inside the viewport."
        code={`<ImageCrop src={SAMPLE_IMAGE} value={crop} onChange={setCrop} aspectRatio={16 / 9} />`}
      >
        <Landscape />
      </Example>

      <Example
        title="Free aspect (no aspectRatio prop)"
        description="Crop box fills the entire viewport. The user controls the cropped region via zoom only (zooming in shows less of the source)."
        code={`<ImageCrop src={SAMPLE_IMAGE} value={crop} onChange={setCrop} />`}
      >
        <FreeAspect />
      </Example>

      <Example
        title="FileUpload integration"
        description="The canonical 'pick → crop → save' flow. <FileUpload> picks an image; <ImageCrop> opens for cropping; the Save button calls extractCropBlob and shows the 256×256 cropped preview."
        code={`function FileUploadIntegration() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [crop, setCrop] = useState<CropArea | null>(null);
  const pickedFile = files[0]?.file ?? null;

  const handleSave = async () => {
    if (!pickedFile || !crop) return;
    const blob = await extractCropBlob(pickedFile, crop, {
      type: 'image/jpeg',
      quality: 0.9,
      outputWidth: 256,
    });
    // upload blob...
  };

  return (
    <Stack gap="md">
      <FileUpload files={files} onFilesAdded={...} onFileRemove={...} />
      {pickedFile && (
        <>
          <ImageCrop src={pickedFile} value={crop} onChange={setCrop} aspectRatio={1} />
          <Button onClick={handleSave}>Save crop</Button>
        </>
      )}
    </Stack>
  );
}`}
      >
        <FileUploadIntegration />
      </Example>

      <Example
        title="Disabled"
        description="Viewport is grayed (--opacity-disabled); drag and zoom both no-op."
        code={`<ImageCrop src={SAMPLE_IMAGE} value={crop} onChange={setCrop} aspectRatio={1} disabled />`}
      >
        <DisabledDemo />
      </Example>
    </DemoLayout>
  );
}
```

### Step 5.2: Modify `App.tsx` — add import + route

Read `packages/playground/src/App.tsx`. ImageCrop slots alphabetically between FileUpload and Input.

**Edit 5a — add import**:

old_string:

```tsx
import { FileUploadDemo } from './pages/components/FileUploadDemo';
```

new_string:

```tsx
import { FileUploadDemo } from './pages/components/FileUploadDemo';
import { ImageCropDemo } from './pages/components/ImageCropDemo';
```

**Edit 5b — add route**:

old_string:

```tsx
<Route path="/components/file-upload" element={<FileUploadDemo />} />
```

new_string:

```tsx
          <Route path="/components/file-upload" element={<FileUploadDemo />} />
          <Route path="/components/image-crop" element={<ImageCropDemo />} />
```

### Step 5.3: Modify `AppShell.tsx` — add lucide Crop icon + Forms-group item

Read `packages/playground/src/layout/AppShell/AppShell.tsx`. Forms group is alphabetical: ..., FileUpload, Input, .... ImageCrop slots between FileUpload and Input (I-m before I-n).

**Edit 5c — add lucide Crop import** (anchor closing `type LucideIcon` line):

old_string:

```tsx
  type LucideIcon,
} from 'lucide-react';
```

new_string:

```tsx
  Crop,
  type LucideIcon,
} from 'lucide-react';
```

If a previous PR added an icon adjacent to the closing line, expand the `old_string` with one more preceding line for uniqueness.

**Edit 5d — add Forms-group item between FileUpload and Input**:

old_string:

```tsx
      { to: '/components/file-upload', label: 'FileUpload', icon: UploadCloud, end: false },
      { to: '/components/input', label: 'Input', icon: TextCursorInput, end: false },
```

new_string:

```tsx
      { to: '/components/file-upload', label: 'FileUpload', icon: UploadCloud, end: false },
      { to: '/components/image-crop', label: 'ImageCrop', icon: Crop, end: false },
      { to: '/components/input', label: 'Input', icon: TextCursorInput, end: false },
```

### Step 5.4: Modify `ComponentsIndex.tsx` — add import + card

Read the file.

**Edit 5e — add import**:

old_string:

```tsx
import { FileUpload } from '@eocrm/design-system';
```

new_string:

```tsx
import { FileUpload } from '@eocrm/design-system';
import { ImageCrop } from '@eocrm/design-system';
```

**Edit 5f — add card entry**:

Find the existing FileUpload card's complete `{ ... },` block. Apply Edit with that block + the new ImageCrop card block. The ImageCrop card uses this exact shape:

```tsx
  {
    to: '/components/image-crop',
    name: 'ImageCrop',
    description: 'Controlled image-crop primitive on <canvas>. Pattern-A drag (centered box, draggable image, slider-controlled zoom). Top-level extractCropBlob utility for the Save handler.',
    preview: (
      <div style={{ width: '100%', maxWidth: 220, height: 120, overflow: 'hidden', borderRadius: 'var(--radius-md)' }}>
        <ImageCrop
          src="https://picsum.photos/seed/eocrm-card/400/300"
          value={{ x: 50, y: 25, width: 200, height: 200 }}
          onChange={() => {}}
          aspectRatio={1}
          showZoomControl={false}
          style={{ pointerEvents: 'none' }}
        />
      </div>
    ),
  },
```

Insert AFTER the FileUpload card.

### Step 5.5: Modify `registry.ts` — extend ComponentName union

Read the file. Insert `'ImageCrop'` between FileUpload and Input.

old_string:

```ts
  | 'FileUpload'
```

new_string:

```ts
  | 'FileUpload'
  | 'ImageCrop'
```

If the union has different surrounding context, find a unique two-line anchor and insert `'ImageCrop'` in alphabetical position.

### Step 5.6: Verify gates

- [ ] Run `make build`. Expected: clean (the playground typechecks against `@eocrm/design-system`'s new exports).
- [ ] Run `make lint`. Expected: clean.

### Step 5.7: Commit

```bash
git add packages/playground/src/pages/components/ImageCropDemo.tsx \
        packages/playground/src/App.tsx \
        packages/playground/src/layout/AppShell/AppShell.tsx \
        packages/playground/src/pages/components/ComponentsIndex.tsx \
        packages/playground/src/pages/mockups/registry.ts
git commit -m "$(cat <<'EOF'
ImageCrop demo + 4-place wiring

ImageCropDemo: 5 examples — basic square, landscape 16:9, free aspect,
FileUpload integration (the canonical pick → crop → save flow with a
256×256 JPEG preview), disabled. Wired into App.tsx routes, AppShell Forms
nav (Crop icon between FileUpload and Input alphabetically), ComponentsIndex
overview card, mockup registry ComponentName union.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Hard Rule 8 + push + PR

**Files:** none directly — this task is the review loop on Tasks 1–5.

### Step 6.1: Run all four gates from the repo root

- [ ] `cd /home/dpws/projects/design-system && make test`. Expected: every test passes (1778 baseline from PR #58 + ~25 ImageCrop = ~1803).
- [ ] `make build-lib`. Expected: clean.
- [ ] `make build`. Expected: clean.
- [ ] `make lint`. Expected: clean.

If any gate fails, fix and re-run all four. Don't proceed to 6.2 until all four are green.

### Step 6.2: Dispatch the HR8 reviewer (round 1)

Use a fresh-context `general-purpose` agent with **opus** model. Brief on the 10 review categories from `packages/design-system/CLAUDE.md` Rule 8.

**Pre-known design decisions to forward** (do NOT re-litigate these):

1. **Hand-rolled on `<canvas>`**, NOT react-easy-crop. Matches library convention.
2. **Pattern A drag** (crop box centered, image dragged). Pattern B deferred to v2.
3. **`extractCropBlob` is a top-level utility, not a ref API**. Pure declarative.
4. **Zoom is internal state**, not controlled. Consumer's `value: CropArea` captures the effective output.
5. **Object URL lifecycle owned by component** for File/Blob `src`.
6. **`role` is NOT locked** — root is a plain div with `tabIndex={0}`.
7. **No rotation, no multi-touch, no pinch-zoom** in v1.
8. **No `<ImageCropModal>` wrapper.** Consumers compose Modal + ImageCrop + Save handler themselves.
9. **DataTable/TanStack docs correction** is bundled in this PR (T1).
10. **No mockup refactor.** No current mockup uses image crop.

**Particular things to ask for fresh eyes on:**

A. **Pattern A coordinate math** — value-to-render conversion: `scale = boxW / value.width`. Image transform: `translate(originX, originY) scale(scale)`. Is this geometry correct for all combinations of viewport size, image natural size, aspectRatio?

B. **Drag math sign flip** — `next.x = startValue.x - dx / scale`. Pointer right pans image right in viewport, which means the crop region's left edge moves LEFT in source coords (more of the right side is now under the centered crop box). Is the sign correct?

C. **Object URL lifecycle** — useEffect creates the URL on mount or src-change and revokes on cleanup. What if the component remounts mid-load? The useEffect cleanup fires before the new effect, so the old URL is revoked before the new one is created. Looks correct. Verify no race.

D. **`useLayoutEffect` for viewport measurement** — runs synchronously after DOM mutations but before paint. Should the resize listener also re-run measure if the consumer's container changes via parent state? Currently the only re-measure trigger is `window.resize`. Worth adding `ResizeObserver`?

E. **`extractCropBlob` CORS handling** — sets `img.crossOrigin = 'anonymous'`. This only works if the source server returns `Access-Control-Allow-Origin`. If the consumer passes a cross-origin URL without CORS headers, the image fails to load OR the canvas is tainted and `toBlob` throws. Documented?

F. **Initial value=null → default crop fires onChange once** — uses `initializedRef.current` to prevent double-firing. What if the consumer's state update is async (React 18 transitions)? Could the default fire twice before `initializedRef` flips? Verify.

G. **Aspect ratio change at runtime** — consumer toggles `aspectRatio` from `1` to `16/9` mid-render. The current value (CropArea) doesn't satisfy the new ratio. What happens? Currently: the crop box dimensions update, but `value` still has the old width/height. Visual mismatch until next drag. Worth a re-fit useEffect?

H. **Disabled state + drag handler refs** — `dragStateRef` could be left non-null if disabled flips to true mid-drag. The pointerup handler checks disabled at the top and bails before clearing the ref. Stale state. Worth flagging.

I. **JSDoc completeness per Rule 7** — every exported member (ImageCrop, extractCropBlob, CropArea, ImageCropProps, ExtractCropOptions) has JSDoc.

J. **Bundle / distribution** — `npm pack --dry-run` should include the ImageCrop directory (ImageCrop.tsx, ImageCrop.module.scss, extractCropBlob.ts, index.ts), no test files.

K. **AGENTS.md placement** — confirmed between Slider and Card, in the Forms cluster.

L. **TanStack docs correction landed cleanly** — CLAUDE.md no longer has the stale wishlist line; Table.tsx JSDoc updated.

Output format: Critical / Important / Nice-to-have / Regression-watch + a final verdict line: `clean enough to stop` or `keep iterating`.

### Step 6.3: Fix every Critical + Important finding

- [ ] For each Critical, fix in-line and commit with `ImageCrop: HR8 review-cycle fixes (round N) — <short rationale>`.
- [ ] Same for Important.
- [ ] Nice-to-haves are judgment calls — fix when cheap.
- [ ] For every finding deliberately skipped, include a one-line "why we skipped" in the next response.

### Step 6.4: Re-run all four gates after fixes

- [ ] `make test && make build-lib && make build && make lint`. All clean.

### Step 6.5: Dispatch HR8 reviewer (round 2+)

Same prompt as 6.2, framed as "round N — verify round (N-1) fixes". Continue until verdict is `clean enough to stop`.

### Step 6.6: Push the branch

- [ ] `git push -u origin feat/image-crop-and-docs`. If husky pre-push hook fails on `format:check`:
  1. `npx prettier --write <listed files>`
  2. `git add <files> && git commit -m "ImageCrop: prettier --write" -m "" -m "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"`
  3. `git push`

### Step 6.7: Open the PR

Use `gh pr create --body-file` (NOT a heredoc with backticks). Write the PR body to `/tmp/pr-image-crop-body.md` first via the Write tool, then:

```bash
gh pr create --title "ImageCrop + extractCropBlob + TanStack docs correction" --body-file /tmp/pr-image-crop-body.md
```

PR body content:

````markdown
## Summary

`<ImageCrop>` — controlled, inline image-crop primitive built on `<canvas>` with Pattern-A drag (centered crop box, draggable image, slider-controlled zoom). Plus `extractCropBlob` — a top-level utility for the consumer's Save handler. Plus a small docs correction removing stale TanStack-Table references.

## What ships

### `<ImageCrop>`

- **Controlled `value: CropArea | null`** in source-image pixel coordinates. Pass `null` initially — the component computes the default centered crop and fires `onChange` once.
- **`src: string | File | Blob`** — string URLs pass through; File/Blob are normalized to object URLs internally (cleanup on unmount + src change).
- **Pattern A drag**: crop box centered in viewport; user drags the IMAGE to reposition. No corner/edge handles.
- **Embedded `<Slider>`** (PR #58) for zoom. `showZoomControl={false}` hides it.
- **`aspectRatio?: number`** — `1` square, `16/9` landscape, etc. Omit for free aspect.
- **`onChange` per drag/zoom tick; `onChangeEnd` on release.** Consumer debounces expensive logic.
- **Keyboard** (viewport focused): Arrow pan 5px source coords, Home/End to corners, PageUp/Down zoom ±0.25.

### `extractCropBlob` (top-level utility, NOT a ref method)

```tsx
const blob = await extractCropBlob(src, area, { type, quality, outputWidth });
```
````

- Loads the source (string/File/Blob), creates an off-screen canvas at output dimensions, `drawImage` + `toBlob`. Supports PNG/JPEG/WebP, quality 0..1 (lossy only), proportional resize via `outputWidth`.
- Consumer calls in their Save handler — NOT on every onChange tick. Pure-declarative architecture; no imperative `ref.getBlob()`.

### TanStack docs correction (bundled)

- `packages/design-system/CLAUDE.md`: removed the stale wishlist line `Table (TanStack Table headless is acceptable here ...)`. Table + DataTable both shipped; carve-out was moot because DataTable was hand-rolled.
- `packages/design-system/src/components/Table/Table.tsx`: rewrote the `@remarks` JSDoc line about DataTable composing "+ TanStack Table headless." Replaced with a description of what actually shipped (hand-rolled state machine).
- Historical files in `docs/superpowers/` left as immutable artifacts of past sessions.

## Design decisions baked in

- **Controlled-only.** Matches Slider, FileUpload, Progress.
- **Hand-rolled canvas** (no react-easy-crop dep). Library convention prefers hand-rolling for behavioral primitives.
- **`extractCropBlob` is top-level**, not a ref API. Pure-declarative.
- **Object URL lifecycle owned by component** for File/Blob src.
- **Zoom is internal state**, not controlled. The crop area captures effective output.
- **No `<ImageCropModal>` wrapper.** Consumers compose Modal + ImageCrop + Save handler.
- **No rotation, no multi-touch, no pinch-zoom** in v1.

## Tests

**~25 cases** across rendering/loading, object URL lifecycle (mocked), crop area handling (default centered, controlled), drag (pointerdown/move/up + clamping + disabled), zoom (Slider integration + showZoomControl=false), and the `extractCropBlob` utility (drawImage args, outputWidth resize, type/quality passthrough). Includes a `setPointerCapture` shim and `Image` constructor stub for jsdom.

## Hard Rule 8

Standard cycle ran to `clean enough to stop`.

## Branch naming note

This PR ships ImageCrop AND the docs correction together on `feat/image-crop-and-docs`. User explicitly asked for the bundled PR. Trade-off acknowledged: a trivial docs fix is hostage to ImageCrop's HR8 cycle; defensible because the docs fix is small (~5 lines across 2 files).

## Test plan

- [ ] `/components/image-crop`: 5 examples render (basic square, landscape, free aspect, FileUpload integration, disabled).
- [ ] Drag the image in any example — see crop coords update in the "Crop: ..." label.
- [ ] FileUpload integration: pick a local image → crop appears → click Save → 256×256 JPEG preview renders.
- [ ] Tab into the viewport, press Arrow keys — crop coords shift by 5px. Home/End jump to corners.
- [ ] AGENTS.md ImageCrop section appears between Slider and Card.
- [ ] `npm pack --dry-run` includes ImageCrop directory, no test files.
- [ ] CLAUDE.md wishlist no longer mentions Table+TanStack.
- [ ] Table.tsx JSDoc no longer claims DataTable is unshipped or uses TanStack.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

```

- [ ] Print the PR URL when done.

---

## Self-review (run before invoking subagent-driven-development)

### Spec coverage

- Spec §Goal / §Why now — T4 (AGENTS.md) + T5 (demos).
- Spec §Bundled docs correction — T1 (the first task).
- Spec §Non-goals — encoded in JSDoc anti-patterns in T2.
- Spec §Architecture (file layout, composition) — matches Tasks 1, 2, 5.
- Spec §Public API — T2 (verbatim types + interface for ImageCropProps + CropArea + ExtractCropOptions).
- Spec §Render shape — T2 (the full component body).
- Spec §Drag math (Pattern A coord systems, value-to-render, drag math, zoom math, keyboard) — T2 implements all five; T3 tests cover them.
- Spec §Styling — T2's SCSS spelled out verbatim with the proactive stylelint disables.
- Spec §ARIA + behavior reference — encoded in T2's component code + tested in T3.
- Spec §Testing — T3 covers every numbered spec case (~25 total) across rendering/loading, object URL lifecycle, crop area handling, drag, zoom, and the utility.
- Spec §Demo additions — T5 ImageCropDemo has all 5 examples.
- Spec §AGENTS.md update — T4.
- Spec §TanStack docs correction — T1.
- Spec §Self-imposed constraints — encoded in code + JSDoc anti-patterns.
- Spec §Hard Rule 8 — T6.
- Spec §Open questions — none remaining.
- Spec §Follow-up tasks — out of scope, documented.

### Placeholder scan

- "TBD" / "TODO" / "implement later" — none.
- "Add appropriate error handling" / "handle edge cases" — none.
- "Write tests for the above" without code — none.
- "Similar to Task N" — none (every code block is fully spelled out).
- T4's AGENTS.md edit uses a "read the file to capture the exact anchor" pattern — same as prior PRs (Slider/Typography/Progress). Documented with the exact closing-bullet anchor.
- T5's ComponentsIndex card edit uses the same "find-the-preceding-entry, expand-with-new-card" pattern.

### Type consistency

- `ImageCropProps`, `CropArea`, `ExtractCropOptions` — declared in T2 source; used by T3 test imports; re-exported in T3's src/index.ts edit; referenced in T4 AGENTS.md prose; imported in T5 demo. Same vocabulary throughout.
- `extractCropBlob` function signature consistent: `(src: string | File | Blob, area: CropArea, options?: ExtractCropOptions) => Promise<Blob>`.
- SCSS class names camelCase (`.viewport`, `.image`, `.imageDragging`, `.cropBox`, `.skeleton`, `.errorState`, `.zoomControl`, `.disabled`). Test regex substrings (`/viewport/`, `/imageDragging/`, `/cropBox/`, `/root_/`) match.

### Found and fixed inline during write

- AppShell placement: user's task description said "between Input and PasswordInput alphabetically" but ImageCrop (`I-m`) comes BEFORE Input (`I-n`). Plan corrected to place between FileUpload and Input. Documented at the top of the conventions section.
- The card preview in ComponentsIndex uses `pointerEvents: 'none'` on the ImageCrop wrapper to prevent the preview from accidentally consuming pointer events when users hover over the card grid. Documented in the JSX comment of the preview.
- Sample image source — used picsum.photos with a fixed seed for stable demo images. Documented at the top of ImageCropDemo.tsx.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-05-24-image-crop.md`.

Per `feedback_plan_execution_mode` memory: always subagent-driven, no asking.

Use **superpowers:subagent-driven-development** to execute.

- Tasks 2, 3, 5: sonnet implementer
- Tasks 1, 4: haiku implementer (mechanical docs / AGENTS.md edits)
- Task 6 reviewers: opus
```
