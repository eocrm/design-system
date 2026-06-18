import { render, screen } from '@testing-library/react';
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
});
