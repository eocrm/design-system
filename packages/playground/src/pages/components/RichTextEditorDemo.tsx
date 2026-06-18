import { useState } from 'react';
import { RichTextEditor, docFromText, Text, Stack, type RichDoc } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function RichTextEditorDemo() {
  const [doc, setDoc] = useState<RichDoc>(docFromText('Type here. Select a word and press ⌘B.'));

  return (
    <DemoLayout
      name="RichTextEditor"
      componentName="RichTextEditor"
      description="Controlled contentEditable rich-text editor over the in-house engine. Type, Enter/Backspace for structure, ⌘/Ctrl+B/I/U + ⌘/Ctrl+⇧X for marks. No toolbar yet (later slice)."
      files={getComponentFiles('RichTextEditor')}
    >
      <Example
        title="Editable"
        description="Type to edit; select text and use ⌘B / ⌘I / ⌘U / ⌘⇧X to format. Enter splits a block; Backspace at a block start merges."
        code={`const [doc, setDoc] = useState(docFromText('…'));
<RichTextEditor value={doc} onChange={setDoc} placeholder="Write a note…" />`}
      >
        <Stack gap="sm">
          <RichTextEditor value={doc} onChange={setDoc} placeholder="Write a note…" />
          <Text size="sm" tone="muted">
            Shortcuts: ⌘/Ctrl+B bold · I italic · U underline · ⇧X strike
          </Text>
        </Stack>
      </Example>

      <Example
        title="Read-only"
        description="Same surface, non-editable (prefer <RichText> for pure display)."
        code={`<RichTextEditor value={doc} onChange={() => {}} readOnly />`}
      >
        <RichTextEditor value={docFromText('Read-only content.')} onChange={() => {}} readOnly />
      </Example>
    </DemoLayout>
  );
}
