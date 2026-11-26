import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import * as Y from 'yjs';
import { CollaborativeRichTextEditor } from './CollaborativeRichTextEditor';
import { BLOCKS, blockMeta, fromRichDoc, toRichDoc } from './schema';
import { decodeSelection, encodeSelection } from './bridge';
import { ru } from '../i18n/ru';
import { docFromText, type RichDoc } from '../components/RichText/engine/model';
import { RichTextEditor } from '../components/RichTextEditor/RichTextEditor';
import { readSelection, writeSelection } from '../components/RichTextEditor/selection';
import { I18nProvider } from '../i18n';

const REMOTE = 'remote';
const ME = { name: 'Me', color: '#123456' };

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
      <CollaborativeRichTextEditor doc={doc} user={ME} aria-label={label} />
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
    render(<CollaborativeRichTextEditor ref={ref} doc={a} user={ME} className="custom" />);
    expect(ref.current).toHaveAttribute('role', 'textbox');
    expect(ref.current).toHaveClass('custom');
    expect(ref.current).toHaveTextContent('hello');
  });

  it('without a toolbar, status and presence stay inside one root; className/ref stay on the textbox', () => {
    const { a } = pair('hello');
    const ref = { current: null as HTMLDivElement | null };
    const { container } = render(
      <CollaborativeRichTextEditor ref={ref} doc={a} user={ME} className="custom" />,
    );
    expect(container.childElementCount).toBe(1);
    const root = container.firstElementChild!;
    expect(root).toContainElement(ref.current);
    expect(root).toContainElement(container.querySelector('[data-collab-status]') as HTMLElement);
    expect(root.querySelectorAll(':scope > *').length).toBeGreaterThan(1);
    expect(ref.current).toHaveClass('custom');
    // Plain mode is unchanged: the editable is the only root.
    const plain = render(<RichTextEditor value={docFromText('x')} onChange={() => {}} />);
    expect(plain.container.childElementCount).toBe(1);
    expect(plain.container.firstElementChild).toHaveAttribute('role', 'textbox');
  });

  it('under StrictMode: one Y update per edit, one observer, undo works', () => {
    const { a, b } = pair('hello');
    const updates: Uint8Array[] = [];
    a.on('update', (u: Uint8Array, origin: unknown) => origin !== REMOTE && updates.push(u));
    render(
      <StrictMode>
        <CollaborativeRichTextEditor doc={a} user={ME} aria-label="Editor" />
      </StrictMode>,
    );
    const editor = screen.getByRole('textbox', { name: 'Editor' });
    const id = firstId(a);
    caret(editor, id, 5);
    type(editor, '!');
    expect(updates).toHaveLength(1);
    type(editor, '?');
    expect(updates).toHaveLength(2);
    // A remote change renders once (a duplicate observer would double-apply nothing, but a
    // leaked UndoManager would also track it): the text shows it exactly.
    b.transact(() => yText(b, id).insert(0, 'X'));
    expect(editor).toHaveTextContent(/^Xhello!\?$/);
    fireEvent.keyDown(editor, { key: 'z', code: 'KeyZ', ctrlKey: true });
    expect(textOf(a)).toBe('Xhello');
    expect(editor).toHaveTextContent(/^Xhello$/);
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
        <CollaborativeRichTextEditor doc={a} user={ME} toolbar aria-label="Editor" />
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
        <CollaborativeRichTextEditor doc={doc} user={ME} toolbar aria-label="Editor" />
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
    const first = render(<CollaborativeRichTextEditor doc={one} user={ME} aria-label="One" />);
    render(<CollaborativeRichTextEditor doc={two} user={ME} aria-label="Two" />);
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

describe('CollaborativeRichTextEditor presence', () => {
  const me = { name: 'Me', color: '#123456' };
  const rect = { top: 10, left: 20, width: 30, height: 16, right: 50, bottom: 26, x: 20, y: 10 };
  const { getBoundingClientRect, getClientRects } = Range.prototype;
  beforeEach(() => {
    // jsdom has no layout: give ranges a box.
    Range.prototype.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect }) as DOMRect;
    Range.prototype.getClientRects = () =>
      Object.assign([{ ...rect }], { item: () => null }) as unknown as DOMRectList;
  });
  afterEach(() => {
    Range.prototype.getBoundingClientRect = getBoundingClientRect;
    Range.prototype.getClientRects = getClientRects;
  });

  it('a remote selection the DOM rejects (out-of-range offset) is skipped, not thrown', () => {
    const { a, b } = pair('hello');
    const id = firstId(a);
    const comparePoint = vi.spyOn(Range.prototype, 'comparePoint').mockImplementation(() => {
      throw new DOMException('offset out of range', 'IndexSizeError');
    });
    try {
      const { container } = render(
        <CollaborativeRichTextEditor
          doc={a}
          user={me}
          presence={[
            { clientId: b.clientID, name: 'Bob', color: '#ff0000', selection: remote(b, id, 0, 5) },
          ]}
          aria-label="Editor"
        />,
      );
      expect(screen.getByRole('textbox', { name: 'Editor' })).toHaveTextContent('hello');
      expect(container.querySelectorAll('[data-collab-caret]')).toHaveLength(0);
    } finally {
      comparePoint.mockRestore();
    }
  });

  it('survives duplicate clientIds and non-string names', () => {
    const { a, b } = pair('hello');
    const id = firstId(a);
    const sel = remote(b, id, 1, 1);
    const { container } = render(
      <CollaborativeRichTextEditor
        doc={a}
        user={me}
        presence={[
          { clientId: b.clientID, name: 'Bob', color: '#ff0000', selection: sel },
          { clientId: b.clientID, name: 42 as unknown as string, color: '#ff0000', selection: sel },
        ]}
        aria-label="Editor"
      />,
    );
    const carets = [...container.querySelectorAll('[data-collab-caret]')];
    expect(carets.map((c) => c.textContent)).toEqual(['Bob', '42']);
    // The status area names each client once.
    expect(container.querySelector('[data-collab-status]')).toHaveTextContent(
      '1 other editing: Bob',
    );
  });

  function remote(doc: Y.Doc, blockId: string, a: number, f: number) {
    return encodeSelection(doc, {
      anchor: { blockId, offset: a },
      focus: { blockId, offset: f },
    });
  }

  it('draws remote carets and selections, skipping our own entry and unresolvable ones', () => {
    const { a, b } = pair('hello world');
    const id = firstId(a);
    const { container } = render(
      <CollaborativeRichTextEditor
        doc={a}
        user={me}
        presence={[
          { clientId: a.clientID, name: 'Me', color: '#000000', selection: remote(a, id, 0, 1) },
          { clientId: b.clientID, name: 'Bob', color: '#ff0000', selection: remote(b, id, 0, 5) },
          {
            clientId: 77,
            name: 'Ghost',
            color: '#00ff00',
            selection: {
              anchor: { blockId: 'gone', rel: null },
              focus: { blockId: 'gone', rel: null },
            },
          },
          { clientId: 78, name: 'Idle', color: '#0000ff', selection: null },
        ]}
        aria-label="Editor"
      />,
    );
    const overlay = container.querySelector('[data-collab-presence]')!;
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
    const carets = overlay.querySelectorAll('[data-collab-caret]');
    expect([...carets].map((c) => c.textContent)).toEqual(['Bob']);
    expect(overlay.querySelectorAll('[data-collab-selection]').length).toBeGreaterThan(0);
    expect((carets[0] as HTMLElement).style.getPropertyValue('--collab-user-color')).toBe(
      '#ff0000',
    );
  });

  it('reports the local selection throttled, and null on blur', () => {
    vi.useFakeTimers();
    try {
      const { a } = pair('hello');
      const onPresenceChange = vi.fn();
      const { rerender } = render(
        <CollaborativeRichTextEditor
          doc={a}
          user={me}
          onPresenceChange={onPresenceChange}
          aria-label="Editor"
        />,
      );
      const editor = screen.getByRole('textbox', { name: 'Editor' });
      // Announced on mount, before any focus, so others count this client as present.
      expect(onPresenceChange).toHaveBeenCalledTimes(1);
      expect(onPresenceChange).toHaveBeenLastCalledWith({
        clientId: a.clientID,
        name: 'Me',
        color: '#123456',
        selection: null,
      });
      onPresenceChange.mockClear();
      editor.focus();
      const id = firstId(a);
      const move = (o: number) => {
        caret(editor, id, o);
        act(() => {
          document.dispatchEvent(new Event('selectionchange'));
        });
      };
      move(1);
      expect(onPresenceChange).toHaveBeenCalledTimes(1);
      const sent = onPresenceChange.mock.calls[0][0];
      expect(sent).toMatchObject({ clientId: a.clientID, name: 'Me', color: '#123456' });
      expect(decodeSelection(a, sent.selection, toRichDoc(a))?.focus.offset).toBe(1);
      move(2);
      move(3);
      expect(onPresenceChange).toHaveBeenCalledTimes(1);
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(onPresenceChange).toHaveBeenCalledTimes(2);
      expect(
        decodeSelection(a, onPresenceChange.mock.calls[1][0].selection, toRichDoc(a))?.focus.offset,
      ).toBe(3);
      // The trailing call goes to the callback and user of the latest render.
      const next = vi.fn();
      move(4);
      rerender(
        <CollaborativeRichTextEditor
          doc={a}
          user={{ name: 'Renamed', color: '#123456' }}
          onPresenceChange={next}
          aria-label="Editor"
        />,
      );
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ name: 'Renamed' }));
      const onBlur = next;
      act(() => editor.blur());
      expect(onBlur).toHaveBeenLastCalledWith(
        expect.objectContaining({ clientId: a.clientID, selection: null }),
      );
      const calls = onBlur.mock.calls.length;
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(onBlur).toHaveBeenCalledTimes(calls);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('CollaborativeRichTextEditor presence announce', () => {
  it('announces presence on mount, on a doc swap and when the user changes, without focus', () => {
    const { a } = pair('hello');
    const b = new Y.Doc();
    const cb = vi.fn();
    const ui = (doc: Y.Doc, name: string) => (
      <CollaborativeRichTextEditor
        doc={doc}
        user={{ name, color: '#123456' }}
        onPresenceChange={cb}
        toolbar
      />
    );
    const { rerender } = render(ui(a, 'Me'));
    expect(cb).toHaveBeenLastCalledWith(
      expect.objectContaining({ clientId: a.clientID, name: 'Me', selection: null }),
    );
    rerender(ui(b, 'Me'));
    expect(cb).toHaveBeenLastCalledWith(
      expect.objectContaining({ clientId: b.clientID, name: 'Me', selection: null }),
    );
    rerender(ui(b, 'Renamed'));
    expect(cb).toHaveBeenLastCalledWith(
      expect.objectContaining({ clientId: b.clientID, name: 'Renamed', selection: null }),
    );
    const n = cb.mock.calls.length;
    rerender(ui(b, 'Renamed'));
    expect(cb).toHaveBeenCalledTimes(n);
  });
});

describe('CollaborativeRichTextEditor status', () => {
  const me = { name: 'Me', color: '#123456' };

  it('shows the status as text + icon in the toolbar row and announces changes politely', async () => {
    const { a } = pair('hello');
    const ui = (status?: 'synced' | 'connecting' | 'offline') => (
      <I18nProvider locale="en">
        <CollaborativeRichTextEditor doc={a} user={me} status={status} toolbar aria-label="E" />
      </I18nProvider>
    );
    const { rerender } = render(ui());
    const toolbar = screen.getByRole('toolbar');
    const region = screen.getByRole('status');
    expect(toolbar).toHaveTextContent('Synced');
    expect(toolbar.querySelector('[data-collab-status] svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(region).toHaveTextContent(/^$/);
    rerender(ui('offline'));
    expect(toolbar).toHaveTextContent('Offline');
    await waitFor(() =>
      expect(region).toHaveTextContent('Offline — changes will sync when reconnected'),
    );
    // Short visible label; the explanation is in the accessible text.
    expect(toolbar.querySelector('[data-collab-status] > span:not([class])')).toHaveTextContent(
      /^Offline$/,
    );
    rerender(ui('connecting'));
    await waitFor(() => expect(region).toHaveTextContent('Connecting…'));
  });

  it('without a toolbar the status sits below the editable, and names the others editing', () => {
    const { a } = pair('hello');
    const { container } = render(
      <I18nProvider locale="en">
        <CollaborativeRichTextEditor
          doc={a}
          user={me}
          presence={[
            { clientId: a.clientID, name: 'Me', color: '#000000', selection: null },
            { clientId: 5, name: 'Bob', color: '#ff0000', selection: null },
            { clientId: 6, name: 'Cy', color: '#00ff00', selection: null },
          ]}
          aria-label="E"
        />
      </I18nProvider>,
    );
    expect(screen.queryByRole('toolbar')).toBeNull();
    const status = container.querySelector('[data-collab-status]')!;
    expect(status).toHaveTextContent('Synced');
    expect(status).toHaveTextContent('2 others editing: Bob, Cy');
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('ru names others without inflecting them', () => {
    const { a } = pair('hello');
    const { container } = render(
      <I18nProvider locale="ru" messages={ru}>
        <CollaborativeRichTextEditor
          doc={a}
          user={me}
          presence={[{ clientId: 5, name: 'Аня', color: '#ff0000', selection: null }]}
          aria-label="E"
        />
      </I18nProvider>,
    );
    expect(container.querySelector('[data-collab-status]')).toHaveTextContent(
      'Также редактирует (1): «Аня»',
    );
  });
});

describe('CollaborativeRichTextEditor uploads', () => {
  const me = { name: 'Me', color: '#123456' };

  function withAttachment(status: 'uploading' | 'error', uploadedBy?: number) {
    const doc = fromRichDoc(
      {
        blocks: [
          { id: 'p', type: 'paragraph', inlines: [{ text: 'x', marks: [] }] },
          { id: 'f', type: 'attachment', inlines: [], name: 'f.pdf', status },
        ],
      },
      new Y.Doc(),
    );
    const id = toRichDoc(doc).blocks[1].id;
    if (uploadedBy !== undefined)
      doc.getMap<Y.Map<unknown>>(BLOCKS).get(id)!.set('uploadedBy', uploadedBy);
    return { doc, id };
  }

  const ui = (doc: Y.Doc, presence: { clientId: number }[] = []) => (
    <I18nProvider locale="en">
      <CollaborativeRichTextEditor
        doc={doc}
        user={me}
        presence={presence.map((p) => ({ ...p, name: 'P', color: '#ff0000', selection: null }))}
        upload={{ onUpload: async () => ({ url: 'https://cdn.test/f' }) }}
        aria-label="E"
      />
    </I18nProvider>
  );

  it('an upload whose uploader left shows "Upload interrupted" with Remove only', () => {
    const { doc, id } = withAttachment('uploading', 999);
    const { rerender } = render(ui(doc, [{ clientId: 999 }]));
    expect(screen.getByRole('progressbar', { name: 'Uploading…' })).toBeInTheDocument();
    rerender(ui(doc, []));
    expect(screen.getByText('Upload interrupted')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Remove/ }));
    expect(toRichDoc(doc).blocks.some((b) => b.id === id)).toBe(false);
  });

  it('without a presence prop a remote upload is never shown as interrupted', () => {
    const { doc } = withAttachment('uploading', 999);
    render(
      <I18nProvider locale="en">
        <CollaborativeRichTextEditor
          doc={doc}
          user={me}
          upload={{ onUpload: async () => ({ url: 'https://cdn.test/f' }) }}
          aria-label="E"
        />
      </I18nProvider>,
    );
    expect(screen.getByRole('progressbar', { name: 'Uploading…' })).toBeInTheDocument();
    expect(screen.queryByText('Upload interrupted')).toBeNull();
    expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull();
  });

  it('Retry shows only for the uploader', () => {
    const other = withAttachment('error', 999);
    const { unmount } = render(ui(other.doc));
    expect(screen.getByRole('button', { name: /Remove/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull();
    unmount();
    const mine = withAttachment('error');
    mine.doc.getMap<Y.Map<unknown>>(BLOCKS).get(mine.id)!.set('uploadedBy', mine.doc.clientID);
    render(ui(mine.doc));
    expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
  });

  it('a finished upload settles the renamed block and is not an undo step', async () => {
    const { a } = pair('hello');
    let finish!: (url: string) => void;
    const { container } = render(
      <I18nProvider locale="en">
        <CollaborativeRichTextEditor
          doc={a}
          user={me}
          toolbar
          upload={{
            onUpload: () =>
              new Promise((res) => {
                finish = (url) => res({ url, width: 10, height: 10, mime: 'image/png' });
              }),
          }}
          aria-label="E"
        />
      </I18nProvider>,
    );
    const editor = screen.getByRole('textbox', { name: 'E' });
    caret(editor, firstId(a), 5);
    const file = new File(['x'], 'f.png', { type: 'image/png' });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    const att = () => toRichDoc(a).blocks.find((bl) => bl.type === 'attachment');
    expect(att()).toMatchObject({ status: 'uploading' });
    expect(att()!.id.startsWith(`${a.clientID.toString(36)}-`)).toBe(true);
    const ymap = a.getMap<Y.Map<unknown>>(BLOCKS).get(att()!.id)!;
    expect(blockMeta(ymap).uploadedBy).toBe(a.clientID);
    // The upload outlasts the undo manager's capture window (600ms).
    // (Real time: yjs reads the clock through a captured `Date.now`.)
    await new Promise((r) => setTimeout(r, 650));
    await act(async () => finish('https://cdn.test/f.png'));
    expect(att()).toMatchObject({ status: 'ready', src: 'https://cdn.test/f.png' });
    // One undo removes the whole upload: the settle was not a step of its own.
    fireEvent.keyDown(editor, { key: 'z', code: 'KeyZ', ctrlKey: true });
    expect(att()).toBeUndefined();
    fireEvent.keyDown(editor, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true });
    // Redo brings it back settled, not stuck uploading.
    expect(att()).toMatchObject({ status: 'ready', src: 'https://cdn.test/f.png' });
  });
});
