import { act, createRef, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../../i18n/I18nProvider';
import { Rail } from './Rail';

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
});
