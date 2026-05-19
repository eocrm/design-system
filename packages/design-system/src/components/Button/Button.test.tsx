import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Button } from './Button';

describe('Button', () => {
  it('renders its children inside a <button>', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('defaults type="button" so it does not submit ancestor forms', () => {
    render(<Button>Hi</Button>);
    expect(screen.getByRole('button', { name: 'Hi' })).toHaveAttribute('type', 'button');
  });

  it('applies the variant and size class names', () => {
    render(
      <Button variant="danger" size="lg">
        Delete
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Delete' });
    expect(btn.className).toMatch(/danger/);
    expect(btn.className).toMatch(/lg/);
  });

  it('applies the success variant class name', () => {
    render(<Button variant="success">Saved!</Button>);
    expect(screen.getByRole('button', { name: 'Saved!' }).className).toMatch(/success/);
  });

  it('merges the className prop with internal classes', () => {
    render(<Button className="external">Hi</Button>);
    const btn = screen.getByRole('button', { name: 'Hi' });
    expect(btn.className).toMatch(/external/);
    expect(btn.className).toMatch(/button/);
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Press</Button>);
    await user.click(screen.getByRole('button', { name: 'Press' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} disabled>
        Press
      </Button>,
    );
    await user.click(screen.getByRole('button', { name: 'Press' }));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Press' })).toBeDisabled();
  });

  it('forwards a ref to the underlying button element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Hi</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.textContent).toBe('Hi');
  });
});
