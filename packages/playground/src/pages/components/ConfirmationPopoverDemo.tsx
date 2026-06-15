import { useRef, useState } from 'react';
import { Button, Cluster, ConfirmationPopover, DropdownMenu, Input } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const fakeDelay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function ConfirmationPopoverDemo() {
  const [archiveCount, setArchiveCount] = useState(0);
  const [deleteCount, setDeleteCount] = useState(0);
  const [viewName, setViewName] = useState('Untitled view');
  const renameRef = useRef<HTMLInputElement | null>(null);

  return (
    <DemoLayout
      name="ConfirmationPopover"
      componentName="ConfirmationPopover"
      description="Opinionated 'Are you sure?' preset on top of Popover. Title + optional description + Cancel + Confirm. Initial focus on Cancel; async-aware onConfirm with pending state."
      files={getComponentFiles('ConfirmationPopover')}
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
        description="Wrap a <DropdownMenu.Item closeOnSelect={false}> as ConfirmationPopover's trigger. The Item IS the trigger, so the full highlighted row opens the confirmation. The menu stays open until the user dismisses it (Escape, click outside, or pick another item)."
        code={`<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="ghost" aria-label="Row actions">⋯</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="end">
    <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
    <DropdownMenu.Item onSelect={() => {}}>Duplicate</DropdownMenu.Item>
    <ConfirmationPopover
      title="Delete record?"
      description="This action cannot be undone."
      variant="danger"
      confirmLabel="Delete"
      onConfirm={remove}
    >
      <DropdownMenu.Item closeOnSelect={false} onSelect={() => {}} tone="danger">
        Delete
      </DropdownMenu.Item>
    </ConfirmationPopover>
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
            <DropdownMenu.Content align="end">
              <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => {}}>Duplicate</DropdownMenu.Item>
              <ConfirmationPopover
                title="Delete record?"
                description="This action cannot be undone."
                variant="danger"
                confirmLabel="Delete"
                onConfirm={() => setDeleteCount((n) => n + 1)}
              >
                <DropdownMenu.Item closeOnSelect={false} onSelect={() => {}} tone="danger">
                  Delete
                </DropdownMenu.Item>
              </ConfirmationPopover>
            </DropdownMenu.Content>
          </DropdownMenu>
        </Cluster>
      </Example>

      <Example
        title="Rename — focus a hosted input"
        description="Pass initialFocusRef to override the default Cancel focus and land focus on an <Input> rendered inside the description slot. The onFocus select-all means the user can type a replacement immediately — exactly the saved-views Rename flow."
        code={`const renameRef = useRef<HTMLInputElement | null>(null);

<ConfirmationPopover
  title="Rename view"
  description={
    <Input
      ref={renameRef}
      aria-label="View name"
      value={viewName}
      onChange={(e) => setViewName(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
    />
  }
  initialFocusRef={renameRef}
  confirmLabel="Rename"
  onConfirm={() => saveViewName(viewName)}
>
  <Button variant="secondary">Rename…</Button>
</ConfirmationPopover>`}
      >
        <Cluster gap="md" justify="center">
          <ConfirmationPopover
            title="Rename view"
            description={
              <Input
                ref={renameRef}
                aria-label="View name"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                onFocus={(e) => e.currentTarget.select()}
              />
            }
            initialFocusRef={renameRef}
            confirmLabel="Rename"
            onConfirm={() => {}}
          >
            <Button variant="secondary">Rename…</Button>
          </ConfirmationPopover>
          <span>Current name: {viewName}</span>
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
