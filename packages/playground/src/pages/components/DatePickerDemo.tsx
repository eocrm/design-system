import { useState } from 'react';
import { Button, DatePicker, Stack, toDateKey } from '@eocrm/design-system';
import { DemoBody } from './DemoBody';
import { Example } from './Example';
import { InputExample } from './InputExample';
import { getComponentFiles } from '../../lib/componentFiles';

const TODAY = new Date();
const IN_90_DAYS = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 90);

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
        description="Input parses and formats as DD.MM.YYYY. UI labels (button tooltips, dialog name) are the consumer's responsibility — pass localized strings via the labels prop."
        code={`<DatePicker
  defaultValue={new Date()}
  locale="ru-RU"
  labels={{
    previousMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
    openCalendar: 'Открыть календарь',
    clear: 'Очистить дату',
    dialogLabel: 'Выберите дату',
  }}
/>`}
      >
        <InputExample>
          <DatePicker
            defaultValue={TODAY}
            locale="ru-RU"
            aria-label="Дата"
            labels={{
              previousMonth: 'Предыдущий месяц',
              nextMonth: 'Следующий месяц',
              openCalendar: 'Открыть календарь',
              clear: 'Очистить дату',
              dialogLabel: 'Выберите дату',
            }}
          />
        </InputExample>
      </Example>
    </DemoBody>
  );
}
