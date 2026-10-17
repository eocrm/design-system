import { createRef, useState } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n/I18nProvider';
import { TopBar } from './TopBar';
import type { TopBarSearchGroup, TopBarSearchProps } from './TopBarSearch';

const GROUPS: TopBarSearchGroup[] = [
  {
    label: 'Contacts',
    items: [
      {
        id: 'c1',
        label: 'Ada Lovelace',
        meta: 'ada@example.com',
        icon: <svg data-testid="icon" />,
      },
      { id: 'c2', label: 'Alan Turing' },
    ],
  },
  { label: 'Empty', items: [] },
  { label: 'Deals', items: [{ id: 'd1', label: 'Acme renewal' }] },
];

function Harness(props: Partial<TopBarSearchProps>) {
  const [value, setValue] = useState('');
  return (
    <>
      <TopBar.Search
        placeholder="Search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        results={GROUPS}
        {...props}
      />
      <button type="button">outside</button>
    </>
  );
}

const input = () => screen.getByRole('combobox', { name: 'Search' });
const activeOption = () =>
  document.getElementById(input().getAttribute('aria-activedescendant') ?? '');

async function typeQuery(props: Partial<TopBarSearchProps> = {}) {
  const user = userEvent.setup();
  render(<Harness {...props} />);
  await user.type(input(), 'a');
  return user;
}

describe('TopBar.Search — combobox mode', () => {
  it('without results stays a plain searchbox with no panel or live region', async () => {
    const user = userEvent.setup();
    render(<TopBar.Search placeholder="Search" />);
    const box = screen.getByRole('searchbox', { name: 'Search' });
    expect(box).not.toHaveAttribute('aria-expanded');
    await user.type(box, 'a{ArrowDown}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('opens on typing with combobox semantics, labelled groups and options', async () => {
    await typeQuery();
    const box = input();
    const listbox = screen.getByRole('listbox', { name: 'Search results' });
    expect(box).toHaveAttribute('aria-expanded', 'true');
    expect(box).toHaveAttribute('aria-autocomplete', 'list');
    expect(box).toHaveAttribute('aria-controls', listbox.id);
    expect(within(listbox).getByRole('group', { name: 'Contacts' })).toBeInTheDocument();
    expect(within(listbox).getByRole('group', { name: 'Deals' })).toBeInTheDocument();
    expect(within(listbox).queryByRole('group', { name: 'Empty' })).toBeNull();
    expect(screen.getByRole('option', { name: /Ada Lovelace/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('icon').parentElement).toHaveAttribute('aria-hidden');
    expect(activeOption()).toHaveTextContent('Ada Lovelace');
  });

  it('closes when the input is cleared', async () => {
    const user = await typeQuery();
    await user.clear(input());
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input()).toHaveAttribute('aria-expanded', 'false');
  });

  it('ArrowDown/ArrowUp wrap across groups and the footer row', async () => {
    const user = await typeQuery({ footerAction: { label: 'View all', onSelect: () => {} } });
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(activeOption()).toHaveTextContent('Acme renewal');
    await user.keyboard('{ArrowDown}');
    expect(activeOption()).toHaveTextContent('View all');
    await user.keyboard('{ArrowDown}');
    expect(activeOption()).toHaveTextContent('Ada Lovelace');
    await user.keyboard('{ArrowUp}');
    expect(activeOption()).toHaveTextContent('View all');
    expect(screen.getByRole('option', { name: 'View all' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('Enter selects the active row with its group index and closes', async () => {
    const onSelect = vi.fn();
    const user = await typeQuery({ onSelect });
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith(2, GROUPS[2]!.items[0]);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('Enter on the footer row calls footerAction.onSelect', async () => {
    const onFooter = vi.fn();
    const user = await typeQuery({ footerAction: { label: 'View all', onSelect: onFooter } });
    await user.keyboard('{ArrowUp}{Enter}');
    expect(onFooter).toHaveBeenCalledTimes(1);
  });

  it('click selects a row and keeps focus in the input', async () => {
    const onSelect = vi.fn();
    const user = await typeQuery({ onSelect });
    await user.click(screen.getByRole('option', { name: 'Alan Turing' }));
    expect(onSelect).toHaveBeenCalledWith(0, GROUPS[0]!.items[1]);
    expect(input()).toHaveFocus();
  });

  it('Escape closes the panel; ArrowDown reopens it', async () => {
    const user = await typeQuery();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(input()).toHaveValue('a');
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('clicking outside closes the panel', async () => {
    const user = await typeQuery();
    await user.click(screen.getByRole('button', { name: 'outside' }));
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('shows the loading row and marks the list busy', async () => {
    await typeQuery({ loading: true });
    expect(screen.getByText('Searching…')).toBeInTheDocument();
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-busy', 'true');
  });

  it('shows the default empty message, or the emptyMessage prop', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness results={[]} />);
    await user.type(input(), 'z');
    expect(screen.getByText('No results')).toBeInTheDocument();
    rerender(<Harness results={[]} emptyMessage="Nothing for z" />);
    expect(screen.getByText('Nothing for z')).toBeInTheDocument();
  });

  it('announces the result count through a live region', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await typeQuery();
      act(() => vi.advanceTimersByTime(100));
      expect(screen.getByRole('status')).toHaveTextContent('3 results');
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses the ru locale for its defaults', async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider locale="ru">
        <Harness results={[]} />
      </I18nProvider>,
    );
    await user.type(input(), 'z');
    expect(screen.getByRole('listbox', { name: 'Результаты поиска' })).toBeInTheDocument();
    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
  });

  it('controlled open reports changes through onOpenChange', async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness open onOpenChange={onOpenChange} />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.click(input());
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('forwards the ref to the input and chains consumer handlers', async () => {
    const ref = createRef<HTMLInputElement>();
    const onKeyDown = vi.fn();
    const user = userEvent.setup();
    render(<TopBar.Search ref={ref} placeholder="Search" results={GROUPS} onKeyDown={onKeyDown} />);
    expect(ref.current).toBe(input());
    await user.type(input(), 'a{ArrowDown}');
    expect(onKeyDown).toHaveBeenCalled();
    expect(activeOption()).toHaveTextContent('Alan Turing');
  });
});
