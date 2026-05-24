import { useEffect, useRef, useState } from 'react';
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
        Crop: <Code>{crop ? `${Math.round(crop.x)}, ${Math.round(crop.y)} — ${Math.round(crop.width)}×${Math.round(crop.height)}` : 'computing...'}</Code>
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // Reset crop when the file changes.
  const pickedFile = files[0]?.file ?? null;
  useEffect(() => {
    setCrop(null);
  }, [pickedFile]);

  // Live-update the preview whenever the crop changes. Debounced so we don't
  // re-encode on every pointer-move tick during a drag.
  useEffect(() => {
    if (!pickedFile || !crop) {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPreviewUrl(null);
      return;
    }
    const handle = setTimeout(async () => {
      const blob = await extractCropBlob(pickedFile, crop, {
        type: 'image/jpeg',
        quality: 0.9,
        outputWidth: 256,
      });
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    }, 120);
    return () => clearTimeout(handle);
  }, [pickedFile, crop]);

  // Cleanup the last preview URL on unmount.
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const handleSave = async () => {
    if (!pickedFile || !crop) return;
    const blob = await extractCropBlob(pickedFile, crop, {
      type: 'image/jpeg',
      quality: 0.9,
      outputWidth: 256,
    });
    // Real CRMs would POST this Blob to their upload endpoint. The demo
    // downloads it so you can verify the encode result locally.
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'cropped.jpg';
    a.click();
    URL.revokeObjectURL(downloadUrl);
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
            <Text size="sm" tone="muted">
              Live 256×256 preview:
            </Text>
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Cropped preview"
                style={{ width: 64, height: 64, borderRadius: 'var(--radius-md)' }}
              />
            ) : (
              <Text size="sm" tone="muted">
                (cropping…)
              </Text>
            )}
            <Button onClick={handleSave} disabled={!crop} variant="secondary">
              Download JPEG
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
        description="The canonical pick → crop → save flow with a LIVE 256×256 preview that re-encodes on every drag/zoom (debounced ~120ms). The Download button calls extractCropBlob and saves the result locally — your real Save handler would POST it to your upload endpoint instead."
        code={`function FileUploadIntegration() {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [crop, setCrop] = useState<CropArea | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const pickedFile = files[0]?.file ?? null;

  // Live preview: re-encode on every crop change, debounced.
  useEffect(() => {
    if (!pickedFile || !crop) { setPreviewUrl(null); return; }
    const handle = setTimeout(async () => {
      const blob = await extractCropBlob(pickedFile, crop, {
        type: 'image/jpeg', quality: 0.9, outputWidth: 256,
      });
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    }, 120);
    return () => clearTimeout(handle);
  }, [pickedFile, crop]);

  return (
    <Stack gap="md">
      <FileUpload files={files} onFilesAdded={...} onFileRemove={...} />
      {pickedFile && (
        <>
          <ImageCrop src={pickedFile} value={crop} onChange={setCrop} aspectRatio={1} />
          {previewUrl && <img src={previewUrl} alt="" width={64} height={64} />}
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
