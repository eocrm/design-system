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
