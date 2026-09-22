import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';
import { SettingRow } from './SettingRow';

// Auto-wired cases use the DS <Input>, not a raw <input>: the wiring injects
// the DS `invalid` prop, and it is the CONTROL that maps `invalid` →
// `aria-invalid` (Input.tsx:111). A raw <input> would receive a literal
// `invalid` attribute and no `aria-invalid`, so the error test would fail and
// the rest would render a non-DOM attribute. Native elements belong in the
// render-prop form — which is exactly what <Field> documents, and what the
// render-prop case below exercises.

describe('SettingRow', () => {
  it('renders with the minimum props', () => {
    render(
      <SettingRow label="Seats">
        <Input type="number" defaultValue={50} />
      </SettingRow>,
    );
    expect(screen.getByRole('spinbutton', { name: 'Seats' })).toBeInTheDocument();
  });

  it('associates the label with the control', async () => {
    const user = userEvent.setup();
    render(
      <SettingRow label="Seats">
        <Input type="number" />
      </SettingRow>,
    );
    await user.click(screen.getByText('Seats'));
    expect(screen.getByRole('spinbutton')).toHaveFocus();
  });

  it('keeps labelAdornment out of the control accessible name', () => {
    render(
      <SettingRow label="Seats" labelAdornment={<span>From plan</span>}>
        <Input type="number" />
      </SettingRow>,
    );
    // The badge renders...
    expect(screen.getByText('From plan')).toBeInTheDocument();
    // ...but is NOT part of the name. This is the regression the component exists to prevent.
    expect(screen.getByRole('spinbutton')).toHaveAccessibleName('Seats');
  });

  it('links the description via aria-describedby', () => {
    render(
      <SettingRow label="Seats" description="Member seats included for this tenant">
        <Input type="number" />
      </SettingRow>,
    );
    expect(screen.getByRole('spinbutton')).toHaveAccessibleDescription(
      'Member seats included for this tenant',
    );
  });

  it('error takes over aria-describedby and sets aria-invalid', () => {
    render(
      <SettingRow label="Seats" description="Helper text" error="Must be at least 1">
        <Input type="number" />
      </SettingRow>,
    );
    const control = screen.getByRole('spinbutton');
    expect(control).toHaveAccessibleDescription('Must be at least 1');
    expect(control).toHaveAttribute('aria-invalid', 'true');
    // Deliberately UNLIKE <Field>: the description stays visible. It lives in
    // the label column and the error in the control column, so they do not
    // occupy the same slot — hiding the "what is this setting" text because
    // the value is invalid would remove context from a different column.
    // Only the aria-describedby reference is replaced.
    expect(screen.getByText('Helper text')).toBeInTheDocument();
  });

  it('required injects required onto the control', () => {
    render(
      <SettingRow label="Seats" required>
        <Input type="number" />
      </SettingRow>,
    );
    expect(screen.getByRole('spinbutton')).toBeRequired();
  });

  it('renders trailing content after the control', () => {
    render(
      <SettingRow label="Seats" trailing={<button type="button">Reset</button>}>
        <Input type="number" />
      </SettingRow>,
    );
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });

  it('renders footer content', () => {
    render(
      <SettingRow label="Seats" footer={<p>0 of 50 included this month</p>}>
        <Input type="number" />
      </SettingRow>,
    );
    expect(screen.getByText('0 of 50 included this month')).toBeInTheDocument();
  });

  it.each(['xs', 'sm', 'md', 'full'] as const)('controlWidth=%s sets the data attribute', (w) => {
    const { container } = render(
      <SettingRow label="Seats" controlWidth={w}>
        <Input type="number" />
      </SettingRow>,
    );
    expect(container.querySelector('[data-control-width]')).toHaveAttribute(
      'data-control-width',
      w,
    );
  });

  it('supports the render-prop form', () => {
    render(
      <SettingRow label="Seats" description="Helper">
        {(field) => <input type="number" {...field} />}
      </SettingRow>,
    );
    const control = screen.getByRole('spinbutton', { name: 'Seats' });
    expect(control).toHaveAccessibleDescription('Helper');
  });

  it('honours an explicit id', () => {
    render(
      <SettingRow label="Seats" id="seats-control">
        <Input type="number" />
      </SettingRow>,
    );
    expect(screen.getByRole('spinbutton')).toHaveAttribute('id', 'seats-control');
  });

  it('forwards ref to the row element', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SettingRow ref={ref} label="Seats">
        <Input type="number" />
      </SettingRow>,
    );
    expect(ref.current).toHaveAttribute('data-setting-row');
  });

  it('merges className rather than replacing it', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <SettingRow ref={ref} label="Seats" className="custom">
        <Input type="number" />
      </SettingRow>,
    );
    expect(ref.current).toHaveClass('custom');
    expect(ref.current!.className.split(' ').length).toBeGreaterThan(1);
  });
});
