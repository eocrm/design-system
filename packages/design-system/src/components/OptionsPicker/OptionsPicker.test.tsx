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
