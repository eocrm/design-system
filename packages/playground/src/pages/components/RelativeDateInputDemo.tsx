import { useState } from 'react';
import { Button, Cluster, Code, Field, RelativeDateInput, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const RANGE_PRESETS = [
  { label: 'Last 7 days', value: 'last:7d' },
  { label: 'Last 30 days', value: 'last:30d' },
  { label: 'This month', value: 'this:month' },
  { label: 'Quarter to date', value: 'this:quarter:to_date' },
];

export function RelativeDateInputDemo() {
  const [point, setPoint] = useState<string | null>('today+7d');
  const [datetime, setDatetime] = useState<string | null>('now-30min');
  const [range, setRange] = useState<string | null>('last:30d');
  const [preset, setPreset] = useState<string | null>('this:month');
  const [invalid, setInvalid] = useState<string | null>(null);

  return (
    <DemoLayout
      name="RelativeDateInput"
      componentName="RelativeDateInput"
      description="Compact editor for a relative date or date-range expression string (today+7d, last:30d) that the server resolves at use time. Only valid expressions are emitted."
      files={getComponentFiles('RelativeDateInput')}
    >
      <Example
        title="Point"
        description="An anchor plus a signed offset, or an exact date via the switch."
        code={`import { RelativeDateInput } from '@eocrm/design-system';

export function Demo() {
  const [value, setValue] = useState<string | null>('today+7d');
  return <RelativeDateInput mode="point" value={value} onChange={setValue} aria-label="Due date" />;
}`}
      >
        <Stack gap="sm">
          <RelativeDateInput mode="point" value={point} onChange={setPoint} aria-label="Due date" />
          <Code>{point ?? 'null'}</Code>
        </Stack>
      </Example>

      <Example
        title="Point with allowNow"
        description="Adds the Now anchor, hour and minute offsets, and a minute-precision exact datetime in UTC."
        code={`<RelativeDateInput
  mode="point"
  allowNow
  value={value}
  onChange={setValue}
  aria-label="Created after"
/>`}
      >
        <Stack gap="sm">
          <RelativeDateInput
            mode="point"
            allowNow
            value={datetime}
            onChange={setDatetime}
            aria-label="Created after"
          />
          <Code>{datetime ?? 'null'}</Code>
        </Stack>
      </Example>

      <Example
        title="Range"
        description="Past, Coming, Calendar period or Period to date. The control never emits null; clearing is the consumer's own button."
        code={`<Cluster align="center">
  <RelativeDateInput mode="range" value={value} onChange={setValue} aria-label="Period" />
  {value !== null && (
    <Button variant="ghost" onClick={() => setValue(null)}>
      Clear
    </Button>
  )}
</Cluster>`}
      >
        <Stack gap="sm">
          <Cluster align="center">
            <RelativeDateInput mode="range" value={range} onChange={setRange} aria-label="Period" />
            {range !== null && (
              <Button variant="ghost" onClick={() => setRange(null)}>
                Clear
              </Button>
            )}
          </Cluster>
          <Code>{range ?? 'null'}</Code>
        </Stack>
      </Example>

      <Example
        title="Range with presets"
        description="Presets are toggle buttons; the one equal to the current value is pressed."
        code={`<RelativeDateInput
  mode="range"
  value={value}
  onChange={setValue}
  presets={[
    { label: 'Last 7 days', value: 'last:7d' },
    { label: 'Last 30 days', value: 'last:30d' },
    { label: 'This month', value: 'this:month' },
    { label: 'Quarter to date', value: 'this:quarter:to_date' },
  ]}
  aria-label="Period"
/>`}
      >
        <Stack gap="sm">
          <RelativeDateInput
            mode="range"
            value={preset}
            onChange={setPreset}
            presets={RANGE_PRESETS}
            aria-label="Period"
          />
          <Code>{preset ?? 'null'}</Code>
        </Stack>
      </Example>

      <Example
        title="Invalid inside a Field"
        description="asGroup: the Field label captions the group, and its error marks the controls invalid."
        code={`<Stack gap="sm">
  <Field asGroup required label="Due date" error="Pick a due date">
    <RelativeDateInput mode="point" value={value} onChange={setValue} />
  </Field>
  <Code>{value ?? 'null'}</Code>
</Stack>`}
      >
        <Stack gap="sm">
          <Field asGroup required label="Due date" error="Pick a due date">
            <RelativeDateInput mode="point" value={invalid} onChange={setInvalid} />
          </Field>
          <Code>{invalid ?? 'null'}</Code>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
