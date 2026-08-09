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

  it('applies the xs size class', () => {
    render(<Button size="xs">Tiny</Button>);
    expect(screen.getByRole('button', { name: 'Tiny' }).className).toMatch(/xs/);
  });

  it('applies the success variant class name', () => {
    render(<Button variant="success">Saved!</Button>);
    expect(screen.getByRole('button', { name: 'Saved!' }).className).toMatch(/success/);
  });

  it('applies selected paint only to secondary and ghost variants', () => {
    render(
      <>
        <Button variant="secondary" selected>
          Owner: Ada
        </Button>
        <Button variant="ghost" selected>
          Assignee: Lin
        </Button>
        <Button variant="primary" selected>
          Save
        </Button>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Owner: Ada' }).className).toMatch(/selected/);
    expect(screen.getByRole('button', { name: 'Assignee: Lin' }).className).toMatch(/selected/);
    expect(screen.getByRole('button', { name: 'Save' }).className).not.toMatch(/selected/);
  });

  it('maps the controlled selected prop to aria-pressed', () => {
    const { rerender } = render(
      <Button variant="secondary" selected>
        Owner: Ada
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Owner: Ada' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    rerender(
      <Button variant="secondary" selected={false}>
        Owner: Ada
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Owner: Ada' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('omits aria-pressed when selected is not specified', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).not.toHaveAttribute('aria-pressed');
  });

  it('allows an explicit aria-pressed value to override selected', () => {
    render(
      <Button selected aria-pressed="mixed">
        Owner: Ada
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Owner: Ada' })).toHaveAttribute(
      'aria-pressed',
      'mixed',
    );
  });

  it('keeps a selected button disabled', () => {
    render(
      <Button variant="secondary" selected disabled>
        Owner: Ada
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Owner: Ada' })).toBeDisabled();
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

  it('renders as an icon-only button at size xs with an accessible name', () => {
    render(
      <Button size="xs" aria-label="Remove">
        <svg data-testid="icon" aria-hidden="true" />
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('applies the iconOnly class when iconOnly is set', () => {
    render(
      <Button iconOnly aria-label="Remove">
        <svg data-testid="icon" aria-hidden="true" />
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Remove' }).className).toMatch(/iconOnly/);
  });
});
