import type { ReactNode } from 'react';
import { Building2, CheckSquare, User } from 'lucide-react';
import { Cluster, EntityChip, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import { getComponentFiles } from '../../lib/componentFiles';

// Looks like react-router-dom's <Link> — accepts `to`, renders an <a>. Stands
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
      description="Inline entity-link chip — icon + muted prefix + name + colored status, all inside a single inline root safe to drop into a sentence. Renders <a>/<span>/whatever `as` is passed."
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
      <EntityChip icon={<User size={14} />} label="Priya Shah" /> to{' '}
      <EntityChip
        icon={<Building2 size={14} />}
        prefix="ACME-204"
        label="Acme Corp"
        status={{ label: 'Open', category: 'open' }}
      />
      , blocked on{' '}
      <EntityChip
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
          Reassigned <EntityChip icon={<User size={14} />} label="Priya Shah" /> to{' '}
          <EntityChip
            icon={<Building2 size={14} />}
            prefix="ACME-204"
            label="Acme Corp"
            status={{ label: 'Open', category: 'open' }}
          />
          , blocked on{' '}
          <EntityChip
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
        title="Polymorphic: link, custom `as`, button"
        description="No `as` + href renders <a>. `as={RouterLink-like}` forwards router props (to, replace, ...) with full type inference. `as` set to 'button' + onClick makes the chip an action."
        code={`import { EntityChip } from '@eocrm/design-system';

// Stands in for react-router-dom's <Link> — \`as\` accepts any component.
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
        description="`loading` swaps the body for an aria-busy ellipsis. `unavailable` mutes the chip and forces a non-interactive <span> (aria-disabled) — even with an href."
        code={`import { EntityChip } from '@eocrm/design-system';

export function Demo() {
  return (
    <>
      <EntityChip label="Contact" loading />
      <EntityChip href="/contacts/9" label="Deleted contact" unavailable />
    </>
  );
}`}
      >
        <InputExample width="auto">
          <Cluster gap="sm">
            <EntityChip label="Contact" loading />
            <EntityChip href="/contacts/9" label="Deleted contact" unavailable />
          </Cluster>
        </InputExample>
      </Example>
    </DemoLayout>
  );
}
