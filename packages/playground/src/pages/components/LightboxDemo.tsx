import { useState } from 'react';
import {
  Lightbox,
  Image,
  Cluster,
  Stack,
  Button,
  Text,
  DropdownMenu,
  type LightboxItem,
} from '@eocrm/design-system';
import { Download, MoreHorizontal } from 'lucide-react';
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

// A real-ish CRM attachment set: site photos plus a contract PDF. The PDF renders
// in an <iframe> with a download action; it has no thumbnail, so the strip shows a
// document-icon placeholder.
const ATTACHMENTS: LightboxItem[] = [
  PHOTOS[0],
  {
    src: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
    alt: 'Site-survey report.pdf',
    kind: 'pdf',
    caption: 'Site-survey report (PDF)',
  },
  PHOTOS[2],
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

function MixedGallery() {
  const [open, setOpen] = useState(false);
  return (
    <Stack gap="sm">
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Open attachments (images + PDF)
      </Button>
      <Text size="sm" tone="muted">
        Navigate to the PDF — it previews in an iframe with a download action; the strip shows a
        document-icon placeholder for it.
      </Text>
      <Lightbox open={open} onOpenChange={setOpen} items={ATTACHMENTS} />
    </Stack>
  );
}

// Header actions (#608) + a tall portrait image (#607 — scaled to fit, not cropped).
const FILES: LightboxItem[] = [
  {
    src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1000&h=2400&fit=crop&q=80',
    alt: 'Ridge panorama (tall)',
    caption: 'Tall 1000×2400 image — scaled down to fit the stage',
  },
  ATTACHMENTS[1],
  PHOTOS[1],
];

function WithActions() {
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState('');
  return (
    <Stack gap="sm">
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Open with header actions
      </Button>
      <Text size="sm" tone="muted">
        {log || 'Download + a “more” menu sit left of the close button and follow navigation.'}
      </Text>
      <Lightbox
        open={open}
        onOpenChange={setOpen}
        items={FILES}
        actions={(item, i) => (
          <>
            <Button
              as="a"
              href={item.src}
              download
              target="_blank"
              rel="noopener noreferrer"
              iconOnly
              variant="ghost"
              size="sm"
              aria-label={`Download ${item.alt}`}
            >
              <Download size={20} aria-hidden="true" />
            </Button>
            <DropdownMenu>
              <DropdownMenu.Trigger>
                <Button iconOnly variant="ghost" size="sm" aria-label="More actions">
                  <MoreHorizontal size={20} aria-hidden="true" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item onSelect={() => setLog(`Rename: ${item.alt} (#${i + 1})`)}>
                  Rename
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  tone="danger"
                  onSelect={() => setLog(`Delete: ${item.alt} (#${i + 1})`)}
                >
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </>
        )}
      />
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
        code={`import { useState } from 'react';
import { Cluster, Image, Lightbox, Stack, Text, type LightboxItem } from '@eocrm/design-system';

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

export function Gallery() {
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
            ariaLabel={\`Open \${p.alt}\`}
          />
        ))}
      </Cluster>
      <Text size="sm" tone="muted">
        Click a thumbnail — arrows / ← → cycle, the strip jumps, Esc closes.
      </Text>
      <Lightbox open={open} onOpenChange={setOpen} items={PHOTOS} defaultIndex={start} />
    </Stack>
  );
}`}
      >
        <Gallery />
      </Example>

      <Example
        title="Mixed gallery — images + PDF"
        description="Items can be documents too: pass kind: 'pdf' (or a .pdf src) and the stage renders an iframe with a download action instead of an img. A PDF without a thumbnail gets a document-icon placeholder in the strip. Image and PDF items mix freely in one gallery."
        code={`import { useState } from 'react';
import { Button, Lightbox, Stack, Text, type LightboxItem } from '@eocrm/design-system';

const ATTACHMENTS: LightboxItem[] = [
  {
    src: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1400&q=80',
    alt: 'Mountain lake at dawn',
    caption: 'Lakeside cabin — site survey',
  },
  {
    src: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
    alt: 'Site-survey report.pdf',
    kind: 'pdf',
    caption: 'Site-survey report (PDF)',
  },
  {
    src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1400&q=80',
    alt: 'Sunlit ridge',
    caption: 'Ridge access road',
  },
];

export function MixedGallery() {
  const [open, setOpen] = useState(false);
  return (
    <Stack gap="sm">
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Open attachments (images + PDF)
      </Button>
      <Text size="sm" tone="muted">
        Navigate to the PDF — it previews in an iframe with a download action; the strip shows a
        document-icon placeholder for it.
      </Text>
      <Lightbox open={open} onOpenChange={setOpen} items={ATTACHMENTS} />
    </Stack>
  );
}`}
      >
        <MixedGallery />
      </Example>

      <Example
        title="Header actions + tall image"
        description="actions(item, index) renders consumer controls in the top-right toolbar, before the close button — use ghost iconOnly sm Buttons (the toolbar re-themes them for the scrim) and DropdownMenus built from them. Setting actions REPLACES the built-in PDF download, so include your own. The first item is a tall 1000×2400 image: it scales down to fit instead of being cropped."
        code={`import { useState } from 'react';
import { Download, MoreHorizontal } from 'lucide-react';
import { Button, DropdownMenu, Lightbox, type LightboxItem } from '@eocrm/design-system';

export function WithActions({ files }: { files: LightboxItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Open with header actions
      </Button>
      <Lightbox
        open={open}
        onOpenChange={setOpen}
        items={files}
        actions={(item) => (
          <>
            {/* actions replaces the built-in PDF download — provide your own */}
            <Button
              as="a"
              href={item.src}
              download
              target="_blank"
              rel="noopener noreferrer"
              iconOnly
              variant="ghost"
              size="sm"
              aria-label={\`Download \${item.alt}\`}
            >
              <Download size={20} aria-hidden="true" />
            </Button>
            <DropdownMenu>
              <DropdownMenu.Trigger>
                <Button iconOnly variant="ghost" size="sm" aria-label="More actions">
                  <MoreHorizontal size={20} aria-hidden="true" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item onSelect={() => rename(item)}>Rename</DropdownMenu.Item>
                <DropdownMenu.Item tone="danger" onSelect={() => remove(item)}>
                  Delete
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          </>
        )}
      />
    </>
  );
}`}
      >
        <WithActions />
      </Example>

      <Example
        title="Single image"
        description="With one item the chevrons, counter, and thumbnail strip are hidden — just the image, caption (if any), and close."
        code={`import { useState } from 'react';
import { Button, Lightbox, Stack, type LightboxItem } from '@eocrm/design-system';

const photo: LightboxItem = {
  src: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1400&q=80',
  alt: 'Mountain lake at dawn',
  caption: 'Lakeside cabin — site survey',
};

export function SingleImage() {
  const [open, setOpen] = useState(false);
  return (
    <Stack gap="sm">
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Open single image
      </Button>
      <Lightbox open={open} onOpenChange={setOpen} items={[photo]} />
    </Stack>
  );
}`}
      >
        <SingleImage />
      </Example>
    </DemoLayout>
  );
}
