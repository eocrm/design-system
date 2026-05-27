import { useMemo, useState } from 'react';
import { Button, Checkbox, Stack, Text, type PaletteColor } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import { getComponentFiles } from '../../lib/componentFiles';

const TEAM = ['Alex', 'Priya', 'Tom', 'Sara', 'Jaden'];

const TEAM_COLORS: { team: string; color: PaletteColor }[] = [
  { team: 'Marketing', color: 'violet' },
  { team: 'Engineering', color: 'teal' },
  { team: 'Sales', color: 'amber' },
  { team: 'Support', color: 'rose' },
  { team: 'Design', color: 'fuchsia' },
  { team: 'Operations', color: 'slate' },
];

function ColorDemo() {
  const [teams, setTeams] = useState<Record<string, boolean>>({
    Marketing: true,
    Engineering: true,
    Sales: false,
    Support: false,
    Design: true,
    Operations: false,
  });
  return (
    <Stack gap="sm" align="start">
      {TEAM_COLORS.map(({ team, color }) => (
        <Checkbox
          key={team}
          color={color}
          label={team}
          checked={teams[team] ?? false}
          onChange={(next) => setTeams((prev) => ({ ...prev, [team]: next }))}
        />
      ))}
      <Text size="sm" tone="muted">
        Selected:{' '}
        {Object.entries(teams)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(', ') || 'none'}
      </Text>
    </Stack>
  );
}

function ControlledDemo() {
  const [agreed, setAgreed] = useState(false);
  return (
    <Stack gap="xs">
      <Checkbox checked={agreed} onChange={setAgreed} label="I agree to the terms" />
      <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
        agreed = {String(agreed)}
      </code>
    </Stack>
  );
}

function IndeterminateDemo() {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedCount = useMemo(() => Object.values(selected).filter(Boolean).length, [selected]);
  const allChecked = selectedCount === TEAM.length;
  const someChecked = selectedCount > 0 && !allChecked;

  function toggleAll(next: boolean) {
    const map: Record<string, boolean> = {};
    if (next) for (const name of TEAM) map[name] = true;
    setSelected(map);
  }

  function toggleOne(name: string, next: boolean) {
    setSelected((prev) => ({ ...prev, [name]: next }));
  }

  return (
    <Stack gap="sm">
      <Checkbox
        checked={allChecked}
        indeterminate={someChecked}
        onChange={toggleAll}
        label={
          <strong>
            Select all ({selectedCount} of {TEAM.length})
          </strong>
        }
      />
      <Stack gap="xs" style={{ paddingLeft: 'var(--space-5)' }}>
        {TEAM.map((name) => (
          <Checkbox
            key={name}
            checked={!!selected[name]}
            onChange={(next) => toggleOne(name, next)}
            label={name}
          />
        ))}
      </Stack>
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
        const values = fd.getAll('notify');
        setSubmitted(values.length ? values.join(', ') : '(none)');
      }}
    >
      <Stack gap="xs">
        <Checkbox name="notify" value="email" defaultChecked label="Email" />
        <Checkbox name="notify" value="sms" label="SMS" />
        <Checkbox name="notify" value="push" label="Push" />
        <Button type="submit" size="sm">
          Submit
        </Button>
        {submitted !== null && (
          <code style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-fg-muted)' }}>
            notify = {submitted}
          </code>
        )}
      </Stack>
    </form>
  );
}

export function CheckboxDemo() {
  return (
    <DemoLayout
      name="Checkbox"
      componentName="Checkbox"
      description="Native `<input type='checkbox'>` visually hidden + custom-painted box. Supports controlled / uncontrolled state, indeterminate (mixed) state, sizes, label, disabled, invalid, and full native form integration."
      files={getComponentFiles('Checkbox')}
    >
      <Example
        title="Default"
        description="Uncontrolled, with a label. The whole label is the click target."
        code={`<Checkbox label="I agree to the terms" />`}
      >
        <InputExample>
          <Checkbox label="I agree to the terms" />
        </InputExample>
      </Example>

      <Example
        title="Sizes"
        description="Three sizes — sm (14px box / font-size-sm) / md (16px / font-size-md, default) / lg (20px / font-size-lg). Same scale as <Input>."
        code={`<Checkbox size="sm" label="Small" />
<Checkbox size="md" label="Medium" />
<Checkbox size="lg" label="Large" />`}
      >
        <InputExample>
          <Stack gap="sm">
            <Checkbox size="sm" label="Small" defaultChecked />
            <Checkbox size="md" label="Medium" defaultChecked />
            <Checkbox size="lg" label="Large" defaultChecked />
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Controlled"
        description="Provide `checked` + `onChange`. The handler receives `(nextChecked, event)`."
        code={`const [agreed, setAgreed] = useState(false);
<Checkbox checked={agreed} onChange={setAgreed} label="I agree" />`}
      >
        <InputExample>
          <ControlledDemo />
        </InputExample>
      </Example>

      <Example
        title="Indeterminate (select-all pattern)"
        description="When some-but-not-all child checkboxes are selected, the parent renders an indeterminate dash. Clicking the parent in indeterminate state toggles to checked → consumer responds by selecting all."
        code={`<Checkbox
  checked={allChecked}
  indeterminate={someChecked}
  onChange={(next) => toggleAll(next)}
  label="Select all"
/>`}
      >
        <InputExample>
          <IndeterminateDemo />
        </InputExample>
      </Example>

      <Example
        title="Disabled"
        description="The native `disabled` attribute is forwarded — click is blocked and the box mutes."
        code={`<Checkbox disabled defaultChecked label="Locked (checked)" />
<Checkbox disabled label="Locked (unchecked)" />`}
      >
        <InputExample>
          <Stack gap="xs">
            <Checkbox disabled defaultChecked label="Locked (checked)" />
            <Checkbox disabled label="Locked (unchecked)" />
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Invalid"
        description="`invalid` adds the danger border + sets `aria-invalid='true'`. Pair with a visible error message and `aria-describedby`."
        code={`<Checkbox invalid required aria-describedby="terms-error" label="Accept terms" />
<p id="terms-error">You must accept to continue.</p>`}
      >
        <InputExample>
          <Stack gap="xs">
            <Checkbox invalid required aria-describedby="terms-error" label="Accept terms" />
            <p
              id="terms-error"
              style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)' }}
            >
              You must accept to continue.
            </p>
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="No label (icon-only)"
        description="Omit `label` for icon-only checkboxes (e.g., a DataTable row selector). Always pair with `aria-label`."
        code={`<Checkbox aria-label="Select row" />`}
      >
        <InputExample>
          <Checkbox aria-label="Select row" />
        </InputExample>
      </Example>

      <Example
        title='Color tagging (color="palette-name")'
        description="Optional `color` prop tints the checked / indeterminate fill with a palette color. Use to visually group checkboxes by team / category / status. Focus ring and hover stay accent-colored."
        code={`<Checkbox color="violet" label="Marketing" />
<Checkbox color="teal" label="Engineering" />
<Checkbox color="amber" label="Sales" />`}
      >
        <InputExample width={280}>
          <ColorDemo />
        </InputExample>
      </Example>

      <Example
        title="Form integration"
        description="`name` + `value` round-trip through native FormData. Same-`name` checkboxes group via `FormData.getAll(name)`."
        code={`<form>
  <Checkbox name="notify" value="email" defaultChecked label="Email" />
  <Checkbox name="notify" value="sms" label="SMS" />
  <Checkbox name="notify" value="push" label="Push" />
  <button type="submit">Submit</button>
</form>

// On submit: const values = new FormData(form).getAll('notify');`}
      >
        <InputExample>
          <FormDemo />
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
