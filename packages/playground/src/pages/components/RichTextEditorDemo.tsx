import { useState } from 'react';
import { RichTextEditor, docFromText, Text, Stack, type RichDoc } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function RichTextEditorDemo() {
  const [doc, setDoc] = useState<RichDoc>(docFromText('Type here. Select a word and press ⌘B.'));
  const [linkDoc, setLinkDoc] = useState<RichDoc>(docFromText('Read the docs and visit our site.'));

  return (
    <DemoLayout
      name="RichTextEditor"
      componentName="RichTextEditor"
      description="Controlled contentEditable rich-text editor over the in-house engine. Type, Enter/Backspace for structure, ⌘/Ctrl+B/I/U + ⌘/Ctrl+⇧X for marks. Add toolbar for a built-in formatting bar with mark buttons, block-type menu, and list toggles."
      files={getComponentFiles('RichTextEditor')}
    >
      <Example
        title="Editable with toolbar"
        description="The toolbar prop adds a formatting bar above the editor. Keyboard shortcuts and toolbar buttons both work — select text to format it, or toggle a mark at a collapsed caret and then type to apply it to new text. Enter on an empty list item exits the list; Tab / Shift+Tab indent and outdent list items."
        code={`const [doc, setDoc] = useState(docFromText('…'));
<RichTextEditor value={doc} onChange={setDoc} toolbar placeholder="Write a note…" />`}
      >
        <Stack gap="sm">
          <RichTextEditor value={doc} onChange={setDoc} toolbar placeholder="Write a note…" />
          <Text size="sm" tone="muted">
            Toolbar + shortcuts: ⌘/Ctrl+B bold · I italic · U underline · ⇧X strike
          </Text>
        </Stack>
      </Example>

      <Example
        title="Links"
        description="Select text and press ⌘/Ctrl+K (or the toolbar link button) to open the link editor; type a URL and Apply. With the caret inside a link the URL is pre-filled and Remove appears. With no selection, the URL is inserted as linked text. Esc or a click outside cancels."
        code={`const [doc, setDoc] = useState(docFromText('…'));
<RichTextEditor value={doc} onChange={setDoc} toolbar />`}
      >
        <RichTextEditor
          value={linkDoc}
          onChange={setLinkDoc}
          toolbar
          placeholder="Select text, then ⌘K…"
        />
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
