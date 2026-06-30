// imageSize.ts — pure display-size math + a thin browser image-measurement adapter
// for RichTextEditor uploads. A newly-uploaded image is laid out at its PERCEIVED
// size (natural device pixels ÷ devicePixelRatio), capped to the editor's content
// width, instead of its raw natural-pixel size (which renders a retina screenshot
// at 2× the size you saw). See the upload flow in useUpload.ts.

/** Natural (intrinsic) pixel dimensions of an image. */
export interface NaturalSize {
  width: number;
  height: number;
}

/**
 * The on-screen display size for an image given its NATURAL pixel dimensions, the
 * current device pixel ratio, and the editor's content width. Returns `undefined`
 * when natural dimensions are unknown/invalid (caller leaves the block unsized —
 * the renderer falls back to intrinsic size capped by CSS `max-width: 100%`).
 *
 * `width = round(min(naturalWidth / dpr, capWidth))`, height scaled to preserve
 * the natural aspect ratio. A non-positive `dpr` is treated as `1`; a
 * non-positive `capWidth` means "no cap".
 */
export function computeDisplaySize(
  naturalWidth: number | undefined,
  naturalHeight: number | undefined,
  dpr: number,
  capWidth: number,
): NaturalSize | undefined {
  if (!naturalWidth || !naturalHeight || naturalWidth <= 0 || naturalHeight <= 0) return undefined;
  const ratio = dpr > 0 ? dpr : 1;
  const perceived = naturalWidth / ratio;
  const target = capWidth > 0 ? Math.min(perceived, capWidth) : perceived;
  const width = Math.max(1, Math.round(target));
  const height = Math.max(1, Math.round((width / naturalWidth) * naturalHeight));
  return { width, height };
}

/**
 * Measure an image File's natural pixel dimensions in the browser via
 * `createImageBitmap`. Resolves `null` for non-images, when the API is
 * unavailable (e.g. jsdom — so unit tests never block on image decoding), or on
 * any decode error. Injected into `useUpload` so it can be stubbed in tests.
 */
export async function measureImageFromFile(file: File): Promise<NaturalSize | null> {
  if (!file.type?.startsWith('image/') || typeof createImageBitmap !== 'function') return null;
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close?.();
    return size.width > 0 && size.height > 0 ? size : null;
  } catch {
    return null;
  }
}
