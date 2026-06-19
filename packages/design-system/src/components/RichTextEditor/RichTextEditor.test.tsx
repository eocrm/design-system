import { act, render, screen } from '@testing-library/react';
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
