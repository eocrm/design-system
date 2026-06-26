import { useState } from 'react';
import {
  RichTextEditor,
  docFromText,
  fromMarkdown,
  toHtml,
  toMarkdown,
  Badge,
  Code,
  Text,
  Stack,
  type RichDoc,
  type RenderLink,
  type RenderMention,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

// A consumer-supplied resolver: a link to an in-space task URL renders as a task
// chip; everything else falls back to a normal <a>. Same resolver works in the
// read-only <RichText> viewer and here in the editor (as an atomic chip).
const TASK_RE = /^https?:\/\/app\.eocrm\/task\/(\d+)/i;
const renderLink: RenderLink = ({ href }, fallback) => {
  const m = TASK_RE.exec(href);
  return m ? <Badge tone="purple">#{m[1]} · Ship the gallery</Badge> : fallback;
};

// A consumer-supplied mention resolver: render each @-mention as an interactive
// member chip (here a clickable Badge / popover trigger) instead of the default
// non-interactive span. Composes with renderLink. Render-time only — the model
// still carries the mention mark, so serialization is unchanged.
const openMention = (id: string, label: string) => alert(`Mentioned ${label} (${id})`);
const renderMention: RenderMention = ({ id, label }) => (
  <Badge
    tone="info"
    role="button"
    tabIndex={0}
    title={`Open ${label}'s profile`}
    onClick={() => openMention(id, label)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMention(id, label);
      }
    }}
  >
    @{label}
  </Badge>
);

export function RichTextEditorDemo() {
  const [doc, setDoc] = useState<RichDoc>(docFromText('Type here. Select a word and press ⌘B.'));
  const [linkDoc, setLinkDoc] = useState<RichDoc>(docFromText('Read the docs and visit our site.'));
  const [importDoc, setImportDoc] = useState<RichDoc>(() =>
    fromMarkdown(
      '# Imported\n\nThis editor was **seeded** from Markdown — paste rich HTML to import more.',
    ),
  );
  const [blockDoc, setBlockDoc] = useState<RichDoc>(() =>
    fromMarkdown(
      '# Block controls\n\nHover a line for the ＋ / ⠿ gutter.\n\n- first item\n- second item\n\n> Drag the handle to reorder, or open the menu to turn into / duplicate / delete.',
    ),
  );
  const [mentionDoc, setMentionDoc] = useState<RichDoc>(() => docFromText('Assign this to '));
  const [autolinkDoc, setAutolinkDoc] = useState<RichDoc>(() =>
    docFromText('Type a task URL below to watch it autolink. '),
  );
  const [uploadDoc, setUploadDoc] = useState<RichDoc>(() =>
    docFromText('Paste a screenshot, or use the toolbar button to attach a file. '),
  );
  // Mock uploader: resolve to a local object URL after a short delay (demo only).
  const mockUpload = (file: File) =>
    new Promise<{ url: string; mime: string; name: string }>((resolve) =>
      setTimeout(
        () => resolve({ url: URL.createObjectURL(file), mime: file.type, name: file.name }),
        600,
      ),
    );
  const TEAM = [
    { id: 'u1', label: 'Alice Nguyen', description: 'alice@eocrm.dev' },
    { id: 'u2', label: 'Bob Martinez', description: 'bob@eocrm.dev' },
    { id: 'u3', label: 'Carlos Whitfield', description: 'carlos@eocrm.dev' },
    { id: 'u4', label: 'Dana Lee', description: 'dana@eocrm.dev' },
  ];
  const queryTeam = (q: string) =>
    Promise.resolve(TEAM.filter((m) => m.label.toLowerCase().includes(q.toLowerCase())));

  return (
    <DemoLayout
      name="RichTextEditor"
      componentName="RichTextEditor"
      description="Controlled contentEditable rich-text editor over the in-house engine. Type, Enter/Backspace for structure, ⌘/Ctrl+B/I/U + ⌘/Ctrl+⇧X for marks. Add toolbar for a built-in formatting bar with mark buttons, block-type menu, and list toggles."
      files={getComponentFiles('RichTextEditor')}
    >
      <Example
        title="Editable with toolbar"
        description='The toolbar prop adds a formatting bar above the editor. Keyboard shortcuts and toolbar buttons both work — select text to format it, or toggle a mark at a collapsed caret and then type to apply it to new text. Enter on an empty list item exits the list; Tab / Shift+Tab indent and outdent list items. Undo/redo: ⌘/Ctrl+Z and ⌘/Ctrl+Shift+Z (or the toolbar Undo/Redo buttons). Type "# ", "- ", "1. ", or "> " at the start of a line to auto-format.'
        code={`const [doc, setDoc] = useState(docFromText('…'));
<RichTextEditor value={doc} onChange={setDoc} toolbar placeholder="Write a note…" />`}
      >
        <Stack gap="sm">
          <RichTextEditor value={doc} onChange={setDoc} toolbar placeholder="Write a note…" />
          <Text size="sm" tone="muted">
            Toolbar + shortcuts: ⌘/Ctrl+B bold · I italic · U underline · ⇧X strike
          </Text>
          <Text size="sm" tone="muted">
            HTML → <Code>{toHtml(doc)}</Code>
          </Text>
          <Text size="sm" tone="muted">
            Markdown → <Code>{toMarkdown(doc).replace(/\n/g, '⏎')}</Code>
          </Text>
        </Stack>
      </Example>

      <Example
        title="Block controls"
        description="Set blockControls for a per-block gutter on hover/focus: ＋ inserts a block below, ⠿ drags to reorder (subtree-aware for nested lists) and opens a menu (turn into / duplicate / move / delete). Keyboard: Shift+F10 opens the menu, ⌘/Ctrl+⇧↑/↓ move the block, ⌘/Ctrl+D duplicates. Works with or without the toolbar."
        code={`const [doc, setDoc] = useState(fromMarkdown('…'));
<RichTextEditor value={doc} onChange={setDoc} blockControls placeholder="Write…" />`}
      >
        <RichTextEditor
          value={blockDoc}
          onChange={setBlockDoc}
          blockControls
          placeholder="Write…"
        />
      </Example>

      <Example
        title="File upload"
        description="Provide upload={{ onUpload }} to enable a toolbar attach button and clipboard-file paste. Images render inline; other files as a download chip. Uploading shows a spinner; a rejected onUpload shows Retry/Remove. Wire onUploadingChange to your submit button. (This demo uses a mock uploader that returns a local object URL.) Select an uploaded image and click the ⚙ (or the block menu's Configure) to set alt text, alignment, and width, or replace the file."
        code={`<RichTextEditor value={doc} onChange={setDoc} toolbar blockControls
  upload={{ onUpload: (file) => uploadToServer(file) }} />`}
      >
        <RichTextEditor
          value={uploadDoc}
          onChange={setUploadDoc}
          toolbar
          blockControls
          upload={{ onUpload: mockUpload, accept: 'image/*,.pdf' }}
          placeholder="Write…"
        />
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
        title="Import (HTML / Markdown) + rich paste"
        description="Seed the editor from stored HTML or Markdown with fromHtml / fromMarkdown, and paste rich HTML (from the web, Word, Google Docs) straight into the editor — it becomes formatted content, not plain text."
        code={`import { fromMarkdown } from '@eocrm/design-system'; // (fromHtml too — same API)
const [doc, setDoc] = useState(() => fromMarkdown('# Imported\\n\\n- one\\n- two'));
<RichTextEditor value={doc} onChange={setDoc} toolbar />`}
      >
        <RichTextEditor
          value={importDoc}
          onChange={setImportDoc}
          toolbar
          placeholder="Paste rich HTML here…"
        />
      </Example>

      <Example
        title="Mentions (@-autocomplete)"
        description='Pass a mentions prop with onQuery to enable @-mentions. Type "@" then a name (e.g. "@al") to open the candidate menu; ↑/↓ to move, Enter/Tab to insert a chip, Esc to dismiss. The chip carries the id; Backspace removes the whole chip. Pass renderMention to swap the default span for an interactive member chip (click one below) — it composes with renderLink and is render-time only, so serialization keeps the mention mark.'
        code={`// Render an @-mention as your own interactive, keyboard-accessible chip.
const renderMention: RenderMention = ({ id, label }) => (
  <Badge
    tone="info"
    role="button"
    tabIndex={0}
    onClick={() => openProfile(id)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProfile(id); }
    }}
  >
    @{label}
  </Badge>
);
<RichTextEditor value={doc} onChange={setDoc} toolbar
  mentions={{ onQuery: (q) => searchUsers(q) }}
  renderMention={renderMention} />`}
      >
        <RichTextEditor
          value={mentionDoc}
          onChange={setMentionDoc}
          toolbar
          placeholder="Type @ to mention someone…"
          mentions={{ onQuery: queryTeam }}
          renderMention={renderMention}
        />
      </Example>

      <Example
        title="Autolink + link previews"
        description="Autolink is on by default — type or paste a URL like https://app.eocrm/task/123 (add a trailing space) and it becomes a link. With renderLink, a resolvable task URL renders as an atomic task chip: the caret sits before/after it and Backspace deletes the whole chip in one step. It's render-time only — serialization still emits a plain link. A plain external URL stays an editable <a>."
        code={`const renderLink: RenderLink = ({ href }, fallback) => {
  const m = /^https?:\\/\\/app\\.eocrm\\/task\\/(\\d+)/i.exec(href);
  return m ? <Badge tone="purple">#{m[1]} · Ship the gallery</Badge> : fallback;
};
// autolink is on by default; pass renderLink to preview resolvable links as chips
<RichTextEditor value={doc} onChange={setDoc} toolbar renderLink={renderLink} />`}
      >
        <Stack gap="sm">
          <RichTextEditor
            value={autolinkDoc}
            onChange={setAutolinkDoc}
            toolbar
            renderLink={renderLink}
            placeholder="Type https://app.eocrm/task/123 then a space…"
          />
          <Text size="sm" tone="muted">
            Try typing or pasting <Code>https://app.eocrm/task/123</Code> (task chip) and{' '}
            <Code>https://example.com</Code> (plain link).
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
