import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CurrencySelect } from './CurrencySelect';
import { LocaleProvider } from '../../i18n';

describe('CurrencySelect', () => {
  it('shows the placeholder when value is null', () => {
    render(<CurrencySelect currencies={['EUR', 'USD']} value={null} onChange={() => {}} />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Select currency');
  });

  it('option rows read "CODE — Name"', async () => {
    render(<CurrencySelect currencies={['EUR', 'USD']} value={null} onChange={() => {}} />);
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: /EUR — Euro/ })).toBeInTheDocument();
  });

  it('single: picking emits the code', async () => {
    const onChange = vi.fn();
    render(<CurrencySelect currencies={['EUR', 'USD']} value={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: /USD/ }));
    expect(onChange).toHaveBeenCalledWith('USD');
  });

  it('clearable: clearing emits null', async () => {
    const onChange = vi.fn();
    render(
      <CurrencySelect currencies={['EUR', 'USD']} value="EUR" onChange={onChange} clearable />,
    );
    await userEvent.click(screen.getByRole('button', { name: /clear/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('multiple: emits string[]', async () => {
    const onChange = vi.fn();
    function Harness() {
      const [v, setV] = useState<string[]>([]);
      return (
        <CurrencySelect
          multiple
          currencies={['EUR', 'USD']}
          value={v}
          onChange={(c) => {
            onChange(c);
            setV(c);
          }}
        />
      );
    }
    render(<Harness />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(screen.getByRole('option', { name: /EUR/ }));
    await userEvent.click(screen.getByRole('option', { name: /USD/ }));
    expect(onChange).toHaveBeenLastCalledWith(['EUR', 'USD']);
  });

  it('currencyDisplay controls the trigger text', () => {
    const { rerender } = render(
      <CurrencySelect
        currencies={['EUR']}
        value="EUR"
        onChange={() => {}}
        currencyDisplay="symbol"
      />,
    );
    expect(screen.getByRole('combobox')).toHaveTextContent('€');
    rerender(
      <CurrencySelect
        currencies={['EUR']}
        value="EUR"
        onChange={() => {}}
        currencyDisplay="both"
      />,
    );
    expect(screen.getByRole('combobox')).toHaveTextContent('EUR €');
  });

  it('searchable auto-on above 7 currencies and filters by name', async () => {
    const eight = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'SEK'];
    const { unmount } = render(
      <CurrencySelect currencies={eight} value={null} onChange={() => {}} />,
    );
    const input = screen.getByRole('combobox');
    expect(input.tagName).toBe('INPUT');
    await userEvent.type(input, 'yen');
    const opts = screen.getAllByRole('option');
    expect(opts).toHaveLength(1);
    expect(opts[0]).toHaveTextContent('JPY');
    unmount();
    render(<CurrencySelect currencies={eight.slice(0, 3)} value={null} onChange={() => {}} />);
    expect(screen.getByRole('combobox').tagName).toBe('BUTTON');
  });

  it('forbidden props are not accepted (type-level)', () => {
    // Never invoked: the assertions are the @ts-expect-error lines below.
    const base = { currencies: ['EUR'], value: null, onChange: () => {} };
    const _typeOnly = () => (
      <>
        {/* @ts-expect-error renderOption is owned by CurrencySelect */}
        <CurrencySelect {...base} renderOption={() => null} />
        {/* @ts-expect-error options come from `currencies` */}
        <CurrencySelect {...base} options={[]} />
        {/* @ts-expect-error not creatable */}
        <CurrencySelect {...base} creatable />
      </>
    );
    expect(_typeOnly).toBeTypeOf('function');
  });

  it('dev-warns on and drops an invalid code', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<CurrencySelect currencies={['EUR', 'XX']} value={null} onChange={() => {}} />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('XX'));
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getAllByRole('option')).toHaveLength(1);
    warn.mockRestore();
  });

  it('dev-warns on empty currencies', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<CurrencySelect currencies={[]} value={null} onChange={() => {}} />);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('defaults names to the LocaleProvider locale', async () => {
    const ru = new Intl.DisplayNames('ru', { type: 'currency' }).of('EUR')!;
    render(
      <LocaleProvider locale="ru">
        <CurrencySelect currencies={['EUR']} value={null} onChange={() => {}} />
      </LocaleProvider>,
    );
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getByRole('option', { name: new RegExp(`EUR — ${ru}`) })).toBeInTheDocument();
  });

  it('forwards ref and merges className', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(
      <CurrencySelect
        ref={ref}
        className="x"
        currencies={['EUR']}
        value={null}
        onChange={() => {}}
      />,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveClass('x');
  });

  it('invalid sets aria-invalid; disabled disables the trigger', () => {
    render(
      <CurrencySelect currencies={['EUR']} value={null} onChange={() => {}} invalid disabled />,
    );
    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    expect(trigger).toBeDisabled();
  });
});
