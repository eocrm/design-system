import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { I18nProvider } from '../../i18n';
import { RichTextColorMenu } from './RichTextColorMenu';
import styles from './RichTextEditor.module.scss';

function setup(props: Partial<React.ComponentProps<typeof RichTextColorMenu>> = {}) {
  const onPick = vi.fn();
  const utils = render(
    <I18nProvider locale="en">
      <RichTextColorMenu type="textColor" onPick={onPick} {...props} />
    </I18nProvider>,
  );
  return { onPick, ...utils };
}

describe('RichTextColorMenu', () => {
  it('exposes the menu as a group labelled by its type', () => {
    setup({ type: 'textColor' });
    expect(screen.getByRole('group', { name: 'Text color' })).toBeInTheDocument();
  });

  it('labels the bgColor menu as Highlight', () => {
    setup({ type: 'bgColor' });
    expect(screen.getByRole('group', { name: 'Highlight' })).toBeInTheDocument();
  });

  it('renders a Default/clear badge plus one badge per palette key', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Default' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Red' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Green' })).toBeInTheDocument();
  });

  it('renders the full palette as named badges, including the new extras', () => {
    setup();
    // Each name appears exactly once now (single-type menu, no duplicate rows).
    expect(screen.getAllByLabelText('Red')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Coral' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Charcoal' })).toBeInTheDocument();
  });

  it('shows the color name as the badge text', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Coral' })).toHaveTextContent('Coral');
  });

  it('clicking a color badge calls onPick(key)', async () => {
    const user = userEvent.setup();
    const { onPick } = setup();
    await user.click(screen.getByRole('button', { name: 'Coral' }));
    expect(onPick).toHaveBeenCalledWith('coral');
  });

  it('clicking the Default badge calls onPick(null)', async () => {
    const user = userEvent.setup();
    const { onPick } = setup();
    await user.click(screen.getByRole('button', { name: 'Default' }));
    expect(onPick).toHaveBeenCalledWith(null);
  });

  it('rings the active badge with the active class', () => {
    setup({ active: 'red' });
    expect(screen.getByRole('button', { name: 'Red' })).toHaveClass(styles.colorBadgeActive);
    expect(screen.getByRole('button', { name: 'Green' })).not.toHaveClass(styles.colorBadgeActive);
  });

  it('marks the active badge aria-pressed=true and others false', () => {
    setup({ active: 'red' });
    expect(screen.getByRole('button', { name: 'Red' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Green' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks the Default badge pressed only when no color is active', () => {
    const { rerender } = setup();
    // No active color → Default is pressed.
    expect(screen.getByRole('button', { name: 'Default' })).toHaveAttribute('aria-pressed', 'true');
    rerender(
      <I18nProvider locale="en">
        <RichTextColorMenu type="textColor" active="red" onPick={vi.fn()} />
      </I18nProvider>,
    );
    // A color is active → Default is not pressed.
    expect(screen.getByRole('button', { name: 'Default' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
