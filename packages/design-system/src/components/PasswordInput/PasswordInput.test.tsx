import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { PasswordInput } from './PasswordInput';

describe('PasswordInput', () => {
  it('renders type="password" by default', () => {
    const { container } = render(<PasswordInput placeholder="pw" />);
    expect(container.querySelector('input')).toHaveAttribute('type', 'password');
  });

  it('toggle flips type to text and back; aria-pressed updates', async () => {
    const user = userEvent.setup();
    const { container } = render(<PasswordInput placeholder="pw" />);
    const input = container.querySelector('input')!;
    const button = screen.getByRole('button', { name: 'Show password' });
    expect(input).toHaveAttribute('type', 'password');
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);
    expect(input).toHaveAttribute('type', 'text');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBe(button);

    await user.click(button);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('controlled `revealed` + `onRevealChange` round-trip', async () => {
    const user = userEvent.setup();
    const handle = vi.fn();
    const { container, rerender } = render(
      <PasswordInput revealed={false} onRevealChange={handle} />,
    );
    expect(container.querySelector('input')).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button'));
    expect(handle).toHaveBeenCalledWith(true);
    rerender(<PasswordInput revealed={true} onRevealChange={handle} />);
    expect(container.querySelector('input')).toHaveAttribute('type', 'text');
  });

  it('defaultRevealed initializes uncontrolled state', () => {
    const { container } = render(<PasswordInput defaultRevealed />);
    expect(container.querySelector('input')).toHaveAttribute('type', 'text');
  });

  it('revealable={false} hides the toggle button entirely', () => {
    render(<PasswordInput revealable={false} placeholder="pw" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('labels overrides the toggle aria-labels', async () => {
    const user = userEvent.setup();
    render(<PasswordInput labels={{ show: 'Показать', hide: 'Скрыть' }} />);
    const button = screen.getByRole('button', { name: 'Показать' });
    await user.click(button);
    expect(screen.getByRole('button', { name: 'Скрыть' })).toBe(button);
  });

  it('applies size class names for sm / md / lg', () => {
    const { container, rerender } = render(<PasswordInput size="sm" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/size-sm/);
    rerender(<PasswordInput size="md" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/size-md/);
    rerender(<PasswordInput size="lg" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/size-lg/);
  });

  it('defaults to size="md"', () => {
    const { container } = render(<PasswordInput />);
    expect((container.firstChild as HTMLElement).className).toMatch(/size-md/);
  });

  it('does NOT pass component size prop to DOM size attribute', () => {
    const { container } = render(<PasswordInput size="sm" />);
    expect(container.querySelector('input')).not.toHaveAttribute('size');
  });

  it('invalid sets aria-invalid + the invalid class', () => {
    const { container } = render(<PasswordInput invalid />);
    expect(container.querySelector('input')).toHaveAttribute('aria-invalid', 'true');
    expect((container.firstChild as HTMLElement).className).toMatch(/invalid/);
  });

  it('disabled propagates to input AND toggle', () => {
    render(<PasswordInput disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('forwards ref to the native input', () => {
    const ref = createRef<HTMLInputElement>();
    render(<PasswordInput ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('merges className on the wrapper', () => {
    const { container } = render(<PasswordInput className="my-cls" />);
    expect(container.querySelector('div.my-cls')).not.toBeNull();
  });

  it('name + defaultValue round-trip via FormData', () => {
    render(
      <form data-testid="form">
        <PasswordInput name="password" defaultValue="hunter2" />
      </form>,
    );
    const fd = new FormData(screen.getByTestId('form') as HTMLFormElement);
    expect(fd.get('password')).toBe('hunter2');
  });

  it('capsLockWarning shows the icon + live region when caps-lock keydown event reports on', () => {
    const { container } = render(<PasswordInput capsLockWarning />);
    const input = container.querySelector('input')!;
    // getModifierState is a prototype method — spy on it so the React handler sees true.
    const spy = vi.spyOn(KeyboardEvent.prototype, 'getModifierState').mockReturnValue(true);
    fireEvent.keyDown(input, { key: 'a' });
    spy.mockRestore();
    expect(container.querySelector('[role="status"]')).toHaveTextContent('Caps Lock is on');
  });

  it('capsLockWarning clears on blur', () => {
    const { container } = render(<PasswordInput capsLockWarning />);
    const input = container.querySelector('input')!;
    const spy = vi.spyOn(KeyboardEvent.prototype, 'getModifierState').mockReturnValue(true);
    fireEvent.keyDown(input, { key: 'a' });
    spy.mockRestore();
    fireEvent.blur(input);
    expect(container.querySelector('[role="status"]')?.textContent).toBe('');
  });

  it('capsLockWarning=false (default) — no warning even if keydown reports caps-lock on', () => {
    const { container } = render(<PasswordInput />);
    const input = container.querySelector('input')!;
    const spy = vi.spyOn(KeyboardEvent.prototype, 'getModifierState').mockReturnValue(true);
    fireEvent.keyDown(input, { key: 'a' });
    spy.mockRestore();
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('wrongLayoutWarning triggers on non-ASCII single-char keypress', () => {
    const { container } = render(<PasswordInput wrongLayoutWarning />);
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'ф', getModifierState: () => false });
    expect(container.querySelector('[role="status"]')).toHaveTextContent(
      'Possible wrong keyboard layout',
    );
  });

  it('wrongLayoutWarning does NOT trigger on ASCII keypress', () => {
    const { container } = render(<PasswordInput wrongLayoutWarning />);
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'a', getModifierState: () => false });
    expect(container.querySelector('[role="status"]')?.textContent).toBe('');
  });

  it('wrongLayoutWarning clears on blur', () => {
    const { container } = render(<PasswordInput wrongLayoutWarning />);
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'ф', getModifierState: () => false });
    fireEvent.blur(input);
    expect(container.querySelector('[role="status"]')?.textContent).toBe('');
  });

  it('both warnings simultaneously — capsLockWarning + wrongLayoutWarning render two live regions', () => {
    const { container } = render(<PasswordInput capsLockWarning wrongLayoutWarning />);
    const input = container.querySelector('input')!;
    // Spy so getModifierState returns true for CapsLock while key 'ф' triggers wrong-layout.
    const spy = vi
      .spyOn(KeyboardEvent.prototype, 'getModifierState')
      .mockImplementation((k: string) => k === 'CapsLock');
    fireEvent.keyDown(input, { key: 'ф' });
    spy.mockRestore();
    const statuses = container.querySelectorAll('[role="status"]');
    expect(statuses).toHaveLength(2);
    const texts = Array.from(statuses).map((s) => s.textContent);
    expect(texts).toContain('Caps Lock is on');
    expect(texts).toContain('Possible wrong keyboard layout');
  });

  it('consumer onKeyDown still fires when capsLockWarning is on', () => {
    const handle = vi.fn();
    const { container } = render(<PasswordInput capsLockWarning onKeyDown={handle} />);
    const input = container.querySelector('input')!;
    fireEvent.keyDown(input, { key: 'a' });
    expect(handle).toHaveBeenCalledTimes(1);
  });
});
