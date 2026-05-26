import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button, OptionsPicker, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/OptionsPicker/OptionsPicker.tsx?raw';
import scssSource from '@lib-source/components/OptionsPicker/OptionsPicker.module.scss?raw';

const flatOptions = [
  { value: 'lead', label: 'Lead' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const groupedOptions = [
  {
    id: 'auth',
    label: 'Authentication',
    tone: 'success' as const,
    hint: 'auth.*',
    options: [
      { value: 'auth.login_succeeded', label: 'login_succeeded' },
      { value: 'auth.login_failed', label: 'login_failed' },
      { value: 'auth.logout', label: 'logout' },
      { value: 'auth.mfa_enabled', label: 'mfa_enabled' },
    ],
  },
  {
    id: 'role',
    label: 'Roles',
    tone: 'info' as const,
    hint: 'role.*',
    options: [
      { value: 'role.assigned', label: 'assigned' },
      { value: 'role.updated', label: 'updated' },
      { value: 'role.revoked', label: 'revoked' },
    ],
  },
  {
    id: 'invitation',
    label: 'Invitations',
    tone: 'warning' as const,
    hint: 'invitation.*',
    options: [
      { value: 'invitation.sent', label: 'sent' },
      { value: 'invitation.accepted', label: 'accepted' },
      { value: 'invitation.expired', label: 'expired' },
    ],
  },
];

export function OptionsPickerDemo() {
  const [multiFlat, setMultiFlat] = useState<string[]>(['lead']);
  const [multiGrouped, setMultiGrouped] = useState<string[]>([
    'auth.login_succeeded',
    'role.assigned',
  ]);
  const [single, setSingle] = useState<string | null>('qualified');
  const [controlledOpen, setControlledOpen] = useState(false);
  const [controlledValue, setControlledValue] = useState<string[]>([]);

  return (
    <DemoLayout
      name="OptionsPicker"
      componentName="OptionsPicker"
      description="Filter-picker UX: popover with search, optional grouping, multi/single select, draft-then-Apply commit."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="OptionsPicker.tsx"
      scssFilename="OptionsPicker.module.scss"
    >
      <Example
        title="Multi-select, flat options"
        description="Default mode. Draft state buffered until Apply."
        code={`<OptionsPicker selected={selected} onApply={setSelected}>
  <OptionsPicker.Trigger>
    <Button variant="secondary">Stage <ChevronDown size={14}/></Button>
  </OptionsPicker.Trigger>
  <OptionsPicker.Content label="Filter stage" options={flatOptions} />
</OptionsPicker>`}
      >
        <Stack gap="sm">
          <OptionsPicker selected={multiFlat} onApply={setMultiFlat}>
            <OptionsPicker.Trigger>
              <Button variant="secondary">
                Stage ({multiFlat.length}) <ChevronDown size={14} />
              </Button>
            </OptionsPicker.Trigger>
            <OptionsPicker.Content label="Filter stage" options={flatOptions} />
          </OptionsPicker>
        </Stack>
      </Example>

      <Example
        title="Multi-select, grouped with namespace hints"
        description="Each group has a colored dot, label, and a right-side hint label (e.g., auth.*). Clicking the group header toggles all options in the namespace."
        code={`<OptionsPicker selected={selected} onApply={setSelected}>
  <OptionsPicker.Trigger>
    <Button variant="secondary">Events <ChevronDown size={14}/></Button>
  </OptionsPicker.Trigger>
  <OptionsPicker.Content label="Filter events" groups={groupedOptions} />
</OptionsPicker>`}
      >
        <OptionsPicker selected={multiGrouped} onApply={setMultiGrouped}>
          <OptionsPicker.Trigger>
            <Button variant="secondary">
              Events ({multiGrouped.length}) <ChevronDown size={14} />
            </Button>
          </OptionsPicker.Trigger>
          <OptionsPicker.Content label="Filter events" groups={groupedOptions} />
        </OptionsPicker>
      </Example>

      <Example
        title="Single-select (auto-commits on click)"
        description="No Apply/Cancel footer. Each click fires onApply(value) and closes the panel. Use for single-choice filter UX (Tenant, status, etc.)."
        code={`<OptionsPicker mode="single" selected={value} onApply={setValue}>
  <OptionsPicker.Trigger>
    <Button variant="secondary">Stage <ChevronDown size={14}/></Button>
  </OptionsPicker.Trigger>
  <OptionsPicker.Content label="Filter stage" options={flatOptions} />
</OptionsPicker>`}
      >
        <OptionsPicker mode="single" selected={single} onApply={setSingle}>
          <OptionsPicker.Trigger>
            <Button variant="secondary">
              Stage: {single ?? '—'} <ChevronDown size={14} />
            </Button>
          </OptionsPicker.Trigger>
          <OptionsPicker.Content label="Filter stage" options={flatOptions} />
        </OptionsPicker>
      </Example>

      <Example
        title="Controlled open state"
        description="Pass open + onOpenChange to drive the panel externally."
        code={`<OptionsPicker
  open={open}
  onOpenChange={setOpen}
  selected={selected}
  onApply={setSelected}
>
  <OptionsPicker.Trigger><Button>Filter</Button></OptionsPicker.Trigger>
  <OptionsPicker.Content label="Filter" options={flatOptions} />
</OptionsPicker>`}
      >
        <Stack gap="sm">
          <OptionsPicker
            open={controlledOpen}
            onOpenChange={setControlledOpen}
            selected={controlledValue}
            onApply={setControlledValue}
          >
            <OptionsPicker.Trigger>
              <Button variant="secondary">
                Filter ({controlledValue.length}) <ChevronDown size={14} />
              </Button>
            </OptionsPicker.Trigger>
            <OptionsPicker.Content label="Filter stage" options={flatOptions} />
          </OptionsPicker>
          <Button variant="ghost" size="sm" onClick={() => setControlledOpen((o) => !o)}>
            Toggle externally (currently {controlledOpen ? 'open' : 'closed'})
          </Button>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
