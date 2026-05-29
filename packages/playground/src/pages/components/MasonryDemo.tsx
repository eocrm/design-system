import { Masonry, Image, Card, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

// Variable-height numbered tiles so the left→right balancing is visible.
const HEIGHTS = [80, 140, 100, 60, 120, 90, 160, 70, 110, 130, 95, 150];
const TILES = HEIGHTS.map((h, i) => ({ n: i + 1, h }));

function Tile({ n, h }: { n: number; h: number }) {
  return (
    <div
      style={{
        height: h,
        borderRadius: 'var(--radius-md)',
        background: 'var(--color-accent-subtle-bg)',
        color: 'var(--color-accent)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 18,
      }}
    >
      {n}
    </div>
  );
}

const PHOTOS = [
  { src: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&q=80', r: '4 / 3' },
  { src: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400&q=80', r: '3 / 4' },
  { src: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=400&q=80', r: '1 / 1' },
  { src: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80', r: '16 / 9' },
  { src: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=400&q=80', r: '3 / 4' },
  { src: 'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=400&q=80', r: '4 / 3' },
];

export function MasonryDemo() {
  return (
    <DemoLayout
      name="Masonry"
      componentName="Masonry"
      description="Packs variable-height children into columns, placing each into the shortest column (height-balanced, left→right reading order). Responsive column count or a fixed number. For equal-height tiles use Grid; for one column use Stack."
      files={getComponentFiles('Masonry')}
    >
      <Example
        title="Responsive"
        description="minColumnWidth sets the target column width; the column count reflows with the container. Numbers read left→right across the top row."
        code={`<Masonry minColumnWidth="160px" gap="sm">{tiles}</Masonry>`}
      >
        <Masonry minColumnWidth="160px" gap="sm">
          {TILES.map((t) => (
            <Tile key={t.n} n={t.n} h={t.h} />
          ))}
        </Masonry>
      </Example>

      <Example
        title="Fixed columns"
        description="A fixed number of equal-width columns at any container width."
        code={`<Masonry columns={3} gap="md">{tiles}</Masonry>`}
      >
        <Masonry columns={3} gap="md">
          {TILES.map((t) => (
            <Tile key={t.n} n={t.n} h={t.h} />
          ))}
        </Masonry>
      </Example>

      <Example
        title="Photo wall"
        description="The canonical use: Image children of varied aspect ratios. Masonry rebalances once the images load."
        code={`<Masonry minColumnWidth="200px" gap="sm">{photos.map(p => <Image … aspectRatio={p.r} />)}</Masonry>`}
      >
        <Masonry minColumnWidth="200px" gap="sm">
          {PHOTOS.map((p) => (
            <Image key={p.src} src={p.src} alt="" aspectRatio={p.r} />
          ))}
        </Masonry>
      </Example>

      <Example
        title="Card wall"
        description="Cards of differing content length pack into balanced columns."
        code={`<Masonry minColumnWidth="240px" gap="md">{cards}</Masonry>`}
      >
        <Masonry minColumnWidth="240px" gap="md">
          {[
            'Short note.',
            'A medium note that runs onto a second line so its card is a bit taller than the others.',
            'Tiny.',
            'Another note with enough text to wrap across two or three lines and change the height meaningfully versus its neighbours.',
            'Mid-length note here.',
            'One more.',
          ].map((body, i) => (
            <Card key={i} padding="md">
              <Text size="sm">{body}</Text>
            </Card>
          ))}
        </Masonry>
      </Example>
    </DemoLayout>
  );
}
