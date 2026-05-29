import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type ReactNode, useState } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { InlineDatePicker } from './InlineDatePicker';

function wrap(locale = 'en-US') {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

describe('InlineDatePicker', () => {
  it('renders the month grid for the cursor month (anchored to value on mount)', () => {
    render(<InlineDatePicker defaultValue={new Date(2026, 4, 21)} aria-label="Date" />, {
      wrapper: wrap(),
    });
    expect(screen.getByText(/May 2026/)).toBeInTheDocument();
    expect(screen.getByRole('gridcell', { name: /^21$/, selected: true })).toBeInTheDocument();
  });

  it('uncontrolled: clicking a cell commits via onChange', async () => {
    const onChange = vi.fn<(d: Date | null) => void>();
    const user = userEvent.setup();
    render(
      <InlineDatePicker
        defaultValue={new Date(2026, 4, 1)}
        onChange={onChange}
        aria-label="Date"
      />,
      { wrapper: wrap() },
    );
    await user.click(screen.getByRole('gridcell', { name: /^15$/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]!.getDate()).toBe(15);
  });

  it('controlled: value updates when consumer changes it', async () => {
    const user = userEvent.setup();
    function Driver() {
      const [v, setV] = useState<Date | null>(new Date(2026, 4, 21));
      return (
        <>
          <InlineDatePicker value={v} onChange={setV} aria-label="Date" />
          <button onClick={() => setV(new Date(2026, 4, 5))}>Pick May 5</button>
        </>
      );
    }
    render(<Driver />, { wrapper: wrap() });
    expect(screen.getByRole('gridcell', { name: /^21$/, selected: true })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Pick May 5' }));
    expect(screen.getByRole('gridcell', { name: /^5$/, selected: true })).toBeInTheDocument();
    expect(
      screen.queryByRole('gridcell', { name: /^21$/, selected: true }),
    ).not.toBeInTheDocument();
  });

  it('chevrons step the cursor (month header updates)', async () => {
    const user = userEvent.setup();
    render(<InlineDatePicker defaultValue={new Date(2026, 4, 21)} aria-label="Date" />, {
      wrapper: wrap(),
    });
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText(/June 2026/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText(/April 2026/)).toBeInTheDocument();
  });

  it('min / max disable out-of-range cells; clicks are no-ops', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <InlineDatePicker
        defaultValue={new Date(2026, 4, 15)}
        min={new Date(2026, 4, 10)}
        max={new Date(2026, 4, 20)}
        onChange={onChange}
        aria-label="Date"
      />,
      { wrapper: wrap() },
    );
    // May 5 is in-month; the grid also renders June-5 as an outside overflow
    // cell — take the first match (the in-month one).
    const [cell5] = screen.getAllByRole('gridcell', { name: /^5$/ });
    expect(cell5).toHaveAttribute('aria-disabled', 'true');
    await user.click(cell5);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('isDateDisabled blocks specific cells', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <InlineDatePicker
        defaultValue={new Date(2026, 4, 1)}
        isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
        onChange={onChange}
        aria-label="Weekday only"
      />,
      { wrapper: wrap() },
    );
    // Sat May 2, 2026. The grid also renders June 2 as an outside overflow
    // cell — take the first match (the in-month Saturday).
    const [sat] = screen.getAllByRole('gridcell', { name: /^2$/ });
    expect(sat).toHaveAttribute('aria-disabled', 'true');
    await user.click(sat);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disabled blocks all interaction', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <InlineDatePicker
        defaultValue={new Date(2026, 4, 21)}
        disabled
        onChange={onChange}
        aria-label="Date"
      />,
      { wrapper: wrap() },
    );
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
    await user.click(screen.getByRole('gridcell', { name: /^15$/ }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('name renders a hidden form mirror with the ISO date', () => {
    const { container } = render(
      <InlineDatePicker name="dob" defaultValue={new Date(2026, 4, 21)} aria-label="Date" />,
      { wrapper: wrap() },
    );
    const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"][name="dob"]');
    expect(hidden?.value).toBe('2026-05-21');
  });

  it('name with null value emits an empty hidden mirror', () => {
    const { container } = render(<InlineDatePicker name="dob" aria-label="Date" />, {
      wrapper: wrap(),
    });
    const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"][name="dob"]');
    expect(hidden?.value).toBe('');
  });

  it('forwards ref to the wrapper div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<InlineDatePicker ref={ref} aria-label="Date" />, { wrapper: wrap() });
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges className from props with the internal wrapper class', () => {
    const { container } = render(<InlineDatePicker className="custom" aria-label="Date" />, {
      wrapper: wrap(),
    });
    const wrapper = container.firstChild as HTMLDivElement;
    expect(wrapper.className).toMatch(/custom/);
    expect(wrapper.className).toMatch(/inline/);
  });

  it('cursor re-anchors on null→non-null transition but not on subsequent value changes', async () => {
    const user = userEvent.setup();
    function Driver() {
      const [v, setV] = useState<Date | null>(null);
      return (
        <>
          <InlineDatePicker value={v} onChange={setV} aria-label="Date" />
          <button onClick={() => setV(new Date(2026, 4, 21))}>Set May 21</button>
          <button onClick={() => setV(new Date(2026, 6, 10))}>Set July 10</button>
        </>
      );
    }
    render(<Driver />, { wrapper: wrap() });
    // First non-null arrival → cursor anchors to May.
    await user.click(screen.getByRole('button', { name: 'Set May 21' }));
    expect(screen.getByText(/May 2026/)).toBeInTheDocument();
    // Subsequent programmatic change → cursor stays on May (does NOT scroll to July).
    await user.click(screen.getByRole('button', { name: 'Set July 10' }));
    expect(screen.getByText(/May 2026/)).toBeInTheDocument();
    expect(screen.queryByText(/July 2026/)).not.toBeInTheDocument();
  });

  it('ru-RU locale shows Cyrillic month + weekday labels', () => {
    render(
      <InlineDatePicker defaultValue={new Date(2026, 4, 21)} locale="ru-RU" aria-label="Дата" />,
      { wrapper: wrap('ru-RU') },
    );
    expect(document.body.textContent).toMatch(/[Ѐ-ӿ]/);
  });

  describe('granularity', () => {
    it('granularity defaults to "day" — no time input rendered', () => {
      render(<InlineDatePicker defaultValue={new Date(2026, 4, 28, 14, 30)} aria-label="Date" />, {
        wrapper: wrap(),
      });
      expect(screen.queryByLabelText('Time')).not.toBeInTheDocument();
    });

    it('granularity="minute" renders the time input inline (hourCycle="24")', () => {
      render(
        <InlineDatePicker
          defaultValue={new Date(2026, 4, 28, 14, 30)}
          granularity="minute"
          hourCycle="24"
          aria-label="Date"
        />,
        { wrapper: wrap() },
      );
      const timeInput = screen.getByRole('textbox', { name: 'Time' });
      expect(timeInput).toHaveValue('14:30');
      expect(timeInput).toHaveAttribute('type', 'text');
    });

    it('granularity="minute" hourCycle="auto" + en-US shows AM/PM in time input', () => {
      render(
        <InlineDatePicker
          defaultValue={new Date(2026, 4, 28, 14, 30)}
          granularity="minute"
          aria-label="Date"
        />,
        { wrapper: wrap() },
      );
      expect(screen.getByRole('textbox', { name: 'Time' })).toHaveValue('2:30 PM');
    });

    it('granularity="minute" hourCycle="12" forces AM/PM time input regardless of locale', () => {
      render(
        <InlineDatePicker
          defaultValue={new Date(2026, 4, 28, 14, 30)}
          granularity="minute"
          hourCycle="12"
          locale="ru-RU"
          aria-label="Date"
        />,
        { wrapper: wrap('ru-RU') },
      );
      expect(screen.getByRole('textbox', { name: 'Time' })).toHaveValue('2:30 PM');
    });

    it('picking a date from null defaults time to 00:00', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn<(d: Date | null) => void>();
      render(<InlineDatePicker granularity="minute" onChange={onChange} aria-label="Date" />, {
        wrapper: wrap(),
      });
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
        <InlineDatePicker
          granularity="minute"
          defaultValue={new Date(2026, 4, 28, 14, 30)}
          onChange={onChange}
          aria-label="Date"
        />,
        { wrapper: wrap() },
      );
      const [cell15] = screen.getAllByRole('gridcell', { name: /^15$/ });
      await user.click(cell15);
      const got = onChange.mock.calls[0][0] as Date;
      expect(got.getDate()).toBe(15);
      expect(got.getHours()).toBe(14);
      expect(got.getMinutes()).toBe(30);
    });

    it('typing into the time input + blur updates time only', async () => {
      const onChange = vi.fn<(d: Date | null) => void>();
      render(
        <InlineDatePicker
          granularity="minute"
          defaultValue={new Date(2026, 4, 28, 14, 30)}
          onChange={onChange}
          aria-label="Date"
        />,
        { wrapper: wrap() },
      );
      const timeInput = screen.getByRole('textbox', { name: 'Time' });
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

    it('time input is disabled when value is null', () => {
      render(<InlineDatePicker granularity="minute" aria-label="Date" />, { wrapper: wrap() });
      expect(screen.getByRole('textbox', { name: 'Time' })).toBeDisabled();
    });

    it('timeStep={30} rounds typed "14:22" to 14:30 on blur', async () => {
      const onChange = vi.fn<(d: Date | null) => void>();
      render(
        <InlineDatePicker
          granularity="minute"
          timeStep={30}
          defaultValue={new Date(2026, 4, 28, 10, 0)}
          onChange={onChange}
          aria-label="Date"
        />,
        { wrapper: wrap() },
      );
      const timeInput = screen.getByRole('textbox', { name: 'Time' });
      fireEvent.change(timeInput, { target: { value: '14:22' } });
      fireEvent.blur(timeInput);
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const got = onChange.mock.calls.at(-1)?.[0] as Date;
      expect(got.getHours()).toBe(14);
      expect(got.getMinutes()).toBe(30);
    });

    it('hidden form mirror emits ISO datetime when granularity="minute"', () => {
      const { container } = render(
        <InlineDatePicker
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
        <InlineDatePicker
          name="when"
          defaultValue={new Date(2026, 4, 28, 14, 30)}
          aria-label="Date"
        />,
        { wrapper: wrap() },
      );
      const hidden = container.querySelector<HTMLInputElement>('input[type="hidden"][name="when"]');
      expect(hidden?.value).toBe('2026-05-28');
    });
  });
});
