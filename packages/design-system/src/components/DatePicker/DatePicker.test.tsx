import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
    await user.click(screen.getByRole('button', { name: 'Clear' }));
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

  describe('granularity', () => {
    it('granularity defaults to "day" — no time input, no HH:mm in trigger', () => {
      render(<DatePicker defaultValue={new Date(2026, 4, 28, 14, 30)} aria-label="Date" />, {
        wrapper: wrap(),
      });
      expect(screen.queryByLabelText('Time')).not.toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveValue('05/28/2026');
    });

    it('granularity="minute" renders the time input inside the popover', async () => {
      const user = userEvent.setup();
      render(
        <DatePicker
          defaultValue={new Date(2026, 4, 28, 14, 30)}
          granularity="minute"
          hourCycle="24"
          aria-label="Date"
        />,
        { wrapper: wrap() },
      );
      await user.click(screen.getByRole('button', { name: 'Open calendar' }));
      const timeInput = await screen.findByRole('textbox', { name: 'Time' });
      expect(timeInput).toHaveValue('14:30');
      expect(timeInput).toHaveAttribute('type', 'text');
    });

    it('granularity="minute" includes HH:mm in trigger text (hourCycle="24")', () => {
      render(
        <DatePicker
          defaultValue={new Date(2026, 4, 28, 14, 30)}
          granularity="minute"
          hourCycle="24"
          aria-label="Date"
        />,
        { wrapper: wrap() },
      );
      expect(screen.getByRole('textbox')).toHaveValue('05/28/2026 14:30');
    });

    it('granularity="minute" defaults to AM/PM in trigger for en-US (hourCycle="auto")', () => {
      render(
        <DatePicker
          defaultValue={new Date(2026, 4, 28, 14, 30)}
          granularity="minute"
          aria-label="Date"
        />,
        { wrapper: wrap() },
      );
      expect(screen.getByRole('textbox')).toHaveValue('05/28/2026 2:30 PM');
    });

    it('granularity="minute" hourCycle="12" forces AM/PM in trigger regardless of locale', () => {
      render(
        <DatePicker
          defaultValue={new Date(2026, 4, 28, 14, 30)}
          granularity="minute"
          hourCycle="12"
          locale="ru-RU"
          aria-label="Date"
        />,
        { wrapper: wrap('ru-RU') },
      );
      expect(screen.getByRole('textbox')).toHaveValue('28.05.2026 2:30 PM');
    });

    it('granularity="minute" hourCycle="auto" + ru-RU shows 24h in trigger', () => {
      render(
        <DatePicker
          defaultValue={new Date(2026, 4, 28, 14, 30)}
          granularity="minute"
          locale="ru-RU"
          aria-label="Date"
        />,
        { wrapper: wrap('ru-RU') },
      );
      expect(screen.getByRole('textbox')).toHaveValue('28.05.2026 14:30');
    });

    it('picking a date from null defaults time to 00:00', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn<(d: Date | null) => void>();
      render(<DatePicker granularity="minute" onChange={onChange} aria-label="Date" />, {
        wrapper: wrap(),
      });
      await user.click(screen.getByRole('button', { name: 'Open calendar' }));
      // The grid renders an in-month "15" and possibly an outside overflow
      // "15" from the adjacent month. Click the first match — the in-month one.
      const [cell15] = screen.getAllByRole('gridcell', { name: /^15$/ });
      await user.click(cell15);
      expect(onChange).toHaveBeenCalledTimes(1);
      const got = onChange.mock.calls[0][0] as Date;
      expect(got.getHours()).toBe(0);
      expect(got.getMinutes()).toBe(0);
    });

    it('picking a different date preserves existing time-of-day', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn<(d: Date | null) => void>();
      render(
        <DatePicker
          granularity="minute"
          defaultValue={new Date(2026, 4, 28, 14, 30)}
          onChange={onChange}
          aria-label="Date"
        />,
        { wrapper: wrap() },
      );
      await user.click(screen.getByRole('button', { name: 'Open calendar' }));
      const [cell15] = screen.getAllByRole('gridcell', { name: /^15$/ });
      await user.click(cell15);
      const got = onChange.mock.calls[0][0] as Date;
      expect(got.getDate()).toBe(15);
      expect(got.getHours()).toBe(14);
      expect(got.getMinutes()).toBe(30);
    });

    it('typing into the time input + blur updates time only', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn<(d: Date | null) => void>();
      render(
        <DatePicker
          granularity="minute"
          defaultValue={new Date(2026, 4, 28, 14, 30)}
          onChange={onChange}
          aria-label="Date"
        />,
        { wrapper: wrap() },
      );
      await user.click(screen.getByRole('button', { name: 'Open calendar' }));
      const timeInput = await screen.findByRole('textbox', { name: 'Time' });
      // TimeField is now a free-text input. Commit happens on blur/Enter.
      fireEvent.change(timeInput, { target: { value: '09:15' } });
      fireEvent.blur(timeInput);
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const got = onChange.mock.calls.at(-1)?.[0] as Date;
      expect(got.getFullYear()).toBe(2026);
      expect(got.getMonth()).toBe(4);
      expect(got.getDate()).toBe(28);
      expect(got.getHours()).toBe(9);
      expect(got.getMinutes()).toBe(15);
    });

    it('time input is disabled when value is null', async () => {
      const user = userEvent.setup();
      render(<DatePicker granularity="minute" aria-label="Date" />, { wrapper: wrap() });
      await user.click(screen.getByRole('button', { name: 'Open calendar' }));
      expect(await screen.findByRole('textbox', { name: 'Time' })).toBeDisabled();
    });

    it('timeStep={30} rounds typed "14:22" to 14:30 on blur', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn<(d: Date | null) => void>();
      render(
        <DatePicker
          granularity="minute"
          timeStep={30}
          defaultValue={new Date(2026, 4, 28, 10, 0)}
          onChange={onChange}
          aria-label="Date"
        />,
        { wrapper: wrap() },
      );
      await user.click(screen.getByRole('button', { name: 'Open calendar' }));
      const timeInput = await screen.findByRole('textbox', { name: 'Time' });
      fireEvent.change(timeInput, { target: { value: '14:22' } });
      fireEvent.blur(timeInput);
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const got = onChange.mock.calls.at(-1)?.[0] as Date;
      expect(got.getHours()).toBe(14);
      expect(got.getMinutes()).toBe(30);
    });

    it('picking an hour row in the TimeField popover commits the new hour (24h)', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn<(d: Date | null) => void>();
      render(
        <DatePicker
          granularity="minute"
          hourCycle="24"
          defaultValue={new Date(2026, 4, 28, 14, 30)}
          onChange={onChange}
          aria-label="Date"
        />,
        { wrapper: wrap() },
      );
      await user.click(screen.getByRole('button', { name: 'Open calendar' }));
      await user.click(await screen.findByRole('button', { name: /Time, Open time list/i }));
      const hoursListbox = await screen.findByRole('listbox', { name: 'Hours' });
      await user.click(within(hoursListbox).getByRole('option', { name: '09' }));
      const got = onChange.mock.calls.at(-1)?.[0] as Date;
      expect(got.getHours()).toBe(9);
      expect(got.getMinutes()).toBe(30);
    });

    it('hidden form mirror emits ISO datetime when granularity="minute"', () => {
      const { container } = render(
        <DatePicker
          granularity="minute"
          name="when"
          defaultValue={new Date(2026, 4, 28, 14, 30)}
          aria-label="Date"
        />,
        { wrapper: wrap() },
      );
      const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"][name="when"]');
      expect(hidden?.value).toBe('2026-05-28T14:30');
    });

    it('hidden form mirror still emits ISO date when granularity="day"', () => {
      const { container } = render(
        <DatePicker name="when" defaultValue={new Date(2026, 4, 28, 14, 30)} aria-label="Date" />,
        { wrapper: wrap() },
      );
      const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"][name="when"]');
      expect(hidden?.value).toBe('2026-05-28');
    });

    it('typed input parses date+time on blur', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn<(d: Date | null) => void>();
      render(<DatePicker granularity="minute" onChange={onChange} aria-label="Date" />, {
        wrapper: wrap(),
      });
      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.type(input, '05/28/2026 14:30');
      input.blur();
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const got = onChange.mock.calls.at(-1)?.[0] as Date;
      expect(got.getFullYear()).toBe(2026);
      expect(got.getMonth()).toBe(4);
      expect(got.getDate()).toBe(28);
      expect(got.getHours()).toBe(14);
      expect(got.getMinutes()).toBe(30);
    });

    it('typed AM/PM input parses date+time on blur (hourCycle="12")', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn<(d: Date | null) => void>();
      render(
        <DatePicker granularity="minute" hourCycle="12" onChange={onChange} aria-label="Date" />,
        { wrapper: wrap() },
      );
      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.type(input, '05/28/2026 2:30 PM');
      input.blur();
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const got = onChange.mock.calls.at(-1)?.[0] as Date;
      expect(got.getHours()).toBe(14);
      expect(got.getMinutes()).toBe(30);
    });

    it('hourCycle="12" embedded TimeField shows AM/PM column in popover', async () => {
      const user = userEvent.setup();
      render(
        <DatePicker
          granularity="minute"
          hourCycle="12"
          defaultValue={new Date(2026, 4, 28, 14, 30)}
          aria-label="Date"
        />,
        { wrapper: wrap() },
      );
      await user.click(screen.getByRole('button', { name: 'Open calendar' }));
      const timeInput = await screen.findByRole('textbox', { name: 'Time' });
      expect(timeInput).toHaveValue('2:30 PM');
      await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
      expect(await screen.findByRole('listbox', { name: 'Period' })).toBeInTheDocument();
    });
  });
});
