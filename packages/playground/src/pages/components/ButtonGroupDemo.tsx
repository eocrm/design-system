import { useState } from 'react';
import { Button, ButtonGroup, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function ButtonGroupDemo() {
  return (
    <DemoLayout
      name="ButtonGroup"
      componentName="ButtonGroup"
      description="Compound with two modes. Visual mode joins <Button> children into a single unit (toolbar actions). Segmented mode (value + onValueChange) is a single-select radiogroup with arrow-key navigation (view toggles, timeframe filters)."
      files={getComponentFiles('ButtonGroup')}
    >
      <VisualSimpleExample />
      <VisualMixedVariantsExample />
      <SegmentedViewToggleExample />
      <SegmentedTimeframeExample />
      <SizePropagationExample />
      <SegmentedDisabledExample />
    </DemoLayout>
  );
}

function VisualSimpleExample() {
  return (
    <Example
      title="Visual: simple action group"
      description="Three Buttons joined into one visual unit. Each owns its own onClick — no shared state."
      code={`<ButtonGroup aria-label="Edit actions">
  <Button>Cut</Button>
  <Button>Copy</Button>
  <Button>Paste</Button>
</ButtonGroup>`}
    >
      <ButtonGroup aria-label="Edit actions">
        <Button variant="secondary">Cut</Button>
        <Button variant="secondary">Copy</Button>
        <Button variant="secondary">Paste</Button>
      </ButtonGroup>
    </Example>
  );
}

function VisualMixedVariantsExample() {
  return (
    <Example
      title="Visual: mixed variants"
      description='Mixed variants are intentionally allowed. A "Save" primary + "Discard" secondary in one group lets the primary visually dominate.'
      code={`<ButtonGroup aria-label="Save or discard">
  <Button>Save</Button>
  <Button variant="secondary">Discard</Button>
</ButtonGroup>`}
    >
      <ButtonGroup aria-label="Save or discard">
        <Button>Save</Button>
        <Button variant="secondary">Discard</Button>
      </ButtonGroup>
    </Example>
  );
}

function SegmentedViewToggleExample() {
  const [view, setView] = useState<'grid' | 'list' | 'calendar'>('grid');
  return (
    <Example
      title="Segmented: view toggle"
      description="Single-select radiogroup with Arrow-key keyboard navigation. Try Tab to focus the group, then ←/→ to move selection."
      code={`const [view, setView] = useState<'grid' | 'list' | 'calendar'>('grid');
<ButtonGroup value={view} onValueChange={setView} aria-label="View mode">
  <ButtonGroup.Item value="grid">Grid</ButtonGroup.Item>
  <ButtonGroup.Item value="list">List</ButtonGroup.Item>
  <ButtonGroup.Item value="calendar">Calendar</ButtonGroup.Item>
</ButtonGroup>`}
    >
      <Stack gap="sm">
        <ButtonGroup
          value={view}
          onValueChange={(v) => setView(v as 'grid' | 'list' | 'calendar')}
          aria-label="View mode"
        >
          <ButtonGroup.Item value="grid">Grid</ButtonGroup.Item>
          <ButtonGroup.Item value="list">List</ButtonGroup.Item>
          <ButtonGroup.Item value="calendar">Calendar</ButtonGroup.Item>
        </ButtonGroup>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
          Selected: <strong>{view}</strong>
        </div>
      </Stack>
    </Example>
  );
}

function SegmentedTimeframeExample() {
  const [tf, setTf] = useState<'day' | 'week' | 'month'>('week');
  return (
    <Example
      title="Segmented: timeframe filter"
      description="Same pattern, different content. Controlled via parent state."
      code={`<ButtonGroup value={tf} onValueChange={setTf} aria-label="Timeframe">
  <ButtonGroup.Item value="day">Day</ButtonGroup.Item>
  <ButtonGroup.Item value="week">Week</ButtonGroup.Item>
  <ButtonGroup.Item value="month">Month</ButtonGroup.Item>
</ButtonGroup>`}
    >
      <Stack gap="sm">
        <ButtonGroup
          value={tf}
          onValueChange={(v) => setTf(v as 'day' | 'week' | 'month')}
          aria-label="Timeframe"
        >
          <ButtonGroup.Item value="day">Day</ButtonGroup.Item>
          <ButtonGroup.Item value="week">Week</ButtonGroup.Item>
          <ButtonGroup.Item value="month">Month</ButtonGroup.Item>
        </ButtonGroup>
        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-fg-muted)' }}>
          Selected: <strong>{tf}</strong>
        </div>
      </Stack>
    </Example>
  );
}

function SizePropagationExample() {
  return (
    <Example
      title="Size propagation"
      description="`size` on the group propagates to children. A per-child `size` override wins (third Button below)."
      code={`<ButtonGroup size="sm" aria-label="x">
  <Button>Cut</Button>     {/* sm */}
  <Button>Copy</Button>    {/* sm */}
  <Button size="md">Paste</Button>  {/* override */}
</ButtonGroup>`}
    >
      <ButtonGroup size="sm" aria-label="Demo">
        <Button variant="secondary">Cut</Button>
        <Button variant="secondary">Copy</Button>
        <Button size="md" variant="secondary">
          Paste (md override)
        </Button>
      </ButtonGroup>
    </Example>
  );
}

function SegmentedDisabledExample() {
  const [v, setV] = useState('a');
  return (
    <Example
      title="Disabled segmented"
      description="Group-level `disabled` freezes selection — clicks no-op, arrow keys still focus-move but onValueChange doesn't fire."
      code={`<ButtonGroup value={v} onValueChange={setV} aria-label="x" disabled>
  ...
</ButtonGroup>`}
    >
      <ButtonGroup value={v} onValueChange={setV} aria-label="Locked" disabled>
        <ButtonGroup.Item value="a">A</ButtonGroup.Item>
        <ButtonGroup.Item value="b">B</ButtonGroup.Item>
        <ButtonGroup.Item value="c">C</ButtonGroup.Item>
      </ButtonGroup>
    </Example>
  );
}
