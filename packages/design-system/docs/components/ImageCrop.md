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
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `src` | `string \| File \| Blob` | yes | — | Image source. String URLs (HTTP/HTTPS, data:, blob:) pass through. File/Blob are normalized to object URLs internally via `URL.createObjectURL()`, with cleanup on unmount and `src` change. |
| `value` | `CropArea \| null` | yes | — | Controlled crop area in SOURCE-IMAGE pixel coordinates. Pass `null` to use the component's default centered crop (the largest centered region matching `aspectRatio` at zoom=1). The component computes the visual position from this + the image's natural size + the viewport size. |
| `onChange` | `(area: CropArea) => void` | yes | — | Fires on every drag/zoom tick. High frequency. |
| `onChangeEnd` | `((area: CropArea) => void)` | no | — | Fires once when the user releases the drag or releases the zoom slider thumb. |
| `aspectRatio` | `number` | no | — | Fixed aspect ratio for the crop box (e.g. `1` for square, `16/9` for landscape, `4/3` for traditional photo). Omit for free aspect — the crop box fills the entire viewport and the user controls the cropped region via zoom only. Typically a stable prop from the consumer (set once per page). Toggling `aspectRatio` at runtime updates the crop box dimensions but does NOT automatically re-fit `value` to the new ratio — pass a fresh `value` (or `null` for the new default) when you change ratios. |
| `minZoom` | `number` | no | — | Minimum zoom level. Default `1` (image fits viewport at zoom=1). |
| `maxZoom` | `number` | no | — | Maximum zoom level. Default `3`. |
| `showZoomControl` | `boolean` | no | — | Render the embedded `<Slider>` zoom control below the canvas. Default `true`. Set `false` for a pure canvas with no zoom UI — but the component's internal zoom state isn't exposed (v2 feature). |
| `disabled` | `boolean` | no | — | Disable all interaction (drag, zoom). Default `false`. Image still renders; the zoom slider is also disabled. |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

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
