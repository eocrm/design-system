import { Mail, Phone, Building, MapPin, Globe, Briefcase, Cake, User } from 'lucide-react';
import { Badge, Cluster, DefinitionList, Link, Stack, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function DefinitionListDemo() {
  return (
    <DemoLayout
      name="DefinitionList"
      componentName="DefinitionList"
      description="Semantic key/value pairs (dl/dt/dd) with optional leading icon on the description. Use this instead of Card.List when every row has a label."
      files={getComponentFiles('DefinitionList')}
    >
      <Example
        title="Horizontal with icons"
        description="The canonical contact-properties pattern: terms in column 1, icon + value in column 2. Term column auto-sizes to the longest label."
        code={`import { Mail, Phone, Building, MapPin } from 'lucide-react';
import { DefinitionList } from '@eocrm/design-system';

export function Demo() {
  return (
    <DefinitionList>
      <DefinitionList.Item>
        <DefinitionList.Term>Email</DefinitionList.Term>
        <DefinitionList.Description icon={<Mail size={14} />}>
          ada@example.com
        </DefinitionList.Description>
      </DefinitionList.Item>
      <DefinitionList.Item>
        <DefinitionList.Term>Phone</DefinitionList.Term>
        <DefinitionList.Description icon={<Phone size={14} />}>
          +1 (415) 555-0142
        </DefinitionList.Description>
      </DefinitionList.Item>
      <DefinitionList.Item>
        <DefinitionList.Term>Company</DefinitionList.Term>
        <DefinitionList.Description icon={<Building size={14} />}>
          Globex Industries
        </DefinitionList.Description>
      </DefinitionList.Item>
      <DefinitionList.Item>
        <DefinitionList.Term>Location</DefinitionList.Term>
        <DefinitionList.Description icon={<MapPin size={14} />}>
          San Francisco, CA
        </DefinitionList.Description>
      </DefinitionList.Item>
    </DefinitionList>
  );
}`}
      >
        <DefinitionList>
          <DefinitionList.Item>
            <DefinitionList.Term>Email</DefinitionList.Term>
            <DefinitionList.Description icon={<Mail size={14} />}>
              ada@example.com
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Phone</DefinitionList.Term>
            <DefinitionList.Description icon={<Phone size={14} />}>
              +1 (415) 555-0142
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Company</DefinitionList.Term>
            <DefinitionList.Description icon={<Building size={14} />}>
              Globex Industries
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Location</DefinitionList.Term>
            <DefinitionList.Description icon={<MapPin size={14} />}>
              San Francisco, CA
            </DefinitionList.Description>
          </DefinitionList.Item>
        </DefinitionList>
      </Example>

      <Example
        title="Explicit termWidth"
        description="Override the auto-sized term column when you need consistent alignment across multiple DefinitionLists on the same screen."
        code={`import { User } from 'lucide-react';
import { DefinitionList } from '@eocrm/design-system';

export function Demo() {
  return (
    <DefinitionList termWidth="200px">
      <DefinitionList.Item>
        <DefinitionList.Term>Customer success manager</DefinitionList.Term>
        <DefinitionList.Description icon={<User size={14} />}>
          Priya Shah
        </DefinitionList.Description>
      </DefinitionList.Item>
      <DefinitionList.Item>
        <DefinitionList.Term>Account tier</DefinitionList.Term>
        <DefinitionList.Description>Enterprise</DefinitionList.Description>
      </DefinitionList.Item>
    </DefinitionList>
  );
}`}
      >
        <DefinitionList termWidth="200px">
          <DefinitionList.Item>
            <DefinitionList.Term>Customer success manager</DefinitionList.Term>
            <DefinitionList.Description icon={<User size={14} />}>
              Priya Shah
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Account tier</DefinitionList.Term>
            <DefinitionList.Description>Enterprise</DefinitionList.Description>
          </DefinitionList.Item>
        </DefinitionList>
      </Example>

      <Example
        title="With dividers"
        description="Opt in to row separators when migrating from Card.List or when the list sits inside a Card."
        code={`import { Globe, Briefcase, Cake } from 'lucide-react';
import { DefinitionList } from '@eocrm/design-system';

export function Demo() {
  return (
    <DefinitionList dividers>
      <DefinitionList.Item>
        <DefinitionList.Term>Website</DefinitionList.Term>
        <DefinitionList.Description icon={<Globe size={14} />}>
          globex.example.com
        </DefinitionList.Description>
      </DefinitionList.Item>
      <DefinitionList.Item>
        <DefinitionList.Term>Industry</DefinitionList.Term>
        <DefinitionList.Description icon={<Briefcase size={14} />}>
          Manufacturing
        </DefinitionList.Description>
      </DefinitionList.Item>
      <DefinitionList.Item>
        <DefinitionList.Term>Founded</DefinitionList.Term>
        <DefinitionList.Description icon={<Cake size={14} />}>
          1987
        </DefinitionList.Description>
      </DefinitionList.Item>
    </DefinitionList>
  );
}`}
      >
        <DefinitionList dividers>
          <DefinitionList.Item>
            <DefinitionList.Term>Website</DefinitionList.Term>
            <DefinitionList.Description icon={<Globe size={14} />}>
              globex.example.com
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Industry</DefinitionList.Term>
            <DefinitionList.Description icon={<Briefcase size={14} />}>
              Manufacturing
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Founded</DefinitionList.Term>
            <DefinitionList.Description icon={<Cake size={14} />}>1987</DefinitionList.Description>
          </DefinitionList.Item>
        </DefinitionList>
      </Example>

      <Example
        title="Spacing variants"
        description="Vertical density per row. Default is sm (dense); bump to md or lg for roomier panels."
        code={`import { DefinitionList, Stack, Text } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="lg">
      {(['sm', 'md', 'lg'] as const).map((s) => (
        <Stack gap="xs" key={s}>
          <Text size="sm" tone="muted">
            {\`spacing="\${s}"\${s === 'sm' ? ' (default)' : ''}\`}
          </Text>
          <DefinitionList spacing={s} dividers>
            <DefinitionList.Item>
              <DefinitionList.Term>Plan</DefinitionList.Term>
              <DefinitionList.Description>Enterprise</DefinitionList.Description>
            </DefinitionList.Item>
            <DefinitionList.Item>
              <DefinitionList.Term>Seats</DefinitionList.Term>
              <DefinitionList.Description>120</DefinitionList.Description>
            </DefinitionList.Item>
          </DefinitionList>
        </Stack>
      ))}
    </Stack>
  );
}`}
      >
        <Stack gap="lg">
          {(['sm', 'md', 'lg'] as const).map((s) => (
            <Stack gap="xs" key={s}>
              <Text size="sm" tone="muted">
                {`spacing="${s}"${s === 'sm' ? ' (default)' : ''}`}
              </Text>
              <DefinitionList spacing={s} dividers>
                <DefinitionList.Item>
                  <DefinitionList.Term>Plan</DefinitionList.Term>
                  <DefinitionList.Description>Enterprise</DefinitionList.Description>
                </DefinitionList.Item>
                <DefinitionList.Item>
                  <DefinitionList.Term>Seats</DefinitionList.Term>
                  <DefinitionList.Description>120</DefinitionList.Description>
                </DefinitionList.Item>
              </DefinitionList>
            </Stack>
          ))}
        </Stack>
      </Example>

      <Example
        title="Stacked layout"
        description="Stack each term above its description. Useful for settings pages, narrow viewports, or long descriptions that need to breathe."
        code={`import { DefinitionList } from '@eocrm/design-system';

export function Demo() {
  return (
    <DefinitionList layout="stacked" dividers>
      <DefinitionList.Item>
        <DefinitionList.Term>Workspace name</DefinitionList.Term>
        <DefinitionList.Description>Acme Corp</DefinitionList.Description>
      </DefinitionList.Item>
      <DefinitionList.Item>
        <DefinitionList.Term>Workspace description</DefinitionList.Term>
        <DefinitionList.Description>
          Internal tooling for the customer success team. Includes pipeline
          tracking, onboarding workflows, and a shared inbox for support
          escalations.
        </DefinitionList.Description>
      </DefinitionList.Item>
      <DefinitionList.Item>
        <DefinitionList.Term>Created</DefinitionList.Term>
        <DefinitionList.Description>March 14, 2024</DefinitionList.Description>
      </DefinitionList.Item>
    </DefinitionList>
  );
}`}
      >
        <DefinitionList layout="stacked" dividers>
          <DefinitionList.Item>
            <DefinitionList.Term>Workspace name</DefinitionList.Term>
            <DefinitionList.Description>Acme Corp</DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Workspace description</DefinitionList.Term>
            <DefinitionList.Description>
              Internal tooling for the customer success team. Includes pipeline tracking, onboarding
              workflows, and a shared inbox for support escalations.
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Created</DefinitionList.Term>
            <DefinitionList.Description>March 14, 2024</DefinitionList.Description>
          </DefinitionList.Item>
        </DefinitionList>
      </Example>

      <Example
        title="Mixed content in description"
        description="The dd accepts any ReactNode. Compose with Badge, Link, Text, or anything else — useful for tags, statuses, or values that link out."
        code={`import { Globe } from 'lucide-react';
import { Badge, Cluster, DefinitionList, Link, Text } from '@eocrm/design-system';

export function Demo() {
  return (
    <DefinitionList>
      <DefinitionList.Item>
        <DefinitionList.Term>Status</DefinitionList.Term>
        <DefinitionList.Description>
          <Cluster gap="xs" align="center">
            <Badge tone="success">Active</Badge>
            <Text as="span" size="sm" tone="subtle">since Jan 2024</Text>
          </Cluster>
        </DefinitionList.Description>
      </DefinitionList.Item>
      <DefinitionList.Item>
        <DefinitionList.Term>Website</DefinitionList.Term>
        <DefinitionList.Description icon={<Globe size={14} />}>
          <Link href="https://globex.example.com" target="_blank" rel="noopener noreferrer">
            globex.example.com
          </Link>
        </DefinitionList.Description>
      </DefinitionList.Item>
      <DefinitionList.Item>
        <DefinitionList.Term>Tags</DefinitionList.Term>
        <DefinitionList.Description>
          <Cluster gap="xs">
            <Badge tone="purple">Enterprise</Badge>
            <Badge tone="info">Pipeline 2026</Badge>
          </Cluster>
        </DefinitionList.Description>
      </DefinitionList.Item>
    </DefinitionList>
  );
}`}
      >
        <DefinitionList>
          <DefinitionList.Item>
            <DefinitionList.Term>Status</DefinitionList.Term>
            <DefinitionList.Description>
              <Cluster gap="xs" align="center">
                <Badge tone="success">Active</Badge>
                <Text as="span" size="sm" tone="subtle">
                  since Jan 2024
                </Text>
              </Cluster>
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Website</DefinitionList.Term>
            <DefinitionList.Description icon={<Globe size={14} />}>
              <Link href="https://globex.example.com" target="_blank" rel="noopener noreferrer">
                globex.example.com
              </Link>
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Tags</DefinitionList.Term>
            <DefinitionList.Description>
              <Cluster gap="xs">
                <Badge tone="purple">Enterprise</Badge>
                <Badge tone="info">Pipeline 2026</Badge>
              </Cluster>
            </DefinitionList.Description>
          </DefinitionList.Item>
        </DefinitionList>
      </Example>

      <Stack gap="xs">
        <Text size="sm" tone="muted">
          Stack is imported above only to balance the spacing inside this demo file — DefinitionList
          does not render a Stack internally.
        </Text>
      </Stack>
    </DemoLayout>
  );
}
