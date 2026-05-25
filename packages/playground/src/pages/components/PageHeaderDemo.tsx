import { useState } from 'react';
import {
  PageHeader,
  Avatar,
  Badge,
  Button,
  Breadcrumb,
  Tabs,
  Text,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/PageHeader/PageHeader.tsx?raw';
import scssSource from '@lib-source/components/PageHeader/PageHeader.module.scss?raw';

function MinimalDemo() {
  return (
    <PageHeader>
      <PageHeader.Title>Settings</PageHeader.Title>
    </PageHeader>
  );
}

function WithSubtitleAndActions() {
  return (
    <PageHeader>
      <PageHeader.Title>Members</PageHeader.Title>
      <PageHeader.Subtitle>Manage team access and roles.</PageHeader.Subtitle>
      <PageHeader.Actions>
        <Button>Invite member</Button>
      </PageHeader.Actions>
    </PageHeader>
  );
}

function FullDemo() {
  return (
    <PageHeader>
      <PageHeader.Breadcrumb>
        <Breadcrumb>
          <Breadcrumb.Item href="#">Contacts</Breadcrumb.Item>
          <Breadcrumb.Item>Acme Corp</Breadcrumb.Item>
        </Breadcrumb>
      </PageHeader.Breadcrumb>
      <PageHeader.BackButton href="#" aria-label="Back to contacts" />
      <PageHeader.Aside>
        <Avatar size="lg" name="Acme Corp" />
      </PageHeader.Aside>
      <PageHeader.Title>Acme Corporation</PageHeader.Title>
      <PageHeader.Subtitle>Founded 2014 · 230 employees</PageHeader.Subtitle>
      <PageHeader.Meta>
        <Badge tone="success">Active</Badge>
        <Text size="sm" tone="muted">Last contacted 2 days ago</Text>
      </PageHeader.Meta>
      <PageHeader.Actions>
        <Button variant="secondary">Email</Button>
        <Button variant="secondary">Call</Button>
        <Button>Edit</Button>
      </PageHeader.Actions>
    </PageHeader>
  );
}

function WithSiblingTabs() {
  const [tab, setTab] = useState('overview');
  return (
    <div>
      <PageHeader borderBottom={false}>
        <PageHeader.Title>Reports</PageHeader.Title>
        <PageHeader.Actions>
          <Button variant="secondary">Export</Button>
          <Button>New report</Button>
        </PageHeader.Actions>
      </PageHeader>
      <Tabs
        activeId={tab}
        onChange={setTab}
        items={[
          { id: 'overview', label: 'Overview' },
          { id: 'pipeline', label: 'Pipeline' },
          { id: 'forecast', label: 'Forecast' },
        ]}
      />
    </div>
  );
}

function SectionHeaderDemo() {
  return (
    <PageHeader>
      <PageHeader.Title order={2}>Filters</PageHeader.Title>
      <PageHeader.Subtitle>Narrow the dataset shown below.</PageHeader.Subtitle>
      <PageHeader.Actions>
        <Button variant="secondary">Reset</Button>
      </PageHeader.Actions>
    </PageHeader>
  );
}

export function PageHeaderDemo() {
  return (
    <DemoLayout
      name="PageHeader"
      description="Compound layout primitive for top-of-page headers. Seven slots (Breadcrumb, BackButton, Aside, Title, Subtitle, Meta, Actions) attached via Object.assign. Missing slots collapse; unrecognized children are silently dropped."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="PageHeader.tsx"
      scssFilename="PageHeader.module.scss"
      componentName="PageHeader"
    >
      <Example
        title="Minimal"
        description="The smallest useful PageHeader — just a Title. All other slots are absent and collapse to 0 height."
        code={`<PageHeader>
  <PageHeader.Title>Settings</PageHeader.Title>
</PageHeader>`}
      >
        <MinimalDemo />
      </Example>

      <Example
        title="With subtitle and actions"
        description="The dominant CRM list/index page pattern. Title + Subtitle on the left, a primary Action button on the right."
        code={`<PageHeader>
  <PageHeader.Title>Members</PageHeader.Title>
  <PageHeader.Subtitle>Manage team access and roles.</PageHeader.Subtitle>
  <PageHeader.Actions>
    <Button>Invite member</Button>
  </PageHeader.Actions>
</PageHeader>`}
      >
        <WithSubtitleAndActions />
      </Example>

      <Example
        title="Full (detail page)"
        description="ContactDetail-style header. Breadcrumb + BackButton in the top row; Aside (Avatar) to the left of the title block; Title + Subtitle + Meta (Badge + Text) stacked in the center; Actions cluster on the right."
        code={`<PageHeader>
  <PageHeader.Breadcrumb>
    <Breadcrumb>
      <Breadcrumb.Item href="#">Contacts</Breadcrumb.Item>
      <Breadcrumb.Item>Acme Corp</Breadcrumb.Item>
    </Breadcrumb>
  </PageHeader.Breadcrumb>
  <PageHeader.BackButton href="#" aria-label="Back to contacts" />
  <PageHeader.Aside>
    <Avatar size="lg" name="Acme Corp" />
  </PageHeader.Aside>
  <PageHeader.Title>Acme Corporation</PageHeader.Title>
  <PageHeader.Subtitle>Founded 2014 · 230 employees</PageHeader.Subtitle>
  <PageHeader.Meta>
    <Badge tone="success">Active</Badge>
    <Text size="sm" tone="muted">Last contacted 2 days ago</Text>
  </PageHeader.Meta>
  <PageHeader.Actions>
    <Button variant="secondary">Email</Button>
    <Button variant="secondary">Call</Button>
    <Button>Edit</Button>
  </PageHeader.Actions>
</PageHeader>`}
      >
        <FullDemo />
      </Example>

      <Example
        title="Inline with sibling Tabs"
        description="When Tabs follows the header as a sibling, set `borderBottom={false}` so PageHeader's border doesn't duplicate Tabs' own border-bottom."
        code={`<div>
  <PageHeader borderBottom={false}>
    <PageHeader.Title>Reports</PageHeader.Title>
    <PageHeader.Actions>
      <Button variant="secondary">Export</Button>
      <Button>New report</Button>
    </PageHeader.Actions>
  </PageHeader>
  <Tabs activeId={tab} onChange={setTab} items={[
    { id: 'overview', label: 'Overview' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'forecast', label: 'Forecast' },
  ]} />
</div>`}
      >
        <WithSiblingTabs />
      </Example>

      <Example
        title="Section header (order={2})"
        description="Sub-page section header — renders as <h2> instead of <h1>. Useful for sub-pages within a tab or a panel where the page's <h1> lives elsewhere."
        code={`<PageHeader>
  <PageHeader.Title order={2}>Filters</PageHeader.Title>
  <PageHeader.Subtitle>Narrow the dataset shown below.</PageHeader.Subtitle>
  <PageHeader.Actions>
    <Button variant="secondary">Reset</Button>
  </PageHeader.Actions>
</PageHeader>`}
      >
        <SectionHeaderDemo />
      </Example>
    </DemoLayout>
  );
}
