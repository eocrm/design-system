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
