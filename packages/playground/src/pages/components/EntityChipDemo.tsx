import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Bug, Building2, CheckSquare, Equal, User } from 'lucide-react';
import { Badge, Cluster, EntityChip, Stack, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import { ResizablePreview } from './ResizablePreview';
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
        description="`status.category` (to_do/in_progress/open/done/won/lost) resolves a default palette color. `status.color` is an explicit PaletteColor override — it wins over category, same contract as PillMenu."
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
        description="`loading` swaps the body for an aria-busy ellipsis and renders a localized state word visually hidden, so a linked chip's accessible name reads “Contact (loading)” — aria-busy is valid here and browsers expose it, but no mainstream screen reader reliably conveys busy on a non-live element, and the ellipsis is aria-hidden — the label reached the user, the state did not. Note the accessible name changes when loading resolves; override the word to '' at your top-level provider if you'd rather own an aria-live region. `unavailable` mutes the chip. Both are purely visual when the chip has a link target — it stays a live, keyboard-reachable link. Only a target-less unavailable chip goes non-interactive (aria-disabled). `unavailable` also renders a localized state word visually hidden inside the chip, so a linked chip's accessible name reads “Deleted contact (unavailable)” (a target-less chip is role=generic and has no name, so the word is announced as content instead). Colour alone cannot carry the state, and aria-disabled does not either — browsers expose it, but it carries no meaning on a non-widget role such as generic, so no assistive tech conveys it."
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

      <Example
        title="List rows: `truncate` + `trailing`"
        description="`truncate` makes the chip a single line capped at its container: only the label ellipsizes, while icon, prefix, status and `trailing` keep their size. `trailing` puts adornments (a priority icon, a Badge) inside the chip's tint — non-interactive content only, and its text joins the link's accessible name, so give an icon a short aria-label (or aria-hidden if decorative). The full label stays in the accessible name. Drag the resize handle to narrow the list."
        code={`import { ArrowUp, CheckSquare } from 'lucide-react';
import { Badge, Cluster, EntityChip, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="xs" align="start">
      <EntityChip
        truncate
        href="/tasks/5"
        icon={<CheckSquare size={14} />}
        prefix="ENG-5"
        label="Fix the login bug that only happens on Safari after a password reset"
        trailing={
          <Cluster gap="xs">
            <ArrowUp size={14} aria-label="High priority" />
            <Badge tone="info">In progress</Badge>
          </Cluster>
        }
      />
      <EntityChip
        truncate
        href="/tasks/8"
        icon={<CheckSquare size={14} />}
        prefix="ENG-8"
        label="Short title"
        status={{ label: 'Done', category: 'done' }}
      />
    </Stack>
  );
}`}
      >
        <ResizablePreview initialWidth={360}>
          <Stack gap="xs" align="start">
            <EntityChip
              truncate
              href="/tasks/5"
              icon={<CheckSquare size={14} />}
              prefix="ENG-5"
              label="Fix the login bug that only happens on Safari after a password reset"
              trailing={
                <Cluster gap="xs">
                  <ArrowUp size={14} aria-label="High priority" />
                  <Badge tone="info">In progress</Badge>
                </Cluster>
              }
            />
            <EntityChip
              truncate
              href="/tasks/7"
              icon={<CheckSquare size={14} />}
              prefix="ENG-7"
              label="Migrate the reporting exports to the new async job runner"
              status={{ label: 'To do', category: 'to_do' }}
              trailing={<ArrowDown size={14} aria-label="Low priority" />}
            />
            <EntityChip
              truncate
              href="/tasks/8"
              icon={<CheckSquare size={14} />}
              prefix="ENG-8"
              label="Short title"
              status={{ label: 'Done', category: 'done' }}
            />
          </Stack>
        </ResizablePreview>
      </Example>

      <Example
        title="Segmented (task chip)"
        description="`before`/`after` add coloured segments butted against the chip — the whole chip stays one link and one Tab stop, and every segment's text joins its accessible name. Any segment makes the chip one line with only the outer corners rounded; `labelMaxWidth` caps the label in running text (full text on hover) while a `ResizablePreview` shows only the label shrinking as the container narrows. `labelWeight` set to `semibold` gives the key + title the heavier weight this task-chip design wants."
        code={`import { Bug, Building2, Equal } from 'lucide-react';
import { EntityChip, Stack, Text } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="md">
      <Text>
        Blocked by{' '}
        <EntityChip
          href="#"
          prefix="ENG-15"
          label="Fix the login bug that only happens on Safari when the session cookie expires"
          labelMaxWidth={40}
          labelWeight="semibold"
          before={[{ kind: 'icon', icon: <Bug />, label: 'Bug', color: 'red' }]}
          after={[
            { kind: 'icon', icon: <Equal />, label: 'Normal priority', color: 'slate' },
            { kind: 'text', text: 'Reported', color: 'amber' },
          ]}
        />{' '}
        and <EntityChip href="#" icon={<Building2 size={14} />} label="Acme Corp" />.
      </Text>
      <EntityChip
        href="#"
        prefix="ENG-15"
        label="Fix the login bug that only happens on Safari when the session cookie expires"
        labelWeight="semibold"
        before={[{ kind: 'icon', icon: <Bug />, label: 'Bug', color: 'red' }]}
        after={[
          { kind: 'icon', icon: <Equal />, label: 'Normal priority', color: 'slate' },
          { kind: 'text', text: 'Reported', color: 'amber' },
        ]}
      />
    </Stack>
  );
}`}
      >
        <Stack gap="md">
          <Text>
            Blocked by{' '}
            <EntityChip
              href="#"
              prefix="ENG-15"
              label="Fix the login bug that only happens on Safari when the session cookie expires"
              labelMaxWidth={40}
              labelWeight="semibold"
              before={[{ kind: 'icon', icon: <Bug />, label: 'Bug', color: 'red' }]}
              after={[
                { kind: 'icon', icon: <Equal />, label: 'Normal priority', color: 'slate' },
                { kind: 'text', text: 'Reported', color: 'amber' },
              ]}
            />{' '}
            and <EntityChip href="#" icon={<Building2 size={14} />} label="Acme Corp" />.
          </Text>
          <ResizablePreview>
            <EntityChip
              href="#"
              prefix="ENG-15"
              label="Fix the login bug that only happens on Safari when the session cookie expires"
              labelWeight="semibold"
              before={[{ kind: 'icon', icon: <Bug />, label: 'Bug', color: 'red' }]}
              after={[
                { kind: 'icon', icon: <Equal />, label: 'Normal priority', color: 'slate' },
                { kind: 'text', text: 'Reported', color: 'amber' },
              ]}
            />
          </ResizablePreview>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
