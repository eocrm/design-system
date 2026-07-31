import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useEffect, useState } from 'react';
import { Tabs, type TabItem, type TabsAction } from './Tabs';

const items: TabItem[] = [
  { id: 'a', label: 'Overview' },
  { id: 'b', label: 'Activity', count: 4 },
  { id: 'c', label: 'Notes' },
];

const noop = () => undefined;

interface ResizeObserverHarness {
  resize: (width: number) => void;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

function stubResizeObserver(): ResizeObserverHarness {
  let callback: ResizeObserverCallback | undefined;
  const observe = vi.fn();
  const disconnect = vi.fn();
  class MockResizeObserver {
    constructor(cb: ResizeObserverCallback) {
      callback = cb;
    }
    observe = observe;
    disconnect = disconnect;
    unobserve = vi.fn();
  }
  vi.stubGlobal('ResizeObserver', MockResizeObserver);
  return {
    observe,
    disconnect,
    resize(width) {
      act(() => {
        callback?.(
          [{ contentRect: { width } } as ResizeObserverEntry],
          null as unknown as ResizeObserver,
        );
      });
    },
  };
}

describe('Tabs', () => {
  it('renders a tablist with each item as a tab', () => {
    render(<Tabs items={items} activeId="a" onChange={noop} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByRole('tab', { name: /Overview/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Activity/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Notes/ })).toBeInTheDocument();
  });

  it('marks only the active tab with aria-selected="true"', () => {
    render(<Tabs items={items} activeId="b" onChange={noop} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false']);
  });

  it('renders count chips for items with a count', () => {
    render(<Tabs items={items} activeId="a" onChange={noop} />);
    expect(screen.getByRole('tab', { name: /Activity/ })).toHaveTextContent('4');
  });

  it('does not render a count chip when count is undefined', () => {
    render(<Tabs items={items} activeId="a" onChange={noop} />);
    expect(screen.getByRole('tab', { name: 'Overview' }).textContent).toBe('Overview');
  });

  it('calls onChange with the clicked tab id', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Tabs items={items} activeId="a" onChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: /Notes/ }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('does not call onChange when clicking the already-active tab', async () => {
    // The component de-dupes — clicking the already-active tab is a no-op so
    // parents don't get redundant re-renders.
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Tabs items={items} activeId="a" onChange={onChange} />);
    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('updates aria-selected when activeId changes (integration with caller state)', async () => {
    function Wrapper() {
      const [active, setActive] = useState('a');
      return <Tabs items={items} activeId={active} onChange={setActive} />;
    }
    const user = userEvent.setup();
    render(<Wrapper />);
    await user.click(screen.getByRole('tab', { name: /Notes/ }));
    expect(screen.getByRole('tab', { name: /Notes/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'false');
  });

  it('merges the className prop on the tablist', () => {
    render(<Tabs items={items} activeId="a" onChange={noop} className="external" />);
    expect(screen.getByRole('tablist').className).toMatch(/external/);
  });

  it('forwards refs to the underlying tablist div', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Tabs items={items} activeId="a" onChange={noop} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.getAttribute('role')).toBe('tablist');
  });

  it('spreads native HTML attributes onto the tablist', () => {
    render(
      <Tabs
        items={items}
        activeId="a"
        onChange={noop}
        aria-label="Sections"
        data-testid="contact-tabs"
      />,
    );
    const list = screen.getByRole('tablist');
    expect(list).toHaveAttribute('aria-label', 'Sections');
    expect(list).toHaveAttribute('data-testid', 'contact-tabs');
  });

  it('applies roving tabIndex — active tab is 0, others are -1', () => {
    render(<Tabs items={items} activeId="b" onChange={noop} />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['-1', '0', '-1']);
  });

  it('points each tab at its corresponding panel via aria-controls', () => {
    render(<Tabs items={items} activeId="a" onChange={noop} panelIdPrefix="contact" />);
    const overview = screen.getByRole('tab', { name: 'Overview' });
    expect(overview).toHaveAttribute('aria-controls', 'contact-a-panel');
    expect(overview).toHaveAttribute('id', 'contact-a-tab');
  });

  it('moves focus to the next tab on ArrowRight and calls onChange', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Tabs items={items} activeId="a" onChange={onChange} />);
    screen.getByRole('tab', { name: 'Overview' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('b');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: /Activity/ }));
  });

  it('moves focus to the previous tab on ArrowLeft and wraps from the first', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Tabs items={items} activeId="a" onChange={onChange} />);
    screen.getByRole('tab', { name: 'Overview' }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith('c');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Notes' }));
  });

  it('jumps to the first tab on Home and the last on End', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Tabs items={items} activeId="b" onChange={onChange} />);
    screen.getByRole('tab', { name: /Activity/ }).focus();
    await user.keyboard('{End}');
    expect(onChange).toHaveBeenLastCalledWith('c');
    await user.keyboard('{Home}');
    expect(onChange).toHaveBeenLastCalledWith('a');
  });

  it('produces CSS-safe ids when panelIdPrefix is omitted', () => {
    render(<Tabs items={items} activeId="a" onChange={noop} />);
    const tab = screen.getByRole('tab', { name: 'Overview' });
    const tabId = tab.getAttribute('id');
    const controls = tab.getAttribute('aria-controls');
    expect(tabId).toBeTruthy();
    expect(controls).toBeTruthy();
    // No characters that need CSS escaping (no colons, no curly braces).
    expect(tabId).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(controls).toMatch(/^[a-zA-Z0-9_-]+$/);
  });

  it('renders nothing inside the tablist when items is empty (no crash)', () => {
    render(<Tabs items={[]} activeId="" onChange={noop} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('keeps the tablist keyboard-reachable when activeId matches no item', () => {
    render(<Tabs items={items} activeId="missing" onChange={noop} />);
    const tabs = screen.getAllByRole('tab');
    // No tab is aria-selected (no valid active item).
    expect(tabs.every((t) => t.getAttribute('aria-selected') === 'false')).toBe(true);
    // But the FIRST tab falls back to tabIndex=0 so the user can still reach
    // the strip via Tab and start navigating with arrow keys.
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
  });

  describe('activationMode="manual"', () => {
    it('moves focus on arrow keys without firing onChange', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Tabs items={items} activeId="a" onChange={onChange} activationMode="manual" />);
      screen.getByRole('tab', { name: 'Overview' }).focus();
      await user.keyboard('{ArrowRight}');
      expect(document.activeElement).toBe(screen.getByRole('tab', { name: /Activity/ }));
      expect(onChange).not.toHaveBeenCalled();
      // aria-selected still on the original tab.
      expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });

    it('fires onChange when the user presses Enter on a focused tab', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Tabs items={items} activeId="a" onChange={onChange} activationMode="manual" />);
      screen.getByRole('tab', { name: 'Overview' }).focus();
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{Enter}');
      expect(onChange).toHaveBeenCalledWith('b');
    });

    it('fires onChange when the user presses Space on a focused tab', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Tabs items={items} activeId="a" onChange={onChange} activationMode="manual" />);
      screen.getByRole('tab', { name: 'Overview' }).focus();
      await user.keyboard('{ArrowRight}');
      await user.keyboard(' ');
      expect(onChange).toHaveBeenCalledWith('b');
    });
  });

  it('sets aria-orientation on the tablist (default "horizontal")', () => {
    render(<Tabs items={items} activeId="a" onChange={noop} />);
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('respects an explicit vertical orientation', () => {
    render(<Tabs items={items} activeId="a" onChange={noop} orientation="vertical" />);
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
  });

  describe('vertical orientation', () => {
    it('moves focus to the next tab on ArrowDown and calls onChange', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Tabs items={items} activeId="a" onChange={onChange} orientation="vertical" />);
      screen.getByRole('tab', { name: 'Overview' }).focus();
      await user.keyboard('{ArrowDown}');
      expect(onChange).toHaveBeenLastCalledWith('b');
      expect(document.activeElement).toBe(screen.getByRole('tab', { name: /Activity/ }));
    });

    it('wraps from the first tab to the last on ArrowUp', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Tabs items={items} activeId="a" onChange={onChange} orientation="vertical" />);
      screen.getByRole('tab', { name: 'Overview' }).focus();
      await user.keyboard('{ArrowUp}');
      expect(onChange).toHaveBeenLastCalledWith('c');
      expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Notes' }));
    });

    it('ignores ArrowLeft / ArrowRight in vertical mode', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Tabs items={items} activeId="a" onChange={onChange} orientation="vertical" />);
      screen.getByRole('tab', { name: 'Overview' }).focus();
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{ArrowLeft}');
      expect(onChange).not.toHaveBeenCalled();
      // Focus must not move either — Left/Right are fully inert in vertical mode.
      expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Overview' }));
    });

    it('writes a translateY transform and a px height on the indicator', () => {
      const { container } = render(
        <Tabs items={items} activeId="a" onChange={noop} orientation="vertical" />,
      );
      const indicator = container.querySelector('[class*="indicator"]') as HTMLElement;
      expect(indicator.style.transform).toMatch(/translateY\(/);
      expect(indicator.style.height).toMatch(/px$/);
    });

    it('marks the tablist with the vertical class', () => {
      render(<Tabs items={items} activeId="a" onChange={noop} orientation="vertical" />);
      expect(screen.getByRole('tablist').className).toMatch(/vertical/);
    });
  });

  describe('automatic orientation', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('starts vertical and observes the available scroll wrapper, not the forwarded tablist', () => {
      const observer = stubResizeObserver();
      const ref = createRef<HTMLDivElement>();
      render(<Tabs ref={ref} items={items} activeId="a" onChange={noop} orientation="auto" />);
      const tablist = screen.getByRole('tablist');
      const scrollWrapper = tablist.parentElement;
      expect(ref.current).toBe(tablist);
      expect(scrollWrapper).toBeInstanceOf(HTMLDivElement);
      expect(observer.observe).toHaveBeenCalledWith(scrollWrapper);
      expect(observer.observe).not.toHaveBeenCalledWith(ref.current);
      expect(ref.current).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('observes the stable outer root when endContent shares the available row width', () => {
      const observer = stubResizeObserver();
      const { container } = render(
        <Tabs
          items={items}
          activeId="a"
          onChange={noop}
          orientation="auto"
          endContent={<button type="button">New</button>}
        />,
      );
      const tablist = screen.getByRole('tablist');
      const root = container.firstElementChild;
      expect(root).toBeInstanceOf(HTMLDivElement);
      expect(observer.observe).toHaveBeenCalledWith(root);
      expect(observer.observe).not.toHaveBeenCalledWith(tablist);
    });

    it('switches semantics, styling, keyboard axis, and indicator geometry at 320px', async () => {
      const observer = stubResizeObserver();
      const onChange = vi.fn();
      const user = userEvent.setup();
      const { container } = render(
        <Tabs items={items} activeId="a" onChange={onChange} orientation="auto" />,
      );
      observer.resize(320);
      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-orientation', 'horizontal');
      expect(tablist.className).not.toMatch(/vertical/);
      screen.getByRole('tab', { name: 'Overview' }).focus();
      await user.keyboard('{ArrowRight}');
      expect(onChange).toHaveBeenCalledWith('b');
      const indicator = container.querySelector('[class*="indicator"]') as HTMLElement;
      expect(indicator.style.transform).toMatch(/translateX\(/);
      expect(indicator.style.width).toMatch(/px$/);
      expect(indicator.style.height).toBe('');
    });

    it('switches back below 320px and uses vertical arrow navigation', async () => {
      const observer = stubResizeObserver();
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<Tabs items={items} activeId="a" onChange={onChange} orientation="auto" />);
      observer.resize(480);
      observer.resize(319);
      expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
      screen.getByRole('tab', { name: 'Overview' }).focus();
      await user.keyboard('{ArrowDown}');
      expect(onChange).toHaveBeenCalledWith('b');
    });

    it.each(['horizontal', 'vertical'] as const)(
      'does not observe explicit %s mode',
      (orientation) => {
        const observer = stubResizeObserver();
        render(<Tabs items={items} activeId="a" onChange={noop} orientation={orientation} />);
        expect(observer.observe).not.toHaveBeenCalled();
      },
    );
  });

  it('warns in dev when items contains duplicate ids', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const dupes: TabItem[] = [
        { id: 'a', label: 'A' },
        { id: 'a', label: 'A again' },
      ];
      render(<Tabs items={dupes} activeId="a" onChange={noop} />);
      expect(warn).toHaveBeenCalled();
      expect(warn.mock.calls[0][0]).toMatch(/duplicate ids/);
    } finally {
      warn.mockRestore();
    }
  });

  it('keeps tab refs functional across re-renders (no churn-induced loss)', async () => {
    // Locks in the per-render ref-callback approach: even though the callback
    // identity changes each render, refs stay populated and arrow-key focus
    // routing keeps working.
    function Wrapper() {
      const [tick, setTick] = useState(0);
      // Force re-renders that don't touch items, to exercise ref-callback churn.
      useEffect(() => {
        const id = setTimeout(() => setTick(1), 0);
        return () => clearTimeout(id);
      }, []);
      return (
        <div data-tick={tick}>
          <Tabs items={items} activeId="a" onChange={noop} />
        </div>
      );
    }
    const user = userEvent.setup();
    render(<Wrapper />);
    // Wait a microtask so the re-render fires.
    await new Promise((r) => setTimeout(r, 5));
    screen.getByRole('tab', { name: 'Overview' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: /Activity/ }));
  });

  it('ignores keys that are not arrow / Home / End', async () => {
    // Enter/Space would activate the button natively (browser-driven click →
    // onChange), so we test with keys that have no native button behavior.
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Tabs items={items} activeId="a" onChange={onChange} />);
    screen.getByRole('tab', { name: 'Overview' }).focus();
    await user.keyboard('{Backspace}');
    await user.keyboard('{Escape}');
    expect(onChange).not.toHaveBeenCalled();
  });

  describe('active indicator', () => {
    it('renders a single indicator element inside the tablist', () => {
      const { container } = render(<Tabs items={items} activeId="a" onChange={noop} />);
      const indicators = container.querySelectorAll('[class*="indicator"]');
      expect(indicators).toHaveLength(1);
    });

    it('marks the indicator aria-hidden so AT does not announce it', () => {
      const { container } = render(<Tabs items={items} activeId="a" onChange={noop} />);
      const indicator = container.querySelector('[class*="indicator"]');
      expect(indicator).toHaveAttribute('aria-hidden', 'true');
    });

    it('writes inline transform and width styles on the indicator after mount', () => {
      const { container } = render(<Tabs items={items} activeId="a" onChange={noop} />);
      const indicator = container.querySelector('[class*="indicator"]') as HTMLElement;
      expect(indicator.style.transform).toMatch(/translateX\(/);
      expect(indicator.style.width).toMatch(/px$/);
    });

    it('re-measures and rewrites inline styles when activeId changes', () => {
      const { container, rerender } = render(<Tabs items={items} activeId="a" onChange={noop} />);
      const indicator = container.querySelector('[class*="indicator"]') as HTMLElement;
      const before = indicator.getAttribute('style');
      rerender(<Tabs items={items} activeId="c" onChange={noop} />);
      const after = indicator.getAttribute('style');
      expect(typeof before).toBe('string');
      expect(typeof after).toBe('string');
    });

    it('hides the indicator when activeId does not match any item', () => {
      const { container } = render(<Tabs items={items} activeId="missing" onChange={noop} />);
      const indicator = container.querySelector('[class*="indicator"]') as HTMLElement;
      expect(indicator.style.opacity).toBe('0');
    });
  });

  describe('icon', () => {
    it('renders the icon inside the tab button when provided', () => {
      const itemsWithIcon: TabItem[] = [
        {
          id: 'a',
          label: 'A',
          icon: <svg data-testid="tab-icon" />,
        },
        { id: 'b', label: 'B' },
      ];
      render(<Tabs items={itemsWithIcon} activeId="a" onChange={noop} />);
      const icon = screen.getByTestId('tab-icon');
      expect(icon).toBeInTheDocument();
      // Inside the tab button labelled 'A'
      expect(screen.getByRole('tab', { name: 'A' })).toContainElement(icon);
    });

    it('does NOT include the icon in the tab’s accessible name', () => {
      const itemsWithIcon: TabItem[] = [
        {
          id: 'a',
          label: 'Activity',
          icon: <svg data-testid="tab-icon" aria-label="should-be-ignored" />,
        },
      ];
      render(<Tabs items={itemsWithIcon} activeId="a" onChange={noop} />);
      // The accessible name is the label, not the icon's aria-label, because
      // the icon's wrapper has aria-hidden="true".
      expect(screen.getByRole('tab', { name: 'Activity' })).toBeInTheDocument();
    });

    it('does not render the icon wrapper when icon is omitted', () => {
      // No icon on either item → no aria-hidden span inside the tab button.
      const itemsNoIcon: TabItem[] = [{ id: 'a', label: 'A' }];
      const { container } = render(<Tabs items={itemsNoIcon} activeId="a" onChange={noop} />);
      const tab = container.querySelector('button[role="tab"]')!;
      const iconWrapper = tab.querySelector('span[aria-hidden="true"]');
      expect(iconWrapper).toBeNull();
    });

    it('icon={null} does NOT render the wrapper (prevents phantom gap before label)', () => {
      const itemsNullIcon: TabItem[] = [{ id: 'a', label: 'A', icon: null }];
      const { container } = render(<Tabs items={itemsNullIcon} activeId="a" onChange={noop} />);
      const tab = container.querySelector('button[role="tab"]')!;
      const iconWrapper = tab.querySelector('span[aria-hidden="true"]');
      expect(iconWrapper).toBeNull();
    });

    it('icon + count both render together (icon before label, count after)', () => {
      const itemsBoth: TabItem[] = [
        { id: 'a', label: 'Activity', icon: <svg data-testid="tab-icon" />, count: 12 },
      ];
      render(<Tabs items={itemsBoth} activeId="a" onChange={noop} />);
      // Count text ("12") joins the accessible name, so match the label as a
      // substring rather than asserting an exact name.
      const tab = screen.getByRole('tab', { name: /Activity/ });
      const icon = within(tab).getByTestId('tab-icon');
      const count = tab.querySelector('[class*="count"]')!;
      expect(tab).toContainElement(icon as HTMLElement);
      expect(count.textContent).toBe('12');
      expect(icon.compareDocumentPosition(count) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  describe('leading / trailing adornments', () => {
    it('renders a leading adornment inside the tab button', () => {
      const withLead: TabItem[] = [
        { id: 'a', label: 'Settings', leading: <span data-testid="lead-dot" /> },
      ];
      render(<Tabs items={withLead} activeId="a" onChange={noop} />);
      const tab = screen.getByRole('tab', { name: /Settings/ });
      expect(tab).toContainElement(within(tab).getByTestId('lead-dot'));
    });

    it('renders a trailing adornment inside the tab button', () => {
      const withTrail: TabItem[] = [
        { id: 'a', label: 'Settings', trailing: <span data-testid="trail-badge" /> },
      ];
      render(<Tabs items={withTrail} activeId="a" onChange={noop} />);
      const tab = screen.getByRole('tab', { name: /Settings/ });
      expect(tab).toContainElement(within(tab).getByTestId('trail-badge'));
    });

    it('renders leading before trailing in document order', () => {
      const both: TabItem[] = [
        {
          id: 'a',
          label: 'Settings',
          leading: <span data-testid="lead-dot" />,
          trailing: <span data-testid="trail-badge" />,
        },
      ];
      render(<Tabs items={both} activeId="a" onChange={noop} />);
      const tab = screen.getByRole('tab', { name: /Settings/ });
      const lead = within(tab).getByTestId('lead-dot');
      const trail = within(tab).getByTestId('trail-badge');
      expect(lead.compareDocumentPosition(trail) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('does not render leading/trailing wrappers when the props are omitted', () => {
      render(<Tabs items={items} activeId="a" onChange={noop} />);
      const tab = screen.getByRole('tab', { name: 'Overview' });
      expect(tab.querySelector('[class*="leading"]')).toBeNull();
      expect(tab.querySelector('[class*="trailing"]')).toBeNull();
    });
  });

  it('renders endContent outside the tablist and keeps it Tab-reachable', () => {
    render(
      <Tabs
        items={items}
        activeId="a"
        onChange={noop}
        endContent={<button data-testid="new-tab">New</button>}
      />,
    );
    const tablist = screen.getByRole('tablist');
    const end = screen.getByTestId('new-tab');
    expect(end).toBeInTheDocument();
    expect(tablist).not.toContainElement(end); // outside the tablist
  });

  it('does not render an endContent region when the prop is omitted', () => {
    const { container } = render(<Tabs items={items} activeId="a" onChange={noop} />);
    // No extra wrapper: the tablist's parent is still the scroll wrapper only.
    expect(container.querySelector('[data-tabs-end]')).toBeNull();
  });

  it('renders per-tab actions OUTSIDE the role=tab button', () => {
    render(
      <Tabs
        items={[
          { id: 'a', label: 'Overview' },
          { id: 'b', label: 'Fields', actions: <button data-testid="close-b">x</button> },
        ]}
        activeId="a"
        onChange={noop}
      />,
    );
    const closeBtn = screen.getByTestId('close-b');
    const fieldsTab = screen.getByRole('tab', { name: 'Fields' });
    expect(closeBtn).toBeInTheDocument();
    // The control must NOT be a descendant of the tab button.
    expect(fieldsTab).not.toContainElement(closeBtn);
    // The tab itself is still a proper tab.
    expect(fieldsTab).toHaveAttribute('role', 'tab');
    expect(fieldsTab).toHaveAttribute('aria-selected', 'false');
  });

  it('clicking a per-tab action does not activate/switch the tab', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Tabs
        items={[
          { id: 'a', label: 'Overview' },
          { id: 'b', label: 'Fields', actions: <button data-testid="close-b">x</button> },
        ]}
        activeId="a"
        onChange={onChange}
      />,
    );
    await user.click(screen.getByTestId('close-b'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not rove tabs when an arrow key fires inside a per-tab action control', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Tabs
        items={[
          { id: 'a', label: 'Overview', actions: <button data-testid="act-a">a</button> },
          { id: 'b', label: 'Fields' },
        ]}
        activeId="a"
        onChange={onChange}
      />,
    );
    screen.getByTestId('act-a').focus();
    await user.keyboard('{ArrowRight}');
    // Focus stayed on the control; tab navigation was NOT triggered.
    expect(document.activeElement).toBe(screen.getByTestId('act-a'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('still roves tabs on ArrowRight when focus is on a tab (regression)', async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        items={[
          { id: 'a', label: 'Overview', actions: <button>a</button> },
          { id: 'b', label: 'Fields' },
        ]}
        activeId="a"
        onChange={noop}
      />,
    );
    screen.getByRole('tab', { name: 'Overview' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Fields' }));
  });

  it('renders per-tab actions in vertical orientation with the tab still a tab', () => {
    render(
      <Tabs
        orientation="vertical"
        items={[
          { id: 'a', label: 'General' },
          { id: 'b', label: 'Security', actions: <button data-testid="v-act">x</button> },
        ]}
        activeId="a"
        onChange={noop}
      />,
    );
    const act = screen.getByTestId('v-act');
    const securityTab = screen.getByRole('tab', { name: 'Security' });
    expect(act).toBeInTheDocument();
    expect(securityTab).not.toContainElement(act);
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
  });
});

describe('Tabs action', () => {
  const action: TabsAction = { label: 'New deal', onClick: vi.fn() };

  it('renders the action as a plain button, not a tab', () => {
    render(<Tabs items={items} activeId="a" onChange={vi.fn()} action={action} />);
    const btn = screen.getByRole('button', { name: 'New deal' });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toHaveAttribute('role', 'tab');
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('sets type="button"', () => {
    render(<Tabs items={items} activeId="a" onChange={vi.fn()} action={action} />);
    expect(screen.getByRole('button', { name: 'New deal' })).toHaveAttribute('type', 'button');
  });

  it('renders the action after all tab items in document order', () => {
    render(<Tabs items={items} activeId="a" onChange={vi.fn()} action={action} />);
    const tabs = screen.getAllByRole('tab');
    const btn = screen.getByRole('button', { name: 'New deal' });
    const last = tabs[tabs.length - 1];
    expect(last.compareDocumentPosition(btn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('does not render an action button when the prop is omitted', () => {
    render(<Tabs items={items} activeId="a" onChange={vi.fn()} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('fires action.onClick and NOT onChange when clicked', async () => {
    const onClick = vi.fn();
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Tabs
        items={items}
        activeId="a"
        onChange={onChange}
        action={{ label: 'New deal', onClick }}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'New deal' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('leaves activeId/aria-selected and the indicator untouched after clicking the action', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Tabs items={items} activeId="a" onChange={onChange} action={action} />,
    );
    const indicator = container.querySelector('[class*="indicator"]') as HTMLElement;
    const before = indicator.getAttribute('style');
    await user.click(screen.getByRole('button', { name: 'New deal' }));
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    expect(indicator.getAttribute('style')).toBe(before);
  });

  it('disables the button and blocks onClick when action.disabled is true', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Tabs
        items={items}
        activeId="a"
        onChange={vi.fn()}
        action={{ label: 'New deal', onClick, disabled: true }}
      />,
    );
    const btn = screen.getByRole('button', { name: 'New deal' });
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders the icon aria-hidden next to the label', () => {
    render(
      <Tabs
        items={items}
        activeId="a"
        onChange={vi.fn()}
        action={{ label: 'New deal', icon: <svg data-testid="action-icon" />, onClick: vi.fn() }}
      />,
    );
    const btn = screen.getByRole('button', { name: 'New deal' });
    const icon = within(btn).getByTestId('action-icon');
    expect(icon.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('is skipped by arrow-key roving — ArrowRight from the last tab wraps to the first tab', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Tabs items={items} activeId="c" onChange={onChange} action={action} />);
    screen.getByRole('tab', { name: 'Notes' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('a');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Overview' }));
  });

  it('is reachable via the Tab key after the active tab, outside the roving tabindex', async () => {
    const user = userEvent.setup();
    render(<Tabs items={items} activeId="a" onChange={vi.fn()} action={action} />);
    screen.getByRole('tab', { name: 'Overview' }).focus();
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'New deal' }));
  });

  it('renders in vertical orientation without becoming a tab', () => {
    render(
      <Tabs items={items} activeId="a" onChange={vi.fn()} orientation="vertical" action={action} />,
    );
    expect(screen.getByRole('button', { name: 'New deal' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });
});
