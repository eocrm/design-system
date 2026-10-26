import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n/I18nProvider';
import { RelativeDateInput, type RelativeDateInputProps } from './RelativeDateInput';

type Props = Omit<RelativeDateInputProps, 'value' | 'onChange'> & {
  initial: string | null;
  onChange?: (expr: string | null) => void;
};

/** Controlled host: feeds every emitted value back in, as a real consumer does. */
function Host({ initial, onChange, ...rest }: Props) {
  const [value, setValue] = useState(initial);
  return (
    <RelativeDateInput
      aria-label="Due"
      value={value}
      onChange={(next) => {
        onChange?.(next);
        setValue(next);
      }}
      {...rest}
    />
  );
}

const combo = (name: string) => screen.getByRole('combobox', { name });
const amount = () => screen.getByRole('textbox', { name: 'Amount' });

async function pick(control: string, option: string) {
  await userEvent.click(combo(control));
  await userEvent.click(screen.getByRole('option', { name: option }));
}

/** Replaces the amount in one change (clear, then paste), so no keystroke-by-keystroke prefixes emit. */
async function typeAmount(text: string) {
  await userEvent.clear(amount());
  if (text) await userEvent.paste(text);
}

describe('RelativeDateInput — point', () => {
  it('shows the parsed anchor, sign, amount and unit', () => {
    render(<Host mode="point" initial="today+7d" />);
    expect(combo('Anchor')).toHaveTextContent('Today');
    expect(combo('Direction')).toHaveTextContent('+');
    expect(amount()).toHaveValue('7');
    expect(combo('Unit')).toHaveTextContent('days');
  });

  it('changing the unit emits the new expression', async () => {
    const onChange = vi.fn();
    render(<Host mode="point" initial="today+7d" onChange={onChange} />);
    await pick('Unit', 'weeks');
    expect(onChange).toHaveBeenLastCalledWith('today+7w');
  });

  it('an amount of 0 drops the offset', async () => {
    const onChange = vi.fn();
    render(<Host mode="point" initial="today+7d" onChange={onChange} />);
    await typeAmount('0');
    expect(onChange).toHaveBeenLastCalledWith('today');
  });

  it('offers Now only with allowNow, and Now adds hours and minutes', async () => {
    const { unmount } = render(<Host mode="point" initial="today" />);
    await userEvent.click(combo('Anchor'));
    expect(screen.queryByRole('option', { name: 'Now' })).not.toBeInTheDocument();
    unmount();

    const onChange = vi.fn();
    render(<Host mode="point" allowNow initial="today" onChange={onChange} />);
    await pick('Anchor', 'Now');
    expect(onChange).toHaveBeenLastCalledWith('now');
    await pick('Unit', 'minutes');
    await typeAmount('30');
    await pick('Direction', '−');
    expect(onChange).toHaveBeenLastCalledWith('now-30min');
  });

  it('hours and minutes are not offered on Today', async () => {
    render(<Host mode="point" allowNow initial="today" />);
    await userEvent.click(combo('Unit'));
    expect(screen.queryByRole('option', { name: 'hours' })).not.toBeInTheDocument();
  });

  it('leaving Now with a minute offset falls back to days', async () => {
    const onChange = vi.fn();
    render(<Host mode="point" allowNow initial="now-30min" onChange={onChange} />);
    await pick('Anchor', 'Today');
    expect(onChange).toHaveBeenLastCalledWith('today-30d');
  });

  it('a boundary anchor keeps its offset', async () => {
    const onChange = vi.fn();
    render(<Host mode="point" initial="today+1d" onChange={onChange} />);
    await pick('Anchor', 'End of next quarter');
    expect(onChange).toHaveBeenLastCalledWith('end:next:quarter+1d');
  });
});

describe('RelativeDateInput — exact date', () => {
  it('toggling on shows the picker and emits only once a date is picked', async () => {
    const onChange = vi.fn();
    render(<Host mode="point" initial="today+7d" onChange={onChange} />);
    await userEvent.click(screen.getByRole('switch', { name: 'Exact date' }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('combobox', { name: 'Anchor' })).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Date' }), '2026-11-03{Enter}');
    expect(onChange).toHaveBeenLastCalledWith('2026-11-03');
  });

  it('toggling off restores and emits the previous relative value', async () => {
    const onChange = vi.fn();
    render(<Host mode="point" initial="today+7d" onChange={onChange} />);
    await userEvent.click(screen.getByRole('switch', { name: 'Exact date' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Date' }), '2026-11-03{Enter}');
    await userEvent.click(screen.getByRole('switch', { name: 'Exact date' }));
    expect(onChange).toHaveBeenLastCalledWith('today+7d');
    expect(amount()).toHaveValue('7');
  });

  it('an incoming date shows the picker with that date', () => {
    render(<Host mode="point" initial="2026-11-03" />);
    expect(screen.getByRole('switch', { name: 'Exact date' })).toBeChecked();
    expect(screen.getByRole('textbox', { name: 'Date' })).not.toHaveValue('');
  });

  it('with allowNow, picks a minute-granular UTC datetime', async () => {
    const onChange = vi.fn();
    render(<Host mode="point" allowNow initial="now" onChange={onChange} />);
    await userEvent.click(screen.getByRole('switch', { name: 'Exact date' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Date' }), '2026-11-03{Enter}');
    const expected = new Date(2026, 10, 3).toISOString().slice(0, 16) + ':00Z';
    expect(onChange).toHaveBeenLastCalledWith(expected);
    expect(expected).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/);
  });
});

describe('RelativeDateInput — range', () => {
  it('shows a rolling range', () => {
    render(<Host mode="range" initial="last:30d" />);
    expect(combo('Range type')).toHaveTextContent('Past');
    expect(amount()).toHaveValue('30');
    expect(combo('Unit')).toHaveTextContent('days');
  });

  it('switches to a whole period', async () => {
    const onChange = vi.fn();
    render(<Host mode="range" initial="last:30d" onChange={onChange} />);
    await pick('Range type', 'Calendar period');
    expect(onChange).toHaveBeenLastCalledWith('this:month');
    await pick('Period', 'This quarter');
    expect(onChange).toHaveBeenLastCalledWith('this:quarter');
    expect(screen.queryByRole('textbox', { name: 'Amount' })).not.toBeInTheDocument();
  });

  it('To date emits this:{period}:to_date', async () => {
    const onChange = vi.fn();
    render(<Host mode="range" initial="this:quarter" onChange={onChange} />);
    await pick('Range type', 'Period to date');
    expect(onChange).toHaveBeenLastCalledWith('this:quarter:to_date');
    expect(combo('Period')).toHaveTextContent('Quarter to date');
  });
});

describe('RelativeDateInput — labels', () => {
  it.each([
    ['last:week', 'Last week'],
    ['next:year', 'Next year'],
    ['this:month:to_date', 'Month to date'],
  ])('en: %s reads %j', (value, label) => {
    render(<Host mode="range" initial={value} />);
    expect(combo('Period')).toHaveTextContent(label);
  });

  it.each([
    ['this:week', 'Текущая неделя'],
    ['last:quarter', 'Прошлый квартал'],
    ['next:year', 'Следующий год'],
    ['this:month:to_date', 'С начала месяца'],
  ])('ru: %s reads %j (gender agreement)', (value, label) => {
    render(
      <I18nProvider locale="ru">
        <Host mode="range" initial={value} />
      </I18nProvider>,
    );
    expect(screen.getByRole('combobox', { name: 'Период' })).toHaveTextContent(label);
  });

  it('en units are singular for 1', () => {
    render(<Host mode="point" initial="today+1d" />);
    expect(combo('Unit')).toHaveTextContent(/^day$/);
  });

  it.each([
    ['1', 'день'],
    ['2', 'дня'],
    ['5', 'дней'],
    ['21', 'день'],
  ])('ru units pluralise by the amount: %s %s', (n, word) => {
    render(
      <I18nProvider locale="ru">
        <Host mode="point" initial={`today+${n}d`} />
      </I18nProvider>,
    );
    expect(screen.getByRole('combobox', { name: 'Единица' })).toHaveTextContent(
      new RegExp(`^${word}$`),
    );
  });

  it('no range label contains a literal N', async () => {
    render(<Host mode="range" initial="last:30d" />);
    await userEvent.click(combo('Range type'));
    for (const option of screen.getAllByRole('option'))
      expect(option.textContent).not.toMatch(/\bN\b/);
  });
});

describe('RelativeDateInput — validation', () => {
  it.each(['1001', '', '-', '1.5'])('%j shows the range error and emits nothing', async (text) => {
    const onChange = vi.fn();
    render(<Host mode="point" initial="today+7d" onChange={onChange} />);
    await typeAmount(text);
    expect(onChange).not.toHaveBeenCalled();
    expect(amount()).toHaveAttribute('aria-invalid', 'true');
    const error = screen.getByText('Enter a whole number from 0 to 1000');
    expect(amount()).toHaveAttribute('aria-describedby', error.id);
  });

  it('a rolling range rejects 0, then emits once when fixed', async () => {
    const onChange = vi.fn();
    render(<Host mode="range" initial="last:7d" onChange={onChange} />);
    await typeAmount('0');
    expect(screen.getByText('Enter a whole number from 1 to 1000')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    await typeAmount('30');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('last:30d');
    expect(screen.queryByText(/Enter a whole number/)).not.toBeInTheDocument();
  });

  it('an invalid draft survives other edits without emitting', async () => {
    const onChange = vi.fn();
    render(<Host mode="point" initial="today+7d" onChange={onChange} />);
    await typeAmount('1.5');
    await pick('Unit', 'weeks');
    expect(onChange).not.toHaveBeenCalled();
    expect(amount()).toHaveValue('1.5');
  });
});

describe('RelativeDateInput — draft preservation', () => {
  it('an offset of 0 keeps the sign and unit for the next edit', async () => {
    const onChange = vi.fn();
    render(<Host mode="point" initial="today-7w" onChange={onChange} />);
    await typeAmount('0');
    expect(onChange).toHaveBeenLastCalledWith('today');
    expect(combo('Direction')).toHaveTextContent('−');
    expect(combo('Unit')).toHaveTextContent('weeks');
    await typeAmount('3');
    expect(onChange).toHaveBeenLastCalledWith('today-3w');
  });

  it('a calendar period keeps the rolling amount and unit', async () => {
    const onChange = vi.fn();
    render(<Host mode="range" initial="last:30w" onChange={onChange} />);
    await pick('Range type', 'Calendar period');
    await pick('Period', 'This week');
    expect(onChange).toHaveBeenLastCalledWith('this:week');
    await pick('Range type', 'Past');
    expect(onChange).toHaveBeenLastCalledWith('last:30w');
  });

  it('re-derives when mode or allowNow changes', () => {
    const onChange = vi.fn();
    const { rerender } = render(<RelativeDateInput mode="point" value="now" onChange={onChange} />);
    expect(screen.getByText('Unrecognised value: now')).toBeInTheDocument();
    rerender(<RelativeDateInput mode="point" allowNow value="now" onChange={onChange} />);
    expect(combo('Anchor')).toHaveTextContent('Now');
    expect(screen.queryByText(/Unrecognised/)).not.toBeInTheDocument();
    rerender(<RelativeDateInput mode="range" value="last:30d" onChange={onChange} />);
    expect(combo('Range type')).toHaveTextContent('Past');
    expect(amount()).toHaveValue('30');
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('RelativeDateInput — value handling', () => {
  it('an unrecognised value shows a note and the defaults, emitting nothing', () => {
    const onChange = vi.fn();
    render(<Host mode="point" initial="garbage" onChange={onChange} />);
    expect(screen.getByText('Unrecognised value: garbage')).toBeInTheDocument();
    expect(combo('Anchor')).toHaveTextContent('Today');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('follows a controlled value, and null shows the defaults without emitting', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <RelativeDateInput mode="range" value="last:30d" onChange={onChange} />,
    );
    rerender(<RelativeDateInput mode="range" value="next:7d" onChange={onChange} />);
    expect(combo('Range type')).toHaveTextContent('Coming');
    expect(amount()).toHaveValue('7');
    rerender(<RelativeDateInput mode="range" value={null} onChange={onChange} />);
    expect(combo('Range type')).toHaveTextContent('Calendar period');
    expect(combo('Period')).toHaveTextContent('This month');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('null in point mode shows Today and emits nothing', () => {
    const onChange = vi.fn();
    render(<RelativeDateInput mode="point" value={null} onChange={onChange} />);
    expect(combo('Anchor')).toHaveTextContent('Today');
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('RelativeDateInput — presets', () => {
  const presets = [
    { label: 'This month', value: 'this:month' },
    { label: 'Last 30 days', value: 'last:30d' },
  ];

  it('renders toggle buttons, presses the match and emits on click', async () => {
    const onChange = vi.fn();
    render(<Host mode="range" initial="this:month" presets={presets} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'This month' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const other = screen.getByRole('button', { name: 'Last 30 days' });
    expect(other).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(other);
    expect(onChange).toHaveBeenLastCalledWith('last:30d');
    expect(other).toHaveAttribute('aria-pressed', 'true');
    expect(amount()).toHaveValue('30');
  });
});

describe('RelativeDateInput — presets while exact', () => {
  it('no preset is pressed while Exact date is on with nothing picked', async () => {
    render(<Host mode="point" initial="today" presets={[{ label: 'Today', value: 'today' }]} />);
    const preset = screen.getByRole('button', { name: 'Today' });
    expect(preset).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('switch', { name: 'Exact date' }));
    expect(preset).toHaveAttribute('aria-pressed', 'false');
    // Choosing it again restores the relative controls it stands for.
    await userEvent.click(preset);
    expect(preset).toHaveAttribute('aria-pressed', 'true');
    expect(combo('Anchor')).toHaveTextContent('Today');
  });
});

describe('RelativeDateInput — misc', () => {
  it('disabled disables every control', () => {
    render(
      <Host
        mode="point"
        initial="today+7d"
        disabled
        presets={[{ label: 'Today', value: 'today' }]}
      />,
    );
    for (const el of [
      ...screen.getAllByRole('combobox'),
      amount(),
      screen.getByRole('switch'),
      screen.getByRole('button', { name: 'Today' }),
    ])
      expect(el).toBeDisabled();
  });

  it('invalid marks the controls invalid', () => {
    render(<Host mode="range" initial="last:7d" invalid />);
    expect(amount()).toHaveAttribute('aria-invalid', 'true');
  });

  it('translates labels in ru', () => {
    render(
      <I18nProvider locale="ru">
        <Host mode="point" initial="today+7d" />
      </I18nProvider>,
    );
    expect(screen.getByRole('combobox', { name: 'Точка отсчёта' })).toHaveTextContent('Сегодня');
    expect(screen.getByRole('switch', { name: 'Точная дата' })).toBeInTheDocument();
  });

  it('forwards the ref to the group root, merges className and names the group', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <RelativeDateInput
        ref={ref}
        mode="point"
        value="today"
        onChange={() => {}}
        className="extra"
        aria-label="Due date"
      />,
    );
    const group = screen.getByRole('group', { name: 'Due date' });
    expect(ref.current).toBe(group);
    expect(group).toHaveClass('extra');
    expect(group.className.split(' ').length).toBeGreaterThan(1);
  });
});
