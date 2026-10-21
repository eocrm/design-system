import { createRef } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  OptionsPicker,
  type OptionsPickerContentProps,
  type OptionsPickerOption,
} from './OptionsPicker';
import { Button } from '../Button';
import { setupUser, useFakeTimersWithUserEvent } from '../_internal/fakeTimers.testutil';

const flatOptions = [
  { value: 'one', label: 'One' },
  { value: 'two', label: 'Two' },
];

it('renders Trigger only when closed (Popover is collapsed)', () => {
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
  // Panel is not visible until opened
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('opens the panel on Trigger click', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  expect(screen.getByRole('dialog', { name: 'Filter' })).toBeInTheDocument();
});

it('throws when Trigger is used outside the root', () => {
  // Suppress React's expected-error log for this case.
  const err = vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(() =>
    render(
      <OptionsPicker.Trigger>
        <Button>Naked</Button>
      </OptionsPicker.Trigger>,
    ),
  ).toThrow(/inside <OptionsPicker>/);
  err.mockRestore();
});

it('renders flat options as checkboxes when opened (multi mode)', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={['two']} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  const checkboxes = screen.getAllByRole('checkbox');
  expect(checkboxes).toHaveLength(2);
  expect(checkboxes[0]).not.toBeChecked();
  expect(checkboxes[1]).toBeChecked();
});

it('multi mode: clicking a checkbox updates the draft (does not commit yet)', async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(
    <OptionsPicker selected={[]} onApply={onApply}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  const [first] = screen.getAllByRole('checkbox');
  await user.click(first);
  expect(first).toBeChecked();
  // onApply should NOT have been called — multi mode waits for Apply.
  expect(onApply).not.toHaveBeenCalled();
});

it('filters visible options by search text (case-insensitive substring)', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content
        label="Filter"
        options={[
          { value: 'a', label: 'login_succeeded' },
          { value: 'b', label: 'login_failed' },
          { value: 'c', label: 'logout' },
        ]}
      />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  const search = screen.getByRole('textbox');
  await user.type(search, 'failed');
  expect(screen.getAllByRole('checkbox')).toHaveLength(1);
  expect(screen.getByText('login_failed')).toBeInTheDocument();
});

it('does not render the "N sel" count in the search bar (selection count lives in the footer only)', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={['a']} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content
        label="Filter"
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  expect(screen.queryByText('1 sel')).not.toBeInTheDocument();
  expect(screen.queryByText('2 sel')).not.toBeInTheDocument();
});

it('multi mode: Apply commits the draft and closes the panel', async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(
    <OptionsPicker selected={[]} onApply={onApply}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.click(screen.getAllByRole('checkbox')[0]);
  await user.click(screen.getByRole('button', { name: 'Apply' }));
  expect(onApply).toHaveBeenCalledWith(['one'], expect.anything());
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('multi mode: Cancel discards the draft without firing onApply', async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  const onCancel = vi.fn();
  render(
    <OptionsPicker selected={['one']} onApply={onApply} onCancel={onCancel}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.click(screen.getAllByRole('checkbox')[0]);
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onApply).not.toHaveBeenCalled();
  expect(onCancel).toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('multi mode: footer shows "N of TOTAL events" with default formatter', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={['one']} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  expect(screen.getByText('1 of 2')).toBeInTheDocument();
});

const groupedOptions = [
  {
    id: 'auth',
    label: 'Authentication',
    tone: 'success' as const,
    hint: 'auth.*',
    options: [
      { value: 'auth.login', label: 'login' },
      { value: 'auth.logout', label: 'logout' },
    ],
  },
  {
    id: 'role',
    label: 'Roles',
    tone: 'info' as const,
    hint: 'role.*',
    options: [
      { value: 'role.assigned', label: 'assigned' },
      { value: 'role.revoked', label: 'revoked' },
    ],
  },
];

it('renders groups with section headers + hint labels', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" groups={groupedOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  expect(screen.getByText('Authentication')).toBeInTheDocument();
  expect(screen.getByText('auth.*')).toBeInTheDocument();
  expect(screen.getByText('Roles')).toBeInTheDocument();
  expect(screen.getByText('role.*')).toBeInTheDocument();
  expect(screen.getAllByRole('checkbox')).toHaveLength(4);
});

it('hides groups whose every option is filtered out', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" groups={groupedOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.type(screen.getByRole('textbox'), 'login');
  expect(screen.getByText('Authentication')).toBeInTheDocument();
  expect(screen.queryByText('Roles')).not.toBeInTheDocument();
});

it('shows emptyState when all groups are filtered to nothing', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" groups={groupedOptions} emptyState="No matches" />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.type(screen.getByRole('textbox'), 'zzz');
  expect(screen.getByText('No matches')).toBeInTheDocument();
});

// `''` means unset here too, matching every other label override in the
// library — a blank listbox reads as a broken filter, not a deliberate
// silence, and there was never a documented way to suppress the message.
it('treats emptyState="" as unset and shows the default copy', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" groups={groupedOptions} emptyState="" />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.type(screen.getByRole('textbox'), 'zzz');
  expect(screen.getByText('No matches')).toBeInTheDocument();
});

it('multi mode: clicking a group header selects all options in that group', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" groups={groupedOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.click(screen.getByRole('button', { name: /Authentication/i }));
  expect(screen.getByRole('checkbox', { name: 'login' })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'logout' })).toBeChecked();
});

it('multi mode: clicking a fully-selected group header deselects all', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={['auth.login', 'auth.logout']} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" groups={groupedOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.click(screen.getByRole('button', { name: /Authentication/i }));
  expect(screen.getByRole('checkbox', { name: 'login' })).not.toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'logout' })).not.toBeChecked();
});

it('multi mode: group header aria-pressed reflects tri-state', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={['auth.login']} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" groups={groupedOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  const authHeader = screen.getByRole('button', { name: /Authentication/i });
  expect(authHeader).toHaveAttribute('aria-pressed', 'mixed');
  await user.click(screen.getByRole('checkbox', { name: 'logout' }));
  expect(authHeader).toHaveAttribute('aria-pressed', 'true');
});

it('single mode: group header is presentational (no role=button)', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker mode="single" selected={null} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" groups={groupedOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  expect(screen.queryByRole('button', { name: /Authentication/i })).not.toBeInTheDocument();
  expect(screen.getByText('Authentication')).toBeInTheDocument();
});

it('single mode: clicking a row commits via onApply and closes', async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(
    <OptionsPicker mode="single" selected={null} onApply={onApply}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.click(screen.getAllByRole('radio')[1]);
  expect(onApply).toHaveBeenCalledWith('two', flatOptions[1]);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('single mode: no Apply/Cancel footer', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker mode="single" selected={null} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
});

it('single mode: pre-selected row reflects in the radio', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker mode="single" selected="two" onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  const radios = screen.getAllByRole('radio');
  expect(radios[0]).not.toBeChecked();
  expect(radios[1]).toBeChecked();
});

it('single mode: a parent re-render while open keeps the typed filter', async () => {
  const user = userEvent.setup();
  const ui = () => (
    <OptionsPicker mode="single" selected="two" onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>
  );
  const { rerender } = render(ui());
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.type(screen.getByRole('textbox'), 'on');
  rerender(ui());
  expect(screen.getByRole('textbox')).toHaveValue('on');
  expect(screen.getAllByRole('radio')).toHaveLength(1);
});

it('keyboard: ↓/↑ moves focused option via aria-activedescendant', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  const listbox = screen.getByRole('listbox');
  await user.keyboard('{ArrowDown}');
  expect(listbox.getAttribute('aria-activedescendant')).toMatch(/-opt-one$/);
  await user.keyboard('{ArrowDown}');
  expect(listbox.getAttribute('aria-activedescendant')).toMatch(/-opt-two$/);
  // ArrowDown from last wraps to first
  await user.keyboard('{ArrowDown}');
  expect(listbox.getAttribute('aria-activedescendant')).toMatch(/-opt-one$/);
});

it('keyboard: Enter on focused option toggles (multi)', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.keyboard('{ArrowDown}{Enter}');
  expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
});

it('keyboard: Esc cancels and closes the panel', async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(
    <OptionsPicker selected={['one']} onApply={onApply}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  // Toggle one off in draft
  await user.click(screen.getAllByRole('checkbox')[0]);
  await user.keyboard('{Escape}');
  expect(onApply).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('Trigger carries aria-haspopup, aria-controls, and aria-expanded', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  const trigger = screen.getByRole('button', { name: 'Open' });
  expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  // aria-controls is absent when closed (conditional, per Popover.Trigger convention).
  expect(trigger).not.toHaveAttribute('aria-controls');
  await user.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  // aria-controls is present when open, pointing at the panel.
  expect(trigger.getAttribute('aria-controls')).toBeTruthy();
});

it('group headers carry aria-controls listing all option ids', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" groups={groupedOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  const header = screen.getByRole('button', { name: /Authentication/i });
  const ids = header.getAttribute('aria-controls')!.split(' ');
  expect(ids).toHaveLength(2);
  expect(ids[0]).toMatch(/-opt-auth\.login$/);
  expect(ids[1]).toMatch(/-opt-auth\.logout$/);
});

// ---------------------------------------------------------------------------
// C1: onCancel fires on Esc and on click-outside
// ---------------------------------------------------------------------------

it('C1: Esc fires onCancel', async () => {
  const user = userEvent.setup();
  const onCancel = vi.fn();
  const onApply = vi.fn();
  render(
    <OptionsPicker selected={['one']} onApply={onApply} onCancel={onCancel}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.keyboard('{Escape}');
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onApply).not.toHaveBeenCalled();
});

it('C1: click-outside fires onCancel', async () => {
  const user = userEvent.setup();
  const onCancel = vi.fn();
  const onApply = vi.fn();
  render(
    <>
      <OptionsPicker selected={[]} onApply={onApply} onCancel={onCancel}>
        <OptionsPicker.Trigger>
          <Button>Open</Button>
        </OptionsPicker.Trigger>
        <OptionsPicker.Content label="Filter" options={flatOptions} />
      </OptionsPicker>
      <div data-testid="elsewhere">elsewhere</div>
    </>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  // pointerdown outside the panel — the canonical outside-click pattern.
  await user.pointer({ keys: '[MouseLeft>]', target: screen.getByTestId('elsewhere') });
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onApply).not.toHaveBeenCalled();
});

it('C1: Apply does NOT fire onCancel', async () => {
  const user = userEvent.setup();
  const onCancel = vi.fn();
  render(
    <OptionsPicker selected={[]} onApply={() => {}} onCancel={onCancel}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.click(screen.getByRole('button', { name: 'Apply' }));
  expect(onCancel).not.toHaveBeenCalled();
});

// ---------------------------------------------------------------------------
// C2: Cmd/Ctrl+Enter commits the draft in multi mode
// ---------------------------------------------------------------------------

it('C2: Cmd+Enter commits the draft', async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(
    <OptionsPicker selected={[]} onApply={onApply}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  // Toggle 'one' via checkbox click then commit with Cmd+Enter
  await user.click(screen.getByRole('checkbox', { name: 'One' }));
  await user.keyboard('{Meta>}{Enter}{/Meta}');
  expect(onApply).toHaveBeenCalledWith(['one'], expect.anything());
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('C2: Ctrl+Enter commits the draft', async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(
    <OptionsPicker selected={[]} onApply={onApply}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.click(screen.getByRole('checkbox', { name: 'Two' }));
  await user.keyboard('{Control>}{Enter}{/Control}');
  expect(onApply).toHaveBeenCalledWith(['two'], expect.anything());
});

it('C2: plain Enter on focused option still toggles (Cmd+Enter reorder does not break it)', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  // ArrowDown focuses 'one', Enter should toggle it.
  await user.keyboard('{ArrowDown}{Enter}');
  expect(screen.getByRole('checkbox', { name: 'One' })).toBeChecked();
});

// ---------------------------------------------------------------------------
// C3: Trigger forwards ref to the child element
// ---------------------------------------------------------------------------

it('C3: Trigger forwards ref to the child button element', async () => {
  const user = userEvent.setup();
  const ref = createRef<HTMLButtonElement>();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger ref={ref}>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  // Ref is populated before any interaction.
  expect(ref.current).not.toBeNull();
  expect(ref.current?.tagName).toBe('BUTTON');
  // The ref points at the same node the user sees.
  expect(ref.current).toBe(screen.getByRole('button', { name: 'Open' }));
  // Sanity: the picker still opens normally.
  await user.click(ref.current!);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

// ---------------------------------------------------------------------------
// I5: Search input receives focus when the panel opens
// ---------------------------------------------------------------------------

it('I5: search input is focused when panel opens', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  // Microtask runs asynchronously — waitFor lets us observe after it settles.
  await waitFor(() => {
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });
});

// ---------------------------------------------------------------------------
// I8: clicking the label text (not the checkbox box) toggles the option
// ---------------------------------------------------------------------------

it('I8: clicking label text toggles the checkbox', async () => {
  const user = userEvent.setup();
  render(
    <OptionsPicker selected={[]} onApply={() => {}}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  // Click the label text — not the checkbox element directly.
  await user.click(screen.getByText('One'));
  expect(screen.getByRole('checkbox', { name: 'One' })).toBeChecked();
});

it('I8: clicking label text in single mode commits via onApply', async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(
    <OptionsPicker mode="single" selected={null} onApply={onApply}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.click(screen.getByText('One'));
  expect(onApply).toHaveBeenCalledWith('one', expect.anything());
});

it('multi onApply receives the selected options in draft order', async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(
    <OptionsPicker selected={[]} onApply={onApply}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content label="Filter" options={flatOptions} />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  const boxes = screen.getAllByRole('checkbox');
  await user.click(boxes[1]);
  await user.click(boxes[0]);
  await user.click(screen.getByRole('button', { name: /apply/i }));
  expect(onApply).toHaveBeenCalledWith(['two', 'one'], [flatOptions[1], flatOptions[0]]);
});

it('multi onApply resolves options from groups and falls back for unknown values', async () => {
  const user = userEvent.setup();
  const onApply = vi.fn();
  render(
    <OptionsPicker selected={['gone']} onApply={onApply}>
      <OptionsPicker.Trigger>
        <Button>Open</Button>
      </OptionsPicker.Trigger>
      <OptionsPicker.Content
        label="Filter"
        groups={[{ id: 'g', label: 'G', options: flatOptions }]}
      />
    </OptionsPicker>,
  );
  await user.click(screen.getByRole('button', { name: 'Open' }));
  await user.click(
    screen.getAllByRole('checkbox').find((c) => c.getAttribute('aria-label') !== 'G')!,
  );
  await user.click(screen.getByRole('button', { name: /apply/i }));
  const [values, opts] = onApply.mock.calls[0];
  expect(opts).toHaveLength(values.length);
  expect(opts[0]).toEqual({ value: 'gone', label: 'gone' });
});

it('an existing one-arg onApply callback still type-checks', () => {
  const multi = (_v: string[]) => {};
  const single = (_v: string | null) => {};
  render(
    <>
      <OptionsPicker selected={[]} onApply={multi}>
        <OptionsPicker.Content label="F" options={flatOptions} />
      </OptionsPicker>
      <OptionsPicker mode="single" selected={null} onApply={single}>
        <OptionsPicker.Content label="F" options={flatOptions} />
      </OptionsPicker>
    </>,
  );
});

describe('async loadOptions', () => {
  useFakeTimersWithUserEvent();

  const members: OptionsPickerOption[] = [
    { value: 'ann', label: 'Ann' },
    { value: 'bob', label: 'Bob' },
  ];

  type Load = (q: string, signal: AbortSignal) => Promise<OptionsPickerOption[]>;

  // A loadOptions whose every call returns a promise the test settles by hand.
  function deferredLoad() {
    const calls: {
      query: string;
      resolve: (o: OptionsPickerOption[]) => void;
      reject: (e: Error) => void;
    }[] = [];
    const fn = vi.fn<Load>(
      (query) =>
        new Promise((resolve, reject) => {
          calls.push({ query, resolve, reject });
        }),
    );
    return { fn, calls };
  }

  const elapse = (ms: number) =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });

  function renderAsync(
    contentProps: Partial<OptionsPickerContentProps> & { loadOptions: Load },
    root: { selected?: string[]; onApply?: (v: string[], o: OptionsPickerOption[]) => void } = {},
  ) {
    return render(
      <OptionsPicker selected={root.selected ?? []} onApply={root.onApply ?? (() => {})}>
        <OptionsPicker.Trigger>
          <Button>Open</Button>
        </OptionsPicker.Trigger>
        <OptionsPicker.Content {...(contentProps as OptionsPickerContentProps)} label="Members" />
      </OptionsPicker>,
    );
  }

  const open = (user: ReturnType<typeof setupUser>) =>
    user.click(screen.getByRole('button', { name: 'Open' }));
  const region = () => document.querySelector('[role="status"][aria-live="polite"]')!;
  // Hard rule 10: the persisting failure is folded into the Retry button's name.
  const retryName = 'Failed to load options. Retry';

  it('a new loadOptions identity while open neither refetches nor aborts; the latest one serves the next query', async () => {
    const user = setupUser();
    const first = deferredLoad();
    const second = vi.fn<Load>(async () => members);
    const ui = (load: Load) => (
      <OptionsPicker selected={[]} onApply={() => {}}>
        <OptionsPicker.Trigger>
          <Button>Open</Button>
        </OptionsPicker.Trigger>
        {/* Inline arrow, as a consumer would write it: a new identity per render. */}
        <OptionsPicker.Content label="Members" loadOptions={(q, s) => load(q, s)} />
      </OptionsPicker>
    );
    const { rerender } = render(ui(first.fn));
    await open(user);
    await elapse(250);
    expect(first.fn).toHaveBeenCalledTimes(1);
    const signal = first.fn.mock.calls[0]![1];
    rerender(ui(second));
    await elapse(500);
    expect(first.fn).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
    expect(signal.aborted).toBe(false);
    await act(async () => first.calls[0]!.reject(new Error('boom')));
    expect(screen.getByRole('button', { name: retryName })).toBeInTheDocument();
    await user.type(screen.getByRole('textbox'), 'b');
    await elapse(250);
    expect(second.mock.calls.map((c) => c[0])).toEqual(['b']);
    expect(first.fn).toHaveBeenCalledTimes(1);
  });

  it("fetches '' when the panel opens, after searchDebounceMs (default 250)", async () => {
    const user = setupUser();
    const loadOptions = vi.fn<Load>(async () => members);
    renderAsync({ loadOptions });
    expect(loadOptions).not.toHaveBeenCalled();
    await open(user);
    await elapse(249);
    expect(loadOptions).not.toHaveBeenCalled();
    await elapse(1);
    expect(loadOptions).toHaveBeenCalledTimes(1);
    expect(loadOptions.mock.calls[0]![0]).toBe('');
    expect(screen.getByRole('checkbox', { name: 'Ann' })).toBeInTheDocument();
  });

  it('typing debounces into one fetch with the query; rows are the server answer, no client filter on top', async () => {
    const user = setupUser();
    const loadOptions = vi.fn<Load>(async (q) =>
      q === 'an' ? [{ value: 'zed', label: 'Zed' }] : members,
    );
    renderAsync({ loadOptions, searchDebounceMs: 100 });
    await open(user);
    await elapse(100);
    expect(loadOptions).toHaveBeenCalledTimes(1);
    await user.type(screen.getByRole('textbox'), 'an');
    await elapse(100);
    expect(loadOptions).toHaveBeenCalledTimes(2);
    expect(loadOptions.mock.calls[1]![0]).toBe('an');
    // 'Zed' does not contain 'an' — a client filter would hide it.
    expect(screen.getByRole('checkbox', { name: 'Zed' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Ann' })).not.toBeInTheDocument();
  });

  it('a stale response for an earlier query does not replace a newer one', async () => {
    const user = setupUser();
    const { fn, calls } = deferredLoad();
    renderAsync({ loadOptions: fn });
    await open(user);
    await elapse(250);
    await user.type(screen.getByRole('textbox'), 'b');
    await elapse(250);
    expect(calls.map((c) => c.query)).toEqual(['', 'b']);
    await act(async () => calls[1]!.resolve([members[1]!]));
    await act(async () => calls[0]!.resolve(members));
    expect(screen.getAllByRole('checkbox').map((c) => c.closest('label')!.textContent)).toEqual([
      'Bob',
    ]);
  });

  it("reopening fires a fresh '' fetch", async () => {
    const user = setupUser();
    const loadOptions = vi.fn<Load>(async () => members);
    renderAsync({ loadOptions });
    await open(user);
    await elapse(250);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    await open(user);
    await elapse(250);
    expect(loadOptions.mock.calls.map((c) => c[0])).toEqual(['', '']);
  });

  it('loading row while in flight; error row with Retry that re-fires loadOptions', async () => {
    const user = setupUser();
    const { fn, calls } = deferredLoad();
    renderAsync({ loadOptions: fn });
    await open(user);
    await elapse(250);
    const visible = (re: RegExp) =>
      screen.queryAllByText(re).filter((el) => el.closest('[role="status"]') === null);
    expect(visible(/loading options/i)).toHaveLength(1);
    await act(async () => calls[0]!.reject(new Error('boom')));
    expect(visible(/loading options/i)).toHaveLength(0);
    expect(visible(/failed to load options/i)).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: retryName }));
    await elapse(250);
    expect(fn).toHaveBeenCalledTimes(2);
    await act(async () => calls[1]!.resolve(members));
    expect(visible(/failed to load options/i)).toHaveLength(0);
    expect(screen.getByRole('checkbox', { name: 'Bob' })).toBeInTheDocument();
  });

  it('empty state (optionsPicker.noMatches / emptyState) only once the settled loadedQuery equals the current query', async () => {
    const user = setupUser();
    const loadOptions = vi.fn<Load>(async () => []);
    renderAsync({ loadOptions, emptyState: 'Nobody here' });
    await open(user);
    expect(screen.queryAllByText('Nobody here')).toHaveLength(0);
    await elapse(250);
    expect(screen.getAllByText('Nobody here').length).toBeGreaterThan(0);
    await user.type(screen.getByRole('textbox'), 'x');
    // Debounce window: the answer on screen is for '' — not a result for 'x'.
    expect(screen.queryAllByText('Nobody here')).toHaveLength(0);
    await elapse(250);
    expect(screen.getAllByText('Nobody here').length).toBeGreaterThan(0);
  });

  it('live region role=status is present before any fetch and announces loading, then load failure, then no matches', async () => {
    const user = setupUser();
    const { fn, calls } = deferredLoad();
    renderAsync({ loadOptions: fn });
    await open(user);
    const node = region();
    expect(node).toBeInTheDocument();
    await elapse(250);
    expect(region()).toBe(node);
    expect(node.textContent).toBe('Loading options…');
    const loadingRow = screen
      .getAllByText('Loading options…')
      .find((el) => el.closest('[role="status"]') === null)!;
    expect(loadingRow.closest('[aria-hidden="true"]')).not.toBeNull();

    await act(async () => calls[0]!.reject(new Error('boom')));
    expect(region()).toBe(node);
    expect(node.textContent).toBe('Failed to load options.');
    const errorRow = screen
      .getAllByText('Failed to load options.')
      .find((el) => el.closest('[role="status"]') === null)!;
    expect(errorRow.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(
      screen.getByRole('button', { name: retryName }).closest('[aria-hidden="true"]'),
    ).toBeNull();

    await user.click(screen.getByRole('button', { name: retryName }));
    await elapse(250);
    await act(async () => calls[1]!.resolve([]));
    expect(region()).toBe(node);
    expect(node.textContent).toBe('No matches');
    const emptyRow = screen
      .getAllByText('No matches')
      .find((el) => el.closest('[role="status"]') === null)!;
    expect(emptyRow.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('multi footer reads "N selected" and footerCount is not called in async mode', async () => {
    const user = setupUser();
    const footerCount = vi.fn(() => 'custom');
    renderAsync({ loadOptions: async () => members, footerCount }, { selected: ['ann', 'bob'] });
    await open(user);
    await elapse(250);
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(footerCount).not.toHaveBeenCalled();
  });

  it('shows the search input even with searchable={false}', async () => {
    const user = setupUser();
    renderAsync({ loadOptions: async () => members, searchable: false });
    await open(user);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('onApply carries the label of a value picked from a server answer', async () => {
    const user = setupUser();
    const onApply = vi.fn();
    renderAsync({ loadOptions: async () => members }, { onApply });
    await open(user);
    await elapse(250);
    await user.click(screen.getByRole('checkbox', { name: 'Bob' }));
    await user.click(screen.getByRole('button', { name: /apply/i }));
    expect(onApply).toHaveBeenCalledWith(['bob'], [members[1]]);
  });

  describe("reopen does not show the previous open's state", () => {
    // Close, reopen, and stop inside the new debounce window.
    async function reopen(user: ReturnType<typeof setupUser>) {
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      await open(user);
      await elapse(100);
    }
    const visibleText = (text: string) =>
      screen.queryAllByText(text).filter((el) => el.closest('[role="status"]') === null);

    it('after an empty answer: loading, not "No matches"', async () => {
      const user = setupUser();
      renderAsync({ loadOptions: async () => [] });
      await open(user);
      await elapse(250);
      expect(region().textContent).toBe('No matches');
      await reopen(user);
      expect(visibleText('No matches')).toHaveLength(0);
      expect(visibleText('Loading options…')).toHaveLength(1);
      expect(region().textContent).toBe('Loading options…');
    });

    it('after an error: loading, not the old failure', async () => {
      const user = setupUser();
      const loadOptions = vi
        .fn<Load>()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValue(members);
      renderAsync({ loadOptions });
      await open(user);
      await elapse(250);
      expect(region().textContent).toBe('Failed to load options.');
      await reopen(user);
      expect(visibleText('Failed to load options.')).toHaveLength(0);
      expect(screen.queryByRole('button', { name: retryName })).not.toBeInTheDocument();
      expect(region().textContent).toBe('Loading options…');
      await elapse(150);
      expect(screen.getByRole('checkbox', { name: 'Ann' })).toBeInTheDocument();
    });

    it('after rows: stale rows hidden, loading shown and announced until the fresh answer', async () => {
      const user = setupUser();
      const { fn, calls } = deferredLoad();
      renderAsync({ loadOptions: fn });
      await open(user);
      await elapse(250);
      await act(async () => calls[0]!.resolve(members));
      expect(screen.getAllByRole('checkbox')).toHaveLength(2);
      await reopen(user);
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
      expect(visibleText('Loading options…')).toHaveLength(1);
      expect(region().textContent).toBe('Loading options…');
      await elapse(150);
      // Fresh request in flight: still loading, still no stale rows.
      expect(calls).toHaveLength(2);
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
      await act(async () => calls[1]!.resolve([members[1]!]));
      expect(screen.getAllByRole('checkbox').map((c) => c.closest('label')!.textContent)).toEqual([
        'Bob',
      ]);
      expect(region().textContent).toBe('');
    });
  });

  it('a search after the first answer keeps the rows on screen while it is in flight', async () => {
    const user = setupUser();
    const { fn, calls } = deferredLoad();
    renderAsync({ loadOptions: fn });
    await open(user);
    await elapse(250);
    await act(async () => calls[0]!.resolve(members));
    await user.type(screen.getByRole('textbox'), 'b');
    await elapse(250);
    expect(calls).toHaveLength(2);
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    expect(region().textContent).toBe('');
  });

  describe('pinned selection (snapshot) and label cache', () => {
    const rowLabels = () =>
      screen.queryAllByRole('checkbox').map((c) => c.closest('label')!.textContent);
    const zed = { value: 'zed', label: 'Zed' };

    it('selected values the answer omits are pinned above server rows, labelled from selectedOptions', async () => {
      const user = setupUser();
      renderAsync(
        { loadOptions: async () => members, selectedOptions: [zed] },
        { selected: ['zed'] },
      );
      await open(user);
      await elapse(250);
      expect(rowLabels()).toEqual(['Zed', 'Ann', 'Bob']);
      expect(screen.getByRole('checkbox', { name: 'Zed' })).toBeChecked();
    });

    it('a value ticked from one answer stays labelled after a search that omits it', async () => {
      const user = setupUser();
      const loadOptions = vi.fn<Load>(async (q) => (q === 'b' ? [members[1]!] : [zed, ...members]));
      renderAsync({ loadOptions });
      await open(user);
      await elapse(250);
      await user.click(screen.getByRole('checkbox', { name: 'Zed' }));
      await user.type(screen.getByRole('textbox'), 'b');
      await elapse(250);
      expect(rowLabels()).toEqual(['Zed', 'Bob']);
      expect(screen.getByRole('checkbox', { name: 'Zed' })).toBeChecked();
    });

    it('a pinned value that is also in the answer is not repeated', async () => {
      const user = setupUser();
      renderAsync({ loadOptions: async () => members }, { selected: ['bob'] });
      await open(user);
      await elapse(250);
      expect(rowLabels()).toEqual(['Bob', 'Ann']);
    });

    it('ticking a server row does not move it until the query changes; then it is pinned', async () => {
      const user = setupUser();
      renderAsync({ loadOptions: async () => members });
      await open(user);
      await elapse(250);
      await user.click(screen.getByRole('checkbox', { name: 'Bob' }));
      expect(rowLabels()).toEqual(['Ann', 'Bob']);
      await user.type(screen.getByRole('textbox'), 'x');
      await elapse(250);
      expect(rowLabels()).toEqual(['Bob', 'Ann']);
    });

    it('unticking a pinned row leaves it pinned (unticked) until the query changes; then it drops out', async () => {
      const user = setupUser();
      const loadOptions = vi.fn<Load>(async (q) => (q === '' ? members : [members[0]!]));
      renderAsync({ loadOptions, selectedOptions: [zed] }, { selected: ['zed'] });
      await open(user);
      await elapse(250);
      await user.click(screen.getByRole('checkbox', { name: 'Zed' }));
      expect(rowLabels()).toEqual(['Zed', 'Ann', 'Bob']);
      expect(screen.getByRole('checkbox', { name: 'Zed' })).not.toBeChecked();
      await user.type(screen.getByRole('textbox'), 'a');
      await elapse(250);
      expect(rowLabels()).toEqual(['Ann']);
    });

    it('reopen resets the snapshot to the committed selection', async () => {
      const user = setupUser();
      renderAsync({ loadOptions: async () => members });
      await open(user);
      await elapse(250);
      await user.click(screen.getByRole('checkbox', { name: 'Bob' }));
      await user.type(screen.getByRole('textbox'), 'x');
      await elapse(250);
      expect(rowLabels()).toEqual(['Bob', 'Ann']);
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      await open(user);
      await elapse(250);
      expect(rowLabels()).toEqual(['Ann', 'Bob']);
      expect(screen.getByRole('checkbox', { name: 'Bob' })).not.toBeChecked();
    });

    it('unknown selected value renders its raw value as label and onApply returns {value, label: value}', async () => {
      const user = setupUser();
      const onApply = vi.fn();
      renderAsync({ loadOptions: async () => members }, { selected: ['ghost'], onApply });
      await open(user);
      await elapse(250);
      expect(rowLabels()).toEqual(['ghost', 'Ann', 'Bob']);
      await user.click(screen.getByRole('button', { name: /apply/i }));
      expect(onApply).toHaveBeenCalledWith(['ghost'], [{ value: 'ghost', label: 'ghost' }]);
    });

    it('pinned rows come first in arrow-key order', async () => {
      const user = setupUser();
      renderAsync({ loadOptions: async () => members }, { selected: ['bob'] });
      await open(user);
      await elapse(250);
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('listbox')).toHaveAttribute(
        'aria-activedescendant',
        expect.stringMatching(/-opt-bob$/),
      );
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('listbox')).toHaveAttribute(
        'aria-activedescendant',
        expect.stringMatching(/-opt-ann$/),
      );
    });

    it('single mode: the selected value is pinned', async () => {
      const user = setupUser();
      render(
        <OptionsPicker mode="single" selected="bob" onApply={() => {}}>
          <OptionsPicker.Trigger>
            <Button>Open</Button>
          </OptionsPicker.Trigger>
          <OptionsPicker.Content loadOptions={async () => members} label="Members" />
        </OptionsPicker>,
      );
      await open(user);
      await elapse(250);
      expect(screen.getAllByRole('radio').map((r) => r.closest('label')!.textContent)).toEqual([
        'Bob',
        'Ann',
      ]);
    });

    it('pinned rows stay visible during loading, error and empty', async () => {
      const user = setupUser();
      const { fn, calls } = deferredLoad();
      renderAsync({ loadOptions: fn, selectedOptions: [zed] }, { selected: ['zed'] });
      await open(user);
      // Before this open's first fetch settles.
      expect(rowLabels()).toEqual(['Zed']);
      expect(region().textContent).toBe('Loading options…');
      await elapse(250);
      expect(rowLabels()).toEqual(['Zed']);
      await act(async () => calls[0]!.reject(new Error('boom')));
      expect(rowLabels()).toEqual(['Zed']);
      expect(region().textContent).toBe('Failed to load options.');
      await user.click(screen.getByRole('button', { name: retryName }));
      await elapse(250);
      await act(async () => calls[1]!.resolve([]));
      expect(rowLabels()).toEqual(['Zed']);
      expect(region().textContent).toBe('No matches');
    });
  });

  it('options + loadOptions together: loadOptions wins and console.warn fires once (dev)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const user = setupUser();
    renderAsync({
      loadOptions: async () => members,
      ...({ options: flatOptions } as object),
    });
    await open(user);
    await elapse(250);
    expect(screen.getByRole('checkbox', { name: 'Ann' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'One' })).not.toBeInTheDocument();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toMatch(/loadOptions/);
    warn.mockRestore();
  });
});
