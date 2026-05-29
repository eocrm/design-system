import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type ReactNode } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { InlineDateRangePicker } from './InlineDateRangePicker';
import type { DateRange } from './utils';

function wrap(locale = 'en-US') {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

const MAY = (d: number) => new Date(2026, 4, d);
const JUN = (d: number) => new Date(2026, 5, d);
const SAMPLE: DateRange = { start: MAY(21), end: JUN(4) };

describe('InlineDateRangePicker', () => {
  it('renders two month grids with external prev/next chevrons', () => {
    render(<InlineDateRangePicker defaultValue={SAMPLE} aria-label="Range" />, { wrapper: wrap() });
    expect(screen.getAllByRole('grid')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeInTheDocument();
    expect(screen.getByText(/May 2026/)).toBeInTheDocument();
    expect(screen.getByText(/June 2026/)).toBeInTheDocument();
  });

  it('controlled: value updates when consumer changes it', () => {
    const { rerender } = render(<InlineDateRangePicker value={SAMPLE} aria-label="Range" />, {
      wrapper: wrap(),
    });
    // May 21 is rangeStart, June 4 is rangeEnd
    expect(
      screen.getAllByRole('gridcell', { name: /^21$/, selected: true })[0],
    ).toBeInTheDocument();
    expect(screen.getAllByRole('gridcell', { name: /^4$/, selected: true })[0]).toBeInTheDocument();
    // Change the value via re-render
    rerender(<InlineDateRangePicker value={{ start: MAY(10), end: MAY(15) }} aria-label="Range" />);
    expect(
      screen.getAllByRole('gridcell', { name: /^10$/, selected: true })[0],
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('gridcell', { name: /^15$/, selected: true })[0],
    ).toBeInTheDocument();
  });

  it('two grid clicks commit a range (start then end)', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(<InlineDateRangePicker defaultValue={null} onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    const fives = screen.getAllByRole('gridcell', { name: /^5$/ });
    await user.click(fives[0]);
    expect(onChange).not.toHaveBeenCalled();
    const tens = screen.getAllByRole('gridcell', { name: /^10$/ });
    await user.click(tens[0]);
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    const r = onChange.mock.calls[0][0]!;
    expect(r.start.getDate()).toBe(5);
    expect(r.end.getDate()).toBe(10);
  });

  it('clicking end-before-start auto-swaps', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(<InlineDateRangePicker defaultValue={null} onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    const tens = screen.getAllByRole('gridcell', { name: /^10$/ });
    await user.click(tens[0]);
    const fives = screen.getAllByRole('gridcell', { name: /^5$/ });
    await user.click(fives[0]);
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const r = onChange.mock.calls[0][0]!;
    expect(r.start.getDate()).toBe(5);
    expect(r.end.getDate()).toBe(10);
  });

  it('third click after a committed range restarts selection', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(<InlineDateRangePicker defaultValue={null} onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    // First range: 5 → 10
    const fives = screen.getAllByRole('gridcell', { name: /^5$/ });
    const tens = screen.getAllByRole('gridcell', { name: /^10$/ });
    await user.click(fives[0]);
    await user.click(tens[0]);
    expect(onChange).toHaveBeenCalledTimes(1);
    // Third click → restart. Second range: 15 → 20.
    const fifteens = screen.getAllByRole('gridcell', { name: /^15$/ });
    await user.click(fifteens[0]);
    expect(onChange).toHaveBeenCalledTimes(1);
    const twenties = screen.getAllByRole('gridcell', { name: /^20$/ });
    await user.click(twenties[0]);
    expect(onChange).toHaveBeenCalledTimes(2);
    const r2 = onChange.mock.calls[1][0]!;
    expect(r2.start.getDate()).toBe(15);
    expect(r2.end.getDate()).toBe(20);
  });

  it('same-cell double-click commits a single-day range', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(<InlineDateRangePicker defaultValue={null} onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    const fives = screen.getAllByRole('gridcell', { name: /^5$/ });
    await user.click(fives[0]);
    await user.click(fives[0]);
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    const r = onChange.mock.calls[0][0]!;
    expect(r.start.getDate()).toBe(5);
    expect(r.end.getDate()).toBe(5);
  });

  it('external chevrons step the cursor (both grids advance/retreat)', async () => {
    const user = userEvent.setup();
    render(<InlineDateRangePicker defaultValue={SAMPLE} aria-label="Range" />, { wrapper: wrap() });
    await user.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText(/June 2026/)).toBeInTheDocument();
    expect(screen.getByText(/July 2026/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    await user.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByText(/April 2026/)).toBeInTheDocument();
    expect(screen.getByText(/May 2026/)).toBeInTheDocument();
  });

  it('keyboard ArrowRight at left-grid end-of-month advances the cursor (exercises handleLeftGridCursorChange)', async () => {
    const user = userEvent.setup();
    render(
      <InlineDateRangePicker
        defaultValue={{ start: new Date(2026, 4, 31), end: new Date(2026, 4, 31) }}
        aria-label="Range"
      />,
      { wrapper: wrap() },
    );
    // Focus the rangeStart cell (May 31 in left grid).
    const focusable = document.querySelectorAll<HTMLButtonElement>(
      '[role="gridcell"][tabindex="0"]',
    );
    expect(focusable.length).toBeGreaterThan(0);
    focusable[0].focus();
    expect((document.activeElement as HTMLElement)?.textContent).toBe('31');
    await user.keyboard('{ArrowRight}');
    expect((document.activeElement as HTMLElement)?.textContent).toBe('1');
  });

  it('keyboard ArrowLeft from a right-grid cell shifts cursor backward (exercises handleRightGridCursorChange)', async () => {
    const user = userEvent.setup();
    // defaultValue spans April→May → cursor=April, LEFT=April, RIGHT=May.
    // Right grid's May 1 cell becomes the rangeEnd fallback tabIndex=0.
    render(
      <InlineDateRangePicker
        defaultValue={{ start: new Date(2026, 3, 30), end: new Date(2026, 4, 1) }}
        aria-label="Range"
      />,
      { wrapper: wrap() },
    );
    const focusable = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[role="gridcell"][tabindex="0"]'),
    );
    // Last focusable cell is the right grid's May 1 (rangeEnd in a different month from rangeStart).
    const rightMay1 = focusable[focusable.length - 1];
    rightMay1.focus();
    expect((document.activeElement as HTMLElement)?.textContent).toBe('1');
    await user.keyboard('{ArrowLeft}');
    // Right grid now shows April; focus lands on April 30.
    expect((document.activeElement as HTMLElement)?.textContent).toBe('30');
  });

  it('min / max reject out-of-range clicks', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <InlineDateRangePicker
        defaultValue={null}
        min={new Date(2026, 4, 10)}
        max={new Date(2026, 4, 20)}
        onChange={onChange}
        aria-label="Range"
      />,
      { wrapper: wrap() },
    );
    const cell5 = screen.getAllByRole('gridcell', { name: /^5$/ })[0];
    expect(cell5).toHaveAttribute('aria-disabled', 'true');
    await user.click(cell5);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('isDateDisabled blocks specific cells from both halves', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <InlineDateRangePicker
        defaultValue={null}
        isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
        onChange={onChange}
        aria-label="Range"
      />,
      { wrapper: wrap() },
    );
    // Saturday cell (some day-of-month varies — find by aria-disabled)
    const disabledCells = screen
      .getAllByRole('gridcell')
      .filter((c) => c.getAttribute('aria-disabled') === 'true');
    expect(disabledCells.length).toBeGreaterThan(0);
    await user.click(disabledCells[0]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('nameStart and nameEnd render two hidden mirrors with ISO dates', () => {
    const { container } = render(
      <InlineDateRangePicker
        nameStart="from"
        nameEnd="to"
        defaultValue={SAMPLE}
        aria-label="Range"
      />,
      { wrapper: wrap() },
    );
    const start = container.querySelector<HTMLInputElement>('input[name="from"]');
    const end = container.querySelector<HTMLInputElement>('input[name="to"]');
    expect(start?.value).toBe('2026-05-21');
    expect(end?.value).toBe('2026-06-04');
  });

  it('null value emits empty hidden mirrors', () => {
    const { container } = render(
      <InlineDateRangePicker nameStart="from" nameEnd="to" aria-label="Range" />,
      { wrapper: wrap() },
    );
    expect(container.querySelector<HTMLInputElement>('input[name="from"]')?.value).toBe('');
    expect(container.querySelector<HTMLInputElement>('input[name="to"]')?.value).toBe('');
  });

  it('disabled blocks all interaction', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <InlineDateRangePicker
        disabled
        defaultValue={SAMPLE}
        onChange={onChange}
        aria-label="Range"
      />,
      { wrapper: wrap() },
    );
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
    await user.click(screen.getAllByRole('gridcell', { name: /^15$/ })[0]);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('forwards ref to the wrapper div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<InlineDateRangePicker ref={ref} aria-label="Range" />, { wrapper: wrap() });
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges className with internal wrapper class', () => {
    const { container } = render(<InlineDateRangePicker className="custom" aria-label="Range" />, {
      wrapper: wrap(),
    });
    const wrapper = container.firstChild as HTMLDivElement;
    expect(wrapper.className).toMatch(/custom/);
    expect(wrapper.className).toMatch(/inline/);
  });

  it('ru-RU locale shows Cyrillic month + weekday labels', () => {
    render(<InlineDateRangePicker defaultValue={SAMPLE} locale="ru-RU" aria-label="Диапазон" />, {
      wrapper: wrap('ru-RU'),
    });
    expect(document.body.textContent).toMatch(/[Ѐ-ӿ]/);
  });

  describe('granularity', () => {
    it('defaults to "day" — no time inputs rendered', () => {
      render(<InlineDateRangePicker defaultValue={SAMPLE} aria-label="Range" />, {
        wrapper: wrap(),
      });
      expect(screen.queryByRole('textbox', { name: 'Start time' })).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: 'End time' })).not.toBeInTheDocument();
    });

    it('granularity="minute" renders both time inputs when value is set (hourCycle="24")', () => {
      render(
        <InlineDateRangePicker
          granularity="minute"
          hourCycle="24"
          defaultValue={{
            start: new Date(2026, 4, 21, 9, 0),
            end: new Date(2026, 5, 4, 17, 30),
          }}
          aria-label="Range"
        />,
        { wrapper: wrap() },
      );
      expect(screen.getByRole('textbox', { name: 'Start time' })).toHaveValue('09:00');
      expect(screen.getByRole('textbox', { name: 'End time' })).toHaveValue('17:30');
    });

    it('granularity="minute" hourCycle="auto" + en-US shows AM/PM in time inputs', () => {
      render(
        <InlineDateRangePicker
          granularity="minute"
          defaultValue={{
            start: new Date(2026, 4, 21, 9, 0),
            end: new Date(2026, 5, 4, 17, 30),
          }}
          aria-label="Range"
        />,
        { wrapper: wrap() },
      );
      expect(screen.getByRole('textbox', { name: 'Start time' })).toHaveValue('9:00 AM');
      expect(screen.getByRole('textbox', { name: 'End time' })).toHaveValue('5:30 PM');
    });

    it('granularity="minute" hourCycle="12" forces AM/PM in time inputs regardless of locale', () => {
      render(
        <InlineDateRangePicker
          granularity="minute"
          hourCycle="12"
          locale="ru-RU"
          defaultValue={{
            start: new Date(2026, 4, 21, 9, 0),
            end: new Date(2026, 5, 4, 17, 30),
          }}
          aria-label="Range"
        />,
        { wrapper: wrap('ru-RU') },
      );
      expect(screen.getByRole('textbox', { name: 'Start time' })).toHaveValue('9:00 AM');
      expect(screen.getByRole('textbox', { name: 'End time' })).toHaveValue('5:30 PM');
    });

    it('granularity="minute" with null value renders no time inputs (gated)', () => {
      render(
        <InlineDateRangePicker granularity="minute" defaultValue={null} aria-label="Range" />,
        { wrapper: wrap() },
      );
      expect(screen.queryByRole('textbox', { name: 'Start time' })).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: 'End time' })).not.toBeInTheDocument();
    });

    it('picking a fresh range from null defaults start=00:00 / end=23:59', async () => {
      const onChange = vi.fn<(r: DateRange | null) => void>();
      const user = userEvent.setup();
      render(
        <InlineDateRangePicker
          granularity="minute"
          defaultValue={null}
          onChange={onChange}
          aria-label="Range"
        />,
        { wrapper: wrap() },
      );
      const fives = screen.getAllByRole('gridcell', { name: /^5$/ });
      await user.click(fives[0]);
      const tens = screen.getAllByRole('gridcell', { name: /^10$/ });
      await user.click(tens[0]);
      await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
      const r = onChange.mock.calls[0][0]!;
      expect(r.start.getHours()).toBe(0);
      expect(r.start.getMinutes()).toBe(0);
      expect(r.end.getHours()).toBe(23);
      expect(r.end.getMinutes()).toBe(59);
    });

    it('picking a subsequent range preserves both existing times', async () => {
      const onChange = vi.fn<(r: DateRange | null) => void>();
      const user = userEvent.setup();
      render(
        <InlineDateRangePicker
          granularity="minute"
          defaultValue={{
            start: new Date(2026, 4, 21, 9, 0),
            end: new Date(2026, 5, 4, 17, 30),
          }}
          onChange={onChange}
          aria-label="Range"
        />,
        { wrapper: wrap() },
      );
      const fifteens = screen.getAllByRole('gridcell', { name: /^15$/ });
      await user.click(fifteens[0]);
      const twenties = screen.getAllByRole('gridcell', { name: /^20$/ });
      await user.click(twenties[0]);
      await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
      const r = onChange.mock.calls[0][0]!;
      expect(r.start.getHours()).toBe(9);
      expect(r.start.getMinutes()).toBe(0);
      expect(r.end.getHours()).toBe(17);
      expect(r.end.getMinutes()).toBe(30);
    });

    it('typing into the start-time input + blur updates start only', async () => {
      const onChange = vi.fn<(r: DateRange | null) => void>();
      render(
        <InlineDateRangePicker
          granularity="minute"
          defaultValue={{
            start: new Date(2026, 4, 21, 9, 0),
            end: new Date(2026, 5, 4, 17, 30),
          }}
          onChange={onChange}
          aria-label="Range"
        />,
        { wrapper: wrap() },
      );
      const startTime = screen.getByRole('textbox', { name: 'Start time' });
      fireEvent.change(startTime, { target: { value: '10:15' } });
      fireEvent.blur(startTime);
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const r = onChange.mock.calls.at(-1)?.[0] as DateRange;
      expect(r.start.getHours()).toBe(10);
      expect(r.start.getMinutes()).toBe(15);
      expect(r.end.getHours()).toBe(17);
      expect(r.end.getMinutes()).toBe(30);
    });

    it('typing into the end-time input + blur updates end only', async () => {
      const onChange = vi.fn<(r: DateRange | null) => void>();
      render(
        <InlineDateRangePicker
          granularity="minute"
          defaultValue={{
            start: new Date(2026, 4, 21, 9, 0),
            end: new Date(2026, 5, 4, 17, 30),
          }}
          onChange={onChange}
          aria-label="Range"
        />,
        { wrapper: wrap() },
      );
      const endTime = screen.getByRole('textbox', { name: 'End time' });
      fireEvent.change(endTime, { target: { value: '20:45' } });
      fireEvent.blur(endTime);
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const r = onChange.mock.calls.at(-1)?.[0] as DateRange;
      expect(r.start.getHours()).toBe(9);
      expect(r.start.getMinutes()).toBe(0);
      expect(r.end.getHours()).toBe(20);
      expect(r.end.getMinutes()).toBe(45);
    });

    it('same-day end-time < start-time clamps end-time to start-time', async () => {
      const onChange = vi.fn<(r: DateRange | null) => void>();
      render(
        <InlineDateRangePicker
          granularity="minute"
          defaultValue={{
            start: new Date(2026, 4, 21, 14, 0),
            end: new Date(2026, 4, 21, 18, 0),
          }}
          onChange={onChange}
          aria-label="Range"
        />,
        { wrapper: wrap() },
      );
      const endTime = screen.getByRole('textbox', { name: 'End time' });
      fireEvent.change(endTime, { target: { value: '10:00' } });
      fireEvent.blur(endTime);
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const r = onChange.mock.calls.at(-1)?.[0] as DateRange;
      expect(r.end.getHours()).toBe(14);
      expect(r.end.getMinutes()).toBe(0);
    });

    it('different-day range with end-time < start-time does NOT clamp', async () => {
      const onChange = vi.fn<(r: DateRange | null) => void>();
      render(
        <InlineDateRangePicker
          granularity="minute"
          defaultValue={{
            start: new Date(2026, 4, 21, 14, 0),
            end: new Date(2026, 4, 22, 18, 0),
          }}
          onChange={onChange}
          aria-label="Range"
        />,
        { wrapper: wrap() },
      );
      const endTime = screen.getByRole('textbox', { name: 'End time' });
      fireEvent.change(endTime, { target: { value: '08:00' } });
      fireEvent.blur(endTime);
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const r = onChange.mock.calls.at(-1)?.[0] as DateRange;
      expect(r.end.getHours()).toBe(8);
      expect(r.end.getMinutes()).toBe(0);
    });

    it('timeStep={30} rounds typed "10:22" to 10:30 on blur', async () => {
      const onChange = vi.fn<(r: DateRange | null) => void>();
      render(
        <InlineDateRangePicker
          granularity="minute"
          timeStep={30}
          defaultValue={{
            start: new Date(2026, 4, 21, 9, 0),
            end: new Date(2026, 5, 4, 17, 30),
          }}
          onChange={onChange}
          aria-label="Range"
        />,
        { wrapper: wrap() },
      );
      const startTime = screen.getByRole('textbox', { name: 'Start time' });
      fireEvent.change(startTime, { target: { value: '10:22' } });
      fireEvent.blur(startTime);
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const r = onChange.mock.calls.at(-1)?.[0] as DateRange;
      expect(r.start.getHours()).toBe(10);
      expect(r.start.getMinutes()).toBe(30);
    });

    it('hidden form mirrors emit ISO datetime when granularity="minute"', () => {
      const { container } = render(
        <InlineDateRangePicker
          granularity="minute"
          nameStart="from"
          nameEnd="to"
          defaultValue={{
            start: new Date(2026, 4, 21, 9, 0),
            end: new Date(2026, 5, 4, 17, 30),
          }}
          aria-label="Range"
        />,
        { wrapper: wrap() },
      );
      const start = container.querySelector<HTMLInputElement>('input[name="from"]');
      const end = container.querySelector<HTMLInputElement>('input[name="to"]');
      expect(start?.value).toBe('2026-05-21T09:00');
      expect(end?.value).toBe('2026-06-04T17:30');
    });

    it('hidden form mirrors still emit ISO date when granularity="day"', () => {
      const { container } = render(
        <InlineDateRangePicker
          nameStart="from"
          nameEnd="to"
          defaultValue={SAMPLE}
          aria-label="Range"
        />,
        { wrapper: wrap() },
      );
      const start = container.querySelector<HTMLInputElement>('input[name="from"]');
      const end = container.querySelector<HTMLInputElement>('input[name="to"]');
      expect(start?.value).toBe('2026-05-21');
      expect(end?.value).toBe('2026-06-04');
    });
  });
});
