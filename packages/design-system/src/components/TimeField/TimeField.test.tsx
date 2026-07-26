import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type ReactNode, useState } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { TimeField, type TimeValue } from './TimeField';
import { Field } from '../Field';

function wrap(locale = 'en-US') {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

function Driver({
  initial = { hours: 14, minutes: 30 } as TimeValue | null,
  step,
  disabled,
  hourCycle,
  locale,
  hideNowButton,
  onChange,
}: {
  initial?: TimeValue | null;
  step?: number;
  disabled?: boolean;
  hourCycle?: '12' | '24' | 'auto';
  locale?: string;
  hideNowButton?: boolean;
  onChange?: (value: TimeValue) => void;
}) {
  const [v, setV] = useState<TimeValue | null>(initial);
  return (
    <TimeField
      value={v}
      step={step}
      disabled={disabled}
      hourCycle={hourCycle}
      locale={locale}
      hideNowButton={hideNowButton}
      aria-label="Time"
      onChange={(next) => {
        onChange?.(next);
        setV(next);
      }}
    />
  );
}

describe('TimeField', () => {
  // ===========================================================================
  // Basic structure
  // ===========================================================================

  it('renders a group with the passed aria-label', () => {
    render(<Driver hourCycle="24" />, { wrapper: wrap() });
    expect(screen.getByRole('group', { name: 'Time' })).toBeInTheDocument();
  });

  it('renders the text input showing the formatted value + HH:mm placeholder (24h)', () => {
    render(<Driver hourCycle="24" />, { wrapper: wrap() });
    const input = screen.getByRole('textbox', { name: 'Time' });
    expect(input).toHaveValue('14:30');
    expect(input).toHaveAttribute('placeholder', 'HH:mm');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('forwards ref to the wrapper div', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <TimeField
        ref={ref}
        value={{ hours: 14, minutes: 30 }}
        onChange={() => {}}
        aria-label="Time"
        hourCycle="24"
      />,
      { wrapper: wrap() },
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.getAttribute('role')).toBe('group');
  });

  it('merges className without replacing internal classes', () => {
    render(
      <TimeField
        value={{ hours: 14, minutes: 30 }}
        onChange={() => {}}
        aria-label="Time"
        className="custom-x"
        hourCycle="24"
      />,
      { wrapper: wrap() },
    );
    const wrapper = screen.getByRole('group');
    expect(wrapper.className).toMatch(/custom-x/);
    expect(wrapper.className.split(' ').length).toBeGreaterThan(1);
  });

  // ===========================================================================
  // Value shape (TimeValue)
  // ===========================================================================

  it('value={{ hours: 14, minutes: 30 }} renders "14:30" in 24h and "2:30 PM" in 12h', () => {
    const { rerender } = render(
      <TimeField
        value={{ hours: 14, minutes: 30 }}
        onChange={() => {}}
        aria-label="Time"
        hourCycle="24"
      />,
      { wrapper: wrap() },
    );
    expect(screen.getByDisplayValue('14:30')).toBeInTheDocument();
    rerender(
      <TimeField
        value={{ hours: 14, minutes: 30 }}
        onChange={() => {}}
        aria-label="Time"
        hourCycle="12"
      />,
    );
    expect(screen.getByDisplayValue('2:30 PM')).toBeInTheDocument();
  });

  // ===========================================================================
  // hourCycle resolution
  // ===========================================================================

  it("hourCycle='24' forced: 24 hour rows, no period column, placeholder HH:mm", async () => {
    const user = userEvent.setup();
    render(<Driver hourCycle="24" />, { wrapper: wrap('en-US') });
    expect(screen.getByRole('textbox', { name: 'Time' })).toHaveAttribute('placeholder', 'HH:mm');
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    expect(within(hours).getAllByRole('option')).toHaveLength(24);
    expect(screen.queryByRole('listbox', { name: 'Period' })).not.toBeInTheDocument();
  });

  it("hourCycle='12' forced: 12 hour rows (12, 1..11), period column visible, placeholder h:mm AM/PM", async () => {
    const user = userEvent.setup();
    render(<Driver hourCycle="12" />, { wrapper: wrap('ru-RU') });
    expect(screen.getByRole('textbox', { name: 'Time' })).toHaveAttribute(
      'placeholder',
      'h:mm AM/PM',
    );
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    const optionLabels = within(hours)
      .getAllByRole('option')
      .map((el) => el.textContent?.trim().replace(/[^\d]/g, ''));
    // First row is 12, rest are 1..11.
    expect(optionLabels).toHaveLength(12);
    expect(optionLabels[0]).toBe('12');
    expect(optionLabels[1]).toBe('1');
    expect(optionLabels[11]).toBe('11');
    expect(screen.getByRole('listbox', { name: 'Period' })).toBeInTheDocument();
  });

  it("hourCycle='auto' + en-US locale resolves to 12h", () => {
    render(<Driver hourCycle="auto" />, { wrapper: wrap('en-US') });
    expect(screen.getByDisplayValue('2:30 PM')).toBeInTheDocument();
  });

  it("hourCycle='auto' + ru-RU locale resolves to 24h", () => {
    render(<Driver hourCycle="auto" />, { wrapper: wrap('ru-RU') });
    expect(screen.getByDisplayValue('14:30')).toBeInTheDocument();
  });

  it('locale prop overrides useLocale()', () => {
    render(<Driver hourCycle="auto" locale="en-US" />, { wrapper: wrap('ru-RU') });
    expect(screen.getByDisplayValue('2:30 PM')).toBeInTheDocument();
  });

  // ===========================================================================
  // Typed input (lenient — both 24h and AM/PM parse in both modes)
  // ===========================================================================

  it('typing "14:30" and blurring commits onChange({ hours: 14, minutes: 30 })', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Driver initial={{ hours: 9, minutes: 0 }} onChange={onChange} hourCycle="24" />, {
      wrapper: wrap(),
    });
    const input = screen.getByRole('textbox', { name: 'Time' });
    await user.clear(input);
    await user.type(input, '14:30');
    input.blur();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ hours: 14, minutes: 30 }));
  });

  it('typing "1430" (no colon) and blurring commits onChange({ hours: 14, minutes: 30 })', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Driver initial={{ hours: 9, minutes: 0 }} onChange={onChange} hourCycle="24" />, {
      wrapper: wrap(),
    });
    const input = screen.getByRole('textbox', { name: 'Time' });
    await user.clear(input);
    await user.type(input, '1430');
    input.blur();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ hours: 14, minutes: 30 }));
  });

  it('typing "14" (hours only) and blurring commits onChange({ hours: 14, minutes: 0 })', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Driver initial={{ hours: 9, minutes: 0 }} onChange={onChange} hourCycle="24" />, {
      wrapper: wrap(),
    });
    const input = screen.getByRole('textbox', { name: 'Time' });
    await user.clear(input);
    await user.type(input, '14');
    input.blur();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ hours: 14, minutes: 0 }));
  });

  it('typing invalid "abc" and blurring reverts the draft (no onChange)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Driver onChange={onChange} hourCycle="24" />, { wrapper: wrap() });
    const input = screen.getByRole('textbox', { name: 'Time' });
    await user.clear(input);
    await user.type(input, 'abc');
    input.blur();
    await waitFor(() => expect(input).toHaveValue('14:30'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('pressing Enter commits like blur', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Driver initial={{ hours: 9, minutes: 0 }} onChange={onChange} hourCycle="24" />, {
      wrapper: wrap(),
    });
    const input = screen.getByRole('textbox', { name: 'Time' });
    await user.clear(input);
    await user.type(input, '14:30{Enter}');
    expect(onChange).toHaveBeenCalledWith({ hours: 14, minutes: 30 });
  });

  it('step={15} with typed "14:23" rounds UP to 14:30', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Driver step={15} initial={{ hours: 9, minutes: 0 }} onChange={onChange} hourCycle="24" />,
      { wrapper: wrap() },
    );
    const input = screen.getByRole('textbox', { name: 'Time' });
    await user.clear(input);
    await user.type(input, '14:23');
    input.blur();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ hours: 14, minutes: 30 }));
  });

  it('typing "2:30 PM" commits onChange({ hours: 14, minutes: 30 })', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Driver initial={{ hours: 9, minutes: 0 }} onChange={onChange} hourCycle="12" />, {
      wrapper: wrap('en-US'),
    });
    const input = screen.getByRole('textbox', { name: 'Time' });
    await user.clear(input);
    await user.type(input, '2:30 PM');
    input.blur();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ hours: 14, minutes: 30 }));
  });

  it('typing "230pm" commits onChange({ hours: 14, minutes: 30 })', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Driver initial={{ hours: 9, minutes: 0 }} onChange={onChange} hourCycle="12" />, {
      wrapper: wrap('en-US'),
    });
    const input = screen.getByRole('textbox', { name: 'Time' });
    await user.clear(input);
    await user.type(input, '230pm');
    input.blur();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ hours: 14, minutes: 30 }));
  });

  it('typing "14:30" in 12h mode still parses (lenient)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Driver initial={{ hours: 9, minutes: 0 }} onChange={onChange} hourCycle="12" />, {
      wrapper: wrap('en-US'),
    });
    const input = screen.getByRole('textbox', { name: 'Time' });
    await user.clear(input);
    await user.type(input, '14:30');
    input.blur();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ hours: 14, minutes: 30 }));
  });

  // ===========================================================================
  // Popover open + listbox structure
  // ===========================================================================

  it('chevron click opens the popover with hour + minute listboxes (24h)', async () => {
    const user = userEvent.setup();
    render(<Driver hourCycle="24" />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    expect(await screen.findByRole('listbox', { name: 'Hours' })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'Minutes' })).toBeInTheDocument();
  });

  it('hours listbox has 24 rows (24h), default minutes listbox has 4 rows (step=15)', async () => {
    const user = userEvent.setup();
    render(<Driver hourCycle="24" />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    const minutes = screen.getByRole('listbox', { name: 'Minutes' });
    expect(within(hours).getAllByRole('option')).toHaveLength(24);
    expect(within(minutes).getAllByRole('option')).toHaveLength(4);
  });

  it('step={30} renders 2 minute rows', async () => {
    const user = userEvent.setup();
    render(<Driver step={30} hourCycle="24" />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const minutes = await screen.findByRole('listbox', { name: 'Minutes' });
    expect(within(minutes).getAllByRole('option')).toHaveLength(2);
  });

  it('current hour + minute are flagged with data-current (24h)', async () => {
    const user = userEvent.setup();
    render(<Driver hourCycle="24" />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    const minutes = screen.getByRole('listbox', { name: 'Minutes' });
    const currentHour = within(hours).getByRole('option', { name: '14' });
    const currentMinute = within(minutes).getByRole('option', { name: '30' });
    expect(currentHour).toHaveAttribute('data-current', 'true');
    expect(currentHour).toHaveAttribute('aria-selected', 'true');
    expect(currentMinute).toHaveAttribute('data-current', 'true');
  });

  it('clicking an hour row commits onChange (24h)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Driver onChange={onChange} hourCycle="24" />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    await user.click(within(hours).getByRole('option', { name: '09' }));
    expect(onChange).toHaveBeenLastCalledWith({ hours: 9, minutes: 30 });
  });

  it('clicking a minute row commits onChange (24h)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Driver onChange={onChange} hourCycle="24" />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const minutes = await screen.findByRole('listbox', { name: 'Minutes' });
    await user.click(within(minutes).getByRole('option', { name: '00' }));
    expect(onChange).toHaveBeenLastCalledWith({ hours: 14, minutes: 0 });
  });

  it('popover stays open after a pick', async () => {
    const user = userEvent.setup();
    render(<Driver hourCycle="24" />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    await user.click(within(hours).getByRole('option', { name: '09' }));
    expect(screen.getByRole('listbox', { name: 'Hours' })).toBeInTheDocument();
  });

  it('outside pointerdown closes the popover', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Driver hourCycle="24" />
        <button type="button" data-testid="outside">
          Outside
        </button>
      </div>,
      { wrapper: wrap() },
    );
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    await screen.findByRole('listbox', { name: 'Hours' });
    fireEvent.pointerDown(screen.getByTestId('outside'));
    await waitFor(() =>
      expect(screen.queryByRole('listbox', { name: 'Hours' })).not.toBeInTheDocument(),
    );
  });

  it('Escape closes the popover', async () => {
    const user = userEvent.setup();
    render(<Driver hourCycle="24" />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    await screen.findByRole('listbox', { name: 'Hours' });
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('listbox', { name: 'Hours' })).not.toBeInTheDocument(),
    );
  });

  // ===========================================================================
  // AM/PM column
  // ===========================================================================

  it('AM click at hours=14 flips to AM (hours=2)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Driver initial={{ hours: 14, minutes: 30 }} onChange={onChange} hourCycle="12" />, {
      wrapper: wrap('en-US'),
    });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const period = await screen.findByRole('listbox', { name: 'Period' });
    await user.click(within(period).getByRole('option', { name: 'AM' }));
    expect(onChange).toHaveBeenLastCalledWith({ hours: 2, minutes: 30 });
  });

  it('PM click at hours=2 flips to PM (hours=14)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Driver initial={{ hours: 2, minutes: 30 }} onChange={onChange} hourCycle="12" />, {
      wrapper: wrap('en-US'),
    });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const period = await screen.findByRole('listbox', { name: 'Period' });
    await user.click(within(period).getByRole('option', { name: 'PM' }));
    expect(onChange).toHaveBeenLastCalledWith({ hours: 14, minutes: 30 });
  });

  it('same-period click is a no-op (no onChange)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Driver initial={{ hours: 14, minutes: 30 }} onChange={onChange} hourCycle="12" />, {
      wrapper: wrap('en-US'),
    });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const period = await screen.findByRole('listbox', { name: 'Period' });
    await user.click(within(period).getByRole('option', { name: 'PM' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('clicking a 12h hour row maps to the correct 24h internal hour using current period', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Driver
        initial={{ hours: 14, minutes: 30 }} // PM
        onChange={onChange}
        hourCycle="12"
      />,
      { wrapper: wrap('en-US') },
    );
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    // Click "5" — currently PM, so internal = 17.
    await user.click(within(hours).getByRole('option', { name: '5' }));
    expect(onChange).toHaveBeenLastCalledWith({ hours: 17, minutes: 30 });
  });

  it('clicking "12" in 12h mode (AM) commits hours=0; (PM) commits hours=12', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <TimeField
        value={{ hours: 5, minutes: 0 }} // AM
        onChange={onChange}
        hourCycle="12"
        aria-label="Time"
      />,
      { wrapper: wrap('en-US') },
    );
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hoursAm = await screen.findByRole('listbox', { name: 'Hours' });
    await user.click(within(hoursAm).getByRole('option', { name: '12' }));
    expect(onChange).toHaveBeenLastCalledWith({ hours: 0, minutes: 0 });

    onChange.mockClear();
    rerender(
      <TimeField
        value={{ hours: 17, minutes: 0 }} // PM
        onChange={onChange}
        hourCycle="12"
        aria-label="Time"
      />,
    );
    const hoursPm = await screen.findByRole('listbox', { name: 'Hours' });
    await user.click(within(hoursPm).getByRole('option', { name: '12' }));
    expect(onChange).toHaveBeenLastCalledWith({ hours: 12, minutes: 0 });
  });

  // ===========================================================================
  // Now button
  // ===========================================================================

  it('Now button click fires onChange with current rounded time; popover stays open', () => {
    // Frozen clock (#339 — real wall-clock time flaked in the last minutes of
    // a UTC day). 10:07 + step=15 → Math.round(607/15)*15 = 600 min = 10:00.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 28, 10, 7));
    const onChange = vi.fn();
    render(<Driver onChange={onChange} hourCycle="24" step={15} />, { wrapper: wrap() });
    fireEvent.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Now' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ hours: 10, minutes: 0 });
    // Popover still open.
    expect(screen.getByRole('listbox', { name: 'Hours' })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('hideNowButton hides the footer', async () => {
    const user = userEvent.setup();
    render(<Driver hourCycle="24" hideNowButton />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    await screen.findByRole('listbox', { name: 'Hours' });
    expect(screen.queryByRole('button', { name: 'Now' })).not.toBeInTheDocument();
  });

  // ===========================================================================
  // Arrow-key navigation (roving tabIndex)
  // ===========================================================================

  it('on popover open, focus moves to the current hour row (24h)', async () => {
    const user = userEvent.setup();
    render(<Driver hourCycle="24" />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    const currentHourRow = within(hours).getByRole('option', { name: '14' });
    await waitFor(() => expect(currentHourRow).toHaveAttribute('tabindex', '0'));
    await waitFor(() => expect(document.activeElement).toBe(currentHourRow));
  });

  it('ArrowDown moves focus to next row; clamps at last row (no wrap)', async () => {
    const user = userEvent.setup();
    render(<Driver initial={{ hours: 22, minutes: 30 }} hourCycle="24" />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    await waitFor(() =>
      expect(document.activeElement).toBe(within(hours).getByRole('option', { name: '22' })),
    );
    // ArrowDown twice — 22 → 23 (clamps at last).
    await user.keyboard('{ArrowDown}');
    await waitFor(() =>
      expect(document.activeElement).toBe(within(hours).getByRole('option', { name: '23' })),
    );
    await user.keyboard('{ArrowDown}');
    // Still 23 — no wrap.
    await waitFor(() =>
      expect(within(hours).getByRole('option', { name: '23' })).toHaveAttribute('tabindex', '0'),
    );
  });

  it('ArrowUp on first row stays at index 0 (no wrap)', async () => {
    const user = userEvent.setup();
    render(<Driver initial={{ hours: 0, minutes: 0 }} hourCycle="24" />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    await waitFor(() =>
      expect(document.activeElement).toBe(within(hours).getByRole('option', { name: '00' })),
    );
    await user.keyboard('{ArrowUp}');
    await waitFor(() =>
      expect(within(hours).getByRole('option', { name: '00' })).toHaveAttribute('tabindex', '0'),
    );
  });

  it('ArrowRight from Hours → Minutes (focused row is current minute)', async () => {
    const user = userEvent.setup();
    render(<Driver hourCycle="24" />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    // Wait for the rAF-deferred focus on the current hour row before firing
    // arrow keys — userEvent.keyboard dispatches at document.activeElement.
    await waitFor(() =>
      expect(within(hours).getByRole('option', { name: '14' })).toHaveAttribute('tabindex', '0'),
    );
    await waitFor(() =>
      expect(document.activeElement).toBe(within(hours).getByRole('option', { name: '14' })),
    );
    await user.keyboard('{ArrowRight}');
    const minutes = screen.getByRole('listbox', { name: 'Minutes' });
    await waitFor(() =>
      expect(within(minutes).getByRole('option', { name: '30' })).toHaveAttribute('tabindex', '0'),
    );
  });

  it('ArrowLeft from Minutes → Hours (focused row is current hour)', async () => {
    const user = userEvent.setup();
    render(<Driver hourCycle="24" />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    await waitFor(() =>
      expect(document.activeElement).toBe(within(hours).getByRole('option', { name: '14' })),
    );
    await user.keyboard('{ArrowRight}');
    const minutes = screen.getByRole('listbox', { name: 'Minutes' });
    await waitFor(() =>
      expect(document.activeElement).toBe(within(minutes).getByRole('option', { name: '30' })),
    );
    await user.keyboard('{ArrowLeft}');
    await waitFor(() =>
      expect(within(hours).getByRole('option', { name: '14' })).toHaveAttribute('tabindex', '0'),
    );
  });

  it('ArrowRight from Minutes in 24h mode is a no-op (no Period column)', async () => {
    const user = userEvent.setup();
    render(<Driver hourCycle="24" />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    await waitFor(() =>
      expect(document.activeElement).toBe(within(hours).getByRole('option', { name: '14' })),
    );
    await user.keyboard('{ArrowRight}'); // hours → minutes
    const minutes = screen.getByRole('listbox', { name: 'Minutes' });
    await waitFor(() =>
      expect(document.activeElement).toBe(within(minutes).getByRole('option', { name: '30' })),
    );
    await user.keyboard('{ArrowRight}'); // no-op
    await waitFor(() =>
      expect(within(minutes).getByRole('option', { name: '30' })).toHaveAttribute('tabindex', '0'),
    );
    // No Period listbox exists.
    expect(screen.queryByRole('listbox', { name: 'Period' })).not.toBeInTheDocument();
  });

  it('ArrowRight from Minutes in 12h mode moves to Period (current period focused)', async () => {
    const user = userEvent.setup();
    render(<Driver initial={{ hours: 14, minutes: 30 }} hourCycle="12" />, {
      wrapper: wrap('en-US'),
    });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    // currentDisplayHour for 14 (PM) is 2.
    await waitFor(() =>
      expect(document.activeElement).toBe(within(hours).getByRole('option', { name: '2' })),
    );
    await user.keyboard('{ArrowRight}'); // hours → minutes
    const minutes = screen.getByRole('listbox', { name: 'Minutes' });
    await waitFor(() =>
      expect(document.activeElement).toBe(within(minutes).getByRole('option', { name: '30' })),
    );
    await user.keyboard('{ArrowRight}'); // minutes → period
    const period = screen.getByRole('listbox', { name: 'Period' });
    // hours=14 → PM (index 1).
    await waitFor(() =>
      expect(within(period).getByRole('option', { name: 'PM' })).toHaveAttribute('tabindex', '0'),
    );
  });

  it('Home → row 0; End → last row', async () => {
    const user = userEvent.setup();
    render(<Driver initial={{ hours: 12, minutes: 15 }} hourCycle="24" />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    await waitFor(() =>
      expect(document.activeElement).toBe(within(hours).getByRole('option', { name: '12' })),
    );
    await user.keyboard('{End}');
    await waitFor(() =>
      expect(document.activeElement).toBe(within(hours).getByRole('option', { name: '23' })),
    );
    await user.keyboard('{Home}');
    await waitFor(() =>
      expect(within(hours).getByRole('option', { name: '00' })).toHaveAttribute('tabindex', '0'),
    );
  });

  it('Enter on focused row commits via the row keydown handler', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Driver onChange={onChange} hourCycle="24" />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    await waitFor(() =>
      expect(document.activeElement).toBe(within(hours).getByRole('option', { name: '14' })),
    );
    await user.keyboard('{ArrowDown}'); // 14 → 15
    await waitFor(() =>
      expect(document.activeElement).toBe(within(hours).getByRole('option', { name: '15' })),
    );
    await user.keyboard('{Enter}');
    expect(onChange).toHaveBeenLastCalledWith({ hours: 15, minutes: 30 });
  });

  // ===========================================================================
  // Disabled / null states
  // ===========================================================================

  it('disabled=true disables the input AND the chevron', () => {
    render(
      <TimeField
        value={{ hours: 14, minutes: 30 }}
        onChange={() => {}}
        aria-label="Time"
        hourCycle="24"
        disabled
      />,
      { wrapper: wrap() },
    );
    expect(screen.getByRole('textbox', { name: 'Time' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Time, Open time list/i })).toBeDisabled();
  });

  it('value=null disables the input + chevron and prevents the popover from opening', async () => {
    const user = userEvent.setup();
    render(<TimeField value={null} onChange={() => {}} aria-label="Time" hourCycle="24" />, {
      wrapper: wrap(),
    });
    const input = screen.getByRole('textbox', { name: 'Time' });
    const chevron = screen.getByRole('button', { name: /Time, Open time list/i });
    expect(input).toBeDisabled();
    expect(chevron).toBeDisabled();
    await user.click(chevron);
    expect(screen.queryByRole('listbox', { name: 'Hours' })).not.toBeInTheDocument();
  });

  it('updates draft when value changes externally (controlled re-sync)', () => {
    const { rerender } = render(
      <TimeField
        value={{ hours: 14, minutes: 30 }}
        onChange={() => {}}
        aria-label="Time"
        hourCycle="24"
      />,
      { wrapper: wrap() },
    );
    expect(screen.getByRole('textbox', { name: 'Time' })).toHaveValue('14:30');
    rerender(
      <TimeField
        value={{ hours: 9, minutes: 0 }}
        onChange={() => {}}
        aria-label="Time"
        hourCycle="24"
      />,
    );
    expect(screen.getByRole('textbox', { name: 'Time' })).toHaveValue('09:00');
  });

  // ===========================================================================
  // Now button — wall-clock boundary
  // ===========================================================================

  it('Now rounds across hour boundary when current minute >= step/2 above the last step', () => {
    // 14:53 + step=15 → Math.round(893/15)*15 = 900 minutes = 15:00.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 28, 14, 53));
    const onChange = vi.fn();
    render(
      <TimeField
        value={{ hours: 0, minutes: 0 }}
        onChange={onChange}
        aria-label="Time"
        hourCycle="24"
        step={15}
      />,
      { wrapper: wrap() },
    );
    fireEvent.click(screen.getByLabelText(/open time list/i));
    fireEvent.click(screen.getByText('Now'));
    expect(onChange).toHaveBeenCalledWith({ hours: 15, minutes: 0 });
    vi.useRealTimers();
  });

  it('Now at end of day clamps to 23:59 instead of wrapping to 00:00 (#339)', () => {
    // 23:58 + step=15 → Math.round(1438/15)*15 = 1440 min, clamped to 1439 = 23:59.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 28, 23, 58));
    const onChange = vi.fn();
    render(
      <TimeField
        value={{ hours: 0, minutes: 0 }}
        onChange={onChange}
        aria-label="Time"
        hourCycle="24"
        step={15}
      />,
      { wrapper: wrap() },
    );
    fireEvent.click(screen.getByLabelText(/open time list/i));
    fireEvent.click(screen.getByText('Now'));
    expect(onChange).toHaveBeenCalledWith({ hours: 23, minutes: 59 });
    vi.useRealTimers();
  });

  // ===========================================================================
  // Cycle switching mid-render
  // ===========================================================================

  it('switching hourCycle updates placeholder, input value, and listbox column count', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <TimeField
        value={{ hours: 14, minutes: 30 }}
        onChange={onChange}
        aria-label="Time"
        hourCycle="24"
      />,
      { wrapper: wrap() },
    );
    expect(screen.getByPlaceholderText('HH:mm')).toBeInTheDocument();
    expect(screen.getByDisplayValue('14:30')).toBeInTheDocument();
    await user.click(screen.getByLabelText(/open time list/i));
    expect(screen.queryByRole('listbox', { name: 'Period' })).not.toBeInTheDocument();

    rerender(
      <TimeField
        value={{ hours: 14, minutes: 30 }}
        onChange={onChange}
        aria-label="Time"
        hourCycle="12"
      />,
    );
    expect(screen.getByPlaceholderText('h:mm AM/PM')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2:30 PM')).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'Period' })).toBeInTheDocument();
  });

  it('cycle shrink (12 → 24) while focused on Period clamps focus to Minutes', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <TimeField
        value={{ hours: 14, minutes: 30 }}
        onChange={onChange}
        aria-label="Time"
        hourCycle="12"
      />,
      { wrapper: wrap('en-US') },
    );
    await user.click(screen.getByLabelText(/open time list/i));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    // Wait for initial focus on the current hour row before navigating columns.
    await waitFor(() =>
      expect(document.activeElement).toBe(within(hours).getByRole('option', { name: '2' })),
    );
    // Hours → Minutes → Period.
    await user.keyboard('{ArrowRight}{ArrowRight}');
    const period = screen.getByRole('listbox', { name: 'Period' });
    await waitFor(() =>
      expect(document.activeElement).toBe(within(period).getByRole('option', { name: 'PM' })),
    );

    // Shrink to 24h — Period column unmounts, focus must move to Minutes.
    rerender(
      <TimeField
        value={{ hours: 14, minutes: 30 }}
        onChange={onChange}
        aria-label="Time"
        hourCycle="24"
      />,
    );
    expect(screen.queryByRole('listbox', { name: 'Period' })).not.toBeInTheDocument();
    const minutes = screen.getByRole('listbox', { name: 'Minutes' });
    // The clamp lands on the current-minute row (30), AND focus moves there
    // via the roving-tabindex rAF — wait for both so the subsequent ArrowDown
    // dispatches at the right activeElement.
    await waitFor(() =>
      expect(document.activeElement).toBe(within(minutes).getByRole('option', { name: '30' })),
    );
    // ArrowDown now operates on Minutes (30 → 45 at step=15).
    await user.keyboard('{ArrowDown}');
    await waitFor(() =>
      expect(within(minutes).getByRole('option', { name: '45' })).toHaveAttribute('tabindex', '0'),
    );
  });
});

describe('TimeField — labelling', () => {
  it('a Field label names the inner input (auto-clone)', () => {
    function LabelDriver() {
      const [v, setV] = useState<TimeValue | null>({ hours: 9, minutes: 0 });
      return (
        <Field label="Start time">
          <TimeField value={v} hourCycle="24" onChange={setV} />
        </Field>
      );
    }
    render(<LabelDriver />, { wrapper: wrap() });
    expect(screen.getByRole('textbox', { name: 'Start time' })).toHaveValue('09:00');
  });

  it('back-compat: passing only aria-label still names the input + group', () => {
    render(
      <TimeField
        value={{ hours: 14, minutes: 30 }}
        hourCycle="24"
        aria-label="Departure time"
        onChange={() => {}}
      />,
      {
        wrapper: wrap(),
      },
    );
    expect(screen.getByRole('textbox', { name: 'Departure time' })).toHaveValue('14:30');
    expect(screen.getByRole('group', { name: 'Departure time' })).toBeInTheDocument();
  });

  it('a Field error description reaches the inner input (not the group wrapper)', () => {
    function ErrorDriver() {
      const [v, setV] = useState<TimeValue | null>({ hours: 9, minutes: 0 });
      return (
        <Field label="Start time" error="Required field">
          <TimeField value={v} hourCycle="24" onChange={setV} />
        </Field>
      );
    }
    render(<ErrorDriver />, { wrapper: wrap() });
    // The accessible description must land on the focusable input, so a screen
    // reader announces the error when the input has focus.
    const input = screen.getByRole('textbox', { name: 'Start time' });
    expect(input).toHaveAccessibleDescription('Required field');
    // …and not on the role="group" wrapper (where {...rest} used to dump it).
    expect(screen.getByRole('group', { name: 'Start time' })).not.toHaveAttribute(
      'aria-describedby',
    );
  });

  it('forwards aria-describedby onto the input directly', () => {
    render(
      <>
        <span id="tf-desc">Use 24-hour format</span>
        <TimeField
          value={{ hours: 14, minutes: 30 }}
          hourCycle="24"
          aria-label="Departure time"
          aria-describedby="tf-desc"
          onChange={() => {}}
        />
      </>,
      { wrapper: wrap() },
    );
    expect(screen.getByRole('textbox', { name: 'Departure time' })).toHaveAttribute(
      'aria-describedby',
      'tf-desc',
    );
  });

  it('the toggle keeps a distinct name (not the field label) when wrapped in a Field', () => {
    function LabelDriver() {
      const [v, setV] = useState<TimeValue | null>({ hours: 9, minutes: 0 });
      return (
        <Field label="Start time">
          <TimeField value={v} hourCycle="24" onChange={setV} />
        </Field>
      );
    }
    render(<LabelDriver />, { wrapper: wrap() });
    // The input carries the field label…
    expect(screen.getByRole('textbox', { name: 'Start time' })).toBeInTheDocument();
    // …but the toggle must NOT duplicate it — it owns the open-list action name.
    expect(screen.queryByRole('button', { name: 'Start time' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Open time list' })).toBeInTheDocument();
  });
});

describe('TimeField — overlay elevation (#272)', () => {
  it('elevates the time popover (data-in-overlay) when opened inside an overlay', async () => {
    const user = userEvent.setup();
    render(
      <div data-drawer-portal-root="">
        <Driver hourCycle="24" />
      </div>,
      { wrapper: wrap() },
    );
    await user.click(screen.getByRole('button', { name: /Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    expect(hours.closest('[data-timefield-popover="true"]')).toHaveAttribute('data-in-overlay', '');
  });

  it('does not elevate the time popover at page level', async () => {
    const user = userEvent.setup();
    render(<Driver hourCycle="24" />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    expect(hours.closest('[data-timefield-popover="true"]')).not.toHaveAttribute('data-in-overlay');
  });
});
