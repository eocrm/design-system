import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n/I18nProvider';
import { TopBar } from './TopBar';
import type { TopBarSearchGroup, TopBarSearchItem } from './TopBarSearch';

const GROUPS: TopBarSearchGroup[] = [
  {
    label: 'Contacts',
    items: [
      { id: 'c1', label: 'Ada' },
      { id: 'c2', label: 'Alan', meta: 'Lead' },
    ],
  },
  { label: 'Deals', items: [{ id: 'd1', label: 'Acme renewal', href: '/deals/d1' }] },
];

function Harness(props: Partial<React.ComponentProps<typeof TopBar.Search>>) {
  const [value, setValue] = useState('a');
  return (
    <TopBar.Search
      placeholder="Search"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      results={GROUPS}
      {...props}
    />
  );
}

const input = () => screen.getByRole('combobox', { name: 'Search' });
const activeOption = () => {
  const id = input().getAttribute('aria-activedescendant');
  return id ? document.getElementById(id) : null;
};

describe('TopBar.Search combobox mode', () => {
  it('stays a plain searchbox without results', () => {
    render(<TopBar.Search placeholder="Search" />);
    expect(screen.getByRole('searchbox', { name: 'Search' })).not.toHaveAttribute('aria-expanded');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('wires combobox ARIA and highlights the first option on open', async () => {
    render(<Harness />);
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input()).toHaveAttribute('aria-autocomplete', 'list');
    await userEvent.click(input());
    expect(input()).toHaveAttribute('aria-expanded', 'true');
    const listbox = screen.getByRole('listbox');
    expect(input()).toHaveAttribute('aria-controls', listbox.id);
    expect(activeOption()).toHaveTextContent('Ada');
    expect(activeOption()).toHaveAttribute('aria-selected', 'true');
  });

  it('labels each group by its heading', async () => {
    render(<Harness />);
    await userEvent.click(input());
    expect(screen.getByRole('group', { name: 'Contacts' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Deals' })).toBeInTheDocument();
  });

  it('ArrowDown/ArrowUp wrap across groups and the footer', async () => {
    render(<Harness footerAction={{ label: 'View all', onSelect: () => {} }} />);
    await userEvent.click(input());
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(activeOption()).toHaveTextContent('Acme renewal');
    await userEvent.keyboard('{ArrowDown}');
    expect(activeOption()).toHaveTextContent('View all');
    await userEvent.keyboard('{ArrowDown}');
    expect(activeOption()).toHaveTextContent('Ada');
    await userEvent.keyboard('{ArrowUp}');
    expect(activeOption()).toHaveTextContent('View all');
  });

  it('Enter selects the active item with its group index and closes', async () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    await userEvent.click(input());
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith(GROUPS[1]!.items[0], 1);
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input()).toHaveValue('a'); // library never clears the query
  });

  it('Enter on the footer calls footerAction.onSelect', async () => {
    const footer = vi.fn();
    render(<Harness footerAction={{ label: 'View all', onSelect: footer }} />);
    await userEvent.click(input());
    await userEvent.keyboard('{ArrowUp}{Enter}');
    expect(footer).toHaveBeenCalledTimes(1);
  });

  it('click selects; focus stays in the input while clicking the panel', async () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    await userEvent.click(input());
    await userEvent.click(screen.getByRole('option', { name: /Alan/ }));
    expect(onSelect).toHaveBeenCalledWith(GROUPS[0]!.items[1], 0);
    expect(input()).toHaveFocus();
  });

  it('renders href rows as links and leaves modifier-clicks to the browser', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup(); // modifier state is per-instance
    render(<Harness onSelect={onSelect} />);
    await user.click(input());
    const link = screen.getByRole('option', { name: 'Acme renewal' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/deals/d1');
    // Record then swallow the click so jsdom doesn't log an unimplemented navigation.
    const prevented: boolean[] = [];
    const record = (e: Event) => {
      prevented.push(e.defaultPrevented);
      e.preventDefault();
    };
    document.addEventListener('click', record);
    try {
      await user.keyboard('{Control>}');
      await user.click(link);
      await user.keyboard('{/Control}');
      expect(onSelect).not.toHaveBeenCalled();
      expect(prevented).toEqual([false]);
      await user.click(link);
      expect(onSelect).toHaveBeenCalledWith(GROUPS[1]!.items[0], 1);
      expect(prevented).toEqual([false, true]);
    } finally {
      document.removeEventListener('click', record);
    }
  });

  it('ignores Enter while an IME composition is active', async () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    await userEvent.click(input());
    fireEvent.keyDown(input(), { key: 'Enter', isComposing: true });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('hover moves the highlight', async () => {
    render(<Harness />);
    await userEvent.click(input());
    await userEvent.hover(screen.getByRole('option', { name: /Alan/ }));
    expect(activeOption()).toHaveTextContent('Alan');
  });

  it('closes on blur and reopens on click', async () => {
    render(
      <>
        <Harness />
        <button type="button">elsewhere</button>
      </>,
    );
    await userEvent.click(input());
    await userEvent.click(screen.getByRole('button', { name: 'elsewhere' }));
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(input());
    expect(input()).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows nothing for an empty query with no results', async () => {
    render(<TopBar.Search placeholder="Search" results={[]} />);
    await userEvent.click(input());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input()).toHaveAttribute('aria-expanded', 'false');
  });

  it('supports controlled open', async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(<Harness open={false} onOpenChange={onOpenChange} />);
    await userEvent.click(input());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    rerender(<Harness open onOpenChange={onOpenChange} />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('supports uncontrolled defaultOpen with defaultValue', () => {
    render(<TopBar.Search placeholder="Search" defaultValue="a" defaultOpen results={GROUPS} />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  // Review Focus 1
  it('does not remount the input when results toggles between undefined and an array', async () => {
    function Toggle() {
      const [value, setValue] = useState('');
      return (
        <TopBar.Search
          placeholder="Search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          results={value ? GROUPS : undefined}
        />
      );
    }
    render(<Toggle />);
    const before = screen.getByRole('searchbox');
    await userEvent.click(before);
    await userEvent.keyboard('a');
    expect(input()).toBe(before);
    expect(input()).toHaveFocus();
  });

  // Review Focus 2
  it('keeps the highlight when results is rebuilt with the same ids', async () => {
    function Rebuild() {
      const [n, setN] = useState(0);
      return (
        <>
          <TopBar.Search
            placeholder="Search"
            defaultValue="a"
            defaultOpen
            results={GROUPS.map((g) => ({ ...g, items: [...g.items] }))}
          />
          <span data-n={n} />
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => setN(n + 1)}>
            rerender
          </button>
        </>
      );
    }
    render(<Rebuild />);
    input().focus();
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.click(screen.getByRole('button', { name: 'rerender' }));
    expect(activeOption()).toHaveTextContent('Alan');
  });

  // Review Focus 3
  it('clamps the highlight when results shrink', async () => {
    const many: TopBarSearchItem[] = ['a', 'b', 'c', 'd'].map((id) => ({ id, label: id }));
    const onSelect = vi.fn();
    const { rerender } = render(
      <TopBar.Search
        placeholder="Search"
        defaultValue="x"
        defaultOpen
        results={[{ label: 'G', items: many }]}
        onSelect={onSelect}
      />,
    );
    input().focus();
    await userEvent.keyboard('{ArrowUp}'); // wraps to 'd' (index 3)
    rerender(
      <TopBar.Search
        placeholder="Search"
        defaultValue="x"
        defaultOpen
        results={[{ label: 'G', items: many.slice(0, 2) }]}
        onSelect={onSelect}
      />,
    );
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(many[0], 0); // set changed -> reset to first
  });

  it('Escape closes the panel and prevents the native search clear', async () => {
    render(<Harness />);
    await userEvent.click(input());
    const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    act(() => {
      input().dispatchEvent(ev);
    });
    expect(ev.defaultPrevented).toBe(true);
    expect(input()).toHaveAttribute('aria-expanded', 'false');
    expect(input()).toHaveValue('a');
  });

  it('Escape with the panel closed is left to the browser', async () => {
    render(<Harness />);
    await userEvent.click(input());
    await userEvent.keyboard('{Escape}');
    const ev = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    act(() => {
      input().dispatchEvent(ev);
    });
    expect(ev.defaultPrevented).toBe(false);
  });

  it('shows the empty row for a non-empty query and announces it', async () => {
    render(<Harness results={[]} />);
    await userEvent.click(input());
    expect(screen.getByRole('listbox')).toHaveTextContent('No results');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No results'));
  });

  it('uses a custom emptyMessage', async () => {
    render(<Harness results={[]} emptyMessage="Nothing for that" />);
    await userEvent.click(input());
    expect(screen.getByRole('listbox')).toHaveTextContent('Nothing for that');
  });

  it('announces the result count', async () => {
    render(<Harness />);
    await userEvent.click(input());
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('3 results'));
  });

  // Review Focus 5
  it('keeps rows visible while loading, marks busy and announces loading', async () => {
    render(<Harness loading />);
    await userEvent.click(input());
    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('option', { name: 'Ada' })).toBeInTheDocument();
    expect(listbox).toHaveTextContent('Searching…');
    expect(listbox).not.toHaveTextContent('No results');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Searching…'));
  });

  it('shows the panel while loading even for an empty query', async () => {
    render(<TopBar.Search placeholder="Search" results={[]} loading />);
    await userEvent.click(input());
    expect(screen.getByRole('listbox')).toHaveTextContent('Searching…');
  });

  it('pluralises the count in Russian', async () => {
    render(
      <I18nProvider locale="ru">
        <TopBar.Search placeholder="Поиск" defaultValue="a" defaultOpen results={GROUPS} />
      </I18nProvider>,
    );
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('3 результата'));
  });
});
