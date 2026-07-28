import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { AppLayout } from './AppLayout';
import { stubMatchMedia } from '../_internal/matchMediaStub.testutil';

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
    // Deliberately a <div>, not a <main> — AppLayout can legitimately be
    // nested (demos, docs), so it must not unilaterally claim the `main`
    // landmark. The consuming app owns that; see AppShell.tsx.
    expect(screen.queryByRole('main')).not.toBeInTheDocument();
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

describe('AppLayout sidebarOverlayBelow', () => {
  const original = Object.getOwnPropertyDescriptor(window, 'matchMedia');

  afterEach(() => {
    if (original) Object.defineProperty(window, 'matchMedia', original);
    else delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it('renders the sidebar in the flow above the threshold', () => {
    stubMatchMedia(1200);
    render(
      <AppLayout sidebar={<nav data-testid="rail">nav</nav>} sidebarOverlayBelow="lg">
        content
      </AppLayout>,
    );
    expect(screen.getByTestId('rail')).toBeInTheDocument();
    // In-flow means no dialog wrapper.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('rail').parentElement!.className).toMatch(/sidebar/);
  });

  it('moves the sidebar into a left drawer below the threshold', async () => {
    stubMatchMedia(500);
    render(
      <AppLayout sidebar={<nav data-testid="rail">nav</nav>} sidebarOverlayBelow="lg" sidebarOpen>
        content
      </AppLayout>,
    );
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('data-side', 'left');
    expect(dialog).toContainElement(screen.getByTestId('rail'));
  });

  it('does not apply the pinned wrapper to the drawer-hosted sidebar', async () => {
    // sidebarPinned sets sticky/100dvh on the IN-FLOW wrapper. Applying it
    // inside the drawer would size the rail to the window, not the drawer.
    stubMatchMedia(500);
    render(
      <AppLayout
        sidebar={<nav data-testid="rail">nav</nav>}
        sidebarOverlayBelow="lg"
        sidebarPinned
        sidebarOpen
      >
        content
      </AppLayout>,
    );
    await screen.findByRole('dialog');
    expect(screen.getByTestId('rail').parentElement!.className).not.toMatch(/sidebarPinned/);
  });

  it('swaps between in-flow and overlay when the viewport crosses the threshold', async () => {
    const mm = stubMatchMedia(1200);
    render(
      <AppLayout sidebar={<nav data-testid="rail">nav</nav>} sidebarOverlayBelow="lg" sidebarOpen>
        content
      </AppLayout>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    mm.resizeTo(500);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    mm.resizeTo(1200);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('fires onSidebarOpenChange(false) on Escape', async () => {
    stubMatchMedia(500);
    const onChange = vi.fn();
    render(
      <AppLayout
        sidebar={<nav data-testid="rail">nav</nav>}
        sidebarOverlayBelow="lg"
        sidebarOpen
        onSidebarOpenChange={onChange}
      >
        content
      </AppLayout>,
    );
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('names the overlay dialog so it is not an unlabelled dialog', async () => {
    stubMatchMedia(500);
    render(
      <AppLayout sidebar={<nav data-testid="rail">nav</nav>} sidebarOverlayBelow="lg" sidebarOpen>
        content
      </AppLayout>,
    );
    expect(await screen.findByRole('dialog', { name: 'Sidebar navigation' })).toBeInTheDocument();
  });

  it('ignores sidebarOpen entirely when sidebarOverlayBelow is unset', () => {
    stubMatchMedia(320);
    render(
      <AppLayout sidebar={<nav data-testid="rail">nav</nav>} sidebarOpen>
        content
      </AppLayout>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('rail').parentElement!.className).toMatch(/sidebar/);
  });

  it('fires onSidebarOpenChange(false) when the viewport crosses back above the threshold while open (#review-1)', async () => {
    // Regression: widening past the threshold used to unmount the Drawer
    // instead of closing it, so state never got reset and focus was never
    // restored. The reset must happen via a real open->false transition.
    const mm = stubMatchMedia(500);
    const onChange = vi.fn();
    render(
      <AppLayout
        sidebar={<nav data-testid="rail">nav</nav>}
        sidebarOverlayBelow="lg"
        sidebarOpen
        onSidebarOpenChange={onChange}
      >
        content
      </AppLayout>,
    );
    await screen.findByRole('dialog');
    mm.resizeTo(1200);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('does not reopen when the viewport drops back below the threshold after an up-crossing closed it (#review-1)', () => {
    // Regression: `open` state used to survive the up-crossing, so dropping
    // back below the threshold re-mounted the drawer already open — no user
    // action involved. A real (well-behaved) controlled consumer wires
    // onSidebarOpenChange back into sidebarOpen, so this wrapper does too —
    // a static `sidebarOpen` literal can't observe the state reset, since a
    // controlled value that never changes always wins over our onChange.
    function Wrapper() {
      const [sidebarOpen, setSidebarOpen] = useState(true);
      return (
        <AppLayout
          sidebar={<nav data-testid="rail">nav</nav>}
          sidebarOverlayBelow="lg"
          sidebarOpen={sidebarOpen}
          onSidebarOpenChange={setSidebarOpen}
        >
          content
        </AppLayout>
      );
    }
    const mm = stubMatchMedia(500);
    render(<Wrapper />);
    mm.resizeTo(1200);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    mm.resizeTo(500);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
