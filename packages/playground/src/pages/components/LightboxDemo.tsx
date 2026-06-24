import { useState } from 'react';
import {
  Lightbox,
  Image,
  Cluster,
  Stack,
  Button,
  Text,
  type LightboxItem,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const PHOTOS: LightboxItem[] = [
  {
    src: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1400&q=80',
    alt: 'Mountain lake at dawn',
    caption: 'Lakeside cabin — site survey',
  },
  {
    src: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=1400&q=80',
    alt: 'Field of flowers',
    caption: 'North meadow',
  },
  {
    src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1400&q=80',
    alt: 'Sunlit ridge',
    caption: 'Ridge access road',
  },
  {
    src: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1400&q=80',
    alt: 'Forest lake',
  },
];

function Gallery() {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(0);
  return (
    <Stack gap="sm">
      <Cluster gap="sm">
        {PHOTOS.map((p, i) => (
          <Image
            key={p.src}
            src={p.src}
            alt={p.alt}
            size="lg"
            objectFit="cover"
            interactive
            onClick={() => {
              setStart(i);
              setOpen(true);
            }}
            ariaLabel={`Open ${p.alt}`}
          />
        ))}
      </Cluster>
      <Text size="sm" tone="muted">
        Click a thumbnail — arrows / ← → cycle, the strip jumps, Esc closes.
      </Text>
      <Lightbox open={open} onOpenChange={setOpen} items={PHOTOS} defaultIndex={start} />
    </Stack>
  );
}

function SingleImage() {
  const [open, setOpen] = useState(false);
  return (
    <Stack gap="sm">
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Open single image
      </Button>
      <Lightbox open={open} onOpenChange={setOpen} items={[PHOTOS[0]]} />
    </Stack>
  );
}

export function LightboxDemo() {
  return (
    <DemoLayout
      name="Lightbox"
      componentName="Lightbox"
      description="Full-screen image gallery overlay — a large image, prev/next + keyboard navigation, a thumbnail strip, and an optional caption. Controlled open like Modal; the consumer owns the trigger. For a single inline image use Image."
      files={getComponentFiles('Lightbox')}
    >
      <Example
        title="Gallery from thumbnails"
        description="A row of interactive Image thumbnails opens the Lightbox at the clicked index. Cycle with the chevrons, ← → keys, or the bottom strip; the caption shows below each image."
        code={`const [open, setOpen] = useState(false);
const [start, setStart] = useState(0);
<Cluster gap="sm">
  {photos.map((p, i) => (
    <Image key={p.src} src={p.src} alt={p.alt} size="lg" objectFit="cover"
      interactive onClick={() => { setStart(i); setOpen(true); }} ariaLabel={\`Open \${p.alt}\`} />
  ))}
</Cluster>
<Lightbox open={open} onOpenChange={setOpen} items={photos} defaultIndex={start} />`}
      >
        <Gallery />
      </Example>

      <Example
        title="Single image"
        description="With one item the chevrons, counter, and thumbnail strip are hidden — just the image, caption (if any), and close."
        code={`<Lightbox open={open} onOpenChange={setOpen} items={[photo]} />`}
      >
        <SingleImage />
      </Example>
    </DemoLayout>
  );
}
