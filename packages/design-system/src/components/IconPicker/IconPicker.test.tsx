import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IconPicker, type IconPickerOption } from './IconPicker';

const options: IconPickerOption[] = [
  { value: 'flame', label: 'Flame', icon: <svg data-testid="flame-icon" /> },
  { value: 'zap', label: 'Lightning', icon: <svg data-testid="zap-icon" /> },
  { value: 'flag', label: 'Flag', icon: <svg data-testid="flag-icon" /> },
];

it('renders the selected glyph and forwards root props and ref', () => {
  const ref = createRef<HTMLDivElement>();
  render(
    <IconPicker
      ref={ref}
      value="flame"
      options={options}
      onChange={() => {}}
      className="consumer"
      data-testid="root"
    />,
  );
  expect(ref.current).toBe(screen.getByTestId('root'));
  expect(ref.current).toHaveClass('consumer');
  expect(screen.getByTestId('flame-icon')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Pick icon: Flame' })).toBeInTheDocument();
});

it('renders a labelled single-select radio grid', async () => {
  const user = userEvent.setup();
  render(<IconPicker value="flame" options={options} onChange={() => {}} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Flame' }));
  expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Flame' })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('radio', { name: 'Lightning' })).toHaveAttribute('aria-checked', 'false');
});

it('commits a click and closes', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<IconPicker value="flame" options={options} onChange={onChange} />);
  await user.click(screen.getByRole('button', { name: 'Pick icon: Flame' }));
  await user.click(screen.getByRole('radio', { name: 'Lightning' }));
  expect(onChange).toHaveBeenCalledWith('zap');
  expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
});
