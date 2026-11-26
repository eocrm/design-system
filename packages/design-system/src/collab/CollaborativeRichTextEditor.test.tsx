import { act, fireEvent, render, screen } from '@testing-library/react';
import * as Y from 'yjs';
import { CollaborativeRichTextEditor } from './CollaborativeRichTextEditor';
import { fromRichDoc, toRichDoc } from './schema';
import { BLOCKS } from './schema';
import { docFromText, type RichDoc } from '../components/RichText/engine/model';
import { RichTextEditor } from '../components/RichTextEditor/RichTextEditor';
import { readSelection, writeSelection } from '../components/RichTextEditor/selection';
import { I18nProvider } from '../i18n';

const REMOTE = 'remote';

/** Two docs kept in sync in memory (updates relayed both ways). */
function pair(text: string) {
  const a = fromRichDoc(docFromText(text), new Y.Doc());
  const b = new Y.Doc();
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a), REMOTE);
  a.on('update', (u: Uint8Array, origin: unknown) => {
    if (origin !== REMOTE) act(() => Y.applyUpdate(b, u, REMOTE));
  });
  b.on('update', (u: Uint8Array, origin: unknown) => {
    if (origin !== REMOTE) act(() => Y.applyUpdate(a, u, REMOTE));
  });
  return { a, b };
}

const firstId = (doc: Y.Doc) => toRichDoc(doc).blocks[0].id;
const textOf = (doc: Y.Doc, i = 0) =>
  toRichDoc(doc)
    .blocks[i].inlines!.map((r) => r.text)
    .join('');
const yText = (doc: Y.Doc, id: string) =>
  (doc.getMap<Y.Map<unknown>>(BLOCKS).get(id)!.get('text') as Y.Text)!;

function renderOn(doc: Y.Doc, label = 'Editor') {
  render(
    <I18nProvider locale="en">
      <CollaborativeRichTextEditor doc={doc} aria-label={label} />
    </I18nProvider>,
  );
  return screen.getByRole('textbox', { name: label });
}

function caret(editor: HTMLElement, blockId: string, offset: number) {
  const p = { blockId, offset };
  writeSelection(editor, { anchor: p, focus: p });
}

function input(editor: HTMLElement, inputType: string, data: string | null = null) {
  const evt = new Event('beforeinput', { bubbles: true, cancelable: true });
  Object.defineProperty(evt, 'inputType', { value: inputType });
  Object.defineProperty(evt, 'data', { value: data });
  act(() => {
    editor.dispatchEvent(evt);
  });
}
const type = (editor: HTMLElement, s: string) =>
  [...s].forEach((c) => input(editor, 'insertText', c));

describe('CollaborativeRichTextEditor', () => {
  it('renders the seeded doc and forwards ref + className', () => {
    const { a } = pair('hello');
    const ref = { current: null as HTMLDivElement | null };
    render(<CollaborativeRichTextEditor ref={ref} doc={a} className="custom" />);
    expect(ref.current).toHaveAttribute('role', 'textbox');
    expect(ref.current).toHaveClass('custom');
    expect(ref.current).toHaveTextContent('hello');
  });

  it('typing writes a Y update carrying the text', () => {
    const { a, b } = pair('hello');
    const updates: Uint8Array[] = [];
    a.on('update', (u: Uint8Array, origin: unknown) => origin !== REMOTE && updates.push(u));
    const editor = renderOn(a);
    caret(editor, firstId(a), 5);
    type(editor, '!?');
    expect(updates.length).toBeGreaterThan(0);
    const probe = new Y.Doc();
    Y.applyUpdate(probe, Y.encodeStateAsUpdate(b));
    expect(textOf(probe)).toBe('hello!?');
    expect(textOf(a)).toBe('hello!?');
  });

  it('a remote insert before the caret shows, shifts the caret, and leaves local undo/redo intact', () => {
    const { a, b } = pair('hello');
    const editor = renderOn(a);
    const id = firstId(a);
    caret(editor, id, 5);
    type(editor, '!');
    // Remote insert before the caret.
    b.transact(() => yText(b, id).insert(0, 'XY'));
    expect(editor).toHaveTextContent('XYhello!');
    expect(readSelection(editor)).toEqual({
      anchor: { blockId: id, offset: 8 },
      focus: { blockId: id, offset: 8 },
    });
    // Undo reverts only the local "!", keeps the remote "XY" and restores the caret from before it.
    caret(editor, id, 0);
    fireEvent.keyDown(editor, { key: 'z', code: 'KeyZ', ctrlKey: true });
    expect(editor).toHaveTextContent(/^XYhello$/);
    expect(textOf(b)).toBe('XYhello');
    expect(readSelection(editor)?.focus).toEqual({ blockId: id, offset: 7 });
    // Redo brings it back, with the caret after the redone edit.
    caret(editor, id, 0);
    fireEvent.keyDown(editor, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true });
    expect(textOf(b)).toBe('XYhello!');
    expect(editor).toHaveTextContent('XYhello!');
    expect(readSelection(editor)?.focus).toEqual({ blockId: id, offset: 8 });
  });

  it('the toolbar undo button goes through the shared undo', async () => {
    const { a } = pair('hello');
    render(
      <I18nProvider locale="en">
        <CollaborativeRichTextEditor doc={a} toolbar aria-label="Editor" />
      </I18nProvider>,
    );
    const editor = screen.getByRole('textbox', { name: 'Editor' });
    const undoBtn = screen.getByRole('button', { name: 'Undo' });
    expect(undoBtn).toBeDisabled();
    caret(editor, firstId(a), 5);
    type(editor, '!');
    expect(undoBtn).toBeEnabled();
    fireEvent.click(undoBtn);
    expect(textOf(a)).toBe('hello');
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled();
  });

  it('a doc swap starts a fresh history and detaches the old doc', () => {
    const { a, b } = pair('first');
    const second = fromRichDoc(docFromText('second'), new Y.Doc());
    const ui = (doc: Y.Doc) => (
      <I18nProvider locale="en">
        <CollaborativeRichTextEditor doc={doc} toolbar aria-label="Editor" />
      </I18nProvider>
    );
    const { rerender } = render(ui(a));
    const editor = screen.getByRole('textbox', { name: 'Editor' });
    caret(editor, firstId(a), 5);
    type(editor, '!');
    rerender(ui(second));
    expect(editor).toHaveTextContent(/^second$/);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    // Edits to the old doc no longer reach the editor.
    b.transact(() => yText(b, firstId(b)).insert(0, 'old '));
    expect(editor).toHaveTextContent(/^second$/);
    caret(editor, firstId(second), 6);
    type(editor, '?');
    expect(textOf(second)).toBe('second?');
    expect(textOf(a)).toBe('old first!');
  });

  it('splits undo steps by edit kind: a format right after typing is its own step', () => {
    const { a } = pair('');
    const editor = renderOn(a);
    const id = firstId(a);
    caret(editor, id, 0);
    type(editor, 'abc');
    const bid = firstId(a);
    writeSelection(editor, {
      anchor: { blockId: bid, offset: 0 },
      focus: { blockId: bid, offset: 3 },
    });
    fireEvent.keyDown(editor, { key: 'b', code: 'KeyB', ctrlKey: true });
    expect(toRichDoc(a).blocks[0].inlines).toEqual([{ text: 'abc', marks: [{ type: 'bold' }] }]);
    const undo = () => fireEvent.keyDown(editor, { key: 'z', code: 'KeyZ', ctrlKey: true });
    undo();
    expect(toRichDoc(a).blocks[0].inlines).toEqual([{ text: 'abc', marks: [] }]);
    undo();
    expect(textOf(a)).toBe('');
  });

  it('defers a remote update during IME composition until compositionend', async () => {
    const { a, b } = pair('hello');
    const editor = renderOn(a);
    const id = firstId(a);
    caret(editor, id, 5);
    fireEvent.compositionStart(editor, { data: '' });
    b.transact(() => yText(b, id).insert(0, 'X'));
    // Not applied mid-composition: the DOM still belongs to the IME.
    expect(editor).toHaveTextContent(/^hello$/);
    // The IME writes its text into the block; compositionend commits it and the remote change.
    const block = editor.querySelector(`[data-block-id="${id}"]`)!;
    block.firstChild!.textContent = 'hello日';
    caret(editor, id, 6);
    await act(async () => {
      fireEvent.compositionEnd(editor, { data: '日' });
    });
    expect(editor).toHaveTextContent(/^Xhello日$/);
    expect(textOf(b)).toBe('Xhello日');
    expect(readSelection(editor)?.focus).toEqual({ blockId: id, offset: 7 });
  });

  it('applies a deferred remote update at compositionend when the IME commits nothing', async () => {
    const { a, b } = pair('hello');
    const editor = renderOn(a);
    const id = firstId(a);
    caret(editor, id, 5);
    fireEvent.compositionStart(editor, { data: '' });
    b.transact(() => yText(b, id).insert(0, 'X'));
    expect(editor).toHaveTextContent(/^hello$/);
    await act(async () => {
      fireEvent.compositionEnd(editor, { data: '' });
    });
    expect(editor).toHaveTextContent(/^Xhello$/);
    expect(readSelection(editor)?.focus).toEqual({ blockId: id, offset: 6 });
  });

  it("new block ids follow each editor's own doc, and plain editors keep rtN ids", () => {
    const one = fromRichDoc(docFromText('one'), new Y.Doc());
    const two = fromRichDoc(docFromText('two'), new Y.Doc());
    const first = render(<CollaborativeRichTextEditor doc={one} aria-label="One" />);
    render(<CollaborativeRichTextEditor doc={two} aria-label="Two" />);
    const plainChange = vi.fn();
    render(
      <RichTextEditor value={docFromText('plain')} onChange={plainChange} aria-label="Plain" />,
    );
    const eb = screen.getByRole('textbox', { name: 'Two' });
    eb.focus();
    first.unmount();
    caret(eb, firstId(two), 3);
    input(eb, 'insertParagraph');
    const ids = toRichDoc(two).blocks.map((b) => b.id);
    expect(ids).toHaveLength(2);
    expect(
      ids.every((id) => id.startsWith(`${two.clientID.toString(36)}-`) || id.startsWith('s')),
    ).toBe(true);
    expect(ids.filter((id) => id.startsWith(`${two.clientID.toString(36)}-`))).toHaveLength(1);
    const plain = screen.getByRole('textbox', { name: 'Plain' });
    caret(plain, plain.querySelector('[data-block-id]')!.getAttribute('data-block-id')!, 5);
    input(plain, 'insertParagraph');
    const plainIds = (plainChange.mock.calls.at(-1)![0] as RichDoc).blocks.map((b) => b.id);
    expect(plainIds.every((id) => /^rt\d+$/.test(id))).toBe(true);
  });

  it('gives new blocks clientID-prefixed ids', () => {
    const { a } = pair('hello');
    const editor = renderOn(a);
    caret(editor, firstId(a), 5);
    input(editor, 'insertParagraph');
    const ids = toRichDoc(a).blocks.map((b) => b.id);
    expect(ids).toHaveLength(2);
    expect(ids[1].startsWith(`${a.clientID.toString(36)}-`)).toBe(true);
  });

  it('two editors on synced docs converge after interleaved typing', () => {
    const { a, b } = pair('one two');
    const ea = renderOn(a, 'A');
    const eb = renderOn(b, 'B');
    const id = firstId(a);
    // jsdom has one selection per document, so each editor's caret is placed before it types.
    for (let i = 0; i < 4; i++) {
      caret(ea, id, 3 + i);
      type(ea, 'a');
      caret(eb, id, textOf(b).length);
      type(eb, 'b');
    }
    caret(ea, id, 0);
    input(ea, 'insertParagraph');
    caret(eb, firstId(b), 0);
    type(eb, 'Z');
    expect(toRichDoc(a)).toEqual(toRichDoc(b));
    expect(ea.textContent).toBe(eb.textContent);
    expect(toRichDoc(a).blocks.map((bl) => bl.inlines!.map((r) => r.text).join(''))).toEqual([
      'Z',
      'oneaaaa twobbbb',
    ]);
  });
});
