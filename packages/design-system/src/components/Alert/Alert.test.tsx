import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Bell } from 'lucide-react';
import { Alert } from './Alert';

describe('<Alert>', () => {
  // ─── Baseline ──────────────────────────────────────────────────────────

  it('renders without crashing with default props (info tone implicit)', () => {
    const { container } = render(<Alert>Body</Alert>);
    expect(container.querySelector('[data-tone="info"]')).toBeInTheDocument();
  });

  it('default tone is info (role="status")', () => {
    render(<Alert>x</Alert>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it.each([
    ['info', 'status'],
    ['success', 'status'],
    ['warning', 'status'],
  ] as const)('tone="%s" uses role="%s" (polite)', (tone, expectedRole) => {
    const { container } = render(<Alert tone={tone}>x</Alert>);
    expect(container.querySelector(`[data-tone="${tone}"]`)).toBeInTheDocument();
    expect(screen.getByRole(expectedRole)).toBeInTheDocument();
  });

  it('tone="error" uses role="alert" (assertive)', () => {
    const { container } = render(<Alert tone="error">x</Alert>);
    expect(container.querySelector('[data-tone="error"]')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('component-owned data-tone survives consumer-passed data-tone (spread order)', () => {
    // Consumer attempts to override data-tone via a passthrough prop.
    // The component's data-tone (driven by `tone`) MUST win.
    const { container } = render(
      // data-* attrs are loosely typed — TS accepts this; the runtime assertion below is the guard
      <Alert tone="success" data-tone="bogus">
        x
      </Alert>,
    );
    expect(container.querySelector('[data-tone="success"]')).toBeInTheDocument();
    expect(container.querySelector('[data-tone="bogus"]')).toBeNull();
  });

  it('title renders inside <strong>', () => {
    const { container } = render(<Alert title="Heading">desc</Alert>);
    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong).toHaveTextContent('Heading');
  });

  it('children render as the description body', () => {
    render(<Alert>Body content</Alert>);
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('title and children both render together', () => {
    render(
      <Alert title="Heading">Body content</Alert>,
    );
    expect(screen.getByText('Heading')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('className is merged onto the root, not replaced', () => {
    const { container } = render(<Alert className="custom">x</Alert>);
    const root = container.firstElementChild!;
    expect(root.className).toMatch(/alert/);
    expect(root.className).toMatch(/custom/);
  });

  it('ref forwards to the root <div>', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Alert ref={ref}>x</Alert>);
    expect(ref.current).not.toBeNull();
    expect(ref.current?.tagName).toBe('DIV');
  });

  // ─── Icon ──────────────────────────────────────────────────────────────

  it('default icon renders for each tone (SVG present)', () => {
    const { container, rerender } = render(<Alert tone="info">x</Alert>);
    expect(container.querySelector('svg')).not.toBeNull();
    rerender(<Alert tone="success">x</Alert>);
    expect(container.querySelector('svg')).not.toBeNull();
    rerender(<Alert tone="warning">x</Alert>);
    expect(container.querySelector('svg')).not.toBeNull();
    rerender(<Alert tone="error">x</Alert>);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('icon prop replaces the default', () => {
    render(
      <Alert icon={<Bell size={16} data-testid="custom-icon" />}>x</Alert>,
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('icon={null} hides the icon entirely', () => {
    const { container } = render(<Alert icon={null}>x</Alert>);
    expect(container.querySelector('svg')).toBeNull();
  });

  // ─── Actions ───────────────────────────────────────────────────────────

  it('actions render inside the body when provided', () => {
    render(
      <Alert title="t" actions={<button data-testid="action">Retry</button>}>
        desc
      </Alert>,
    );
    expect(screen.getByTestId('action')).toBeInTheDocument();
  });

  // ─── Dismiss ───────────────────────────────────────────────────────────

  it('onDismiss not provided → no close button', () => {
    render(<Alert>x</Alert>);
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull();
  });

  it('onDismiss provided → close button with aria-label="Dismiss"', () => {
    render(<Alert onDismiss={() => {}}>x</Alert>);
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('clicking the close button fires onDismiss', async () => {
    const user = userEvent.setup();
    const handleDismiss = vi.fn();
    render(<Alert onDismiss={handleDismiss}>x</Alert>);
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('close button does NOT manage hidden state internally (still in DOM after click)', async () => {
    const user = userEvent.setup();
    render(<Alert onDismiss={() => {}}>Body</Alert>);
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    // Alert stays in the DOM — consumer would hide via conditional render.
    expect(screen.getByText('Body')).toBeInTheDocument();
  });
});
