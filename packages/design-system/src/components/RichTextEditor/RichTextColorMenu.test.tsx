import { render, screen, within } from '@testing-library/react';
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
    // 2 rows × the full 30-color palette, each name appears once per row.
    expect(screen.getAllByLabelText('Red')).toHaveLength(2);
    expect(screen.getAllByLabelText('Green')).toHaveLength(2);
    expect(screen.getAllByLabelText('Default')).toHaveLength(2); // the ⌀ clear swatch
  });

  it('exposes the full palette, including colors beyond the old curated set', () => {
    setup();
    // Coral / Charcoal are new to the full-palette swatch grid.
    expect(screen.getAllByLabelText('Coral')).toHaveLength(2);
    expect(screen.getAllByLabelText('Charcoal')).toHaveLength(2);
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

  it('marks the active swatch aria-pressed=true and others false', () => {
    setup({ textColor: 'red' });
    // The active text swatch is pressed…
    expect(screen.getAllByLabelText('Red')[0]).toHaveAttribute('aria-pressed', 'true');
    // …while non-active swatches in that row are not.
    expect(screen.getAllByLabelText('Green')[0]).toHaveAttribute('aria-pressed', 'false');
    // No bgColor active → the highlight Red swatch is not pressed.
    expect(screen.getAllByLabelText('Red')[1]).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks the clear swatch aria-pressed=true only when no color is active for its type', () => {
    setup({ textColor: 'red' });
    // Text row has a color → its clear swatch is NOT pressed.
    expect(screen.getAllByLabelText('Default')[0]).toHaveAttribute('aria-pressed', 'false');
    // Highlight row has no color → its clear swatch IS pressed.
    expect(screen.getAllByLabelText('Default')[1]).toHaveAttribute('aria-pressed', 'true');
  });

  it('exposes each row as a labeled group so AT can tell the two "Red" buttons apart', () => {
    setup();
    const textGroup = screen.getByRole('group', { name: 'Text' });
    const highlightGroup = screen.getByRole('group', { name: 'Highlight' });
    // The Text row's "Red" lives in the Text group; the Highlight row's in the Highlight group.
    expect(within(textGroup).getByLabelText('Red')).toBe(screen.getAllByLabelText('Red')[0]);
    expect(within(highlightGroup).getByLabelText('Red')).toBe(screen.getAllByLabelText('Red')[1]);
  });
});
