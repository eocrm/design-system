import { createRef } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmojiPicker, EmojiPickerPopover } from './EmojiPicker';

// ---------------------------------------------------------------------------
// EmojiPicker — rendering, selection, filtering
// ---------------------------------------------------------------------------

it('renders the search box and emoji cells', () => {
  render(<EmojiPicker onSelect={() => {}} />);
  expect(screen.getByRole('textbox')).toBeInTheDocument();
  // Cells expose role="option"; the accessible name is the emoji's name.
  expect(screen.getByRole('option', { name: 'thumbs up' })).toBeInTheDocument();
});

it('fires onSelect with the emoji char when a cell is clicked', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  render(<EmojiPicker onSelect={onSelect} />);
  await user.click(screen.getByRole('option', { name: 'thumbs up' }));
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith('👍');
});

it('each emoji cell uses its name as the accessible label', () => {
  render(<EmojiPicker onSelect={() => {}} />);
  expect(screen.getByRole('option', { name: 'pizza' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'red apple' })).toBeInTheDocument();
});

it('filters by search query (name / keyword substring)', async () => {
  const user = userEvent.setup();
  render(<EmojiPicker onSelect={() => {}} />);
  // Both 'pizza' and 'thumbs up' are present before filtering.
  expect(screen.getByRole('option', { name: 'pizza' })).toBeInTheDocument();
  await user.type(screen.getByRole('textbox'), 'thumbs');
  expect(screen.getByRole('option', { name: 'thumbs up' })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'pizza' })).not.toBeInTheDocument();
});

it('matches keywords as well as names', async () => {
  const user = userEvent.setup();
  render(<EmojiPicker onSelect={() => {}} />);
  // 'lol' is a keyword of 'face with tears of joy', not part of its name.
  await user.type(screen.getByRole('textbox'), 'lol');
  expect(screen.getByRole('option', { name: 'face with tears of joy' })).toBeInTheDocument();
});

it('shows the no-results message when nothing matches', async () => {
  const user = userEvent.setup();
  render(<EmojiPicker onSelect={() => {}} />);
  await user.type(screen.getByRole('textbox'), 'zzzqqqxyz');
  expect(screen.getByText('No emoji found')).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'thumbs up' })).not.toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// EmojiPicker — keyboard roving grid
// ---------------------------------------------------------------------------

it('ArrowDown from the search input moves focus into the grid', async () => {
  const user = userEvent.setup();
  render(<EmojiPicker onSelect={() => {}} />);
  await user.click(screen.getByRole('textbox'));
  await user.keyboard('{ArrowDown}');
  const active = document.activeElement as HTMLElement;
  expect(active).toHaveAttribute('role', 'option');
  // The first cell is the first emoji in render order (grinning face).
  expect(active).toBe(screen.getByRole('option', { name: 'grinning face' }));
});

it('Enter on a focused grid cell fires onSelect with that emoji', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  render(<EmojiPicker onSelect={onSelect} />);
  await user.click(screen.getByRole('textbox'));
  await user.keyboard('{ArrowDown}');
  await user.keyboard('{Enter}');
  expect(onSelect).toHaveBeenCalledWith('😀');
});

it('ArrowRight moves the roving focus to the next cell', async () => {
  const user = userEvent.setup();
  render(<EmojiPicker onSelect={() => {}} />);
  await user.click(screen.getByRole('textbox'));
  await user.keyboard('{ArrowDown}{ArrowRight}');
  // Second emoji in render order is 'grinning face with smiling eyes'.
  expect(document.activeElement).toBe(
    screen.getByRole('option', { name: 'grinning face with smiling eyes' }),
  );
});

it('roving tabIndex: only the active cell is tabbable', () => {
  render(<EmojiPicker onSelect={() => {}} />);
  const first = screen.getByRole('option', { name: 'grinning face' });
  const second = screen.getByRole('option', { name: 'grinning face with smiling eyes' });
  expect(first).toHaveAttribute('tabindex', '0');
  expect(second).toHaveAttribute('tabindex', '-1');
});

it('ArrowUp from the first row returns focus to the search input', async () => {
  const user = userEvent.setup();
  render(<EmojiPicker onSelect={() => {}} />);
  const search = screen.getByRole('textbox');
  await user.click(search);
  // ArrowDown drops into the first option…
  await user.keyboard('{ArrowDown}');
  expect(document.activeElement).toBe(screen.getByRole('option', { name: 'grinning face' }));
  // …and ArrowUp from that first row escapes back up to the search input.
  await user.keyboard('{ArrowUp}');
  expect(document.activeElement).toBe(search);
});

// ---------------------------------------------------------------------------
// EmojiPicker — ref / className / spread
// ---------------------------------------------------------------------------

it('forwards ref to the root div, merges className, and spreads data-* attrs', () => {
  const ref = createRef<HTMLDivElement>();
  render(<EmojiPicker ref={ref} onSelect={() => {}} className="custom" data-foo="bar" />);
  expect(ref.current).not.toBeNull();
  expect(ref.current?.tagName).toBe('DIV');
  expect(ref.current).toHaveClass('custom');
  expect(ref.current).toHaveAttribute('data-foo', 'bar');
});

// ---------------------------------------------------------------------------
// EmojiPickerPopover
// ---------------------------------------------------------------------------

it('EmojiPickerPopover opens on trigger click and shows the picker', async () => {
  const user = userEvent.setup();
  render(<EmojiPickerPopover trigger={<button>open</button>} onSelect={() => {}} />);
  // Closed initially — no search box.
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'open' }));
  expect(screen.getByRole('textbox')).toBeInTheDocument();
});

it('EmojiPickerPopover fires onSelect and closes when an emoji is chosen', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  render(<EmojiPickerPopover trigger={<button>open</button>} onSelect={onSelect} />);
  await user.click(screen.getByRole('button', { name: 'open' }));
  await user.click(screen.getByRole('option', { name: 'thumbs up' }));
  expect(onSelect).toHaveBeenCalledWith('👍');
  // Picker closed → search box gone.
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});

it('EmojiPickerPopover supports controlled open via onOpenChange', async () => {
  const user = userEvent.setup();
  const onOpenChange = vi.fn();
  render(
    <EmojiPickerPopover
      trigger={<button>open</button>}
      onSelect={() => {}}
      open={false}
      onOpenChange={onOpenChange}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'open' }));
  expect(onOpenChange).toHaveBeenCalledWith(true);
});

it('EmojiPickerPopover (controlled, open) fires onSelect and requests close on pick', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <EmojiPickerPopover
      trigger={<button>open</button>}
      onSelect={onSelect}
      open
      onOpenChange={onOpenChange}
    />,
  );
  // Already open (controlled open=true) — pick an emoji directly.
  await user.click(screen.getByRole('option', { name: 'thumbs up' }));
  expect(onSelect).toHaveBeenCalledWith('👍');
  // Selecting always requests close, even in controlled mode.
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

// ---------------------------------------------------------------------------
// EmojiPicker — recent
// ---------------------------------------------------------------------------

it('renders a "Recently used" group at the top from the recent prop', () => {
  render(<EmojiPicker onSelect={() => {}} recent={['🎉', '❤️']} />);
  // The recent section is a group labelled "Recently used".
  const recentGroup = screen.getByRole('group', { name: 'Recently used' });
  expect(recentGroup).toBeInTheDocument();
  // Its emojis resolve their dataset names for the accessible label.
  expect(within(recentGroup).getByRole('option', { name: 'party popper' })).toBeInTheDocument();
  // It is the FIRST group in the listbox (pinned to the top).
  const groups = screen.getAllByRole('group');
  expect(groups[0]).toBe(recentGroup);
});

it('clicking a recent emoji fires onSelect with its char', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  render(<EmojiPicker onSelect={onSelect} recent={['🎉']} />);
  const recentGroup = screen.getByRole('group', { name: 'Recently used' });
  await user.click(within(recentGroup).getByRole('option', { name: 'party popper' }));
  expect(onSelect).toHaveBeenCalledWith('🎉');
});

it('de-dupes recent and keeps most-recent-first order', () => {
  render(<EmojiPicker onSelect={() => {}} recent={['🎉', '🎉', '❤️']} />);
  const recentGroup = screen.getByRole('group', { name: 'Recently used' });
  // 🎉 appears once in the recent group despite being passed twice.
  expect(within(recentGroup).getAllByRole('option', { name: 'party popper' })).toHaveLength(1);
});

it('hides the recent group while searching', async () => {
  const user = userEvent.setup();
  render(<EmojiPicker onSelect={() => {}} recent={['🎉']} />);
  expect(screen.getByRole('group', { name: 'Recently used' })).toBeInTheDocument();
  await user.type(screen.getByRole('textbox'), 'pizza');
  expect(screen.queryByRole('group', { name: 'Recently used' })).toBeNull();
});

it('no recent group when recent is omitted or empty', () => {
  const { rerender } = render(<EmojiPicker onSelect={() => {}} />);
  expect(screen.queryByRole('group', { name: 'Recently used' })).toBeNull();
  rerender(<EmojiPicker onSelect={() => {}} recent={[]} />);
  expect(screen.queryByRole('group', { name: 'Recently used' })).toBeNull();
});

it('EmojiPickerPopover forwards recent to the picker', () => {
  render(
    <EmojiPickerPopover trigger={<button>open</button>} onSelect={() => {}} recent={['🎉']} open />,
  );
  expect(screen.getByRole('group', { name: 'Recently used' })).toBeInTheDocument();
});

it('roving keyboard nav crosses from the recent group into the categories', async () => {
  const user = userEvent.setup();
  // recent has a single item → flat index 0 is the recent 👍; index 1 is the first
  // category emoji (grinning face). ArrowRight must cross the section boundary.
  render(<EmojiPicker onSelect={() => {}} recent={['👍']} />);
  await user.click(screen.getByRole('textbox'));
  await user.keyboard('{ArrowDown}'); // into the grid → first cell (recent 👍)
  const recentGroup = screen.getByRole('group', { name: 'Recently used' });
  expect(document.activeElement).toBe(
    within(recentGroup).getByRole('option', { name: 'thumbs up' }),
  );
  await user.keyboard('{ArrowRight}'); // cross into the first category
  expect(document.activeElement).toBe(screen.getByRole('option', { name: 'grinning face' }));
});
