import { act, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { createRef } from 'react';
import { Select, type SelectOption } from './Select';
import { Field } from '../Field';
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
  it('renders a select-only combobox trigger with placeholder when no value', () => {
    render(<Select options={STATUSES} placeholder="Pick one" />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Pick one');
  });

  it('renders the selected label when value is set', () => {
    render(<Select options={STATUSES} value="pending" />);
    // Two buttons in the DOM once `value` is set: the main trigger and the
    // overlay clear ✕. Filter by accessible name so the trigger is unambiguous.
    expect(screen.getByRole('combobox', { name: 'Pending' })).toBeInTheDocument();
  });
});

describe('Select — open/close', () => {
  it('opens the listbox on trigger click', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} placeholder="Pick" />);
    expect(screen.queryByRole('listbox')).toBeNull();
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Active' })).toBeInTheDocument();
  });

  it('listbox renders in a portal at document.body level', async () => {
    const user = userEvent.setup();
    const { container } = render(<Select options={STATUSES} />);
    await user.click(screen.getByRole('combobox'));
    const listbox = screen.getByRole('listbox');
    expect(container.contains(listbox)).toBe(false);
  });

  it('closes on second click of trigger', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    expect(screen.queryByRole('listbox')).toBeInTheDocument();
    await user.click(trigger);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('aria-expanded reflects open state', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('aria-controls points at the listbox id when open', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    const trigger = screen.getByRole('combobox');
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
    await user.click(screen.getByRole('combobox'));
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
    // Closed + no value → only one button (the trigger w/ placeholder text).
    expect(screen.getByRole('combobox')).toHaveTextContent('Pick');
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Archived' }));
    // After selection, the clear ✕ also renders, so name-filter the trigger.
    expect(screen.getByRole('combobox', { name: 'Archived' })).toBeInTheDocument();
  });

  it('clicking a disabled option does nothing', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const opts: SelectOption[] = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B', disabled: true },
    ];
    render(<Select options={opts} onChange={onChange} />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'B' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).toBeInTheDocument();
  });
});

describe('Select — keyboard (single, non-searchable)', () => {
  it('ArrowDown on closed trigger opens with first option active', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    const trigger = screen.getByRole('combobox');
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const active = screen.getByRole('option', { name: 'Active' });
    expect(trigger).toHaveAttribute('aria-activedescendant', active.id);
  });

  it('ArrowUp on closed trigger opens with last option active', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    const trigger = screen.getByRole('combobox');
    trigger.focus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    const active = screen.getByRole('option', { name: 'Archived' });
    expect(trigger).toHaveAttribute('aria-activedescendant', active.id);
  });

  it('Enter on closed trigger opens', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    screen.getByRole('combobox').focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('ArrowDown moves active row +1', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    screen.getByRole('combobox').focus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Pending' }).id,
    );
  });

  it('scrolls the active option into view as keyboard nav moves it (#305)', async () => {
    // jsdom has no scrollIntoView, so define a spy (the component calls it
    // optionally). aria-activedescendant means DOM focus never enters the
    // clamped, scrollable listbox — the explicit scrollIntoView is the only
    // thing keeping the active option visible.
    const scrollSpy = vi.fn();
    const proto = HTMLElement.prototype as unknown as { scrollIntoView?: () => void };
    const original = proto.scrollIntoView;
    proto.scrollIntoView = scrollSpy;
    try {
      const user = userEvent.setup();
      render(<Select options={STATUSES} />);
      screen.getByRole('combobox').focus();
      await user.keyboard('{ArrowDown}'); // open → first option active
      // The open-path scroll waits for Floating UI's isPositioned (scrolling
      // earlier would target the panel while it still sits at the document
      // origin and yank the window).
      await waitFor(() => expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest' }));
      expect(scrollSpy.mock.contexts[0]).toBe(screen.getByRole('option', { name: 'Active' }));
      scrollSpy.mockClear();
      await user.keyboard('{ArrowDown}'); // move within the open listbox
      await waitFor(() => expect(scrollSpy).toHaveBeenCalledWith({ block: 'nearest' }));
      expect(scrollSpy.mock.contexts[0]).toBe(screen.getByRole('option', { name: 'Pending' }));
    } finally {
      if (original) proto.scrollIntoView = original;
      else delete proto.scrollIntoView;
    }
  });

  it('Home jumps to first, End jumps to last', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    screen.getByRole('combobox').focus();
    await user.keyboard('{ArrowDown}{End}');
    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Archived' }).id,
    );
    await user.keyboard('{Home}');
    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Active' }).id,
    );
  });

  it('Enter on open selects the active row and closes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select options={STATUSES} onChange={onChange} />);
    screen.getByRole('combobox').focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenCalledWith('pending', STATUSES[1]);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('Escape closes without changing selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select options={STATUSES} value="active" onChange={onChange} />);
    // `value="active"` triggers the clear ✕ overlay, so filter by name to
    // get only the main trigger.
    const trigger = screen.getByRole('combobox', { name: 'Active' });
    trigger.focus();
    await user.keyboard('{Enter}{ArrowDown}{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    expect(trigger).toHaveTextContent('Active');
  });

  it('Tab closes and commits', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} />);
    screen.getByRole('combobox').focus();
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
    screen.getByRole('combobox').focus();
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(screen.getByRole('combobox')).toHaveAttribute(
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
    screen.getByRole('combobox').focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('p');
    expect(screen.getByRole('combobox')).toHaveAttribute(
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
    screen.getByRole('combobox').focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('al');
    expect(screen.getByRole('combobox')).toHaveAttribute(
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
    screen.getByRole('combobox').focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('a');
    vi.advanceTimersByTime(600);
    await user.keyboard('b');
    expect(screen.getByRole('combobox')).toHaveAttribute(
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
    screen.getByRole('combobox').focus();
    // From CLOSED state, typing 'a' must land on Apple (index 0), not skip past it
    await user.keyboard('a');
    expect(screen.getByRole('combobox')).toHaveAttribute(
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

  it('selectOnOpen selects the trigger text on open (type-to-search)', async () => {
    const user = userEvent.setup();
    render(<Select searchable selectOnOpen options={STATUSES} value="pending" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await user.click(input);
    expect(input.value).toBe('Pending');
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('Pending'.length);
  });

  it('selectOnOpen does NOT eat the first character when opening by typing', async () => {
    const user = userEvent.setup();
    render(<Select searchable selectOnOpen options={STATUSES} value="pending" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    input.focus();
    // type to open (no prior click) — the first char must survive
    await user.keyboard('ar');
    expect(input.value).toBe('ar');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
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

  it('filtering re-seeds the highlight to the first matching option (#309)', async () => {
    const user = userEvent.setup();
    render(<Select searchable options={STATUSES} value="archived" />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await user.click(input);
    // Open-seed: the current selection is highlighted (flat index 2).
    expect(input).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Archived' }).id,
    );
    // Type a query — rows rebuild to [Active, Archived]; the stale flat index
    // must not survive (it would point past/at an arbitrary row). The cursor
    // re-seeds to the first matching option.
    await user.keyboard('a');
    expect(input).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Active' }).id,
    );
  });

  it('re-seeds when a mid-open row shrink strands the cursor out of bounds (#309)', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Select options={STATUSES} value="archived" />);
    const trigger = screen.getByRole('combobox', { name: 'Archived' });
    await user.click(trigger);
    // Open-seed highlights the selection (flat index 2).
    expect(trigger).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Archived' }).id,
    );
    // Rows shrink under the open listbox (async results landing / options
    // prop change) — index 2 no longer exists; the cursor must re-seed.
    rerender(<Select options={STATUSES.slice(0, 1)} value="archived" />);
    expect(trigger).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Active' }).id,
    );
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
    await user.click(screen.getByRole('combobox'));
    const listbox = screen.getByRole('listbox');
    const headers = listbox.querySelectorAll('[data-group-header]');
    expect(headers).toHaveLength(2);
    expect(headers[0]).toHaveTextContent('Active');
    expect(headers[1]).toHaveTextContent('Archived');
  });

  it('group is wrapped in role=group with aria-labelledby to the header id', async () => {
    const user = userEvent.setup();
    render(<Select options={GROUPED} />);
    await user.click(screen.getByRole('combobox'));
    const groups = screen.getAllByRole('group');
    expect(groups).toHaveLength(2);
    const header0 = screen.getByText('Active');
    expect(groups[0].getAttribute('aria-labelledby')).toBe(header0.id);
  });

  it('ArrowDown skips group headers', async () => {
    const user = userEvent.setup();
    render(<Select options={GROUPED} />);
    screen.getByRole('combobox').focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}'); // open + 2 steps
    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-activedescendant',
      screen.getByRole('option', { name: 'Baz' }).id,
    );
  });
});

describe('Select — multi, summary, non-searchable', () => {
  const OWNERS = [
    { value: 'a', label: 'Alex' },
    { value: 'b', label: 'Bea' },
    { value: 'c', label: 'Cam' },
  ];

  it('placeholder shown when nothing selected', () => {
    render(<Select multiple triggerDisplay="summary" options={OWNERS} placeholder="Owners" />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Owners');
  });

  it('renders comma-joined labels when selections exist', () => {
    render(<Select multiple triggerDisplay="summary" options={OWNERS} value={['a', 'c']} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Alex, Cam');
  });

  it('clicking a row toggles selection and does NOT close', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select multiple triggerDisplay="summary" options={OWNERS} onChange={onChange} />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Alex' }));
    expect(onChange).toHaveBeenCalledWith(['a'], [OWNERS[0]]);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Bea' }));
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b'], [OWNERS[0], OWNERS[1]]);
  });

  it('clicking a selected row removes it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select
        multiple
        triggerDisplay="summary"
        options={OWNERS}
        defaultValue={['a']}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Alex' }));
    expect(onChange).toHaveBeenCalledWith([], []);
  });

  it('aria-multiselectable=true on the listbox', async () => {
    const user = userEvent.setup();
    render(<Select multiple triggerDisplay="summary" options={OWNERS} />);
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
  });
});

describe('Select — multi-summary aria-label', () => {
  const OPTS = [
    { value: 'a', label: 'Alex' },
    { value: 'b', label: 'Bea' },
  ];

  it('aria-label carries the full label list when summary is truncated visually', () => {
    render(<Select multiple triggerDisplay="summary" options={OPTS} value={['a', 'b']} />);
    const trigger = screen.getByRole('combobox');
    expect(trigger.getAttribute('aria-label')).toContain('Alex');
    expect(trigger.getAttribute('aria-label')).toContain('Bea');
  });

  it('does not override an explicit aria-label from props', () => {
    render(
      <Select
        multiple
        triggerDisplay="summary"
        options={OPTS}
        value={['a']}
        aria-label="Owners filter"
      />,
    );
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-label', 'Owners filter');
  });
});

describe('Select — multi-summary-searchable', () => {
  const OPTS = [
    { value: 'a', label: 'Alex' },
    { value: 'b', label: 'Bea' },
    { value: 'c', label: 'Cam' },
  ];

  it('renders a search input inside the popover when multi+summary+searchable', async () => {
    const user = userEvent.setup();
    render(<Select multiple triggerDisplay="summary" searchable options={OPTS} />);
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('typing into the popover search filters options', async () => {
    const user = userEvent.setup();
    render(<Select multiple triggerDisplay="summary" searchable options={OPTS} />);
    await user.click(screen.getByRole('combobox'));
    const input = screen.getByRole('searchbox');
    await user.type(input, 'be');
    expect(screen.queryByRole('option', { name: 'Alex' })).toBeNull();
    expect(screen.getByRole('option', { name: 'Bea' })).toBeInTheDocument();
  });

  it('selecting an option keeps popover open and refocuses search input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select multiple triggerDisplay="summary" searchable options={OPTS} onChange={onChange} />,
    );
    await user.click(screen.getByRole('combobox'));
    const input = screen.getByRole('searchbox');
    await user.type(input, 'al');
    await user.click(screen.getByRole('option', { name: 'Alex' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(document.activeElement).toBe(input);
  });
});

describe('Select — multi-chips, non-searchable', () => {
  const OPTS = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
  ];

  it('renders chips for each selected option inside the trigger', () => {
    render(<Select multiple triggerDisplay="chips" options={OPTS} value={['a', 'b']} />);
    const chips = screen.getAllByRole('button', { name: /Remove/ });
    expect(chips).toHaveLength(2);
    expect(chips[0]).toHaveAttribute('aria-label', 'Remove Alpha');
  });

  it("clicking a chip's ✕ removes that option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select
        multiple
        triggerDisplay="chips"
        options={OPTS}
        defaultValue={['a', 'b']}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Remove Alpha' }));
    expect(onChange).toHaveBeenCalledWith(['b'], [OPTS[1]]);
  });

  it('clicking on the trigger (not a chip) opens the popover', async () => {
    const user = userEvent.setup();
    render(<Select multiple triggerDisplay="chips" options={OPTS} placeholder="Pick" />);
    await user.click(screen.getByLabelText('Open select'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
});

describe('Select — multi-chips-searchable', () => {
  const OPTS = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma' },
  ];

  it('renders an inline input alongside chips', () => {
    render(
      <Select
        multiple
        triggerDisplay="chips"
        searchable
        options={OPTS}
        value={['a']}
        placeholder="Add tag…"
      />,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Alpha' })).toBeInTheDocument();
  });

  it('typing filters and selecting adds a chip + clears query', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select multiple triggerDisplay="chips" searchable options={OPTS} onChange={onChange} />,
    );
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await user.click(input);
    await user.type(input, 'be');
    expect(screen.getByRole('option', { name: 'Beta' })).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Beta' }));
    expect(onChange).toHaveBeenCalledWith(['b'], [OPTS[1]]);
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
  });

  it('Backspace on empty input removes the trailing chip', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select
        multiple
        triggerDisplay="chips"
        searchable
        options={OPTS}
        defaultValue={['a', 'b']}
        onChange={onChange}
      />,
    );
    const input = screen.getByRole('combobox');
    input.focus();
    await user.keyboard('{Backspace}');
    expect(onChange).toHaveBeenCalledWith(['a'], [OPTS[0]]);
  });

  it('Backspace on non-empty input does NOT remove a chip', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select
        multiple
        triggerDisplay="chips"
        searchable
        options={OPTS}
        defaultValue={['a']}
        onChange={onChange}
      />,
    );
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await user.type(input, 'be');
    await user.keyboard('{Backspace}'); // deletes 'e' from 'be', not the chip
    expect(input.value).toBe('b');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('chips remain visible with their correct labels while typing filters the popover', async () => {
    const user = userEvent.setup();
    const OPTS_LOCAL = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ];
    render(
      <Select
        multiple
        triggerDisplay="chips"
        searchable
        options={OPTS_LOCAL}
        defaultValue={['a']}
      />,
    );
    expect(screen.getByRole('button', { name: 'Remove Alpha' })).toBeInTheDocument();
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.type(input, 'be');
    expect(screen.getByRole('button', { name: 'Remove Alpha' })).toBeInTheDocument();
  });
});

describe('Select — async loadOptions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // RTL's waitFor polls via setInterval; under fake timers it needs an
    // explicit tick to actually fire. Same shim ConfirmationPopover uses.
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

  it('calls loadOptions("") on first open when loadOnOpen=true (default)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const loadOptions = vi.fn(async (_q: string, _signal: AbortSignal) => [
      { value: 'a', label: 'A' },
    ]);
    render(<Select searchable loadOptions={loadOptions} />);
    await user.click(screen.getByRole('combobox'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
      await vi.runAllTimersAsync();
    });
    expect(loadOptions).toHaveBeenCalledTimes(1);
    expect(loadOptions.mock.calls[0][0]).toBe('');
  });

  it('shows loading state while a request is in flight', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let resolveFn: (opts: SelectOption[]) => void = () => {};
    const loadOptions = vi.fn(() => new Promise<SelectOption[]>((res) => (resolveFn = res)));
    render(<Select searchable loadOptions={loadOptions} />);
    await user.click(screen.getByRole('combobox'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    await act(async () => {
      resolveFn([{ value: 'a', label: 'A' }]);
      await vi.runAllTimersAsync();
    });
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).toBeNull();
      expect(screen.getByRole('option', { name: 'A' })).toBeInTheDocument();
    });
  });

  it('shows error state with Retry that re-fires loadOptions', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const loadOptions = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([{ value: 'a', label: 'A' }]);
    render(<Select searchable loadOptions={loadOptions} />);
    await user.click(screen.getByRole('combobox'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
      await vi.runAllTimersAsync();
    });
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /retry/i }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
      await vi.runAllTimersAsync();
    });
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'A' })).toBeInTheDocument();
    });
  });

  it('shows empty state when async result is []', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const loadOptions = vi.fn(async () => []);
    render(<Select searchable loadOptions={loadOptions} />);
    await user.click(screen.getByRole('combobox'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
      await vi.runAllTimersAsync();
    });
    await waitFor(() => {
      expect(screen.getByText(/no options/i)).toBeInTheDocument();
    });
  });

  it('does not call loadOptions before the popover opens (loadOnOpen)', async () => {
    const loadOptions = vi.fn(async () => []);
    render(<Select searchable loadOptions={loadOptions} />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(loadOptions).not.toHaveBeenCalled();
  });
});

describe('Select — async edge cases', () => {
  it('warns in dev when both options and loadOptions are passed', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Select
        searchable
        options={[{ value: 'a', label: 'A' }]}
        loadOptions={async () => [{ value: 'b', label: 'B' }]}
      />,
    );
    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toMatch(/loadOptions/);
    warnSpy.mockRestore();
  });

  it('passes an AbortSignal to loadOptions', async () => {
    vi.useFakeTimers();
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
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const loadOptions = vi.fn(async (_q: string, signal: AbortSignal) => {
        expect(signal).toBeInstanceOf(AbortSignal);
        return [{ value: 'a', label: 'A' }];
      });
      render(<Select searchable loadOptions={loadOptions} />);
      await user.click(screen.getByRole('combobox'));
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
        await vi.runAllTimersAsync();
      });
      expect(loadOptions).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      configure({ asyncWrapper: async (cb) => cb() });
    }
  });
});

describe('Select — creatable', () => {
  const OPTS: SelectOption[] = [{ value: 'a', label: 'Alpha' }];

  it('throws in dev when creatable && !searchable', () => {
    // React 18 logs the error to console.error too; suppress to keep
    // test output clean.
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<Select creatable options={OPTS} />);
    }).toThrow(/searchable/);
    errSpy.mockRestore();
  });

  it('shows "+ Create" row when query has no exact match', async () => {
    const user = userEvent.setup();
    render(<Select searchable creatable options={OPTS} />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await user.click(input);
    await user.type(input, 'Foo');
    expect(screen.getByText(/\+ Create "Foo"/i)).toBeInTheDocument();
  });

  it('hides "+ Create" row when query EXACTLY matches an existing option (case-insensitive)', async () => {
    const user = userEvent.setup();
    render(<Select searchable creatable options={OPTS} />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await user.click(input);
    await user.type(input, 'alpha');
    expect(screen.queryByText(/\+ Create/i)).toBeNull();
  });

  it('activating the create row fires onCreate + onChange with the new value (multi)', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    const onChange = vi.fn();
    render(
      <Select
        multiple
        triggerDisplay="chips"
        searchable
        creatable
        options={OPTS}
        onCreate={onCreate}
        onChange={onChange}
      />,
    );
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await user.click(input);
    await user.type(input, 'Beta');
    await user.click(screen.getByText(/\+ Create "Beta"/i));
    expect(onCreate).toHaveBeenCalledWith('Beta');
    expect(onChange).toHaveBeenCalledWith(['Beta'], [{ value: 'Beta', label: 'Beta' }]);
  });

  it('activating the create row in single mode replaces selection + closes', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    const onChange = vi.fn();
    render(<Select searchable creatable options={OPTS} onCreate={onCreate} onChange={onChange} />);
    const input = screen.getByRole('combobox') as HTMLInputElement;
    await user.click(input);
    await user.type(input, 'Foo');
    await user.click(screen.getByText(/\+ Create "Foo"/i));
    expect(onCreate).toHaveBeenCalledWith('Foo');
    expect(onChange).toHaveBeenCalledWith('Foo', { value: 'Foo', label: 'Foo' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('hides "+ Create" row when query is in current multi selection (no dup)', async () => {
    const user = userEvent.setup();
    render(
      <Select
        multiple
        searchable
        creatable
        triggerDisplay="chips"
        options={OPTS}
        defaultValue={['Foo']}
      />,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.type(input, 'Foo');
    expect(screen.queryByText(/\+ Create "Foo"/i)).toBeNull();
  });
});

describe('Select — form integration (single)', () => {
  it('renders a hidden input named `name` with the current value', () => {
    const { container } = render(<Select options={STATUSES} value="pending" name="status" />);
    const hidden = container.querySelector<HTMLInputElement>('input[name="status"]');
    expect(hidden).not.toBeNull();
    expect(hidden!.type).toBe('hidden');
    expect(hidden!.value).toBe('pending');
  });

  it('hidden input is required when `required`', () => {
    const { container } = render(<Select options={STATUSES} name="status" required />);
    const hidden = container.querySelector<HTMLInputElement>('input[name="status"]');
    expect(hidden!.required).toBe(true);
  });

  it.each([
    ['single select-only combobox', {}, 'combobox'],
    ['single searchable input', { searchable: true }, 'combobox'],
    ['multi searchable input', { multiple: true, searchable: true }, 'combobox'],
    ['multi chips combobox', { multiple: true }, 'combobox'],
  ] as const)('exposes required state on the %s trigger', (_name, triggerProps, role) => {
    const { container } = render(<Select options={STATUSES} required {...triggerProps} />);

    expect(screen.getByRole(role)).toHaveAttribute('aria-required', 'true');
    expect(container.firstElementChild).not.toHaveAttribute('aria-required');
  });

  it('routes explicit aria-required to the combobox instead of the roleless wrapper', () => {
    const { container, rerender } = render(
      <Select searchable options={STATUSES} aria-required="true" />,
    );

    expect(screen.getByRole('combobox')).toHaveAttribute('aria-required', 'true');
    expect(container.firstElementChild).not.toHaveAttribute('aria-required');

    rerender(<Select searchable options={STATUSES} required aria-required="false" />);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-required', 'true');
  });

  it('FormData picks up the value on submit', () => {
    let captured: FormData | null = null;
    render(
      <form
        onSubmit={(e) => {
          e.preventDefault();
          captured = new FormData(e.currentTarget);
        }}
      >
        <Select options={STATUSES} name="status" defaultValue="active" />
        <button type="submit">Go</button>
      </form>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(captured!.get('status')).toBe('active');
  });
});

describe('Select — form integration (multi)', () => {
  const OPTS = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
  ];

  it('renders one hidden input per selected value', () => {
    const { container } = render(<Select multiple options={OPTS} value={['a', 'b']} name="tags" />);
    const hiddens = container.querySelectorAll<HTMLInputElement>('input[name="tags"]');
    expect(hiddens).toHaveLength(2);
    expect(
      Array.from(hiddens)
        .map((h) => h.value)
        .sort(),
    ).toEqual(['a', 'b']);
  });

  it('FormData.getAll returns the array', () => {
    let captured: FormData | null = null;
    render(
      <form
        onSubmit={(e) => {
          e.preventDefault();
          captured = new FormData(e.currentTarget);
        }}
      >
        <Select multiple options={OPTS} defaultValue={['a', 'b']} name="tags" />
        <button type="submit">Go</button>
      </form>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(captured!.getAll('tags')).toEqual(['a', 'b']);
  });

  it('empty + required renders one empty required input', () => {
    const { container } = render(
      <Select multiple options={OPTS} value={[]} name="tags" required />,
    );
    const hiddens = container.querySelectorAll<HTMLInputElement>('input[name="tags"]');
    expect(hiddens).toHaveLength(1);
    expect(hiddens[0].required).toBe(true);
    expect(hiddens[0].value).toBe('');
  });

  it('with values + required, no input is required (the presence is enough)', () => {
    const { container } = render(
      <Select multiple options={OPTS} value={['a']} name="tags" required />,
    );
    const hiddens = container.querySelectorAll<HTMLInputElement>('input[name="tags"]');
    expect(hiddens).toHaveLength(1);
    expect(hiddens[0].required).toBe(false);
  });
});

describe('Select — visual states', () => {
  it('size="sm" applies the sm class', () => {
    const { container } = render(<Select options={STATUSES} size="sm" />);
    expect(container.firstElementChild!.className).toMatch(/size-sm/);
  });

  it('size="lg" applies the lg class', () => {
    const { container } = render(<Select options={STATUSES} size="lg" />);
    expect(container.firstElementChild!.className).toMatch(/size-lg/);
  });

  it('invalid sets aria-invalid on the trigger and adds the invalid class', () => {
    const { container } = render(<Select options={STATUSES} invalid />);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
    expect(container.firstElementChild!.className).toMatch(/invalid/);
  });

  it('disabled disables the trigger and prevents opening', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} disabled />);
    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('readOnly prevents opening on click', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} readOnly value="pending" />);
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-readonly', 'true');
    await user.click(trigger);
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(trigger).toHaveTextContent('Pending');
  });
});

describe('Select — clearable', () => {
  it('does NOT show ✕ by default — clearable is opt-in', () => {
    render(<Select options={STATUSES} value="pending" />);
    expect(screen.queryByRole('button', { name: /clear selection/i })).toBeNull();
  });

  it('shows ✕ button when single + clearable + has value', () => {
    render(<Select options={STATUSES} value="pending" clearable />);
    expect(screen.getByRole('button', { name: /clear selection/i })).toBeInTheDocument();
  });

  it('clicking ✕ clears the selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select options={STATUSES} defaultValue="pending" clearable onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /clear selection/i }));
    expect(onChange).toHaveBeenCalledWith('', null);
  });

  it('explicit clearable shows ✕ even on a required field (required does not suppress opt-in)', () => {
    render(<Select options={STATUSES} value="pending" required name="x" clearable />);
    expect(screen.getByRole('button', { name: /clear selection/i })).toBeInTheDocument();
  });

  it('does NOT show ✕ when clearable but no value', () => {
    render(<Select options={STATUSES} clearable />);
    expect(screen.queryByRole('button', { name: /clear selection/i })).toBeNull();
  });

  it('clearable is suppressed when disabled or readOnly', () => {
    const { rerender } = render(<Select options={STATUSES} value="pending" clearable disabled />);
    expect(screen.queryByRole('button', { name: /clear selection/i })).toBeNull();
    rerender(<Select options={STATUSES} value="pending" clearable readOnly />);
    expect(screen.queryByRole('button', { name: /clear selection/i })).toBeNull();
  });

  it('does NOT show ✕ in multi mode by default', () => {
    render(<Select multiple options={STATUSES} value={['active']} triggerDisplay="summary" />);
    expect(screen.queryByRole('button', { name: /clear selection/i })).toBeNull();
  });

  it('shows ✕ in multi mode when explicitly clearable=true', () => {
    render(
      <Select multiple options={STATUSES} value={['active']} triggerDisplay="summary" clearable />,
    );
    expect(screen.getByRole('button', { name: /clear selection/i })).toBeInTheDocument();
  });

  it('clicking ✕ in multi clears the entire array', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select
        multiple
        options={STATUSES}
        defaultValue={['active', 'pending']}
        triggerDisplay="summary"
        clearable
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: /clear selection/i }));
    expect(onChange).toHaveBeenCalledWith([], []);
  });

  it('clear ✕ button is focusable via keyboard', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} defaultValue="active" clearable />);
    const trigger = screen.getByRole('combobox', { name: /Active/i });
    trigger.focus();
    await user.tab(); // moves to next focusable
    const clearBtn = screen.getByRole('button', { name: /clear selection/i });
    expect(document.activeElement).toBe(clearBtn);
  });

  it('Enter on focused clear ✕ clears the selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select options={STATUSES} defaultValue="pending" clearable onChange={onChange} />);
    const clearBtn = screen.getByRole('button', { name: /clear selection/i });
    clearBtn.focus();
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('', null);
  });
});

describe('Select — render escape hatches', () => {
  it('renderOption replaces the option row content', async () => {
    const user = userEvent.setup();
    render(
      <Select
        options={STATUSES}
        renderOption={(opt, state) => (
          <div data-testid={`opt-${opt.value}`}>
            <span>{opt.label}</span>
            <span>{state.selected ? '★' : '☆'}</span>
          </div>
        )}
        value="pending"
      />,
    );
    await user.click(screen.getByRole('combobox', { name: /Pending/i }));
    expect(screen.getByTestId('opt-pending')).toHaveTextContent('Pending★');
    expect(screen.getByTestId('opt-active')).toHaveTextContent('Active☆');
  });

  it('renderValue replaces the single trigger label', () => {
    render(
      <Select options={STATUSES} value="pending" renderValue={(opt) => <em>~~{opt.label}~~</em>} />,
    );
    expect(screen.getByRole('combobox', { name: /Pending/ })).toHaveTextContent('~~Pending~~');
  });

  it('renderTag replaces chip rendering', () => {
    render(
      <Select
        multiple
        triggerDisplay="chips"
        options={STATUSES}
        value={['pending']}
        renderTag={(opt, remove) => (
          <span data-testid={`tag-${opt.value}`} onClick={remove}>
            {opt.label}
          </span>
        )}
      />,
    );
    expect(screen.getByTestId('tag-pending')).toHaveTextContent('Pending');
  });

  it('renderEmpty replaces the empty state', async () => {
    const user = userEvent.setup();
    render(
      <Select searchable options={STATUSES} renderEmpty={(q) => <span>Nothing for "{q}"</span>} />,
    );
    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.type(input, 'zzz');
    expect(screen.getByText('Nothing for "zzz"')).toBeInTheDocument();
  });
});

describe('Select — overlay elevation', () => {
  it('elevates the listbox (data-in-overlay) when opened inside an overlay', async () => {
    const user = userEvent.setup();
    render(
      <div data-drawer-portal-root="">
        <Select options={STATUSES} aria-label="Status" />
      </div>,
    );
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).toHaveAttribute('data-in-overlay', '');
  });

  it('does not elevate the listbox at page level', async () => {
    const user = userEvent.setup();
    render(<Select options={STATUSES} aria-label="Status" />);
    await user.click(screen.getByRole('combobox'));
    expect(screen.getByRole('listbox')).not.toHaveAttribute('data-in-overlay');
  });
});

describe('Select — Field label integration', () => {
  it('a Field label names the combobox (auto-clone)', () => {
    render(
      <Field label="Status">
        <Select
          options={[
            { value: 'a', label: 'Active' },
            { value: 'b', label: 'Archived' },
          ]}
        />
      </Field>,
    );
    expect(screen.getByRole('combobox', { name: 'Status' })).toBeInTheDocument();
  });
});
