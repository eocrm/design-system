import { Indent, Stack, Cluster, Card, Text, Avatar } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

interface Comment {
  id: string;
  depth: number;
  author: string;
  body: string;
}
const THREAD: Comment[] = [
  {
    id: 'c1',
    depth: 0,
    author: 'Dana Reyes',
    body: 'Can we move the renewal date field above the owner?',
  },
  { id: 'c2', depth: 1, author: 'Sam Cole', body: 'Agreed — it’s the first thing reps look for.' },
  { id: 'c3', depth: 2, author: 'Dana Reyes', body: 'I’ll open a ticket for the layout change.' },
  {
    id: 'c4',
    depth: 1,
    author: 'Priya Nair',
    body: 'Should we keep the old position for a release as a fallback?',
  },
  {
    id: 'c5',
    depth: 0,
    author: 'Marco Diaz',
    body: 'Separate thought: the status chip colors need more contrast.',
  },
];

export function IndentDemo() {
  return (
    <DemoLayout
      name="Indent"
      componentName="Indent"
      description="Indentation primitive — indents its own box by level × gutter (token-based, RTL-aware via padding-inline-start). The DS-native way to express nesting depth, e.g. a threaded comments tree, without inline CSS."
      files={getComponentFiles('Indent')}
    >
      <Example
        title="Threaded comments (level = depth)"
        description="A flat comment list rendered at known depths. level={0} is flush; each deeper reply adds one gutter. Nesting reads as hierarchy."
        code={`{comments.map((c) => (
  <Indent key={c.id} level={c.depth}>
    <Card padding="sm">…</Card>
  </Indent>
))}`}
      >
        <Stack gap="sm">
          {THREAD.map((c) => (
            <Indent key={c.id} level={c.depth}>
              <Card padding="sm">
                <Cluster gap="sm" align="center">
                  <Avatar name={c.author} size="sm" />
                  <Stack gap="xs">
                    <Text size="sm" weight="semibold">
                      {c.author}
                    </Text>
                    <Text size="sm" tone="muted">
                      {c.body}
                    </Text>
                  </Stack>
                </Cluster>
              </Card>
            </Indent>
          ))}
        </Stack>
      </Example>

      <Example
        title="Gutter scale"
        description="gutter sets the per-level size (xs 4 / sm 8 / md 12 / lg 16 / xl 24 / 2xl 32). Here the same level={2} at three gutters."
        code={`<Indent level={2} gutter="sm">…</Indent>
<Indent level={2} gutter="lg">…</Indent>
<Indent level={2} gutter="2xl">…</Indent>`}
      >
        <Stack gap="sm">
          {(['sm', 'lg', '2xl'] as const).map((g) => (
            <Indent key={g} level={2} gutter={g}>
              <Card padding="sm">
                <Text size="sm">level=2 · gutter=&quot;{g}&quot;</Text>
              </Card>
            </Indent>
          ))}
        </Stack>
      </Example>
    </DemoLayout>
  );
}
