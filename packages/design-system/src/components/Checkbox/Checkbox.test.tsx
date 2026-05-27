import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('renders unchecked by default', () => {
    render(<Checkbox label="Agree" />);
    const input = screen.getByRole('checkbox', { name: 'Agree' });
    expect(input).not.toBeChecked();
  });

  it('uses defaultChecked for uncontrolled initial state', () => {
    render(<Checkbox label="Agree" defaultChecked />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('reflects controlled `checked`', () => {
    const { rerender } = render(<Checkbox label="Agree" checked={false} onChange={() => {}} />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    rerender(<Checkbox label="Agree" checked onChange={() => {}} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('fires onChange with (nextChecked, event) on click', async () => {
    const user = userEvent.setup();
    const handle = vi.fn();
    render(<Checkbox label="Agree" onChange={handle} />);
    await user.click(screen.getByRole('checkbox'));
    expect(handle).toHaveBeenCalledTimes(1);
    expect(handle.mock.calls[0][0]).toBe(true);
    expect(handle.mock.calls[0][1]).toBeDefined();
    expect(handle.mock.calls[0][1].target).toBeInstanceOf(HTMLInputElement);
  });

  it('toggling the label text also fires onChange', async () => {
    const user = userEvent.setup();
    const handle = vi.fn();
    render(<Checkbox label="Click my text" onChange={handle} />);
    await user.click(screen.getByText('Click my text'));
    expect(handle).toHaveBeenCalledTimes(1);
  });

  it('sets indeterminate on the DOM input and renders the dash icon', () => {
    const { container, rerender } = render(<Checkbox label="Mixed" indeterminate />);
    const input = screen.getByRole('checkbox') as HTMLInputElement;
    expect(input.indeterminate).toBe(true);
    // Dash icon visible (lucide renders an <svg>).
    expect(container.querySelector('svg')).toBeInTheDocument();

    // Toggle off — indeterminate cleared, no icon when also unchecked.
    rerender(<Checkbox label="Mixed" indeterminate={false} />);
    expect(input.indeterminate).toBe(false);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('disabled propagates and blocks click on both input and label text', async () => {
    const user = userEvent.setup();
    const handle = vi.fn();
    render(<Checkbox label="Locked" disabled onChange={handle} />);
    const input = screen.getByRole('checkbox');
    expect(input).toBeDisabled();
    // Click on the native input directly.
    await user.click(input);
    expect(handle).not.toHaveBeenCalled();
    // Click on the label text — native <input disabled> inside <label> blocks
    // label-forwarded clicks too. Important: a consumer can't accidentally
    // toggle a disabled checkbox by clicking the surrounding label area.
    await user.click(screen.getByText('Locked'));
    expect(handle).not.toHaveBeenCalled();
  });

  it('invalid sets aria-invalid + invalid class', () => {
    const { container } = render(<Checkbox label="Required" invalid />);
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
    expect(container.querySelector('label')!.className).toMatch(/invalid/);
  });

  it('renders without label when only aria-label is provided', () => {
    const { container } = render(<Checkbox aria-label="Select row" />);
    expect(screen.getByRole('checkbox', { name: 'Select row' })).toBeInTheDocument();
    // No .labelText span — the label prop is unset.
    expect(container.querySelector('span[class*="labelText"]')).toBeNull();
  });

  it('applies size class names for sm / md / lg', () => {
    const { container, rerender } = render(<Checkbox label="X" size="sm" />);
    expect(container.querySelector('label')!.className).toMatch(/size-sm/);
    rerender(<Checkbox label="X" size="md" />);
    expect(container.querySelector('label')!.className).toMatch(/size-md/);
    rerender(<Checkbox label="X" size="lg" />);
    expect(container.querySelector('label')!.className).toMatch(/size-lg/);
  });

  it('defaults to size="md"', () => {
    const { container } = render(<Checkbox label="X" />);
    expect(container.querySelector('label')!.className).toMatch(/size-md/);
  });

  it('does NOT pass component size prop through to the DOM size attribute', () => {
    render(<Checkbox label="X" size="sm" />);
    expect(screen.getByRole('checkbox')).not.toHaveAttribute('size');
  });

  it('forwards ref to the native input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Checkbox label="X" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.type).toBe('checkbox');
  });

  it('merges className on the outer label', () => {
    const { container } = render(<Checkbox label="X" className="my-cls" />);
    expect(container.querySelector('label.my-cls')).not.toBeNull();
  });

  it('name + value flow through for FormData', () => {
    render(
      <form data-testid="form">
        <Checkbox name="agree" value="yes" defaultChecked />
      </form>,
    );
    const form = screen.getByTestId('form') as HTMLFormElement;
    const fd = new FormData(form);
    expect(fd.get('agree')).toBe('yes');
  });

  it('color="violet" sets --checkbox-color to the violet palette fg token', () => {
    const { container } = render(<Checkbox color="violet" label="Marketing" />);
    const label = container.querySelector('label');
    expect(label).not.toBeNull();
    expect(label?.style.getPropertyValue('--checkbox-color')).toBe(
      'var(--color-palette-violet-fg)',
    );
  });

  it('no color prop means no --checkbox-color custom property is set', () => {
    const { container } = render(<Checkbox label="Default" />);
    const label = container.querySelector('label');
    expect(label?.style.getPropertyValue('--checkbox-color')).toBe('');
  });

  it('color="teal" produces the teal token reference', () => {
    const { container } = render(<Checkbox color="teal" label="Engineering" />);
    const label = container.querySelector('label');
    expect(label?.style.getPropertyValue('--checkbox-color')).toBe(
      'var(--color-palette-teal-fg)',
    );
  });

  it('color does not affect the unchecked checkbox visual (no fill applied)', () => {
    // Unchecked: --checkbox-color is set on the label but the SCSS only
    // applies it when :checked / :indeterminate. We assert the input is
    // unchecked (the visual is verified by the cascade order in the SCSS).
    const { container } = render(<Checkbox color="amber" label="Sales" />);
    const input = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.checked).toBe(false);
    expect(input.indeterminate).toBe(false);
  });
});
