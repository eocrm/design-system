import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
        <Button variant="danger" selected>
          Delete
        </Button>
        <Button variant="success" selected>
          Saved
        </Button>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Owner: Ada' }).className).toMatch(/selected/);
    expect(screen.getByRole('button', { name: 'Assignee: Lin' }).className).toMatch(/selected/);
    expect(screen.getByRole('button', { name: 'Save' }).className).not.toMatch(/selected/);
    expect(screen.getByRole('button', { name: 'Delete' }).className).not.toMatch(/selected/);
    expect(screen.getByRole('button', { name: 'Saved' }).className).not.toMatch(/selected/);
  });

  it('removes selected paint when selected is false', () => {
    const { rerender } = render(
      <Button variant="secondary" selected>
        Owner: Ada
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Owner: Ada' }).className).toMatch(/selected/);

    rerender(
      <Button variant="secondary" selected={false}>
        Owner: Ada
      </Button>,
    );
    expect(screen.getByRole('button', { name: 'Owner: Ada' }).className).not.toMatch(/selected/);
  });

  it('keeps selected paint separate from native toggle-button semantics', () => {
    render(
      <>
        <Button variant="secondary" selected>
          Filter
        </Button>
        <Button variant="secondary" selected aria-pressed>
          Toggle
        </Button>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Filter' })).not.toHaveAttribute('aria-pressed');
    expect(screen.getByRole('button', { name: 'Toggle' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('passes through an explicit mixed aria-pressed value', () => {
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
    const button = screen.getByRole('button', { name: 'Owner: Ada' });
    expect(button).toBeDisabled();
    expect(button.className).toMatch(/selected/);
  });

  it('derives selected hover paint from the selected accent tokens', () => {
    const tokens = readFileSync(resolve(__dirname, 'Button.tokens.scss'), 'utf8');

    expect(tokens).toContain('--button-bg-selected: var(--color-accent-bg-subtle);');
    expect(tokens).toMatch(
      /--button-bg-selected-hover:\s*color-mix\(\s*in srgb,\s*var\(--button-bg-selected\),\s*var\(--button-border-color-selected\) 12%\s*\);/s,
    );
    expect(tokens).toContain('--button-fg-selected: var(--color-fg);');
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
