import { useState } from 'react';
import { Button, Cluster, DropdownMenu, Stack, Tooltip } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Tooltip/Tooltip.tsx?raw';
import scssSource from '@lib-source/components/Tooltip/Tooltip.module.scss?raw';

export function TooltipDemo() {
  return (
    <DemoLayout
      name="Tooltip"
      componentName="Tooltip"
      description="Small floating label that opens on hover or keyboard focus and points at its trigger. Hand-rolled on Floating UI; lightweight, no focus trap."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Tooltip.tsx"
      scssFilename="Tooltip.module.scss"
    >
      <Example
        title="Default — top + center"
        description="Wrap any trigger; tooltip opens after a short hover delay and immediately on keyboard focus."
        code={`<Tooltip content="Save the record (⌘S)">
  <Button>Save</Button>
</Tooltip>`}
      >
        <Cluster gap="md" justify="center">
          <Tooltip content="Save the record (⌘S)">
            <Button>Save</Button>
          </Tooltip>
        </Cluster>
      </Example>

      <Example
        title="Sides"
        description="Floating UI auto-flips on collision; this row pins each tooltip to a specific side."
        code={`<Tooltip content="Top" side="top"><Button>Top</Button></Tooltip>
<Tooltip content="Right" side="right"><Button>Right</Button></Tooltip>
<Tooltip content="Bottom" side="bottom"><Button>Bottom</Button></Tooltip>
<Tooltip content="Left" side="left"><Button>Left</Button></Tooltip>`}
      >
        <Cluster gap="md" justify="center">
          <Tooltip content="Top" side="top">
            <Button variant="secondary">Top</Button>
          </Tooltip>
          <Tooltip content="Right" side="right">
            <Button variant="secondary">Right</Button>
          </Tooltip>
          <Tooltip content="Bottom" side="bottom">
            <Button variant="secondary">Bottom</Button>
          </Tooltip>
          <Tooltip content="Left" side="left">
            <Button variant="secondary">Left</Button>
          </Tooltip>
        </Cluster>
      </Example>

      <Example
        title="Icon-only trigger"
        description="Trigger needs its own aria-label; tooltip is supplementary description, not the label."
        code={`<Tooltip content="Filter results">
  <Button variant="ghost" aria-label="Filter">⏷</Button>
</Tooltip>`}
      >
        <Cluster gap="md" justify="center">
          <Tooltip content="Filter results">
            <Button variant="ghost" aria-label="Filter">
              ⏷
            </Button>
          </Tooltip>
        </Cluster>
      </Example>

      <Example
        title="Rich content"
        description="content is a ReactNode — inline a <kbd>, an icon, or short structured copy."
        code={`<Tooltip content={<>Save&nbsp;<kbd>⌘S</kbd></>}>
  <Button>Save</Button>
</Tooltip>`}
      >
        <Cluster gap="md" justify="center">
          <Tooltip
            content={
              <>
                Save&nbsp;<kbd>⌘S</kbd>
              </>
            }
          >
            <Button>Save</Button>
          </Tooltip>
        </Cluster>
      </Example>

      <Example
        title="Long content wraps"
        description="The panel has a max-width; copy wraps. Use sparingly — long copy belongs in body content, not a tooltip."
        code={`<Tooltip content="…">
  <Button>Long tooltip</Button>
</Tooltip>`}
      >
        <Cluster gap="md" justify="center">
          <Tooltip content="This tooltip body is long enough to wrap onto multiple lines so you can see the chrome at its widest.">
            <Button variant="secondary">Long tooltip</Button>
          </Tooltip>
        </Cluster>
      </Example>

      <Example
        title="On a DropdownMenu item (z-index sanity)"
        description="Tooltip's z-layer is above DropdownMenu, so a tooltip on a menu item appears over the menu."
        code={`<DropdownMenu>
  <DropdownMenu.Trigger>
    <Button variant="secondary">Actions</Button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Content>
    <DropdownMenu.Item onSelect={() => {}}>
      <Tooltip content="Permanently remove this record"><span>Delete</span></Tooltip>
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu>`}
      >
        <Cluster gap="md" justify="center">
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <Button variant="secondary">Actions</Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => {}}>Duplicate</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => {}} tone="danger">
                <Tooltip content="Permanently remove this record">
                  <span>Delete</span>
                </Tooltip>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </Cluster>
      </Example>

      <Example
        title="Controlled open"
        description="Drive open externally — rare, but useful for orchestrating with other UI state."
        code={`const [open, setOpen] = useState(false);
<Tooltip content="Controlled" open={open} onOpenChange={setOpen}>
  <Button onClick={() => setOpen(o => !o)}>Toggle</Button>
</Tooltip>`}
      >
        <ControlledExample />
      </Example>
    </DemoLayout>
  );
}

function ControlledExample() {
  const [open, setOpen] = useState(false);
  return (
    <Stack gap="sm" align="center">
      <Tooltip content="Controlled programmatically" open={open} onOpenChange={setOpen}>
        <Button onClick={() => setOpen((prev) => !prev)}>Toggle</Button>
      </Tooltip>
    </Stack>
  );
}
