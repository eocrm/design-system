import { useState } from 'react';
import {
  Button,
  DateRangePicker,
  I18nProvider,
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
  // and editable in the popover before any range is picked — set the times
  // first, then click two days and the pending times carry through.
  const [value, setValue] = useState<DateRange | null>(null);
  return (
    <Stack gap="xs">
      <DateRangePicker
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
    <Stack gap="md">
      <Stack gap="xs">
        <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
          hourCycle=&quot;12&quot;
        </code>
        <DateRangePicker
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
        <DateRangePicker
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
  const [value, setValue] = useState<DateRange | null>({
    start: TODAY,
    end: IN_14,
  });
  return (
    <Stack gap="xs">
      <DateRangePicker value={value} onChange={setValue} aria-label="Controlled range" />
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
        <DateRangePicker
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

export function DateRangePickerDemoPanel() {
  return (
    <DemoBody files={getComponentFiles('DateRangePicker')} componentName="DateRangePicker">
      <Example
        title="Uncontrolled"
        description="No `value` / `onChange` — the picker owns state. Click the input or the calendar button to open; pick start then end."
        code={`import { DateRangePicker } from '@eocrm/design-system';

const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

export function Demo() {
  return (
    <DateRangePicker
      defaultValue={{ start: today, end: in14 }}
      aria-label="Uncontrolled range"
    />
  );
}`}
      >
        <InputExample>
          <DateRangePicker
            defaultValue={{ start: TODAY, end: IN_14 }}
            aria-label="Uncontrolled range"
          />
        </InputExample>
      </Example>

      <Example
        title="Controlled"
        description="Consumer owns the value via `value` + `onChange`. Useful when the form layer needs to react to changes (validation, summary panels)."
        code={`import { useState } from 'react';
import { DateRangePicker, Stack, toDateKey, type DateRange } from '@eocrm/design-system';

const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

export function ControlledDemo() {
  const [value, setValue] = useState<DateRange | null>({
    start: today,
    end: in14,
  });
  return (
    <Stack gap="xs">
      <DateRangePicker value={value} onChange={setValue} aria-label="Controlled range" />
      <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
        {value ? \`\${toDateKey(value.start)} → \${toDateKey(value.end)}\` : 'null'}
      </code>
    </Stack>
  );
}`}
      >
        <InputExample>
          <ControlledDemo />
        </InputExample>
      </Example>

      <Example
        title="Min / max"
        description="Restrict picks to a window. Out-of-range cells in the grid are non-clickable; typed input outside the window reverts."
        code={`import { DateRangePicker } from '@eocrm/design-system';

const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
const in90 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90);

export function Demo() {
  return (
    <DateRangePicker
      defaultValue={{ start: today, end: in14 }}
      min={today}
      max={in90}
      aria-label="Range within 90 days"
    />
  );
}`}
      >
        <InputExample>
          <DateRangePicker
            defaultValue={{ start: TODAY, end: IN_14 }}
            min={TODAY}
            max={IN_90}
            aria-label="Range within 90 days"
          />
        </InputExample>
      </Example>

      <Example
        title="Disable weekends"
        description="`isDateDisabled` runs per cell and per typed-input parse. Disabled cells are non-clickable; arrow-key navigation skips them."
        code={`import { DateRangePicker } from '@eocrm/design-system';

export function Demo() {
  return (
    <DateRangePicker
      aria-label="Weekday range only"
      isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
    />
  );
}`}
      >
        <InputExample>
          <DateRangePicker
            aria-label="Weekday range only"
            isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
          />
        </InputExample>
      </Example>

      <Example
        title="Sizes"
        description="Three sizes — sm (24px), md (32px, default), lg (40px). The two-month popover grid is fixed-size; only the trigger row scales."
        code={`import { DateRangePicker, Stack } from '@eocrm/design-system';

const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

export function Demo() {
  return (
    <Stack gap="sm">
      <DateRangePicker size="sm" defaultValue={{ start: today, end: in14 }} aria-label="Small range" />
      <DateRangePicker size="md" defaultValue={{ start: today, end: in14 }} aria-label="Medium range" />
      <DateRangePicker size="lg" defaultValue={{ start: today, end: in14 }} aria-label="Large range" />
    </Stack>
  );
}`}
      >
        <InputExample>
          <Stack gap="sm">
            <DateRangePicker
              size="sm"
              defaultValue={{ start: TODAY, end: IN_14 }}
              aria-label="Small range"
            />
            <DateRangePicker
              size="md"
              defaultValue={{ start: TODAY, end: IN_14 }}
              aria-label="Medium range"
            />
            <DateRangePicker
              size="lg"
              defaultValue={{ start: TODAY, end: IN_14 }}
              aria-label="Large range"
            />
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Disabled"
        description="Use `disabled` when the range is unavailable in the current context. The clear button is hidden when disabled."
        code={`import { DateRangePicker } from '@eocrm/design-system';

const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

export function Demo() {
  return (
    <DateRangePicker
      disabled
      defaultValue={{ start: today, end: in14 }}
      aria-label="Disabled range"
    />
  );
}`}
      >
        <InputExample>
          <DateRangePicker
            disabled
            defaultValue={{ start: TODAY, end: IN_14 }}
            aria-label="Disabled range"
          />
        </InputExample>
      </Example>

      <Example
        title="Invalid"
        description="Pair with a visible error message and aria-describedby pointing at it."
        code={`import { DateRangePicker, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="xs">
      <DateRangePicker invalid aria-label="Booking dates" aria-describedby="range-error" />
      <p
        id="range-error"
        style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}
      >
        Range is required.
      </p>
    </Stack>
  );
}`}
      >
        <InputExample>
          <Stack gap="xs">
            <DateRangePicker invalid aria-label="Booking dates" aria-describedby="range-error" />
            <p
              id="range-error"
              style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}
            >
              Range is required.
            </p>
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Form integration"
        description="When `nameStart` and `nameEnd` are set, the picker renders two hidden mirror `<input>`s with ISO dates so native `<form>` submission works."
        code={`import { useState } from 'react';
import { Button, DateRangePicker, Stack } from '@eocrm/design-system';

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
        <DateRangePicker
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
        <InputExample>
          <FormDemo />
        </InputExample>
      </Example>

      <Example
        title="ru-RU locale"
        description="Input parses and formats as DD.MM.YYYY — DD.MM.YYYY. UI labels (button tooltips) come from <I18nProvider locale='ru'>."
        code={`import { DateRangePicker, I18nProvider } from '@eocrm/design-system';

const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

export function Demo() {
  return (
    <I18nProvider locale="ru">
      <DateRangePicker
        defaultValue={{ start: today, end: in14 }}
        locale="ru-RU"
        aria-label="Диапазон дат"
      />
    </I18nProvider>
  );
}`}
      >
        <InputExample>
          <I18nProvider locale="ru">
            <DateRangePicker
              defaultValue={{ start: TODAY, end: IN_14 }}
              locale="ru-RU"
              aria-label="Диапазон дат"
            />
          </I18nProvider>
        </InputExample>
      </Example>

      <Example
        title="Granularity: minute"
        description="`granularity='minute'` adds dual start-time / end-time inputs below the two-month grid; the trigger text becomes `MM/DD/YYYY HH:mm — MM/DD/YYYY HH:mm` (or `MM/DD/YYYY h:mm AM/PM — …` in 12h locales) and the hidden form mirrors emit ISO local datetime. This example starts EMPTY (`value === null`) — open the popover and the start/end time inputs are already there, enabled and defaulting to `00:00` / `23:59`. Set the times first, then click two days: the pending times you entered are applied to the committed range (no need to seed a placeholder range). Existing times are preserved across subsequent date picks. On a same-day range, the end-time silently clamps to ≥ the start-time on every commit (try setting end-time earlier than start-time — it snaps back)."
        code={`import { useState } from 'react';
import { DateRangePicker, Stack, toIsoDateTime, type DateRange } from '@eocrm/design-system';

export function GranularityMinuteDemo() {
  const [value, setValue] = useState<DateRange | null>(null);
  return (
    <Stack gap="xs">
      <DateRangePicker
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
        <InputExample>
          <GranularityMinuteDemo />
        </InputExample>
      </Example>

      <Example
        title="Hour cycle (12h vs 24h)"
        description="`hourCycle` propagates to both the start and end TimeFields AND to the trigger text formatter. The default `'auto'` derives the cycle from locale via `Intl.DateTimeFormat`."
        code={`import { useState } from 'react';
import { DateRangePicker, Stack, type DateRange } from '@eocrm/design-system';

const today = new Date();
const today9am = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0, 0);
const today5pm = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 0, 0, 0);

export function HourCycleDemo() {
  const [v12, setV12] = useState<DateRange | null>({ start: today9am, end: today5pm });
  const [v24, setV24] = useState<DateRange | null>({ start: today9am, end: today5pm });
  return (
    <Stack gap="md">
      <Stack gap="xs">
        <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
          hourCycle=&quot;12&quot;
        </code>
        <DateRangePicker
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
        <DateRangePicker
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
        <InputExample>
          <HourCycleDemo />
        </InputExample>
      </Example>
    </DemoBody>
  );
}
