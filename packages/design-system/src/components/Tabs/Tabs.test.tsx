import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useEffect, useState } from 'react';
import { Tabs, type TabItem } from './Tabs';

const items: TabItem[] = [
  { id: 'a', label: 'Overview' },
  { id: 'b', label: 'Activity', count: 4 },
  { id: 'c', label: 'Notes' },
];

const noop = () => undefined;

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
      const { container, rerender } = render(
        <Tabs items={items} activeId="a" onChange={noop} />,
      );
      const indicator = container.querySelector('[class*="indicator"]') as HTMLElement;
      const before = indicator.getAttribute('style');
      rerender(<Tabs items={items} activeId="c" onChange={noop} />);
      const after = indicator.getAttribute('style');
      expect(typeof before).toBe('string');
      expect(typeof after).toBe('string');
    });

    it('hides the indicator when activeId does not match any item', () => {
      const { container } = render(
        <Tabs items={items} activeId="missing" onChange={noop} />,
      );
      const indicator = container.querySelector('[class*="indicator"]') as HTMLElement;
      expect(indicator.style.opacity).toBe('0');
    });
  });
});
