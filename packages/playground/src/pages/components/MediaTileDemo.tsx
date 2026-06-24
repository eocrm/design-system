import {
  MediaTile,
  Image,
  Masonry,
  Cluster,
  Stack,
  Text,
  Button,
  type MediaTileReveal,
} from '@eocrm/design-system';
import { Maximize2, Download, Trash2, FileText } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

interface FileItem {
  id: string;
  name: string;
  size: string;
  src?: string;
}
const FILES: FileItem[] = [
  {
    id: 'f1',
    name: 'lake-survey.jpg',
    size: '2.4 MB',
    src: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&q=70',
  },
  {
    id: 'f2',
    name: 'north-meadow.png',
    size: '1.1 MB',
    src: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400&q=70',
  },
  { id: 'f3', name: 'site-plan.pdf', size: '380 KB' },
  {
    id: 'f4',
    name: 'ridge-road.jpg',
    size: '3.0 MB',
    src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=70',
  },
  {
    id: 'f5',
    name: 'forest-lake.jpg',
    size: '0.9 MB',
    src: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=400&q=70',
  },
];

const iconBody = (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      aspectRatio: '1',
      background: 'var(--color-bg-muted)',
      color: 'var(--color-fg-muted)',
    }}
  >
    <FileText size={40} />
  </div>
);

function fileActions(name: string) {
  return (
    <Cluster gap="xs">
      <Button iconOnly variant="ghost" size="sm" aria-label={`Preview ${name}`} onClick={() => {}}>
        <Maximize2 size={16} />
      </Button>
      <Button iconOnly variant="ghost" size="sm" aria-label={`Download ${name}`} onClick={() => {}}>
        <Download size={16} />
      </Button>
      <Button iconOnly variant="ghost" size="sm" aria-label={`Delete ${name}`} onClick={() => {}}>
        <Trash2 size={16} />
      </Button>
    </Cluster>
  );
}

export function MediaTileDemo() {
  return (
    <DemoLayout
      name="MediaTile"
      componentName="MediaTile"
      description="Media tile for gallery / file-grid views — a full-bleed image (or a file-type icon), with a top bar (name + size) and a bottom bar (controls) over gradient gray scrims, revealed on hover / keyboard focus. Drop one per tile in a Masonry. For a plain image use Image."
      files={getComponentFiles('MediaTile')}
    >
      <Example
        title="Files grid (Masonry of tiles)"
        description="Hover a tile (or Tab into it) to reveal the name + size on top and the preview / download / delete controls on the bottom, each on a gray scrim. The non-image file shows a centered icon."
        code={`<Masonry minColumnWidth="180px" gap="sm">
  {files.map((f) => (
    <MediaTile key={f.id}
      media={<Image src={f.src} alt={f.name} aspectRatio={1} objectFit="cover" />}
      title={f.name} meta={f.size}
      actions={<Cluster gap="xs"><Button iconOnly aria-label={\`Download \${f.name}\`}>…</Button></Cluster>} />
  ))}
</Masonry>`}
      >
        <Masonry minColumnWidth="180px" gap="sm">
          {FILES.map((f) => (
            <MediaTile
              key={f.id}
              media={
                f.src ? (
                  <Image src={f.src} alt={f.name} aspectRatio={1} objectFit="cover" />
                ) : (
                  iconBody
                )
              }
              title={f.name}
              meta={f.size}
              actions={fileActions(f.name)}
            />
          ))}
        </Masonry>
      </Example>

      <Example
        title="revealOn — hover / focus / visible"
        description="hover (default): reveal on pointer hover OR keyboard focus. focus: only on focus-within. visible: always shown."
        code={`<MediaTile revealOn="hover" … />
<MediaTile revealOn="focus" … />
<MediaTile revealOn="visible" … />`}
      >
        <Cluster gap="md" align="start">
          {(['hover', 'focus', 'visible'] as MediaTileReveal[]).map((r) => (
            <Stack key={r} gap="xs" align="center">
              <div style={{ width: 160 }}>
                <MediaTile
                  revealOn={r}
                  media={
                    <Image
                      src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&q=70"
                      alt="Mountain lake"
                      aspectRatio={1}
                      objectFit="cover"
                    />
                  }
                  title="lake-survey.jpg"
                  meta="2.4 MB"
                  actions={fileActions('lake-survey.jpg')}
                />
              </div>
              <Text size="xs" tone="muted">
                revealOn=&quot;{r}&quot;
              </Text>
            </Stack>
          ))}
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
