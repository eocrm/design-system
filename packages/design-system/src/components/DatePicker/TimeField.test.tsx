import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type ReactNode, useState } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { TimeField } from './TimeField';

function wrap(locale = 'en-US') {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

function Driver({
  initial = new Date(2026, 4, 28, 14, 30),
  step,
  disabled,
  onChange,
}: {
  initial?: Date | null;
  step?: number;
  disabled?: boolean;
  onChange?: (h: number, m: number) => void;
}) {
  const [v, setV] = useState<Date | null>(initial);
  return (
    <TimeField
      value={v}
      step={step}
      disabled={disabled}
      aria-label="Time"
      onChange={(h, m) => {
        onChange?.(h, m);
        setV((prev) => {
          const next = new Date(prev ?? new Date(2026, 4, 28));
          next.setHours(h, m, 0, 0);
          return next;
        });
      }}
    />
  );
}

describe('TimeField', () => {
  it('renders a group with the passed aria-label', () => {
    render(<Driver />, { wrapper: wrap() });
    expect(screen.getByRole('group', { name: 'Time' })).toBeInTheDocument();
  });

  it('renders the text input showing the formatted value + HH:mm placeholder', () => {
    render(<Driver />, { wrapper: wrap() });
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
        value={new Date(2026, 4, 28, 14, 30)}
        onChange={() => {}}
        aria-label="Time"
      />,
      { wrapper: wrap() },
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.getAttribute('role')).toBe('group');
  });

  it('merges className without replacing internal classes', () => {
    render(
      <TimeField
        value={new Date(2026, 4, 28, 14, 30)}
        onChange={() => {}}
        aria-label="Time"
        className="custom-x"
      />,
      { wrapper: wrap() },
    );
    const wrapper = screen.getByRole('group');
    expect(wrapper.className).toMatch(/custom-x/);
    // Still carries some TimeField-owned class (CSS Modules hash so just
    // assert the count is > 1).
    expect(wrapper.className.split(' ').length).toBeGreaterThan(1);
  });

  it('typing "14:30" and blurring commits onChange(14, 30)', async () => {
    const onChange = vi.fn<(h: number, m: number) => void>();
    const user = userEvent.setup();
    render(<Driver initial={new Date(2026, 4, 28, 9, 0)} onChange={onChange} />, {
      wrapper: wrap(),
    });
    const input = screen.getByRole('textbox', { name: 'Time' });
    await user.clear(input);
    await user.type(input, '14:30');
    input.blur();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(14, 30));
  });

  it('typing "1430" (no colon) and blurring commits onChange(14, 30)', async () => {
    const onChange = vi.fn<(h: number, m: number) => void>();
    const user = userEvent.setup();
    render(<Driver initial={new Date(2026, 4, 28, 9, 0)} onChange={onChange} />, {
      wrapper: wrap(),
    });
    const input = screen.getByRole('textbox', { name: 'Time' });
    await user.clear(input);
    await user.type(input, '1430');
    input.blur();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(14, 30));
  });

  it('typing "14" (hours only) and blurring commits onChange(14, 0)', async () => {
    const onChange = vi.fn<(h: number, m: number) => void>();
    const user = userEvent.setup();
    render(<Driver initial={new Date(2026, 4, 28, 9, 0)} onChange={onChange} />, {
      wrapper: wrap(),
    });
    const input = screen.getByRole('textbox', { name: 'Time' });
    await user.clear(input);
    await user.type(input, '14');
    input.blur();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(14, 0));
  });

  it('typing invalid "abc" and blurring reverts the draft (no onChange)', async () => {
    const onChange = vi.fn<(h: number, m: number) => void>();
    const user = userEvent.setup();
    render(<Driver onChange={onChange} />, { wrapper: wrap() });
    const input = screen.getByRole('textbox', { name: 'Time' });
    await user.clear(input);
    await user.type(input, 'abc');
    input.blur();
    await waitFor(() => expect(input).toHaveValue('14:30'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('pressing Enter commits like blur', async () => {
    const onChange = vi.fn<(h: number, m: number) => void>();
    const user = userEvent.setup();
    render(<Driver initial={new Date(2026, 4, 28, 9, 0)} onChange={onChange} />, {
      wrapper: wrap(),
    });
    const input = screen.getByRole('textbox', { name: 'Time' });
    await user.clear(input);
    await user.type(input, '14:30{Enter}');
    expect(onChange).toHaveBeenCalledWith(14, 30);
  });

  it('step={15} with typed "14:23" rounds UP to 14:30', async () => {
    const onChange = vi.fn<(h: number, m: number) => void>();
    const user = userEvent.setup();
    render(<Driver step={15} initial={new Date(2026, 4, 28, 9, 0)} onChange={onChange} />, {
      wrapper: wrap(),
    });
    const input = screen.getByRole('textbox', { name: 'Time' });
    await user.clear(input);
    await user.type(input, '14:23');
    input.blur();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(14, 30));
  });

  it('chevron click opens the popover with two listboxes', async () => {
    const user = userEvent.setup();
    render(<Driver />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    expect(await screen.findByRole('listbox', { name: 'Hours' })).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: 'Minutes' })).toBeInTheDocument();
  });

  it('hours listbox has 24 rows, default minutes listbox has 4 rows (step=15)', async () => {
    const user = userEvent.setup();
    render(<Driver />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    const minutes = screen.getByRole('listbox', { name: 'Minutes' });
    expect(within(hours).getAllByRole('option')).toHaveLength(24);
    expect(within(minutes).getAllByRole('option')).toHaveLength(4);
  });

  it('step={30} renders 2 minute rows', async () => {
    const user = userEvent.setup();
    render(<Driver step={30} />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const minutes = await screen.findByRole('listbox', { name: 'Minutes' });
    expect(within(minutes).getAllByRole('option')).toHaveLength(2);
  });

  it('current hour + minute are flagged with data-current', async () => {
    const user = userEvent.setup();
    render(<Driver />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    const minutes = screen.getByRole('listbox', { name: 'Minutes' });
    const currentHour = within(hours).getByRole('option', { name: '14' });
    const currentMinute = within(minutes).getByRole('option', { name: '30' });
    expect(currentHour).toHaveAttribute('data-current', 'true');
    expect(currentHour).toHaveAttribute('aria-selected', 'true');
    expect(currentMinute).toHaveAttribute('data-current', 'true');
  });

  it('clicking an hour row commits onChange(rowHour, currentMinute)', async () => {
    const onChange = vi.fn<(h: number, m: number) => void>();
    const user = userEvent.setup();
    render(<Driver onChange={onChange} />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    await user.click(within(hours).getByRole('option', { name: '09' }));
    expect(onChange).toHaveBeenLastCalledWith(9, 30);
  });

  it('clicking a minute row commits onChange(currentHour, rowMinute)', async () => {
    const onChange = vi.fn<(h: number, m: number) => void>();
    const user = userEvent.setup();
    render(<Driver onChange={onChange} />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const minutes = await screen.findByRole('listbox', { name: 'Minutes' });
    await user.click(within(minutes).getByRole('option', { name: '00' }));
    expect(onChange).toHaveBeenLastCalledWith(14, 0);
  });

  it('popover stays open after a pick', async () => {
    const user = userEvent.setup();
    render(<Driver />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    const hours = await screen.findByRole('listbox', { name: 'Hours' });
    await user.click(within(hours).getByRole('option', { name: '09' }));
    // Hours listbox still in the document.
    expect(screen.getByRole('listbox', { name: 'Hours' })).toBeInTheDocument();
  });

  it('outside pointerdown closes the popover', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <Driver />
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
    render(<Driver />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: /Time, Open time list/i }));
    await screen.findByRole('listbox', { name: 'Hours' });
    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('listbox', { name: 'Hours' })).not.toBeInTheDocument(),
    );
  });

  it('disabled=true disables the input AND the chevron', () => {
    render(
      <TimeField
        value={new Date(2026, 4, 28, 14, 30)}
        onChange={() => {}}
        aria-label="Time"
        disabled
      />,
      { wrapper: wrap() },
    );
    expect(screen.getByRole('textbox', { name: 'Time' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Time, Open time list/i })).toBeDisabled();
  });

  it('value=null disables the input + chevron and prevents the popover from opening', async () => {
    const user = userEvent.setup();
    render(<TimeField value={null} onChange={() => {}} aria-label="Time" />, { wrapper: wrap() });
    const input = screen.getByRole('textbox', { name: 'Time' });
    const chevron = screen.getByRole('button', { name: /Time, Open time list/i });
    expect(input).toBeDisabled();
    expect(chevron).toBeDisabled();
    await user.click(chevron);
    expect(screen.queryByRole('listbox', { name: 'Hours' })).not.toBeInTheDocument();
  });

  it('updates draft when value changes externally (controlled re-sync)', () => {
    const { rerender } = render(
      <TimeField value={new Date(2026, 4, 28, 14, 30)} onChange={() => {}} aria-label="Time" />,
      { wrapper: wrap() },
    );
    expect(screen.getByRole('textbox', { name: 'Time' })).toHaveValue('14:30');
    rerender(
      <TimeField value={new Date(2026, 4, 28, 9, 0)} onChange={() => {}} aria-label="Time" />,
    );
    expect(screen.getByRole('textbox', { name: 'Time' })).toHaveValue('09:00');
  });
});
