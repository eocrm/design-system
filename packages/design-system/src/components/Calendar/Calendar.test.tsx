import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import type { ReactNode } from 'react';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { Calendar } from './Calendar';

function wrap(locale = 'en-US') {
  return ({ children }: { children: ReactNode }) => (
    <LocaleProvider locale={locale}>{children}</LocaleProvider>
  );
}

describe('Calendar', () => {
  it('renders the title with the month label', () => {
    render(<Calendar defaultValue={new Date(2026, 4, 15)} />, { wrapper: wrap() });
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/May/);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/2026/);
  });

  it('renders prev/next/today buttons', () => {
    render(<Calendar defaultValue={new Date(2026, 4, 15)} />, { wrapper: wrap() });
    expect(screen.getByLabelText('Previous month')).toBeInTheDocument();
    expect(screen.getByLabelText('Next month')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
  });

  it('Prev fires onChange with -1 month', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Calendar defaultValue={new Date(2026, 4, 15)} onChange={onChange} />,
      { wrapper: wrap() },
    );
    await user.click(screen.getByLabelText('Previous month'));
    expect(onChange).toHaveBeenCalledOnce();
    const arg = onChange.mock.calls[0][0] as Date;
    expect(arg.getMonth()).toBe(3); // April
  });

  it('Next fires onChange with +1 month', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Calendar defaultValue={new Date(2026, 4, 15)} onChange={onChange} />,
      { wrapper: wrap() },
    );
    await user.click(screen.getByLabelText('Next month'));
    const arg = onChange.mock.calls[0][0] as Date;
    expect(arg.getMonth()).toBe(5); // June
  });

  it('Today fires onChange with today', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Calendar defaultValue={new Date(2026, 4, 15)} onChange={onChange} />,
      { wrapper: wrap() },
    );
    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('Controlled mode — title updates when `value` changes', () => {
    const { rerender } = render(
      <Calendar value={new Date(2026, 4, 15)} />,
      { wrapper: wrap() },
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/May/);
    rerender(<Calendar value={new Date(2026, 5, 15)} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/June/);
  });

  it('locale override wins over context (ru-RU shows Cyrillic title)', () => {
    render(
      <Calendar defaultValue={new Date(2026, 4, 15)} locale="ru-RU" />,
      { wrapper: wrap('en-US') },
    );
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/[Ѐ-ӿ]/);
  });

  it('forwards ref to the root element', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Calendar ref={ref} defaultValue={new Date(2026, 4, 15)} />, { wrapper: wrap() });
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges className with internal classes', () => {
    render(
      <Calendar className="external" defaultValue={new Date(2026, 4, 15)} />,
      { wrapper: wrap() },
    );
    const heading = screen.getByRole('heading', { level: 2 });
    const root = heading.closest('div');
    expect(root?.className).toMatch(/external/);
  });

  it('restores focused cell after month navigation (some gridcell remains tab-reachable)', async () => {
    const user = userEvent.setup();
    render(<Calendar defaultValue={new Date(2026, 4, 15)} />, { wrapper: wrap() });
    // Click "Next month"
    await user.click(screen.getByLabelText('Next month'));
    // After navigation, exactly one gridcell must have tabIndex="0" (roving-tab-index focus target)
    const cells = screen.getAllByRole('gridcell');
    const focusable = cells.filter((c) => c.getAttribute('tabindex') === '0');
    expect(focusable.length).toBe(1);
  });
});
