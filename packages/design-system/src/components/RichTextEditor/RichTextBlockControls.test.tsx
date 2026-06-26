// RichTextBlockControls.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { I18nProvider } from '../../i18n';
import { RichTextBlockControls, readBlockSnapshot } from './RichTextBlockControls';

function Harness(props: Partial<React.ComponentProps<typeof RichTextBlockControls>>) {
  const rootRef = useRef<HTMLDivElement>(null);
  return (
    <I18nProvider locale="en">
      <div ref={rootRef} style={{ position: 'relative' }}>
        <p data-block-id="b1">hello</p>
        <RichTextBlockControls
          rootRef={rootRef}
          activeBlockId="b1"
          menuOpen={false}
          onMenuOpenChange={() => {}}
          onInsertBelow={() => {}}
          onAction={() => {}}
          onTurnInto={() => {}}
          onReorder={() => {}}
          {...props}
        />
      </div>
    </I18nProvider>
  );
}

it('renders insert + actions buttons for the active block', () => {
  render(<Harness />);
  expect(screen.getByRole('button', { name: 'Insert block below' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Block actions' })).toBeInTheDocument();
});

it('fires onInsertBelow with the active block id', async () => {
  const onInsertBelow = vi.fn();
  render(<Harness onInsertBelow={onInsertBelow} />);
  await userEvent.click(screen.getByRole('button', { name: 'Insert block below' }));
  expect(onInsertBelow).toHaveBeenCalledWith('b1');
});

it('binds the active block id into the menu onAction callback', async () => {
  const onAction = vi.fn();
  render(<Harness menuOpen onAction={onAction} />);
  await userEvent.click(screen.getByRole('menuitem', { name: /duplicate/i }));
  expect(onAction).toHaveBeenCalledWith('b1', 'duplicate');
});

it('binds the active block id into the menu onTurnInto callback', async () => {
  const onTurnInto = vi.fn();
  render(<Harness menuOpen onTurnInto={onTurnInto} />);
  await userEvent.click(screen.getByRole('menuitem', { name: /turn into/i }));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Heading 1' }));
  expect(onTurnInto).toHaveBeenCalledWith('b1', { type: 'heading', level: 1 });
});

it('hides "Turn into" for an attachment block but keeps the other actions', async () => {
  render(<Harness menuOpen activeBlockType="attachment" />);
  await userEvent.click(screen.getByRole('button', { name: 'Block actions' }));
  expect(screen.queryByRole('menuitem', { name: /turn into/i })).toBeNull();
  expect(screen.getByRole('menuitem', { name: /duplicate/i })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: /delete/i })).toBeInTheDocument();
});

it('shows "Turn into" for a normal (paragraph) block', async () => {
  render(<Harness menuOpen activeBlockType="paragraph" />);
  await userEvent.click(screen.getByRole('button', { name: 'Block actions' }));
  expect(screen.getByRole('menuitem', { name: /turn into/i })).toBeInTheDocument();
});

it('renders nothing when activeBlockId is null', () => {
  function NullHarness() {
    const rootRef = useRef<HTMLDivElement>(null);
    return (
      <I18nProvider locale="en">
        <div ref={rootRef}>
          <RichTextBlockControls
            rootRef={rootRef}
            activeBlockId={null}
            menuOpen={false}
            onMenuOpenChange={() => {}}
            onInsertBelow={() => {}}
            onAction={() => {}}
            onTurnInto={() => {}}
            onReorder={() => {}}
          />
        </div>
      </I18nProvider>
    );
  }
  render(<NullHarness />);
  expect(screen.queryByRole('button', { name: 'Insert block below' })).toBeNull();
});

it('shows a Configure (gear) button when onConfigure is provided', async () => {
  const onConfigure = vi.fn();
  render(<Harness activeBlockType="attachment" onConfigure={onConfigure} />);
  await userEvent.click(screen.getByRole('button', { name: 'Configure' }));
  expect(onConfigure).toHaveBeenCalledWith('b1');
});

it('no gear when onConfigure is omitted', () => {
  render(<Harness activeBlockType="attachment" />);
  expect(screen.queryByRole('button', { name: 'Configure' })).toBeNull();
});

it('block menu shows a Configure item that fires onConfigure', async () => {
  const onConfigure = vi.fn();
  render(<Harness activeBlockType="attachment" menuOpen onConfigure={onConfigure} />);
  await userEvent.click(screen.getByRole('menuitem', { name: 'Configure' }));
  expect(onConfigure).toHaveBeenCalledWith('b1');
});

describe('readBlockSnapshot', () => {
  it('returns the block element outerHTML + measured width', () => {
    const root = document.createElement('div');
    const p = document.createElement('p');
    p.setAttribute('data-block-id', 'x1');
    p.textContent = 'hello';
    root.appendChild(p);
    // jsdom has no layout; stub the measured width.
    p.getBoundingClientRect = () => ({ width: 240, height: 20, top: 0, left: 0, right: 240, bottom: 20, x: 0, y: 0, toJSON: () => ({}) });

    expect(readBlockSnapshot(root, 'x1')).toEqual({
      html: '<p data-block-id="x1">hello</p>',
      width: 240,
    });
  });

  it('returns null when the block id is absent or root is null', () => {
    const root = document.createElement('div');
    expect(readBlockSnapshot(root, 'nope')).toBeNull();
    expect(readBlockSnapshot(null, 'x1')).toBeNull();
  });
});

it('a plain grip click (no drag) opens the block menu', async () => {
  const onMenuOpenChange = vi.fn();
  render(<Harness onMenuOpenChange={onMenuOpenChange} />);
  await userEvent.click(screen.getByRole('button', { name: 'Block actions' }));
  expect(onMenuOpenChange).toHaveBeenCalledWith(true);
});

// NOTE: the real grip-drag lifecycle (PointerSensor 4px activation → onDraggingChange,
// floating clone, source dim, drop/reorder) is covered by Playwright in Task 4. jsdom
// cannot drive dnd-kit's PointerSensor (no layout / pointer-capture), matching the
// Sortable precedent of not unit-testing real drags.
it('renders no drag-overlay clone and no dimmed block at rest', () => {
  const { container } = render(<Harness />);
  // No drag in progress → DragOverlay renders null; the only [data-block-id] is the
  // single source <p> in the harness, never a second (cloned) copy.
  expect(container.querySelectorAll('[data-block-id="b1"]')).toHaveLength(1);
});
