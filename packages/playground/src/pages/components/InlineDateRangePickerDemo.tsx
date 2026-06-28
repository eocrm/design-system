import { useState } from 'react';
import {
  Button,
  I18nProvider,
  InlineDateRangePicker,
  Stack,
  toDateKey,
  toIsoDateTime,
  type DateRange,
} from '@eocrm/design-system';
import { DemoBody } from './DemoBody';
import { Example } from './Example';
import { InputExample } from './InputExample';
import { getComponentFiles } from '../../lib/componentFiles';

const TODAY = new Date();
const IN_14 = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 14);
const IN_90 = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 90);
const TODAY_9AM = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 9, 0, 0, 0);
const TODAY_5PM = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 17, 0, 0, 0);

function GranularityMinuteDemo() {
  // Starts EMPTY (value === null) so the start/end time inputs are visible
  // and editable below the grid before any range is picked — set the times
  // first, then click two days and the pending times carry through.
  const [value, setValue] = useState<DateRange | null>(null);
  return (
    <Stack gap="xs">
      <InlineDateRangePicker
        granularity="minute"
        value={value}
        onChange={setValue}
        aria-label="Meeting window"
      />
      <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
        {value ? `${toIsoDateTime(value.start)} → ${toIsoDateTime(value.end)}` : 'null'}
      </code>
    </Stack>
  );
}

function HourCycleDemo() {
  const [v12, setV12] = useState<DateRange | null>({ start: TODAY_9AM, end: TODAY_5PM });
  const [v24, setV24] = useState<DateRange | null>({ start: TODAY_9AM, end: TODAY_5PM });
  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
          hourCycle=&quot;12&quot;
        </code>
        <InlineDateRangePicker
          granularity="minute"
          hourCycle="12"
          value={v12}
          onChange={setV12}
          aria-label="12-hour range"
        />
      </Stack>
      <Stack gap="xs">
        <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
          hourCycle=&quot;24&quot;
        </code>
        <InlineDateRangePicker
          granularity="minute"
          hourCycle="24"
          value={v24}
          onChange={setV24}
          aria-label="24-hour range"
        />
      </Stack>
    </Stack>
  );
}

function ControlledDemo() {
  const [value, setValue] = useState<DateRange | null>({ start: TODAY, end: IN_14 });
  return (
    <Stack gap="xs">
      <InlineDateRangePicker value={value} onChange={setValue} aria-label="Controlled range" />
      <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
        {value ? `${toDateKey(value.start)} → ${toDateKey(value.end)}` : 'null'}
      </code>
    </Stack>
  );
}

function FormDemo() {
  const [submitted, setSubmitted] = useState<{ start: string; end: string } | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setSubmitted({
          start: String(fd.get('bookingStart') ?? ''),
          end: String(fd.get('bookingEnd') ?? ''),
        });
      }}
    >
      <Stack gap="xs">
        <InlineDateRangePicker
          nameStart="bookingStart"
          nameEnd="bookingEnd"
          defaultValue={{ start: TODAY, end: IN_14 }}
          aria-label="Booking dates"
        />
        <Button type="submit" size="sm">
          Submit
        </Button>
        {submitted !== null && (
          <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
            bookingStart = {submitted.start || '(empty)'} · bookingEnd ={' '}
            {submitted.end || '(empty)'}
          </code>
        )}
      </Stack>
    </form>
  );
}

export function InlineDateRangePickerDemoPanel() {
  return (
    <DemoBody files={getComponentFiles('DateRangePicker')} componentName="InlineDateRangePicker">
      <Example
        title="Uncontrolled"
        description="No `value` / `onChange` — the picker owns state. Click start then end; hover (or arrow-key) between clicks shows the preview range."
        code={`import { InlineDateRangePicker } from '@eocrm/design-system';

const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

export function Demo() {
  return (
    <InlineDateRangePicker
      defaultValue={{ start: today, end: in14 }}
      aria-label="Uncontrolled range"
    />
  );
}`}
      >
        <InputExample width="auto">
          <InlineDateRangePicker
            defaultValue={{ start: TODAY, end: IN_14 }}
            aria-label="Uncontrolled range"
          />
        </InputExample>
      </Example>

      <Example
        title="Controlled"
        description="Consumer owns the value via `value` + `onChange`. Useful when the form layer reacts to range changes (validation, summary panels)."
        code={`import { useState } from 'react';
import { InlineDateRangePicker, Stack, toDateKey, type DateRange } from '@eocrm/design-system';

const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

export function ControlledDemo() {
  const [value, setValue] = useState<DateRange | null>({ start: today, end: in14 });
  return (
    <Stack gap="xs">
      <InlineDateRangePicker value={value} onChange={setValue} aria-label="Controlled range" />
      <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
        {value ? \`\${toDateKey(value.start)} → \${toDateKey(value.end)}\` : 'null'}
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
        description="Out-of-range cells are non-clickable on both halves."
        code={`import { InlineDateRangePicker } from '@eocrm/design-system';

const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
const in90 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90);

export function Demo() {
  return (
    <InlineDateRangePicker
      defaultValue={{ start: today, end: in14 }}
      min={today}
      max={in90}
      aria-label="Range within 90 days"
    />
  );
}`}
      >
        <InputExample width="auto">
          <InlineDateRangePicker
            defaultValue={{ start: TODAY, end: IN_14 }}
            min={TODAY}
            max={IN_90}
            aria-label="Range within 90 days"
          />
        </InputExample>
      </Example>

      <Example
        title="Disable weekends"
        description="`isDateDisabled` runs per cell on both halves and gates the boundary picks."
        code={`import { InlineDateRangePicker } from '@eocrm/design-system';

export function Demo() {
  return (
    <InlineDateRangePicker
      aria-label="Weekday range only"
      isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
    />
  );
}`}
      >
        <InputExample width="auto">
          <InlineDateRangePicker
            aria-label="Weekday range only"
            isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
          />
        </InputExample>
      </Example>

      <Example
        title="Disabled"
        description="`disabled` blocks selection and chevron navigation; the entire grid pair mutes visually."
        code={`import { InlineDateRangePicker } from '@eocrm/design-system';

const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

export function Demo() {
  return (
    <InlineDateRangePicker
      disabled
      defaultValue={{ start: today, end: in14 }}
      aria-label="Disabled range"
    />
  );
}`}
      >
        <InputExample width="auto">
          <InlineDateRangePicker
            disabled
            defaultValue={{ start: TODAY, end: IN_14 }}
            aria-label="Disabled range"
          />
        </InputExample>
      </Example>

      <Example
        title="Form integration"
        description="When `nameStart` and `nameEnd` are set, the picker renders two hidden mirror `<input>`s with ISO dates so native `<form>` submission works."
        code={`import { useState } from 'react';
import { Button, InlineDateRangePicker, Stack } from '@eocrm/design-system';

const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

export function FormDemo() {
  const [submitted, setSubmitted] = useState<{ start: string; end: string } | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setSubmitted({
          start: String(fd.get('bookingStart') ?? ''),
          end: String(fd.get('bookingEnd') ?? ''),
        });
      }}
    >
      <Stack gap="xs">
        <InlineDateRangePicker
          nameStart="bookingStart"
          nameEnd="bookingEnd"
          defaultValue={{ start: today, end: in14 }}
          aria-label="Booking dates"
        />
        <Button type="submit" size="sm">
          Submit
        </Button>
        {submitted !== null && (
          <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
            bookingStart = {submitted.start || '(empty)'} · bookingEnd ={' '}
            {submitted.end || '(empty)'}
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
        description="Locale-aware labels. UI strings (chevron tooltips) come from <I18nProvider locale='ru'>."
        code={`import { I18nProvider, InlineDateRangePicker } from '@eocrm/design-system';

const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

export function Demo() {
  return (
    <I18nProvider locale="ru">
      <InlineDateRangePicker
        defaultValue={{ start: today, end: in14 }}
        locale="ru-RU"
        aria-label="Диапазон дат"
      />
    </I18nProvider>
  );
}`}
      >
        <InputExample width="auto">
          <I18nProvider locale="ru">
            <InlineDateRangePicker
              defaultValue={{ start: TODAY, end: IN_14 }}
              locale="ru-RU"
              aria-label="Диапазон дат"
            />
          </I18nProvider>
        </InputExample>
      </Example>

      <Example
        title="Granularity: minute"
        description="`granularity='minute'` renders dual start-time / end-time inputs below the two-month grid. This example starts EMPTY (`value === null`) — the start/end time inputs are already there, enabled and defaulting to `00:00` / `23:59`, before any range is picked. Set the times first, then click two days: the pending times you entered are applied to the committed range (no need to seed a placeholder range). Existing times are preserved across subsequent date picks. On a same-day range, the end-time silently clamps to ≥ the start-time on every commit (try setting end-time earlier than start-time — it snaps back). Each embedded `<TimeField>` exposes a Now button."
        code={`import { useState } from 'react';
import { InlineDateRangePicker, Stack, toIsoDateTime, type DateRange } from '@eocrm/design-system';

export function GranularityMinuteDemo() {
  // Starts EMPTY (value === null) so the start/end time inputs are visible
  // and editable below the grid before any range is picked — set the times
  // first, then click two days and the pending times carry through.
  const [value, setValue] = useState<DateRange | null>(null);
  return (
    <Stack gap="xs">
      <InlineDateRangePicker
        granularity="minute"
        value={value}
        onChange={setValue}
        aria-label="Meeting window"
      />
      <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
        {value ? \`\${toIsoDateTime(value.start)} → \${toIsoDateTime(value.end)}\` : 'null'}
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
        description="`hourCycle` propagates to both the start and end TimeFields. Default `'auto'` derives from locale."
        code={`import { useState } from 'react';
import { InlineDateRangePicker, Stack, type DateRange } from '@eocrm/design-system';

const today = new Date();
const today9am = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0, 0);
const today5pm = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 0, 0, 0);

export function HourCycleDemo() {
  const [v12, setV12] = useState<DateRange | null>({ start: today9am, end: today5pm });
  const [v24, setV24] = useState<DateRange | null>({ start: today9am, end: today5pm });
  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
          hourCycle=&quot;12&quot;
        </code>
        <InlineDateRangePicker
          granularity="minute"
          hourCycle="12"
          value={v12}
          onChange={setV12}
          aria-label="12-hour range"
        />
      </Stack>
      <Stack gap="xs">
        <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
          hourCycle=&quot;24&quot;
        </code>
        <InlineDateRangePicker
          granularity="minute"
          hourCycle="24"
          value={v24}
          onChange={setV24}
          aria-label="24-hour range"
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
