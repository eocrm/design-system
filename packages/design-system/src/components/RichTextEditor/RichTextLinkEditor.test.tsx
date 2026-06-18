import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RichTextLinkEditor } from './RichTextLinkEditor';
import { I18nProvider } from '../../i18n';

function renderBubble(props: Partial<React.ComponentProps<typeof RichTextLinkEditor>> = {}) {
  const onApply = vi.fn();
  const onRemove = vi.fn();
  const onCancel = vi.fn();
  render(
    <I18nProvider locale="en">
      <RichTextLinkEditor
        href=""
        editing={false}
        anchorRect={{ top: 0, left: 0, width: 0, height: 0 }}
        onApply={onApply}
        onRemove={onRemove}
        onCancel={onCancel}
        {...props}
      />
    </I18nProvider>,
  );
  return { onApply, onRemove, onCancel };
}

describe('RichTextLinkEditor', () => {
  it('renders a URL field and Apply, no Remove when creating', () => {
    renderBubble();
    expect(screen.getByRole('textbox', { name: 'Link URL' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove link' })).not.toBeInTheDocument();
  });

  it('shows Remove and pre-fills the href when editing', () => {
    renderBubble({ editing: true, href: 'https://x.test' });
    expect(screen.getByRole('textbox', { name: 'Link URL' })).toHaveValue('https://x.test');
    expect(screen.getByRole('button', { name: 'Remove link' })).toBeInTheDocument();
  });

  it('Enter applies the trimmed URL', async () => {
    const user = userEvent.setup();
    const { onApply } = renderBubble();
    await user.type(screen.getByRole('textbox', { name: 'Link URL' }), '  /docs  {Enter}');
    expect(onApply).toHaveBeenCalledWith('/docs');
  });

  it('Escape cancels', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderBubble();
    await user.type(screen.getByRole('textbox', { name: 'Link URL' }), '{Escape}');
    expect(onCancel).toHaveBeenCalled();
  });

  it('Remove fires onRemove', async () => {
    const user = userEvent.setup();
    const { onRemove } = renderBubble({ editing: true, href: '/p' });
    await user.click(screen.getByRole('button', { name: 'Remove link' }));
    expect(onRemove).toHaveBeenCalled();
  });

  it('the bubble is a labelled group', () => {
    renderBubble();
    expect(screen.getByRole('group', { name: 'Edit link' })).toBeInTheDocument();
  });

  it('Apply button click applies the URL', async () => {
    const user = userEvent.setup();
    const { onApply } = renderBubble();
    await user.type(screen.getByRole('textbox', { name: 'Link URL' }), 'https://example.com');
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(onApply).toHaveBeenCalledWith('https://example.com');
  });

  it('a pointerdown outside the bubble calls onCancel', () => {
    const { onCancel } = renderBubble();
    fireEvent.pointerDown(document.body);
    expect(onCancel).toHaveBeenCalled();
  });
});
