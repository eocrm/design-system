import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the title as a semantic heading (default h3)', () => {
    render(<EmptyState title="No results" />);
    const heading = screen.getByRole('heading', { name: 'No results' });
    expect(heading.tagName).toBe('H3');
  });

  it('headingLevel={2} renders as h2', () => {
    render(<EmptyState title="No results" headingLevel={2} />);
    expect(screen.getByRole('heading', { name: 'No results' }).tagName).toBe('H2');
  });

  it('headingLevel out-of-range clamps to h3', () => {
    // @ts-expect-error — intentional invalid value to test runtime clamp
    render(<EmptyState title="No results" headingLevel={9} />);
    expect(screen.getByRole('heading', { name: 'No results' }).tagName).toBe('H3');
  });

  it('renders the icon when provided', () => {
    const { container } = render(<EmptyState title="X" icon={<svg data-testid="icon" />} />);
    expect(container.querySelector('[data-testid="icon"]')).toBeInTheDocument();
  });

  it('omits the icon slot when icon is not provided', () => {
    const { container } = render(<EmptyState title="X" />);
    expect(container.querySelector('[class*="icon"]')).toBeNull();
  });

  it('renders the description when provided', () => {
    render(<EmptyState title="X" description="Add your first thing." />);
    expect(screen.getByText('Add your first thing.')).toBeInTheDocument();
  });

  it('omits the description slot when not provided', () => {
    const { container } = render(<EmptyState title="X" />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders the actions slot when provided', () => {
    render(<EmptyState title="X" actions={<button type="button">Add thing</button>} />);
    expect(screen.getByRole('button', { name: 'Add thing' })).toBeInTheDocument();
  });

  it('omits the actions slot when not provided', () => {
    const { container } = render(<EmptyState title="X" />);
    expect(container.querySelector('[class*="actions"]')).toBeNull();
  });

  it('applies size class names for sm / md / lg', () => {
    const { container, rerender } = render(<EmptyState title="X" size="sm" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/size-sm/);
    rerender(<EmptyState title="X" size="md" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/size-md/);
    rerender(<EmptyState title="X" size="lg" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/size-lg/);
  });

  it('defaults to size="md"', () => {
    const { container } = render(<EmptyState title="X" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/size-md/);
  });

  it('applies align class names for center / start', () => {
    const { container, rerender } = render(<EmptyState title="X" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/align-center/);
    rerender(<EmptyState title="X" align="start" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/align-start/);
  });

  it('renders the outer element as <section>', () => {
    const { container } = render(<EmptyState title="X" />);
    expect(container.firstChild?.nodeName).toBe('SECTION');
  });

  it('forwards ref to the outer element', () => {
    const ref = createRef<HTMLElement>();
    render(<EmptyState title="X" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('SECTION');
  });

  it('merges className', () => {
    const { container } = render(<EmptyState title="X" className="my-cls" />);
    expect((container.firstChild as HTMLElement).className).toMatch(/my-cls/);
  });

  it('title accepts ReactNode (inline formatting)', () => {
    render(
      <EmptyState
        title={
          <>
            Found <strong>0</strong> results
          </>
        }
      />,
    );
    const heading = screen.getByRole('heading');
    expect(heading.textContent).toBe('Found 0 results');
    expect(heading.querySelector('strong')).toHaveTextContent('0');
  });
});
