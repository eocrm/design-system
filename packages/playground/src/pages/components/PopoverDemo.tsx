import { useState } from 'react';
import { Button, Cluster, DropdownMenu, Popover, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Popover/Popover.tsx?raw';
import scssSource from '@lib-source/components/Popover/Popover.module.scss?raw';

export function PopoverDemo() {
  return (
    <DemoLayout
      name="Popover"
      componentName="Popover"
      description="Non-modal floating panel for arbitrary small surfaces. Compound API — pair Trigger / Content / optionally Heading / Close. Focus moves to the panel on open; Tab traverses out; click-outside or Escape dismisses."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Popover.tsx"
      scssFilename="Popover.module.scss"
    >
      <Example
        title="Default — filter panel"
        description="The canonical popover: a button trigger, a small panel of controls, and an Apply / Cancel footer."
        code={`<Popover>
  <Popover.Trigger>
    <Button variant="secondary">Filters</Button>
  </Popover.Trigger>
  <Popover.Content>
    <Stack gap="sm">
      <Popover.Heading>Filter results</Popover.Heading>
      <div>(form controls go here)</div>
      <Cluster justify="end" gap="sm">
        <Popover.Close>
          <Button variant="secondary" size="sm">Cancel</Button>
        </Popover.Close>
        <Popover.Close>
          <Button size="sm">Apply</Button>
        </Popover.Close>
      </Cluster>
    </Stack>
  </Popover.Content>
</Popover>`}
      >
        <Cluster gap="md" justify="center">
          <Popover>
            <Popover.Trigger>
              <Button variant="secondary">Filters</Button>
            </Popover.Trigger>
            <Popover.Content>
              <Stack gap="sm">
                <Popover.Heading>Filter results</Popover.Heading>
                <div>(form controls would go here once Checkbox lands)</div>
                <Cluster justify="end" gap="sm">
                  <Popover.Close>
                    <Button variant="secondary" size="sm">
                      Cancel
                    </Button>
                  </Popover.Close>
                  <Popover.Close>
                    <Button size="sm">Apply</Button>
                  </Popover.Close>
                </Cluster>
              </Stack>
            </Popover.Content>
          </Popover>
        </Cluster>
      </Example>

      <Example
        title="Sides"
        description="Floating UI auto-flips on collision; this row pins each popover to a specific side."
        code={`<Popover><Popover.Trigger><Button>Top</Button></Popover.Trigger><Popover.Content side="top">Top</Popover.Content></Popover>
<Popover><Popover.Trigger><Button>Right</Button></Popover.Trigger><Popover.Content side="right">Right</Popover.Content></Popover>
<Popover><Popover.Trigger><Button>Bottom</Button></Popover.Trigger><Popover.Content side="bottom">Bottom</Popover.Content></Popover>
<Popover><Popover.Trigger><Button>Left</Button></Popover.Trigger><Popover.Content side="left">Left</Popover.Content></Popover>`}
      >
        <Cluster gap="md" justify="center">
          {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
            <Popover key={side}>
              <Popover.Trigger>
                <Button variant="secondary">{side}</Button>
              </Popover.Trigger>
              <Popover.Content side={side}>
                <Stack gap="xs">
                  <Popover.Heading>{`Side: ${side}`}</Popover.Heading>
                  <div>The arrow points back at the trigger.</div>
                </Stack>
              </Popover.Content>
            </Popover>
          ))}
        </Cluster>
      </Example>

      <Example
        title="Rich content with multiple Close buttons"
        description="A popover can contain any interactive content. Wrap each closing element in <Popover.Close>."
        code={`<Popover>
  <Popover.Trigger>
    <Button variant="secondary">Actions</Button>
  </Popover.Trigger>
  <Popover.Content>
    <Stack gap="sm">
      <Popover.Heading>Choose</Popover.Heading>
      <Popover.Close><Button variant="secondary" size="sm">Save and exit</Button></Popover.Close>
      <Popover.Close><Button variant="secondary" size="sm">Discard</Button></Popover.Close>
      <Popover.Close><Button variant="ghost" size="sm">Stay</Button></Popover.Close>
    </Stack>
  </Popover.Content>
</Popover>`}
      >
        <Cluster gap="md" justify="center">
          <Popover>
            <Popover.Trigger>
              <Button variant="secondary">Actions</Button>
            </Popover.Trigger>
            <Popover.Content>
              <Stack gap="sm">
                <Popover.Heading>Choose</Popover.Heading>
                <Stack gap="xs">
                  <Popover.Close>
                    <Button variant="secondary" size="sm">
                      Save and exit
                    </Button>
                  </Popover.Close>
                  <Popover.Close>
                    <Button variant="secondary" size="sm">
                      Discard
                    </Button>
                  </Popover.Close>
                  <Popover.Close>
                    <Button variant="ghost" size="sm">
                      Stay
                    </Button>
                  </Popover.Close>
                </Stack>
              </Stack>
            </Popover.Content>
          </Popover>
        </Cluster>
      </Example>

      <Example
        title="Triggered from a menu item (controlled pattern)"
        description="A Popover.Trigger nested INSIDE a DropdownMenu.Item only catches clicks on its inner element — the menu item's own click handler still owns the rest of the row, which closes the menu. The right pattern: drive the popover's open state from the item's onSelect, with the popover anchored to a separate element (here, a hidden span next to the kebab)."
        code={`const [open, setOpen] = useState(false);

<Cluster gap="sm" align="center">
  <DropdownMenu>
    <DropdownMenu.Trigger>
      <Button variant="secondary">Actions</Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content>
      <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
      <DropdownMenu.Item onSelect={() => setOpen(true)}>Move to…</DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu>

  <Popover open={open} onOpenChange={setOpen}>
    <Popover.Trigger>
      <span aria-hidden="true" />
    </Popover.Trigger>
    <Popover.Content>
      <Stack gap="xs">
        <Popover.Heading>Move to folder</Popover.Heading>
        <div>(folder picker would go here)</div>
      </Stack>
    </Popover.Content>
  </Popover>
</Cluster>`}
      >
        <Cluster gap="md" justify="center">
          <MoveToFolderExample />
        </Cluster>
      </Example>

      <Example
        title="Controlled open"
        description="Drive open externally — useful for orchestrating with other UI state."
        code={`const [open, setOpen] = useState(false);
<Popover open={open} onOpenChange={setOpen}>
  <Popover.Trigger>
    <Button onClick={() => setOpen((o) => !o)}>Toggle</Button>
  </Popover.Trigger>
  <Popover.Content>…</Popover.Content>
</Popover>`}
      >
        <Cluster gap="md" justify="center">
          <ControlledExample />
        </Cluster>
      </Example>
    </DemoLayout>
  );
}

function MoveToFolderExample() {
  const [open, setOpen] = useState(false);
  return (
    <Cluster gap="sm" align="center" justify="center">
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <Button variant="secondary">Actions</Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => {}}>Duplicate</DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => setOpen(true)}>Move to…</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>

      <Popover open={open} onOpenChange={setOpen}>
        <Popover.Trigger>
          <span aria-hidden="true" />
        </Popover.Trigger>
        <Popover.Content>
          <Stack gap="xs">
            <Popover.Heading>Move to folder</Popover.Heading>
            <div>(folder picker would go here)</div>
            <Cluster justify="end">
              <Popover.Close>
                <Button size="sm">Done</Button>
              </Popover.Close>
            </Cluster>
          </Stack>
        </Popover.Content>
      </Popover>
    </Cluster>
  );
}

function ControlledExample() {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <Button onClick={() => setOpen((o) => !o)}>{open ? 'Close' : 'Open'}</Button>
      </Popover.Trigger>
      <Popover.Content>
        <Stack gap="sm">
          <Popover.Heading>Controlled</Popover.Heading>
          <div>This popover is driven from external state.</div>
          <Cluster justify="end">
            <Popover.Close>
              <Button size="sm">Close</Button>
            </Popover.Close>
          </Cluster>
        </Stack>
      </Popover.Content>
    </Popover>
  );
}
