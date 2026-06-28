import { useState } from 'react';
import { Slider } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Text } from '@eocrm/design-system';
import { Code } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

function BasicSingle() {
  const [value, setValue] = useState(50);
  return (
    <Stack gap="sm">
      <Slider value={value} onChange={(v) => setValue(v as number)} aria-label="Volume" />
      <Text size="sm" tone="muted">
        Current value: <Code>{value}</Code>
      </Text>
    </Stack>
  );
}

function RangeFilter() {
  const [range, setRange] = useState<[number, number]>([20000, 80000]);
  return (
    <Stack gap="sm">
      <Slider
        value={range}
        min={0}
        max={100000}
        step={1000}
        label={(v) => `$${v.toLocaleString()}`}
        onChange={(v) => setRange(v as [number, number])}
        aria-label="Price range"
      />
      <Text size="sm" tone="muted">
        Range: <Code>${range[0].toLocaleString()}</Code> – <Code>${range[1].toLocaleString()}</Code>
      </Text>
    </Stack>
  );
}

function Sizes() {
  const [value, setValue] = useState(50);
  return (
    <Stack gap="md">
      <Slider value={value} size="sm" onChange={(v) => setValue(v as number)} aria-label="sm" />
      <Slider value={value} size="md" onChange={(v) => setValue(v as number)} aria-label="md" />
      <Slider value={value} size="lg" onChange={(v) => setValue(v as number)} aria-label="lg" />
    </Stack>
  );
}

function Tones() {
  const [value, setValue] = useState(75);
  return (
    <Stack gap="md">
      <Slider
        value={value}
        tone="default"
        onChange={(v) => setValue(v as number)}
        aria-label="default"
      />
      <Slider
        value={value}
        tone="success"
        onChange={(v) => setValue(v as number)}
        aria-label="success"
      />
      <Slider
        value={value}
        tone="warning"
        onChange={(v) => setValue(v as number)}
        aria-label="warning"
      />
      <Slider
        value={value}
        tone="danger"
        onChange={(v) => setValue(v as number)}
        aria-label="danger"
      />
    </Stack>
  );
}

function Marks() {
  const [value, setValue] = useState(50);
  return (
    <Slider
      value={value}
      marks={[0, 25, 50, 75, 100]}
      onChange={(v) => setValue(v as number)}
      aria-label="With marks"
    />
  );
}

function Vertical() {
  const [value, setValue] = useState(60);
  return (
    <Cluster gap="lg" align="center">
      <Slider
        value={value}
        orientation="vertical"
        marks={[0, 25, 50, 75, 100]}
        onChange={(v) => setValue(v as number)}
        aria-label="Vertical volume"
      />
      <Text size="sm" tone="muted">
        Current: <Code>{value}</Code>
      </Text>
    </Cluster>
  );
}

function FractionalStep() {
  const [zoom, setZoom] = useState(1.5);
  return (
    <Stack gap="sm">
      <Slider
        value={zoom}
        min={1}
        max={3}
        step={0.1}
        label
        onChange={(v) => setZoom(v as number)}
        aria-label="Zoom"
      />
      <Text size="sm" tone="muted">
        Zoom: <Code>{zoom.toFixed(1)}×</Code>
      </Text>
    </Stack>
  );
}

function DisabledDemo() {
  return <Slider value={50} disabled onChange={() => {}} aria-label="Disabled" />;
}

export function SliderDemo() {
  return (
    <DemoLayout
      name="Slider"
      description="Controlled slider primitive. Single-thumb (value: number) or range (value: [number, number]). Horizontal or vertical. Custom-painted with manual ARIA per thumb."
      files={getComponentFiles('Slider')}
      componentName="Slider"
    >
      <Example
        title="Basic single-thumb"
        description="Default props (min=0, max=100, step=1). Controlled state with one number."
        code={`import { useState } from 'react';
import { Code, Slider, Stack, Text } from '@eocrm/design-system';

export function BasicSingle() {
  const [value, setValue] = useState(50);
  return (
    <Stack gap="sm">
      <Slider value={value} onChange={(v) => setValue(v as number)} aria-label="Volume" />
      <Text size="sm" tone="muted">
        Current value: <Code>{value}</Code>
      </Text>
    </Stack>
  );
}`}
      >
        <BasicSingle />
      </Example>

      <Example
        title="Range mode (two thumbs)"
        description="Pass a [min, max] tuple as value → two thumbs. Range-clamp ensures value[0] ≤ value[1]. Formatted label."
        code={`import { useState } from 'react';
import { Code, Slider, Stack, Text } from '@eocrm/design-system';

export function RangeFilter() {
  const [range, setRange] = useState<[number, number]>([20000, 80000]);
  return (
    <Stack gap="sm">
      <Slider
        value={range}
        min={0}
        max={100000}
        step={1000}
        label={(v) => \`$\${v.toLocaleString()}\`}
        onChange={(v) => setRange(v as [number, number])}
        aria-label="Price range"
      />
      <Text size="sm" tone="muted">
        Range: <Code>\${range[0].toLocaleString()}</Code> – <Code>\${range[1].toLocaleString()}</Code>
      </Text>
    </Stack>
  );
}`}
      >
        <RangeFilter />
      </Example>

      <Example
        title="Sizes"
        description="Three sizes: sm (4/14), md (6/18, default), lg (8/22). All bound to the same controlled value."
        code={`import { useState } from 'react';
import { Slider, Stack } from '@eocrm/design-system';

export function Sizes() {
  const [value, setValue] = useState(50);
  return (
    <Stack gap="md">
      <Slider value={value} size="sm" onChange={(v) => setValue(v as number)} aria-label="sm" />
      <Slider value={value} size="md" onChange={(v) => setValue(v as number)} aria-label="md" />
      <Slider value={value} size="lg" onChange={(v) => setValue(v as number)} aria-label="lg" />
    </Stack>
  );
}`}
      >
        <Sizes />
      </Example>

      <Example
        title="Tones"
        description="Four tones for the fill color. Use warning/danger for threshold-style sliders (e.g. disk usage at 90% → danger fill)."
        code={`import { useState } from 'react';
import { Slider, Stack } from '@eocrm/design-system';

export function Tones() {
  const [value, setValue] = useState(75);
  return (
    <Stack gap="md">
      <Slider
        value={value}
        tone="default"
        onChange={(v) => setValue(v as number)}
        aria-label="default"
      />
      <Slider
        value={value}
        tone="success"
        onChange={(v) => setValue(v as number)}
        aria-label="success"
      />
      <Slider
        value={value}
        tone="warning"
        onChange={(v) => setValue(v as number)}
        aria-label="warning"
      />
      <Slider
        value={value}
        tone="danger"
        onChange={(v) => setValue(v as number)}
        aria-label="danger"
      />
    </Stack>
  );
}`}
      >
        <Tones />
      </Example>

      <Example
        title="Tick marks"
        description="`marks={[0, 25, 50, 75, 100]}` renders 5 ticks. Marks within the current fill range get a filled tone."
        code={`import { useState } from 'react';
import { Slider } from '@eocrm/design-system';

export function Marks() {
  const [value, setValue] = useState(50);
  return (
    <Slider
      value={value}
      marks={[0, 25, 50, 75, 100]}
      onChange={(v) => setValue(v as number)}
      aria-label="With marks"
    />
  );
}`}
      >
        <Marks />
      </Example>

      <Example
        title="Vertical orientation"
        description="Single-thumb vertical slider, 200px tall by default. Marks render to the right; label bubble appears on the right of the thumb."
        code={`import { useState } from 'react';
import { Cluster, Code, Slider, Text } from '@eocrm/design-system';

export function Vertical() {
  const [value, setValue] = useState(60);
  return (
    <Cluster gap="lg" align="center">
      <Slider
        value={value}
        orientation="vertical"
        marks={[0, 25, 50, 75, 100]}
        onChange={(v) => setValue(v as number)}
        aria-label="Vertical volume"
      />
      <Text size="sm" tone="muted">
        Current: <Code>{value}</Code>
      </Text>
    </Cluster>
  );
}`}
      >
        <Vertical />
      </Example>

      <Example
        title="Fractional step (zoom-style)"
        description="min=1, max=3, step=0.1 — the canonical ImageCrop zoom control. label=true shows the current value as a bubble."
        code={`import { useState } from 'react';
import { Code, Slider, Stack, Text } from '@eocrm/design-system';

export function FractionalStep() {
  const [zoom, setZoom] = useState(1.5);
  return (
    <Stack gap="sm">
      <Slider
        value={zoom}
        min={1}
        max={3}
        step={0.1}
        label
        onChange={(v) => setZoom(v as number)}
        aria-label="Zoom"
      />
      <Text size="sm" tone="muted">
        Zoom: <Code>{zoom.toFixed(1)}×</Code>
      </Text>
    </Stack>
  );
}`}
      >
        <FractionalStep />
      </Example>

      <Example
        title="Disabled"
        description="Track and thumb both grayed (via --opacity-disabled). Pointer/keyboard no-op; tabIndex=-1; aria-disabled=true."
        code={`import { Slider } from '@eocrm/design-system';

export function DisabledDemo() {
  return <Slider value={50} disabled onChange={() => {}} aria-label="Disabled" />;
}`}
      >
        <DisabledDemo />
      </Example>
    </DemoLayout>
  );
}
