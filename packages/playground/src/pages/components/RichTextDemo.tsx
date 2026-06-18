import { useState } from 'react';
import {
  RichText,
  createBlock,
  toggleMark,
  setBlockType,
  Cluster,
  Button,
  type RichDoc,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

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
        code={`<RichText value={doc} />`}
      >
        <RichText value={SAMPLE} />
      </Example>

      <Example
        title="The engine is live"
        description="These buttons run pure engine transforms on a doc and re-render it — no editor yet, just the model + render working together."
        code={`const r = toggleMark(doc, range, { type: 'bold' });
setDoc(r.doc);`}
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
    </DemoLayout>
  );
}
