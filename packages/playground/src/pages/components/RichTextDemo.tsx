import { useCallback, useState } from 'react';
import {
  RichText,
  Lightbox,
  createBlock,
  toggleMark,
  setBlockType,
  Cluster,
  Button,
  Badge,
  type RichDoc,
  type RenderLink,
  type RenderMention,
  type RichTextImageActivateHandler,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const IMAGE_DOC: RichDoc = {
  blocks: [
    createBlock('paragraph', 'Site survey photo — click it, or Tab to it and press Enter:'),
    {
      id: 'img-1',
      type: 'attachment',
      inlines: [],
      status: 'ready',
      src: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1400&q=80',
      mime: 'image/jpeg',
      name: 'lake.jpg',
      alt: 'Mountain lake at dawn',
      width: 320,
    },
  ],
};

// Opens the activated image in a Lightbox. Focusing the trigger before opening
// makes it the element the Lightbox returns focus to on close — a mouse click
// doesn't focus a button in every browser (Safari).
function ImageLightboxExample() {
  const [image, setImage] = useState<{ src: string; alt?: string } | null>(null);
  const onImageActivate = useCallback<RichTextImageActivateHandler>((img, trigger) => {
    trigger.focus();
    setImage(img);
  }, []);
  return (
    <>
      <RichText value={IMAGE_DOC} onImageActivate={onImageActivate} />
      <Lightbox
        open={image !== null}
        onOpenChange={(o) => !o && setImage(null)}
        items={image ? [{ src: image.src, alt: image.alt || 'Attached image' }] : []}
      />
    </>
  );
}

// A consumer-supplied resolver: links pointing at an in-space task URL render as
// a task chip; everything else falls back to a normal <a>.
const TASK_RE = /^https?:\/\/app\.eocrm\/task\/(\d+)/i;
const renderLink: RenderLink = ({ href }, fallback) => {
  const m = TASK_RE.exec(href);
  return m ? <Badge tone="purple">#{m[1]} · Ship the gallery</Badge> : fallback;
};

// A consumer-supplied mention resolver: render each @-mention as an interactive
// member chip instead of the default non-interactive span. Composes with renderLink.
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

// A doc with two @-mentions to show renderMention substitution.
const MENTION_DOC: RichDoc = {
  blocks: [
    {
      id: 'mr',
      type: 'paragraph',
      inlines: [
        { text: 'Assign this to ', marks: [] },
        { text: '@Alice', marks: [{ type: 'mention', id: 'u1', label: 'Alice Nguyen' }] },
        { text: ' and ', marks: [] },
        { text: '@Bob', marks: [{ type: 'mention', id: 'u2', label: 'Bob Martinez' }] },
        { text: '.', marks: [] },
      ],
    },
  ],
};

// A doc with one resolvable task link (→ chip) and one plain external link (→ <a>).
const LINK_DOC: RichDoc = {
  blocks: [
    {
      id: 'lr',
      type: 'paragraph',
      inlines: [
        { text: 'Track ', marks: [] },
        {
          text: 'https://app.eocrm/task/123',
          marks: [{ type: 'link', href: 'https://app.eocrm/task/123' }],
        },
        { text: ' and read more at ', marks: [] },
        {
          text: 'example.com',
          marks: [{ type: 'link', href: 'https://example.com' }],
        },
        { text: '.', marks: [] },
      ],
    },
  ],
};

const SAMPLE: RichDoc = {
  blocks: [
    createBlock('heading', 'Release notes', { level: 1, id: 'h' }),
    {
      id: 'p',
      type: 'paragraph',
      inlines: [
        { text: 'We shipped ', marks: [] },
        { text: 'bold', marks: [{ type: 'bold' }] },
        { text: ' and ', marks: [] },
        { text: 'italic', marks: [{ type: 'italic' }] },
        { text: ' with a ', marks: [] },
        { text: 'link', marks: [{ type: 'link', href: '/docs' }] },
        { text: '.', marks: [] },
      ],
    },
    createBlock('bullet_item', 'First item', { id: 'l1' }),
    createBlock('bullet_item', 'Second item', { id: 'l2' }),
    createBlock('blockquote', 'A quote block.', { id: 'q' }),
  ],
};

export function RichTextDemo() {
  // A live doc the engine transforms operate on — proves the engine without a full editor.
  const [doc, setDoc] = useState<RichDoc>(SAMPLE);

  const boldHeading = () =>
    setDoc(
      (d) =>
        toggleMark(
          d,
          { anchor: { blockId: 'h', offset: 0 }, focus: { blockId: 'h', offset: 13 } },
          { type: 'bold' },
        ).doc,
    );
  const quoteToParagraph = () => setDoc((d) => setBlockType(d, 'q', { type: 'paragraph' }).doc);
  const reset = () => setDoc(SAMPLE);

  return (
    <DemoLayout
      name="RichText"
      componentName="RichText"
      description="Read-only renderer for the in-house rich-text model (paragraphs, headings, lists, quotes, code, and inline marks). The editable RichTextEditor is a later slice."
      files={getComponentFiles('RichText')}
    >
      <Example
        title="Rendering a document"
        description="A RichDoc rendered read-only via the engine's renderer."
        code={`import { RichText, createBlock, type RichDoc } from '@eocrm/design-system';

const doc: RichDoc = {
  blocks: [
    createBlock('heading', 'Release notes', { level: 1, id: 'h' }),
    {
      id: 'p',
      type: 'paragraph',
      inlines: [
        { text: 'We shipped ', marks: [] },
        { text: 'bold', marks: [{ type: 'bold' }] },
        { text: ' and ', marks: [] },
        { text: 'italic', marks: [{ type: 'italic' }] },
        { text: ' with a ', marks: [] },
        { text: 'link', marks: [{ type: 'link', href: '/docs' }] },
        { text: '.', marks: [] },
      ],
    },
    createBlock('bullet_item', 'First item', { id: 'l1' }),
    createBlock('bullet_item', 'Second item', { id: 'l2' }),
    createBlock('blockquote', 'A quote block.', { id: 'q' }),
  ],
};

export function Demo() {
  return <RichText value={doc} />;
}`}
      >
        <RichText value={SAMPLE} />
      </Example>

      <Example
        title="The engine is live"
        description="These buttons run pure engine transforms on a doc and re-render it — no editor yet, just the model + render working together."
        code={`import { useState } from 'react';
import {
  RichText,
  createBlock,
  toggleMark,
  setBlockType,
  Cluster,
  Button,
  type RichDoc,
} from '@eocrm/design-system';

const SAMPLE: RichDoc = {
  blocks: [
    createBlock('heading', 'Release notes', { level: 1, id: 'h' }),
    {
      id: 'p',
      type: 'paragraph',
      inlines: [
        { text: 'We shipped ', marks: [] },
        { text: 'bold', marks: [{ type: 'bold' }] },
        { text: ' and ', marks: [] },
        { text: 'italic', marks: [{ type: 'italic' }] },
        { text: ' with a ', marks: [] },
        { text: 'link', marks: [{ type: 'link', href: '/docs' }] },
        { text: '.', marks: [] },
      ],
    },
    createBlock('bullet_item', 'First item', { id: 'l1' }),
    createBlock('bullet_item', 'Second item', { id: 'l2' }),
    createBlock('blockquote', 'A quote block.', { id: 'q' }),
  ],
};

export function Demo() {
  const [doc, setDoc] = useState<RichDoc>(SAMPLE);

  const boldHeading = () =>
    setDoc(
      (d) =>
        toggleMark(
          d,
          { anchor: { blockId: 'h', offset: 0 }, focus: { blockId: 'h', offset: 13 } },
          { type: 'bold' },
        ).doc,
    );
  const quoteToParagraph = () =>
    setDoc((d) => setBlockType(d, 'q', { type: 'paragraph' }).doc);
  const reset = () => setDoc(SAMPLE);

  return (
    <>
      <Cluster gap="sm">
        <Button size="sm" onClick={boldHeading}>
          Toggle bold heading
        </Button>
        <Button size="sm" onClick={quoteToParagraph}>
          Quote → paragraph
        </Button>
        <Button size="sm" variant="secondary" onClick={reset}>
          Reset
        </Button>
      </Cluster>
      <RichText value={doc} />
    </>
  );
}`}
      >
        <Cluster gap="sm">
          <Button size="sm" onClick={boldHeading}>
            Toggle bold heading
          </Button>
          <Button size="sm" onClick={quoteToParagraph}>
            Quote → paragraph
          </Button>
          <Button size="sm" variant="secondary" onClick={reset}>
            Reset
          </Button>
        </Cluster>
        <RichText value={doc} />
      </Example>

      <Example
        title="Link substitution (renderLink)"
        description="Pass renderLink to swap how a link renders. Here a link to an in-space task URL (https://app.eocrm/task/123) becomes a task chip, while a plain external link stays a normal <a>. The model is unchanged — renderLink is render-time only; serialization still emits a link."
        code={`import { RichText, Badge, type RichDoc, type RenderLink } from '@eocrm/design-system';

const TASK_RE = /^https?:\\/\\/app\\.eocrm\\/task\\/(\\d+)/i;
const renderLink: RenderLink = ({ href }, fallback) => {
  const m = TASK_RE.exec(href);
  return m ? <Badge tone="purple">#{m[1]} · Ship the gallery</Badge> : fallback;
};

const doc: RichDoc = {
  blocks: [
    {
      id: 'lr',
      type: 'paragraph',
      inlines: [
        { text: 'Track ', marks: [] },
        {
          text: 'https://app.eocrm/task/123',
          marks: [{ type: 'link', href: 'https://app.eocrm/task/123' }],
        },
        { text: ' and read more at ', marks: [] },
        {
          text: 'example.com',
          marks: [{ type: 'link', href: 'https://example.com' }],
        },
        { text: '.', marks: [] },
      ],
    },
  ],
};

export function Demo() {
  return <RichText value={doc} renderLink={renderLink} />;
}`}
      >
        <RichText value={LINK_DOC} renderLink={renderLink} />
      </Example>

      <Example
        title="Mentions (@-mention rendering)"
        description="The default @-mention rendering: a non-interactive span in the accent tokens (same --color-accent-bg-subtle / --color-accent / medium weight as EntityChip's fill — no renderMention needed) — no uppercase, no letter-spacing."
        code={`import { RichText, type RichDoc } from '@eocrm/design-system';

const doc: RichDoc = {
  blocks: [
    {
      id: 'mr',
      type: 'paragraph',
      inlines: [
        { text: 'Assign this to ', marks: [] },
        { text: '@Alice', marks: [{ type: 'mention', id: 'u1', label: 'Alice Nguyen' }] },
        { text: ' and ', marks: [] },
        { text: '@Bob', marks: [{ type: 'mention', id: 'u2', label: 'Bob Martinez' }] },
        { text: '.', marks: [] },
      ],
    },
  ],
};

export function Demo() {
  return <RichText value={doc} />;
}`}
      >
        <RichText value={MENTION_DOC} />
      </Example>

      <Example
        title="Mention substitution (renderMention)"
        description="The default rendering above is usually right. Reach for renderMention only when a mention needs to be interactive (click to open a profile) — same contract as renderLink but for mention marks. Badge's sm size keeps the non-uppercase, no-letter-spacing look the default has; composes with renderLink and is render-time only, so serialization still emits the mention mark."
        code={`import { RichText, Badge, type RichDoc, type RenderMention } from '@eocrm/design-system';

const openMention = (id: string, label: string) => alert(\`Mentioned \${label} (\${id})\`);
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

const doc: RichDoc = {
  blocks: [
    {
      id: 'mr',
      type: 'paragraph',
      inlines: [
        { text: 'Assign this to ', marks: [] },
        { text: '@Alice', marks: [{ type: 'mention', id: 'u1', label: 'Alice Nguyen' }] },
        { text: ' and ', marks: [] },
        { text: '@Bob', marks: [{ type: 'mention', id: 'u2', label: 'Bob Martinez' }] },
        { text: '.', marks: [] },
      ],
    },
  ],
};

export function Demo() {
  return <RichText value={doc} renderMention={renderMention} />;
}`}
      >
        <RichText value={MENTION_DOC} renderMention={renderMention} />
      </Example>

      <Example
        title="Inline images open a Lightbox (onImageActivate)"
        description="With onImageActivate set, each inline image is a native button (Tab, Enter/Space, focus ring) named 'Open image: <alt>'. The handler gets { src, alt } and the button; focus it before opening so the Lightbox returns focus there on close. Unset, images are plain <img> — don't attach a delegated onClick instead (mouse-only, no focus return)."
        code={`import { useCallback, useState } from 'react';
import { RichText, Lightbox, type RichTextImageActivateHandler } from '@eocrm/design-system';

export function Demo({ doc }) {
  const [image, setImage] = useState<{ src: string; alt?: string } | null>(null);
  const onImageActivate = useCallback<RichTextImageActivateHandler>((img, trigger) => {
    trigger.focus(); // Lightbox restores focus to the element focused when it opened
    setImage(img);
  }, []);
  return (
    <>
      <RichText value={doc} onImageActivate={onImageActivate} />
      <Lightbox
        open={image !== null}
        onOpenChange={(o) => !o && setImage(null)}
        items={image ? [{ src: image.src, alt: image.alt || 'Attached image' }] : []}
      />
    </>
  );
}`}
      >
        <ImageLightboxExample />
      </Example>
    </DemoLayout>
  );
}
