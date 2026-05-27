import { useEffect, useState } from 'react';
import {
  ImageCrop,
  useCropPreview,
  FileUpload,
  type CropArea,
  type FileEntry,
} from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { Text } from '@eocrm/design-system';
import { Code } from '@eocrm/design-system';
import { CircularProgress } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

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

type OutputFormat = 'image/png' | 'image/jpeg' | 'image/webp';

const FORMAT_EXT: Record<OutputFormat, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

function FileUploadIntegration() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [crop, setCrop] = useState<CropArea | null>(null);
  const [format, setFormat] = useState<OutputFormat>('image/jpeg');

  // Reset crop when the file changes.
  const pickedFile = files[0]?.file ?? null;
  useEffect(() => {
    setCrop(null);
  }, [pickedFile]);

  // Live preview via the hook — debounced re-encode with race-guarded
  // generation counter and auto-cleanup of object URLs. previewBlob is the
  // same Blob backing previewUrl; reuse it in the Download handler so we
  // don't re-encode just to save.
  const { previewUrl, previewBlob, previewSize, encoding } = useCropPreview(pickedFile, crop, {
    type: format,
    quality: 0.9,
    outputWidth: 256,
  });

  const handleSave = () => {
    if (!previewBlob) return;
    // Real CRMs would POST this Blob:
    //   const fd = new FormData();
    //   fd.append('file', previewBlob, `cropped.${FORMAT_EXT[format]}`);
    //   await fetch('/upload', { method: 'POST', body: fd });
    // The demo downloads it locally to verify the encode result.
    const downloadUrl = URL.createObjectURL(previewBlob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `cropped.${FORMAT_EXT[format]}`;
    a.click();
    URL.revokeObjectURL(downloadUrl);
  };

  return (
    <Stack gap="md">
      <FileUpload
        files={files}
        accept="image/*"
        maxSize={25 * 1024 * 1024}
        onFilesAdded={(added) =>
          setFiles(added.map((f) => ({ id: makeId(), file: f, status: 'done' as const })))
        }
        onFileRemove={(entry) => setFiles((prev) => prev.filter((e) => e.id !== entry.id))}
      />
      {pickedFile && (
        <>
          <ImageCrop src={pickedFile} value={crop} onChange={setCrop} aspectRatio={1} />
          <Cluster gap="sm" align="center">
            <Text size="sm" tone="muted">
              Format:
            </Text>
            {(['image/jpeg', 'image/png', 'image/webp'] as const).map((f) => (
              <Button
                key={f}
                onClick={() => setFormat(f)}
                variant={format === f ? 'primary' : 'secondary'}
                size="sm"
              >
                {f.replace('image/', '').toUpperCase()}
              </Button>
            ))}
          </Cluster>
          <Cluster gap="sm" align="center">
            <Text size="sm" tone="muted">
              Live 256×256 preview:
            </Text>
            <div
              style={{
                position: 'relative',
                width: 64,
                height: 64,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: 'var(--color-bg-muted)',
              }}
            >
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Cropped preview"
                  style={{
                    width: 64,
                    height: 64,
                    opacity: encoding ? 0.5 : 1,
                    transition: 'opacity var(--transition-base)',
                  }}
                />
              )}
              {encoding && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CircularProgress size="sm" aria-label="Re-encoding preview" />
                </div>
              )}
            </div>
            {previewSize !== null && !encoding && (
              <Text size="sm" tone="muted">
                <Code>{(previewSize / 1024).toFixed(1)} KB</Code>
              </Text>
            )}
            <Button onClick={handleSave} disabled={!previewBlob || encoding} variant="secondary">
              Download
            </Button>
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
      files={getComponentFiles('ImageCrop')}
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
        description="The canonical pick → crop → save flow using the useCropPreview hook. Live 256×256 preview re-encodes on every drag/zoom (debounced 120ms). Toggle the format buttons (JPEG/PNG/WebP) and the encoder swaps live with a CircularProgress spinner during the re-encode. The Download button reuses the hook's previewBlob — no second encode — and saves locally; your real Save handler would POST previewBlob to your upload endpoint."
        code={`function FileUploadIntegration() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [crop, setCrop] = useState<CropArea | null>(null);
  const pickedFile = files[0]?.file ?? null;

  // Live preview + Save Blob via the hook — debounced encode, race-guarded
  // generation counter, auto-revoked object URLs.
  const { previewUrl, previewBlob, encoding } = useCropPreview(pickedFile, crop, {
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
      <FileUpload files={files} onFilesAdded={...} onFileRemove={...} />
      {pickedFile && (
        <>
          <ImageCrop src={pickedFile} value={crop} onChange={setCrop} aspectRatio={1} />
          {previewUrl && <img src={previewUrl} style={{ opacity: encoding ? 0.5 : 1 }} />}
          <Button onClick={handleSave} disabled={!previewBlob || encoding}>Save</Button>
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
