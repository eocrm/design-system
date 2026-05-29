import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type ReactNode, useState } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { DateRangePicker } from './DateRangePicker';
import type { DateRange } from './utils';

function wrap(locale = 'en-US') {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

const MAY = (d: number) => new Date(2026, 4, d);
const JUN = (d: number) => new Date(2026, 5, d);
const SAMPLE_RANGE: DateRange = { start: MAY(21), end: JUN(4) };

describe('DateRangePicker', () => {
  it('renders the formatted defaultValue in the input (uncontrolled)', () => {
    render(<DateRangePicker defaultValue={SAMPLE_RANGE} aria-label="Range" />, {
      wrapper: wrap(),
    });
    expect(screen.getByRole('textbox', { name: 'Range' })).toHaveValue('05/21/2026 — 06/04/2026');
  });

  it('merges className from props with the internal wrapper class', () => {
    const { container } = render(<DateRangePicker className="custom" aria-label="Range" />, {
      wrapper: wrap(),
    });
    // Wrapper is the first <div> the component renders.
    const wrapper = container.firstChild as HTMLDivElement;
    expect(wrapper.className).toMatch(/custom/);
    expect(wrapper.className).toMatch(/wrapper/); // CSS-modules hash contains the source key
  });

  it('controlled value updates input', () => {
    const { rerender } = render(<DateRangePicker value={SAMPLE_RANGE} aria-label="Range" />, {
      wrapper: wrap(),
    });
    expect(screen.getByRole('textbox')).toHaveValue('05/21/2026 — 06/04/2026');
    rerender(<DateRangePicker value={{ start: MAY(1), end: MAY(7) }} aria-label="Range" />);
    expect(screen.getByRole('textbox')).toHaveValue('05/01/2026 — 05/07/2026');
  });

  it('typing a valid range and blurring commits via onChange', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(<DateRangePicker onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    const input = screen.getByRole('textbox');
    await user.type(input, '5/21/2026 — 6/4/2026');
    input.blur();
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const committed = onChange.mock.calls.at(-1)![0]!;
    expect(committed.start.getDate()).toBe(21);
    expect(committed.end.getDate()).toBe(4);
  });

  it('typing an invalid range reverts to the previous value', async () => {
    const user = userEvent.setup();
    function Driver() {
      const [v, setV] = useState<DateRange | null>(SAMPLE_RANGE);
      return <DateRangePicker value={v} onChange={setV} aria-label="Range" />;
    }
    render(<Driver />, { wrapper: wrap() });
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'not a range');
    input.blur();
    await waitFor(() => expect(input).toHaveValue('05/21/2026 — 06/04/2026'));
  });

  it('typing out-of-order auto-swaps on commit', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(<DateRangePicker onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    const input = screen.getByRole('textbox');
    await user.type(input, '6/4/2026 — 5/21/2026');
    input.blur();
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const committed = onChange.mock.calls.at(-1)![0]!;
    expect(committed.start.getDate()).toBe(21);
    expect(committed.start.getMonth()).toBe(4); // May
    expect(committed.end.getDate()).toBe(4);
    expect(committed.end.getMonth()).toBe(5); // June
  });

  it('Enter in the input commits and closes the popover', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(<DateRangePicker onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    const input = screen.getByRole('textbox');
    await user.click(input);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.type(input, '5/21/2026 — 6/4/2026{Enter}');
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('ArrowDown opens popover and focuses today/start cell', async () => {
    const user = userEvent.setup();
    render(<DateRangePicker aria-label="Range" />, { wrapper: wrap() });
    await user.click(screen.getByRole('textbox'));
    await user.keyboard('{ArrowDown}');
    await waitFor(() => {
      const active = document.activeElement;
      expect(active?.getAttribute('role')).toBe('gridcell');
    });
  });

  it('Escape closes the popover and restores focus to the input', async () => {
    const user = userEvent.setup();
    render(<DateRangePicker aria-label="Range" />, { wrapper: wrap() });
    const input = screen.getByRole('textbox');
    await user.click(input);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(document.activeElement).toBe(input);
  });

  // Both grids show overlapping cell numbers when the cursor is near a
  // month boundary. getAllByRole returns DOM order, which is left-grid-first
  // — so [0] is always the LEFT grid's cell. Keep this convention across
  // the four range-selection tests below.
  it('two grid clicks commit a range (start then end)', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(<DateRangePicker defaultValue={null} onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    await user.click(screen.getByRole('textbox'));
    // Anchor cursor at May 2026 by typing then clearing — simpler: just
    // grab any visible "5" cell in the left grid. Two grids both have a 5;
    // getAllByRole returns both. Click the first.
    const fives = screen.getAllByRole('gridcell', { name: /^5$/ });
    await user.click(fives[0]);
    expect(onChange).not.toHaveBeenCalled(); // not yet committed
    const tens = screen.getAllByRole('gridcell', { name: /^10$/ });
    await user.click(tens[0]);
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    const r = onChange.mock.calls[0][0]!;
    expect(r.start.getDate()).toBe(5);
    expect(r.end.getDate()).toBe(10);
  });

  it('clicking end before start auto-swaps', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(<DateRangePicker defaultValue={null} onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    await user.click(screen.getByRole('textbox'));
    const tens = screen.getAllByRole('gridcell', { name: /^10$/ });
    await user.click(tens[0]);
    const fives = screen.getAllByRole('gridcell', { name: /^5$/ });
    await user.click(fives[0]);
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const r = onChange.mock.calls[0][0]!;
    expect(r.start.getDate()).toBe(5);
    expect(r.end.getDate()).toBe(10);
  });

  it('same-cell double-click commits a single-day range', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(<DateRangePicker defaultValue={null} onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    await user.click(screen.getByRole('textbox'));
    const fives = screen.getAllByRole('gridcell', { name: /^5$/ });
    await user.click(fives[0]);
    await user.click(fives[0]);
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const r = onChange.mock.calls[0][0]!;
    expect(r.start.getDate()).toBe(5);
    expect(r.end.getDate()).toBe(5);
  });

  it('third click after a committed range restarts selection', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(<DateRangePicker defaultValue={null} onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    await user.click(screen.getByRole('textbox'));
    const fives = screen.getAllByRole('gridcell', { name: /^5$/ });
    const tens = screen.getAllByRole('gridcell', { name: /^10$/ });
    await user.click(fives[0]);
    await user.click(tens[0]);
    // Popover closes; reopen.
    await user.click(screen.getByRole('textbox'));
    // Now click a third cell — should restart, not commit anything.
    const fifteens = screen.getAllByRole('gridcell', { name: /^15$/ });
    await user.click(fifteens[0]);
    // Only the first range commit has happened so far.
    expect(onChange).toHaveBeenCalledTimes(1);
    const twenties = screen.getAllByRole('gridcell', { name: /^20$/ });
    await user.click(twenties[0]);
    // Now the second commit lands.
    expect(onChange).toHaveBeenCalledTimes(2);
    const r2 = onChange.mock.calls[1][0]!;
    expect(r2.start.getDate()).toBe(15);
    expect(r2.end.getDate()).toBe(20);
  });

  it('clear button resets the value and keeps focus on the input', async () => {
    const onChange = vi.fn<(r: DateRange | null) => void>();
    const user = userEvent.setup();
    render(<DateRangePicker defaultValue={SAMPLE_RANGE} onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(document.activeElement).toBe(screen.getByRole('textbox'));
  });

  it('renders both hidden form mirrors when nameStart and nameEnd are set', () => {
    const { container } = render(
      <DateRangePicker
        nameStart="bookingStart"
        nameEnd="bookingEnd"
        defaultValue={SAMPLE_RANGE}
        aria-label="Range"
      />,
      { wrapper: wrap() },
    );
    const start = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="bookingStart"]',
    );
    const end = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="bookingEnd"]',
    );
    expect(start?.value).toBe('2026-05-21');
    expect(end?.value).toBe('2026-06-04');
  });

  it('renders empty hidden mirrors when value is null', () => {
    const { container } = render(
      <DateRangePicker nameStart="bookingStart" nameEnd="bookingEnd" aria-label="Range" />,
      { wrapper: wrap() },
    );
    const start = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="bookingStart"]',
    );
    expect(start?.value).toBe('');
  });

  it('`disabled` disables the input and the open-calendar button', () => {
    render(<DateRangePicker disabled defaultValue={SAMPLE_RANGE} aria-label="Range" />, {
      wrapper: wrap(),
    });
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Open calendar' })).toBeDisabled();
  });

  it('`invalid` sets aria-invalid="true"', () => {
    render(<DateRangePicker invalid aria-label="Range" />, { wrapper: wrap() });
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('forwards ref to the typed input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<DateRangePicker ref={ref} aria-label="Range" />, { wrapper: wrap() });
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('typed range outside [min, max] reverts on blur', async () => {
    const user = userEvent.setup();
    function Driver() {
      const [v, setV] = useState<DateRange | null>(SAMPLE_RANGE);
      return (
        <DateRangePicker value={v} onChange={setV} min={MAY(15)} max={JUN(15)} aria-label="Range" />
      );
    }
    render(<Driver />, { wrapper: wrap() });
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '5/10/2026 — 5/12/2026');
    input.blur();
    await waitFor(() => expect(input).toHaveValue('05/21/2026 — 06/04/2026'));
  });

  it('ru-RU formats DD.MM.YYYY — DD.MM.YYYY', () => {
    render(<DateRangePicker defaultValue={SAMPLE_RANGE} locale="ru-RU" aria-label="Range" />, {
      wrapper: wrap('ru-RU'),
    });
    expect(screen.getByRole('textbox')).toHaveValue('21.05.2026 — 04.06.2026');
  });

  it('click outside closes the popover and commits any pending draft exactly once', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(r: DateRange | null) => void>();
    render(<DateRangePicker onChange={onChange} aria-label="Range" />, {
      wrapper: wrap(),
    });
    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.type(input, '5/21/2026 — 6/4/2026');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.click(document.body);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('keyboard ArrowRight at left-grid end-of-month advances the cursor (exercises handleLeftGridCursorChange)', async () => {
    const user = userEvent.setup();
    // Anchor cursor on May 2026 by providing a defaultValue in May.
    render(
      <DateRangePicker
        defaultValue={{ start: new Date(2026, 4, 31), end: new Date(2026, 4, 31) }}
        aria-label="Range"
      />,
      { wrapper: wrap() },
    );
    await user.click(screen.getByRole('textbox'));
    await user.keyboard('{ArrowDown}'); // focus into grid on May 31 cell
    // Confirm we're on May 31.
    expect((document.activeElement as HTMLElement)?.textContent).toBe('31');
    await user.keyboard('{ArrowRight}');
    // June 1 cell — could be in either grid depending on cursor shift; assert text content.
    expect((document.activeElement as HTMLElement)?.textContent).toBe('1');
  });

  it('applies size class names for sm / md / lg', () => {
    const { rerender, container } = render(<DateRangePicker size="sm" aria-label="Sized" />, {
      wrapper: wrap(),
    });
    expect(container.querySelector('[class*="size-sm"]')).not.toBeNull();
    rerender(<DateRangePicker size="md" aria-label="Sized" />);
    expect(container.querySelector('[class*="size-md"]')).not.toBeNull();
    rerender(<DateRangePicker size="lg" aria-label="Sized" />);
    expect(container.querySelector('[class*="size-lg"]')).not.toBeNull();
  });

  it('defaults to size="md" when no size prop is passed', () => {
    const { container } = render(<DateRangePicker aria-label="Default" />, { wrapper: wrap() });
    expect(container.querySelector('[class*="size-md"]')).not.toBeNull();
  });

  describe('granularity', () => {
    it('defaults to "day" — no time inputs, no HH:mm in trigger', async () => {
      const user = userEvent.setup();
      render(<DateRangePicker defaultValue={SAMPLE_RANGE} aria-label="Range" />, {
        wrapper: wrap(),
      });
      expect(screen.getByRole('textbox')).toHaveValue('05/21/2026 — 06/04/2026');
      await user.click(screen.getByRole('textbox'));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: 'Start time' })).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: 'End time' })).not.toBeInTheDocument();
    });

    it('granularity="minute" renders both time inputs in the popover (hourCycle="24")', async () => {
      const user = userEvent.setup();
      const startDate = new Date(2026, 4, 21, 9, 0);
      const endDate = new Date(2026, 5, 4, 17, 30);
      render(
        <DateRangePicker
          defaultValue={{ start: startDate, end: endDate }}
          granularity="minute"
          hourCycle="24"
          aria-label="Range"
        />,
        { wrapper: wrap() },
      );
      await user.click(screen.getByRole('textbox', { name: 'Range' }));
      expect(await screen.findByRole('textbox', { name: 'Start time' })).toHaveValue('09:00');
      expect(await screen.findByRole('textbox', { name: 'End time' })).toHaveValue('17:30');
    });

    it('granularity="minute" includes HH:mm for both halves in trigger text (hourCycle="24")', () => {
      render(
        <DateRangePicker
          defaultValue={{ start: new Date(2026, 4, 21, 9, 0), end: new Date(2026, 5, 4, 17, 30) }}
          granularity="minute"
          hourCycle="24"
          aria-label="Range"
        />,
        { wrapper: wrap() },
      );
      expect(screen.getByRole('textbox')).toHaveValue('05/21/2026 09:00 — 06/04/2026 17:30');
    });

    it('granularity="minute" defaults to AM/PM in trigger for en-US (hourCycle="auto")', () => {
      render(
        <DateRangePicker
          defaultValue={{ start: new Date(2026, 4, 21, 9, 0), end: new Date(2026, 5, 4, 17, 30) }}
          granularity="minute"
          aria-label="Range"
        />,
        { wrapper: wrap() },
      );
      expect(screen.getByRole('textbox')).toHaveValue('05/21/2026 9:00 AM — 06/04/2026 5:30 PM');
    });

    it('granularity="minute" hourCycle="12" forces AM/PM regardless of locale', () => {
      render(
        <DateRangePicker
          defaultValue={{ start: new Date(2026, 4, 21, 9, 0), end: new Date(2026, 5, 4, 17, 30) }}
          granularity="minute"
          hourCycle="12"
          locale="ru-RU"
          aria-label="Range"
        />,
        { wrapper: wrap('ru-RU') },
      );
      expect(screen.getByRole('textbox')).toHaveValue('21.05.2026 9:00 AM — 04.06.2026 5:30 PM');
    });

    it('granularity="minute" hourCycle="auto" + ru-RU shows 24h in trigger', () => {
      render(
        <DateRangePicker
          defaultValue={{ start: new Date(2026, 4, 21, 9, 0), end: new Date(2026, 5, 4, 17, 30) }}
          granularity="minute"
          locale="ru-RU"
          aria-label="Range"
        />,
        { wrapper: wrap('ru-RU') },
      );
      expect(screen.getByRole('textbox')).toHaveValue('21.05.2026 09:00 — 04.06.2026 17:30');
    });

    it('picking a fresh range from null defaults start=00:00 / end=23:59', async () => {
      const onChange = vi.fn<(r: DateRange | null) => void>();
      const user = userEvent.setup();
      render(
        <DateRangePicker
          defaultValue={null}
          granularity="minute"
          onChange={onChange}
          aria-label="Range"
        />,
        { wrapper: wrap() },
      );
      await user.click(screen.getByRole('textbox'));
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
        <DateRangePicker
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
      await user.click(screen.getByRole('textbox'));
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
      const user = userEvent.setup();
      render(
        <DateRangePicker
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
      await user.click(screen.getByRole('textbox', { name: 'Range' }));
      const startTime = await screen.findByRole('textbox', { name: 'Start time' });
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
      const user = userEvent.setup();
      render(
        <DateRangePicker
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
      await user.click(screen.getByRole('textbox', { name: 'Range' }));
      const endTime = await screen.findByRole('textbox', { name: 'End time' });
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
      const user = userEvent.setup();
      render(
        <DateRangePicker
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
      await user.click(screen.getByRole('textbox', { name: 'Range' }));
      const endTime = await screen.findByRole('textbox', { name: 'End time' });
      // Try to set end earlier than start on the same day → clamp.
      fireEvent.change(endTime, { target: { value: '10:00' } });
      fireEvent.blur(endTime);
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const r = onChange.mock.calls.at(-1)?.[0] as DateRange;
      expect(r.end.getHours()).toBe(14);
      expect(r.end.getMinutes()).toBe(0);
    });

    it('different-day range with end-time < start-time does NOT clamp', async () => {
      const onChange = vi.fn<(r: DateRange | null) => void>();
      const user = userEvent.setup();
      render(
        <DateRangePicker
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
      await user.click(screen.getByRole('textbox', { name: 'Range' }));
      const endTime = await screen.findByRole('textbox', { name: 'End time' });
      fireEvent.change(endTime, { target: { value: '08:00' } });
      fireEvent.blur(endTime);
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const r = onChange.mock.calls.at(-1)?.[0] as DateRange;
      // Different day — clamp is a no-op; end stays at 08:00.
      expect(r.end.getHours()).toBe(8);
      expect(r.end.getMinutes()).toBe(0);
    });

    it('timeStep={30} rounds typed "10:22" to 10:30 on blur', async () => {
      const onChange = vi.fn<(r: DateRange | null) => void>();
      const user = userEvent.setup();
      render(
        <DateRangePicker
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
      await user.click(screen.getByRole('textbox', { name: 'Range' }));
      const startTime = await screen.findByRole('textbox', { name: 'Start time' });
      fireEvent.change(startTime, { target: { value: '10:22' } });
      fireEvent.blur(startTime);
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const r = onChange.mock.calls.at(-1)?.[0] as DateRange;
      expect(r.start.getHours()).toBe(10);
      expect(r.start.getMinutes()).toBe(30);
    });

    it('hidden form mirrors emit ISO datetime when granularity="minute"', () => {
      const { container } = render(
        <DateRangePicker
          granularity="minute"
          nameStart="bookingStart"
          nameEnd="bookingEnd"
          defaultValue={{
            start: new Date(2026, 4, 21, 9, 0),
            end: new Date(2026, 5, 4, 17, 30),
          }}
          aria-label="Range"
        />,
        { wrapper: wrap() },
      );
      const start = container.querySelector<HTMLInputElement>(
        'input[type="hidden"][name="bookingStart"]',
      );
      const end = container.querySelector<HTMLInputElement>(
        'input[type="hidden"][name="bookingEnd"]',
      );
      expect(start?.value).toBe('2026-05-21T09:00');
      expect(end?.value).toBe('2026-06-04T17:30');
    });

    it('typed datetime range parses and commits on blur', async () => {
      const onChange = vi.fn<(r: DateRange | null) => void>();
      const user = userEvent.setup();
      render(<DateRangePicker granularity="minute" onChange={onChange} aria-label="Range" />, {
        wrapper: wrap(),
      });
      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.type(input, '05/21/2026 09:00 — 06/04/2026 17:30');
      input.blur();
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const r = onChange.mock.calls.at(-1)![0]!;
      expect(r.start.getFullYear()).toBe(2026);
      expect(r.start.getHours()).toBe(9);
      expect(r.start.getMinutes()).toBe(0);
      expect(r.end.getHours()).toBe(17);
      expect(r.end.getMinutes()).toBe(30);
    });
  });

  it('keyboard ArrowLeft from a right-grid cell shifts cursor backward and focuses the left side (exercises handleRightGridCursorChange)', async () => {
    const user = userEvent.setup();
    // defaultValue spans April→May:
    //   cursor anchors to April; LEFT grid shows April, RIGHT grid shows May.
    //   tabIndexFor: LEFT grid's April 30 (rangeStart) → 0;
    //   RIGHT grid's May 1 (rangeEnd, fallback because rangeStart April 30 NOT in cursor=May) → 0.
    render(
      <DateRangePicker
        defaultValue={{ start: new Date(2026, 3, 30), end: new Date(2026, 4, 1) }}
        aria-label="Range"
      />,
      { wrapper: wrap() },
    );
    await user.click(screen.getByRole('textbox'));
    // ArrowDown takes us to the left grid's rangeStart (April 30, tabIndex=0).
    await user.keyboard('{ArrowDown}');
    await waitFor(() => expect((document.activeElement as HTMLElement)?.textContent).toBe('30'));
    // Programmatically focus the right grid's tabIndex=0 cell (May 1).
    // `user.tab()` is unreliable in jsdom for portal'd content; the goal
    // here is to land focus on May 1 so we can exercise the right-grid
    // ArrowLeft path. The tabIndex=0 placement on May 1 comes from the
    // rangeEnd-fallback in DatePickerGrid's `tabIndexFor` (rangeStart
    // April 30 is NOT in the right grid's cursor=May).
    const dialog = screen.getByRole('dialog');
    const focusableCells = dialog.querySelectorAll<HTMLButtonElement>(
      '[role="gridcell"][tabindex="0"]',
    );
    // The right grid's rangeEnd-fallback cell (May 1) is the last
    // tabIndex=0 cell in the popover. (Earlier entries: left grid's
    // April 30 rangeStart and the right grid's overflow April 30 cell
    // — same date as rangeStart, also tabIndex=0 via the rangeStart
    // match in `tabIndexFor`.)
    const rightMay1 = focusableCells[focusableCells.length - 1];
    rightMay1.focus();
    expect((document.activeElement as HTMLElement)?.textContent).toBe('1');
    // ArrowLeft from right's May 1 → target April 30 → not in right's cursor=May →
    //   right grid calls onCursorChange(April 1) → handleRightGridCursorChange
    //   translates to setCursor(addMonths(April 1, -1) = March 1) → cursor becomes
    //   March, both grids re-render: LEFT=March, RIGHT=April. Right grid's
    //   pendingFocusKey='2026-04-30' matches the right grid's now-visible April 30
    //   cell → focus lands there.
    await user.keyboard('{ArrowLeft}');
    expect((document.activeElement as HTMLElement)?.textContent).toBe('30');
  });
});
