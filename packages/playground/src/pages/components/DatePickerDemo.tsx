import { useState } from 'react';
import {
  Button,
  DatePicker,
  I18nProvider,
  Stack,
  toDateKey,
  toIsoDateTime,
} from '@eocrm/design-system';
import { DemoBody } from './DemoBody';
import { Example } from './Example';
import { InputExample } from './InputExample';
import { getComponentFiles } from '../../lib/componentFiles';

const TODAY = new Date();
const IN_90_DAYS = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 90);
const TODAY_AT_NINE = new Date(
  TODAY.getFullYear(),
  TODAY.getMonth(),
  TODAY.getDate(),
  9,
  0,
  0,
  0,
);

function GranularityMinuteDemo() {
  const [value, setValue] = useState<Date | null>(TODAY_AT_NINE);
  return (
    <Stack gap="xs">
      <DatePicker
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

function ControlledDemo() {
  const [value, setValue] = useState<Date | null>(TODAY);
  return (
    <Stack gap="xs">
      <DatePicker value={value} onChange={setValue} aria-label="Controlled date" />
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
        <DatePicker name="dob" defaultValue={TODAY} aria-label="Date of birth" />
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

export function DatePickerDemoPanel() {
  return (
    <DemoBody files={getComponentFiles('DatePicker')} componentName="DatePicker">
      <Example
        title="Uncontrolled"
        description="No `value` / `onChange` — the picker owns state. Type a date, click in the grid, or use the clear button."
        code={`<DatePicker defaultValue={new Date()} />`}
      >
        <InputExample>
          <DatePicker defaultValue={TODAY} aria-label="Uncontrolled date" />
        </InputExample>
      </Example>

      <Example
        title="Controlled"
        description="Consumer owns the value; useful when the form layer needs to validate or react to changes."
        code={`const [value, setValue] = useState<Date | null>(new Date());
<DatePicker value={value} onChange={setValue} />`}
      >
        <InputExample>
          <ControlledDemo />
        </InputExample>
      </Example>

      <Example
        title="Min / max"
        description="`min` and `max` disable out-of-range cells in the grid AND reject typed input outside the window."
        code={`const today = new Date();
const in90Days = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90);

<DatePicker
  min={today}
  max={in90Days}
/>`}
      >
        <InputExample>
          <DatePicker
            defaultValue={TODAY}
            min={TODAY}
            max={IN_90_DAYS}
            aria-label="Date within 90 days"
          />
        </InputExample>
      </Example>

      <Example
        title="Disable weekends"
        description="`isDateDisabled` runs per cell and per typed-input parse. Disabled cells are non-clickable and arrow-key navigation skips them."
        code={`<DatePicker
  isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
/>`}
      >
        <InputExample>
          <DatePicker
            aria-label="Weekday only"
            isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
          />
        </InputExample>
      </Example>

      <Example
        title="Sizes"
        description="Three sizes — sm (24px), md (32px, default), lg (40px). The popover month grid is fixed-size; only the trigger row scales."
        code={`<DatePicker size="sm" defaultValue={new Date()} />
<DatePicker size="md" defaultValue={new Date()} />
<DatePicker size="lg" defaultValue={new Date()} />`}
      >
        <InputExample>
          <Stack gap="sm">
            <DatePicker size="sm" defaultValue={TODAY} aria-label="Small date" />
            <DatePicker size="md" defaultValue={TODAY} aria-label="Medium date" />
            <DatePicker size="lg" defaultValue={TODAY} aria-label="Large date" />
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Disabled"
        description="Use `disabled` when the field is unavailable in the current context (e.g., read-only stage of a workflow). The clear button is hidden when disabled."
        code={`<DatePicker disabled defaultValue={new Date()} />`}
      >
        <InputExample>
          <DatePicker disabled defaultValue={TODAY} aria-label="Disabled date" />
        </InputExample>
      </Example>

      <Example
        title="Invalid"
        description="Pair with a visible error message + aria-describedby."
        code={`<DatePicker invalid aria-describedby="dob-error" />
<p id="dob-error">Date is required.</p>`}
      >
        <InputExample>
          <Stack gap="xs">
            <DatePicker invalid aria-label="Date of birth" aria-describedby="dob-error" />
            <p
              id="dob-error"
              style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}
            >
              Date is required.
            </p>
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Form integration"
        description="When `name` is set, the picker renders a hidden mirror `<input>` with the ISO date so native `<form>` submission works."
        code={`<form action="/api/dates">
  <DatePicker name="dob" defaultValue={new Date()} />
  <button type="submit">Submit</button>
</form>`}
      >
        <InputExample>
          <FormDemo />
        </InputExample>
      </Example>

      <Example
        title="ru-RU locale"
        description="Input parses and formats as DD.MM.YYYY. UI labels (button tooltips) come from <I18nProvider locale='ru'>."
        code={`<I18nProvider locale="ru">
  <DatePicker defaultValue={new Date()} locale="ru-RU" />
</I18nProvider>`}
      >
        <InputExample>
          <I18nProvider locale="ru">
            <DatePicker defaultValue={TODAY} locale="ru-RU" aria-label="Дата" />
          </I18nProvider>
        </InputExample>
      </Example>

      <Example
        title="Granularity: minute"
        description="`granularity='minute'` adds a manual-entry time input below the calendar grid; the trigger text becomes `MM/DD/YYYY HH:mm` and the hidden form mirror emits ISO local datetime (`2026-05-28T14:30`). Picking a different date preserves the existing time-of-day; picking from `null` defaults to `00:00`."
        code={`const [value, setValue] = useState<Date | null>(new Date(2026, 4, 28, 9, 0));

<DatePicker
  granularity="minute"
  value={value}
  onChange={setValue}
/>
// hidden form mirror: 2026-05-28T09:00`}
      >
        <InputExample>
          <GranularityMinuteDemo />
        </InputExample>
      </Example>
    </DemoBody>
  );
}
