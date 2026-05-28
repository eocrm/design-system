import { useState } from 'react';
import { Code, LocaleProvider, Stack, Text, TimeField, type TimeValue } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

function DefaultExample() {
  const [time, setTime] = useState<TimeValue | null>({ hours: 9, minutes: 30 });
  return <TimeField value={time} onChange={setTime} aria-label="Start time" />;
}

function Forced24Example() {
  const [time, setTime] = useState<TimeValue | null>({ hours: 14, minutes: 0 });
  return <TimeField value={time} onChange={setTime} hourCycle="24" aria-label="Departure time" />;
}

function Step30Example() {
  const [time, setTime] = useState<TimeValue | null>({ hours: 10, minutes: 0 });
  return (
    <TimeField value={time} onChange={setTime} step={30} hourCycle="24" aria-label="Slot start" />
  );
}

function HideNowExample() {
  const [time, setTime] = useState<TimeValue | null>({ hours: 8, minutes: 0 });
  return (
    <TimeField
      value={time}
      onChange={setTime}
      hideNowButton
      hourCycle="12"
      aria-label="Wake-up alarm"
    />
  );
}

function ControlledExample() {
  const [time, setTime] = useState<TimeValue | null>({ hours: 13, minutes: 45 });
  return (
    <Stack gap="sm">
      <TimeField value={time} onChange={setTime} hourCycle="auto" aria-label="Meeting start" />
      <Text size="sm" tone="muted">
        Committed value: <Code>{JSON.stringify(time)}</Code>
      </Text>
    </Stack>
  );
}

function LocaleSideBySide() {
  const [a, setA] = useState<TimeValue | null>({ hours: 14, minutes: 30 });
  const [b, setB] = useState<TimeValue | null>({ hours: 14, minutes: 30 });
  return (
    <Stack gap="md">
      <Stack gap="xs">
        <Text size="sm" tone="muted">
          <Code>locale=&quot;en-US&quot;</Code> + <Code>hourCycle=&quot;auto&quot;</Code> → 12h
          display
        </Text>
        <LocaleProvider locale="en-US">
          <TimeField value={a} onChange={setA} aria-label="en-US time" />
        </LocaleProvider>
      </Stack>
      <Stack gap="xs">
        <Text size="sm" tone="muted">
          <Code>locale=&quot;ru-RU&quot;</Code> + <Code>hourCycle=&quot;auto&quot;</Code> → 24h
          display
        </Text>
        <LocaleProvider locale="ru-RU">
          <TimeField value={b} onChange={setB} aria-label="ru-RU time" />
        </LocaleProvider>
      </Stack>
    </Stack>
  );
}

export function TimeFieldDemo() {
  return (
    <DemoLayout
      name="TimeField"
      componentName="TimeField"
      description="Standalone time-of-day input — text input + chevron + popover with hour / minute (and AM/PM in 12h locales) listbox columns plus a Now button. Used internally by the DatePicker family when granularity='minute'; public for consumers who need a time input without a date."
      files={getComponentFiles('DatePicker').filter((f) => f.filename.startsWith('TimeField'))}
    >
      <Example
        title="Default (auto cycle)"
        description="`hourCycle='auto'` (the default) reads the active locale via `Intl.DateTimeFormat`. In the playground (en-US) this renders as a 12-hour clock with an AM/PM column in the popover. ArrowDown on the input opens the popover; ArrowUp/Down navigate within the focused column; ArrowLeft/Right switch columns; Enter commits."
        code={`const [time, setTime] = useState<TimeValue | null>({ hours: 9, minutes: 30 });
<TimeField value={time} onChange={setTime} aria-label="Start time" />`}
      >
        <DefaultExample />
      </Example>

      <Example
        title="Forced 24-hour cycle"
        description="`hourCycle='24'` overrides the locale heuristic and shows hours 00–23 in the popover with no AM/PM column. Typed input still accepts both `14:30` and `2:30 PM` shapes — the cycle controls display, not parsing."
        code={`<TimeField
  value={time}
  onChange={setTime}
  hourCycle="24"
  aria-label="Departure time"
/>`}
      >
        <Forced24Example />
      </Example>

      <Example
        title="Step = 30 minutes"
        description="`step={30}` cuts the minutes column down to two rows (`00`, `30`) AND rounds typed input on commit — `09:17` rounds to `09:30`. Use `step={1}` to disable rounding entirely."
        code={`<TimeField
  value={time}
  onChange={setTime}
  step={30}
  hourCycle="24"
  aria-label="Slot start"
/>`}
      >
        <Step30Example />
      </Example>

      <Example
        title="Hide the Now button"
        description="`hideNowButton` removes the footer row entirely. Use when 'now' isn't a meaningful default — e.g. wake-up alarms, scheduled-for-tomorrow time pickers."
        code={`<TimeField
  value={time}
  onChange={setTime}
  hideNowButton
  hourCycle="12"
  aria-label="Wake-up alarm"
/>`}
      >
        <HideNowExample />
      </Example>

      <Example
        title="Controlled with live value display"
        description="The committed value is always `{ hours: 0-23, minutes: 0-59 }` regardless of display cycle. AM/PM is a presentation concern, flipped at the column boundary; internal storage stays 24-hour so consumers don't have to track period state."
        code={`const [time, setTime] = useState<TimeValue | null>({ hours: 13, minutes: 45 });
<TimeField value={time} onChange={setTime} hourCycle="auto" aria-label="Meeting start" />
<Text size="sm" tone="muted">Committed value: <Code>{JSON.stringify(time)}</Code></Text>`}
      >
        <ControlledExample />
      </Example>

      <Example
        title="Locale-driven hourCycle='auto'"
        description="With `hourCycle='auto'` the cycle follows the locale — en-US gets 12h with AM/PM, ru-RU gets 24h. Override locally with the `locale` prop or globally with `<LocaleProvider>`."
        code={`<LocaleProvider locale="en-US">
  <TimeField value={a} onChange={setA} aria-label="en-US time" />
</LocaleProvider>

<LocaleProvider locale="ru-RU">
  <TimeField value={b} onChange={setB} aria-label="ru-RU time" />
</LocaleProvider>`}
      >
        <LocaleSideBySide />
      </Example>

      <Example
        title="Disabled (null value)"
        description="`value={null}` disables the field entirely — the input is blank, the chevron is muted, and typed input is ignored. The DatePicker family uses this to gate time selection on a date being chosen first."
        code={`<TimeField value={null} onChange={() => {}} aria-label="Time" />`}
      >
        <TimeField value={null} onChange={() => {}} aria-label="Disabled time" />
      </Example>
    </DemoLayout>
  );
}
