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

describe('DatePickerGrid', () => {
  it('renders the cursor month label and 7 weekday headers', () => {
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={null}
        onSelect={() => {}}
        onCursorChange={() => {}}
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
        locale="ru-RU"
      />,
      { wrapper: wrap('ru-RU') },
    );
    expect(document.body.textContent).toMatch(/[Ѐ-ӿ]/);
  });

  it('range mode: rangeStart and rangeEnd cells carry aria-selected and class markers', () => {
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={null}
        onSelect={() => {}}
        onCursorChange={() => {}}
        selectionMode="range"
        rangeStart={new Date(2026, 4, 5)}
        rangeEnd={new Date(2026, 4, 10)}
      />,
      { wrapper: wrap() },
    );
    // Use selected:true to distinguish May 5 from the June 5 trailing cell.
    const startCell = screen.getByRole('gridcell', { name: /^5$/, selected: true });
    const endCell = screen.getByRole('gridcell', { name: /^10$/ });
    expect(startCell).toHaveAttribute('aria-selected', 'true');
    expect(endCell).toHaveAttribute('aria-selected', 'true');
    expect(startCell.className).toMatch(/rangeStart/);
    expect(endCell.className).toMatch(/rangeEnd/);
    // Middle cells get .inRange
    const middle = screen.getByRole('gridcell', { name: /^7$/ });
    expect(middle.className).toMatch(/inRange/);
  });

  it('range mode: hoverDate previews end when only rangeStart is set', () => {
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={null}
        onSelect={() => {}}
        onCursorChange={() => {}}
        selectionMode="range"
        rangeStart={new Date(2026, 4, 5)}
        hoverDate={new Date(2026, 4, 12)}
      />,
      { wrapper: wrap() },
    );
    // Use selected:true to distinguish May 5 from the June 5 trailing cell.
    const startCell = screen.getByRole('gridcell', { name: /^5$/, selected: true });
    const hoverEndCell = screen.getByRole('gridcell', { name: /^12$/ });
    expect(startCell.className).toMatch(/rangeStart/);
    expect(hoverEndCell.className).toMatch(/rangeEnd/);
    expect(screen.getByRole('gridcell', { name: /^8$/ }).className).toMatch(/inRange/);
  });

  it('range mode: fires onHoverDate on cell mouseenter and null on grid mouseleave', async () => {
    const user = userEvent.setup();
    const onHoverDate = vi.fn<(d: Date | null) => void>();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={null}
        onSelect={() => {}}
        onCursorChange={() => {}}
        selectionMode="range"
        rangeStart={new Date(2026, 4, 5)}
        onHoverDate={onHoverDate}
      />,
      { wrapper: wrap() },
    );
    const cell = screen.getByRole('gridcell', { name: /^12$/ });
    await user.hover(cell);
    expect(onHoverDate).toHaveBeenCalledWith(expect.any(Date));
    expect(onHoverDate.mock.calls.at(-1)?.[0]?.getDate()).toBe(12);

    // Move the pointer off the entire grid (somewhere outside).
    await user.unhover(cell);
    // userEvent.unhover only triggers cell-level mouseleave; we need
    // the grid-container leave. Manually dispatch on the grid element.
    // Assert presence explicitly so a structural break (e.g. role="grid"
    // removed) fails the test loudly instead of silently skipping.
    const grid = document.querySelector<HTMLElement>('[role="grid"]');
    expect(grid).not.toBeNull();
    grid!.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
    expect(onHoverDate).toHaveBeenLastCalledWith(null);
  });

  it('range mode: disabled cell does not fire onHoverDate', async () => {
    const user = userEvent.setup();
    const onHoverDate = vi.fn();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={null}
        onSelect={() => {}}
        onCursorChange={() => {}}
        selectionMode="range"
        rangeStart={new Date(2026, 4, 5)}
        isDateDisabled={(d) => d.getDate() === 12}
        onHoverDate={onHoverDate}
      />,
      { wrapper: wrap() },
    );
    const disabled = screen.getByRole('gridcell', { name: /^12$/ });
    await user.hover(disabled);
    expect(onHoverDate).not.toHaveBeenCalled();
  });

  it('chevrons={false} hides nav buttons but keeps the month label', () => {
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={null}
        onSelect={() => {}}
        onCursorChange={() => {}}
        chevrons={false}
      />,
      { wrapper: wrap() },
    );
    expect(screen.queryByRole('button', { name: 'Previous month' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next month' })).toBeNull();
    expect(screen.getByText(/May 2026/)).toBeInTheDocument();
  });

  it('disabled grid: chevrons are disabled, cells get tabIndex=-1, clicks are no-ops', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onCursorChange = vi.fn();
    render(
      <DatePickerGrid
        cursor={new Date(2026, 4, 1)}
        value={null}
        onSelect={onSelect}
        onCursorChange={onCursorChange}
        disabled
      />,
      { wrapper: wrap() },
    );
    // Chevrons disabled
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled();
    // Cells non-focusable (tabIndex -1)
    const cell15 = screen.getByRole('gridcell', { name: /^15$/ });
    expect(cell15).toHaveAttribute('tabindex', '-1');
    // Click no-ops
    await user.click(cell15);
    expect(onSelect).not.toHaveBeenCalled();
    // Keyboard no-ops (programmatic focus + Space/Enter/arrows/PageDown)
    cell15.focus();
    await user.keyboard(' ');
    expect(onSelect).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');
    expect(onSelect).not.toHaveBeenCalled();
    await user.keyboard('{ArrowRight}');
    await user.keyboard('{PageDown}');
    expect(onCursorChange).not.toHaveBeenCalled();
    // Cell carries aria-disabled so AT announces it as disabled.
    expect(cell15).toHaveAttribute('aria-disabled', 'true');
  });
});
