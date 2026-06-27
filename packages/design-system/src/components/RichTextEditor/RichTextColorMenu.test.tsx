import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RichTextColorMenu } from './RichTextColorMenu';
import styles from './RichTextEditor.module.scss';

function setup(active: { textColor?: string; bgColor?: string } = {}) {
  const onPick = vi.fn();
  const utils = render(<RichTextColorMenu active={active} onPick={onPick} />);
  return { onPick, ...utils };
}

describe('RichTextColorMenu', () => {
  it('renders the Text and Highlight rows', () => {
    setup();
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Highlight')).toBeInTheDocument();
  });

  it('renders a clear + per-key swatch in each row with color-name aria-labels', () => {
    setup();
    // 2 rows × (5 palette keys), each name appears once per row.
    expect(screen.getAllByLabelText('Red')).toHaveLength(2);
    expect(screen.getAllByLabelText('Green')).toHaveLength(2);
    expect(screen.getAllByLabelText('Default')).toHaveLength(2); // the ⌀ clear swatch
  });

  it('clicking the red text swatch calls onPick("textColor","red")', async () => {
    const user = userEvent.setup();
    const { onPick } = setup();
    // First row is the Text (textColor) row.
    await user.click(screen.getAllByLabelText('Red')[0]);
    expect(onPick).toHaveBeenCalledWith('textColor', 'red');
  });

  it('clicking a highlight swatch calls onPick("bgColor", key)', async () => {
    const user = userEvent.setup();
    const { onPick } = setup();
    await user.click(screen.getAllByLabelText('Blue')[1]); // second row = Highlight (bgColor)
    expect(onPick).toHaveBeenCalledWith('bgColor', 'blue');
  });

  it('clicking the text Clear swatch calls onPick("textColor", null)', async () => {
    const user = userEvent.setup();
    const { onPick } = setup();
    await user.click(screen.getAllByLabelText('Default')[0]);
    expect(onPick).toHaveBeenCalledWith('textColor', null);
  });

  it('rings the active key swatch with the active class', () => {
    setup({ textColor: 'red', bgColor: 'blue' });
    expect(screen.getAllByLabelText('Red')[0]).toHaveClass(styles.swatchActive);
    expect(screen.getAllByLabelText('Blue')[1]).toHaveClass(styles.swatchActive);
    // A non-active swatch is not ringed.
    expect(screen.getAllByLabelText('Green')[0]).not.toHaveClass(styles.swatchActive);
  });
});
