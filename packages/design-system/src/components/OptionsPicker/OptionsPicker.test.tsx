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
