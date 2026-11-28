// The lazy Prism chunk resolving swaps a code block's text node for token spans
// without a commit; the caret inside that block must stay where it was (DS-104).
import { act, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { RichTextEditor } from './RichTextEditor';
import { I18nProvider } from '../../i18n';
import { readSelection } from './selection';
import type { RichDoc } from '../RichText/engine/model';

let release!: () => void;
const gate = new Promise<void>((r) => (release = r));
vi.mock('../CodeBlock/highlight', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../CodeBlock/highlight')>();
  await gate;
  return actual;
});

it('keeps the caret at the same model point when highlight tokens arrive', async () => {
  const doc: RichDoc = {
    blocks: [
      {
        id: 'c',
        type: 'code_block',
        inlines: [{ text: 'const a = 1;', marks: [] }],
        language: 'typescript',
      },
      { id: 'p', type: 'paragraph', inlines: [{ text: 'after', marks: [] }] },
    ],
  };
  render(
    <I18nProvider locale="en">
      <RichTextEditor value={doc} onChange={() => {}} />
    </I18nProvider>,
  );
  const editor = screen.getByRole('textbox');
  act(() => editor.focus());
  const textNode = editor.querySelector('code')!.firstChild!;
  expect(textNode.nodeType).toBe(Node.TEXT_NODE); // still plain: chunk not loaded
  act(() => {
    document.getSelection()!.collapse(textNode, 8);
    document.dispatchEvent(new Event('selectionchange'));
  });
  expect(readSelection(editor)?.focus).toEqual({ blockId: 'c', offset: 8 });

  release();
  await waitFor(() => expect(editor.querySelector('code [data-token]')).not.toBeNull());
  expect(readSelection(editor)?.focus).toEqual({ blockId: 'c', offset: 8 });
});
