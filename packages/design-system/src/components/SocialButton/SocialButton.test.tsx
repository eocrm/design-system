import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import userEvent from '@testing-library/user-event';
import { SocialButton } from './SocialButton';

describe('SocialButton', () => {
  it('renders a button named by the label, with a decorative brand mark, and forwards ref', () => {
    const ref = createRef<HTMLButtonElement>();
    const { container } = render(
      <SocialButton ref={ref} provider="google" label="Continue with Google" />,
    );
    const btn = screen.getByRole('button', { name: 'Continue with Google' });
    expect(btn).toBeInTheDocument();
    expect(ref.current).toBe(btn);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('defaults to the secondary variant, overridable', () => {
    const { rerender } = render(<SocialButton provider="google" label="Google" />);
    expect(screen.getByRole('button', { name: 'Google' }).className).toMatch(/secondary/);
    rerender(<SocialButton provider="google" label="Google" variant="ghost" />);
    expect(screen.getByRole('button', { name: 'Google' }).className).toMatch(/ghost/);
  });

  it('fires onClick and spreads button attrs (disabled, data-*)', async () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <SocialButton provider="google" label="Google" onClick={onClick} data-foo="bar" />,
    );
    const btn = screen.getByRole('button', { name: 'Google' });
    expect(btn).toHaveAttribute('data-foo', 'bar');
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<SocialButton provider="google" label="Google" onClick={onClick} disabled />);
    expect(screen.getByRole('button', { name: 'Google' })).toBeDisabled();
  });

  it('renders each provider', () => {
    const { container, rerender } = render(<SocialButton provider="google" label="g" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
    rerender(<SocialButton provider="yandex" label="y" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
