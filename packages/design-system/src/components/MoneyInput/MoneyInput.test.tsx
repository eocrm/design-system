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
});
