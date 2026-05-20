import { configure, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { createRef } from 'react';
import { Select, type SelectOption } from './Select';
import styles from './Select.module.scss';

const STATUSES: SelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'archived', label: 'Archived' },
];

describe('Select — Phase 1 scaffold', () => {
  it('forwards refs to the underlying div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Select ref={ref} options={STATUSES} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges the className prop (does not replace the internal class)', () => {
    const { container } = render(<Select options={STATUSES} className="external" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('external');
    expect(root.className).toContain(styles.root);
  });
});

describe('Select — single, non-searchable, sync', () => {
  it('renders a button trigger with placeholder when no value', () => {
    render(<Select options={STATUSES} placeholder="Pick one" />);
    expect(screen.getByRole('button')).toHaveTextContent('Pick one');
  });

  it('renders the selected label when value is set', () => {
    render(<Select options={STATUSES} value="pending" />);
    expect(screen.getByRole('button')).toHaveTextContent('Pending');
  });
});

describe('Select — open/close', () => {
  it('opens the listbox on trigger click', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} placeholder="Pick" />);
    expect(screen.queryByRole('listbox')).toBeNull();
    await user.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
  });

  it('listbox renders in a portal at document.body level', async () => {
    const user = userEvent.setup();
    const { container } = render(<Select options={STATUSES} />);
    await user.click(screen.getByRole('button'));
    const listbox = screen.getByRole('listbox');
    expect(container.contains(listbox)).toBe(false);
  });

  it('closes on second click of trigger', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    const trigger = screen.getByRole('button');
    await user.click(trigger);
    expect(screen.queryByRole('listbox')).toBeInTheDocument();
    await user.click(trigger);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('aria-expanded reflects open state', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('aria-controls points at the listbox id when open', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    const trigger = screen.getByRole('button');
    await user.click(trigger);
    const listbox = screen.getByRole('listbox');
    expect(trigger.getAttribute('aria-controls')).toBe(listbox.id);
  });
});

describe('Select — selection (single)', () => {
  it('selecting an option fires onChange(value, option) and closes the popover', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select options={STATUSES} onChange={onChange} />);
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('option', { name: 'Pending' }));
    expect(onChange).toHaveBeenCalledWith('pending', STATUSES[1]);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('controlled value round-trip — parent re-renders new value, trigger updates', async () => {
    const user = userEvent.setup();
    const Wrapper = () => {
      const [v, setV] = React.useState<string>('');
      return (
        <Select
          options={STATUSES}
          value={v}
          onChange={(next) => setV(next as string)}
          placeholder="Pick"
        />
      );
    };
    render(<Wrapper />);
    expect(screen.getByRole('button')).toHaveTextContent('Pick');
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('option', { name: 'Archived' }));
    expect(screen.getByRole('button')).toHaveTextContent('Archived');
  });

  it('clicking a disabled option does nothing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const opts: SelectOption[] = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', disabled: true },
    ];
    render(<Select options={opts} onChange={onChange} />);
    await user.click(screen.getByRole('button'));
    await user.click(screen.getByRole('option', { name: 'B' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).toBeInTheDocument();
  });
});

describe('Select — keyboard (single, non-searchable)', () => {
  it('ArrowDown on closed trigger opens with first option active', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    const trigger = screen.getByRole('button');
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const active = screen.getByRole('option', { name: 'Active' });
    expect(trigger).toHaveAttribute('aria-activedescendant', active.id);
  });

  it('ArrowUp on closed trigger opens with last option active', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    const trigger = screen.getByRole('button');
    trigger.focus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const active = screen.getByRole('option', { name: 'Archived' });
    expect(trigger).toHaveAttribute('aria-activedescendant', active.id);
  });

  it('Enter on closed trigger opens', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    screen.getByRole('button').focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('ArrowDown moves active row +1', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    screen.getByRole('button').focus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Pending' }).id,
    );
  });

  it('Home jumps to first, End jumps to last', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    screen.getByRole('button').focus();
    await user.keyboard('{ArrowDown}{End}');
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Archived' }).id,
    );
    await user.keyboard('{Home}');
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Active' }).id,
    );
  });

  it('Enter on open selects the active row and closes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select options={STATUSES} onChange={onChange} />);
    screen.getByRole('button').focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('pending', STATUSES[1]);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('Escape closes without changing selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select options={STATUSES} value="active" onChange={onChange} />);
    screen.getByRole('button').focus();
    await user.keyboard('{Enter}{ArrowDown}{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toHaveTextContent('Active');
  });

  it('Tab closes and commits', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    screen.getByRole('button').focus();
    await user.keyboard('{Enter}{Tab}');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('ArrowDown skips disabled options', async () => {
    const user = userEvent.setup();
    const opts: SelectOption[] = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', disabled: true },
      { value: 'c', label: 'C' },
    ];
    render(<Select options={opts} />);
    screen.getByRole('button').focus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'C' }).id,
    );
  });
});

describe('Select — typeahead (non-searchable)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // RTL's asyncWrapper drains with a setTimeout(0); under Vitest fake
    // timers it needs an explicit `advanceTimersByTime` to actually fire.
    // Without this, `userEvent.keyboard` queues forever and the test
    // hangs to the suite timeout. Mirrors ConfirmationPopover's setup.
    configure({
      asyncWrapper: async (cb) => {
        const result = await cb();
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 0);
          vi.advanceTimersByTime(0);
        });
        return result;
      },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    configure({ asyncWrapper: async (cb) => cb() });
  });

  it('typing a letter jumps active row to first option starting with it', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Select options={STATUSES} />);
    screen.getByRole('button').focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('p');
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Pending' }).id,
    );
  });

  it('typing a sequence within 500ms matches the joined prefix', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const opts: SelectOption[] = [
      { value: '1', label: 'Aardvark' },
      { value: '2', label: 'Albatross' },
      { value: '3', label: 'Antelope' },
    ];
    render(<Select options={opts} />);
    screen.getByRole('button').focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('al');
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Albatross' }).id,
    );
  });

  it('buffer resets after 500ms idle', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const opts: SelectOption[] = [
      { value: '1', label: 'Apple' },
      { value: '2', label: 'Banana' },
    ];
    render(<Select options={opts} />);
    screen.getByRole('button').focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('a');
    vi.advanceTimersByTime(600);
    await user.keyboard('b');
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Banana' }).id,
    );
  });

  it('typing the first letter from closed state finds the first matching option (no off-by-one)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const opts = [
      { value: '1', label: 'Apple' },
      { value: '2', label: 'Banana' },
      { value: '3', label: 'Cherry' },
    ];
    render(<Select options={opts} />);
    screen.getByRole('button').focus();
    // From CLOSED state, typing 'a' must land on Apple (index 0), not skip past it
    await user.keyboard('a');
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Apple' }).id,
    );
  });
});

describe('Select — single, searchable (combobox input)', () => {
  it('renders the trigger as an input with role=combobox', () => {
    render(<Select searchable options={STATUSES} placeholder="Pick" />);
    const input = screen.getByRole('combobox');
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
  });

  it('shows selected label as input value when closed', () => {
    render(<Select searchable options={STATUSES} value="pending" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    expect(input.value).toBe('Pending');
  });

  it('typing replaces the label with the query and opens', async () => {
    const user = userEvent.setup();
    render(<Select searchable options={STATUSES} value="pending" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    input.focus();
    await user.keyboard('a');
    expect(input.value).toBe('a');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('typing filters options by label (case-insensitive)', async () => {
    const user = userEvent.setup();
    render(<Select searchable options={STATUSES} />);
    const input = screen.getByRole('combobox');
    input.focus();
    await user.keyboard('arc');
    expect(screen.queryByRole('option', { name: 'Active' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'Pending' })).toBeNull();
    expect(screen.getByRole('option', { name: 'Archived' })).toBeInTheDocument();
  });

  it('Escape reverts query to selected label', async () => {
    const user = userEvent.setup();
    render(<Select searchable options={STATUSES} defaultValue="pending" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    input.focus();
    await user.keyboard('arc');
    expect(input.value).toBe('arc');
    await user.keyboard('{Escape}');
    expect(input.value).toBe('Pending');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('Click on row commits the selection and replaces input value with new label', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select searchable options={STATUSES} onChange={onChange} />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await user.click(input);
    await user.click(screen.getByRole('option', { name: 'Pending' }));
    expect(onChange).toHaveBeenCalledWith('pending', STATUSES[1]);
    expect(input.value).toBe('Pending');
  });

  it('Click outside reverts query without selecting', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <div>
        <Select searchable options={STATUSES} defaultValue="active" onChange={onChange} />
        <button data-testid="outside">outside</button>
      </div>,
    );
    const input = screen.getByRole('combobox') as HTMLInputElement;
    input.focus();
    await user.keyboard('arc');
    expect(input.value).toBe('arc');
    await user.click(screen.getByTestId('outside'));
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('Active');
  });

  it('ArrowDown on focused-but-closed combobox opens without replacing input value', async () => {
    const user = userEvent.setup();
    render(<Select searchable options={STATUSES} value="pending" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    input.focus();
    await user.keyboard('{ArrowDown}');
    expect(input.value).toBe('Pending');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
});

describe('Select — grouped options', () => {
  const GROUPED = [
    {
      label: 'Active',
      options: [
        { value: 'a1', label: 'Foo' },
        { value: 'a2', label: 'Bar' },
      ],
    },
    { label: 'Archived', options: [{ value: 'b1', label: 'Baz' }] },
  ];

  it('renders group headers in order before their options', async () => {
    const user = userEvent.setup();
    render(<Select options={GROUPED} />);
    await user.click(screen.getByRole('button'));
    const listbox = screen.getByRole('listbox');
    const headers = listbox.querySelectorAll('[data-group-header]');
    expect(headers).toHaveLength(2);
    expect(headers[0]).toHaveTextContent('Active');
    expect(headers[1]).toHaveTextContent('Archived');
  });

  it('group is wrapped in role=group with aria-labelledby to the header id', async () => {
    const user = userEvent.setup();
    render(<Select options={GROUPED} />);
    await user.click(screen.getByRole('button'));
    const groups = screen.getAllByRole('group');
    expect(groups).toHaveLength(2);
    const header0 = screen.getByText('Active');
    expect(groups[0].getAttribute('aria-labelledby')).toBe(header0.id);
  });

  it('ArrowDown skips group headers', async () => {
    const user = userEvent.setup();
    render(<Select options={GROUPED} />);
    screen.getByRole('button').focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}'); // open + 2 steps
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Baz' }).id,
    );
  });
});
