import type { ReactNode } from 'react';
import { Building2, CheckSquare, User } from 'lucide-react';
import { Cluster, EntityChip, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import { getComponentFiles } from '../../lib/componentFiles';

// Looks like react-router's <Link> — accepts `to`, renders an <a>. Stands
// in for a real router Link to show `as` accepts ANY component, not just
// react-router's (see <LinkDemo> for the real-RouterLink integration).
function FakeRouterLink({ to, children, ...rest }: { to: string; children?: ReactNode }) {
  return (
    <a href={to} {...rest}>
      {children}
    </a>
  );
}

export function EntityChipDemo() {
  return (
    <DemoLayout
      name="EntityChip"
      componentName="EntityChip"
      description="Inline chip that is always a link to its entity — icon + muted prefix + name + colored status, all inside a single inline root safe to drop into a sentence. Pass href (renders <a>) or `as` (router link); the bare <span> form is for rare non-navigable contexts."
      files={getComponentFiles('EntityChip')}
    >
      <Example
        title="Inline in flowing text"
        description="The chip is inline-safe — drop it mid-sentence inside a <Text> paragraph exactly like a name or a link."
        code={`import { Building2, CheckSquare, User } from 'lucide-react';
import { EntityChip, Text } from '@eocrm/design-system';

export function Demo() {
  return (
    <Text>
      Reassigned{' '}
      <EntityChip href="/contacts/12" icon={<User size={14} />} label="Priya Shah" /> to{' '}
      <EntityChip
        href="/deals/204"
        icon={<Building2 size={14} />}
        prefix="ACME-204"
        label="Acme Corp"
        status={{ label: 'Open', category: 'open' }}
      />
      , blocked on{' '}
      <EntityChip
        href="/tasks/5"
        icon={<CheckSquare size={14} />}
        prefix="ENG-5"
        label="Fix login bug"
        status={{ label: 'In progress', category: 'in_progress' }}
      />
      .
    </Text>
  );
}`}
      >
        <Text>
          Reassigned <EntityChip href="/contacts/12" icon={<User size={14} />} label="Priya Shah" />{' '}
          to{' '}
          <EntityChip
            href="/deals/204"
            icon={<Building2 size={14} />}
            prefix="ACME-204"
            label="Acme Corp"
            status={{ label: 'Open', category: 'open' }}
          />
          , blocked on{' '}
          <EntityChip
            href="/tasks/5"
            icon={<CheckSquare size={14} />}
            prefix="ENG-5"
            label="Fix login bug"
            status={{ label: 'In progress', category: 'in_progress' }}
          />
          .
        </Text>
      </Example>

      <Example
        title="Status: categories vs custom color"
        description="`status.category` (to_do/in_progress/open/done/won/lost) resolves a default palette color. `status.color` is an explicit PaletteColor override — it wins over category, same contract as StatusMenu."
        code={`import { EntityChip } from '@eocrm/design-system';

export function Demo() {
  return (
    <>
      <EntityChip prefix="ENG-5" label="Fix login bug" status={{ label: 'To do', category: 'to_do' }} />
      <EntityChip prefix="ENG-6" label="Add pagination" status={{ label: 'In progress', category: 'in_progress' }} />
      <EntityChip prefix="ACME-1" label="Acme Corp" status={{ label: 'Won', category: 'won' }} />
      <EntityChip prefix="ACME-2" label="Globex" status={{ label: 'Lost', category: 'lost' }} />
      {/* color overrides the category's default green */}
      <EntityChip prefix="ACME-3" label="Initech" status={{ label: 'At risk', category: 'won', color: 'amber' }} />
    </>
  );
}`}
      >
        <InputExample width="auto">
          <Cluster gap="sm">
            <EntityChip
              prefix="ENG-5"
              label="Fix login bug"
              status={{ label: 'To do', category: 'to_do' }}
            />
            <EntityChip
              prefix="ENG-6"
              label="Add pagination"
              status={{ label: 'In progress', category: 'in_progress' }}
            />
            <EntityChip
              prefix="ACME-1"
              label="Acme Corp"
              status={{ label: 'Won', category: 'won' }}
            />
            <EntityChip
              prefix="ACME-2"
              label="Globex"
              status={{ label: 'Lost', category: 'lost' }}
            />
            <EntityChip
              prefix="ACME-3"
              label="Initech"
              status={{ label: 'At risk', category: 'won', color: 'amber' }}
            />
          </Cluster>
        </InputExample>
      </Example>

      <Example
        title="Chip fill: default accent (mention-matched) vs `color` override"
        description="The chip fills with the accent tokens by default — the same `--color-accent-bg-subtle` / `--color-accent` pair RichText uses for @mentions, so a chip and a rendered mention read as one visual language. `color` (a PaletteColor) overrides the fill, independent of any `status` — same inline-injection contract as `Badge color`."
        code={`import { EntityChip } from '@eocrm/design-system';

export function Demo() {
  return (
    <>
      <EntityChip href="/contacts/12" label="Priya Shah" />
      <EntityChip href="/deals/9" label="Acme Corp" color="violet" />
      <EntityChip href="/deals/14" label="Globex" color="amber" />
      <EntityChip
        href="/tasks/5"
        prefix="ENG-5"
        label="Fix login bug"
        color="teal"
        status={{ label: 'In progress', category: 'in_progress' }}
      />
    </>
  );
}`}
      >
        <InputExample width="auto">
          <Cluster gap="sm">
            <EntityChip href="/contacts/12" label="Priya Shah" />
            <EntityChip href="/deals/9" label="Acme Corp" color="violet" />
            <EntityChip href="/deals/14" label="Globex" color="amber" />
            <EntityChip
              href="/tasks/5"
              prefix="ENG-5"
              label="Fix login bug"
              color="teal"
              status={{ label: 'In progress', category: 'in_progress' }}
            />
          </Cluster>
        </InputExample>
      </Example>

      <Example
        title="Polymorphic: link, custom `as`, button"
        description="No `as` + href renders <a>. `as={RouterLink-like}` forwards router props (to, replace, ...) with full type inference. `as` set to 'button' + onClick makes the chip an action."
        code={`import { EntityChip } from '@eocrm/design-system';

// Stands in for react-router's <Link> — \`as\` accepts any component.
function FakeRouterLink({ to, children, ...rest }) {
  return <a href={to} {...rest}>{children}</a>;
}

export function Demo() {
  return (
    <>
      <EntityChip href="/contacts/1" label="Priya Shah" />
      <EntityChip as={FakeRouterLink} to="/tasks/5" prefix="ENG-5" label="Fix login bug" />
      <EntityChip as="button" label="Assign to me" onClick={() => alert('Assigned')} />
    </>
  );
}`}
      >
        <InputExample width="auto">
          <Cluster gap="sm">
            <EntityChip href="/contacts/1" label="Priya Shah" />
            <EntityChip as={FakeRouterLink} to="/tasks/5" prefix="ENG-5" label="Fix login bug" />
            <EntityChip as="button" label="Assign to me" onClick={() => alert('Assigned')} />
          </Cluster>
        </InputExample>
      </Example>

      <Example
        title="Loading and unavailable"
        description="`loading` swaps the body for an aria-busy ellipsis; `unavailable` mutes the chip. Both are purely visual when the chip has a link target — it stays a live, keyboard-reachable link. Only a target-less unavailable chip goes non-interactive (aria-disabled). `unavailable` also renders a localized state word visually hidden inside the chip, so its accessible name reads “Deleted contact (unavailable)” — colour alone cannot carry the state, and aria-disabled on a role-less span is not exposed by screen readers."
        code={`import { EntityChip } from '@eocrm/design-system';

export function Demo() {
  return (
    <>
      <EntityChip href="/contacts/7" label="Contact" loading />
      <EntityChip href="/contacts/9" label="Deleted contact" unavailable />
      {/* no target — rare non-navigable case, aria-disabled */}
      <EntityChip label="Deleted contact" unavailable />
    </>
  );
}`}
      >
        <InputExample width="auto">
          <Cluster gap="sm">
            <EntityChip href="/contacts/7" label="Contact" loading />
            <EntityChip href="/contacts/9" label="Deleted contact" unavailable />
            <EntityChip label="Deleted contact" unavailable />
          </Cluster>
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
