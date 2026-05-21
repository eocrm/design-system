import { useState } from 'react';
import { Button, DateRangePicker, Stack, toDateKey, type DateRange } from '@eocrm/design-system';
import { DemoBody } from './DemoBody';
import { Example } from './Example';
import { InputExample } from './InputExample';
import tsxSource from '@lib-source/components/DateRangePicker/DateRangePicker.tsx?raw';
import scssSource from '@lib-source/components/DateRangePicker/DateRangePicker.module.scss?raw';

const TODAY = new Date();
const IN_14 = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 14);
const IN_90 = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 90);

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
    <DemoBody
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="DateRangePicker.tsx"
      scssFilename="DateRangePicker.module.scss"
      componentName="DateRangePicker"
    >
      <Example
        title="Uncontrolled"
        description="No `value` / `onChange` — the picker owns state. Click the input or the calendar button to open; pick start then end."
        code={`const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

<DateRangePicker defaultValue={{ start: today, end: in14 }} />`}
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
        code={`const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
const [value, setValue] = useState<DateRange | null>({ start: today, end: in14 });

<DateRangePicker value={value} onChange={setValue} />`}
      >
        <InputExample>
          <ControlledDemo />
        </InputExample>
      </Example>

      <Example
        title="Min / max"
        description="Restrict picks to a window. Out-of-range cells in the grid are non-clickable; typed input outside the window reverts."
        code={`const today = new Date();
const in90 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90);

<DateRangePicker
  min={today}
  max={in90}
/>`}
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
        code={`<DateRangePicker
  isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
/>`}
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
        code={`const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

<DateRangePicker size="sm" defaultValue={{ start: today, end: in14 }} />
<DateRangePicker size="md" defaultValue={{ start: today, end: in14 }} />
<DateRangePicker size="lg" defaultValue={{ start: today, end: in14 }} />`}
      >
        <InputExample>
          <Stack gap="sm">
            <DateRangePicker size="sm" defaultValue={{ start: TODAY, end: IN_14 }} aria-label="Small range" />
            <DateRangePicker size="md" defaultValue={{ start: TODAY, end: IN_14 }} aria-label="Medium range" />
            <DateRangePicker size="lg" defaultValue={{ start: TODAY, end: IN_14 }} aria-label="Large range" />
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Disabled"
        description="Use `disabled` when the range is unavailable in the current context. The clear button is hidden when disabled."
        code={`const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

<DateRangePicker
  disabled
  defaultValue={{ start: today, end: in14 }}
/>`}
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
        code={`<DateRangePicker invalid aria-describedby="range-error" />
<p id="range-error">Range is required.</p>`}
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
        code={`const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

<form action="/api/bookings">
  <DateRangePicker nameStart="bookingStart" nameEnd="bookingEnd" defaultValue={{ start: today, end: in14 }} />
  <button type="submit">Submit</button>
</form>`}
      >
        <InputExample>
          <FormDemo />
        </InputExample>
      </Example>

      <Example
        title="ru-RU locale"
        description="Input parses and formats as DD.MM.YYYY — DD.MM.YYYY. UI labels (button tooltips, dialog name) are the consumer's responsibility — pass localized strings via the labels prop."
        code={`const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

<DateRangePicker
  defaultValue={{ start: today, end: in14 }}
  locale="ru-RU"
  labels={{
    previousMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
    openCalendar: 'Открыть календарь',
    clear: 'Очистить диапазон',
    dialogLabel: 'Выберите диапазон дат',
  }}
/>`}
      >
        <InputExample>
          <DateRangePicker
            defaultValue={{ start: TODAY, end: IN_14 }}
            locale="ru-RU"
            aria-label="Диапазон дат"
            labels={{
              previousMonth: 'Предыдущий месяц',
              nextMonth: 'Следующий месяц',
              openCalendar: 'Открыть календарь',
              clear: 'Очистить диапазон',
              dialogLabel: 'Выберите диапазон дат',
            }}
          />
        </InputExample>
      </Example>
    </DemoBody>
  );
}
