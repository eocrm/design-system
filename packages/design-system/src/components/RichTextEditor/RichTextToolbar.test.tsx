import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RichTextToolbar } from './RichTextToolbar';
import { I18nProvider } from '../../i18n';

function renderTb(props: Partial<React.ComponentProps<typeof RichTextToolbar>> = {}) {
  const onToggleMark = vi.fn();
  const onSetBlock = vi.fn();
  const onToggleList = vi.fn();
  const onOpenLink = vi.fn();
  render(
    <I18nProvider locale="en">
      <RichTextToolbar
        activeMarks={[]}
        block={{ type: 'paragraph' }}
        onToggleMark={onToggleMark}
        onSetBlock={onSetBlock}
        onToggleList={onToggleList}
        onOpenLink={onOpenLink}
        {...props}
      />
    </I18nProvider>,
  );
  return { onToggleMark, onSetBlock, onToggleList, onOpenLink };
}

describe('RichTextToolbar', () => {
  it('renders a toolbar with mark + list buttons', () => {
    renderTb();
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bullet list' })).toBeInTheDocument();
  });

  it('reflects active marks via aria-pressed', () => {
    renderTb({ activeMarks: ['bold'] });
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('fires onToggleMark on click', async () => {
    const user = userEvent.setup();
    const { onToggleMark } = renderTb();
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    expect(onToggleMark).toHaveBeenCalledWith('bold');
  });

  it('the block-type trigger shows the current block label', () => {
    renderTb({ block: { type: 'heading', level: 2 } });
    // The trigger's accessible name is the `blockType` label ('Text style');
    // its visible text content is the current block's label.
    expect(screen.getByRole('button', { name: 'Text style' })).toHaveTextContent('Heading 2');
  });

  it('marks a list button pressed when the block is that list', () => {
    renderTb({ block: { type: 'bullet_item' } });
    expect(screen.getByRole('button', { name: 'Bullet list' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('fires onToggleList on a list-button click', async () => {
    const user = userEvent.setup();
    const { onToggleList } = renderTb();
    await user.click(screen.getByRole('button', { name: 'Numbered list' }));
    expect(onToggleList).toHaveBeenCalledWith('ordered_item');
  });

  it('fires onSetBlock when a block-type menu item is chosen', async () => {
    const user = userEvent.setup();
    const { onSetBlock } = renderTb();
    await user.click(screen.getByRole('button', { name: 'Text style' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Heading 2' }));
    expect(onSetBlock).toHaveBeenCalledWith({ type: 'heading', level: 2 });
  });

  it('disables every control when disabled', () => {
    renderTb({ disabled: true });
    expect(screen.getByRole('button', { name: 'Bold' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Numbered list' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Text style' })).toBeDisabled();
  });

  it('renders a Link button', () => {
    renderTb();
    expect(screen.getByRole('button', { name: 'Link' })).toBeInTheDocument();
  });

  it('reflects linkActive via aria-pressed', () => {
    renderTb({ linkActive: true });
    expect(screen.getByRole('button', { name: 'Link' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('fires onOpenLink when the Link button is clicked', async () => {
    const user = userEvent.setup();
    const { onOpenLink } = renderTb();
    await user.click(screen.getByRole('button', { name: 'Link' }));
    expect(onOpenLink).toHaveBeenCalled();
  });

  it('disables the Link button when disabled', () => {
    renderTb({ disabled: true });
    expect(screen.getByRole('button', { name: 'Link' })).toBeDisabled();
  });
});
