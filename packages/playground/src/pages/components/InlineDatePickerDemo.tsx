import { useState } from 'react';
import { Button, InlineDatePicker, Stack, toDateKey } from '@eocrm/design-system';
import { DemoBody } from './DemoBody';
import { Example } from './Example';
import { InputExample } from './InputExample';
import { getComponentFiles } from '../../lib/componentFiles';

const TODAY = new Date();
const IN_90 = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 90);

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
        code={`<InlineDatePicker defaultValue={new Date()} />`}
      >
        <InputExample width="auto">
          <InlineDatePicker defaultValue={TODAY} aria-label="Uncontrolled date" />
        </InputExample>
      </Example>

      <Example
        title="Controlled"
        description="Consumer owns the value via `value` + `onChange`. The picker's cursor stays where the user navigated — programmatic value changes don't scroll the calendar."
        code={`const [value, setValue] = useState<Date | null>(new Date());
<InlineDatePicker value={value} onChange={setValue} />`}
      >
        <InputExample width="auto">
          <ControlledDemo />
        </InputExample>
      </Example>

      <Example
        title="Min / max"
        description="Restrict picks to a window. Out-of-range cells are non-clickable; arrow nav skips them."
        code={`const today = new Date();
const in90 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90);

<InlineDatePicker min={today} max={in90} />`}
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
        code={`<InlineDatePicker
  isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
/>`}
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
        code={`<InlineDatePicker disabled defaultValue={new Date()} />`}
      >
        <InputExample width="auto">
          <InlineDatePicker disabled defaultValue={TODAY} aria-label="Disabled date" />
        </InputExample>
      </Example>

      <Example
        title="Form integration"
        description="When `name` is set, the picker renders a hidden mirror `<input>` with the ISO date so native `<form>` submission works."
        code={`<form action="/api/dates">
  <InlineDatePicker name="dob" defaultValue={new Date()} />
  <button type="submit">Submit</button>
</form>`}
      >
        <InputExample width="auto">
          <FormDemo />
        </InputExample>
      </Example>

      <Example
        title="ru-RU locale"
        description="Locale-aware month + weekday labels."
        code={`<InlineDatePicker
  defaultValue={new Date()}
  locale="ru-RU"
  labels={{
    previousMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
  }}
/>`}
      >
        <InputExample width="auto">
          <InlineDatePicker
            defaultValue={TODAY}
            locale="ru-RU"
            aria-label="Дата"
            labels={{
              previousMonth: 'Предыдущий месяц',
              nextMonth: 'Следующий месяц',
            }}
          />
        </InputExample>
      </Example>
    </DemoBody>
  );
}
