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

it('fires onTurnInto with a BlockChoice from the Turn into submenu', async () => {
  const { onTurnInto } = setup();
  // Open the "Turn into" submenu, then pick Heading 1.
  await userEvent.click(screen.getByRole('menuitem', { name: /turn into/i }));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Heading 1' }));
  expect(onTurnInto).toHaveBeenCalledWith({ type: 'heading', level: 1 });
});

it('conveys a list turn-into as a list BlockChoice (no depth)', async () => {
  const { onTurnInto } = setup();
  await userEvent.click(screen.getByRole('menuitem', { name: /turn into/i }));
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Bullet list' }));
  expect(onTurnInto).toHaveBeenCalledWith({ type: 'bullet_item' });
});

it('omits both color submenus when onColor is not provided', () => {
  setup();
  expect(screen.queryByRole('menuitem', { name: 'Text color' })).toBeNull();
  expect(screen.queryByRole('menuitem', { name: 'Highlight' })).toBeNull();
});

it('renders both color submenus when onColor is provided', () => {
  setup({ onColor: vi.fn() });
  expect(screen.getByRole('menuitem', { name: 'Text color' })).toBeInTheDocument();
  expect(screen.getByRole('menuitem', { name: 'Highlight' })).toBeInTheDocument();
});

it('fires onColor("textColor", key) from the Text color submenu', async () => {
  const onColor = vi.fn();
  setup({ onColor });
  await userEvent.click(screen.getByRole('menuitem', { name: 'Text color' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Green' }));
  expect(onColor).toHaveBeenCalledWith('textColor', 'green');
});

it('fires onColor("bgColor", key) from the Highlight submenu', async () => {
  const onColor = vi.fn();
  setup({ onColor });
  await userEvent.click(screen.getByRole('menuitem', { name: 'Highlight' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Blue' }));
  expect(onColor).toHaveBeenCalledWith('bgColor', 'blue');
});
