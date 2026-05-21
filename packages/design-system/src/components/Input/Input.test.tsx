import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { Input } from './Input';

describe('Input', () => {
  it('renders an <input> element', () => {
    render(<Input placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');
    expect(input.tagName).toBe('INPUT');
  });

  it('round-trips a controlled value via onChange', async () => {
    function Wrapper() {
      const [v, setV] = useState('');
      return <Input placeholder="email" value={v} onChange={(e) => setV(e.target.value)} />;
    }
    const user = userEvent.setup();
    render(<Wrapper />);
    const input = screen.getByPlaceholderText('email');
    await user.type(input, 'hello@example.com');
    expect(input).toHaveValue('hello@example.com');
  });

  it('sets aria-invalid="true" when invalid', () => {
    render(<Input invalid placeholder="email" />);
    expect(screen.getByPlaceholderText('email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not set aria-invalid when not invalid', () => {
    render(<Input placeholder="email" />);
    expect(screen.getByPlaceholderText('email')).not.toHaveAttribute('aria-invalid');
  });

  it('applies the invalid class when invalid', () => {
    render(<Input invalid placeholder="email" />);
    expect(screen.getByPlaceholderText('email').className).toMatch(/invalid/);
  });

  it('reflects the disabled attribute and blocks input', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Input placeholder="email" disabled onChange={onChange} />);
    const input = screen.getByPlaceholderText('email');
    expect(input).toBeDisabled();
    await user.type(input, 'x');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('forwards native HTML attributes (type, autoComplete)', () => {
    render(<Input placeholder="email" type="email" autoComplete="email" />);
    const input = screen.getByPlaceholderText('email');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('autocomplete', 'email');
  });

  it('merges the className prop', () => {
    render(<Input placeholder="email" className="external" />);
    expect(screen.getByPlaceholderText('email').className).toMatch(/external/);
  });

  it('forwards refs to the underlying input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} placeholder="email" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('lets a consumer override aria-invalid even when invalid={true}', () => {
    render(<Input placeholder="email" invalid aria-invalid="false" />);
    // Consumer-provided aria-invalid wins. The invalid class is still applied
    // (visual error styling) because className composition runs after spread.
    expect(screen.getByPlaceholderText('email')).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByPlaceholderText('email').className).toMatch(/invalid/);
  });

  it('honors readOnly — the attribute is set and typing does not change the value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Input placeholder="email" value="locked" readOnly onChange={onChange} />);
    const input = screen.getByPlaceholderText('email') as HTMLInputElement;
    expect(input).toHaveAttribute('readonly');
    await user.type(input, 'x');
    // readOnly inputs receive focus and key events but value stays put;
    // onChange fires only when the user agent commits a value change.
    expect(input.value).toBe('locked');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies size class names for sm / md / lg', () => {
    const { rerender, container } = render(<Input size="sm" />);
    expect(container.querySelector('input')!.className).toMatch(/size-sm/);
    rerender(<Input size="md" />);
    expect(container.querySelector('input')!.className).toMatch(/size-md/);
    rerender(<Input size="lg" />);
    expect(container.querySelector('input')!.className).toMatch(/size-lg/);
  });

  it('defaults to size="md" when no size prop is passed', () => {
    const { container } = render(<Input />);
    expect(container.querySelector('input')!.className).toMatch(/size-md/);
  });

  it('does NOT pass component size prop through to the DOM size attribute', () => {
    const { container } = render(<Input size="sm" />);
    expect(container.querySelector('input')).not.toHaveAttribute('size');
  });
});
