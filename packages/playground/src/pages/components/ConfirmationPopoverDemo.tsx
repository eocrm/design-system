import { useState } from 'react';
import { Button, Cluster, ConfirmationPopover, DropdownMenu } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/ConfirmationPopover/ConfirmationPopover.tsx?raw';
import scssSource from '@lib-source/components/ConfirmationPopover/ConfirmationPopover.module.scss?raw';

const fakeDelay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function ConfirmationPopoverDemo() {
  const [archiveCount, setArchiveCount] = useState(0);
  const [deleteCount, setDeleteCount] = useState(0);

  return (
    <DemoLayout
      name="ConfirmationPopover"
      componentName="ConfirmationPopover"
      description="Opinionated 'Are you sure?' preset on top of Popover. Title + optional description + Cancel + Confirm. Initial focus on Cancel; async-aware onConfirm with pending state."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="ConfirmationPopover.tsx"
      scssFilename="ConfirmationPopover.module.scss"
    >
      <Example
        title="Default variant — Archive"
        description="Sync onConfirm. Lighter-weight confirmation for non-destructive actions like archive or publish."
        code={`<ConfirmationPopover
  title="Archive this contact?"
  description="You can unarchive later from the archive view."
  onConfirm={() => archive(id)}
>
  <Button variant="secondary">Archive</Button>
</ConfirmationPopover>`}
      >
        <Cluster gap="md" justify="center">
          <ConfirmationPopover
            title="Archive this contact?"
            description="You can unarchive later from the archive view."
            onConfirm={() => setArchiveCount((n) => n + 1)}
          >
            <Button variant="secondary">Archive</Button>
          </ConfirmationPopover>
          <span>Archived {archiveCount} time(s)</span>
        </Cluster>
      </Example>

      <Example
        title="Danger variant — Delete"
        description="variant='danger' makes Confirm a danger button. Initial focus is on Cancel, so keyboard Enter never accidentally deletes."
        code={`<ConfirmationPopover
  title="Delete record?"
  description="This action cannot be undone."
  confirmLabel="Delete"
  variant="danger"
  onConfirm={() => deleteRecord(id)}
>
  <Button variant="danger">Delete</Button>
</ConfirmationPopover>`}
      >
        <Cluster gap="md" justify="center">
          <ConfirmationPopover
            title="Delete record?"
            description="This action cannot be undone."
            confirmLabel="Delete"
            variant="danger"
            onConfirm={() => setDeleteCount((n) => n + 1)}
          >
            <Button variant="danger">Delete</Button>
          </ConfirmationPopover>
          <span>Deleted {deleteCount} time(s)</span>
        </Cluster>
      </Example>

      <Example
        title="Async success — pending spinner"
        description="onConfirm returns a Promise that resolves after 1.5s. While pending, both buttons disable, Confirm shows a spinner, and dismissal is blocked. On resolve the popover closes."
        code={`<ConfirmationPopover
  title="Submit?"
  onConfirm={async () => {
    await submitToServer();   // 1.5s
  }}
>
  <Button>Submit</Button>
</ConfirmationPopover>`}
      >
        <Cluster gap="md" justify="center">
          <ConfirmationPopover
            title="Submit?"
            description="Simulated 1.5s server round-trip."
            onConfirm={async () => {
              await fakeDelay(1500);
            }}
          >
            <Button>Submit</Button>
          </ConfirmationPopover>
        </Cluster>
      </Example>

      <Example
        title="Async failure — popover stays open"
        description="onConfirm returns a Promise that rejects after 1s. The popover stays open and buttons re-enable. The consumer is expected to surface the error externally (we just console.log here)."
        code={`<ConfirmationPopover
  title="Submit?"
  onConfirm={async () => {
    await fakeDelay(1000);
    throw new Error('network down');
  }}
>
  <Button>Submit (will fail)</Button>
</ConfirmationPopover>`}
      >
        <Cluster gap="md" justify="center">
          <ConfirmationPopover
            title="Submit?"
            description="Simulated server failure after 1s. Buttons re-enable; popover stays open."
            onConfirm={async () => {
              await fakeDelay(1000);
              throw new Error('demo failure');
            }}
          >
            <Button>Submit (will fail)</Button>
          </ConfirmationPopover>
        </Cluster>
      </Example>

      <Example
        title="Inside a DropdownMenu — kebab Delete"
        description="A common pattern: the kebab menu's Delete item opens a ConfirmationPopover. Popover z-layer is above DropdownMenu's, so the confirmation appears over the menu."
        code={`<DropdownMenu>
  <DropdownMenu.Trigger><Button variant="ghost" aria-label="Row actions">⋯</Button></DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => {}}>
      <ConfirmationPopover title="Delete?" variant="danger" onConfirm={remove}>
        <span>Delete</span>
      </ConfirmationPopover>
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu>`}
      >
        <Cluster gap="md" justify="center">
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <Button variant="ghost" aria-label="Row actions">
                ⋯
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => {}}>Duplicate</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => {}} tone="danger">
                <ConfirmationPopover
                  title="Delete record?"
                  description="This action cannot be undone."
                  variant="danger"
                  confirmLabel="Delete"
                  onConfirm={() => setDeleteCount((n) => n + 1)}
                >
                  <span>Delete</span>
                </ConfirmationPopover>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
