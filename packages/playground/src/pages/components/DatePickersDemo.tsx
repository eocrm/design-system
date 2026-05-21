import { useSearchParams } from 'react-router-dom';
import { Stack, Tabs } from '@eocrm/design-system';
import { DatePickerDemoPanel } from './DatePickerDemo';
import { DateRangePickerDemoPanel } from './DateRangePickerDemo';
import { InlineDatePickerDemoPanel } from './InlineDatePickerDemo';
import { InlineDateRangePickerDemoPanel } from './InlineDateRangePickerDemo';
import styles from './DemoLayout.module.scss';

type Variant = 'datepicker' | 'daterangepicker' | 'inline-datepicker' | 'inline-daterangepicker';

const VARIANTS: Variant[] = [
  'datepicker',
  'daterangepicker',
  'inline-datepicker',
  'inline-daterangepicker',
];

function isVariant(v: string | null): v is Variant {
  return v !== null && (VARIANTS as string[]).includes(v);
}

export function DatePickersDemo() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('variant');
  const active: Variant = isVariant(raw) ? raw : 'datepicker';

  return (
    <Stack gap="lg">
      <header className={styles.header}>
        <span className={styles.eyebrow}>Component</span>
        <h1 className={styles.title}>Date pickers</h1>
        <p className={styles.description}>
          Single date or range × popover field or inline calendar — four variants of the same
          month-grid surface. Pick the one that matches the page's interaction need.
        </p>
      </header>

      <Tabs
        items={[
          { id: 'datepicker', label: 'DatePicker' },
          { id: 'daterangepicker', label: 'DateRangePicker' },
          { id: 'inline-datepicker', label: 'InlineDatePicker' },
          { id: 'inline-daterangepicker', label: 'InlineDateRangePicker' },
        ]}
        activeId={active}
        onChange={(id) => setParams({ variant: id }, { replace: true })}
      />

      {active === 'datepicker' && <DatePickerDemoPanel />}
      {active === 'daterangepicker' && <DateRangePickerDemoPanel />}
      {active === 'inline-datepicker' && <InlineDatePickerDemoPanel />}
      {active === 'inline-daterangepicker' && <InlineDateRangePickerDemoPanel />}
    </Stack>
  );
}
