import {
  AgentAvatar,
  Badge,
  Card,
  CardBody,
  Cluster,
  Constrain,
  DefinitionList,
  IconTile,
  Link,
  PersonDisplay,
  Stack,
  Text,
  Thread,
} from '@eocrm/design-system';
import { CalendarPlus } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { InputExample } from './InputExample';
import { getComponentFiles } from '../../lib/componentFiles';

// Generic sparkle, currentColor: stands in for a vendor's brand mark.
const Sparkle = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
  </svg>
);

const LONG_AGENT = 'Quarterly pipeline reconciliation assistant';
const LONG_MEMBER = 'Bartholomew Featherstonehaugh-Villiers';
const SIZES = ['inline', 'sm', 'md', 'lg'] as const;

export function PersonDisplayDemo() {
  return (
    <DemoLayout
      name="PersonDisplay"
      componentName="PersonDisplay"
      description="Avatar + name (+ optional description lines) — the canonical person-row composition. Three sizes (sm / md / lg) drive Avatar + Text scales."
      files={getComponentFiles('PersonDisplay')}
    >
      <Example
        title="All three sizes"
        description="The same person rendered at sm, md, and lg so you can compare scale. sm is for tight table cells, md is the default, lg is the detail-page hero."
        code={`import { PersonDisplay, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="md">
      <PersonDisplay size="sm">
        <PersonDisplay.Avatar name="Sarah Chen" />
        <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
        <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
      </PersonDisplay>
      <PersonDisplay size="md">
        <PersonDisplay.Avatar name="Sarah Chen" />
        <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
        <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
      </PersonDisplay>
      <PersonDisplay size="lg">
        <PersonDisplay.Avatar name="Sarah Chen" />
        <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
        <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
      </PersonDisplay>
    </Stack>
  );
}`}
      >
        <InputExample width="auto">
          <Stack gap="md">
            <PersonDisplay size="sm">
              <PersonDisplay.Avatar name="Sarah Chen" />
              <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
              <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
            </PersonDisplay>
            <PersonDisplay size="md">
              <PersonDisplay.Avatar name="Sarah Chen" />
              <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
              <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
            </PersonDisplay>
            <PersonDisplay size="lg">
              <PersonDisplay.Avatar name="Sarah Chen" />
              <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
              <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
            </PersonDisplay>
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Avatar + name only"
        description="The compact owner-column shape — no description line."
        code={`import { PersonDisplay } from '@eocrm/design-system';

export function Demo() {
  return (
    <PersonDisplay size="sm">
      <PersonDisplay.Avatar name="Avery Liu" />
      <PersonDisplay.Name>Avery Liu</PersonDisplay.Name>
    </PersonDisplay>
  );
}`}
      >
        <InputExample width="auto">
          <PersonDisplay size="sm">
            <PersonDisplay.Avatar name="Avery Liu" />
            <PersonDisplay.Name>Avery Liu</PersonDisplay.Name>
          </PersonDisplay>
        </InputExample>
      </Example>

      <Example
        title="Linked name"
        description="Name renders as a real <a> when href is set. Uses Link variant=subtle so it doesn't compete with action CTAs."
        code={`import { PersonDisplay } from '@eocrm/design-system';

export function Demo() {
  return (
    <PersonDisplay size="md">
      <PersonDisplay.Avatar name="Sarah Chen" />
      <PersonDisplay.Name href="#sarah-chen">Sarah Chen</PersonDisplay.Name>
      <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
    </PersonDisplay>
  );
}`}
      >
        <InputExample width="auto">
          <PersonDisplay size="md">
            <PersonDisplay.Avatar name="Sarah Chen" />
            <PersonDisplay.Name href="#sarah-chen">Sarah Chen</PersonDisplay.Name>
            <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
          </PersonDisplay>
        </InputExample>
      </Example>

      <Example
        title="Multiple description lines"
        description="Repeat <PersonDisplay.Description> for additional lines — email then role then company, etc. A Description takes arbitrary ReactNode, including a focusable one: the line clips itself so it cannot paint outside a narrow container, and re-admits the focus ring while a control inside it is focused."
        code={`import { Link, PersonDisplay } from '@eocrm/design-system';

export function Demo() {
  return (
    <PersonDisplay size="md">
      <PersonDisplay.Avatar name="Marcus Vega" />
      <PersonDisplay.Name>Marcus Vega</PersonDisplay.Name>
      <PersonDisplay.Description>
        <Link href="mailto:marcus@acme.com">marcus@acme.com</Link>
      </PersonDisplay.Description>
      <PersonDisplay.Description>Account Executive</PersonDisplay.Description>
    </PersonDisplay>
  );
}`}
      >
        <InputExample width="auto">
          <PersonDisplay size="md">
            <PersonDisplay.Avatar name="Marcus Vega" />
            <PersonDisplay.Name>Marcus Vega</PersonDisplay.Name>
            <PersonDisplay.Description>
              <Link href="mailto:marcus@acme.com">marcus@acme.com</Link>
            </PersonDisplay.Description>
            <PersonDisplay.Description>Account Executive</PersonDisplay.Description>
          </PersonDisplay>
        </InputExample>
      </Example>

      <Example
        title="With status dot"
        description="Pass status to <PersonDisplay.Avatar> for the presence dot (online / busy / away / offline)."
        code={`import { PersonDisplay } from '@eocrm/design-system';

export function Demo() {
  return (
    <PersonDisplay size="md">
      <PersonDisplay.Avatar name="Priya Mehta" status="online" />
      <PersonDisplay.Name>Priya Mehta</PersonDisplay.Name>
      <PersonDisplay.Description>priya@acme.com</PersonDisplay.Description>
    </PersonDisplay>
  );
}`}
      >
        <InputExample width="auto">
          <PersonDisplay size="md">
            <PersonDisplay.Avatar name="Priya Mehta" status="online" />
            <PersonDisplay.Name>Priya Mehta</PersonDisplay.Name>
            <PersonDisplay.Description>priya@acme.com</PersonDisplay.Description>
          </PersonDisplay>
        </InputExample>
      </Example>

      <Example
        title="Description with inline Badge"
        description="Description accepts ReactNode children — inline a small Badge for context like an audit-log 'impersonating' marker."
        code={`import { Badge, PersonDisplay } from '@eocrm/design-system';

export function Demo() {
  return (
    <PersonDisplay size="md">
      <PersonDisplay.Avatar name="System Admin" />
      <PersonDisplay.Name>System Admin</PersonDisplay.Name>
      <PersonDisplay.Description>
        admin@acme.com{' '}
        <Badge tone="warning" size="sm">
          impersonating Sarah Chen
        </Badge>
      </PersonDisplay.Description>
    </PersonDisplay>
  );
}`}
      >
        <InputExample width="auto">
          <PersonDisplay size="md">
            <PersonDisplay.Avatar name="System Admin" />
            <PersonDisplay.Name>System Admin</PersonDisplay.Name>
            <PersonDisplay.Description>
              admin@acme.com{' '}
              <Badge tone="warning" size="sm">
                impersonating Sarah Chen
              </Badge>
            </PersonDisplay.Description>
          </PersonDisplay>
        </InputExample>
      </Example>

      <Example
        title="Shrink-wrap for overlay triggers"
        description="Inside a STRETCHING flex/grid column (here a Stack, which stretches its children), a default PersonDisplay blockifies and stretches to the full column width — the dashed outline shows the box reaching the right edge, so a Popover/Tooltip cloned onto it anchors to that wide box and centers far right of the person. With shrink (second row) the box hugs the avatar+name, so overlays anchor to the visible person. The dashed outlines are demo-only, to make each box's width visible."
        code={`import { PersonDisplay, Stack } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="md">
      <PersonDisplay style={{ outline: '1px dashed var(--color-border)' }}>
        <PersonDisplay.Avatar name="Sarah Chen" />
        <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
        <PersonDisplay.Description>
          sarah@acme.com (default — stretches)
        </PersonDisplay.Description>
      </PersonDisplay>
      <PersonDisplay shrink style={{ outline: '1px dashed var(--color-border)' }}>
        <PersonDisplay.Avatar name="Sarah Chen" />
        <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
        <PersonDisplay.Description>
          sarah@acme.com (shrink — content-width)
        </PersonDisplay.Description>
      </PersonDisplay>
    </Stack>
  );
}`}
      >
        <InputExample>
          <Stack gap="md">
            <PersonDisplay style={{ outline: '1px dashed var(--color-border)' }}>
              <PersonDisplay.Avatar name="Sarah Chen" />
              <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
              <PersonDisplay.Description>
                sarah@acme.com (default — stretches)
              </PersonDisplay.Description>
            </PersonDisplay>
            <PersonDisplay shrink style={{ outline: '1px dashed var(--color-border)' }}>
              <PersonDisplay.Avatar name="Sarah Chen" />
              <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
              <PersonDisplay.Description>
                sarah@acme.com (shrink — content-width)
              </PersonDisplay.Description>
            </PersonDisplay>
          </Stack>
        </InputExample>
      </Example>
      <Example
        title="Inline — in a details list"
        description="size=inline makes the avatar one text line tall and the name inherit the row's size, weight and colour, so a person row is exactly as tall as its plain-text, Badge and link neighbours. It follows the text size; skip Descriptions."
        code={`import { Badge, DefinitionList, Link, PersonDisplay } from '@eocrm/design-system';

export function Demo() {
  return (
    <DefinitionList dividers>
      <DefinitionList.Item>
        <DefinitionList.Term>Status</DefinitionList.Term>
        <DefinitionList.Description>
          <Badge tone="info">In progress</Badge>
        </DefinitionList.Description>
      </DefinitionList.Item>
      <DefinitionList.Item>
        <DefinitionList.Term>Assignee</DefinitionList.Term>
        <DefinitionList.Description>
          <PersonDisplay size="inline">
            <PersonDisplay.Avatar name="Avery Liu" />
            <PersonDisplay.Name href="#">Avery Liu</PersonDisplay.Name>
          </PersonDisplay>
        </DefinitionList.Description>
      </DefinitionList.Item>
      <DefinitionList.Item>
        <DefinitionList.Term>Reporter</DefinitionList.Term>
        <DefinitionList.Description>
          <PersonDisplay size="inline">
            <PersonDisplay.Avatar name="Sarah Chen" />
            <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
          </PersonDisplay>
        </DefinitionList.Description>
      </DefinitionList.Item>
      <DefinitionList.Item>
        <DefinitionList.Term>Space</DefinitionList.Term>
        <DefinitionList.Description>
          <Link href="#">Engineering</Link>
        </DefinitionList.Description>
      </DefinitionList.Item>
    </DefinitionList>
  );
}`}
      >
        <DefinitionList dividers>
          <DefinitionList.Item>
            <DefinitionList.Term>Status</DefinitionList.Term>
            <DefinitionList.Description>
              <Badge tone="info">In progress</Badge>
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Assignee</DefinitionList.Term>
            <DefinitionList.Description>
              <PersonDisplay size="inline">
                <PersonDisplay.Avatar name="Avery Liu" />
                <PersonDisplay.Name href="#">Avery Liu</PersonDisplay.Name>
              </PersonDisplay>
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Reporter</DefinitionList.Term>
            <DefinitionList.Description>
              <PersonDisplay size="inline">
                <PersonDisplay.Avatar name="Sarah Chen" />
                <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
              </PersonDisplay>
            </DefinitionList.Description>
          </DefinitionList.Item>
          <DefinitionList.Item>
            <DefinitionList.Term>Space</DefinitionList.Term>
            <DefinitionList.Description>
              <Link href="#">Engineering</Link>
            </DefinitionList.Description>
          </DefinitionList.Item>
        </DefinitionList>
      </Example>
      <Example
        title="Agent on behalf of a member"
        description="PersonDisplay.AgentAvatar + PersonDisplay.OnBehalfOf: an AI agent acting for a member. The agent tile carries the member's badge (none at inline). Name and OnBehalfOf share one truncating row: the muted 'for' prefix never shrinks, the member ellipsises, then the Name."
        code={`import { PersonDisplay } from '@eocrm/design-system';

const Sparkle = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" />
  </svg>
);

export function Demo() {
  return (
    <PersonDisplay size="md">
      <PersonDisplay.AgentAvatar name="Scout" mark={Sparkle} member={{ name: 'Sarah Chen' }} />
      <PersonDisplay.Name>Scout</PersonDisplay.Name>
      <PersonDisplay.OnBehalfOf>Sarah Chen</PersonDisplay.OnBehalfOf>
      <PersonDisplay.Description>Drafted the follow-up</PersonDisplay.Description>
    </PersonDisplay>
  );
}`}
      >
        <InputExample width="auto">
          <Stack gap="md" data-testid="agent-sizes">
            {SIZES.map((size) => (
              <PersonDisplay key={size} size={size}>
                <PersonDisplay.AgentAvatar
                  name="Scout"
                  mark={Sparkle}
                  member={{ name: 'Sarah Chen' }}
                />
                <PersonDisplay.Name>Scout</PersonDisplay.Name>
                <PersonDisplay.OnBehalfOf>Sarah Chen</PersonDisplay.OnBehalfOf>
                {size !== 'inline' && (
                  <PersonDisplay.Description>Drafted the follow-up</PersonDisplay.Description>
                )}
              </PersonDisplay>
            ))}
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Agent — fallback mark and member states"
        description="Without mark the tile falls back to a Bot icon. Member states: alone (no OnBehalfOf), a member with a photo or initials, and an erased member (empty OnBehalfOf renders 'for a former member' with a placeholder badge)."
        code={`<PersonDisplay.AgentAvatar name="Scout" />
<PersonDisplay.AgentAvatar name="Scout" member={{ name: 'Sarah Chen', src: '/sarah.png' }} />
<PersonDisplay.AgentAvatar name="Scout" member={null} />
<PersonDisplay.OnBehalfOf />`}
      >
        <InputExample width="auto">
          <Stack gap="md">
            <PersonDisplay>
              <PersonDisplay.AgentAvatar name="Scout" />
              <PersonDisplay.Name>Scout (fallback mark, alone)</PersonDisplay.Name>
            </PersonDisplay>
            <PersonDisplay>
              <PersonDisplay.AgentAvatar name="Scout" mark={Sparkle} />
              <PersonDisplay.Name>Scout (alone)</PersonDisplay.Name>
            </PersonDisplay>
            <PersonDisplay>
              <PersonDisplay.AgentAvatar
                name="Scout"
                mark={Sparkle}
                member={{ name: 'Sarah Chen' }}
              />
              <PersonDisplay.Name>Scout</PersonDisplay.Name>
              <PersonDisplay.OnBehalfOf>Sarah Chen</PersonDisplay.OnBehalfOf>
            </PersonDisplay>
            <PersonDisplay>
              <PersonDisplay.AgentAvatar
                name="Scout"
                mark={Sparkle}
                member={{ name: 'Avery Liu', src: 'https://i.pravatar.cc/64?img=12' }}
              />
              <PersonDisplay.Name>Scout (member photo)</PersonDisplay.Name>
              <PersonDisplay.OnBehalfOf>Avery Liu</PersonDisplay.OnBehalfOf>
            </PersonDisplay>
            <PersonDisplay>
              <PersonDisplay.AgentAvatar name="Scout" mark={Sparkle} member={null} />
              <PersonDisplay.Name>Scout</PersonDisplay.Name>
              <PersonDisplay.OnBehalfOf />
            </PersonDisplay>
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Agent — truncation in a 360px card"
        description="A long agent label and a long member at inline, sm and md. The 'for' prefix stays whole, the member ellipsises, then the Name."
        code={`<InputExample width={360}>
  <Card>
    <CardBody>
      <PersonDisplay size="sm">
        <PersonDisplay.AgentAvatar name={longAgent} member={{ name: longMember }} />
        <PersonDisplay.Name>{longAgent}</PersonDisplay.Name>
        <PersonDisplay.OnBehalfOf>{longMember}</PersonDisplay.OnBehalfOf>
      </PersonDisplay>
    </CardBody>
  </Card>
</InputExample>`}
      >
        <InputExample width={360}>
          <Card>
            <CardBody>
              <Stack gap="md" data-testid="agent-card-360">
                {(['inline', 'sm', 'md'] as const).map((size) => (
                  <PersonDisplay key={size} size={size}>
                    <PersonDisplay.AgentAvatar
                      name={LONG_AGENT}
                      mark={Sparkle}
                      member={{ name: LONG_MEMBER }}
                    />
                    <PersonDisplay.Name>{LONG_AGENT}</PersonDisplay.Name>
                    <PersonDisplay.OnBehalfOf>{LONG_MEMBER}</PersonDisplay.OnBehalfOf>
                  </PersonDisplay>
                ))}
              </Stack>
            </CardBody>
          </Card>
        </InputExample>
      </Example>

      <Example
        title="Agent — links in the truncating row"
        description="A Link inside OnBehalfOf and a Name href: both keep their whole focus ring in the clipping row. Only a member Link that is itself truncated loses its trailing ring band, since it runs past the clip edge."
        code={`<PersonDisplay size="sm">
  <PersonDisplay.AgentAvatar name="Scout" mark={Sparkle} member={{ name: 'Sarah Chen' }} />
  <PersonDisplay.Name href="#scout">Scout</PersonDisplay.Name>
  <PersonDisplay.OnBehalfOf>
    <Link href="#sarah-chen">Sarah Chen</Link>
  </PersonDisplay.OnBehalfOf>
</PersonDisplay>`}
      >
        <InputExample width={360}>
          <Stack gap="md">
            <PersonDisplay size="sm">
              <PersonDisplay.AgentAvatar
                name="Scout"
                mark={Sparkle}
                member={{ name: 'Sarah Chen' }}
              />
              <PersonDisplay.Name href="#scout">Scout</PersonDisplay.Name>
              <PersonDisplay.OnBehalfOf>
                <Link href="#sarah-chen">Sarah Chen</Link>
              </PersonDisplay.OnBehalfOf>
            </PersonDisplay>
            <PersonDisplay size="inline">
              <PersonDisplay.AgentAvatar
                name="Scout"
                mark={Sparkle}
                member={{ name: 'Sarah Chen' }}
              />
              <PersonDisplay.Name href="#scout">Scout</PersonDisplay.Name>
              <PersonDisplay.OnBehalfOf>
                <Link href="#sarah-chen">Sarah Chen</Link>
              </PersonDisplay.OnBehalfOf>
            </PersonDisplay>
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Agent — activity row"
        description="Event IconTile, an inline PersonDisplay and a muted timestamp on one line, the action below. With a long label and member in 360px, the PersonDisplay truncates between the IconTile (fixed-size, never shrinks) and the timestamp (wrapped in a no-flex Constrain so it keeps its size)."
        code={`<Cluster gap="sm" align="center" wrap={false}>
  <IconTile size="xs" icon={<CalendarPlus />} />
  <PersonDisplay size="inline">…</PersonDisplay>
  <Constrain flex="none">
    <Text size="sm" tone="muted">2h ago</Text>
  </Constrain>
</Cluster>
<Text size="sm">Scheduled a demo with Acme</Text>`}
      >
        <InputExample width={360}>
          <Stack gap="md" data-testid="agent-activity-360">
            {[
              { agent: 'Scout', member: 'Sarah Chen' },
              { agent: LONG_AGENT, member: LONG_MEMBER },
            ].map(({ agent, member }) => (
              <Stack key={agent} gap="xs">
                <Cluster gap="sm" align="center" wrap={false}>
                  {/* IconTile never shrinks; the timestamp's flex="none" Constrain
                      leaves the PersonDisplay as the only thing that gives way */}
                  <IconTile size="xs" icon={<CalendarPlus />} />
                  <PersonDisplay size="inline">
                    <PersonDisplay.AgentAvatar
                      name={agent}
                      mark={Sparkle}
                      member={{ name: member }}
                    />
                    <PersonDisplay.Name>{agent}</PersonDisplay.Name>
                    <PersonDisplay.OnBehalfOf>{member}</PersonDisplay.OnBehalfOf>
                  </PersonDisplay>
                  <Constrain flex="none">
                    <Text size="sm" tone="muted">
                      2h ago
                    </Text>
                  </Constrain>
                </Cluster>
                <Text size="sm">Scheduled a demo with Acme</Text>
              </Stack>
            ))}
          </Stack>
        </InputExample>
      </Example>

      <Example
        title="Agent — as a Thread node"
        description="AgentAvatar at size sm is the Thread.Item node; the body header is an inline PersonDisplay (Name + OnBehalfOf, so the 'for' copy is localized). The node is decorative: the header already names Scout and Sarah Chen, so they are not announced twice."
        code={`<Thread.Item node={<AgentAvatar name="Scout" mark={Sparkle} member={{ name: 'Sarah Chen' }} size="sm" decorative />}>
  <PersonDisplay size="inline">
    <PersonDisplay.Name>Scout</PersonDisplay.Name>
    <PersonDisplay.OnBehalfOf>Sarah Chen</PersonDisplay.OnBehalfOf>
  </PersonDisplay>
  …
</Thread.Item>`}
      >
        <Thread>
          <Thread.Item
            node={
              <AgentAvatar
                name="Scout"
                mark={Sparkle}
                member={{ name: 'Sarah Chen' }}
                size="sm"
                decorative
              />
            }
          >
            <Stack gap="xs">
              <Cluster gap="xs" align="center">
                <PersonDisplay size="inline">
                  <PersonDisplay.Name>Scout</PersonDisplay.Name>
                  <PersonDisplay.OnBehalfOf>Sarah Chen</PersonDisplay.OnBehalfOf>
                </PersonDisplay>
                <Text size="sm" tone="muted">
                  · 5m ago
                </Text>
              </Cluster>
              <Text size="sm">Summarised the renewal call and drafted next steps.</Text>
            </Stack>
          </Thread.Item>
        </Thread>
      </Example>
    </DemoLayout>
  );
}
