import { useEffect, useRef, useState } from 'react';
import { extractCropBlob, type CropArea, type ExtractCropOptions } from './extractCropBlob';

/**
 * Options for `useCropPreview`. All optional; sensible defaults match the
 * canonical "avatar picker" recipe (JPEG, q=0.9, 256-wide preview).
 */
export interface UseCropPreviewOptions extends ExtractCropOptions {
  /**
   * Milliseconds to wait after the latest crop change before encoding.
   * Default `120`. Set higher for very large source images (4K phone
   * photos can spend ~100ms inside `drawImage` + `toBlob`); set to `0` to
   * encode synchronously on every change (useful in tests).
   */
  debounceMs?: number;
}

/**
 * Result of `useCropPreview`. `encoding` is `true` between a crop change
 * and the matching preview's arrival; consumers can fade the `<img>` or
 * overlay a spinner during that window.
 */
export interface UseCropPreviewResult {
  /**
   * Object URL of the latest preview Blob. `null` until the first encode
   * completes (or when `src`/`crop` is null). The URL is owned by the
   * hook — it auto-revokes the previous URL whenever a new one is set
   * AND on unmount. Do NOT call `URL.revokeObjectURL` on it yourself.
   */
  previewUrl: string | null;
  /**
   * The latest encoded Blob itself. Same content as the URL; useful when
   * the Save handler needs to POST the cropped result — no need to call
   * `extractCropBlob` a second time, just `formData.append('file', previewBlob, 'cropped.jpg')`.
   * `null` before the first encode completes.
   */
  previewBlob: Blob | null;
  /** Latest preview's encoded byte size, or `null` before the first encode. */
  previewSize: number | null;
  /**
   * `true` from the moment `crop` (or any option) changes until the new
   * preview lands. Use to drive a loading affordance (CircularProgress,
   * opacity fade, "Re-encoding…" label).
   */
  encoding: boolean;
}

/**
 * Live-encoded preview of a cropped image. Produces a Blob via
 * `extractCropBlob` on every `crop` change (debounced), exposes the
 * resulting object URL, byte size, and an `encoding` flag for loading UI.
 *
 * Designed for the canonical CRM "avatar / cover photo" pick → crop → save
 * flow: the user sees the cropped result update live as they drag/zoom,
 * and the consumer's Save handler can `await extractCropBlob(...)` once
 * the user confirms (the hook does NOT keep the Blob around — only the
 * URL — so the Save call re-encodes; that's fine because the user only
 * Saves once per session).
 *
 * Internally:
 * - Debounces the encode by `debounceMs` (default 120) so rapid drags/zooms
 *   don't spam the encoder.
 * - Uses a generation counter to discard stale in-flight encodes — without
 *   this, a slow encode from an older crop could resolve AFTER a newer one
 *   and overwrite the preview img with the wrong frame.
 * - Auto-revokes its object URLs on replacement and on unmount.
 *
 * @example
 * // Avatar picker:
 * const [file, setFile] = useState<File | null>(null);
 * const [crop, setCrop] = useState<CropArea | null>(null);
 * const { previewUrl, encoding } = useCropPreview(file, crop, {
 *   type: 'image/jpeg',
 *   quality: 0.9,
 *   outputWidth: 256,
 * });
 *
 * return (
 *   <Stack gap="md">
 *     <FileUpload onFilesAdded={([f]) => setFile(f)} ... />
 *     {file && (
 *       <>
 *         <ImageCrop src={file} value={crop} onChange={setCrop} aspectRatio={1} />
 *         {previewUrl && (
 *           <img src={previewUrl} style={{ opacity: encoding ? 0.5 : 1 }} />
 *         )}
 *       </>
 *     )}
 *   </Stack>
 * );
 *
 * @remarks When NOT to use
 * - For one-shot extraction (the user clicks "Save" and you need the Blob
 *   once). Call `extractCropBlob` directly in the Save handler.
 * - For server-side cropping. Send the `crop` coordinates instead.
 *
 * @remarks Anti-patterns
 * - ❌ Calling `URL.revokeObjectURL(previewUrl)` manually. The hook owns
 *   the URL lifecycle. Revoking it yourself produces broken-image renders.
 * - ❌ Using the hook with `outputWidth` matching the source image (e.g.,
 *   4080 for a 4080×3072 photo). The encode becomes expensive on every
 *   drag tick; cap `outputWidth` at the display size you actually need.
 */
export function useCropPreview(
  src: string | File | Blob | null | undefined,
  crop: CropArea | null,
  options: UseCropPreviewOptions = {},
): UseCropPreviewResult {
  const { type = 'image/jpeg', quality = 0.9, outputWidth, debounceMs = 120 } = options;

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewSize, setPreviewSize] = useState<number | null>(null);
  const [encoding, setEncoding] = useState(false);

  const urlRef = useRef<string | null>(null);
  const genRef = useRef(0);

  useEffect(() => {
    if (!src || !crop) {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      setPreviewUrl(null);
      setPreviewBlob(null);
      setPreviewSize(null);
      setEncoding(false);
      return;
    }
    const gen = ++genRef.current;
    setEncoding(true);
    const handle = setTimeout(async () => {
      try {
        const blob = await extractCropBlob(src, crop, { type, quality, outputWidth });
        if (gen !== genRef.current) return; // a newer crop has superseded us
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setPreviewUrl(url);
        setPreviewBlob(blob);
        setPreviewSize(blob.size);
        setEncoding(false);
      } catch {
        if (gen !== genRef.current) return;
        setEncoding(false);
      }
    }, debounceMs);
    return () => clearTimeout(handle);
  }, [src, crop, type, quality, outputWidth, debounceMs]);

  // Cleanup on unmount.
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  return { previewUrl, previewBlob, previewSize, encoding };
}
