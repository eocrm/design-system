import { useState } from 'react';
import { Image, Stack, Cluster, Grid, Text, Button, EmptyState } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const PHOTO = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=600&q=80';
const PORTRAIT = 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=500&q=80';
const BROKEN = 'https://example.com/does-not-exist.jpg';

const GALLERY = [
  'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80',
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=400&q=80',
  'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=400&q=80',
];

function RetryDemo() {
  // Force the error state by pointing at a broken URL; retry is built in.
  return <Image src={BROKEN} alt="Intentionally broken image" aspectRatio="16 / 9" />;
}

export function ImageDemo() {
  const [fit, setFit] = useState<'cover' | 'contain'>('cover');
  return (
    <DemoLayout
      name="Image"
      componentName="Image"
      description="Displays a remote image with a Skeleton loading state, fade-in on load, and a compact accessible broken-image placeholder (with retry). Use for content images; for circular avatars use Avatar."
      files={getComponentFiles('Image')}
    >
      <Example
        title="Basic"
        description="Give it an aspectRatio so the box is reserved (no layout shift). Fills its container's width."
        code={`<Image src={url} alt="Mountain lake" aspectRatio="16 / 9" />`}
      >
        <div style={{ maxWidth: 360 }}>
          <Image src={PHOTO} alt="Mountain lake at dawn" aspectRatio="16 / 9" />
        </div>
      </Example>

      <Example
        title="object-fit"
        description="cover fills + crops; contain shows the whole image letterboxed on the muted box."
        code={`<Image src={url} alt="…" objectFit="cover" aspectRatio="16 / 9" />
<Image src={url} alt="…" objectFit="contain" aspectRatio="16 / 9" />`}
      >
        <Stack gap="sm">
          <Cluster gap="sm">
            <Button variant={fit === 'cover' ? 'primary' : 'secondary'} size="sm" onClick={() => setFit('cover')}>
              cover
            </Button>
            <Button variant={fit === 'contain' ? 'primary' : 'secondary'} size="sm" onClick={() => setFit('contain')}>
              contain
            </Button>
          </Cluster>
          <div style={{ maxWidth: 360 }}>
            <Image src={PORTRAIT} alt="A dog" objectFit={fit} aspectRatio="16 / 9" />
          </div>
        </Stack>
      </Example>

      <Example
        title="Radius"
        description="none / sm / md (default) / lg / full."
        code={`<Image src={url} alt="…" radius="lg" aspectRatio="1" />`}
      >
        <Cluster gap="md">
          {(['none', 'sm', 'md', 'lg', 'full'] as const).map((r) => (
            <Stack key={r} gap="xs" align="center">
              <div style={{ width: 80 }}>
                <Image src={PHOTO} alt="" radius={r} aspectRatio="1" />
              </div>
              <Text size="xs" tone="muted">{r}</Text>
            </Stack>
          ))}
        </Cluster>
      </Example>

      <Example
        title="Error + retry"
        description="A failed load shows the ImageOff placeholder with a Retry button (re-fetches the source)."
        code={`<Image src={brokenUrl} alt="…" aspectRatio="16 / 9" />`}
      >
        <div style={{ maxWidth: 360 }}>
          <RetryDemo />
        </div>
      </Example>

      <Example
        title="Custom fallback"
        description="Override the default error placeholder with any node via `fallback`."
        code={`<Image src={brokenUrl} alt="…" aspectRatio="16 / 9" fallback={<EmptyState title="Couldn't load image" />} />`}
      >
        <div style={{ maxWidth: 360 }}>
          <Image
            src={BROKEN}
            alt="Broken with custom fallback"
            aspectRatio="16 / 9"
            fallback={<EmptyState size="sm" title="Couldn't load image" />}
          />
        </div>
      </Example>

      <Example
        title="In a gallery grid"
        description="Responsive grid of square thumbnails — each reserves its box and loads independently."
        code={`<Grid minColumnWidth="160px" gap="sm">{urls.map((u) => <Image key={u} src={u} alt="" aspectRatio="1" />)}</Grid>`}
      >
        <Grid minColumnWidth="160px" gap="sm">
          {GALLERY.map((u) => (
            <Image key={u} src={u} alt="" aspectRatio="1" />
          ))}
        </Grid>
      </Example>
    </DemoLayout>
  );
}
