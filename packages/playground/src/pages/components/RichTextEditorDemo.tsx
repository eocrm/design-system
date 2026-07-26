import { useState } from 'react';
import {
  RichTextEditor,
  docFromText,
  fromHtml,
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

// A public (non-inlined) image served at a stable relative URL — safeHref allows it,
// so it renders as a real preview. (An imported src/assets SVG would be inlined as a
// data: URL, which safeHref blocks.) BASE_URL keeps it correct on GitHub Pages.
const sampleEmbedSrc = `${import.meta.env.BASE_URL}sample-embed.svg`;

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
    size="sm"
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
  const [autoDoc, setAutoDoc] = useState<RichDoc>(() => docFromText(''));
  const [linkDoc, setLinkDoc] = useState<RichDoc>(docFromText('Read the docs and visit our site.'));
  const [importDoc, setImportDoc] = useState<RichDoc>(() =>
    // Seeded via fromHtml so it carries an embedded image — this editor has a toolbar
    // but NO blockControls, demonstrating that a pasted/imported image is still
    // resizable: hover it and drag the corner handle.
    fromHtml(
      '<h1>Imported</h1><p>This editor was <strong>seeded</strong> from HTML — paste rich HTML to import more. Hover the image and drag its corner to resize (no block controls needed).</p>' +
        `<img src="${sampleEmbedSrc}" width="280" alt="Imported sample image" />`,
    ),
  );
  const [blockDoc, setBlockDoc] = useState<RichDoc>(() =>
    fromMarkdown(
      '# Block controls\n\nHover a line for the ＋ / ⠿ gutter.\n\n- first item\n- second item\n\n> Drag the handle to reorder, or open the menu to turn into / duplicate / delete.',
    ),
  );
  const [mentionDoc, setMentionDoc] = useState<RichDoc>(() => docFromText('Assign this to '));
  const [mentionRenderDoc, setMentionRenderDoc] = useState<RichDoc>(() =>
    docFromText('Assign this to '),
  );
  const [autolinkDoc, setAutolinkDoc] = useState<RichDoc>(() =>
    docFromText('Type a task URL below to watch it autolink. '),
  );
  const [colorDoc, setColorDoc] = useState<RichDoc>(() =>
    fromHtml(
      '<p>Select a word and use the toolbar <strong>Text color</strong> or <strong>Highlight</strong> button to pick a color from the palette. Each color is a small named badge; choosing Default clears the color.</p>' +
        '<p>With block controls, open the ⠿ menu → Text color / Highlight to color the whole block at once.</p>',
    ),
  );
  const [uploadDoc, setUploadDoc] = useState<RichDoc>(() =>
    // Seed an EMBEDDED image (real URL + explicit width) so its block-menu
    // "Configure" exposes the width slider. Uploaded files below come in as object
    // URLs (rendered as chips) with no dimensions, so they get no width control.
    fromHtml(
      '<p>Paste a screenshot, or use the toolbar button to attach a file.</p>' +
        `<img src="${sampleEmbedSrc}" width="320" alt="Embedded sample image" />`,
    ),
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
        description='The toolbar prop adds a formatting bar above the editor. Keyboard shortcuts and toolbar buttons both work — select text to format it, or toggle a mark at a collapsed caret and then type to apply it to new text. Enter on an empty list item exits the list; Tab / Shift+Tab indent and outdent list items. Undo/redo: ⌘/Ctrl+Z and ⌘/Ctrl+Shift+Z (or the toolbar Undo/Redo buttons). Type "# ", "- ", "1. ", or "> " at the start of a line to auto-format. The toolbar also includes an emoji button that opens a searchable emoji picker and inserts the chosen emoji at the caret.'
        code={`import { useState } from 'react';
import {
  RichTextEditor,
  docFromText,
  toHtml,
  toMarkdown,
  Code,
  Text,
  Stack,
  type RichDoc,
} from '@eocrm/design-system';

export function Demo() {
  const [doc, setDoc] = useState<RichDoc>(
    docFromText('Type here. Select a word and press ⌘B.'),
  );
  return (
    <Stack gap="sm">
      <RichTextEditor value={doc} onChange={setDoc} toolbar placeholder="Write a note…" />
      <Text size="sm" tone="muted">
        Toolbar + shortcuts: ⌘/Ctrl+B bold · I italic · U underline · ⇧X strike
      </Text>
      <Text size="sm" tone="muted">
        HTML → <Code>{toHtml(doc)}</Code>
      </Text>
      <Text size="sm" tone="muted">
        Markdown → <Code>{toMarkdown(doc).replace(/\\n/g, '⏎')}</Code>
      </Text>
    </Stack>
  );
}`}
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
        title='Focus-gated toolbar (toolbar="auto")'
        description='toolbar="auto" shows the formatting bar only when the editor is focused or non-empty — ideal for a compact comment composer. Click into the empty editor below: the bar appears; click away (while still empty) and it hides. Crucially, the bar stays up while the editor’s own overlays are open — focus the empty editor, click the Link button (or ⌘/Ctrl+K): the link editor opens and the bar does NOT collapse, even though focus moved into the link popover. The editable is never remounted as the bar toggles, so there is no focus/selection loss.'
        code={`import { useState } from 'react';
import { RichTextEditor, docFromText, type RichDoc } from '@eocrm/design-system';

export function Demo() {
  const [doc, setDoc] = useState<RichDoc>(() => docFromText(''));
  return (
    <RichTextEditor
      value={doc}
      onChange={setDoc}
      toolbar="auto"
      placeholder="Add a comment… (toolbar appears on focus)"
    />
  );
}`}
      >
        <RichTextEditor
          value={autoDoc}
          onChange={setAutoDoc}
          toolbar="auto"
          placeholder="Add a comment… (toolbar appears on focus)"
        />
      </Example>

      <Example
        title="Block controls"
        description="Set blockControls for a per-block gutter on hover/focus: ＋ inserts a block below, ⠿ drags to reorder (subtree-aware for nested lists) and opens a menu (turn into / duplicate / move / delete). Keyboard: Shift+F10 opens the menu, ⌘/Ctrl+⇧↑/↓ move the block, ⌘/Ctrl+D duplicates. Works with or without the toolbar. Grab anywhere on the gutter to drag the whole row — it lifts and the other rows slide apart to open its slot (clamped to the editor); text stays selectable."
        code={`import { useState } from 'react';
import { RichTextEditor, fromMarkdown, type RichDoc } from '@eocrm/design-system';

export function Demo() {
  const [doc, setDoc] = useState<RichDoc>(() =>
    fromMarkdown(
      '# Block controls\\n\\nHover a line for the ＋ / ⠿ gutter.\\n\\n- first item\\n- second item\\n\\n> Drag the handle to reorder, or open the menu to turn into / duplicate / delete.',
    ),
  );
  return (
    <RichTextEditor value={doc} onChange={setDoc} blockControls placeholder="Write…" />
  );
}`}
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
        description="Provide upload={{ onUpload }} to enable a toolbar attach button and clipboard-file paste. Images served from a real URL render inline; other files (and object-URL uploads) show as a download chip. Uploading shows a spinner; a rejected onUpload shows Retry/Remove. Wire onUploadingChange to your submit button. (This demo uses a mock uploader that returns a local object URL.) Open any attachment's block menu (the ⠿ handle) and choose Configure to set alt text, alignment, replace the file, or open/download. The width slider appears only for an image that renders as a preview (the seeded embedded image above) — an uploaded object-URL image shows as a chip and isn't resizable. You can also drag the handle on the image's bottom-right corner to resize it directly; the image resizes live as you drag (and the whole drag is a single undo)."
        code={`import { useState } from 'react';
import { RichTextEditor, fromHtml, type RichDoc } from '@eocrm/design-system';

// Mock uploader: resolve to a local object URL after a short delay (demo only).
const mockUpload = (file: File) =>
  new Promise<{ url: string; mime: string; name: string }>((resolve) =>
    setTimeout(
      () => resolve({ url: URL.createObjectURL(file), mime: file.type, name: file.name }),
      600,
    ),
  );

export function Demo() {
  const [doc, setDoc] = useState<RichDoc>(() =>
    fromHtml(
      '<p>Paste a screenshot, or use the toolbar button to attach a file.</p>' +
        '<img src="https://example.com/sample.svg" width="320" alt="Embedded sample image" />',
    ),
  );
  return (
    <RichTextEditor
      value={doc}
      onChange={setDoc}
      toolbar
      blockControls
      upload={{ onUpload: mockUpload, accept: 'image/*,.pdf' }}
      placeholder="Write…"
    />
  );
}`}
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
        code={`import { useState } from 'react';
import { RichTextEditor, docFromText, type RichDoc } from '@eocrm/design-system';

export function Demo() {
  const [doc, setDoc] = useState<RichDoc>(docFromText('Read the docs and visit our site.'));
  return (
    <RichTextEditor
      value={doc}
      onChange={setDoc}
      toolbar
      placeholder="Select text, then ⌘K…"
    />
  );
}`}
      >
        <RichTextEditor
          value={linkDoc}
          onChange={setLinkDoc}
          toolbar
          placeholder="Select text, then ⌘K…"
        />
      </Example>

      <Example
        title="Text & highlight color"
        description="Select text and use the toolbar's separate Text color and Highlight buttons to apply a color. Each picker is a grid of small named badges that leads with the default brand colors (gray, red, green, amber, blue), then the rest of the categorical palette. Choosing Default clears the color. With blockControls enabled, open the ⠿ block menu and choose Text color or Highlight to color the entire block at once. Colors persist in the document and round-trip through HTML serialization, but are dropped in Markdown (like alignment and width)."
        code={`import { useState } from 'react';
import { RichTextEditor, fromHtml, type RichDoc } from '@eocrm/design-system';

export function Demo() {
  const [doc, setDoc] = useState<RichDoc>(() =>
    fromHtml(
      '<p>Select a word and use the toolbar <strong>Text color</strong> or <strong>Highlight</strong> button to pick a color from the palette. Each color is a small named badge; choosing Default clears the color.</p>' +
        '<p>With block controls, open the ⠿ menu → Text color / Highlight to color the whole block at once.</p>',
    ),
  );
  return (
    <RichTextEditor
      value={doc}
      onChange={setDoc}
      toolbar
      blockControls
      placeholder="Select text, then use the Text color / Highlight buttons…"
    />
  );
}`}
      >
        <RichTextEditor
          value={colorDoc}
          onChange={setColorDoc}
          toolbar
          blockControls
          placeholder="Select text, then use the Text color / Highlight buttons…"
        />
      </Example>

      <Example
        title="Import (HTML / Markdown) + rich paste"
        description="Seed the editor from stored HTML or Markdown with fromHtml / fromMarkdown, and paste rich HTML (from the web, Word, Google Docs) straight into the editor — it becomes formatted content, not plain text. This editor has a toolbar but no blockControls, yet the imported image is still resizable: hover it and drag the bottom-right corner handle."
        code={`import { useState } from 'react';
import { RichTextEditor, fromHtml, type RichDoc } from '@eocrm/design-system';

export function Demo() {
  const [doc, setDoc] = useState<RichDoc>(() =>
    fromHtml(
      '<h1>Imported</h1><p>This editor was <strong>seeded</strong> from HTML — paste rich HTML to import more. Hover the image and drag its corner to resize (no block controls needed).</p>' +
        '<img src="https://example.com/sample.svg" width="280" alt="Imported sample image" />',
    ),
  );
  return (
    <RichTextEditor value={doc} onChange={setDoc} toolbar placeholder="Paste rich HTML here…" />
  );
}`}
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
        description='Pass a mentions prop with onQuery to enable @-mentions. Type "@" then a name (e.g. "@al") to open the candidate menu; ↑/↓ to move, Enter/Tab to insert a chip, Esc to dismiss. The chip carries the id; Backspace removes the whole chip. This is the default rendering — a non-interactive span in the accent tokens (same fill as EntityChip, no uppercase).'
        code={`import { useState } from 'react';
import { RichTextEditor, docFromText, type RichDoc } from '@eocrm/design-system';

const TEAM = [
  { id: 'u1', label: 'Alice Nguyen', description: 'alice@eocrm.dev' },
  { id: 'u2', label: 'Bob Martinez', description: 'bob@eocrm.dev' },
  { id: 'u3', label: 'Carlos Whitfield', description: 'carlos@eocrm.dev' },
  { id: 'u4', label: 'Dana Lee', description: 'dana@eocrm.dev' },
];

const queryTeam = (q: string) =>
  Promise.resolve(TEAM.filter((m) => m.label.toLowerCase().includes(q.toLowerCase())));

export function Demo() {
  const [doc, setDoc] = useState<RichDoc>(() => docFromText('Assign this to '));
  return (
    <RichTextEditor
      value={doc}
      onChange={setDoc}
      toolbar
      placeholder="Type @ to mention someone…"
      mentions={{ onQuery: queryTeam }}
    />
  );
}`}
      >
        <RichTextEditor
          value={mentionDoc}
          onChange={setMentionDoc}
          toolbar
          placeholder="Type @ to mention someone…"
          mentions={{ onQuery: queryTeam }}
        />
      </Example>

      <Example
        title="Mention substitution (renderMention)"
        description="The default rendering above is usually right. Reach for renderMention only when a mention needs to be interactive (click one below to open a profile) — it composes with renderLink and is render-time only, so serialization keeps the mention mark. Badge's sm size keeps the non-uppercase, no-letter-spacing look the default has."
        code={`import { useState } from 'react';
import {
  RichTextEditor,
  docFromText,
  Badge,
  type RichDoc,
  type RenderMention,
} from '@eocrm/design-system';

const TEAM = [
  { id: 'u1', label: 'Alice Nguyen', description: 'alice@eocrm.dev' },
  { id: 'u2', label: 'Bob Martinez', description: 'bob@eocrm.dev' },
  { id: 'u3', label: 'Carlos Whitfield', description: 'carlos@eocrm.dev' },
  { id: 'u4', label: 'Dana Lee', description: 'dana@eocrm.dev' },
];

const queryTeam = (q: string) =>
  Promise.resolve(TEAM.filter((m) => m.label.toLowerCase().includes(q.toLowerCase())));

const openMention = (id: string, label: string) =>
  alert(\`Mentioned \${label} (\${id})\`);

const renderMention: RenderMention = ({ id, label }) => (
  <Badge
    tone="info"
    size="sm"
    role="button"
    tabIndex={0}
    title={\`Open \${label}'s profile\`}
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

export function Demo() {
  const [doc, setDoc] = useState<RichDoc>(() => docFromText('Assign this to '));
  return (
    <RichTextEditor
      value={doc}
      onChange={setDoc}
      toolbar
      placeholder="Type @ to mention someone…"
      mentions={{ onQuery: queryTeam }}
      renderMention={renderMention}
    />
  );
}`}
      >
        <RichTextEditor
          value={mentionRenderDoc}
          onChange={setMentionRenderDoc}
          toolbar
          placeholder="Type @ to mention someone…"
          mentions={{ onQuery: queryTeam }}
          renderMention={renderMention}
        />
      </Example>

      <Example
        title="Autolink + link previews"
        description="Autolink is on by default — type or paste a URL like https://app.eocrm/task/123 (add a trailing space) and it becomes a link. With renderLink, a resolvable task URL renders as an atomic task chip: the caret sits before/after it and Backspace deletes the whole chip in one step. It's render-time only — serialization still emits a plain link. A plain external URL stays an editable <a>."
        code={`import { useState } from 'react';
import {
  RichTextEditor,
  docFromText,
  Badge,
  Code,
  Text,
  Stack,
  type RichDoc,
  type RenderLink,
} from '@eocrm/design-system';

const TASK_RE = /^https?:\\/\\/app\\.eocrm\\/task\\/(\\d+)/i;

const renderLink: RenderLink = ({ href }, fallback) => {
  const m = TASK_RE.exec(href);
  return m ? <Badge tone="purple">#{m[1]} · Ship the gallery</Badge> : fallback;
};

export function Demo() {
  const [doc, setDoc] = useState<RichDoc>(() =>
    docFromText('Type a task URL below to watch it autolink. '),
  );
  return (
    <Stack gap="sm">
      <RichTextEditor
        value={doc}
        onChange={setDoc}
        toolbar
        renderLink={renderLink}
        placeholder="Type https://app.eocrm/task/123 then a space…"
      />
      <Text size="sm" tone="muted">
        Try typing or pasting <Code>https://app.eocrm/task/123</Code> (task chip) and{' '}
        <Code>https://example.com</Code> (plain link).
      </Text>
    </Stack>
  );
}`}
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
        code={`import { RichTextEditor, docFromText } from '@eocrm/design-system';

export function Demo() {
  return (
    <RichTextEditor value={docFromText('Read-only content.')} onChange={() => {}} readOnly />
  );
}`}
      >
        <RichTextEditor value={docFromText('Read-only content.')} onChange={() => {}} readOnly />
      </Example>
    </DemoLayout>
  );
}
