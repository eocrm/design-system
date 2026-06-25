// RichTextBlockMenu.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n';
import { RichTextBlockMenu } from './RichTextBlockMenu';

function setup(props: Partial<React.ComponentProps<typeof RichTextBlockMenu>> = {}) {
  const onAction = vi.fn();
  const onTurnInto = vi.fn();
  render(
    <I18nProvider locale="en">
      <RichTextBlockMenu
        open
        onOpenChange={() => {}}
        onAction={onAction}
        onTurnInto={onTurnInto}
        {...props}
      />
    </I18nProvider>,
  );
  return { onAction, onTurnInto };
}

it('renders the handle with the block-actions aria-label', () => {
  setup({ open: false });
  expect(screen.getByRole('button', { name: 'Block actions' })).toBeInTheDocument();
});

it('the handle is not a tab stop', () => {
  setup({ open: false });
  expect(screen.getByRole('button', { name: 'Block actions' })).toHaveAttribute('tabindex', '-1');
});

it('fires onAction("duplicate") when Duplicate is chosen', async () => {
  const { onAction } = setup();
  await userEvent.click(screen.getByRole('menuitem', { name: /duplicate/i }));
  expect(onAction).toHaveBeenCalledWith('duplicate');
});

it('fires onAction("delete") for the Delete item', async () => {
  const { onAction } = setup();
  await userEvent.click(screen.getByRole('menuitem', { name: /delete/i }));
  expect(onAction).toHaveBeenCalledWith('delete');
});
