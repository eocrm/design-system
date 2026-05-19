import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Avatar } from '@eocrm/design-system';
import { Badge } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { Card } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Input } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Tabs } from '@eocrm/design-system';
import styles from './DemoIndex.module.scss';

const items: { to: string; name: string; description: string; preview: React.ReactNode }[] = [
  {
    to: '/demo/button',
    name: 'Button',
    description: 'Action triggers with variants and sizes.',
    preview: (
      <Cluster gap="sm" justify="center">
        <Button size="sm">Primary</Button>
        <Button size="sm" variant="secondary">
          Secondary
        </Button>
      </Cluster>
    ),
  },
  {
    to: '/demo/input',
    name: 'Input',
    description: 'Single-line text field with focus + invalid states.',
    preview: (
      <div style={{ width: 200 }}>
        <Input placeholder="Type here…" />
      </div>
    ),
  },
  {
    to: '/demo/card',
    name: 'Card',
    description: 'Bordered container that groups related content.',
    preview: (
      <Card padding="md" style={{ width: 160 }}>
        <Stack gap="xs">
          <div className={styles.skeleton} style={{ width: '60%' }} />
          <div className={styles.skeleton} />
          <div className={styles.skeleton} style={{ width: '80%' }} />
        </Stack>
      </Card>
    ),
  },
  {
    to: '/demo/stack',
    name: 'Stack',
    description: 'Vertical layout with consistent gap.',
    preview: (
      <Stack gap="xs">
        <div className={styles.bar} />
        <div className={styles.bar} />
        <div className={styles.bar} />
      </Stack>
    ),
  },
  {
    to: '/demo/cluster',
    name: 'Cluster',
    description: 'Horizontal wrapping layout with gap + alignment.',
    preview: (
      <Cluster gap="xs">
        <div className={styles.tile} />
        <div className={styles.tile} />
        <div className={styles.tile} />
        <div className={styles.tile} />
      </Cluster>
    ),
  },
  {
    to: '/demo/avatar',
    name: 'Avatar',
    description: 'Profile circle with image or auto-colored initials.',
    preview: (
      <Cluster gap="sm">
        <Avatar name="Alex Rivera" />
        <Avatar name="Maya Owens" />
        <Avatar name="Sam Chen" />
      </Cluster>
    ),
  },
  {
    to: '/demo/badge',
    name: 'Badge',
    description: 'Small status/category pill with semantic tones.',
    preview: (
      <Cluster gap="xs">
        <Badge tone="info">New</Badge>
        <Badge tone="success">Active</Badge>
        <Badge tone="warning">Pending</Badge>
      </Cluster>
    ),
  },
  {
    to: '/demo/tabs',
    name: 'Tabs',
    description: 'Horizontal tab strip with optional count chips.',
    preview: (
      <div style={{ width: '100%', maxWidth: 240 }}>
        <Tabs
          items={[
            { id: 'a', label: 'Overview' },
            { id: 'b', label: 'Activity', count: 4 },
          ]}
          activeId="a"
          onChange={() => undefined}
        />
      </div>
    ),
  },
];

export function DemoIndex() {
  return (
    <Stack gap="lg">
      <header>
        <span className={styles.eyebrow}>Demo</span>
        <h1 className={styles.title}>Component library</h1>
        <p className={styles.description}>
          Every component shipped with this design system. Each page shows the live component, the
          source of <code>.tsx</code> and <code>.module.scss</code>, and usage snippets you can
          copy.
        </p>
      </header>

      <div className={styles.grid}>
        {items.map((item) => (
          <Link key={item.to} to={item.to} className={styles.card}>
            <div className={styles.cardPreview}>{item.preview}</div>
            <div className={styles.cardBody}>
              <div className={styles.cardHeader}>
                <span className={styles.cardName}>{item.name}</span>
                <ArrowRight size={14} className={styles.cardArrow} />
              </div>
              <p className={styles.cardDescription}>{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </Stack>
  );
}
