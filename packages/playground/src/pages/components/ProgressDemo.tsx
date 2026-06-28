import { useState } from 'react';
import { Progress } from '@eocrm/design-system';
import { Card } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Title } from '@eocrm/design-system';
import { Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

function LiveProgress() {
  const [value, setValue] = useState(45);
  return (
    <Stack gap="sm">
      <Progress value={value} label />
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        aria-label="Progress value"
        style={{ width: '100%' }}
      />
    </Stack>
  );
}

export function ProgressDemo() {
  return (
    <DemoLayout
      name="Progress"
      description="Linear progress bar — determinate via value/max, or indeterminate when value is omitted. Use for tracked progress (file upload, wizard step, disk usage). For inline 'loading' spinners next to a button, use <CircularProgress> instead."
      files={getComponentFiles('Progress')}
      componentName="Progress"
    >
      <Example
        title="Sizes"
        description="Three sizes for the track height — 4px / 8px (default) / 12px. Pick the size that matches the surrounding content density."
        code={`import { Progress, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="md">
      <Progress size="sm" value={60} />
      <Progress size="md" value={60} />
      <Progress size="lg" value={60} />
    </Stack>
  );
}`}
      >
        <Stack gap="md">
          <Progress size="sm" value={60} />
          <Progress size="md" value={60} />
          <Progress size="lg" value={60} />
        </Stack>
      </Example>

      <Example
        title="Tones"
        description="Four tones for the fill color. Use 'warning' when a metric is approaching a threshold (e.g. disk at 85%), 'danger' when over. Default is the accent blue."
        code={`import { Progress, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="md">
      <Progress value={75} />
      <Progress value={75} tone="success" />
      <Progress value={75} tone="warning" />
      <Progress value={75} tone="danger" />
    </Stack>
  );
}`}
      >
        <Stack gap="md">
          <Progress value={75} />
          <Progress value={75} tone="success" />
          <Progress value={75} tone="warning" />
          <Progress value={75} tone="danger" />
        </Stack>
      </Example>

      <Example
        title="Determinate vs indeterminate"
        description="Omit `value` for indeterminate. The animation is a 30%-wide pulse sliding right; under prefers-reduced-motion it collapses to a static accent fill."
        code={`import { Progress, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="md">
      <Progress value={45} />
      <Progress />
    </Stack>
  );
}`}
      >
        <Stack gap="md">
          <Progress value={45} />
          <Progress />
        </Stack>
      </Example>

      <Example
        title="Labels"
        description="`label={false}` (default), `label={true}` shows {n}% to the right (auto-suppressed when indeterminate), or pass a ReactNode for custom content."
        code={`import { Progress, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="md">
      <Progress value={45} />
      <Progress value={45} label />
      <Progress value={3} max={10} label={'3 of 10'} />
      <Progress label="Loading…" />
    </Stack>
  );
}`}
      >
        <Stack gap="md">
          <Progress value={45} />
          <Progress value={45} label />
          <Progress value={3} max={10} label={'3 of 10'} />
          <Progress label="Loading…" />
        </Stack>
      </Example>

      <Example
        title="Composed in a card — storage usage panel"
        description="The canonical 'gauge' pattern — heading + bar + supporting text. Tone shifts to warning above 80%, danger above 95%."
        code={`import { Card, Cluster, Progress, Stack, Text, Title } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="md" align="start">
      <Card style={{ minWidth: 320 }}>
        <Stack gap="xs">
          <Title order={3} size="md">Storage</Title>
          <Progress value={85} max={100} tone="warning" label />
          <Text size="sm" tone="muted">85 GB of 100 GB used</Text>
        </Stack>
      </Card>
    </Cluster>
  );
}`}
      >
        <Cluster gap="md" align="start">
          <Card style={{ minWidth: 320 }}>
            <Stack gap="xs">
              <Title order={3} size="md">
                Storage
              </Title>
              <Progress value={85} max={100} tone="warning" label />
              <Text size="sm" tone="muted">
                85 GB of 100 GB used
              </Text>
            </Stack>
          </Card>
        </Cluster>
      </Example>

      <Example
        title="Live demo — interactive value"
        description="Drive the bar with a slider to see the transition + percentage label update in real time."
        code={`import { useState } from 'react';
import { Progress, Stack } from '@eocrm/design-system';

export function LiveProgress() {
  const [value, setValue] = useState(45);
  return (
    <Stack gap="sm">
      <Progress value={value} label />
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        aria-label="Progress value"
        style={{ width: '100%' }}
      />
    </Stack>
  );
}`}
      >
        <LiveProgress />
      </Example>
    </DemoLayout>
  );
}
