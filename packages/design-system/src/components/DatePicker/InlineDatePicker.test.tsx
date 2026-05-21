import { render, screen } from '@testing-library/react';
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
      <InlineDatePicker defaultValue={new Date(2026, 4, 1)} onChange={onChange} aria-label="Date" />,
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
    expect(screen.queryByRole('gridcell', { name: /^21$/, selected: true })).not.toBeInTheDocument();
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
      <InlineDatePicker
        name="dob"
        defaultValue={new Date(2026, 4, 21)}
        aria-label="Date"
      />,
      { wrapper: wrap() },
    );
    const hidden = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="dob"]',
    );
    expect(hidden?.value).toBe('2026-05-21');
  });

  it('name with null value emits an empty hidden mirror', () => {
    const { container } = render(
      <InlineDatePicker name="dob" aria-label="Date" />,
      { wrapper: wrap() },
    );
    const hidden = container.querySelector<HTMLInputElement>(
      'input[type="hidden"][name="dob"]',
    );
    expect(hidden?.value).toBe('');
  });

  it('forwards ref to the wrapper div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<InlineDatePicker ref={ref} aria-label="Date" />, { wrapper: wrap() });
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('merges className from props with the internal wrapper class', () => {
    const { container } = render(
      <InlineDatePicker className="custom" aria-label="Date" />,
      { wrapper: wrap() },
    );
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
      <InlineDatePicker
        defaultValue={new Date(2026, 4, 21)}
        locale="ru-RU"
        aria-label="Дата"
      />,
      { wrapper: wrap('ru-RU') },
    );
    expect(document.body.textContent).toMatch(/[Ѐ-ӿ]/);
  });
});
