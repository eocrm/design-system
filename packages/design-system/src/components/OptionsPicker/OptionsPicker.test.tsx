import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OptionsPicker } from './OptionsPicker';
import { Button } from '../Button';

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

it('shows selection count "N sel" with aria-live=polite', async () => {
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
  const count = screen.getByText('1 sel');
  expect(count).toHaveAttribute('aria-live', 'polite');
  // Toggle B on → count becomes 2 sel
  await user.click(screen.getByRole('checkbox', { name: 'B' }));
  expect(screen.getByText('2 sel')).toBeInTheDocument();
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
  expect(onApply).toHaveBeenCalledWith(['one']);
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
      <OptionsPicker.Content
        label="Filter"
        groups={groupedOptions}
        emptyState="No matches"
      />
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
