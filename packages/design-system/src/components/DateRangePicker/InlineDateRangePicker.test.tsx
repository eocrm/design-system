import { render, screen, waitFor } from '@testing-library/react';
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
});
