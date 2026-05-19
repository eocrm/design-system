import { Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Button/Button.tsx?raw';
import scssSource from '@lib-source/components/Button/Button.module.scss?raw';

export function ButtonDemo() {
  return (
    <DemoLayout
      name="Button"
      description="Renders a <button>. The action element you reach for first — submit a form, open a modal, delete a row, navigate within the app."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Button.tsx"
      scssFilename="Button.module.scss"
    >
      <Example
        title="Variants"
        description="Four visual variants. Use primary for the page's main action, secondary for supporting actions, ghost for tertiary actions in dense UIs, danger for destructive operations."
        code={`<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>`}
      >
        <Cluster gap="sm">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
        </Cluster>
      </Example>

      <Example
        title="Sizes"
        description="Three sizes. sm for dense toolbars/tables, md (default) for most contexts, lg for emphasis."
        code={`<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>`}
      >
        <Cluster gap="sm" align="center">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </Cluster>
      </Example>

      <Example
        title="With icons"
        description="Pass icons (from lucide-react or any source) as children. The button handles spacing via gap."
        code={`<Button><Plus size={14} /> Add contact</Button>
<Button variant="secondary"><Search size={14} /> Search</Button>
<Button variant="danger"><Trash2 size={14} /> Delete</Button>`}
      >
        <Cluster gap="sm">
          <Button>
            <Plus size={14} /> Add contact
          </Button>
          <Button variant="secondary">
            <Search size={14} /> Search
          </Button>
          <Button variant="danger">
            <Trash2 size={14} /> Delete
          </Button>
        </Cluster>
      </Example>

      <Example
        title="Disabled"
        description="Native disabled attribute. Visually muted, pointer-events disabled."
        code={`<Button disabled>Primary</Button>
<Button variant="secondary" disabled>Secondary</Button>`}
      >
        <Cluster gap="sm">
          <Button disabled>Primary</Button>
          <Button variant="secondary" disabled>
            Secondary
          </Button>
          <Button variant="danger" disabled>
            Danger
          </Button>
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
