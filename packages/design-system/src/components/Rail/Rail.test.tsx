import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, createRef, useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n/I18nProvider';
import { stubMatchMedia } from '../_internal/matchMediaStub.testutil';
import { Rail, useRail } from './Rail';

describe('Rail', () => {
  it('renders a <nav> landmark with the default aria-label', () => {
    render(
      <Rail>
        <Rail.Section title="Main">
          <Rail.Item icon={<span data-testid="icon" />} href="/">
            Dashboard
          </Rail.Item>
        </Rail.Section>
      </Rail>,
    );
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(nav.tagName).toBe('NAV');
  });

  it('honors the aria-label prop override', () => {
    render(
      <Rail aria-label="Custom rail">
        <Rail.Section title="Main">
          <Rail.Item href="/">Dashboard</Rail.Item>
        </Rail.Section>
      </Rail>,
    );
    expect(screen.getByRole('navigation', { name: 'Custom rail' })).toBeInTheDocument();
  });

  it('uses ru locale for the default aria-label when I18nProvider locale="ru"', () => {
    render(
      <I18nProvider locale="ru">
        <Rail>
          <Rail.Section title="Main">
            <Rail.Item href="/">Dashboard</Rail.Item>
          </Rail.Section>
        </Rail>
      </I18nProvider>,
    );
    expect(screen.getByRole('navigation', { name: 'Главная навигация' })).toBeInTheDocument();
  });

  it('mounts expanded by default (no data-collapsed attribute)', () => {
    render(
      <Rail>
        <Rail.Section title="Main">
          <Rail.Item href="/">x</Rail.Item>
        </Rail.Section>
      </Rail>,
    );
    const nav = screen.getByRole('navigation');
    expect(nav.hasAttribute('data-collapsed')).toBe(false);
  });

  it('respects defaultCollapsed and sets the data-collapsed attribute', () => {
    render(
      <Rail defaultCollapsed>
        <Rail.Section title="Main">
          <Rail.Item icon={<i />} href="/">
            x
          </Rail.Item>
        </Rail.Section>
      </Rail>,
    );
    const nav = screen.getByRole('navigation');
    expect(nav.hasAttribute('data-collapsed')).toBe(true);
  });

  it('controlled collapsed overrides default and fires onCollapsedChange on toggle', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Rail collapsed={false} onCollapsedChange={onChange}>
        <Rail.Footer>
          <Rail.CollapseToggle />
        </Rail.Footer>
      </Rail>,
    );
    const toggle = screen.getByRole('button', { name: 'Collapse navigation' });
    await user.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
    // Controlled — the parent didn't flip state, so the DOM stays expanded.
    expect(screen.getByRole('navigation').hasAttribute('data-collapsed')).toBe(false);
  });

  it('uncontrolled CollapseToggle toggles the rail and swaps its aria-label', async () => {
    const user = userEvent.setup();
    render(
      <Rail>
        <Rail.Footer>
          <Rail.CollapseToggle />
        </Rail.Footer>
      </Rail>,
    );
    const toggle = screen.getByRole('button', { name: 'Collapse navigation' });
    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Expand navigation' })).toBe(toggle);
    expect(screen.getByRole('navigation').hasAttribute('data-collapsed')).toBe(true);
    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Collapse navigation' })).toBe(toggle);
    expect(screen.getByRole('navigation').hasAttribute('data-collapsed')).toBe(false);
  });

  it('Section renders role="group" with the title as aria-label', () => {
    render(
      <Rail>
        <Rail.Section title="Operations">
          <Rail.Item href="/">x</Rail.Item>
        </Rail.Section>
      </Rail>,
    );
    const group = screen.getByRole('group', { name: 'Operations' });
    expect(group).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
  });

  it('Item renders an <a> by default and forwards href', () => {
    render(
      <Rail>
        <Rail.Section title="Main">
          <Rail.Item href="/dashboard" icon={<span aria-hidden />}>
            Dashboard
          </Rail.Item>
        </Rail.Section>
      </Rail>,
    );
    const link = screen.getByRole('link', { name: 'Dashboard' });
    expect(link.getAttribute('href')).toBe('/dashboard');
  });

  it('Item polymorphic as="button" renders a <button>', () => {
    render(
      <Rail>
        <Rail.Section title="Main">
          <Rail.Item as="button" icon={<span aria-hidden />}>
            Press me
          </Rail.Item>
        </Rail.Section>
      </Rail>,
    );
    const btn = screen.getByRole('button', { name: 'Press me' });
    expect(btn.tagName).toBe('BUTTON');
  });

  it('Item renders an optional badge', () => {
    render(
      <Rail>
        <Rail.Section title="Main">
          <Rail.Item href="/x" icon={<span aria-hidden />} badge={<span>12</span>}>
            Tenants
          </Rail.Item>
        </Rail.Section>
      </Rail>,
    );
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('aria-current="page" item gets active-state styling via the CSS selector', () => {
    render(
      <Rail>
        <Rail.Section title="Main">
          <Rail.Item href="/" aria-current="page">
            Active
          </Rail.Item>
        </Rail.Section>
      </Rail>,
    );
    const link = screen.getByRole('link', { name: 'Active' });
    // CSS Modules: the className is the .item class — the active selector is
    // pure CSS (`[aria-current="page"]`), so the assertion is that the
    // attribute IS set, which is what the CSS reads.
    expect(link.getAttribute('aria-current')).toBe('page');
    expect(link.className).toMatch(/item/);
  });

  it('Group with defaultOpen renders subitems visible (no hidden attr)', () => {
    render(
      <Rail>
        <Rail.Section title="Ops">
          <Rail.Group icon={<span aria-hidden />} label="Settings" defaultOpen>
            <Rail.Item href="/a">Sub A</Rail.Item>
            <Rail.Item href="/b">Sub B</Rail.Item>
          </Rail.Group>
        </Rail.Section>
      </Rail>,
    );
    const subA = screen.getByRole('link', { name: 'Sub A' });
    // The inline subitems wrapper is the link's parent — check it's not hidden.
    expect(subA.closest('[hidden]')).toBeNull();
  });

  it('Group with defaultOpen=false hides subitems via the hidden attr', () => {
    const { container } = render(
      <Rail>
        <Rail.Section title="Ops">
          <Rail.Group icon={<span aria-hidden />} label="Settings">
            <Rail.Item href="/a">Sub A</Rail.Item>
          </Rail.Group>
        </Rail.Section>
      </Rail>,
    );
    // `hidden` removes the link from the accessibility tree, so getByRole
    // can't find it without { hidden: true }. The DOM-level assertion is
    // that the wrapping subitems div carries the hidden attribute.
    const hiddenWrapper = container.querySelector('[hidden]');
    expect(hiddenWrapper).not.toBeNull();
    expect(hiddenWrapper?.textContent).toContain('Sub A');
  });

  it('Group auto-opens on mount when a subitem already has aria-current="page"', () => {
    render(
      <Rail>
        <Rail.Section title="Ops">
          <Rail.Group icon={<span aria-hidden />} label="Settings">
            <Rail.Item href="/a" aria-current="page">
              Active sub
            </Rail.Item>
            <Rail.Item href="/b">Sub B</Rail.Item>
          </Rail.Group>
        </Rail.Section>
      </Rail>,
    );
    // The auto-open effect runs after mount; assert the subitems wrapper is
    // not hidden.
    const subA = screen.getByRole('link', { name: 'Active sub' });
    expect(subA.closest('[hidden]')).toBeNull();
  });

  it('Group click toggles open/closed (uncontrolled)', async () => {
    const user = userEvent.setup();
    render(
      <Rail>
        <Rail.Section title="Ops">
          <Rail.Group icon={<span aria-hidden />} label="Settings">
            <Rail.Item href="/a">Sub A</Rail.Item>
          </Rail.Group>
        </Rail.Section>
      </Rail>,
    );
    const trigger = screen.getByRole('button', { name: /Settings/ });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await user.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    await user.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('Group controlled open is driven by the parent and fires onOpenChange', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <Rail>
          <Rail.Section title="Ops">
            <Rail.Group
              icon={<span aria-hidden />}
              label="Settings"
              open={open}
              onOpenChange={setOpen}
            >
              <Rail.Item href="/a">Sub A</Rail.Item>
            </Rail.Group>
          </Rail.Section>
        </Rail>
      );
    }
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: /Settings/ });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await user.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('Group collapsed-mode trigger sets aria-haspopup="dialog" and omits aria-expanded', () => {
    render(
      <Rail defaultCollapsed>
        <Rail.Section title="Ops">
          <Rail.Group icon={<span aria-hidden />} label="Settings">
            <Rail.Item href="/a">Sub A</Rail.Item>
          </Rail.Group>
        </Rail.Section>
      </Rail>,
    );
    const trigger = screen.getByRole('button', { name: /Settings/ });
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBeNull();
  });

  it('Rail.CollapseToggle button forwards a ref to its underlying <button>', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Rail>
        <Rail.Footer>
          <Rail.CollapseToggle ref={ref} />
        </Rail.Footer>
      </Rail>,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('root forwardRef points at the <nav> element', () => {
    const ref = createRef<HTMLElement>();
    render(
      <Rail ref={ref}>
        <Rail.Section title="x">
          <Rail.Item href="/">a</Rail.Item>
        </Rail.Section>
      </Rail>,
    );
    expect(ref.current).toBeInstanceOf(HTMLElement);
    expect(ref.current?.tagName).toBe('NAV');
  });

  it('consumer className is merged, not replaced, on the root', () => {
    render(
      <Rail className="custom-cls">
        <Rail.Section title="x">
          <Rail.Item href="/">a</Rail.Item>
        </Rail.Section>
      </Rail>,
    );
    const nav = screen.getByRole('navigation');
    expect(nav.classList.contains('custom-cls')).toBe(true);
    // The Rail's own root class is still on the element (CSS-Modules-hashed
    // class containing "rail").
    expect(Array.from(nav.classList).some((c) => /rail/i.test(c))).toBe(true);
  });

  it('keeps keys unique (no warning, no dropped sections) when children include a Fragment', () => {
    // Mirrors AppShell's components view: a conditional renders a Fragment
    // wrapping multiple Sections as a single Rail child. Rail's body/footer
    // split flattens fragments — it must NOT re-key them into a collision with
    // the other top-level children (the classic duplicate ".0" key bug).
    const errors: string[] = [];
    const err = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.map(String).join(' '));
    });
    render(
      <Rail aria-label="nav">
        <Rail.Header>Brand</Rail.Header>
        <>
          <Rail.Section title="Group A">
            <Rail.Item href="/a">Alpha</Rail.Item>
          </Rail.Section>
          <Rail.Section title="Group B">
            <Rail.Item href="/b">Bravo</Rail.Item>
          </Rail.Section>
        </>
        <Rail.Spacer />
        <Rail.Footer>
          <Rail.CollapseToggle />
        </Rail.Footer>
      </Rail>,
    );
    err.mockRestore();
    expect(errors.some((e) => /same key/i.test(e))).toBe(false);
    // Sanity-check both sections still render (a key collision can, in some
    // trees, make React drop a child). The console.error assertion above is the
    // load-bearing regression check.
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
  });

  it('useRail throws when a subcomponent is rendered outside <Rail>', () => {
    // Suppress React's error-boundary noise in jsdom — the throw is the
    // assertion path; we just don't want a stack-trace dump in test output.
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Rail.CollapseToggle />)).toThrow(
      /Rail subcomponents must be used inside <Rail>/,
    );
    err.mockRestore();
  });

  it('Spacer renders with aria-hidden by default', () => {
    const { container } = render(
      <Rail>
        <Rail.Spacer data-testid="spacer" />
      </Rail>,
    );
    const spacer = container.querySelector('[data-testid="spacer"]') as HTMLElement;
    expect(spacer.getAttribute('aria-hidden')).toBe('true');
  });

  // Hover-popover timing: jsdom doesn't run real layout, but the timing
  // logic itself is deterministic. We dispatch a synthetic React
  // PointerEvent via fireEvent (which routes through React's synthetic
  // event system, so React-attached handlers fire) and drive the 80ms
  // open-delay with fake timers.
  it('Group collapsed-mode pointerenter opens the flyout after the open-delay', () => {
    vi.useFakeTimers();
    try {
      render(
        <Rail defaultCollapsed>
          <Rail.Section title="Ops">
            <Rail.Group icon={<span aria-hidden />} label="Settings">
              <Rail.Item href="/a">Sub A</Rail.Item>
              <Rail.Item href="/b">Sub B</Rail.Item>
            </Rail.Group>
          </Rail.Section>
        </Rail>,
      );
      const trigger = screen.getByRole('button', { name: /Settings/ });
      // Pre-hover: no popover dialog yet.
      expect(screen.queryByRole('dialog', { name: 'Settings' })).toBeNull();
      act(() => {
        fireEvent.pointerEnter(trigger);
      });
      // Before the open-delay elapses, still no popover.
      expect(screen.queryByRole('dialog', { name: 'Settings' })).toBeNull();
      act(() => {
        vi.advanceTimersByTime(100);
      });
      // After delay, the flyout is mounted.
      expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not repeat a collapsed group subitem label in an automatic Tooltip', () => {
    vi.useFakeTimers();
    try {
      render(
        <Rail defaultCollapsed>
          <Rail.Section title="Ops">
            <Rail.Group icon={<span aria-hidden />} label="Settings">
              <Rail.Item href="/profile">Profile</Rail.Item>
            </Rail.Group>
          </Rail.Section>
        </Rail>,
      );

      fireEvent.pointerEnter(screen.getByRole('button', { name: /Settings/ }));
      act(() => {
        vi.advanceTimersByTime(100);
      });

      const flyout = screen.getByRole('dialog', { name: 'Settings' });
      const subitem = within(flyout).getByRole('link', { name: 'Profile' });
      expect(subitem).toBeVisible();
      fireEvent.pointerEnter(subitem);
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.queryByRole('tooltip')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the automatic Tooltip for a standalone collapsed item', () => {
    vi.useFakeTimers();
    try {
      render(
        <Rail defaultCollapsed>
          <Rail.Section title="Main">
            <Rail.Item icon={<span aria-hidden />} href="/dashboard">
              Dashboard
            </Rail.Item>
          </Rail.Section>
        </Rail>,
      );

      fireEvent.pointerEnter(screen.getByRole('link', { name: 'Dashboard' }));
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByRole('tooltip')).toHaveTextContent('Dashboard');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Rail — Group flyout overlay elevation (#273)', () => {
  function renderCollapsedGroup(wrap?: (node: React.ReactNode) => React.ReactNode) {
    const tree = (
      <Rail defaultCollapsed>
        <Rail.Section title="Ops">
          <Rail.Group icon={<span aria-hidden />} label="Settings">
            <Rail.Item href="/a">Sub A</Rail.Item>
          </Rail.Group>
        </Rail.Section>
      </Rail>
    );
    render(<>{wrap ? wrap(tree) : tree}</>);
  }

  function openFlyout() {
    const trigger = screen.getByRole('button', { name: /Settings/ });
    act(() => {
      fireEvent.pointerEnter(trigger);
    });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    return screen.getByRole('dialog', { name: 'Settings' });
  }

  it('elevates the flyout (data-in-overlay) when the rail sits inside an overlay', () => {
    vi.useFakeTimers();
    try {
      renderCollapsedGroup((node) => <div data-drawer-portal-root="">{node}</div>);
      expect(openFlyout()).toHaveAttribute('data-in-overlay', '');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not elevate the flyout at page level', () => {
    vi.useFakeTimers();
    try {
      renderCollapsedGroup();
      expect(openFlyout()).not.toHaveAttribute('data-in-overlay');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('Rail — scroll box axes', () => {
  // jsdom never loads the compiled CSS module, so computed styles can't be
  // asserted. Same SCSS-source fallback DropdownMenu.test.tsx uses for its
  // equivalent overflow contract.
  const scss = readFileSync(resolve(__dirname, 'Rail.module.scss'), 'utf8');

  it('.body clips the X axis instead of scrolling it', () => {
    // Declaring only `overflow-y: auto` leaves X at `visible`, which the spec
    // computes to `auto` — so the box scrolls horizontally. Collapsed, the
    // vertical gutter squeezes the ~39px body below an item row's min-content
    // width and a horizontal scrollbar appears under the icon column.
    // ^ anchors to the bare `.body` rule (a descendant rule like
    // `.collapsed .body` must not satisfy this), and [^}]* bounds the match
    // inside that block so a later rule's overflow-x can't either.
    expect(scss).toMatch(/^\.body\s*\{[^}]*overflow-y:\s*auto/m);
    expect(scss).toMatch(/^\.body\s*\{[^}]*overflow-x:\s*hidden/m);
  });

  it('hides the scroll gutter in collapsed (icon-only) mode', () => {
    // At 56px the gutter is a quarter of the body's width and shifts every
    // item pill off-center. Wheel/keyboard scrolling still works without it.
    expect(scss).toMatch(/\.collapsed\s+\.body\s*\{[^}]*scrollbar-width:\s*none/);
  });
});

describe('Rail — collapseBelow (viewport override)', () => {
  // jsdom implements no `window.matchMedia` at all, so every test here installs
  // its own stub. It's width-driven and fires real `change` events so the
  // component's subscription path is exercised, not just the initial read.
  const original = Object.getOwnPropertyDescriptor(window, 'matchMedia');

  afterEach(() => {
    if (original) Object.defineProperty(window, 'matchMedia', original);
    else delete (window as { matchMedia?: unknown }).matchMedia;
  });

  const body = (
    <>
      <Rail.Section title="Main">
        <Rail.Item icon={<span data-testid="icon" />} href="/">
          Dashboard
        </Rail.Item>
      </Rail.Section>
      <Rail.Footer>
        <Rail.CollapseToggle />
      </Rail.Footer>
    </>
  );

  it('forces the collapsed state below the breakpoint even with collapsed={false}', () => {
    stubMatchMedia(400);
    render(
      <Rail collapsed={false} collapseBelow="sm">
        {body}
      </Rail>,
    );
    expect(screen.getByRole('navigation')).toHaveAttribute('data-collapsed');
  });

  it('lets the consumer value govern above the breakpoint', () => {
    stubMatchMedia(900);
    render(
      <Rail collapsed={false} collapseBelow="sm">
        {body}
      </Rail>,
    );
    expect(screen.getByRole('navigation')).not.toHaveAttribute('data-collapsed');
  });

  it('collapses and releases as the viewport crosses the breakpoint', () => {
    const viewport = stubMatchMedia(900);
    render(
      <Rail collapsed={false} collapseBelow="md">
        {body}
      </Rail>,
    );
    const nav = screen.getByRole('navigation');
    expect(nav).not.toHaveAttribute('data-collapsed');
    viewport.resizeTo(500);
    expect(nav).toHaveAttribute('data-collapsed');
    viewport.resizeTo(900);
    expect(nav).not.toHaveAttribute('data-collapsed');
  });

  it('does NOT fire onCollapsedChange when the viewport crosses the breakpoint', () => {
    const viewport = stubMatchMedia(900);
    const onCollapsedChange = vi.fn();
    render(
      <Rail collapsed={false} onCollapsedChange={onCollapsedChange} collapseBelow="sm">
        {body}
      </Rail>,
    );
    viewport.resizeTo(400);
    expect(screen.getByRole('navigation')).toHaveAttribute('data-collapsed');
    expect(onCollapsedChange).not.toHaveBeenCalled();
    viewport.resizeTo(900);
    expect(screen.getByRole('navigation')).not.toHaveAttribute('data-collapsed');
    expect(onCollapsedChange).not.toHaveBeenCalled();
  });

  it('leaves the uncontrolled toggle state intact across a narrow → wide round trip', async () => {
    const user = userEvent.setup();
    const viewport = stubMatchMedia(900);
    render(
      <Rail defaultCollapsed={false} collapseBelow="sm">
        {body}
      </Rail>,
    );
    const nav = screen.getByRole('navigation');

    // User asks for collapsed while wide.
    await user.click(screen.getByRole('button', { name: 'Collapse navigation' }));
    expect(nav).toHaveAttribute('data-collapsed');

    // Narrow and back: the stored choice is still "collapsed".
    viewport.resizeTo(400);
    viewport.resizeTo(900);
    expect(nav).toHaveAttribute('data-collapsed');

    // ...and it is still the consumer's own state, so it can be reversed.
    await user.click(screen.getByRole('button', { name: 'Expand navigation' }));
    expect(nav).not.toHaveAttribute('data-collapsed');
  });

  it('hides the CollapseToggle while the override is active and restores it after', () => {
    const viewport = stubMatchMedia(900);
    render(<Rail collapseBelow="sm">{body}</Rail>);
    expect(screen.getByRole('button', { name: 'Collapse navigation' })).toBeInTheDocument();
    viewport.resizeTo(400);
    expect(screen.queryByRole('button', { name: /navigation/i })).not.toBeInTheDocument();
    viewport.resizeTo(900);
    expect(screen.getByRole('button', { name: 'Collapse navigation' })).toBeInTheDocument();
  });

  it('renders without crashing when matchMedia is unavailable (SSR-ish guard)', () => {
    delete (window as { matchMedia?: unknown }).matchMedia;
    render(
      <Rail collapsed={false} collapseBelow="sm">
        {body}
      </Rail>,
    );
    expect(screen.getByRole('navigation')).not.toHaveAttribute('data-collapsed');
    expect(screen.getByRole('button', { name: 'Collapse navigation' })).toBeInTheDocument();
  });

  it.each([
    ['sm', 480],
    ['md', 640],
    ['lg', 768],
  ] as const)('collapses AT the %s breakpoint (%ipx), inclusive', (breakpoint, px) => {
    // Pins the token→pixel mapping and the inclusive boundary through the
    // component, not just the map: `max-width` matches AT the value, so a rail
    // is collapsed at exactly `px` and expanded one pixel above it. Previously
    // browser-verified only, which regresses silently.
    const viewport = stubMatchMedia(px);
    const { container } = render(
      <Rail collapsed={false} collapseBelow={breakpoint}>
        <Rail.Section title="Main">
          <Rail.Item href="/">Home</Rail.Item>
        </Rail.Section>
      </Rail>,
    );
    const nav = container.querySelector('nav')!;
    expect(nav).toHaveAttribute('data-collapsed');

    viewport.resizeTo(px + 1);
    expect(nav).not.toHaveAttribute('data-collapsed');
  });

  it('a custom toggle still flips the stored preference while the override is active', async () => {
    // The built-in CollapseToggle hides itself while narrow, so this contract —
    // documented on the prop — is only reachable through a consumer's own
    // control calling setCollapsed from context.
    function CustomToggle() {
      const { collapsed, collapsedByViewport, setCollapsed } = useRail();
      return (
        <button onClick={() => setCollapsed((prev) => !prev)}>
          {`effective:${collapsed} byViewport:${collapsedByViewport}`}
        </button>
      );
    }
    const onCollapsedChange = vi.fn();
    const viewport = stubMatchMedia(400);
    render(
      <Rail collapseBelow="sm" defaultCollapsed={false} onCollapsedChange={onCollapsedChange}>
        <Rail.Section title="Main">
          <Rail.Item href="/">Home</Rail.Item>
        </Rail.Section>
        <Rail.Footer>
          <CustomToggle />
        </Rail.Footer>
      </Rail>,
    );

    // Narrow: effective collapsed, but the stored preference is still false.
    expect(screen.getByRole('button')).toHaveTextContent('effective:true byViewport:true');

    // A user press while narrow flips the PREFERENCE (and does fire the
    // callback — this one IS a user choice, unlike a breakpoint cross).
    await userEvent.click(screen.getByRole('button'));
    expect(onCollapsedChange).toHaveBeenCalledExactlyOnceWith(true);

    // Widening reveals the preference the user set while narrow.
    viewport.resizeTo(900);
    expect(screen.getByRole('button')).toHaveTextContent('effective:true byViewport:false');
  });
});

describe('Rail — linkable Group (#377)', () => {
  // The playground and these tests use a plain <a> via `as="a"` rather than a
  // NavLink: the active state is purely CSS off [aria-current="page"], so a
  // hard-coded attribute exercises the same contract with no router.
  function renderLinkGroup(
    props: {
      collapsed?: boolean;
      onClick?: React.MouseEventHandler<HTMLAnchorElement>;
      onPointerEnter?: React.PointerEventHandler<HTMLAnchorElement>;
      'aria-current'?: 'page';
      'data-testid'?: string;
    } = {},
  ) {
    const { collapsed, ...linkProps } = props;
    return render(
      <Rail defaultCollapsed={collapsed}>
        <Rail.Section title="Main">
          <Rail.Group
            as="a"
            href="#/deals"
            icon={<span aria-hidden />}
            label="Deals"
            {...linkProps}
          >
            <Rail.Item href="#/deals?view=open">My open USD</Rail.Item>
          </Rail.Group>
        </Rail.Section>
      </Rail>,
    );
  }

  it('without link props renders exactly one button and toggles as before', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Rail>
        <Rail.Section title="Ops">
          <Rail.Group icon={<span aria-hidden />} label="Settings">
            <Rail.Item href="/a">Sub A</Rail.Item>
          </Rail.Group>
        </Rail.Section>
      </Rail>,
    );
    // Regression guard for "purely additive": the toggle-only shape is still a
    // single <button> spanning the row, with no separate chevron target and no
    // link in the row at all.
    const buttons = container.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    const trigger = buttons[0];
    expect(trigger).toHaveAccessibleName(/Settings/);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await user.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('with link props splits the row into a link and a chevron button', () => {
    renderLinkGroup();
    const link = screen.getByRole('link', { name: 'Deals' });
    expect(link).toHaveAttribute('href', '#/deals');
    // aria-expanded belongs to the chevron only — never the link.
    expect(link).not.toHaveAttribute('aria-expanded');
    const chevron = screen.getByRole('button', { name: 'Expand Deals' });
    expect(chevron.getAttribute('aria-expanded')).toBe('false');
    // Keyboard order within the row: link first, then chevron.
    expect(link.compareDocumentPosition(chevron) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('the chevron aria-controls the real subitem list and renames per state', async () => {
    const user = userEvent.setup();
    renderLinkGroup();
    const chevron = screen.getByRole('button', { name: 'Expand Deals' });
    const controlled = document.getElementById(chevron.getAttribute('aria-controls')!);
    expect(controlled).not.toBeNull();
    expect(controlled).toHaveTextContent('My open USD');
    await user.click(chevron);
    expect(chevron.getAttribute('aria-expanded')).toBe('true');
    expect(chevron).toHaveAccessibleName('Collapse Deals');
  });

  it('uses the ru locale for the chevron name', () => {
    render(
      <I18nProvider locale="ru">
        <Rail>
          <Rail.Section title="Main">
            <Rail.Group as="a" href="#/deals" icon={<span aria-hidden />} label="Deals">
              <Rail.Item href="#/deals?view=open">My open USD</Rail.Item>
            </Rail.Group>
          </Rail.Section>
        </Rail>
      </I18nProvider>,
    );
    expect(screen.getByRole('button', { name: 'Развернуть Deals' })).toBeInTheDocument();
  });

  it('clicking the label navigates without toggling', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((e: React.MouseEvent) => e.preventDefault());
    renderLinkGroup({ onClick });
    await user.click(screen.getByRole('link', { name: 'Deals' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Expand Deals' })).toBeInTheDocument();
  });

  it('clicking the chevron toggles without navigating', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((e: React.MouseEvent) => e.preventDefault());
    renderLinkGroup({ onClick });
    await user.click(screen.getByRole('button', { name: 'Expand Deals' }));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Collapse Deals' })).toBeInTheDocument();
  });

  it('Enter on the link navigates without toggling', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((e: React.MouseEvent) => e.preventDefault());
    renderLinkGroup({ onClick });
    screen.getByRole('link', { name: 'Deals' }).focus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Expand Deals' })).toBeInTheDocument();
  });

  it.each(['{Enter}', ' '])('%s on the chevron toggles without navigating', async (key) => {
    const user = userEvent.setup();
    const onClick = vi.fn((e: React.MouseEvent) => e.preventDefault());
    renderLinkGroup({ onClick });
    screen.getByRole('button', { name: 'Expand Deals' }).focus();
    await user.keyboard(key);
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Collapse Deals' })).toBeInTheDocument();
  });

  it("auto-opens when the group's OWN link is the current page", () => {
    renderLinkGroup({ 'aria-current': 'page' });
    // Landing on /deals reveals the nested saved views — the point of nesting.
    expect(screen.getByRole('link', { name: 'My open USD' }).closest('[hidden]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Collapse Deals' })).toBeInTheDocument();
  });

  it('the own-link auto-open is one-shot — a manual close survives a re-render', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [tick, setTick] = useState(0);
      return (
        <>
          <button onClick={() => setTick(tick + 1)}>rerender {tick}</button>
          <Rail>
            <Rail.Section title="Main">
              <Rail.Group
                as="a"
                href="#/deals"
                aria-current="page"
                icon={<span aria-hidden />}
                label="Deals"
              >
                <Rail.Item href="#/deals?view=open">My open USD</Rail.Item>
              </Rail.Group>
            </Rail.Section>
          </Rail>
        </>
      );
    }
    render(<Harness />);
    const chevron = screen.getByRole('button', { name: 'Collapse Deals' });
    await user.click(chevron);
    expect(chevron.getAttribute('aria-expanded')).toBe('false');
    await user.click(screen.getByRole('button', { name: /rerender/ }));
    // Still closed: the effect must not re-fire now that the user has spoken.
    expect(chevron.getAttribute('aria-expanded')).toBe('false');
  });

  it('forwards ref to the wrapper <div>, not the link, when linkable', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <Rail>
        <Rail.Section title="Main">
          <Rail.Group ref={ref} as="a" href="#/deals" icon={<span aria-hidden />} label="Deals">
            <Rail.Item href="#/deals?view=open">My open USD</Rail.Item>
          </Rail.Group>
        </Rail.Section>
      </Rail>,
    );
    expect(ref.current?.tagName).toBe('DIV');
    expect(ref.current).toContainElement(screen.getByRole('link', { name: 'Deals' }));
  });

  it('merges className on the wrapper while the rest of the props follow `as`', () => {
    const { container } = render(
      <Rail>
        <Rail.Section title="Main">
          <Rail.Group
            as="a"
            href="#/deals"
            className="mine"
            data-testid="deals-nav"
            icon={<span aria-hidden />}
            label="Deals"
          >
            <Rail.Item href="#/deals?view=open">My open USD</Rail.Item>
          </Rail.Group>
        </Rail.Section>
      </Rail>,
    );
    // className merges onto the wrapper (never replaces the group class)...
    const wrapper = container.querySelector('.mine')!;
    expect(wrapper.tagName).toBe('DIV');
    expect(wrapper.className).toMatch(/group/);
    // ...while everything else lands on the link, which is what `to` / `href`
    // are for.
    expect(wrapper).not.toHaveAttribute('href');
    const link = screen.getByRole('link', { name: 'Deals' });
    expect(link).toHaveAttribute('data-testid', 'deals-nav');
  });

  it("composes the consumer's onPointerEnter instead of letting it kill the flyout", () => {
    // Regression guard: these handlers are the collapsed flyout's ONLY trigger,
    // and `.collapsed .subitems` is display:none — a consumer's own hover
    // handler winning would make the subitems unreachable with nothing warning.
    vi.useFakeTimers();
    try {
      const onPointerEnter = vi.fn();
      renderLinkGroup({ collapsed: true, onPointerEnter });
      const trigger = screen.getByRole('link', { name: 'Deals' });
      act(() => {
        fireEvent.pointerEnter(trigger);
      });
      expect(onPointerEnter).toHaveBeenCalledOnce();
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(screen.getByRole('dialog', { name: 'Deals' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not duplicate identifying attributes onto the flyout header link', () => {
    vi.useFakeTimers();
    try {
      renderLinkGroup({ collapsed: true, 'data-testid': 'deals-nav' });
      act(() => {
        fireEvent.pointerEnter(screen.getByTestId('deals-nav'));
      });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      const flyout = screen.getByRole('dialog', { name: 'Deals' });
      // The header is a second rendering of the same destination, not a second
      // instance of the consumer's element — so getByTestId still resolves.
      expect(within(flyout).getByRole('link', { name: 'Deals' })).toHaveAttribute(
        'href',
        '#/deals',
      );
      expect(screen.getByTestId('deals-nav')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not duplicate current-page markers into the collapsed flyout', () => {
    vi.useFakeTimers();
    try {
      render(
        <Rail defaultCollapsed>
          <Rail.Section title="Main">
            <Rail.Group
              as="a"
              href="#/deals"
              aria-current="page"
              icon={<span aria-hidden />}
              label="Deals"
            >
              <Rail.Item href="#/deals?view=open" aria-current="page">
                My open USD
              </Rail.Item>
            </Rail.Group>
          </Rail.Section>
        </Rail>,
      );

      const trigger = screen.getByRole('link', { name: 'Deals' });
      act(() => fireEvent.pointerEnter(trigger));
      act(() => vi.advanceTimersByTime(100));

      const flyout = screen.getByRole('dialog', { name: 'Deals' });
      expect(trigger).toHaveAttribute('aria-current', 'page');
      expect(flyout.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('collapsed: no chevron, hover opens the flyout, and its header is a link', () => {
    vi.useFakeTimers();
    try {
      renderLinkGroup({ collapsed: true });
      // The single 40px target must do the primary action, so there is no
      // second (chevron) target to compete with it.
      expect(screen.queryByRole('button', { name: /Deals/ })).toBeNull();
      const trigger = screen.getByRole('link', { name: 'Deals' });
      expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
      act(() => {
        fireEvent.pointerEnter(trigger);
      });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      const flyout = screen.getByRole('dialog', { name: 'Deals' });
      // The header links to the same destination so the parent page stays
      // reachable once the flyout is open.
      const header = within(flyout).getByRole('link', { name: 'Deals' });
      expect(header).toHaveAttribute('href', '#/deals');
    } finally {
      vi.useRealTimers();
    }
  });

  it('collapsed: Tab traverses the portalled flyout then rejoins Rail order', async () => {
    const user = userEvent.setup();
    render(
      <Rail defaultCollapsed>
        <Rail.Section title="Main">
          <Rail.Item href="#/companies" icon={<span aria-hidden />}>
            Companies
          </Rail.Item>
          <Rail.Group as="a" href="#/deals" icon={<span aria-hidden />} label="Deals">
            <Rail.Item href="#/deals?view=open">My open USD</Rail.Item>
          </Rail.Group>
          <Rail.Item href="#/projects" icon={<span aria-hidden />} tabIndex={-1}>
            Projects
          </Rail.Item>
          <Rail.Item href="#/stalled" icon={<span aria-hidden />}>
            Stalled
          </Rail.Item>
          <Rail.Item href="#/reports" icon={<span aria-hidden />}>
            Reports
          </Rail.Item>
        </Rail.Section>
      </Rail>,
    );

    const trigger = screen.getByRole('link', { name: 'Deals' });
    vi.spyOn(screen.getByRole('link', { name: 'Stalled' }), 'focus').mockImplementation(() => {});
    trigger.focus();
    await user.tab();

    const flyout = await screen.findByRole('dialog', { name: 'Deals' });
    expect(within(flyout).getByRole('link', { name: 'Deals' })).toHaveFocus();
    await user.tab();
    expect(within(flyout).getByRole('link', { name: 'My open USD' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('link', { name: 'Reports' })).toHaveFocus();
  });

  it('collapsed: Shift+Tab from the first flyout item returns to the trigger', async () => {
    const user = userEvent.setup();
    renderLinkGroup({ collapsed: true });
    const trigger = screen.getByRole('link', { name: 'Deals' });
    trigger.focus();
    await user.tab();
    const flyout = await screen.findByRole('dialog', { name: 'Deals' });
    expect(within(flyout).getByRole('link', { name: 'Deals' })).toHaveFocus();

    await user.tab({ shift: true });

    expect(trigger).toHaveFocus();
  });

  it('collapsed toggle-only group follows the same trigger → children → next-item order', async () => {
    const user = userEvent.setup();
    render(
      <Rail defaultCollapsed>
        <Rail.Section title="Main">
          <Rail.Group icon={<span aria-hidden />} label="Settings">
            <Rail.Item href="#/general">General</Rail.Item>
          </Rail.Group>
          <Rail.Item href="#/projects" icon={<span aria-hidden />}>
            Projects
          </Rail.Item>
        </Rail.Section>
      </Rail>,
    );
    const trigger = screen.getByRole('button', { name: 'Settings' });
    trigger.focus();
    await user.tab();
    const flyout = await screen.findByRole('dialog', { name: 'Settings' });
    const finalItem = within(flyout).getByRole('link', { name: 'General' });
    expect(finalItem).toHaveFocus();

    await user.tab();

    expect(screen.getByRole('link', { name: 'Projects' })).toHaveFocus();
  });

  it('collapsed: Escape closes the flyout, restores focus, and does not reopen it', async () => {
    const user = userEvent.setup();
    renderLinkGroup({ collapsed: true });
    const trigger = screen.getByRole('link', { name: 'Deals' });
    trigger.focus();
    await user.tab();
    expect(await screen.findByRole('dialog', { name: 'Deals' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('dialog', { name: 'Deals' })).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(screen.queryByRole('dialog', { name: 'Deals' })).toBeNull();
  });

  it('collapsed hidden-only final group does not trap focus on its trigger', async () => {
    const user = userEvent.setup();
    render(
      <Rail defaultCollapsed>
        <Rail.Section title="Main">
          <Rail.Group icon={<span aria-hidden />} label="Empty">
            <Rail.Item href="#/hidden" style={{ display: 'none' }}>
              Hidden
            </Rail.Item>
          </Rail.Group>
        </Rail.Section>
      </Rail>,
    );
    const trigger = screen.getByRole('button', { name: 'Empty' });
    trigger.focus();

    await user.tab();

    expect(document.body).toHaveFocus();
    expect(screen.queryByRole('dialog', { name: 'Empty' })).toBeNull();
  });

  it('collapsed nonempty final group exits the flyout instead of cycling within it', async () => {
    const user = userEvent.setup();
    render(
      <Rail defaultCollapsed>
        <Rail.Section title="Main">
          <Rail.Group icon={<span aria-hidden />} label="Settings">
            <Rail.Item href="#/general">General</Rail.Item>
          </Rail.Group>
        </Rail.Section>
      </Rail>,
    );
    const trigger = screen.getByRole('button', { name: 'Settings' });
    trigger.focus();
    await user.tab();
    const flyout = await screen.findByRole('dialog', { name: 'Settings' });
    const finalItem = within(flyout).getByRole('link', { name: 'General' });
    expect(finalItem).toHaveFocus();
    // No external destination exists, so the component must leave this Tab
    // uncancelled and let the browser advance beyond the document.
    expect(fireEvent.keyDown(finalItem, { key: 'Tab' })).toBe(true);

    await user.tab();

    expect(document.body).toHaveFocus();
  });
});
