// RichTextBlockControls.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { I18nProvider } from '../../i18n';
import { RichTextBlockControls } from './RichTextBlockControls';

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

it('a plain grip click (no drag) opens the block menu', async () => {
  const onMenuOpenChange = vi.fn();
  render(<Harness onMenuOpenChange={onMenuOpenChange} />);
  await userEvent.click(screen.getByRole('button', { name: 'Block actions' }));
  expect(onMenuOpenChange).toHaveBeenCalledWith(true);
});

// The live drag lifecycle (reflow transforms, drop gap, cleanup) can't be driven in
// jsdom — dnd-kit's PointerSensor needs real layout/pointer-capture (the Sortable
// component has the same limitation). The drop-gap math is the pure, tested
// gapIndexFromY (blockDrop.test.ts) + computeReflow (blockReflow.test.ts); the live
// behaviour is verified manually in the playground. No in-repo e2e harness yet.
it('applies no transform or lifted style at rest', () => {
  const { container } = render(<Harness />);
  const block = container.querySelector('[data-block-id="b1"]') as HTMLElement;
  expect(block.style.transform).toBe('');
  expect(block.className).not.toContain('blockLifted');
  // The gutter only translates while dragging (it follows the lifted row); at rest
  // it carries no transform.
  const gutter = container.querySelector('[contenteditable="false"]') as HTMLElement;
  expect(gutter.style.transform).toBe('');
});

it('re-measures the gutter position when blockOrderKey changes (post-drop / insert / delete)', () => {
  // The active block keeps its id across a reorder, so without an order-derived
  // dependency the gutter's measured `top` would go stale and the controls would
  // linger at the block's OLD row. Changing only blockOrderKey must re-measure.
  function OrderHarness({ orderKey }: { orderKey: string }) {
    const rootRef = useRef<HTMLDivElement>(null);
    return (
      <I18nProvider locale="en">
        <div ref={rootRef} style={{ position: 'relative' }}>
          <p data-block-id="b1">hello</p>
          <RichTextBlockControls
            rootRef={rootRef}
            activeBlockId="b1"
            blockOrderKey={orderKey}
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
  const { container, rerender } = render(<OrderHarness orderKey="b1" />);
  const block = container.querySelector('[data-block-id="b1"]') as HTMLElement;
  // jsdom has no layout (rect is all-zero); stand in a moved row position.
  block.getBoundingClientRect = () =>
    ({ top: 40, left: 0, width: 200, height: 18, right: 200, bottom: 58, x: 0, y: 40 }) as DOMRect;
  // Same activeBlockId/menuOpen — only the order key changes (as after a drop).
  rerender(<OrderHarness orderKey="b1|b0" />);
  const gutter = screen
    .getByRole('button', { name: 'Insert block below' })
    .closest('[contenteditable="false"]') as HTMLElement;
  expect(gutter.style.top).toBe('40px');
});
