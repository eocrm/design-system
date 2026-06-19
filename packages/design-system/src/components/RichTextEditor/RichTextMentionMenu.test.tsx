import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { RichTextMentionMenu } from './RichTextMentionMenu';
import type { MentionItem } from './mentions';

const items: MentionItem[] = [
  { id: 'u1', label: 'Alice', description: 'alice@acme.com' },
  { id: 'u2', label: 'Bob' },
];
const rect = { top: 10, left: 10, width: 0, height: 16 };

function renderMenu(props: Partial<React.ComponentProps<typeof RichTextMentionMenu>> = {}) {
  return render(
    <RichTextMentionMenu
      items={items}
      activeIndex={0}
      anchorRect={rect}
      listboxId="lb"
      getOptionId={(i) => `opt-${i}`}
      label="Mentions"
      emptyLabel="No matches"
      onSelect={vi.fn()}
      onHover={vi.fn()}
      {...props}
    />,
  );
}

it('renders a labelled listbox of options', () => {
  renderMenu();
  const lb = screen.getByRole('listbox', { name: 'Mentions' });
  expect(lb).toHaveAttribute('id', 'lb');
  expect(screen.getAllByRole('option')).toHaveLength(2);
  expect(screen.getByText('Alice')).toBeInTheDocument();
  expect(screen.getByText('alice@acme.com')).toBeInTheDocument();
});

it('marks the active option with aria-selected + id', () => {
  renderMenu({ activeIndex: 1 });
  const opts = screen.getAllByRole('option');
  expect(opts[1]).toHaveAttribute('aria-selected', 'true');
  expect(opts[1]).toHaveAttribute('id', 'opt-1');
  expect(opts[0]).toHaveAttribute('aria-selected', 'false');
});

it('clicking an option calls onSelect with its index', async () => {
  const onSelect = vi.fn();
  renderMenu({ onSelect });
  await userEvent.click(screen.getByText('Bob'));
  expect(onSelect).toHaveBeenCalledWith(1);
});

it('shows the empty label when there are no items', () => {
  renderMenu({ items: [] });
  expect(screen.getByText('No matches')).toBeInTheDocument();
  expect(screen.queryAllByRole('option')).toHaveLength(0);
});
