import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { AppLayout } from './AppLayout';

describe('AppLayout', () => {
  it('renders children in a <div> and forwards ref to the root', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <AppLayout ref={ref}>
        <span data-testid="content">main</span>
      </AppLayout>,
    );
    expect(container.firstChild?.nodeName).toBe('DIV');
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toBe(container.firstChild);
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('renders the topBar slot when provided, omits its wrapper when not', () => {
    const { queryByTestId, rerender } = render(
      <AppLayout topBar={<span data-testid="top">bar</span>}>x</AppLayout>,
    );
    expect(queryByTestId('top')).toBeInTheDocument();
    rerender(<AppLayout>x</AppLayout>);
    expect(queryByTestId('top')).not.toBeInTheDocument();
  });

  it('renders the sidebar slot when provided, omits its wrapper when not', () => {
    const { queryByTestId, rerender } = render(
      <AppLayout sidebar={<span data-testid="side">nav</span>}>x</AppLayout>,
    );
    expect(queryByTestId('side')).toBeInTheDocument();
    rerender(<AppLayout>x</AppLayout>);
    expect(queryByTestId('side')).not.toBeInTheDocument();
  });

  it('renders all three regions together', () => {
    render(
      <AppLayout
        topBar={<span data-testid="top">bar</span>}
        sidebar={<span data-testid="side">nav</span>}
      >
        <span data-testid="content">main</span>
      </AppLayout>,
    );
    expect(screen.getByTestId('top')).toBeInTheDocument();
    expect(screen.getByTestId('side')).toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('merges className and spreads other attrs onto the root', () => {
    const { container } = render(
      <AppLayout className="my-cls" data-foo="bar">
        x
      </AppLayout>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/my-cls/);
    expect(el).toHaveAttribute('data-foo', 'bar');
  });
});
