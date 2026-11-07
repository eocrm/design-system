import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { NumberField, type NumberFieldProps } from './NumberField';
import { Field } from '../Field';
import { I18nProvider } from '../../i18n/I18nProvider';
import { LocaleProvider } from '../../i18n/LocaleProvider';
import { ru } from '../../i18n/ru';
import { localeSeparators } from '../_internal/currency';

type Props = Omit<NumberFieldProps, 'value' | 'onChange'> & {
  initial?: number | null;
  spy?: (v: number | null) => void;
};

/** Controlled harness: echoes onChange back into `value`, like a real parent. */
function Harness({ initial = null, spy, ...props }: Props) {
  const [v, setV] = useState<number | null>(initial);
  return (
    <NumberField
      aria-label="Qty"
      {...props}
      value={v}
      onChange={(n) => {
        spy?.(n);
        setV(n);
      }}
    />
  );
}

const input = () => screen.getByRole('spinbutton');

describe('NumberField', () => {
  it('renders a spinbutton with value/min/max ARIA and forwards ref + className', () => {
    const ref = createRef<HTMLInputElement>();
    const { container } = render(
      <NumberField
        ref={ref}
        className="custom"
        aria-label="Qty"
        value={5}
        onChange={() => {}}
        min={0}
        max={10}
      />,
    );
    expect(input()).toHaveAttribute('aria-valuenow', '5');
    expect(input()).toHaveAttribute('aria-valuemin', '0');
    expect(input()).toHaveAttribute('aria-valuemax', '10');
    expect(input()).toHaveValue('5');
    expect(ref.current).toBe(input());
    expect(container.firstChild).toHaveClass('custom');
  });

  it('fires onChange live per parsed keystroke; partial "-" does not fire; clearing gives null', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness spy={spy} />);
    await user.type(input(), '12');
    expect(spy.mock.calls).toEqual([[1], [12]]);
    await user.clear(input());
    expect(spy).toHaveBeenLastCalledWith(null);
    spy.mockClear();
    await user.type(input(), '-');
    expect(spy).not.toHaveBeenCalled();
    expect(input()).toHaveValue('-');
  });

  it('keeps a partial "1." draft visible without re-firing', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness spy={spy} step={0.1} />);
    await user.type(input(), '1.');
    expect(input()).toHaveValue('1.');
    expect(spy.mock.calls).toEqual([[1]]);
  });

  it('clamps to max on blur and reformats', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness spy={spy} max={100} />);
    await user.type(input(), '150');
    await user.tab();
    expect(spy).toHaveBeenLastCalledWith(100);
    expect(input()).toHaveValue('100');
  });

  it('snaps to step on Enter', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness spy={spy} step={0.25} />);
    await user.type(input(), '1.3{Enter}');
    expect(spy).toHaveBeenLastCalledWith(1.25);
    expect(input()).toHaveValue('1.25');
  });

  it('steps with Arrow / Page keys and jumps with Home / End', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness spy={spy} initial={5} step={2} min={-100} max={100} />);
    await user.click(input());
    await user.keyboard('{ArrowUp}');
    expect(spy).toHaveBeenLastCalledWith(7);
    await user.keyboard('{ArrowDown}{PageUp}');
    expect(spy).toHaveBeenLastCalledWith(25);
    expect(input()).toHaveValue('25');
    await user.keyboard('{Home}');
    expect(spy).toHaveBeenLastCalledWith(-100);
    await user.keyboard('{End}');
    expect(spy).toHaveBeenLastCalledWith(100);
  });

  it('disables + at max and − at min', () => {
    const { rerender } = render(
      <NumberField aria-label="Qty" value={10} onChange={() => {}} min={0} max={10} />,
    );
    expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decrease' })).toBeEnabled();
    rerender(<NumberField aria-label="Qty" value={0} onChange={() => {}} min={0} max={10} />);
    expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled();
  });

  it('a simple click on + steps exactly once', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness spy={spy} initial={1} />);
    await user.click(screen.getByRole('button', { name: 'Increase' }));
    expect(spy.mock.calls).toEqual([[2]]);
  });

  it('a click with no pointerdown (assistive tech) still steps', () => {
    const spy = vi.fn();
    render(<Harness spy={spy} initial={1} />);
    fireEvent.click(screen.getByRole('button', { name: 'Decrease' }));
    expect(spy.mock.calls).toEqual([[0]]);
  });

  describe('hold to repeat', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('repeats after 400ms, then every 60ms, and stops on pointerup', () => {
      const spy = vi.fn();
      render(<Harness spy={spy} initial={0} />);
      const plus = screen.getByRole('button', { name: 'Increase' });
      fireEvent.pointerDown(plus);
      act(() => void vi.advanceTimersByTime(400 + 3 * 60));
      expect(spy).toHaveBeenCalledTimes(4);
      fireEvent.pointerUp(plus);
      fireEvent.click(plus, { detail: 1 }); // the pointer click that ends the hold
      act(() => void vi.advanceTimersByTime(1000));
      expect(spy).toHaveBeenCalledTimes(4);
      expect(input()).toHaveValue('4');
    });

    it('stops at the limit', () => {
      const spy = vi.fn();
      render(<Harness spy={spy} initial={0} max={2} />);
      fireEvent.pointerDown(screen.getByRole('button', { name: 'Increase' }));
      act(() => void vi.advanceTimersByTime(2000));
      expect(spy.mock.calls).toEqual([[1], [2]]);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('a hold keeps calling the latest onChange after a rerender', () => {
      const first = vi.fn();
      const second = vi.fn();
      const { rerender } = render(<NumberField aria-label="Qty" value={0} onChange={first} />);
      fireEvent.pointerDown(screen.getByRole('button', { name: 'Increase' }));
      expect(first).toHaveBeenCalledTimes(1);
      rerender(<NumberField aria-label="Qty" value={1} onChange={second} />);
      act(() => void vi.advanceTimersByTime(400 + 2 * 60));
      expect(first).toHaveBeenCalledTimes(1);
      expect(second.mock.calls).toEqual([[2], [3]]);
    });

    it('clears its timers on unmount', () => {
      const { unmount } = render(<Harness initial={0} />);
      fireEvent.pointerDown(screen.getByRole('button', { name: 'Increase' }));
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  it('formats and parses in the active locale', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    const { group, decimal } = localeSeparators('ru');
    render(
      <I18nProvider locale="ru" messages={ru}>
        <LocaleProvider locale="ru">
          <Harness spy={spy} initial={1234.5} step={0.1} />
        </LocaleProvider>
      </I18nProvider>,
    );
    expect(input()).toHaveValue(`1${group}234${decimal}5`);
    await user.clear(input());
    await user.type(input(), '2,5');
    expect(spy).toHaveBeenLastCalledWith(2.5);
  });

  it('labels its buttons via i18n and keeps them out of the tab order', () => {
    render(<NumberField aria-label="Qty" value={1} onChange={() => {}} />);
    for (const name of ['Decrease', 'Increase']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('tabindex', '-1');
    }
  });

  it('is labelled by Field and takes its invalid state', () => {
    render(
      <Field label="Qty" error="Too many">
        <NumberField value={1} onChange={() => {}} />
      </Field>,
    );
    expect(screen.getByRole('spinbutton', { name: 'Qty' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('disabled and readOnly disable stepping', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Harness spy={spy} initial={1} disabled />);
    expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled();
    rerender(<Harness spy={spy} initial={1} readOnly />);
    await user.click(input());
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled();
    expect(spy).not.toHaveBeenCalled();
  });

  it('picks inputMode from step and min (text whenever negatives are allowed)', () => {
    const cases: [Partial<NumberFieldProps>, string][] = [
      [{}, 'text'],
      [{ min: -5 }, 'text'],
      [{ min: 0, step: 1 }, 'numeric'],
      [{ min: 0, step: 0.5 }, 'decimal'],
    ];
    for (const [props, mode] of cases) {
      const { unmount } = render(
        <NumberField aria-label="Qty" value={1} onChange={() => {}} {...props} />,
      );
      expect(input()).toHaveAttribute('inputmode', mode);
      unmount();
    }
  });

  it('calls a consumer callback ref once, not on every rerender', () => {
    const ref = vi.fn();
    const { rerender } = render(
      <NumberField ref={ref} aria-label="Qty" value={1} onChange={() => {}} />,
    );
    rerender(<NumberField ref={ref} aria-label="Qty" value={2} onChange={() => {}} />);
    rerender(<NumberField ref={ref} aria-label="Qty" value={3} onChange={() => {}} />);
    expect(ref).toHaveBeenCalledTimes(1);
    expect(ref).toHaveBeenCalledWith(input());
  });

  it('exposes the formatted value as aria-valuetext, omitted when empty', () => {
    const { group, decimal } = localeSeparators('ru');
    const { rerender } = render(
      <LocaleProvider locale="ru">
        <NumberField aria-label="Qty" value={1234.5} onChange={() => {}} step={0.1} />
      </LocaleProvider>,
    );
    expect(input()).toHaveAttribute('aria-valuetext', `1${group}234${decimal}5`);
    rerender(
      <LocaleProvider locale="ru">
        <NumberField aria-label="Qty" value={null} onChange={() => {}} step={0.1} />
      </LocaleProvider>,
    );
    expect(input()).not.toHaveAttribute('aria-valuetext');
  });

  it('keeps the last committed valuetext while the draft is partial', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness spy={spy} initial={5} />);
    await user.type(input(), '-', { initialSelectionStart: 0, initialSelectionEnd: 1 });
    expect(input()).toHaveValue('-');
    expect(spy).not.toHaveBeenCalled();
    expect(input()).toHaveAttribute('aria-valuetext', '5');
  });

  it('does not commit on a focus-blur without typing', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<NumberField aria-label="Qty" value={1.3} onChange={spy} step={0.5} />);
    await user.click(input());
    await user.tab();
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not re-snap a stepped value on blur', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness spy={spy} initial={5} step={2} />);
    await user.click(input());
    await user.keyboard('{ArrowUp}');
    await user.tab();
    expect(spy.mock.calls).toEqual([[7]]);
  });

  it('treats a step <= 0 as 1 and warns in dev', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const spy = vi.fn();
    const user = userEvent.setup();
    render(<Harness spy={spy} initial={5} step={0} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('step must be > 0'));
    await user.click(input());
    await user.keyboard('{ArrowUp}');
    expect(spy).toHaveBeenLastCalledWith(6);
    warn.mockRestore();
  });

  it('an external value that replaces a typed draft is not committed on blur', async () => {
    const spy = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<NumberField aria-label="Qty" value={1} onChange={spy} step={2} />);
    await user.tripleClick(input());
    await user.keyboard('3');
    spy.mockClear();
    // The parent overrides the draft with an off-grid value while focused.
    rerender(<NumberField aria-label="Qty" value={7} onChange={spy} step={2} />);
    expect(input()).toHaveValue('7');
    await user.tab();
    // Without clearing the typed flag, blur would snap 7 to 8 and emit it.
    expect(spy).not.toHaveBeenCalled();
    expect(input()).toHaveValue('7');
  });

  it.each([
    ['en', '12.5.3', 12.5],
    ['ru', '1,2,3', 1.2],
    ['en', '1-2', 1],
  ])('malformed %s text "%s" stays as typed but does not fire', async (locale, typed, prefix) => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(
      <LocaleProvider locale={locale}>
        <Harness spy={spy} initial={null} step={0.01} />
      </LocaleProvider>,
    );
    await user.type(input(), typed);
    expect(input()).toHaveValue(typed);
    // The valid prefix ("12.5", "1,2", "1") fires; the malformed whole must not,
    // neither live nor on blur.
    expect(spy).toHaveBeenLastCalledWith(prefix);
    spy.mockClear();
    await user.tab();
    expect(spy).not.toHaveBeenCalled();
    expect(input()).toHaveAttribute('aria-valuenow', String(prefix));
  });

  it.each([
    ['ru', '12.5', 12.5],
    ['ru', '-0.5', -0.5],
    ['en', '1,234.5', 1234.5],
  ])('%s: "%s" parses to %s', async (locale, typed, expected) => {
    const spy = vi.fn();
    const user = userEvent.setup();
    render(
      <LocaleProvider locale={locale}>
        <Harness spy={spy} initial={null} step={0.01} />
      </LocaleProvider>,
    );
    await user.type(input(), typed);
    expect(spy).toHaveBeenLastCalledWith(expected);
  });

  it.each([
    ['ru', '12.5.3'],
    ['ru', '12,5.3'],
    ['ru', '1a2'],
    ['en', '1a2'],
    ['en', '1 2'],
  ])('%s: strict text "%s" never fires', async (locale, typed) => {
    const spy = vi.fn();
    render(
      <LocaleProvider locale={locale}>
        <Harness spy={spy} initial={null} step={0.01} />
      </LocaleProvider>,
    );
    fireEvent.change(input(), { target: { value: typed } });
    expect(spy).not.toHaveBeenCalled();
  });

  it('shows a tiny value with step 1 instead of "0"', () => {
    render(<NumberField aria-label="Qty" value={1e-7} onChange={() => {}} step={1} />);
    expect(input()).toHaveValue('0.0000001');
  });

  it.each([
    [2.5, 1, '2.5'],
    [1.25, 0.5, '1.25'],
  ])('shows value %s with step %s as "%s", never hiding the stored value', (value, step, shown) => {
    render(<NumberField aria-label="Qty" value={value} onChange={() => {}} step={step} />);
    expect(input()).toHaveValue(shown);
    expect(input()).toHaveAttribute('aria-valuetext', shown);
    expect(input()).toHaveAttribute('aria-valuenow', String(value));
  });

  it('shows an external value change when not focused', () => {
    const { rerender } = render(<NumberField aria-label="Qty" value={1} onChange={() => {}} />);
    rerender(<NumberField aria-label="Qty" value={42} onChange={() => {}} />);
    expect(input()).toHaveValue('42');
  });
});

describe('NumberField locale separators and paste', () => {
  const inLocale = (locale: string, ui: React.ReactElement) =>
    render(<LocaleProvider locale={locale}>{ui}</LocaleProvider>);

  it.each(['es', 'pl'])('%s: typing 12,5 fires 12.5', async (locale) => {
    const spy = vi.fn();
    inLocale(locale, <Harness spy={spy} />);
    await userEvent.setup().type(input(), '12,5');
    expect(spy).toHaveBeenLastCalledWith(12.5);
  });

  it('es: displays 1234.5 with a decimal comma, not 1,234,5', () => {
    inLocale('es', <Harness initial={1234.5} step={0.1} />);
    expect((input() as HTMLInputElement).value).toMatch(/^1\.?234,5$/);
  });

  it.each(["1'234.5", '1\u2019234.5'])('de-CH accepts group %s', async (text) => {
    const spy = vi.fn();
    inLocale('de-CH', <Harness spy={spy} />);
    const user = userEvent.setup();
    await user.click(input());
    await user.paste(text);
    expect(spy).toHaveBeenLastCalledWith(1234.5);
  });

  it.each(['1 234,50', '1\u00a0234,50'])('ru paste %j fires 1234.5', async (text) => {
    const spy = vi.fn();
    inLocale('ru', <Harness spy={spy} />);
    const user = userEvent.setup();
    await user.click(input());
    await user.paste(text);
    expect(spy).toHaveBeenLastCalledWith(1234.5);
  });

  it.each([
    // Where '.' groups, a typed '.' is ambiguous (decimal or thousands?), so it is ignored.
    ['de', '1.5', '15', 15],
    ['es', '12.5', '125', 125],
    ['de', '1,5', '1,5', 1.5],
    // Where '.' does not group (ru), a typed '.' is the decimal.
    ['ru', '12.5', '12,5', 12.5],
    ['en', '12.5', '12.5', 12.5],
  ])('%s: typing %s shows %s and fires %s', async (locale, text, shown, expected) => {
    const spy = vi.fn();
    inLocale(locale, <Harness spy={spy} step={0.1} />);
    await userEvent.setup().type(input(), text);
    expect(input()).toHaveValue(shown);
    expect(spy).toHaveBeenLastCalledWith(expected);
  });

  it('de: keydown "." is blocked', () => {
    inLocale('de', <Harness />);
    expect(fireEvent.keyDown(input(), { key: '.' })).toBe(false);
  });

  it('de: an input event that only inserts "." (mobile, no cancelable beforeinput) is undone', async () => {
    const spy = vi.fn();
    inLocale('de', <Harness spy={spy} />);
    await userEvent.setup().type(input(), '12');
    spy.mockClear();
    const el = input() as HTMLInputElement;
    fireEvent.change(el, { target: { value: '1.2', selectionStart: 2, selectionEnd: 2 } });
    expect(el).toHaveValue('12');
    expect(el.selectionStart).toBe(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it('de: an insertText that types "." over a selection is reverted', async () => {
    const spy = vi.fn();
    inLocale('de', <Harness spy={spy} />);
    await userEvent.setup().type(input(), '123');
    spy.mockClear();
    const el = input() as HTMLInputElement;
    fireEvent.input(el, {
      target: { value: '1.3', selectionStart: 2, selectionEnd: 2 },
      inputType: 'insertText',
      data: '.',
    });
    expect(el).toHaveValue('123');
    expect(el.selectionStart).toBe(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it('de: a paste producing 1.234 is accepted as 1234', async () => {
    const spy = vi.fn();
    inLocale('de', <Harness spy={spy} />);
    const user = userEvent.setup();
    await user.click(input());
    await user.paste('1.234');
    expect(input()).toHaveValue('1.234');
    expect(spy).toHaveBeenLastCalledWith(1234);
  });

  it('de: paste keeps strict parsing', async () => {
    const spy = vi.fn();
    inLocale('de', <Harness spy={spy} />);
    const user = userEvent.setup();
    await user.click(input());
    await user.paste('1.234,5');
    expect(spy).toHaveBeenLastCalledWith(1234.5);
  });

  it('en paste of $12 does not fire', async () => {
    const spy = vi.fn();
    inLocale('en', <Harness spy={spy} />);
    const user = userEvent.setup();
    await user.click(input());
    await user.paste('$12');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('NumberField touch tokens (DS-35)', () => {
  const scss = readFileSync(resolve(__dirname, 'NumberField.tokens.scss'), 'utf8');
  const coarse = scss.slice(scss.indexOf('@media (pointer: coarse)'));
  it('has a coarse block with touch-sized height, buttons and 16px text', () => {
    expect(coarse).toMatch(/--number-field-height-md:\s*var\(--size-touch\)/);
    expect(coarse).toMatch(/--number-field-button-size-md:\s*var\(--size-touch\)/);
    expect(coarse).toMatch(/--number-field-font-size-md:\s*var\(--font-size-lg\)/);
  });
});
