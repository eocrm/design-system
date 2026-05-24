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
    const url = typeof src === 'string' ? src : (createdObjectUrl = true, URL.createObjectURL(src));
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
