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

  it('applies the structural layout classes (root / topBar / body / sidebar / main)', () => {
    // Anchors the load-bearing classes — the root carries the min-height:100vh
    // flex row (full-height sidebar + content column) — so a future SCSS edit
    // can't silently gut the shell structure.
    const { container } = render(
      <AppLayout topBar={<span>t</span>} sidebar={<span>s</span>}>
        <span>c</span>
      </AppLayout>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/root/);
    expect(root.querySelector('[class*="topBar"]')).toBeInTheDocument();
    expect(root.querySelector('[class*="body"]')).toBeInTheDocument();
    expect(root.querySelector('[class*="sidebar"]')).toBeInTheDocument();
    expect(root.querySelector('[class*="main"]')).toBeInTheDocument();
  });
});

describe('AppLayout sidebarPinned (#324)', () => {
  it('adds the pinned class to the sidebar wrapper', () => {
    render(
      <AppLayout sidebar={<nav data-testid="rail">nav</nav>} sidebarPinned>
        content
      </AppLayout>,
    );
    const wrapper = screen.getByTestId('rail').parentElement!;
    expect(wrapper.className).toMatch(/sidebarPinned/);
    expect(wrapper.className).toMatch(/sidebar/);
  });

  it('no pinned class by default', () => {
    render(<AppLayout sidebar={<nav data-testid="rail">nav</nav>}>content</AppLayout>);
    expect(screen.getByTestId('rail').parentElement!.className).not.toMatch(/sidebarPinned/);
  });

  it('sidebarPinned without a sidebar renders nothing extra', () => {
    const { container } = render(<AppLayout sidebarPinned>content</AppLayout>);
    expect(container.querySelector('[class*="sidebar"]')).toBeNull();
  });
});
