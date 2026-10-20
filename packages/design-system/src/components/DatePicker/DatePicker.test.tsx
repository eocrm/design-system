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
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
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

    it('picking a day keeps the popover open and moves focus to the time input (#666)', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn<(d: Date | null) => void>();
      render(<DatePicker granularity="minute" onChange={onChange} aria-label="Date" />, {
        wrapper: wrap(),
      });
      await user.click(screen.getByRole('button', { name: 'Open calendar' }));
      const [cell15] = screen.getAllByRole('gridcell', { name: /^15$/ });
      await user.click(cell15);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]!.getDate()).toBe(15);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      const timeInput = screen.getByRole('textbox', { name: 'Time' });
      await waitFor(() => expect(document.activeElement).toBe(timeInput));
      // The deferred blur-close must not fire when focus moves into the popover.
      await new Promise((r) => setTimeout(r, 0));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('Enter in the time input commits, closes the popover and refocuses the input (#666)', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn<(d: Date | null) => void>();
      render(
        <DatePicker granularity="minute" hourCycle="24" onChange={onChange} aria-label="Date" />,
        { wrapper: wrap() },
      );
      const input = screen.getByRole('textbox', { name: 'Date' });
      await user.click(screen.getByRole('button', { name: 'Open calendar' }));
      const [cell15] = screen.getAllByRole('gridcell', { name: /^15$/ });
      await user.click(cell15);
      const timeInput = screen.getByRole('textbox', { name: 'Time' });
      await waitFor(() => expect(document.activeElement).toBe(timeInput));
      await user.clear(timeInput);
      await user.type(timeInput, '14:30{Enter}');
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(document.activeElement).toBe(input);
      // Let TimeField's deferred blur-commit run: it must not re-fire onChange.
      await new Promise((r) => setTimeout(r, 0));
      expect(onChange).toHaveBeenCalledTimes(2); // day pick + time commit
      const got = onChange.mock.calls.at(-1)![0]!;
      expect(got.getDate()).toBe(15);
      expect(got.getHours()).toBe(14);
      expect(got.getMinutes()).toBe(30);
    });

    async function pickDayAndTypeTime(onChange: (d: Date | null) => void) {
      const user = userEvent.setup();
      render(
        <>
          <DatePicker granularity="minute" hourCycle="24" onChange={onChange} aria-label="Date" />
          <button type="button">Outside</button>
        </>,
        { wrapper: wrap() },
      );
      await user.click(screen.getByRole('button', { name: 'Open calendar' }));
      const [cell15] = screen.getAllByRole('gridcell', { name: /^15$/ });
      await user.click(cell15);
      const timeInput = screen.getByRole('textbox', { name: 'Time' });
      await waitFor(() => expect(document.activeElement).toBe(timeInput));
      await user.clear(timeInput);
      await user.type(timeInput, '14:30');
      return user;
    }

    function expectDay15At1430(onChange: ReturnType<typeof vi.fn<(d: Date | null) => void>>) {
      expect(onChange).toHaveBeenCalledTimes(2); // day pick + time commit, nothing stale after
      const got = onChange.mock.calls.at(-1)![0]!;
      expect(got.getDate()).toBe(15);
      expect(got.getHours()).toBe(14);
      expect(got.getMinutes()).toBe(30);
      expect(screen.getByRole('textbox', { name: 'Date' })).toHaveDisplayValue(/14:30/);
    }

    it('outside click keeps a time typed into the time input (#666)', async () => {
      const onChange = vi.fn<(d: Date | null) => void>();
      const user = await pickDayAndTypeTime(onChange);
      await user.click(screen.getByRole('button', { name: 'Outside' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await new Promise((r) => setTimeout(r, 0));
      expectDay15At1430(onChange);
    });

    it('tabbing out of the popover closes it and keeps the typed time (#666)', async () => {
      const onChange = vi.fn<(d: Date | null) => void>();
      const user = await pickDayAndTypeTime(onChange);
      await user.tab(); // clock chevron
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      await user.tab(); // past the popover (portaled last in body)
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await new Promise((r) => setTimeout(r, 0));
      expectDay15At1430(onChange);
      // Tab-away returns focus to the trigger so the next Tab continues in page order.
      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Date' }));
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

describe('DatePicker — overlay elevation (#272)', () => {
  it('elevates the calendar popover (data-in-overlay) when opened inside an overlay', async () => {
    const user = userEvent.setup();
    render(
      <div data-modal-portal-root="">
        <DatePicker aria-label="Due" value={null} onChange={() => {}} />
      </div>,
    );
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    expect(screen.getByRole('dialog')).toHaveAttribute('data-in-overlay', '');
  });

  it('does not elevate the calendar popover at page level', async () => {
    const user = userEvent.setup();
    render(<DatePicker aria-label="Due" value={null} onChange={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    expect(screen.getByRole('dialog')).not.toHaveAttribute('data-in-overlay');
  });

  it('elevates the embedded time popover transitively (calendar in overlay -> clock too)', async () => {
    const user = userEvent.setup();
    render(
      <div data-modal-portal-root="">
        <DatePicker
          aria-label="Due"
          granularity="minute"
          value={new Date(2026, 5, 15, 14, 30)}
          onChange={() => {}}
        />
      </div>,
    );
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    expect(screen.getByRole('dialog')).toHaveAttribute('data-in-overlay', '');
    // Open the embedded TimeField clock from inside the calendar dialog.
    await user.click(screen.getByRole('button', { name: /Open time list/i }));
    const clock = document.querySelector('[data-timefield-popover="true"]');
    expect(clock).not.toBeNull();
    expect(clock).toHaveAttribute('data-in-overlay', '');
  });
});

describe('DatePicker — Escape from anywhere while open (#274)', () => {
  it('Escape closes the calendar when focus is inside the grid (not the input)', async () => {
    const user = userEvent.setup();
    render(<DatePicker aria-label="Due" value={new Date(2026, 5, 15)} onChange={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Move real focus into the month grid, then Escape from there.
    const cell = screen.getAllByRole('gridcell', { name: /15/ })[0].querySelector('button');
    (cell ?? screen.getByRole('dialog')).focus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('DatePicker — Escape cascade with the embedded clock (#274)', () => {
  it('three presses: clock -> calendar -> (host would be next); calendar defers to the open clock', async () => {
    const user = userEvent.setup();
    render(
      <DatePicker
        aria-label="Due"
        granularity="minute"
        value={new Date(2026, 5, 15, 14, 30)}
        onChange={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    await user.click(screen.getByRole('button', { name: /Open time list/i }));
    expect(document.querySelector('[data-timefield-popover="true"]')).not.toBeNull();
    // Press 1: closes ONLY the clock — the calendar's document listener
    // defers to [data-timefield-popover].
    await user.keyboard('{Escape}');
    expect(document.querySelector('[data-timefield-popover="true"]')).toBeNull();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Press 2: closes the calendar.
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('DatePicker — outside click / Tab-away close paths (#666)', () => {
  function renderWithOutside(ui: ReactNode) {
    render(
      <>
        {ui}
        <button type="button">Outside</button>
      </>,
      { wrapper: wrap() },
    );
  }

  it('outside click closes the calendar while focus is on a clock row', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithOutside(
      <DatePicker
        aria-label="Due"
        granularity="minute"
        hourCycle="24"
        defaultValue={new Date(2026, 5, 15, 14, 30)}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    await user.click(screen.getByRole('button', { name: /Open time list/i }));
    await waitFor(() =>
      expect(document.activeElement?.closest('[data-timefield-popover="true"]')).not.toBeNull(),
    );
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.querySelector('[data-timefield-popover="true"]')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('outside click closes the calendar while focus is on the trigger Open-calendar button', async () => {
    const user = userEvent.setup();
    renderWithOutside(<DatePicker aria-label="Due" />);
    const openButton = screen.getByRole('button', { name: 'Open calendar' });
    await user.click(openButton);
    openButton.focus();
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closing a clock row from inside the calendar keeps the calendar open', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithOutside(
      <DatePicker
        aria-label="Due"
        granularity="minute"
        hourCycle="24"
        defaultValue={new Date(2026, 5, 15, 14, 30)}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    await user.click(screen.getByRole('button', { name: /Open time list/i }));
    await waitFor(() =>
      expect(document.activeElement?.closest('[data-timefield-popover="true"]')).not.toBeNull(),
    );
    const row = document.activeElement as HTMLElement;
    // Clicking the grid closes the clock and unmounts the focused row. Chrome
    // fires focus-out for the removal (jsdom doesn't) — dispatch it while the
    // row is still connected, then unmount it on the same tick.
    fireEvent.focusOut(row);
    fireEvent.pointerDown(screen.getByRole('dialog'));
    expect(row.isConnected).toBe(false);
    await new Promise((r) => setTimeout(r, 0));
    expect(document.querySelector('[data-timefield-popover="true"]')).toBeNull();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each([
    ['outside click', 'click'],
    ['Tab out of the grid', 'tab'],
  ] as const)('%s commits a date typed into the trigger before ArrowDown', async (_, how) => {
    const user = userEvent.setup();
    const onChange = vi.fn<(d: Date | null) => void>();
    renderWithOutside(
      <DatePicker aria-label="Due" defaultValue={new Date(2026, 4, 1)} onChange={onChange} />,
    );
    const input = screen.getByRole('textbox', { name: 'Due' });
    await user.click(input);
    await user.clear(input);
    await user.type(input, '05/20/2026{ArrowDown}');
    await waitFor(() => expect(document.activeElement?.getAttribute('role')).toBe('gridcell'));
    if (how === 'click') await user.click(screen.getByRole('button', { name: 'Outside' }));
    else await user.tab();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await new Promise((r) => setTimeout(r, 0));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]!.getDate()).toBe(20);
    expect(input).toHaveValue('05/20/2026');
  });

  it.each([
    ['outside click', 'click'],
    ['Tab away', 'tab'],
  ] as const)(
    '%s after typing a date in the trigger then a time keeps both (minute mode)',
    async (_, how) => {
      const user = userEvent.setup();
      const onChange = vi.fn<(d: Date | null) => void>();
      renderWithOutside(
        <DatePicker
          aria-label="Due"
          granularity="minute"
          hourCycle="24"
          defaultValue={new Date(2026, 4, 1, 9, 0)}
          onChange={onChange}
        />,
      );
      const input = screen.getByRole('textbox', { name: 'Due' });
      await user.click(input);
      await user.clear(input);
      await user.type(input, '05/20/2026 10:00{ArrowDown}');
      await waitFor(() => expect(document.activeElement?.getAttribute('role')).toBe('gridcell'));
      const timeInput = screen.getByRole('textbox', { name: 'Time' });
      timeInput.focus();
      await user.clear(timeInput);
      await user.type(timeInput, '16:45');
      if (how === 'click') {
        await user.click(screen.getByRole('button', { name: 'Outside' }));
      } else {
        await user.tab(); // clock chevron
        await user.tab(); // out of the popover
      }
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await new Promise((r) => setTimeout(r, 0));
      const calls = onChange.mock.calls.map(([d]) => [
        d!.getDate(),
        d!.getHours(),
        d!.getMinutes(),
      ]);
      expect(calls).toEqual([
        [20, 10, 0],
        [20, 16, 45],
      ]);
      expect(input).toHaveDisplayValue('05/20/2026 16:45');
    },
  );

  it('outside click with an untouched focused trigger fires no onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithOutside(
      <DatePicker aria-label="Due" defaultValue={new Date(2026, 4, 1)} onChange={onChange} />,
    );
    await user.click(screen.getByRole('textbox', { name: 'Due' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await new Promise((r) => setTimeout(r, 0));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('TimeField: no onChange from its deferred commit after the DatePicker unmounts', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { unmount } = render(
      <DatePicker
        aria-label="Due"
        granularity="minute"
        hourCycle="24"
        defaultValue={new Date(2026, 4, 1, 9, 0)}
        onChange={onChange}
      />,
      { wrapper: wrap() },
    );
    const input = screen.getByRole('textbox', { name: 'Due' });
    await user.click(input);
    await user.clear(input);
    await user.type(input, '05/20/2026 10:00{ArrowDown}');
    onChange.mockClear();
    const timeInput = screen.getByRole('textbox', { name: 'Time' });
    timeInput.focus();
    await user.clear(timeInput);
    await user.type(timeInput, '16:45');
    fireEvent.pointerDown(document.body);
    unmount();
    await new Promise((r) => setTimeout(r, 0));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a same-day grid pick discards half-typed trigger text', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(d: Date | null) => void>();
    renderWithOutside(
      <DatePicker
        aria-label="Due"
        granularity="minute"
        hourCycle="24"
        defaultValue={new Date(2026, 4, 1, 9, 0)}
        onChange={onChange}
      />,
    );
    const input = screen.getByRole('textbox', { name: 'Due' });
    await user.click(input);
    await user.clear(input);
    await user.type(input, '05/20/2026 10:00');
    await user.click(screen.getAllByRole('gridcell', { name: /^1$/ })[0]);
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await new Promise((r) => setTimeout(r, 0));
    for (const [d] of onChange.mock.calls) {
      expect([d!.getDate(), d!.getHours()]).toEqual([1, 9]);
    }
    expect(input).toHaveDisplayValue('05/01/2026 09:00');
  });

  it('the calendar toggle keeps half-typed trigger text', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithOutside(
      <DatePicker aria-label="Due" defaultValue={new Date(2026, 4, 1)} onChange={onChange} />,
    );
    const input = screen.getByRole('textbox', { name: 'Due' });
    await user.click(input);
    await user.click(screen.getByRole('button', { name: 'Open calendar' })); // closes
    await user.clear(input);
    await user.type(input, '05/2');
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    expect(input).toHaveFocus();
    expect(input).toHaveValue('05/2');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Clear discards typed trigger text — exactly one onChange(null)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithOutside(
      <DatePicker aria-label="Due" defaultValue={new Date(2026, 4, 1)} onChange={onChange} />,
    );
    const input = screen.getByRole('textbox', { name: 'Due' });
    await user.click(input);
    await user.clear(input);
    await user.type(input, '05/20/2026');
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(onChange.mock.calls).toEqual([[null]]);
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });

  it('Shift+Tab from the first popover stop closes it and refocuses the trigger', async () => {
    const user = userEvent.setup();
    renderWithOutside(<DatePicker aria-label="Due" defaultValue={new Date(2026, 4, 1)} />);
    const input = screen.getByRole('textbox', { name: 'Due' });
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    const dialog = screen.getByRole('dialog');
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));
    // Shift+Tab back through the popover's stops: grid → Next → Previous.
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Next month' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Previous month' })).toHaveFocus();
    await user.tab({ shift: true });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(input).toHaveFocus();
  });

  async function typeTimeAfterArrowDown(onChange: (d: Date | null) => void) {
    const user = userEvent.setup();
    renderWithOutside(
      <DatePicker
        aria-label="Due"
        granularity="minute"
        hourCycle="24"
        defaultValue={new Date(2026, 4, 1, 9, 0)}
        onChange={onChange}
      />,
    );
    const input = screen.getByRole('textbox', { name: 'Due' });
    await user.click(input);
    await user.keyboard('{ArrowDown}');
    const timeInput = screen.getByRole('textbox', { name: 'Time' });
    timeInput.focus();
    await user.clear(timeInput);
    await user.type(timeInput, '11:00');
    return { user, input };
  }

  it('Clear after typing a time wins — final value null, trigger empty', async () => {
    const onChange = vi.fn<(d: Date | null) => void>();
    const { user, input } = await typeTimeAfterArrowDown(onChange);
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await new Promise((r) => setTimeout(r, 0));
    const calls = onChange.mock.calls.map(([d]) => d);
    expect(calls.at(-1)).toBeNull();
    expect(calls.filter((d) => d === null)).toHaveLength(1);
    expect(input).toHaveValue('');
  });

  it('📅 toggle-close from the time input keeps the typed time; focus returns to the trigger', async () => {
    const onChange = vi.fn<(d: Date | null) => void>();
    const { user, input } = await typeTimeAfterArrowDown(onChange);
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await new Promise((r) => setTimeout(r, 0));
    const last = onChange.mock.calls.at(-1)![0]!;
    expect([last.getDate(), last.getHours(), last.getMinutes()]).toEqual([1, 11, 0]);
    expect(input).toHaveDisplayValue('05/01/2026 11:00');
    expect(input).toHaveFocus();
  });

  it('📅 toggle-close from the grid closes; focus returns to the trigger', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithOutside(
      <DatePicker aria-label="Due" defaultValue={new Date(2026, 4, 1)} onChange={onChange} />,
    );
    await user.click(screen.getByRole('textbox', { name: 'Due' }));
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect(document.activeElement?.getAttribute('role')).toBe('gridcell'));
    await user.click(screen.getByRole('button', { name: 'Open calendar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole('textbox', { name: 'Due' })).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  // Real mousedown → click gap: the click lands a macrotask later.
  async function mouseDownGapClick(button: HTMLElement) {
    expect(fireEvent.mouseDown(button)).toBe(false); // defaultPrevented
    await new Promise((r) => setTimeout(r, 30));
    fireEvent.mouseUp(button);
    fireEvent.click(button);
  }

  it('📅 toggle-close with a mousedown→click gap keeps a typed time', async () => {
    const onChange = vi.fn<(d: Date | null) => void>();
    const { input } = await typeTimeAfterArrowDown(onChange);
    await mouseDownGapClick(screen.getByRole('button', { name: 'Open calendar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await new Promise((r) => setTimeout(r, 0));
    const last = onChange.mock.calls.at(-1)![0]!;
    expect([last.getDate(), last.getHours(), last.getMinutes()]).toEqual([1, 11, 0]);
    expect(input).toHaveFocus();
  });

  it('✕ with a mousedown→click gap from the time input — Clear wins', async () => {
    const onChange = vi.fn<(d: Date | null) => void>();
    const { input } = await typeTimeAfterArrowDown(onChange);
    await mouseDownGapClick(screen.getByRole('button', { name: 'Clear' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(onChange.mock.calls).toEqual([[null]]);
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });

  it('controlled (sync parent): ✕ from the time input — Clear wins', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(d: Date | null) => void>();
    function Controlled() {
      const [v, setV] = useState<Date | null>(new Date(2026, 4, 1, 9, 0));
      return (
        <DatePicker
          aria-label="Due"
          granularity="minute"
          hourCycle="24"
          value={v}
          onChange={(d) => {
            onChange(d);
            setV(d);
          }}
        />
      );
    }
    render(<Controlled />, { wrapper: wrap() });
    const input = screen.getByRole('textbox', { name: 'Due' });
    await user.click(input);
    const timeInput = screen.getByRole('textbox', { name: 'Time' });
    timeInput.focus();
    await user.clear(timeInput);
    await user.type(timeInput, '11:00');
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(onChange.mock.calls).toEqual([[null]]);
    expect(input).toHaveValue('');
  });

  it('controlled: a rejected change does not desync the time commit', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(d: Date | null) => void>();
    function Required() {
      const [v, setV] = useState<Date | null>(new Date(2026, 4, 1, 9, 0));
      return (
        <DatePicker
          aria-label="Due"
          granularity="minute"
          hourCycle="24"
          value={v}
          onChange={(d) => {
            onChange(d);
            if (d) setV(d); // required: rejects null
          }}
        />
      );
    }
    render(<Required />, { wrapper: wrap() });
    const input = screen.getByRole('textbox', { name: 'Due' });
    await user.click(screen.getByRole('button', { name: 'Clear' })); // rejected
    await user.click(input);
    const timeInput = screen.getByRole('textbox', { name: 'Time' });
    timeInput.focus();
    await user.clear(timeInput);
    await user.type(timeInput, '11:00{Enter}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const calls = onChange.mock.calls.map(
      ([d]) => d && [d.getDate(), d.getHours(), d.getMinutes()],
    );
    expect(calls).toEqual([null, [1, 11, 0]]);
    expect(input).toHaveDisplayValue('05/01/2026 11:00');
  });
});
