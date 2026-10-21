import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Button,
  OptionsPicker,
  Stack,
  Switch,
  type OptionsPickerOption,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import { getComponentFiles } from '../../lib/componentFiles';

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
    color: 'blue' as const,
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
    color: 'emerald' as const,
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
    color: 'fuchsia' as const,
    hint: 'invitation.*',
    options: [
      { value: 'invitation.sent', label: 'sent' },
      { value: 'invitation.accepted', label: 'accepted' },
      { value: 'invitation.expired', label: 'expired' },
    ],
  },
];

// Fake server: 1000 generated members, 400ms latency, abort-aware.
const MEMBERS: OptionsPickerOption[] = Array.from({ length: 1000 }, (_, i) => ({
  value: `m${i + 1}`,
  label: `Member ${String(i + 1).padStart(4, '0')}`,
}));

function fetchMembers(
  query: string,
  signal: AbortSignal,
  fail: boolean,
): Promise<OptionsPickerOption[]> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      if (fail) return reject(new Error('Server unavailable'));
      const q = query.trim().toLowerCase();
      resolve(MEMBERS.filter((m) => m.label.toLowerCase().includes(q)).slice(0, 20));
    }, 400);
    if (signal.aborted) return abort();
    signal.addEventListener('abort', abort, { once: true });
  });
}

export function OptionsPickerDemo() {
  const [asyncSelected, setAsyncSelected] = useState<string[]>([]);
  const [asyncOptions, setAsyncOptions] = useState<OptionsPickerOption[]>([]);
  const [failNext, setFailNext] = useState(false);
  const failRef = useRef(false);
  failRef.current = failNext;
  // One-shot: the switch turns itself off after one failed request, so Retry then succeeds.
  const takeFail = () => {
    const fail = failRef.current;
    if (fail) {
      failRef.current = false;
      setFailNext(false);
    }
    return fail;
  };

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
      files={getComponentFiles('OptionsPicker')}
    >
      <Example
        title="Multi-select, flat options"
        description="Default mode. Draft state buffered until Apply."
        code={`import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button, OptionsPicker } from '@eocrm/design-system';

const flatOptions = [
  { value: 'lead', label: 'Lead' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

export function Demo() {
  const [selected, setSelected] = useState<string[]>(['lead']);

  return (
    <OptionsPicker selected={selected} onApply={setSelected}>
      <OptionsPicker.Trigger>
        <Button variant="secondary">
          Stage ({selected.length}) <ChevronDown size={14} />
        </Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter stage" options={flatOptions} />
    </OptionsPicker>
  );
}`}
      >
        <InputExample width="auto">
          <OptionsPicker selected={multiFlat} onApply={setMultiFlat}>
            <OptionsPicker.Trigger>
              <Button variant="secondary">
                Stage ({multiFlat.length}) <ChevronDown size={14} />
              </Button>
            </OptionsPicker.Trigger>
            <OptionsPicker.Content label="Filter stage" options={flatOptions} />
          </OptionsPicker>
        </InputExample>
      </Example>

      <Example
        title="Multi-select, grouped with namespace hints"
        description="Each group has a colored dot, label, and a right-side hint label (e.g., auth.*). Clicking the group header toggles all options in the namespace."
        code={`import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button, OptionsPicker } from '@eocrm/design-system';

const groupedOptions = [
  {
    id: 'auth',
    label: 'Authentication',
    color: 'blue' as const,
    hint: 'auth.*',
    options: [
      { value: 'auth.login_succeeded', label: 'login_succeeded' },
      { value: 'auth.login_failed', label: 'login_failed' },
      { value: 'auth.logout', label: 'logout' },
    ],
  },
  {
    id: 'role',
    label: 'Roles',
    color: 'emerald' as const,
    hint: 'role.*',
    options: [
      { value: 'role.assigned', label: 'assigned' },
      { value: 'role.updated', label: 'updated' },
      { value: 'role.revoked', label: 'revoked' },
    ],
  },
];

export function Demo() {
  const [selected, setSelected] = useState<string[]>([
    'auth.login_succeeded',
    'role.assigned',
  ]);

  return (
    <OptionsPicker selected={selected} onApply={setSelected}>
      <OptionsPicker.Trigger>
        <Button variant="secondary">
          Events ({selected.length}) <ChevronDown size={14} />
        </Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter events" groups={groupedOptions} />
    </OptionsPicker>
  );
}`}
      >
        <InputExample width="auto">
          <OptionsPicker selected={multiGrouped} onApply={setMultiGrouped}>
            <OptionsPicker.Trigger>
              <Button variant="secondary">
                Events ({multiGrouped.length}) <ChevronDown size={14} />
              </Button>
            </OptionsPicker.Trigger>
            <OptionsPicker.Content label="Filter events" groups={groupedOptions} />
          </OptionsPicker>
        </InputExample>
      </Example>

      <Example
        title="Single-select (auto-commits on click)"
        description="No Apply/Cancel footer. Each click fires onApply(value) and closes the panel. Use for single-choice filter UX (Tenant, status, etc.)."
        code={`import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button, OptionsPicker } from '@eocrm/design-system';

const flatOptions = [
  { value: 'lead', label: 'Lead' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

export function Demo() {
  const [value, setValue] = useState<string | null>('qualified');

  return (
    <OptionsPicker mode="single" selected={value} onApply={setValue}>
      <OptionsPicker.Trigger>
        <Button variant="secondary">
          Stage: {value ?? '—'} <ChevronDown size={14} />
        </Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter stage" options={flatOptions} />
    </OptionsPicker>
  );
}`}
      >
        <InputExample width="auto">
          <OptionsPicker mode="single" selected={single} onApply={setSingle}>
            <OptionsPicker.Trigger>
              <Button variant="secondary">
                Stage: {single ?? '—'} <ChevronDown size={14} />
              </Button>
            </OptionsPicker.Trigger>
            <OptionsPicker.Content label="Filter stage" options={flatOptions} />
          </OptionsPicker>
        </InputExample>
      </Example>

      <Example
        title="Async members (server search)"
        description="loadOptions(query, signal) fetches 20 of 1000 members, 400ms latency, debounced. The first fetch happens on open with an empty query. Selected rows stay pinned above the results. Switch on 'Fail next request' (one-shot, it turns itself off), then open the picker or type to see the error row; Retry then succeeds. The trigger text is labelled from onApply's second argument."
        code={`import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button, OptionsPicker, type OptionsPickerOption } from '@eocrm/design-system';

// fetchMembers: your API call; pass signal to fetch() so stale requests are cancelled
export function Demo() {
  const [ids, setIds] = useState<string[]>([]);
  const [options, setOptions] = useState<OptionsPickerOption[]>([]);

  return (
    <OptionsPicker
      selected={ids}
      onApply={(next, nextOptions) => {
        setIds(next);
        setOptions(nextOptions);
      }}
    >
      <OptionsPicker.Trigger>
        <Button variant="secondary">
          {options.length ? options.map((o) => o.label).join(', ') : 'Members'}
          <ChevronDown size={14} />
        </Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content
        label="Filter members"
        loadOptions={(query, signal) => fetchMembers(query, signal)}
        selectedOptions={options} // labels for values restored from URL/state
      />
    </OptionsPicker>
  );
}`}
      >
        <InputExample width="auto">
          <Stack gap="sm">
            <OptionsPicker
              selected={asyncSelected}
              onApply={(next, nextOptions) => {
                setAsyncSelected(next);
                setAsyncOptions(nextOptions);
              }}
            >
              <OptionsPicker.Trigger>
                <Button variant="secondary">
                  {asyncOptions.length
                    ? asyncOptions.length > 2
                      ? `${asyncOptions
                          .slice(0, 2)
                          .map((o) => o.label)
                          .join(', ')} +${asyncOptions.length - 2}`
                      : asyncOptions.map((o) => o.label).join(', ')
                    : 'Members'}{' '}
                  <ChevronDown size={14} />
                </Button>
              </OptionsPicker.Trigger>
              <OptionsPicker.Content
                label="Filter members"
                loadOptions={(query, signal) => fetchMembers(query, signal, takeFail())}
                selectedOptions={asyncOptions}
              />
            </OptionsPicker>
            <Switch checked={failNext} onChange={setFailNext}>
              Fail next request
            </Switch>
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Controlled open state"
        description="Pass open + onOpenChange to drive the panel externally."
        code={`import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button, OptionsPicker, Stack } from '@eocrm/design-system';

const flatOptions = [
  { value: 'lead', label: 'Lead' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

export function Demo() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <Stack gap="sm">
      <OptionsPicker
        open={open}
        onOpenChange={setOpen}
        selected={selected}
        onApply={setSelected}
      >
        <OptionsPicker.Trigger>
          <Button variant="secondary">
            Filter ({selected.length}) <ChevronDown size={14} />
          </Button>
        </OptionsPicker.Trigger>
        <OptionsPicker.Content label="Filter stage" options={flatOptions} />
      </OptionsPicker>
      <Button variant="ghost" size="sm" onClick={() => setOpen((o) => !o)}>
        Toggle externally (currently {open ? 'open' : 'closed'})
      </Button>
    </Stack>
  );
}`}
      >
        <InputExample width="auto">
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
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
