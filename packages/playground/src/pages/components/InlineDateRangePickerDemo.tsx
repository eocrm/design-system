import { useState } from 'react';
import {
  Button,
  InlineDateRangePicker,
  Stack,
  toDateKey,
  type DateRange,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import tsxSource from '@lib-source/components/DateRangePicker/InlineDateRangePicker.tsx?raw';
import scssSource from '@lib-source/components/DateRangePicker/InlineDateRangePicker.module.scss?raw';

const TODAY = new Date();
const IN_14 = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 14);
const IN_90 = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 90);

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

export function InlineDateRangePickerDemo() {
  return (
    <DemoLayout
      name="InlineDateRangePicker"
      componentName="InlineDateRangePicker"
      description="Date-range calendar grid (two months side-by-side) embedded directly in the page. Same click-1/click-2/restart selection, hover preview, auto-swap, and keyboard cross-grid navigation as <DateRangePicker>, without the input / popover."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="InlineDateRangePicker.tsx"
      scssFilename="InlineDateRangePicker.module.scss"
    >
      <Example
        title="Uncontrolled"
        description="No `value` / `onChange` — the picker owns state. Click start then end; hover (or arrow-key) between clicks shows the preview range."
        code={`const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

<InlineDateRangePicker defaultValue={{ start: today, end: in14 }} />`}
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
        code={`const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
const [value, setValue] = useState<DateRange | null>({ start: today, end: in14 });

<InlineDateRangePicker value={value} onChange={setValue} />`}
      >
        <InputExample width="auto">
          <ControlledDemo />
        </InputExample>
      </Example>

      <Example
        title="Min / max"
        description="Out-of-range cells are non-clickable on both halves."
        code={`const today = new Date();
const in90 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90);

<InlineDateRangePicker min={today} max={in90} />`}
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
        code={`<InlineDateRangePicker
  isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
/>`}
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
        code={`const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

<InlineDateRangePicker disabled defaultValue={{ start: today, end: in14 }} />`}
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
        code={`<form action="/api/bookings">
  <InlineDateRangePicker nameStart="bookingStart" nameEnd="bookingEnd" />
  <button type="submit">Submit</button>
</form>`}
      >
        <InputExample width="auto">
          <FormDemo />
        </InputExample>
      </Example>

      <Example
        title="ru-RU locale"
        description="Locale-aware labels. UI strings (chevron tooltips) localized via the labels prop."
        code={`const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

<InlineDateRangePicker
  defaultValue={{ start: today, end: in14 }}
  locale="ru-RU"
  labels={{
    previousMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
  }}
/>`}
      >
        <InputExample width="auto">
          <InlineDateRangePicker
            defaultValue={{ start: TODAY, end: IN_14 }}
            locale="ru-RU"
            aria-label="Диапазон дат"
            labels={{
              previousMonth: 'Предыдущий месяц',
              nextMonth: 'Следующий месяц',
            }}
          />
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
