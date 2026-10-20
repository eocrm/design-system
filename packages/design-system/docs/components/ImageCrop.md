> **Breaking in 0.6.0:** `minZoom`, `maxZoom` and `showZoomControl` are deleted, with no replacement. The component is now a still image with a draggable, resizable crop box, so it is shorter (no slider row) and shows a floating Reset button.

# `<ImageCrop>` — controlled image cropper

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

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `src` | `string \| File \| Blob` | yes | Image source. String URLs (HTTP/HTTPS, data:, blob:) pass through. File/Blob are normalized to object URLs internally via `URL.createObjectURL()`, with cleanup on unmount and `src` change. |
| `value` | `CropArea \| null` | yes | Controlled crop area in SOURCE-IMAGE pixel coordinates. Pass `null` to use the component's default centered crop (80% of the largest centered region matching `aspectRatio`). |
| `onChange` | `(area: CropArea) => void` | yes | Fires on every drag/resize tick. High frequency. Also fires once on first image load when `value` is `null`, with the computed default crop; after that the consumer owns the state. |
| `onChangeEnd` | `((area: CropArea) => void)` | no | Fires once when the user releases a drag or resize. |
| `aspectRatio` | `number` | no | Fixed aspect ratio for the crop box (e.g. `1` for square, `16/9`). Omit for free aspect — edge handles then appear too. Toggling it at runtime does NOT re-fit `value`; pass a fresh `value` (or `null`) with the change. |
| `disabled` | `boolean` | no | Disable all interaction (move, resize). Default `false`. Image still renders. |
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

- **Move the box**: the image is still; drag the crop box to reposition it (clamped to the image).
- **Resize**: corner handles always (ratio-locked when `aspectRatio` is set); edge handles appear in free aspect. Scroll wheel resizes around the box center by 6% per tick (scroll down grows, up shrinks).
- **Reset**: double-click or the floating Reset button restores the default crop (80% of the largest fitting box).
- **`aspectRatio?: number`** — pass `1` for square, `16/9` for landscape, etc. Omit for free aspect (edge handles appear).
- **`onChange` fires per drag/resize tick (high frequency).** Debounce in the consumer OR use `onChangeEnd` (fires on pointerup / wheel / key settle).
- **`extractCropBlob(src, area, options?)`** is a top-level utility (NOT a ref method). Call it in the Save handler to produce the cropped Blob. Supports `type` (PNG/JPEG/WebP), `quality` (0..1 for lossy), and `outputWidth` (proportional resize — useful for capping avatar size).
- **Keyboard** (when the crop area, `role="group"` "Crop area", is focused; a hint is shown): Arrow keys move the box by 5 source px. Shift+Arrows resize (Right/Down grow, Left/Up shrink; ratio-locked with `aspectRatio`, one axis in free mode). Home/End jump to top-left / bottom-right.
- **Loading state**: shows `<Skeleton variant="rectangular">` until the image's `onload` fires. Errors show "Couldn't load image" in danger tone.
- **`disabled`**: move, resize, wheel, keyboard and Reset all disabled. Viewport opacity dimmed.

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

#### `useCropPreview(src, crop, options?)` — live-preview hook

Reusable hook for the canonical "avatar / cover photo picker" flow. Debounces an `extractCropBlob` encode on every crop change, guards against stale in-flight encodes, and owns the object URL lifecycle. Returns `{ previewUrl, previewBlob, previewSize, encoding }`.

```tsx
const [file, setFile] = useState<File | null>(null);
const [crop, setCrop] = useState<CropArea | null>(null);

const { previewUrl, previewBlob, encoding } = useCropPreview(file, crop, {
  type: 'image/jpeg',
  quality: 0.9,
  outputWidth: 256,
});

const handleSave = async () => {
  if (!previewBlob) return;
  const fd = new FormData();
  fd.append('file', previewBlob, 'avatar.jpg');
  await fetch('/api/upload-avatar', { method: 'POST', body: fd });
};

return (
  <Stack gap="md">
    <FileUpload onFilesAdded={([f]) => setFile(f)} ... />
    {file && (
      <>
        <ImageCrop src={file} value={crop} onChange={setCrop} aspectRatio={1} />
        {previewUrl && <img src={previewUrl} style={{ opacity: encoding ? 0.5 : 1 }} />}
        <Button onClick={handleSave} disabled={!previewBlob || encoding}>Save</Button>
      </>
    )}
  </Stack>
);
```

`previewBlob` is the same content backing `previewUrl` — reuse it in the Save handler instead of calling `extractCropBlob` again (the hook already encoded it).

`UseCropPreviewOptions` extends `ExtractCropOptions` with one extra field:

```ts
interface UseCropPreviewOptions extends ExtractCropOptions {
  debounceMs?: number; // default 120; set to 0 in tests, 250+ for 4K photos
}
```

#### Hard rule

- ❌ Hand-rolling a `<canvas>` + drag math per page. Use this.
- ❌ Calling `extractCropBlob` on every `onChange` tick. Use `useCropPreview` if you need a live preview — it debounces and race-guards correctly. For one-shot extraction (Save click only), call `extractCropBlob` once in the handler.
- ❌ Calling `extractCropBlob` AGAIN in the Save handler when you already have `useCropPreview` mounted. Reuse `previewBlob` — it's the same encoded result.
- ❌ Wrapping `<img>` in CSS clip-path for a "crop preview" — that doesn't produce a cropped Blob. Use `extractCropBlob` or `useCropPreview`.
- ❌ `<ImageCrop ref={ref}>` expecting `.getBlob()`. There's no imperative API. The extraction utility is a top-level export.
- ❌ Calling `URL.revokeObjectURL(previewUrl)` from `useCropPreview` manually. The hook owns the URL lifecycle.
- ❌ Cropping a circular avatar at the canvas level. Crop rectangular, then CSS-mask in the consumer.
- Not for server-side cropping (send `value`'s `CropArea` coordinates to your backend instead of calling `extractCropBlob`), rotation (not supported), or pinch gestures (not supported; there is no zoom).

```tsx
// Free aspect (no aspectRatio prop)
<ImageCrop src={imageUrl} value={crop} onChange={setCrop} />

// Canonical "pick → crop → save" flow inside a Modal
<Modal isOpen onClose={cancel}>
  <Modal.Header>Crop your photo</Modal.Header>
  <Modal.Body>
    <ImageCrop src={file} value={crop} onChange={setCrop} aspectRatio={1} />
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={cancel}>Cancel</Button>
    <Button onClick={handleSave} disabled={!crop}>Save</Button>
  </Modal.Footer>
</Modal>
```
