import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRef } from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CatalogPicker, type CatalogPickerItem, type CatalogPickerProps } from './CatalogPicker';

const ITEMS: CatalogPickerItem[] = [
  {
    id: 'deals',
    title: 'Open deals',
    description: 'Deals by owner',
    category: 'sales',
    tags: ['pipeline'],
    preview: <div data-testid="pv-deals" />,
  },
  {
    id: 'revenue',
    title: 'Revenue trend',
    description: 'Monthly revenue',
    category: 'sales',
    badge: <span>New</span>,
  },
  {
    id: 'tasks',
    title: 'Tasks due',
    description: 'Your tasks this week',
    category: 'work',
    disabledReason: 'Already on dashboard',
  },
  { id: 'ru', title: 'Сделки по этапам', category: 'sales' },
];
const CATS = [
  { id: 'sales', label: 'Sales' },
  { id: 'work', label: 'Work' },
];

function setup(props: Partial<CatalogPickerProps> = {}) {
  const onSelect = vi.fn();
  const utils = render(
    <CatalogPicker
      label="Widget catalog"
      items={ITEMS}
      categories={CATS}
      onSelect={onSelect}
      {...props}
    />,
  );
  const listbox = () => screen.getByRole('listbox', { name: 'Widget catalog' });
  const options = () => within(listbox()).getAllByRole('option');
  const search = () => screen.getByRole('searchbox');
  const status = () => screen.getByRole('status');
  return { ...utils, onSelect, listbox, options, search, status };
}

describe('CatalogPicker', () => {
  it('renders every item as an option with preview + badge, and the count', () => {
    const { options, status } = setup();
    expect(options()).toHaveLength(4);
    expect(screen.getByTestId('pv-deals')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(status()).toHaveTextContent('4 results');
  });

  it('names each option by its title and describes it by description + reason', () => {
    const { options } = setup();
    const tasks = options()[2];
    expect(tasks).toHaveAccessibleName('Tasks due');
    expect(tasks).toHaveAccessibleDescription('Your tasks this week Already on dashboard');
    expect(tasks).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Already on dashboard')).toBeVisible();
  });

  it('searches title, description and tags, case-insensitively, trimming whitespace', async () => {
    const { search, options, status } = setup();
    await userEvent.type(search(), '  MONTHLY ');
    expect(options().map((o) => o.textContent)).toEqual([expect.stringContaining('Revenue trend')]);
    await userEvent.clear(search());
    await userEvent.type(search(), 'pipeline');
    expect(options()).toHaveLength(1);
    expect(status()).toHaveTextContent('1 result');
  });

  it('matches Cyrillic case-insensitively', async () => {
    const { search, options } = setup();
    await userEvent.type(search(), '  сДЕЛКИ ');
    expect(options()).toHaveLength(1);
    expect(options()[0]).toHaveAccessibleName('Сделки по этапам');
  });

  it('filters by category; All restores everything', async () => {
    const { options } = setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Work' }));
    expect(options()).toHaveLength(1);
    await userEvent.click(screen.getByRole('radio', { name: 'All' }));
    expect(options()).toHaveLength(4);
    expect(screen.getByRole('radiogroup', { name: 'Categories' })).toBeInTheDocument();
  });

  it('category + zero-match search shows the empty state and 0 count; clearing restores the category results', async () => {
    const { search, status } = setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Sales' }));
    await userEvent.type(search(), 'zzz');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(screen.getByRole('heading', { name: 'No matches' })).toBeInTheDocument();
    expect(status()).toHaveTextContent('0 results');
    await userEvent.clear(search());
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(3);
  });

  it('renders no pills without categories', () => {
    setup({ categories: undefined });
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('click, Enter and Space select an available item', async () => {
    const { options, onSelect } = setup();
    await userEvent.click(options()[0]);
    expect(onSelect).toHaveBeenLastCalledWith('deals');
    options()[1].focus();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('revenue');
    await userEvent.keyboard(' ');
    expect(onSelect).toHaveBeenCalledTimes(3);
  });

  it('does nothing for an unavailable item', async () => {
    const { options, onSelect } = setup();
    await userEvent.click(options()[2]);
    options()[2].focus();
    await userEvent.keyboard('{Enter}');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('has exactly one tab stop in the listbox, even when every item is unavailable', () => {
    const all = ITEMS.map((i) => ({ ...i, disabledReason: 'No access' }));
    const { options } = setup({ items: all });
    expect(options().filter((o) => o.tabIndex === 0)).toHaveLength(1);
  });

  it('ArrowDown from search focuses the first option; arrows/Home/End move by 1 and by row', async () => {
    const { search, options, listbox } = setup();
    listbox().style.gridTemplateColumns = '100px 100px'; // 2 columns (jsdom has no layout)
    search().focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(options()[0]).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(options()[1]).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(options()[3]).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(options()[2]).toHaveFocus();
    await userEvent.keyboard('{Home}');
    expect(options()[0]).toHaveFocus();
    await userEvent.keyboard('{End}');
    expect(options()[3]).toHaveFocus();
    expect(options()[3].tabIndex).toBe(0);
    expect(options().filter((o) => o.tabIndex === 0)).toHaveLength(1);
  });

  it('ArrowUp from the first row returns focus to search', async () => {
    const { search, options, listbox } = setup();
    listbox().style.gridTemplateColumns = '100px 100px';
    options()[1].focus();
    await userEvent.keyboard('{ArrowUp}');
    expect(search()).toHaveFocus();
  });

  it('resets the roving target to the first result when the filter changes', async () => {
    const { search, options } = setup();
    fireEvent.keyDown(options()[0], { key: 'End' }); // target → last option
    expect(options()[3].tabIndex).toBe(0);
    await userEvent.click(screen.getByRole('radio', { name: 'Sales' })); // 3 results
    expect(options()[0].tabIndex).toBe(0);
    expect(options().filter((o) => o.tabIndex === 0)).toHaveLength(1);
    await userEvent.type(search(), 'revenue'); // 1 result
    expect(options()[0].tabIndex).toBe(0);
  });

  it('forwards ref to the root and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = setup({ ref, className: 'mine' } as Partial<CatalogPickerProps>);
    expect(ref.current).toBe(container.firstChild);
    expect((container.firstChild as HTMLElement).className).toMatch(/mine/);
  });
});

describe('CatalogPicker — cascade (source-pinned)', () => {
  const scss = readFileSync(resolve(__dirname, 'CatalogPicker.module.scss'), 'utf8');

  it('dims preview/title/description of unavailable cards, never the reason text', () => {
    const rule = scss.match(/\.option\[aria-disabled='true'\] :is\(([^)]*)\)\s*\{[^}]*opacity/)!;
    expect(rule[1]).toMatch(/\.preview/);
    expect(rule[1]).toMatch(/\.titleRow/);
    expect(rule[1]).toMatch(/\.description/);
    expect(rule[1]).not.toMatch(/\.reason|\.body/);
  });

  it('checked + focus-visible pill rules outrank the base .pillLabel rule', () => {
    expect(scss).toMatch(/\.pillInput:checked \+ \.pillLabel\s*\{/);
    expect(scss).toMatch(/\.pillInput:focus-visible \+ \.pillLabel\s*\{/);
  });
});

describe('CatalogPicker sticky toolbar bleed (source pin)', () => {
  it('extends the toolbar upward via a token-sized ::before in the toolbar background', () => {
    const scss = readFileSync(resolve(__dirname, 'CatalogPicker.module.scss'), 'utf8');
    const block = scss.slice(scss.indexOf('&[data-stuck]::before'));
    expect(block).toMatch(/inset-block-end:\s*100%/);
    expect(block).toMatch(/height:\s*var\(--catalog-picker-toolbar-bleed\)/);
    expect(block).toMatch(/background:\s*var\(--catalog-picker-toolbar-bg\)/);
  });
});

describe('CatalogPicker stuck detection', () => {
  const props = { label: 'Catalog', items: ITEMS, onSelect: () => {} };
  afterEach(() => vi.unstubAllGlobals());

  it('sets data-stuck while the sentinel is scrolled out above, clears it when back', () => {
    let cb: IntersectionObserverCallback = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(c: IntersectionObserverCallback) {
          cb = c;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    const { container, unmount } = render(<CatalogPicker {...props} />);
    const toolbar = container.querySelector('[class*="toolbar"]') as HTMLElement;
    const fire = (isIntersecting: boolean) =>
      act(() =>
        cb(
          [
            {
              isIntersecting,
              boundingClientRect: { top: -10 },
              rootBounds: { top: 0 },
            } as unknown as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver,
        ),
      );
    expect(toolbar).not.toHaveAttribute('data-stuck');
    fire(false);
    expect(toolbar).toHaveAttribute('data-stuck');
    fire(true);
    expect(toolbar).not.toHaveAttribute('data-stuck');
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('without IntersectionObserver renders with no data-stuck and no crash', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = render(<CatalogPicker {...props} />);
    expect(container.querySelector('[data-stuck]')).toBeNull();
  });
});
