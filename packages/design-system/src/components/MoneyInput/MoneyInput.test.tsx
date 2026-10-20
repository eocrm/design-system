import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MoneyInput, type MoneyValue } from './MoneyInput';
import { Field } from '../Field';
import { LocaleProvider } from '../../i18n';

function Harness({
  initial = { amount: null, currency: 'USD' },
  onChange,
  currencies = ['EUR', 'USD', 'JPY'],
  ...props
}: {
  initial?: MoneyValue;
  onChange?: (v: MoneyValue) => void;
  currencies?: string[];
} & Partial<React.ComponentProps<typeof MoneyInput>>) {
  const [v, setV] = useState(initial);
  return (
    <MoneyInput
      aria-label="Price"
      {...props}
      value={v}
      currencies={currencies}
      onChange={(n) => {
        setV(n);
        onChange?.(n);
      }}
    />
  );
}

const amountBox = () => screen.getByRole('textbox', { name: 'Amount' }) as HTMLInputElement;

describe('MoneyInput', () => {
  it('renders a group with a currency combobox and an amount textbox', () => {
    render(<Harness />);
    expect(screen.getByRole('group', { name: 'Price' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Price Currency' })).toHaveTextContent('USD');
    expect(amountBox()).toBeInTheDocument();
  });

  it('single currency renders a static prefix, no combobox', () => {
    render(<Harness currencies={['EUR']} initial={{ amount: null, currency: 'EUR' }} />);
    expect(screen.queryByRole('combobox')).toBeNull();
    const prefix = screen.getByText('EUR');
    expect(prefix).toHaveAttribute('aria-hidden', 'true');
    expect(amountBox()).toHaveAccessibleDescription(/Euro/);
  });

  it('formats with grouping while typing', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.type(amountBox(), '1234567');
    expect(amountBox().value).toBe('1,234,567');
    expect(onChange).toHaveBeenLastCalledWith({ amount: '1234567', currency: 'USD' });
  });

  it('pads on blur after edit', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.type(amountBox(), '12');
    await userEvent.tab();
    expect(amountBox().value).toBe('12.00');
    expect(onChange).toHaveBeenLastCalledWith({ amount: '12.00', currency: 'USD' });
  });

  it('blur without edit does not emit', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} initial={{ amount: '12.5', currency: 'EUR' }} />);
    expect(amountBox().value).toBe('12.50');
    await userEvent.click(amountBox());
    await userEvent.tab();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('external non-canonical value displays padded, never emits', () => {
    const onChange = vi.fn();
    const ui = (amount: string) => (
      <MoneyInput
        aria-label="Price"
        value={{ amount, currency: 'USD' }}
        currencies={['EUR', 'USD']}
        onChange={onChange}
      />
    );
    const { rerender } = render(ui('1'));
    rerender(ui('3.1'));
    expect(amountBox().value).toBe('3.10');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('switching currency while the amount is unfocused emits the padded canonical', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} initial={{ amount: '13', currency: 'JPY' }} />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: /USD/ }));
    expect(onChange).toHaveBeenCalledWith({ amount: '13.00', currency: 'USD' });
    expect(amountBox().value).toBe('13.00');
  });

  it('switching currency rounds', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} initial={{ amount: '12.34', currency: 'EUR' }} />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: /JPY/ }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ amount: '12', currency: 'JPY' });
    expect(amountBox().value).toBe('12');
  });

  it('switching currency with empty amount emits a null amount', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: /JPY/ }));
    expect(onChange).toHaveBeenCalledWith({ amount: null, currency: 'JPY' });
  });

  it('unknown currency renders and warns, without emitting', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onChange = vi.fn();
    render(
      <MoneyInput
        aria-label="Price"
        value={{ amount: '5', currency: 'GBP' }}
        currencies={['EUR', 'USD']}
        onChange={onChange}
      />,
    );
    expect(warn).toHaveBeenCalled();
    expect(screen.getByRole('combobox')).toHaveTextContent('GBP');
    expect(onChange).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('clearing the field emits null', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} initial={{ amount: '12', currency: 'USD' }} />);
    await userEvent.clear(amountBox());
    expect(onChange).toHaveBeenLastCalledWith({ amount: null, currency: 'USD' });
  });

  it('is named by Field and the picker composes the label', () => {
    render(
      <Field label="Price">
        <MoneyInput
          value={{ amount: null, currency: 'USD' }}
          currencies={['EUR', 'USD']}
          onChange={() => {}}
        />
      </Field>,
    );
    expect(screen.getByRole('group', { name: 'Price' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Price Currency' })).toBeInTheDocument();
  });

  it('currencyLabel overrides the picker name', () => {
    render(<Harness currencyLabel="Cur" />);
    expect(screen.getByRole('combobox', { name: 'Cur' })).toBeInTheDocument();
  });

  it('name emits hidden inputs, and the picker emits none', () => {
    const { container } = render(
      <Harness name="price" initial={{ amount: '9.50', currency: 'EUR' }} />,
    );
    const hidden = (n: string) =>
      container.querySelector<HTMLInputElement>(`input[type="hidden"][name="${n}"]`);
    expect(hidden('price')?.value).toBe('9.50');
    expect(hidden('price_currency')?.value).toBe('EUR');
    expect(container.querySelectorAll('input[type="hidden"]')).toHaveLength(2);
  });

  it('formats via the de-DE locale', () => {
    render(
      <LocaleProvider locale="de-DE">
        <Harness initial={{ amount: '1234.5', currency: 'EUR' }} />
      </LocaleProvider>,
    );
    expect(amountBox().value).toBe('1.234,50');
  });

  it('passes disabled / readOnly / invalid to both controls', () => {
    render(<Harness disabled readOnly invalid />);
    expect(amountBox()).toBeDisabled();
    expect(amountBox()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('forwards ref to the group div and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <MoneyInput
        ref={ref}
        className="extra"
        aria-label="Price"
        value={{ amount: null, currency: 'USD' }}
        currencies={['EUR', 'USD']}
        onChange={() => {}}
      />,
    );
    expect(ref.current).toBe(screen.getByRole('group'));
    expect(ref.current).toHaveClass('extra');
  });

  describe('caret-preserving editing', () => {
    const at = (pos: number) => ({ initialSelectionStart: pos, initialSelectionEnd: pos });

    it('mid-string insert keeps caret after the inserted digit', async () => {
      render(<Harness initial={{ amount: '1234', currency: 'JPY' }} />);
      await userEvent.type(amountBox(), '5', at(1));
      expect(amountBox().value).toBe('15,234');
      expect(amountBox().selectionStart).toBe(2);
    });

    it('backspace over a group separator deletes the digit before it', async () => {
      render(<Harness initial={{ amount: '1234', currency: 'JPY' }} />);
      await userEvent.type(amountBox(), '{Backspace}', at(2));
      expect(amountBox().value).toBe('234');
      expect(amountBox().selectionStart).toBe(0);
    });

    it('Delete before a separator deletes the digit after it', async () => {
      render(<Harness initial={{ amount: '1234', currency: 'JPY' }} />);
      await userEvent.type(amountBox(), '{Delete}', at(1));
      expect(amountBox().value).toBe('134');
      expect(amountBox().selectionStart).toBe(1);
    });

    it('rejects a second decimal', async () => {
      const onChange = vi.fn();
      render(<Harness onChange={onChange} />);
      await userEvent.type(amountBox(), '12.5');
      onChange.mockClear();
      await userEvent.type(amountBox(), '.', at(1));
      expect(amountBox().value).toBe('12.5');
      expect(amountBox().selectionStart).toBe(1);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('rejects digits past precision', async () => {
      const onChange = vi.fn();
      render(<Harness onChange={onChange} initial={{ amount: null, currency: 'EUR' }} />);
      await userEvent.type(amountBox(), '12.34');
      onChange.mockClear();
      await userEvent.type(amountBox(), '5', at(5));
      expect(amountBox().value).toBe('12.34');
      expect(amountBox().selectionStart).toBe(5);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('rejects a decimal for a zero-precision currency', async () => {
      render(<Harness initial={{ amount: null, currency: 'JPY' }} />);
      await userEvent.type(amountBox(), '12.');
      expect(amountBox().value).toBe('12');
    });

    it('rejects "-" when not allowed', async () => {
      const onChange = vi.fn();
      render(<Harness onChange={onChange} />);
      await userEvent.type(amountBox(), '-');
      expect(amountBox().value).toBe('');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('rejects "-" mid-number and a second "-" when allowed', async () => {
      render(<Harness allowNegative initial={{ amount: '12', currency: 'JPY' }} />);
      await userEvent.type(amountBox(), '-', at(1));
      expect(amountBox().value).toBe('12');
      expect(amountBox().selectionStart).toBe(1);
      await userEvent.type(amountBox(), '-', at(0));
      expect(amountBox().value).toBe('-12');
      await userEvent.type(amountBox(), '-', at(0));
      expect(amountBox().value).toBe('-12');
    });

    it('allowNegative: "-" alone displays "-" with a null amount; then "5" → "-5"', async () => {
      const onChange = vi.fn();
      render(
        <Harness allowNegative onChange={onChange} initial={{ amount: '7', currency: 'JPY' }} />,
      );
      await userEvent.clear(amountBox());
      await userEvent.type(amountBox(), '-');
      expect(amountBox().value).toBe('-');
      expect(onChange).toHaveBeenLastCalledWith({ amount: null, currency: 'JPY' });
      await userEvent.type(amountBox(), '5');
      expect(amountBox().value).toBe('-5');
      expect(onChange).toHaveBeenLastCalledWith({ amount: '-5', currency: 'JPY' });
    });

    it('de-DE numpad dot becomes the decimal', async () => {
      const onChange = vi.fn();
      render(
        <LocaleProvider locale="de-DE">
          <Harness onChange={onChange} initial={{ amount: null, currency: 'EUR' }} />
        </LocaleProvider>,
      );
      await userEvent.type(amountBox(), '12.5');
      expect(amountBox().value).toBe('12,5');
      expect(amountBox().selectionStart).toBe(4);
      expect(onChange).toHaveBeenLastCalledWith({ amount: '12.5', currency: 'EUR' });
    });

    it('de-DE dot is still the decimal for a 3-digit currency (KWD)', async () => {
      const onChange = vi.fn();
      render(
        <LocaleProvider locale="de-DE">
          <Harness
            onChange={onChange}
            currencies={['KWD', 'EUR']}
            initial={{ amount: null, currency: 'KWD' }}
          />
        </LocaleProvider>,
      );
      await userEvent.type(amountBox(), '1.234');
      expect(amountBox().value).toBe('1,234');
      expect(onChange).toHaveBeenLastCalledWith({ amount: '1.234', currency: 'KWD' });
    });

    it('paste parses leniently and truncates', async () => {
      const onChange = vi.fn();
      render(<Harness onChange={onChange} />);
      await userEvent.click(amountBox());
      await userEvent.paste('$1,234.5678');
      expect(amountBox().value).toBe('1,234.56');
      expect(onChange).toHaveBeenLastCalledWith({ amount: '1234.56', currency: 'USD' });
    });

    it('trailing decimal is kept while focused', async () => {
      const onChange = vi.fn();
      render(<Harness onChange={onChange} />);
      await userEvent.type(amountBox(), '12.');
      expect(amountBox().value).toBe('12.');
      expect(onChange).toHaveBeenLastCalledWith({ amount: '12', currency: 'USD' });
    });

    it('displays an over-precise external amount rounded, without emitting', () => {
      const onChange = vi.fn();
      render(
        <MoneyInput
          aria-label="Price"
          value={{ amount: '1.005', currency: 'USD' }}
          currencies={['EUR', 'USD']}
          onChange={onChange}
        />,
      );
      expect(amountBox().value).toBe('1.01');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('typing ".5" into an empty field yields 0.5', async () => {
      const onChange = vi.fn();
      render(<Harness onChange={onChange} />);
      await userEvent.type(amountBox(), '.5');
      expect(amountBox().value).toBe('0.5');
      expect(onChange).toHaveBeenLastCalledWith({ amount: '0.5', currency: 'USD' });
    });

    it('allowNegative: typing "-.5" yields -0.5', async () => {
      const onChange = vi.fn();
      render(<Harness allowNegative onChange={onChange} />);
      await userEvent.type(amountBox(), '-.5');
      expect(amountBox().value).toBe('-0.5');
      expect(onChange).toHaveBeenLastCalledWith({ amount: '-0.5', currency: 'USD' });
    });

    it('rejects a pasted negative when allowNegative is false', async () => {
      const onChange = vi.fn();
      render(<Harness onChange={onChange} />);
      await userEvent.click(amountBox());
      await userEvent.paste('-500');
      expect(amountBox().value).toBe('');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('malformed external amount displays empty and warns, without throwing or emitting', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const onChange = vi.fn();
      render(
        <MoneyInput
          aria-label="Price"
          value={{ amount: '12.3a5', currency: 'USD' }}
          currencies={['EUR', 'USD']}
          onChange={onChange}
        />,
      );
      expect(amountBox().value).toBe('');
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('12.3a5'));
      expect(onChange).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it('typing inside a full fraction overwrites the next digit; at the end it rejects', async () => {
      const onChange = vi.fn();
      render(<Harness onChange={onChange} initial={{ amount: '12.00', currency: 'USD' }} />);
      await userEvent.type(amountBox(), '5', at(3));
      expect(amountBox().value).toBe('12.50');
      expect(amountBox().selectionStart).toBe(4);
      expect(onChange).toHaveBeenLastCalledWith({ amount: '12.50', currency: 'USD' });
      await userEvent.type(amountBox(), '7', at(5));
      expect(amountBox().value).toBe('12.50');
    });

    it('Backspace after the decimal deletes the digit before it', async () => {
      const onChange = vi.fn();
      render(<Harness onChange={onChange} initial={{ amount: '1234.50', currency: 'USD' }} />);
      await userEvent.type(amountBox(), '{Backspace}', at(6));
      expect(amountBox().value).toBe('123.50');
      expect(amountBox().selectionStart).toBe(3);
      expect(onChange).toHaveBeenLastCalledWith({ amount: '123.50', currency: 'USD' });
    });

    it('Delete before the decimal deletes the digit after it', async () => {
      render(<Harness initial={{ amount: '1234.50', currency: 'USD' }} />);
      await userEvent.type(amountBox(), '{Delete}', at(5));
      expect(amountBox().value).toBe('1,234.0');
      expect(amountBox().selectionStart).toBe(6);
    });

    it('de-DE: deleting a digit after a group separator never turns it into a decimal', async () => {
      const onChange = vi.fn();
      render(
        <LocaleProvider locale="de-DE">
          <Harness onChange={onChange} initial={{ amount: null, currency: 'EUR' }} />
        </LocaleProvider>,
      );
      await userEvent.type(amountBox(), '1234');
      expect(amountBox().value).toBe('1.234');
      await userEvent.type(amountBox(), '{Backspace}');
      expect(amountBox().value).toBe('123');
      expect(onChange).toHaveBeenLastCalledWith({ amount: '123', currency: 'EUR' });
    });

    it('typing a group separator after the decimal is a no-op', async () => {
      render(<Harness initial={{ amount: '1234.5', currency: 'EUR' }} />);
      await userEvent.type(amountBox(), ',', at(7));
      expect(amountBox().value).toBe('1,234.50');
    });

    it('allowNegative=false still lets an external negative be edited', async () => {
      const onChange = vi.fn();
      render(<Harness onChange={onChange} initial={{ amount: '-5', currency: 'JPY' }} />);
      await userEvent.type(amountBox(), '3', at(2));
      expect(onChange).toHaveBeenCalled();
      expect(amountBox().value).not.toBe('-5');
    });
  });

  it('single-currency mode with an invalid value.currency uses the offered currency', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onChange = vi.fn();
    const { container } = render(
      <MoneyInput
        aria-label="Price"
        name="price"
        value={{ amount: null, currency: '' }}
        currencies={['EUR']}
        onChange={onChange}
      />,
    );
    expect(container.querySelector<HTMLInputElement>('input[name="price_currency"]')?.value).toBe(
      'EUR',
    );
    await userEvent.type(amountBox(), '5');
    expect(onChange).toHaveBeenLastCalledWith({ amount: '5', currency: 'EUR' });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
