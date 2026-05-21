import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type ReactNode, useState } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { DatePicker } from './DatePicker';

function wrap(locale = 'en-US') {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

describe('DatePicker', () => {
  it('renders the formatted defaultValue in the input (uncontrolled)', () => {
    render(<DatePicker defaultValue={new Date(2026, 4, 21)} aria-label="Date" />, {
      wrapper: wrap(),
    });
    expect(screen.getByRole('textbox', { name: 'Date' })).toHaveValue('05/21/2026');
  });

  it('controlled value updates input', () => {
    const { rerender } = render(<DatePicker value={new Date(2026, 4, 21)} aria-label="Date" />, {
      wrapper: wrap(),
    });
    expect(screen.getByRole('textbox')).toHaveValue('05/21/2026');
    rerender(<DatePicker value={new Date(2026, 5, 1)} aria-label="Date" />);
    expect(screen.getByRole('textbox')).toHaveValue('06/01/2026');
  });

  it('typing a valid date and blurring commits via onChange', async () => {
    const onChange = vi.fn<(d: Date | null) => void>();
    const user = userEvent.setup();
    render(<DatePicker onChange={onChange} aria-label="Date" />, { wrapper: wrap() });
    const input = screen.getByRole('textbox');
    await user.type(input, '5/21/2026');
    input.blur();
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const committed = onChange.mock.calls.at(-1)![0]!;
    expect(committed.getMonth()).toBe(4);
    expect(committed.getDate()).toBe(21);
  });

  it('typing an invalid date and blurring reverts to the previous value', async () => {
    const user = userEvent.setup();
    function Driver() {
      const [v, setV] = useState<Date | null>(new Date(2026, 4, 21));
      return <DatePicker value={v} onChange={setV} aria-label="Date" />;
    }
    render(<Driver />, { wrapper: wrap() });
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'not a date');
    input.blur();
    await waitFor(() => expect(input).toHaveValue('05/21/2026'));
  });

  it('Enter in the input commits and closes the popover', async () => {
    const onChange = vi.fn<(d: Date | null) => void>();
    const user = userEvent.setup();
    render(<DatePicker onChange={onChange} aria-label="Date" />, { wrapper: wrap() });
    const input = screen.getByRole('textbox');
    await user.click(input); // opens popover
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.type(input, '5/21/2026{Enter}');
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('ArrowDown in the input opens the popover and focuses today', async () => {
    const user = userEvent.setup();
    render(<DatePicker aria-label="Date" />, { wrapper: wrap() });
    await user.click(screen.getByRole('textbox'));
    // ArrowDown moves focus into the grid
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      const active = document.activeElement;
      expect(active?.getAttribute('role')).toBe('gridcell');
    });
  });

  it('Escape closes the popover and restores focus to the input', async () => {
    const user = userEvent.setup();
    render(<DatePicker aria-label="Date" />, { wrapper: wrap() });
    const input = screen.getByRole('textbox');
    await user.click(input);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.activeElement).toBe(input);
  });

  it('clicking a grid cell commits the value and closes the popover', async () => {
    const onChange = vi.fn<(d: Date | null) => void>();
    const user = userEvent.setup();
    render(
      <DatePicker defaultValue={new Date(2026, 4, 1)} onChange={onChange} aria-label="Date" />,
      { wrapper: wrap() },
    );
    await user.click(screen.getByRole('textbox'));
    await user.click(screen.getByRole('gridcell', { name: /^15$/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]!.getDate()).toBe(15);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('clear button resets the value and keeps focus on the input', async () => {
    const onChange = vi.fn<(d: Date | null) => void>();
    const user = userEvent.setup();
    render(
      <DatePicker defaultValue={new Date(2026, 4, 21)} onChange={onChange} aria-label="Date" />,
      { wrapper: wrap() },
    );
    await user.click(screen.getByRole('button', { name: 'Clear date' }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });

  it('renders a hidden form mirror when `name` is set', () => {
    const { container } = render(
      <DatePicker name="dob" defaultValue={new Date(2026, 4, 21)} aria-label="Date" />,
      { wrapper: wrap() },
    );
    const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"][name="dob"]');
    expect(hidden).not.toBeNull();
    expect(hidden!.value).toBe('2026-05-21');
  });

  it('`disabled` disables the input and the open-calendar button', () => {
    render(<DatePicker disabled defaultValue={new Date(2026, 4, 21)} aria-label="Date" />, {
      wrapper: wrap(),
    });
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Open calendar' })).toBeDisabled();
  });

  it('`invalid` sets aria-invalid="true" on the input', () => {
    render(<DatePicker invalid aria-label="Date" />, { wrapper: wrap() });
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('forwards ref to the typed input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<DatePicker ref={ref} aria-label="Date" />, { wrapper: wrap() });
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('typed input that is before `min` reverts on blur', async () => {
    const user = userEvent.setup();
    function Driver() {
      const [v, setV] = useState<Date | null>(new Date(2026, 4, 21));
      return <DatePicker value={v} onChange={setV} min={new Date(2026, 4, 15)} aria-label="Date" />;
    }
    render(<Driver />, { wrapper: wrap() });
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '5/10/2026');
    input.blur();
    await waitFor(() => expect(input).toHaveValue('05/21/2026'));
  });

  it('ru-RU locale formats the input as DD.MM.YYYY', () => {
    render(<DatePicker defaultValue={new Date(2026, 4, 21)} locale="ru-RU" aria-label="Date" />, {
      wrapper: wrap('ru-RU'),
    });
    expect(screen.getByRole('textbox')).toHaveValue('21.05.2026');
  });

  it('typed input that is after `max` reverts on blur', async () => {
    const user = userEvent.setup();
    function Driver() {
      const [v, setV] = useState<Date | null>(new Date(2026, 4, 21));
      return <DatePicker value={v} onChange={setV} max={new Date(2026, 4, 25)} aria-label="Date" />;
    }
    render(<Driver />, { wrapper: wrap() });
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '5/30/2026');
    input.blur();
    await waitFor(() => expect(input).toHaveValue('05/21/2026'));
  });

  it('typed input that fails `isDateDisabled` reverts on blur', async () => {
    const user = userEvent.setup();
    function Driver() {
      const [v, setV] = useState<Date | null>(new Date(2026, 4, 21));
      return (
        <DatePicker
          value={v}
          onChange={setV}
          isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
          aria-label="Date"
        />
      );
    }
    render(<Driver />, { wrapper: wrap() });
    const input = screen.getByRole('textbox');
    await user.clear(input);
    // 2026-05-23 is a Saturday.
    await user.type(input, '5/23/2026');
    input.blur();
    await waitFor(() => expect(input).toHaveValue('05/21/2026'));
  });

  it('click outside closes the popover and commits the typed draft', async () => {
    const onChange = vi.fn<(d: Date | null) => void>();
    const user = userEvent.setup();
    render(<DatePicker onChange={onChange} aria-label="Date" />, { wrapper: wrap() });
    const input = screen.getByRole('textbox');
    await user.click(input);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.type(input, '5/21/2026');
    // Click on the document body outside the wrapper.
    await user.click(document.body);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const committed = onChange.mock.calls.at(-1)![0]!;
    expect(committed.getMonth()).toBe(4);
    expect(committed.getDate()).toBe(21);
  });

  it('applies size class names for sm / md / lg', () => {
    const { rerender, container } = render(<DatePicker size="sm" aria-label="Sized" />, {
      wrapper: wrap(),
    });
    expect(container.querySelector('[class*="size-sm"]')).not.toBeNull();
    rerender(<DatePicker size="md" aria-label="Sized" />);
    expect(container.querySelector('[class*="size-md"]')).not.toBeNull();
    rerender(<DatePicker size="lg" aria-label="Sized" />);
    expect(container.querySelector('[class*="size-lg"]')).not.toBeNull();
  });

  it('defaults to size="md" when no size prop is passed', () => {
    const { container } = render(<DatePicker aria-label="Default" />, { wrapper: wrap() });
    expect(container.querySelector('[class*="size-md"]')).not.toBeNull();
  });
});
