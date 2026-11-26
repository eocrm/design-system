// Shared-editing API (DS-96): the sync hooks a collaboration layer (Yjs or not) drives the
// editor through. Ported from the former `/collab` tests, without yjs.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import {
  RichTextEditor,
  type RichTextEditorController,
  type RichTextEditorProps,
  type RichTextPresence,
} from './RichTextEditor';
import { readSelection, writeSelection } from './selection';
import type { Range, RichDoc } from '../RichText/engine/model';
import { I18nProvider } from '../../i18n';
import { ru } from '../../i18n/ru';

const para = (id: string, text: string) => ({
  id,
  type: 'paragraph' as const,
  inlines: [{ text, marks: [] }],
});
const doc2 = (a: string, b: string): RichDoc => ({ blocks: [para('p1', a), para('p2', b)] });
const textOf = (doc: RichDoc, i: number) => doc.blocks[i].inlines!.map((r) => r.text).join('');
const at = (blockId: string, offset: number): Range => ({
  anchor: { blockId, offset },
  focus: { blockId, offset },
});

function caret(editor: HTMLElement, blockId: string, offset: number) {
  act(() => writeSelection(editor, at(blockId, offset)));
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

/** A controlled editor whose `value` the test can also replace from "outside". */
function setup(initial: RichDoc, props: Partial<RichTextEditorProps> = {}, label = 'E') {
  const api = { value: initial, set: (_d: RichDoc) => {} };
  function Harness() {
    const [value, setValue] = useState(initial);
    api.value = value;
    api.set = setValue;
    return (
      <RichTextEditor
        aria-label={label}
        {...props}
        value={value}
        onChange={(d) => {
          props.onChange?.(d);
          setValue(d);
        }}
      />
    );
  }
  const r = render(
    <I18nProvider locale="en">
      <Harness />
    </I18nProvider>,
  );
  const editor = screen.getByRole('textbox', { name: label });
  return { ...r, editor, api, outside: (d: RichDoc) => act(() => api.set(d)) };
}

describe('RichTextEditor shared editing: defaults', () => {
  it('with none of the props set, the editable is the only root', () => {
    const { container } = render(<RichTextEditor value={doc2('a', 'b')} onChange={() => {}} />);
    expect(container.childElementCount).toBe(1);
    expect(container.firstElementChild).toHaveAttribute('role', 'textbox');
    expect(container.querySelector('[data-presence]')).toBeNull();
    expect(container.querySelector('[data-sync-status]')).toBeNull();
  });
});

describe("RichTextEditor shared editing: history='external'", () => {
  it('routes ⌘Z, ⌘⇧Z, beforeinput and the toolbar to onUndo/onRedo, with button state from props', () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const onChange = vi.fn();
    const ui = (canUndo: boolean) => (
      <RichTextEditor
        aria-label="E"
        value={doc2('hello', '')}
        onChange={onChange}
        toolbar
        history="external"
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={canUndo}
        canRedo={false}
      />
    );
    const { rerender } = render(ui(false));
    const editor = screen.getByRole('textbox', { name: 'E' });
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
    rerender(ui(true));
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(editor, { key: 'z', code: 'KeyZ', ctrlKey: true });
    expect(onUndo).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(editor, { key: 'z', code: 'KeyZ', ctrlKey: true, shiftKey: true });
    expect(onRedo).toHaveBeenCalledTimes(1);
    caret(editor, 'p1', 5);
    // A menu / trackpad undo (no keydown) arrives as beforeinput.
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 1000);
    input(editor, 'historyUndo');
    vi.restoreAllMocks();
    expect(onUndo).toHaveBeenCalledTimes(3);
    // The editor keeps no history of its own: undo never emits a doc.
    expect(onChange).not.toHaveBeenCalled();
  });

  it('accepts an outside value as-is and keeps the caret where it was (clamped)', () => {
    const { editor, api, outside } = setup(doc2('hello', 'world'), { history: 'external' });
    caret(editor, 'p1', 5);
    // Another user appends to this very block (replacing the text node under the caret)
    // and edits the next one.
    outside(doc2('hello!!', 'WORLD'));
    expect(editor).toHaveTextContent('hello!!WORLD');
    expect(readSelection(editor)).toEqual(at('p1', 5));
    // A shorter outside value clamps the caret into the block.
    caret(editor, 'p2', 5);
    outside(doc2('hello!!', 'W'));
    expect(readSelection(editor)).toEqual(at('p2', 1));
    // A block that disappeared: the caret stays on the block now at its index.
    caret(editor, 'p2', 1);
    outside({ blocks: [para('p1', 'x'), para('p3', 'yz')] });
    expect(readSelection(editor)?.focus.blockId).toBe('p3');
    expect(api.value.blocks.map((b) => b.id)).toEqual(['p1', 'p3']);
  });

  it("an outside value while typing drops none of the user's keystrokes and keeps the caret", () => {
    const { editor, api, outside } = setup(doc2('hello', 'world'), { history: 'external' });
    caret(editor, 'p1', 5);
    type(editor, 'ab');
    // A remote edit lands between keystrokes, built on the doc the app holds.
    outside({ blocks: [api.value.blocks[0], para('p2', 'world, too')] });
    type(editor, 'c');
    expect(textOf(api.value, 0)).toBe('helloabc');
    expect(textOf(api.value, 1)).toBe('world, too');
    expect(readSelection(editor)).toEqual(at('p1', 8));
  });

  it('places the caret from controller.setSelection when the app sets one with an outside value', () => {
    const controller = createRef<RichTextEditorController>();
    const { editor, outside } = setup(doc2('hello', 'world'), { history: 'external', controller });
    caret(editor, 'p1', 2);
    expect(controller.current!.getSelection()).toEqual(at('p1', 2));
    // Remote text before the caret: the app maps the caret itself.
    act(() => controller.current!.setSelection(at('p1', 5)));
    outside(doc2('XXXhello', 'world'));
    expect(readSelection(editor)).toEqual(at('p1', 5));
  });

  it('getSelection reports the pending caret of a commit inside onChange', () => {
    const controller = createRef<RichTextEditorController>();
    const seen: (Range | null)[] = [];
    const { editor } = setup(doc2('hello', ''), {
      history: 'external',
      controller,
      onEdit: () => seen.push(controller.current!.getSelection()),
      onChange: () => seen.push(controller.current!.getSelection()),
    });
    caret(editor, 'p1', 5);
    type(editor, 'x');
    // onEdit sees the caret before the edit; onChange the one the edit places.
    expect(seen).toEqual([at('p1', 5), at('p1', 6)]);
  });
});

describe("RichTextEditor shared editing: history='external' and caret-less commits", () => {
  const image = {
    id: 'img',
    type: 'attachment' as const,
    status: 'ready' as const,
    src: 'http://u/p.png',
    mime: 'image/png',
    name: 'p.png',
    alt: 'Chart',
    width: 500,
    height: 300,
    inlines: [],
  };

  it('a block-colour pick places no caret: its own doc coming back is not an outside value', async () => {
    const user = userEvent.setup();
    const { editor } = setup(doc2('hello', 'world'), { history: 'external', blockControls: true });
    caret(editor, 'p1', 2);
    await user.hover(editor.querySelector('[data-block-id="p2"]')!);
    await user.click(screen.getByRole('button', { name: 'Block actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Text color' }));
    const green = await screen.findByRole('button', { name: 'Green' });
    // A real menu keeps the document selection in the editor (mousedown is prevented).
    act(() => green.focus());
    caret(editor, 'p1', 2);
    const addRange = vi.spyOn(Selection.prototype, 'addRange');
    try {
      fireEvent.click(green);
      expect(editor.querySelector('[data-block-id="p2"] [style]')).not.toBeNull();
      expect(addRange).not.toHaveBeenCalled();
      expect(document.activeElement).not.toBe(editor);
    } finally {
      addRange.mockRestore();
    }
  });

  it("an image width step places no caret and keeps focus on the slider; it reports 'resize'", async () => {
    const user = userEvent.setup();
    const kinds: string[] = [];
    const { editor, api } = setup(
      { blocks: [para('p1', 'hello'), image] },
      {
        history: 'external',
        blockControls: true,
        upload: { onUpload: async () => ({ url: '' }) },
        onEdit: ({ kind }) => kinds.push(kind),
      },
    );
    caret(editor, 'p1', 2);
    await user.hover(editor.querySelector('figure[data-block-id="img"]')!);
    await user.click(screen.getByRole('button', { name: 'Block actions' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Configure' }));
    const slider = await screen.findByRole('slider', { name: 'Width' });
    act(() => slider.focus());
    caret(editor, 'p1', 2);
    const addRange = vi.spyOn(Selection.prototype, 'addRange');
    try {
      await user.keyboard('{ArrowLeft}');
      await user.keyboard('{ArrowLeft}');
      await waitFor(() => expect(api.value.blocks[1].width).toBeLessThan(500));
      expect(addRange).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(slider);
      expect(kinds).toContain('resize');
    } finally {
      addRange.mockRestore();
    }
  });
});

describe('RichTextEditor shared editing: onEdit', () => {
  it('fires exactly once per commit, with its kind, before onChange', () => {
    const log: string[] = [];
    const { editor } = setup(doc2('hello', ''), {
      onEdit: ({ kind }) => log.push(`edit:${kind}`),
      onChange: () => log.push('change'),
    });
    caret(editor, 'p1', 5);
    type(editor, 'x');
    input(editor, 'deleteContentBackward');
    input(editor, 'insertParagraph');
    expect(log).toEqual(['edit:type', 'change', 'edit:delete', 'change', 'edit:other', 'change']);
  });
});

describe('RichTextEditor shared editing: createBlockId', () => {
  it('is per instance: two editors with different id sources never cross-contaminate', () => {
    let a = 0;
    let b = 0;
    const one = setup(doc2('one', ''), { createBlockId: () => `a-${++a}` }, 'One');
    const two = setup({ blocks: [para('q1', 'two')] }, { createBlockId: () => `b-${++b}` }, 'Two');
    const plainChange = vi.fn();
    render(<RichTextEditor aria-label="Plain" value={doc2('p', '')} onChange={plainChange} />);
    const plain = screen.getByRole('textbox', { name: 'Plain' });

    caret(one.editor, 'p1', 3);
    input(one.editor, 'insertParagraph');
    caret(two.editor, 'q1', 3);
    input(two.editor, 'insertParagraph');
    input(two.editor, 'insertParagraph');
    // The caret follows the new id.
    expect(readSelection(two.editor)).toEqual(at('b-2', 0));
    caret(plain, 'p1', 1);
    input(plain, 'insertParagraph');

    expect(one.api.value.blocks.map((x) => x.id)).toEqual(['p1', 'a-1', 'p2']);
    expect(two.api.value.blocks.map((x) => x.id)).toEqual(['q1', 'b-1', 'b-2']);
    // An editor without the prop keeps its own ids.
    const plainIds = (plainChange.mock.calls.at(-1)![0] as RichDoc).blocks.map((x) => x.id);
    expect(plainIds.every((id) => id === 'p1' || id === 'p2' || /^rt\d+$/.test(id))).toBe(true);
  });

  it('names uploaded attachments, and their settle is a silent edit on that block', async () => {
    let finish!: (url: string) => void;
    const kinds: string[] = [];
    const { container, editor, api } = setup(doc2('hello', ''), {
      toolbar: true,
      createBlockId: (() => {
        let n = 0;
        return () => `me-${++n}`;
      })(),
      onEdit: ({ kind }) => kinds.push(kind),
      upload: {
        onUpload: () =>
          new Promise((res) => {
            finish = (url) => res({ url, width: 10, height: 10, mime: 'image/png' });
          }),
      },
    });
    caret(editor, 'p1', 5);
    const file = new File(['x'], 'f.png', { type: 'image/png' });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    const att = () => api.value.blocks.find((bl) => bl.type === 'attachment');
    expect(att()).toMatchObject({ status: 'uploading' });
    expect(att()!.id).toMatch(/^me-\d+$/);
    await act(async () => finish('https://cdn.test/f.png'));
    expect(att()).toMatchObject({ status: 'ready', src: 'https://cdn.test/f.png' });
    expect(api.value.blocks.every((bl) => ['p1', 'p2'].includes(bl.id) || /^me-/.test(bl.id))).toBe(
      true,
    );
    expect(kinds).toEqual(['other', 'silent']);
  });
});

describe('RichTextEditor shared editing: createBlockId on silent commits', () => {
  it('a removal that empties the doc names its fresh paragraph with the factory', () => {
    const kinds: string[] = [];
    const { api } = setup(
      {
        blocks: [{ id: 'f', type: 'attachment', inlines: [], name: 'f.pdf', status: 'error' }],
      },
      {
        createBlockId: () => 'mine-1',
        onEdit: ({ kind }) => kinds.push(kind),
        upload: { onUpload: async () => ({ url: '' }) },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: /Remove/ }));
    expect(api.value.blocks.map((b) => b.id)).toEqual(['mine-1']);
    expect(kinds).toEqual(['silent']);
  });
});

describe('RichTextEditor shared editing: selection, controller, composition', () => {
  it('reports every selection change while focused, and null on focus loss', () => {
    const onSelectionChange = vi.fn();
    const { editor } = setup(doc2('hello', ''), { onSelectionChange });
    act(() => editor.focus());
    caret(editor, 'p1', 2);
    act(() => {
      document.dispatchEvent(new Event('selectionchange'));
    });
    expect(onSelectionChange).toHaveBeenLastCalledWith(at('p1', 2));
    act(() => editor.blur());
    expect(onSelectionChange).toHaveBeenLastCalledWith(null);
  });

  it('isComposing covers an IME composition; onCompositionEnd fires after its commit', async () => {
    const controller = createRef<RichTextEditorController>();
    const log: string[] = [];
    const { editor, api } = setup(doc2('hello', ''), {
      controller,
      onChange: () => log.push('change'),
      onCompositionEnd: () => log.push(`end:${controller.current!.isComposing()}`),
    });
    caret(editor, 'p1', 5);
    expect(controller.current!.isComposing()).toBe(false);
    fireEvent.compositionStart(editor, { data: '' });
    expect(controller.current!.isComposing()).toBe(true);
    editor.querySelector('[data-block-id="p1"]')!.firstChild!.textContent = 'hello日';
    caret(editor, 'p1', 6);
    await act(async () => {
      fireEvent.compositionEnd(editor, { data: '日' });
    });
    expect(textOf(api.value, 0)).toBe('hello日');
    expect(log).toEqual(['change', 'end:false']);
  });
});

describe('RichTextEditor shared editing: presence', () => {
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
  const peer = (
    id: string,
    name: string,
    color: string,
    selection: Range | null,
  ): RichTextPresence => ({ id, name, color, selection });

  it('draws carets and selection tints, skipping idle entries and unknown blocks', () => {
    const { container } = render(
      <RichTextEditor
        aria-label="E"
        value={doc2('hello world', '')}
        onChange={() => {}}
        presence={[
          peer('b', 'Bob', '#ff0000', {
            anchor: { blockId: 'p1', offset: 0 },
            focus: at('p1', 5).focus,
          }),
          peer('g', 'Ghost', '#00ff00', at('gone', 0)),
          peer('i', 'Idle', '#0000ff', null),
        ]}
      />,
    );
    const overlay = container.querySelector('[data-presence]')!;
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
    const carets = overlay.querySelectorAll('[data-presence-caret]');
    expect([...carets].map((c) => c.textContent)).toEqual(['Bob']);
    expect(overlay.querySelectorAll('[data-presence-selection]').length).toBeGreaterThan(0);
    expect((carets[0] as HTMLElement).style.getPropertyValue('--rich-text-presence-color')).toBe(
      '#ff0000',
    );
    // Overlay and editable share one root.
    expect(container.childElementCount).toBe(1);
    expect(container.firstElementChild).toContainElement(screen.getByRole('textbox'));
  });

  it('skips a selection the DOM rejects instead of throwing', () => {
    const comparePoint = vi.spyOn(Range.prototype, 'comparePoint').mockImplementation(() => {
      throw new DOMException('offset out of range', 'IndexSizeError');
    });
    try {
      const { container } = render(
        <RichTextEditor
          aria-label="E"
          value={doc2('hello', '')}
          onChange={() => {}}
          presence={[peer('b', 'Bob', '#ff0000', at('p1', 2))]}
        />,
      );
      expect(screen.getByRole('textbox')).toHaveTextContent('hello');
      expect(container.querySelectorAll('[data-presence-caret]')).toHaveLength(0);
    } finally {
      comparePoint.mockRestore();
    }
  });

  it('survives duplicate ids and non-string names; names each id once', () => {
    const { container } = render(
      <I18nProvider locale="en">
        <RichTextEditor
          aria-label="E"
          value={doc2('hello', '')}
          onChange={() => {}}
          presence={[
            peer('b', 'Bob', '#ff0000', at('p1', 1)),
            peer('b', 42 as unknown as string, '#ff0000', at('p1', 1)),
            peer('c', 'Cy', '#00ff00', null),
          ]}
        />
      </I18nProvider>,
    );
    const carets = [...container.querySelectorAll('[data-presence-caret]')];
    expect(carets.map((c) => c.textContent)).toEqual(['Bob', '42']);
    expect(container.querySelector('[data-sync-status]')).toHaveTextContent(
      '2 others editing: Bob, Cy',
    );
  });

  it('ru names others without inflecting them', () => {
    const { container } = render(
      <I18nProvider locale="ru" messages={ru}>
        <RichTextEditor
          aria-label="E"
          value={doc2('hello', '')}
          onChange={() => {}}
          presence={[peer('a', 'Аня', '#ff0000', null)]}
        />
      </I18nProvider>,
    );
    expect(container.querySelector('[data-sync-status]')).toHaveTextContent(
      'Также редактирует (1): «Аня»',
    );
  });
});

describe('RichTextEditor shared editing: syncStatus', () => {
  it('shows text + icon in the toolbar row and announces changes politely', async () => {
    const ui = (syncStatus: 'synced' | 'connecting' | 'offline') => (
      <I18nProvider locale="en">
        <RichTextEditor
          aria-label="E"
          value={doc2('hello', '')}
          onChange={() => {}}
          toolbar
          syncStatus={syncStatus}
        />
      </I18nProvider>
    );
    const { rerender } = render(ui('synced'));
    const toolbar = screen.getByRole('toolbar');
    const region = screen.getByRole('status');
    expect(toolbar).toHaveTextContent('Synced');
    expect(toolbar.querySelector('[data-sync-status] svg')).toHaveAttribute('aria-hidden', 'true');
    // The initial status is not announced.
    expect(region).toHaveTextContent(/^$/);
    rerender(ui('offline'));
    expect(toolbar).toHaveTextContent('Offline');
    await waitFor(() =>
      expect(region).toHaveTextContent('Offline — changes will sync when reconnected'),
    );
    expect(toolbar.querySelector('[data-sync-status] > span:not([class])')).toHaveTextContent(
      /^Offline$/,
    );
    rerender(ui('connecting'));
    await waitFor(() => expect(region).toHaveTextContent('Connecting…'));
  });

  it('without a toolbar sits below the editable inside one root', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <RichTextEditor
        ref={ref}
        className="custom"
        value={doc2('hello', '')}
        onChange={() => {}}
        syncStatus="synced"
      />,
    );
    expect(container.childElementCount).toBe(1);
    const root = container.firstElementChild!;
    const status = container.querySelector('[data-sync-status]')!;
    expect(root).toContainElement(status as HTMLElement);
    expect(root).toContainElement(ref.current);
    expect(ref.current).toHaveClass('custom');
    expect(ref.current!.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('RichTextEditor shared editing: uploadOwner', () => {
  const withAttachment = (status: 'uploading' | 'error'): RichDoc => ({
    blocks: [para('p', 'x'), { id: 'f', type: 'attachment', inlines: [], name: 'f.pdf', status }],
  });
  const ui = (
    doc: RichDoc,
    uploadOwner?: RichTextEditorProps['uploadOwner'],
    onChange: (d: RichDoc) => void = () => {},
  ) => (
    <I18nProvider locale="en">
      <RichTextEditor
        aria-label="E"
        value={doc}
        onChange={onChange}
        uploadOwner={uploadOwner}
        upload={{ onUpload: async () => ({ url: 'https://cdn.test/f' }) }}
      />
    </I18nProvider>
  );

  it('\'orphaned\' shows "Upload interrupted" with Remove only', () => {
    const onChange = vi.fn();
    const { rerender } = render(ui(withAttachment('uploading'), () => 'theirs', onChange));
    expect(screen.getByRole('progressbar', { name: 'Uploading…' })).toBeInTheDocument();
    rerender(ui(withAttachment('uploading'), () => 'orphaned', onChange));
    expect(screen.getByText('Upload interrupted')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Remove/ }));
    expect((onChange.mock.calls.at(-1)![0] as RichDoc).blocks.some((b) => b.id === 'f')).toBe(
      false,
    );
  });

  it("Retry shows for 'mine' only once the prop is set", () => {
    const { rerender } = render(ui(withAttachment('error'), () => 'theirs'));
    expect(screen.getByRole('button', { name: /Remove/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull();
    rerender(ui(withAttachment('error'), () => undefined));
    expect(screen.queryByRole('button', { name: /Retry/ })).toBeNull();
    rerender(ui(withAttachment('error'), () => 'mine'));
    expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
  });

  it('without the prop, uploads behave as today: Retry offered, never interrupted', () => {
    const { rerender } = render(ui(withAttachment('error')));
    expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
    rerender(ui(withAttachment('uploading')));
    expect(screen.getByRole('progressbar', { name: 'Uploading…' })).toBeInTheDocument();
    expect(screen.queryByText('Upload interrupted')).toBeNull();
  });
});
