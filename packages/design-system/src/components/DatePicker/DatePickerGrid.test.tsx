import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { DatePickerGrid } from './DatePickerGrid';

function wrap(locale = 'en-US') {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

const LABELS = { previousMonth: 'Previous month', nextMonth: 'Next month' };

describe('DatePickerGrid', () => {
  it('renders the cursor month label and 7 weekday headers', () => {
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={null}
        onSelect={() => {}}
        onCursorChange={() => {}}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    expect(screen.getByText(/May 2026/)).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(7);
  });

  it('marks the selected date with aria-selected="true"', () => {
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={new Date(2026, 4, 21)}
        onSelect={() => {}}
        onCursorChange={() => {}}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    const cell = screen.getByRole('gridcell', { selected: true });
    expect(cell.textContent).toMatch(/^21$/);
  });

  it('fires onSelect when a day cell is clicked', async () => {
    const onSelect = vi.fn<(d: Date) => void>();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={null}
        onSelect={onSelect}
        onCursorChange={() => {}}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    await userEvent.click(screen.getByRole('gridcell', { name: /^21$/ }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].getDate()).toBe(21);
  });

  it('disables cells out of [min, max] and skips them on click', async () => {
    const onSelect = vi.fn();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={null}
        onSelect={onSelect}
        onCursorChange={() => {}}
        min={new Date(2026, 4, 10)}
        max={new Date(2026, 4, 20)}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    const cell9 = screen.getByRole('gridcell', { name: /^9$/ });
    expect(cell9).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(cell9);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('disables cells via isDateDisabled', () => {
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={null}
        onSelect={() => {}}
        onCursorChange={() => {}}
        isDateDisabled={(d) => d.getDay() === 0 || d.getDay() === 6}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    // Sat May 9, 2026 — picked because /^9$/ is unique in the May grid
    // (May 2/16/23/30 and June 6 are all Saturdays but their day numbers
    // collide with adjacent-month spill-over cells).
    const sat = screen.getByRole('gridcell', { name: /^9$/ });
    expect(sat).toHaveAttribute('aria-disabled', 'true');
  });

  it('previous month button fires onCursorChange with -1 month', async () => {
    const onCursorChange = vi.fn<(d: Date) => void>();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 15)}
        value={null}
        onSelect={() => {}}
        onCursorChange={onCursorChange}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    const arg = onCursorChange.mock.calls[0][0];
    expect(arg.getMonth()).toBe(3); // April
  });

  it('next month button fires onCursorChange with +1 month', async () => {
    const onCursorChange = vi.fn<(d: Date) => void>();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 15)}
        value={null}
        onSelect={() => {}}
        onCursorChange={onCursorChange}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    await userEvent.click(screen.getByRole('button', { name: 'Next month' }));
    const arg = onCursorChange.mock.calls[0][0];
    expect(arg.getMonth()).toBe(5); // June
  });

  it('arrow keys move focus by 1 day', async () => {
    const user = userEvent.setup();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={new Date(2026, 4, 15)}
        onSelect={() => {}}
        onCursorChange={() => {}}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    const cell15 = screen.getByRole('gridcell', { name: /^15$/ });
    cell15.focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement?.textContent).toBe('16');
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement?.textContent).toBe('23');
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement?.textContent).toBe('22');
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement?.textContent).toBe('15');
  });

  it('arrow keys skip disabled cells', async () => {
    const user = userEvent.setup();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={new Date(2026, 4, 15)}
        onSelect={() => {}}
        onCursorChange={() => {}}
        isDateDisabled={(d) => d.getDate() === 16}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    const cell15 = screen.getByRole('gridcell', { name: /^15$/ });
    cell15.focus();
    await user.keyboard('{ArrowRight}');
    // 16 disabled → focus jumps to 17
    expect(document.activeElement?.textContent).toBe('17');
  });

  it('Enter on focused cell fires onSelect', async () => {
    const onSelect = vi.fn<(d: Date) => void>();
    const user = userEvent.setup();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={new Date(2026, 4, 15)}
        onSelect={onSelect}
        onCursorChange={() => {}}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    const cell15 = screen.getByRole('gridcell', { name: /^15$/ });
    cell15.focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].getDate()).toBe(15);
  });

  it('PageDown advances the cursor a month', async () => {
    const onCursorChange = vi.fn<(d: Date) => void>();
    const user = userEvent.setup();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 15)}
        value={null}
        onSelect={() => {}}
        onCursorChange={onCursorChange}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    const cell = screen.getByRole('gridcell', { name: /^15$/ });
    cell.focus();
    await user.keyboard('{PageDown}');
    expect(onCursorChange).toHaveBeenCalled();
    expect(onCursorChange.mock.calls[0][0].getMonth()).toBe(5);
  });

  it('Home / End move focus to start / end of week', async () => {
    const user = userEvent.setup();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={new Date(2026, 4, 20)} // Wed May 20
        onSelect={() => {}}
        onCursorChange={() => {}}
        labels={LABELS}
      />,
      { wrapper: wrap() },
    );
    const cell = screen.getByRole('gridcell', { name: /^20$/ });
    cell.focus();
    await user.keyboard('{Home}');
    // en-US weeks start on Sunday → Sun May 17
    expect(document.activeElement?.textContent).toBe('17');
    await user.keyboard('{End}');
    // Sat May 23
    expect(document.activeElement?.textContent).toBe('23');
  });

  it('uses locale-aware month + weekday labels (ru-RU has Cyrillic)', () => {
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={null}
        onSelect={() => {}}
        onCursorChange={() => {}}
        labels={LABELS}
        locale="ru-RU"
      />,
      { wrapper: wrap('ru-RU') },
    );
    expect(document.body.textContent).toMatch(/[Ѐ-ӿ]/);
  });
});
