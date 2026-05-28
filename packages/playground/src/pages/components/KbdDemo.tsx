import { Button, Cluster, Kbd, Stack, Text, Tooltip, TopBar } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

/**
 * Bordered preview frame for the TopBar.Search example — the sticky TopBar
 * needs a scrollable parent so it anchors inside the demo card rather than
 * to the page-level scroller.
 */
function TopBarStage({ children, height = 120 }: { children: React.ReactNode; height?: number }) {
  return (
    <div
      style={{
        height,
        overflow: 'auto',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width) solid var(--color-border)',
        background: 'var(--color-bg-subtle)',
      }}
    >
      {children}
    </div>
  );
}

export function KbdDemo() {
  return (
    <DemoLayout
      name="Kbd"
      componentName="Kbd"
      description="Inline keyboard-shortcut display: one <kbd> chip per key joined with a faint + separator. Use for shortcut hints in tooltips, command palettes, search inputs, and help/shortcut sheets. The component does NOT platform-translate — pass the literal labels you want shown."
      files={getComponentFiles('Kbd')}
    >
      <Example
        title="Single key"
        description="A one-entry keys array renders a single chip with no separator. Useful for Esc / Enter / ? hints."
        code={`<Kbd keys={['Esc']} />
<Kbd keys={['Enter']} />
<Kbd keys={['?']} />`}
      >
        <Cluster gap="sm" align="center">
          <Kbd keys={['Esc']} />
          <Kbd keys={['Enter']} />
          <Kbd keys={['?']} />
        </Cluster>
      </Example>

      <Example
        title="Two-key combo"
        description="Multiple entries are joined by an inline + separator. Pass the literal labels — '⌘' on macOS, 'Ctrl' elsewhere; the app layer picks."
        code={`<Kbd keys={['⌘', 'K']} />
<Kbd keys={['Ctrl', 'C']} />`}
      >
        <Cluster gap="sm" align="center">
          <Kbd keys={['⌘', 'K']} />
          <Kbd keys={['Ctrl', 'C']} />
        </Cluster>
      </Example>

      <Example
        title="Three-key combo"
        description="Any number of keys; n − 1 separators are rendered between them."
        code={`<Kbd keys={['Ctrl', 'Shift', 'P']} />
<Kbd keys={['⌘', 'Shift', 'F']} />`}
      >
        <Cluster gap="sm" align="center">
          <Kbd keys={['Ctrl', 'Shift', 'P']} />
          <Kbd keys={['⌘', 'Shift', 'F']} />
        </Cluster>
      </Example>

      <Example
        title="Size variants"
        description="`sm` (default, 18px tall) is the inline-chrome size — matches TopBar.Search. `md` (24px tall) is the standalone shortcut size for command-palette / shortcut-sheet UI."
        code={`<Kbd keys={['⌘', 'K']} size="sm" />
<Kbd keys={['⌘', 'K']} size="md" />`}
      >
        <Cluster gap="md" align="center">
          <Kbd keys={['⌘', 'K']} size="sm" />
          <Kbd keys={['⌘', 'K']} size="md" />
        </Cluster>
      </Example>

      <Example
        title="Inline in prose"
        description="The wrapper is `display: inline-flex` with `vertical-align: baseline`, so a Kbd embedded inside a `<Text>` paragraph sits on the text baseline without breaking flow."
        code={`<Text>
  Press <Kbd keys={['⌘', 'K']} /> to open the command palette.
</Text>`}
      >
        <Text>
          Press <Kbd keys={['⌘', 'K']} /> to open the command palette.
        </Text>
      </Example>

      <Example
        title="Inside a Tooltip"
        description="The canonical Tooltip + Kbd composition — the tooltip body labels the action, the Kbd shows the shortcut."
        code={`<Tooltip
  content={
    <>
      Save <Kbd keys={['⌘', 'S']} />
    </>
  }
>
  <Button>Save</Button>
</Tooltip>`}
      >
        <Cluster gap="sm" align="center">
          <Tooltip
            content={
              <>
                Save <Kbd keys={['⌘', 'S']} />
              </>
            }
          >
            <Button>Save</Button>
          </Tooltip>
        </Cluster>
      </Example>

      <Example
        title="Inside TopBar.Search"
        description="TopBar.Search renders its `hotkey` prop via <Kbd size='sm'>. Pass an array for multi-key combos; a single string is also accepted and renders as one chip."
        code={`<TopBar>
  <TopBar.Start>
    <TopBar.Search placeholder="Search…" hotkey={['⌘', 'K']} />
  </TopBar.Start>
</TopBar>`}
      >
        <TopBarStage>
          <TopBar>
            <TopBar.Start>
              <TopBar.Search placeholder="Search…" hotkey={['⌘', 'K']} />
            </TopBar.Start>
          </TopBar>
        </TopBarStage>
      </Example>

      <Example
        title="Custom aria-label"
        description="The wrapper's default aria-label is keys.join(' + ') — fine for most shortcuts, but symbol keys read poorly. Override with a verbal description when the raw glyphs are unintuitive."
        code={`<Kbd keys={['⌘', 'K']} aria-label="Open command palette" />`}
      >
        <Stack gap="xs" align="start">
          <Kbd keys={['⌘', 'K']} aria-label="Open command palette" />
          <Text size="sm" tone="muted">
            Screen readers announce "Open command palette" instead of "⌘ + K".
          </Text>
        </Stack>
      </Example>
    </DemoLayout>
  );
}
