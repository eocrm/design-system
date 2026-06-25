import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';
import { RichTextEditor } from './RichTextEditor';
import { docFromText, emptyDoc } from '../RichText/engine/model';
import { I18nProvider } from '../../i18n';
import type { RichDoc, Range } from '../RichText/engine/model';

// ESM exports are read-only live bindings, so `vi.spyOn(selection, …)` can't
// replace `readSelection` under Vite. Mock the module with a factory that keeps
// the real DOM↔model helpers and lets each test stub `readSelection` (jsdom has
// no real caret, so the component's beforeinput/shortcut paths need a fixed range).
vi.mock('./selection', async () => {
  const actual = await vi.importActual<typeof import('./selection')>('./selection');
  return { ...actual, readSelection: vi.fn(actual.readSelection) };
});
import { readSelection } from './selection';

const mockReadSelection = vi.mocked(readSelection);

function renderEditor(ui: React.ReactElement) {
  return render(<I18nProvider locale="en">{ui}</I18nProvider>);
}

describe('RichTextEditor', () => {
  beforeEach(() => {
    mockReadSelection.mockReset();
  });

  it('renders the document in a contentEditable textbox', () => {
    renderEditor(<RichTextEditor value={docFromText('hello')} onChange={() => {}} />);
    const box = screen.getByRole('textbox');
    expect(box).toHaveAttribute('contenteditable', 'true');
    expect(box).toHaveTextContent('hello');
  });

  it('uses the default aria-label when none supplied', () => {
    renderEditor(<RichTextEditor value={emptyDoc()} onChange={() => {}} />);
    expect(screen.getByRole('textbox')).toHaveAccessibleName('Rich text editor');
  });

  it('readOnly drops contentEditable', () => {
    renderEditor(<RichTextEditor value={docFromText('x')} onChange={() => {}} readOnly />);
    expect(screen.getByRole('textbox')).toHaveAttribute('contenteditable', 'false');
  });

  it('forwards ref and merges className', () => {
    const ref = { current: null as HTMLDivElement | null };
    const { container } = renderEditor(
      <RichTextEditor ref={ref} value={emptyDoc()} onChange={() => {}} className="custom" />,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(container.querySelector('.custom')).not.toBeNull();
  });

  it('shows the placeholder when empty', () => {
    renderEditor(<RichTextEditor value={emptyDoc()} onChange={() => {}} placeholder="Write…" />);
    const box = screen.getByRole('textbox');
    expect(box).toHaveAttribute('data-empty', '');
    expect(box).toHaveAttribute('data-placeholder', 'Write…');
  });

  it('⌘B toggles bold over the selection (onChange fires with marked doc)', async () => {
    const user = userEvent.setup();
    // Stub readSelection to a fixed full-block range (jsdom has no real caret).
    const fullBlock: Range = {
      anchor: { blockId: 'k', offset: 0 },
      focus: { blockId: 'k', offset: 5 },
    };
    mockReadSelection.mockReturnValue(fullBlock);

    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: 'hello', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} />;
    }
    renderEditor(<Harness />);
    const box = screen.getByRole('textbox');
    box.focus();
    await user.keyboard('{Meta>}b{/Meta}');
    expect(box.querySelector('strong')?.textContent).toBe('hello');
  });
});

describe('RichTextEditor toolbar', () => {
  beforeEach(() => {
    mockReadSelection.mockReset();
  });

  it('renders the toolbar when `toolbar` is set', () => {
    renderEditor(<RichTextEditor value={docFromText('hi')} onChange={() => {}} toolbar />);
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
  });

  it('a block-type choice updates the doc', async () => {
    const user = userEvent.setup();
    // Stub the live selection to a fixed in-block range (jsdom has no caret).
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 0 },
      focus: { blockId: 'k', offset: 2 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: 'hi', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} toolbar />;
    }
    renderEditor(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Text style' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Heading 2' }));
    expect(screen.getByRole('heading', { level: 2, name: 'hi' })).toBeInTheDocument();
  });

  it('a bullet-list click converts the block to a list', async () => {
    const user = userEvent.setup();
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 0 },
      focus: { blockId: 'k', offset: 2 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: 'hi', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} toolbar />;
    }
    renderEditor(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Bullet list' }));
    expect(screen.getByRole('listitem')).toHaveTextContent('hi');
  });

  it('renders the toolbar Link button when the toolbar is on', () => {
    function Harness() {
      const [doc, setDoc] = useState(docFromText('hello'));
      return <RichTextEditor value={doc} onChange={setDoc} toolbar />;
    }
    render(
      <I18nProvider locale="en">
        <Harness />
      </I18nProvider>,
    );
    expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();
  });

  it('opening the link editor from the toolbar shows the link bubble', async () => {
    const user = userEvent.setup();
    // Stub readSelection so openLinkEditor gets a valid range (jsdom has no real caret).
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 0 },
      focus: { blockId: 'k', offset: 5 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: 'hello', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} toolbar autoFocus />;
    }
    render(
      <I18nProvider locale="en">
        <Harness />
      </I18nProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Link' }));
    expect(await screen.findByRole('group', { name: 'Edit link' })).toBeInTheDocument();
  });

  it('⌘K opens the link editor without leaking the shortcut to a host key handler', async () => {
    const user = userEvent.setup();
    // Stub readSelection so the ⌘K handler resolves a range (jsdom has no caret).
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 0 },
      focus: { blockId: 'k', offset: 5 },
    });
    const hostKeyDown = vi.fn();
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: 'hello', marks: [] }] }],
      });
      // A host wrapper standing in for a CRM's global ⌘K (command palette / search).
      return (
        <div onKeyDown={hostKeyDown}>
          <RichTextEditor value={doc} onChange={setDoc} toolbar autoFocus />
        </div>
      );
    }
    render(
      <I18nProvider locale="en">
        <Harness />
      </I18nProvider>,
    );
    screen.getByRole('textbox', { name: 'Rich text editor' }).focus();
    await user.keyboard('{Meta>}k{/Meta}');
    // The editor opened its own link bubble…
    expect(await screen.findByRole('group', { name: 'Edit link' })).toBeInTheDocument();
    // …and stopped the ⌘K from bubbling to the host handler.
    const kReachedHost = hostKeyDown.mock.calls.some(
      ([ev]) => (ev as React.KeyboardEvent).key.toLowerCase() === 'k',
    );
    expect(kReachedHost).toBe(false);
  });
});

describe('RichTextEditor paste', () => {
  beforeEach(() => {
    mockReadSelection.mockReset();
  });

  it('rich-HTML paste inserts formatted content', async () => {
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 0 },
      focus: { blockId: 'k', offset: 0 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: '', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} />;
    }
    render(
      <I18nProvider locale="en">
        <Harness />
      </I18nProvider>,
    );
    const editor = screen.getByRole('textbox', { name: 'Rich text editor' });
    const evt: Event & { clipboardData?: unknown } = new Event('paste', {
      bubbles: true,
      cancelable: true,
    });
    (evt as { clipboardData: unknown }).clipboardData = {
      getData: (t: string) => (t === 'text/html' ? '<p>a <strong>bold</strong></p>' : ''),
    };
    act(() => {
      editor.dispatchEvent(evt);
    });
    expect(await screen.findByText('bold')).toBeInTheDocument();
    expect(screen.getByText('bold').closest('strong')).not.toBeNull();
  });

  it('readOnly editor ignores HTML paste (onChange does not fire)', () => {
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 0 },
      focus: { blockId: 'k', offset: 0 },
    });
    const onChange = vi.fn();
    render(
      <I18nProvider locale="en">
        <RichTextEditor value={docFromText('x')} onChange={onChange} readOnly />
      </I18nProvider>,
    );
    const editor = screen.getByRole('textbox', { name: 'Rich text editor' });
    const evt: Event & { clipboardData?: unknown } = new Event('paste', {
      bubbles: true,
      cancelable: true,
    });
    (evt as { clipboardData: unknown }).clipboardData = {
      getData: (t: string) => (t === 'text/html' ? '<p>injected</p>' : ''),
    };
    editor.dispatchEvent(evt);
    expect(onChange).not.toHaveBeenCalled();
    expect(evt.defaultPrevented).toBe(false);
  });

  it('plain-text-only paste does not preventDefault (falls through to beforeinput)', () => {
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 0 },
      focus: { blockId: 'k', offset: 0 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: '', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} />;
    }
    render(
      <I18nProvider locale="en">
        <Harness />
      </I18nProvider>,
    );
    const editor = screen.getByRole('textbox', { name: 'Rich text editor' });
    const evt: Event & { clipboardData?: unknown } = new Event('paste', {
      bubbles: true,
      cancelable: true,
    });
    (evt as { clipboardData: unknown }).clipboardData = {
      getData: (t: string) => (t === 'text/plain' ? 'hello' : ''),
    };
    editor.dispatchEvent(evt);
    // No HTML → handler returns without preventing default.
    expect(evt.defaultPrevented).toBe(false);
  });
});

describe('RichTextEditor input rules', () => {
  beforeEach(() => {
    mockReadSelection.mockReset();
  });

  function typeSpace(editor: HTMLElement) {
    const evt = new Event('beforeinput', { bubbles: true, cancelable: true });
    Object.defineProperty(evt, 'inputType', { value: 'insertText' });
    Object.defineProperty(evt, 'data', { value: ' ' });
    act(() => {
      editor.dispatchEvent(evt);
    });
    return evt;
  }

  function renderWith(text: string) {
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: text.length },
      focus: { blockId: 'k', offset: text.length },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text, marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} />;
    }
    render(
      <I18nProvider locale="en">
        <Harness />
      </I18nProvider>,
    );
    return screen.getByRole('textbox', { name: 'Rich text editor' });
  }

  it('"# " converts the paragraph to a heading (space consumed)', () => {
    const editor = renderWith('#');
    const evt = typeSpace(editor);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(evt.defaultPrevented).toBe(true);
  });

  it('"- " converts to a bullet list', () => {
    const editor = renderWith('-');
    typeSpace(editor);
    expect(screen.getByRole('listitem')).toBeInTheDocument();
  });

  it('"> " converts to a blockquote', () => {
    const editor = renderWith('>');
    typeSpace(editor);
    expect(editor.querySelector('blockquote')).not.toBeNull();
  });

  it('keeps trailing content when converting a marker with text after it', () => {
    // "#foo" with the caret right after the "#" → heading "foo".
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 1 },
      focus: { blockId: 'k', offset: 1 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: '#foo', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} />;
    }
    render(
      <I18nProvider locale="en">
        <Harness />
      </I18nProvider>,
    );
    const editor = screen.getByRole('textbox', { name: 'Rich text editor' });
    typeSpace(editor);
    expect(screen.getByRole('heading', { level: 1, name: 'foo' })).toBeInTheDocument();
  });

  it('a space after non-marker text does not convert (inserts the space)', () => {
    const editor = renderWith('x');
    const evt = typeSpace(editor);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(editor.querySelector('blockquote')).toBeNull();
    expect(evt.defaultPrevented).toBe(true);
    // textContent (NOT toHaveTextContent, which trims) — the space must survive.
    expect(editor.textContent).toBe('x ');
  });

  it('a converted block is a single undo step (⌘Z reverts the conversion)', async () => {
    const user = userEvent.setup();
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 1 },
      focus: { blockId: 'k', offset: 1 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: '#', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} toolbar />;
    }
    render(
      <I18nProvider locale="en">
        <Harness />
      </I18nProvider>,
    );
    const editor = screen.getByRole('textbox', { name: 'Rich text editor' });
    typeSpace(editor);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(editor).toHaveTextContent('#');
  });
});

describe('RichTextEditor undo/redo', () => {
  beforeEach(() => {
    mockReadSelection.mockReset();
  });

  it('records an edit and undoes it via the toolbar', async () => {
    const user = userEvent.setup();
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 0 },
      focus: { blockId: 'k', offset: 2 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: 'hi', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} toolbar />;
    }
    render(
      <I18nProvider locale="en">
        <Harness />
      </I18nProvider>,
    );
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    expect(screen.getByRole('strong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.queryByRole('strong')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeEnabled();
  });

  it('clears history when value is replaced externally', async () => {
    const user = userEvent.setup();
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 0 },
      focus: { blockId: 'k', offset: 2 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: 'hi', marks: [] }] }],
      });
      return (
        <div>
          <button
            onClick={() =>
              setDoc({
                blocks: [{ id: 'z', type: 'paragraph', inlines: [{ text: 'new', marks: [] }] }],
              })
            }
          >
            replace
          </button>
          <RichTextEditor value={doc} onChange={setDoc} toolbar />
        </div>
      );
    }
    render(
      <I18nProvider locale="en">
        <Harness />
      </I18nProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'replace' }));
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });

  it('⌘Z undoes even with no live selection (caret lost)', async () => {
    const user = userEvent.setup();
    // Build one undo step (the edit needs a range).
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 0 },
      focus: { blockId: 'k', offset: 2 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: 'hi', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} toolbar />;
    }
    render(
      <I18nProvider locale="en">
        <Harness />
      </I18nProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    expect(screen.getByRole('strong')).toBeInTheDocument();
    // Now the caret is gone — undo must still work (it needs no selection).
    mockReadSelection.mockReturnValue(null);
    screen.getByRole('textbox', { name: 'Rich text editor' }).focus();
    await user.keyboard('{Meta>}z{/Meta}');
    expect(screen.queryByRole('strong')).not.toBeInTheDocument();
  });
});

describe('RichTextEditor mentions', () => {
  beforeEach(() => mockReadSelection.mockReset());

  const usersQuery = (q: string) =>
    Promise.resolve(
      [
        { id: 'u1', label: 'Alice' },
        { id: 'u2', label: 'Aaron' },
      ].filter((u) => u.label.toLowerCase().includes(q.toLowerCase())),
    );

  it('does not open a menu when the mentions prop is absent', () => {
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 3 },
      focus: { blockId: 'k', offset: 3 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: 'hi @', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} />;
    }
    renderEditor(<Harness />);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('opens the menu for a trigger context and inserts a chip on Enter', async () => {
    const user = userEvent.setup();
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 5 },
      focus: { blockId: 'k', offset: 5 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: 'hi @a', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} mentions={{ onQuery: usersQuery }} />;
    }
    renderEditor(<Harness />);
    const box = screen.getByRole('textbox');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    box.focus();
    await user.keyboard('{Enter}');
    // chip inserted: a data-mention span with the active item
    await waitFor(() =>
      expect(box.querySelector('[data-mention-id="u1"]')?.textContent).toBe('@Alice'),
    );
  });

  it('exposes combobox ARIA on the textbox when the menu is open', async () => {
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 5 },
      focus: { blockId: 'k', offset: 5 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: 'hi @a', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} mentions={{ onQuery: usersQuery }} />;
    }
    renderEditor(<Harness />);
    const box = screen.getByRole('textbox');
    const listbox = await screen.findByRole('listbox');
    expect(box).toHaveAttribute('aria-expanded', 'true');
    expect(box).toHaveAttribute('aria-controls', listbox.getAttribute('id')!);
    expect(box).toHaveAttribute('aria-autocomplete', 'list');
    await waitFor(() => expect(box.getAttribute('aria-activedescendant')).toBeTruthy());
  });

  it('Escape closes the menu without inserting', async () => {
    const user = userEvent.setup();
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 5 },
      focus: { blockId: 'k', offset: 5 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: 'hi @a', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} mentions={{ onQuery: usersQuery }} />;
    }
    renderEditor(<Harness />);
    const box = screen.getByRole('textbox');
    await screen.findByRole('listbox');
    box.focus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull());
    expect(box.querySelector('[data-mention-id]')).toBeNull();
  });
});

describe('RichTextEditor autolink', () => {
  beforeEach(() => mockReadSelection.mockReset());

  function typeSpaceAt(editor: HTMLElement) {
    const evt = new Event('beforeinput', { bubbles: true, cancelable: true });
    Object.defineProperty(evt, 'inputType', { value: 'insertText' });
    Object.defineProperty(evt, 'data', { value: ' ' });
    act(() => {
      editor.dispatchEvent(evt);
    });
    return evt;
  }

  function pasteEvent(data: Record<string, string>) {
    const evt: Event & { clipboardData?: unknown } = new Event('paste', {
      bubbles: true,
      cancelable: true,
    });
    (evt as { clipboardData: unknown }).clipboardData = {
      getData: (t: string) => data[t] ?? '',
    };
    return evt;
  }

  it('typing a space after a URL links it (and inserts the space)', () => {
    const text = 'see https://a.com';
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: text.length },
      focus: { blockId: 'k', offset: text.length },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text, marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} />;
    }
    renderEditor(<Harness />);
    const box = screen.getByRole('textbox', { name: 'Rich text editor' });
    const evt = typeSpaceAt(box);
    expect(evt.defaultPrevented).toBe(true);
    const a = box.querySelector('a');
    expect(a).not.toBeNull();
    expect(a?.getAttribute('href')).toBe('https://a.com');
    // The space was inserted after the link.
    expect(box.textContent).toBe('see https://a.com ');
  });

  it('autolink={false} disables the type rule (no link, space still inserted)', () => {
    const text = 'see https://a.com';
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: text.length },
      focus: { blockId: 'k', offset: text.length },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text, marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} autolink={false} />;
    }
    renderEditor(<Harness />);
    const box = screen.getByRole('textbox', { name: 'Rich text editor' });
    typeSpaceAt(box);
    expect(box.querySelector('a')).toBeNull();
    expect(box.textContent).toBe('see https://a.com ');
  });

  it('pasting a plain-text URL over a selection links the selection', () => {
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 0 },
      focus: { blockId: 'k', offset: 5 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: 'hello', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} />;
    }
    renderEditor(<Harness />);
    const box = screen.getByRole('textbox', { name: 'Rich text editor' });
    const evt = pasteEvent({ 'text/plain': 'https://a.com' });
    act(() => {
      box.dispatchEvent(evt);
    });
    expect(evt.defaultPrevented).toBe(true);
    const a = box.querySelector('a');
    expect(a?.getAttribute('href')).toBe('https://a.com');
    // The selected text "hello" is preserved as the link's display text.
    expect(a?.textContent).toBe('hello');
  });

  it('pasting text containing a URL at a collapsed caret linkifies it', () => {
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 0 },
      focus: { blockId: 'k', offset: 0 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: '', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} />;
    }
    renderEditor(<Harness />);
    const box = screen.getByRole('textbox', { name: 'Rich text editor' });
    const evt = pasteEvent({ 'text/plain': 'go https://a.com now' });
    act(() => {
      box.dispatchEvent(evt);
    });
    expect(evt.defaultPrevented).toBe(true);
    const a = box.querySelector('a');
    expect(a?.getAttribute('href')).toBe('https://a.com');
    expect(box.textContent).toBe('go https://a.com now');
  });

  it('plain-text paste with NO url does not preventDefault (falls through)', () => {
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 0 },
      focus: { blockId: 'k', offset: 0 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: '', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} />;
    }
    renderEditor(<Harness />);
    const box = screen.getByRole('textbox', { name: 'Rich text editor' });
    const evt = pasteEvent({ 'text/plain': 'just words' });
    act(() => {
      box.dispatchEvent(evt);
    });
    expect(evt.defaultPrevented).toBe(false);
  });

  it('autolink={false} disables plain-text paste linkifying (falls through)', () => {
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 0 },
      focus: { blockId: 'k', offset: 0 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text: '', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} autolink={false} />;
    }
    renderEditor(<Harness />);
    const box = screen.getByRole('textbox', { name: 'Rich text editor' });
    const evt = pasteEvent({ 'text/plain': 'https://a.com' });
    act(() => {
      box.dispatchEvent(evt);
    });
    expect(evt.defaultPrevented).toBe(false);
  });
});

describe('RichTextEditor renderLink', () => {
  beforeEach(() => mockReadSelection.mockReset());

  const chip: React.ComponentProps<typeof RichTextEditor>['renderLink'] = ({ href }, fallback) =>
    href.startsWith('https://chip') ? <span data-chip>{href}</span> : fallback;

  it('renders a resolved link as a non-editable atomic [data-rich-link] chip', () => {
    mockReadSelection.mockReturnValue(null);
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [
          {
            id: 'k',
            type: 'paragraph',
            inlines: [{ text: 'task', marks: [{ type: 'link', href: 'https://chip/1' }] }],
          },
        ],
      });
      return <RichTextEditor value={doc} onChange={setDoc} renderLink={chip} />;
    }
    renderEditor(<Harness />);
    const box = screen.getByRole('textbox', { name: 'Rich text editor' });
    const widget = box.querySelector('[data-rich-link]');
    expect(widget).not.toBeNull();
    expect(widget?.getAttribute('contenteditable')).toBe('false');
    expect(widget?.querySelector('[data-chip]')).not.toBeNull();
  });

  it('a declined link (renderLink returns fallback) stays a plain editable anchor', () => {
    mockReadSelection.mockReturnValue(null);
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [
          {
            id: 'k',
            type: 'paragraph',
            inlines: [{ text: 'ext', marks: [{ type: 'link', href: 'https://other.com' }] }],
          },
        ],
      });
      return <RichTextEditor value={doc} onChange={setDoc} renderLink={chip} />;
    }
    renderEditor(<Harness />);
    const box = screen.getByRole('textbox', { name: 'Rich text editor' });
    expect(box.querySelector('[data-rich-link]')).toBeNull();
    expect(box.querySelector('a')).not.toBeNull();
  });

  it('Backspace just after a resolved chip deletes the whole link atomically', () => {
    // "go " (3) + linked chip "https://chip/1" (14) → caret at offset 17 (end).
    const href = 'https://chip/1';
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'k', offset: 3 + href.length },
      focus: { blockId: 'k', offset: 3 + href.length },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [
          {
            id: 'k',
            type: 'paragraph',
            inlines: [
              { text: 'go ', marks: [] },
              { text: href, marks: [{ type: 'link', href }] },
            ],
          },
        ],
      });
      return <RichTextEditor value={doc} onChange={setDoc} renderLink={chip} />;
    }
    renderEditor(<Harness />);
    const box = screen.getByRole('textbox', { name: 'Rich text editor' });
    expect(box.querySelector('[data-rich-link]')).not.toBeNull();
    const evt = new Event('beforeinput', { bubbles: true, cancelable: true });
    Object.defineProperty(evt, 'inputType', { value: 'deleteContentBackward' });
    Object.defineProperty(evt, 'data', { value: null });
    act(() => {
      box.dispatchEvent(evt);
    });
    expect(evt.defaultPrevented).toBe(true);
    // The whole chip is gone; only "go " remains.
    expect(box.querySelector('[data-rich-link]')).toBeNull();
    expect(box.textContent).toBe('go ');
  });
});

describe('blockControls', () => {
  function Controlled(props: { blockControls?: boolean; readOnly?: boolean }) {
    const [doc, setDoc] = useState(docFromText('one\ntwo\nthree'));
    return <RichTextEditor value={doc} onChange={setDoc} {...props} />;
  }

  it('is absent by default', () => {
    render(
      <I18nProvider locale="en">
        <Controlled />
      </I18nProvider>,
    );
    expect(screen.queryByRole('button', { name: 'Block actions' })).toBeNull();
  });

  it('hovering a block reveals its gutter', async () => {
    render(
      <I18nProvider locale="en">
        <Controlled blockControls />
      </I18nProvider>,
    );
    const block = document.querySelector('[data-block-id]') as HTMLElement;
    await userEvent.hover(block);
    expect(screen.getByRole('button', { name: 'Block actions' })).toBeInTheDocument();
  });

  it('＋ inserts an empty paragraph below', async () => {
    render(
      <I18nProvider locale="en">
        <Controlled blockControls />
      </I18nProvider>,
    );
    const block = document.querySelector('[data-block-id]') as HTMLElement;
    await userEvent.hover(block);
    const before = document.querySelectorAll('[data-block-id]').length;
    await userEvent.click(screen.getByRole('button', { name: 'Insert block below' }));
    expect(document.querySelectorAll('[data-block-id]').length).toBe(before + 1);
  });

  it('readOnly suppresses the gutter', async () => {
    render(
      <I18nProvider locale="en">
        <Controlled blockControls readOnly />
      </I18nProvider>,
    );
    const block = document.querySelector('[data-block-id]') as HTMLElement;
    await userEvent.hover(block);
    expect(screen.queryByRole('button', { name: 'Block actions' })).toBeNull();
  });

  it('⌘⇧↓ moves the caret block down (subtree-aware, via commit)', async () => {
    const user = userEvent.setup();
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'a', offset: 0 },
      focus: { blockId: 'a', offset: 0 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [
          { id: 'a', type: 'paragraph', inlines: [{ text: 'AAA', marks: [] }] },
          { id: 'b', type: 'paragraph', inlines: [{ text: 'BBB', marks: [] }] },
        ],
      });
      return <RichTextEditor value={doc} onChange={setDoc} blockControls />;
    }
    renderEditor(<Harness />);
    screen.getByRole('textbox').focus();
    await user.keyboard('{Meta>}{Shift>}{ArrowDown}{/Shift}{/Meta}');
    const order = Array.from(document.querySelectorAll('[data-block-id]')).map((el) =>
      el.getAttribute('data-block-id'),
    );
    expect(order).toEqual(['b', 'a']);
  });

  it('block menu Turn into a list is idempotent (SET, not toggle)', async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider locale="en">
        <Controlled blockControls />
      </I18nProvider>,
    );
    const turnIntoBullet = async (el: HTMLElement) => {
      await user.hover(el);
      await user.click(screen.getByRole('button', { name: 'Block actions' }));
      await user.click(screen.getByRole('menuitem', { name: /turn into/i }));
      await user.click(await screen.findByRole('menuitem', { name: 'Bullet list' }));
    };
    await turnIntoBullet(document.querySelector('[data-block-id]') as HTMLElement);
    expect(document.querySelector('li[data-block-id]')).toBeTruthy();
    // Choosing the SAME type again must keep it a list — the old toggle bug
    // reverted it to a paragraph.
    await turnIntoBullet(document.querySelector('li[data-block-id]') as HTMLElement);
    expect(document.querySelector('li[data-block-id]')).toBeTruthy();
  });

  it('⌘D duplicates the caret block (via commit)', async () => {
    const user = userEvent.setup();
    mockReadSelection.mockReturnValue({
      anchor: { blockId: 'a', offset: 0 },
      focus: { blockId: 'a', offset: 0 },
    });
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [{ id: 'a', type: 'paragraph', inlines: [{ text: 'AAA', marks: [] }] }],
      });
      return <RichTextEditor value={doc} onChange={setDoc} blockControls />;
    }
    renderEditor(<Harness />);
    screen.getByRole('textbox').focus();
    await user.keyboard('{Meta>}d{/Meta}');
    expect(document.querySelectorAll('[data-block-id]').length).toBe(2);
  });

  it('open menu acts on its block even after hovering another (no hover steal)', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [doc, setDoc] = useState<RichDoc>({
        blocks: [
          { id: 'a', type: 'paragraph', inlines: [{ text: 'AAA', marks: [] }] },
          { id: 'b', type: 'paragraph', inlines: [{ text: 'BBB', marks: [] }] },
        ],
      });
      return <RichTextEditor value={doc} onChange={setDoc} blockControls />;
    }
    renderEditor(<Harness />);
    const [blockA, blockB] = Array.from(
      document.querySelectorAll('[data-block-id]'),
    ) as HTMLElement[];
    // Open the menu on block A…
    await user.hover(blockA);
    await user.click(screen.getByRole('button', { name: 'Block actions' }));
    // …then hover block B before choosing Delete.
    await user.hover(blockB);
    await user.click(await screen.findByRole('menuitem', { name: /delete/i }));
    // Block A must be the one removed, leaving B.
    const remaining = Array.from(document.querySelectorAll('[data-block-id]'));
    expect(remaining).toHaveLength(1);
    expect(remaining[0].textContent).toBe('BBB');
  });

  it('block menu Duplicate routes through commit (block count grows)', async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider locale="en">
        <Controlled blockControls />
      </I18nProvider>,
    );
    const block = document.querySelector('[data-block-id]') as HTMLElement;
    await user.hover(block);
    const before = document.querySelectorAll('[data-block-id]').length;
    await user.click(screen.getByRole('button', { name: 'Block actions' }));
    await user.click(await screen.findByRole('menuitem', { name: /duplicate/i }));
    expect(document.querySelectorAll('[data-block-id]').length).toBe(before + 1);
  });
});
