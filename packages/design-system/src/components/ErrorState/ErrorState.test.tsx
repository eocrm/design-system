import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('renders the title as a semantic heading (default h1)', () => {
    render(<ErrorState title="Page not found" />);
    expect(screen.getByRole('heading', { name: 'Page not found' }).tagName).toBe('H1');
  });

  it('headingLevel={2} renders as h2; out-of-range clamps to h1', () => {
    const { rerender } = render(<ErrorState title="X" headingLevel={2} />);
    expect(screen.getByRole('heading', { name: 'X' }).tagName).toBe('H2');
    // @ts-expect-error — intentional invalid value to test runtime clamp
    rerender(<ErrorState title="X" headingLevel={9} />);
    expect(screen.getByRole('heading', { name: 'X' }).tagName).toBe('H1');
  });

  it('defaults to size="lg", align="center", tone="neutral"', () => {
    const { container } = render(<ErrorState title="X" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/size-lg/);
    expect(root.className).toMatch(/align-center/);
    expect(root.className).toMatch(/tone-neutral/);
  });

  it('applies size + align class names', () => {
    const { container, rerender } = render(<ErrorState title="X" size="sm" align="start" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/size-sm/);
    expect((container.firstChild as HTMLElement).className).toMatch(/align-start/);
    rerender(<ErrorState title="X" size="md" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/size-md/);
  });

  it('tone="danger" sets role="alert" and the danger tone class', () => {
    const { container } = render(<ErrorState title="X" tone="danger" />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveAttribute('role', 'alert');
    expect(root.className).toMatch(/tone-danger/);
  });

  it('tone="neutral" (default) sets no role', () => {
    const { container } = render(<ErrorState title="X" />);
    expect(container.firstChild).not.toHaveAttribute('role');
  });

  it('a consumer role prop overrides the danger default', () => {
    const { container } = render(<ErrorState title="X" tone="danger" role="status" />);
    expect(container.firstChild).toHaveAttribute('role', 'status');
  });

  it('renders icon / description / actions / extra when provided, omits when not', () => {
    const { container } = render(
      <ErrorState
        title="X"
        icon={<svg data-testid="icon" />}
        description="desc"
        actions={<button type="button">Go</button>}
        extra={<span data-testid="extra">ID 1</span>}
      />,
    );
    expect(container.querySelector('[data-testid="icon"]')).toBeInTheDocument();
    expect(screen.getByText('desc')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
    expect(screen.getByTestId('extra')).toBeInTheDocument();

    const { container: bare } = render(<ErrorState title="X" />);
    expect(bare.querySelector('[class*="icon"]')).toBeNull();
    expect(bare.querySelector('p')).toBeNull();
    expect(bare.querySelector('[class*="actions"]')).toBeNull();
    expect(bare.querySelector('[class*="extra"]')).toBeNull();
  });

  it('renders extra after actions in DOM order', () => {
    const { container } = render(
      <ErrorState
        title="X"
        actions={<button type="button">Go</button>}
        extra={<span data-testid="extra">ID</span>}
      />,
    );
    const actions = container.querySelector('[class*="actions"]')!;
    const extra = container.querySelector('[class*="extra"]')!;
    // eslint-disable-next-line no-bitwise
    expect(actions.compareDocumentPosition(extra) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders the outer element as <section> and forwards ref to it', () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<ErrorState title="X" ref={ref} />);
    expect(container.firstChild?.nodeName).toBe('SECTION');
    expect(ref.current?.tagName).toBe('SECTION');
  });

  it('merges className and spreads other attrs onto the section', () => {
    const { container } = render(<ErrorState title="X" className="my-cls" data-foo="bar" />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/my-cls/);
    expect(root).toHaveAttribute('data-foo', 'bar');
  });
});
