import { useState } from 'react';
import { DatePicker } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/DatePicker/DatePicker.tsx?raw';
import scssSource from '@lib-source/components/DatePicker/DatePicker.module.scss?raw';

const TODAY = new Date();
const IN_90_DAYS = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 90);

function ControlledDemo() {
  const [value, setValue] = useState<Date | null>(TODAY);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <DatePicker value={value} onChange={setValue} aria-label="Controlled date" />
      <code>{value ? value.toISOString().slice(0, 10) : 'null'}</code>
    </div>
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
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
    >
      <DatePicker name="dob" defaultValue={TODAY} aria-label="Date of birth" />
      <button type="submit">Submit</button>
      {submitted !== null && <code>dob = {submitted || '(empty)'}</code>}
    </form>
  );
}

export function DatePickerDemo() {
  return (
    <DemoLayout
      name="DatePicker"
      componentName="DatePicker"
      description="Single-date input with a popover month grid. Locale-aware typed parsing, min/max constraints, isDateDisabled predicate, clear button, and a hidden form mirror for native posts."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="DatePicker.tsx"
      scssFilename="DatePicker.module.scss"
    >
      <Example
        title="Uncontrolled"
        description="No `value` / `onChange` — the picker owns state. Type a date, click in the grid, or use the clear button."
        code={`<DatePicker defaultValue={new Date()} />`}
      >
        <DatePicker defaultValue={TODAY} aria-label="Uncontrolled date" />
      </Example>

      <Example
        title="Controlled"
        description="Consumer owns the value; useful when the form layer needs to validate or react to changes."
        code={`const [value, setValue] = useState<Date | null>(new Date());
<DatePicker value={value} onChange={setValue} />`}
      >
        <ControlledDemo />
      </Example>

      <Example
        title="Min / max"
        description="`min` and `max` disable out-of-range cells in the grid AND reject typed input outside the window."
        code={`<DatePicker
  min={new Date()}
  max={new Date(today + 90 days)}
/>`}
      >
        <DatePicker
          defaultValue={TODAY}
          min={TODAY}
          max={IN_90_DAYS}
          aria-label="Date within 90 days"
        />
      </Example>

      <Example
        title="Disable weekends"
        description="`isDateDisabled` runs per cell and per typed-input parse. Disabled cells are non-clickable and arrow-key navigation skips them."
        code={`<DatePicker
  isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
/>`}
      >
        <DatePicker
          aria-label="Weekday only"
          isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
        />
      </Example>

      <Example title="Disabled" code={`<DatePicker disabled defaultValue={new Date()} />`}>
        <DatePicker disabled defaultValue={TODAY} aria-label="Disabled date" />
      </Example>

      <Example
        title="Invalid"
        description="Pair with a visible error message + aria-describedby."
        code={`<DatePicker invalid aria-describedby="dob-error" />
<p id="dob-error">Date is required.</p>`}
      >
        <div>
          <DatePicker invalid aria-label="Date of birth" aria-describedby="dob-error" />
          <p id="dob-error" style={{ color: 'var(--color-danger)', marginTop: '0.25rem' }}>
            Date is required.
          </p>
        </div>
      </Example>

      <Example
        title="Form integration"
        description="When `name` is set, the picker renders a hidden mirror `<input>` with the ISO date so native `<form>` submission works."
        code={`<form action="/api/dates">
  <DatePicker name="dob" defaultValue={new Date()} />
  <button type="submit">Submit</button>
</form>`}
      >
        <FormDemo />
      </Example>

      <Example
        title="ru-RU locale"
        description="Input parses and formats as DD.MM.YYYY when locale is ru-RU. ISO YYYY-MM-DD is always accepted as a paste fallback."
        code={`<DatePicker defaultValue={new Date()} locale="ru-RU" />`}
      >
        <DatePicker defaultValue={TODAY} locale="ru-RU" aria-label="Дата" />
      </Example>
    </DemoLayout>
  );
}
