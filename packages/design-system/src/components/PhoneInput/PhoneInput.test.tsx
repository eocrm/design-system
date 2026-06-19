import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { PhoneInput } from './PhoneInput';
import { Field } from '../Field';
import { I18nProvider } from '../../i18n';

function renderWith(ui: React.ReactElement) {
  return render(<I18nProvider locale="en">{ui}</I18nProvider>);
}

describe('PhoneInput', () => {
  it('renders a country combobox + a phone number field', () => {
    renderWith(<PhoneInput value={null} onChange={() => {}} defaultCountry="US" />);
    expect(screen.getByRole('combobox', { name: 'Country' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toBeInTheDocument();
  });

  it('seeds the country + national display from a controlled E.164 value', () => {
    renderWith(<PhoneInput value="+12025550123" onChange={() => {}} />);
    const number = screen.getByRole('textbox', { name: 'Phone number' }) as HTMLInputElement;
    expect(number.value).toContain('202');
  });

  it('emits E.164 as the user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Harness() {
      const [v, setV] = useState<string | null>(null);
      return (
        <PhoneInput
          value={v}
          onChange={(e164) => {
            setV(e164);
            onChange(e164);
          }}
          defaultCountry="US"
        />
      );
    }
    renderWith(<Harness />);
    const number = screen.getByRole('textbox', { name: 'Phone number' });
    await user.type(number, '2025550123');
    expect(onChange).toHaveBeenLastCalledWith('+12025550123');
  });

  it('emits null when the number field is cleared', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Harness() {
      const [v, setV] = useState<string | null>('+12025550123');
      return (
        <PhoneInput
          value={v}
          onChange={(e164) => {
            setV(e164);
            onChange(e164);
          }}
        />
      );
    }
    renderWith(<Harness />);
    const number = screen.getByRole('textbox', { name: 'Phone number' }) as HTMLInputElement;
    await user.clear(number);
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('applies invalid chrome to the number field', () => {
    renderWith(<PhoneInput value={null} onChange={() => {}} invalid />);
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByRole('combobox', { name: 'Country' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('disables both controls', () => {
    renderWith(<PhoneInput value={null} onChange={() => {}} disabled />);
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Country' })).toBeDisabled();
  });

  it('forwards ref to the root group and merges className', () => {
    const ref = { current: null as HTMLDivElement | null };
    const { container } = renderWith(
      <PhoneInput ref={ref} value={null} onChange={() => {}} className="custom" />,
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(container.querySelector('.custom')).not.toBeNull();
  });

  it('exposes a group labelled by an injected aria-labelledby (Field integration)', () => {
    renderWith(
      <>
        <span id="lbl">Mobile</span>
        <PhoneInput value={null} onChange={() => {}} aria-labelledby="lbl" />
      </>,
    );
    expect(screen.getByRole('group', { name: 'Mobile' })).toBeInTheDocument();
  });

  it('changing the country reformats and re-emits E.164 with the new calling code', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    function Harness() {
      const [v, setV] = useState<string | null>(null);
      return (
        <PhoneInput
          value={v}
          onChange={(e164) => {
            setV(e164);
            onChange(e164);
          }}
          defaultCountry="US"
        />
      );
    }
    renderWith(<Harness />);
    await user.type(screen.getByRole('textbox', { name: 'Phone number' }), '2025550123');
    expect(onChange).toHaveBeenLastCalledWith('+12025550123');
    const combo = screen.getByRole('combobox', { name: 'Country' });
    await user.click(combo);
    await user.type(combo, 'United Kingdom');
    await user.click(await screen.findByRole('option', { name: /United Kingdom/i }));
    expect(onChange).toHaveBeenLastCalledWith(expect.stringMatching(/^\+44/));
  });

  it('inside a Field, the error is associated with the number input (aria-describedby)', () => {
    renderWith(
      <Field label="Mobile" error="Enter a valid number">
        <PhoneInput value={null} onChange={() => {}} />
      </Field>,
    );
    const number = screen.getByRole('textbox', { name: /phone number/i });
    const describedby = number.getAttribute('aria-describedby');
    expect(describedby).toBeTruthy();
    expect(document.getElementById(describedby!.split(' ')[0])?.textContent).toContain(
      'Enter a valid number',
    );
  });
});
