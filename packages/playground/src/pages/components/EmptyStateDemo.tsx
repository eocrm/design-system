import { Button, Card, Cluster, EmptyState, Stack } from '@eocrm/design-system';
import { Inbox, PackageOpen, Search, SearchX, Users } from 'lucide-react';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/EmptyState/EmptyState.tsx?raw';
import scssSource from '@lib-source/components/EmptyState/EmptyState.module.scss?raw';

export function EmptyStateDemo() {
  return (
    <DemoLayout
      name="EmptyState"
      componentName="EmptyState"
      description="Opinionated 'nothing here' container — icon, title, description, actions. Three sizes for inline / card / hero use."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="EmptyState.tsx"
      scssFilename="EmptyState.module.scss"
    >
      <Example
        title="Title only"
        description="Minimal form — just a title. Works for inline contexts where a short label is enough."
        code={`<EmptyState title="No results" />`}
      >
        <EmptyState title="No results" />
      </Example>

      <Example
        title="With icon"
        description="An icon above the title adds visual weight and helps users orient quickly."
        code={`<EmptyState icon={<Inbox size={32} />} title="Inbox empty" />`}
      >
        <EmptyState icon={<Inbox size={32} />} title="Inbox empty" />
      </Example>

      <Example
        title="With icon + description"
        description="A description elaborates on why the state is empty and sets expectations."
        code={`<EmptyState
  icon={<Inbox size={32} />}
  title="Inbox empty"
  description="When you get a message, it'll show up here."
/>`}
      >
        <EmptyState
          icon={<Inbox size={32} />}
          title="Inbox empty"
          description="When you get a message, it'll show up here."
        />
      </Example>

      <Example
        title="With icon + description + single action"
        description="One primary action guides the user to the obvious next step."
        code={`<EmptyState
  icon={<Users size={32} />}
  title="No contacts yet"
  description="Add your first contact to get started."
  actions={<Button>Add contact</Button>}
/>`}
      >
        <EmptyState
          icon={<Users size={32} />}
          title="No contacts yet"
          description="Add your first contact to get started."
          actions={<Button>Add contact</Button>}
        />
      </Example>

      <Example
        title="With icon + description + multiple actions"
        description="Use a Cluster to lay out two actions side-by-side. Keep one primary; make the secondary ghost."
        code={`<EmptyState
  icon={<SearchX size={32} />}
  title="No results"
  description="Try clearing filters or a different search term."
  actions={
    <Cluster gap="sm" justify="center">
      <Button>Clear filters</Button>
      <Button variant="ghost">New search</Button>
    </Cluster>
  }
/>`}
      >
        <EmptyState
          icon={<SearchX size={32} />}
          title="No results"
          description="Try clearing filters or a different search term."
          actions={
            <Cluster gap="sm" justify="center">
              <Button>Clear filters</Button>
              <Button variant="ghost">New search</Button>
            </Cluster>
          }
        />
      </Example>

      <Example
        title="Sizes — sm / md / lg"
        description="sm for inline / popover contexts, md (default) for cards and sections, lg for hero / full-page empty states. Recommended icon sizes: sm=24, md=32, lg=48."
        code={`<Stack gap="lg">
  <EmptyState
    size="sm"
    icon={<Search size={24} />}
    title="No matches"
    description="Refine your search to see results."
  />
  <EmptyState
    size="md"
    icon={<Search size={32} />}
    title="No matches"
    description="Refine your search to see results."
  />
  <EmptyState
    size="lg"
    icon={<Search size={48} />}
    title="No matches"
    description="Refine your search to see results."
  />
</Stack>`}
      >
        <Stack gap="lg">
          <EmptyState
            size="sm"
            icon={<Search size={24} />}
            title="No matches"
            description="Refine your search to see results."
          />
          <EmptyState
            size="md"
            icon={<Search size={32} />}
            title="No matches"
            description="Refine your search to see results."
          />
          <EmptyState
            size="lg"
            icon={<Search size={48} />}
            title="No matches"
            description="Refine your search to see results."
          />
        </Stack>
      </Example>

      <Example
        title="Align start"
        description="Left-aligned variant for narrow columns where center alignment would look stranded."
        code={`<div style={{ maxWidth: 360 }}>
  <EmptyState
    align="start"
    icon={<PackageOpen size={32} />}
    title="No shipments today"
    description="When something's on the way, it'll appear here."
    actions={<Button size="sm">View archive</Button>}
  />
</div>`}
      >
        <div style={{ maxWidth: 360 }}>
          <EmptyState
            align="start"
            icon={<PackageOpen size={32} />}
            title="No shipments today"
            description="When something's on the way, it'll appear here."
            actions={<Button size="sm">View archive</Button>}
          />
        </div>
      </Example>

      <Example
        title="Inside a Card"
        description="Wrap in a Card when the empty state occupies a defined surface area, such as a Kanban column or dashboard panel."
        code={`<Card padding="lg">
  <EmptyState
    icon={<Inbox size={48} />}
    title="Nothing here yet"
    description="Once you add deals, they'll appear in this column."
    actions={<Button>Add deal</Button>}
    size="lg"
  />
</Card>`}
      >
        <Card padding="lg" style={{ maxWidth: 480 }}>
          <EmptyState
            icon={<Inbox size={48} />}
            title="Nothing here yet"
            description="Once you add deals, they'll appear in this column."
            actions={<Button>Add deal</Button>}
            size="lg"
          />
        </Card>
      </Example>
    </DemoLayout>
  );
}
