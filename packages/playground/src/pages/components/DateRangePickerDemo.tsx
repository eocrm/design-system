import { useState } from 'react';
import { Button, DateRangePicker, type DateRange } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
      <DateRangePicker value={value} onChange={setValue} aria-label="Controlled range" />
      <code>
        {value
          ? `${value.start.toISOString().slice(0, 10)} → ${value.end.toISOString().slice(0, 10)}`
          : 'null'}
      </code>
    </div>
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
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
    >
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
        <code>
          bookingStart = {submitted.start || '(empty)'} · bookingEnd = {submitted.end || '(empty)'}
        </code>
      )}
    </form>
  );
}

export function DateRangePickerDemo() {
  return (
    <DemoLayout
      name="DateRangePicker"
      componentName="DateRangePicker"
      description="Single-field date-range input with a two-month popover, hover preview between clicks, auto-swap on out-of-order picks, and separate nameStart/nameEnd form mirrors. Built on the same DatePickerGrid as DatePicker (with a new range mode)."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="DateRangePicker.tsx"
      scssFilename="DateRangePicker.module.scss"
    >
      <Example
        title="Uncontrolled"
        description="No `value` / `onChange` — the picker owns state. Click the input or the calendar button to open; pick start then end."
        code={`const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);

<DateRangePicker defaultValue={{ start: today, end: in14 }} />`}
      >
        <DateRangePicker
          defaultValue={{ start: TODAY, end: IN_14 }}
          aria-label="Uncontrolled range"
        />
      </Example>

      <Example
        title="Controlled"
        description="Consumer owns the value via `value` + `onChange`. Useful when the form layer needs to react to changes (validation, summary panels)."
        code={`const today = new Date();
const in14 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 14);
const [value, setValue] = useState<DateRange | null>({ start: today, end: in14 });

<DateRangePicker value={value} onChange={setValue} />`}
      >
        <ControlledDemo />
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
        <DateRangePicker
          defaultValue={{ start: TODAY, end: IN_14 }}
          min={TODAY}
          max={IN_90}
          aria-label="Range within 90 days"
        />
      </Example>

      <Example
        title="Disable weekends"
        description="`isDateDisabled` runs per cell and per typed-input parse. Disabled cells are non-clickable; arrow-key navigation skips them."
        code={`<DateRangePicker
  isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
/>`}
      >
        <DateRangePicker
          aria-label="Weekday range only"
          isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
        />
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
        <DateRangePicker
          disabled
          defaultValue={{ start: TODAY, end: IN_14 }}
          aria-label="Disabled range"
        />
      </Example>

      <Example
        title="Invalid"
        description="Pair with a visible error message and aria-describedby pointing at it."
        code={`<DateRangePicker invalid aria-describedby="range-error" />
<p id="range-error">Range is required.</p>`}
      >
        <div>
          <DateRangePicker invalid aria-label="Booking dates" aria-describedby="range-error" />
          <p id="range-error" style={{ color: 'var(--color-danger)', marginTop: 'var(--space-1)' }}>
            Range is required.
          </p>
        </div>
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
        <FormDemo />
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
      </Example>
    </DemoLayout>
  );
}
