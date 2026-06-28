import { useState } from 'react';
import {
  Button,
  I18nProvider,
  InlineDatePicker,
  Stack,
  toDateKey,
  toIsoDateTime,
} from '@eocrm/design-system';
import { DemoBody } from './DemoBody';
import { Example } from './Example';
import { InputExample } from './InputExample';
import { getComponentFiles } from '../../lib/componentFiles';

const TODAY = new Date();
const IN_90 = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 90);
const TODAY_AT_NINE = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 9, 0, 0, 0);

function GranularityMinuteDemo() {
  const [value, setValue] = useState<Date | null>(TODAY_AT_NINE);
  return (
    <Stack gap="xs">
      <InlineDatePicker
        granularity="minute"
        value={value}
        onChange={setValue}
        aria-label="Meeting start"
      />
      <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
        {value ? toIsoDateTime(value) : 'null'}
      </code>
    </Stack>
  );
}

function HourCycleDemo() {
  const [v12, setV12] = useState<Date | null>(TODAY_AT_NINE);
  const [v24, setV24] = useState<Date | null>(TODAY_AT_NINE);
  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
          hourCycle=&quot;12&quot;
        </code>
        <InlineDatePicker
          granularity="minute"
          hourCycle="12"
          value={v12}
          onChange={setV12}
          aria-label="12-hour datetime"
        />
      </Stack>
      <Stack gap="xs">
        <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
          hourCycle=&quot;24&quot;
        </code>
        <InlineDatePicker
          granularity="minute"
          hourCycle="24"
          value={v24}
          onChange={setV24}
          aria-label="24-hour datetime"
        />
      </Stack>
    </Stack>
  );
}

function ControlledDemo() {
  const [value, setValue] = useState<Date | null>(TODAY);
  return (
    <Stack gap="xs">
      <InlineDatePicker value={value} onChange={setValue} aria-label="Controlled date" />
      <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
        {value ? toDateKey(value) : 'null'}
      </code>
    </Stack>
  );
}

function FormDemo() {
  const [submitted, setSubmitted] = useState<string | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setSubmitted(String(fd.get('dob') ?? ''));
      }}
    >
      <Stack gap="xs">
        <InlineDatePicker name="dob" defaultValue={TODAY} aria-label="Date of birth" />
        <Button type="submit" size="sm">
          Submit
        </Button>
        {submitted !== null && (
          <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
            dob = {submitted || '(empty)'}
          </code>
        )}
      </Stack>
    </form>
  );
}

export function InlineDatePickerDemoPanel() {
  return (
    <DemoBody files={getComponentFiles('DatePicker')} componentName="InlineDatePicker">
      <Example
        title="Uncontrolled"
        description="No `value` / `onChange` — the picker owns state. Click a cell to set; use the chevrons or PageUp/PageDown to navigate."
        code={`import { InlineDatePicker } from '@eocrm/design-system';

export function Demo() {
  return <InlineDatePicker defaultValue={new Date()} aria-label="Uncontrolled date" />;
}`}
      >
        <InputExample width="auto">
          <InlineDatePicker defaultValue={TODAY} aria-label="Uncontrolled date" />
        </InputExample>
      </Example>

      <Example
        title="Controlled"
        description="Consumer owns the value via `value` + `onChange`. The picker's cursor stays where the user navigated — programmatic value changes don't scroll the calendar."
        code={`import { useState } from 'react';
import { InlineDatePicker, Stack, toDateKey } from '@eocrm/design-system';

export function ControlledDemo() {
  const [value, setValue] = useState<Date | null>(new Date());
  return (
    <Stack gap="xs">
      <InlineDatePicker value={value} onChange={setValue} aria-label="Controlled date" />
      <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
        {value ? toDateKey(value) : 'null'}
      </code>
    </Stack>
  );
}`}
      >
        <InputExample width="auto">
          <ControlledDemo />
        </InputExample>
      </Example>

      <Example
        title="Min / max"
        description="Restrict picks to a window. Out-of-range cells are non-clickable; arrow nav skips them."
        code={`import { InlineDatePicker } from '@eocrm/design-system';

const today = new Date();
const in90 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90);

export function Demo() {
  return (
    <InlineDatePicker
      defaultValue={today}
      min={today}
      max={in90}
      aria-label="Date within 90 days"
    />
  );
}`}
      >
        <InputExample width="auto">
          <InlineDatePicker
            defaultValue={TODAY}
            min={TODAY}
            max={IN_90}
            aria-label="Date within 90 days"
          />
        </InputExample>
      </Example>

      <Example
        title="Disable weekends"
        description="`isDateDisabled` runs per cell. Disabled cells are non-clickable and arrow-key navigation skips them."
        code={`import { InlineDatePicker } from '@eocrm/design-system';

export function Demo() {
  return (
    <InlineDatePicker
      aria-label="Weekday only"
      isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
    />
  );
}`}
      >
        <InputExample width="auto">
          <InlineDatePicker
            aria-label="Weekday only"
            isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
          />
        </InputExample>
      </Example>

      <Example
        title="Disabled"
        description="Use `disabled` when the calendar is unavailable in the current context. Cells / chevrons / keyboard nav all blocked; the grid mutes visually."
        code={`import { InlineDatePicker } from '@eocrm/design-system';

export function Demo() {
  return <InlineDatePicker disabled defaultValue={new Date()} aria-label="Disabled date" />;
}`}
      >
        <InputExample width="auto">
          <InlineDatePicker disabled defaultValue={TODAY} aria-label="Disabled date" />
        </InputExample>
      </Example>

      <Example
        title="Form integration"
        description="When `name` is set, the picker renders a hidden mirror `<input>` with the ISO date so native `<form>` submission works."
        code={`import { useState } from 'react';
import { Button, InlineDatePicker, Stack } from '@eocrm/design-system';

export function FormDemo() {
  const [submitted, setSubmitted] = useState<string | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setSubmitted(String(fd.get('dob') ?? ''));
      }}
    >
      <Stack gap="xs">
        <InlineDatePicker name="dob" defaultValue={new Date()} aria-label="Date of birth" />
        <Button type="submit" size="sm">
          Submit
        </Button>
        {submitted !== null && (
          <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
            dob = {submitted || '(empty)'}
          </code>
        )}
      </Stack>
    </form>
  );
}`}
      >
        <InputExample width="auto">
          <FormDemo />
        </InputExample>
      </Example>

      <Example
        title="ru-RU locale"
        description="Locale-aware month + weekday labels. UI labels (chevrons) come from <I18nProvider locale='ru'>."
        code={`import { I18nProvider, InlineDatePicker } from '@eocrm/design-system';

export function Demo() {
  return (
    <I18nProvider locale="ru">
      <InlineDatePicker defaultValue={new Date()} locale="ru-RU" aria-label="Дата" />
    </I18nProvider>
  );
}`}
      >
        <InputExample width="auto">
          <I18nProvider locale="ru">
            <InlineDatePicker defaultValue={TODAY} locale="ru-RU" aria-label="Дата" />
          </I18nProvider>
        </InputExample>
      </Example>

      <Example
        title="Granularity: minute"
        description="`granularity='minute'` renders a manual-entry time input below the grid (always visible — there's no popover to gate it on). Picking a different date preserves the existing time-of-day; the time input is disabled until a date is set. The hidden form mirror emits ISO local datetime (`2026-05-28T09:00`). The embedded `<TimeField>` exposes a Now button in its popover."
        code={`import { useState } from 'react';
import { InlineDatePicker, Stack, toIsoDateTime } from '@eocrm/design-system';

const today = new Date();
const todayAtNine = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0, 0);

export function GranularityMinuteDemo() {
  const [value, setValue] = useState<Date | null>(todayAtNine);
  return (
    <Stack gap="xs">
      <InlineDatePicker
        granularity="minute"
        value={value}
        onChange={setValue}
        aria-label="Meeting start"
      />
      <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
        {value ? toIsoDateTime(value) : 'null'}
      </code>
    </Stack>
  );
}`}
      >
        <InputExample width="auto">
          <GranularityMinuteDemo />
        </InputExample>
      </Example>

      <Example
        title="Hour cycle (12h vs 24h)"
        description="`hourCycle` forwards to the embedded TimeField. `'12'` shows a 12-hour AM/PM popover; `'24'` shows hours 00–23. Default `'auto'` derives from the active locale."
        code={`import { useState } from 'react';
import { InlineDatePicker, Stack } from '@eocrm/design-system';

const today = new Date();
const todayAtNine = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0, 0);

export function HourCycleDemo() {
  const [v12, setV12] = useState<Date | null>(todayAtNine);
  const [v24, setV24] = useState<Date | null>(todayAtNine);
  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
          hourCycle=&quot;12&quot;
        </code>
        <InlineDatePicker
          granularity="minute"
          hourCycle="12"
          value={v12}
          onChange={setV12}
          aria-label="12-hour datetime"
        />
      </Stack>
      <Stack gap="xs">
        <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
          hourCycle=&quot;24&quot;
        </code>
        <InlineDatePicker
          granularity="minute"
          hourCycle="24"
          value={v24}
          onChange={setV24}
          aria-label="24-hour datetime"
        />
      </Stack>
    </Stack>
  );
}`}
      >
        <InputExample width="auto">
          <HourCycleDemo />
        </InputExample>
      </Example>
    </DemoBody>
  );
}
