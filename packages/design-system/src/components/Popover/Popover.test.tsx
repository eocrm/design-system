import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRef } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Popover } from './Popover';
import { DropdownMenu } from '../DropdownMenu';
import { ConfirmationPopover } from '../ConfirmationPopover';
import { ScrollArea } from '../ScrollArea';

describe('Popover — initial render', () => {
  it('renders nothing portaled on mount when defaultOpen is false', () => {
    render(
      <Popover>
        <div data-testid="children-marker">trigger and content go here later</div>
      </Popover>,
    );
    expect(screen.getByTestId('children-marker')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Popover.Trigger', () => {
  it('renders its child unchanged and sets aria-haspopup="dialog" and aria-expanded="false"', () => {
    render(
      <Popover>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
      </Popover>,
    );
    const trigger = screen.getByRole('button', { name: 'Open' });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles aria-expanded on click', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
      </Popover>,
    );
    const trigger = screen.getByRole('button', { name: 'Open' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens on Enter or Space when focused', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
      </Popover>,
    );
    await user.tab();
    expect(screen.getByRole('button', { name: 'Open' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('throws a clear error when children is not a valid React element', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <Popover>
          {/* @ts-expect-error — intentionally invalid */}
          <Popover.Trigger>{null}</Popover.Trigger>
        </Popover>,
      ),
    ).toThrow(/exactly one React element/);
    spy.mockRestore();
  });

  it('chains consumer onClick (consumer runs first)', async () => {
    const user = userEvent.setup();
    const consumer = vi.fn();
    render(
      <Popover>
        <Popover.Trigger>
          <button type="button" onClick={consumer}>
            Open
          </button>
        </Popover.Trigger>
      </Popover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(consumer).toHaveBeenCalledTimes(1);
  });
});

describe('Popover.Anchor', () => {
  it('renders its child unchanged and injects NO aria-haspopup / aria-expanded / aria-controls', () => {
    render(
      <Popover open>
        <Popover.Anchor>
          <button type="button">Chip</button>
        </Popover.Anchor>
        <Popover.Content>panel</Popover.Content>
      </Popover>,
    );
    const anchor = screen.getByRole('button', { name: 'Chip' });
    expect(anchor).toBeInTheDocument();
    expect(anchor).not.toHaveAttribute('aria-haspopup');
    expect(anchor).not.toHaveAttribute('aria-expanded');
    expect(anchor).not.toHaveAttribute('aria-controls');
  });

  it('does NOT inject a toggle: clicking the anchor child leaves the controlled popover untouched', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Popover open onOpenChange={onOpenChange}>
        <Popover.Anchor>
          <button type="button">Chip</button>
        </Popover.Anchor>
        <Popover.Content>panel</Popover.Content>
      </Popover>,
    );
    // open is controlled; Anchor wires no onClick, so clicking the child must
    // neither toggle open state nor request a change.
    await user.click(screen.getByRole('button', { name: 'Chip' }));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('anchors a CONTROLLED popover: renders the portaled dialog when open, nothing when closed', () => {
    const { rerender } = render(
      <Popover open={false}>
        <Popover.Anchor>
          <button type="button">Chip</button>
        </Popover.Anchor>
        <Popover.Content>panel body</Popover.Content>
      </Popover>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(
      <Popover open>
        <Popover.Anchor>
          <button type="button">Chip</button>
        </Popover.Anchor>
        <Popover.Content>panel body</Popover.Content>
      </Popover>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('panel body');
    expect(document.body.contains(dialog)).toBe(true);
  });

  it('forwards the ref to the child so positioning has a reference', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Popover>
        <Popover.Anchor>
          <button type="button" ref={ref}>
            Chip
          </button>
        </Popover.Anchor>
      </Popover>,
    );
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Chip' }));
  });

  it('throws a clear error when children is not a valid React element', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <Popover>
          {/* @ts-expect-error — intentionally invalid */}
          <Popover.Anchor>{null}</Popover.Anchor>
        </Popover>,
      ),
    ).toThrow(/exactly one React element/);
    spy.mockRestore();
  });
});

describe('Popover.Content — minimal portal', () => {
  it('renders nothing when closed', () => {
    render(
      <Popover>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>panel body</Popover.Content>
      </Popover>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the panel as a portaled dialog when defaultOpen', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>panel body</Popover.Content>
      </Popover>,
    );
    const panel = screen.getByRole('dialog');
    expect(panel).toHaveTextContent('panel body');
    expect(panel).toHaveAttribute('aria-modal', 'false');
    expect(panel).toHaveAttribute('tabIndex', '-1');
    // Portaled to document.body, NOT inside the test container.
    expect(document.body.contains(panel)).toBe(true);
  });

  it('panel id matches the trigger aria-controls when open', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>panel body</Popover.Content>
      </Popover>,
    );
    const trigger = screen.getByRole('button', { name: 'Open' });
    const panel = screen.getByRole('dialog');
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
  });
});

describe('Popover.Heading', () => {
  it('renders as h3 by default with an auto id', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>
          <Popover.Heading>Filters</Popover.Heading>
        </Popover.Content>
      </Popover>,
    );
    const heading = screen.getByRole('heading', { name: 'Filters', level: 3 });
    expect(heading.id).toMatch(/^popover-heading-/);
  });

  it('respects the `as` prop', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>
          <Popover.Heading as="h2">Filters</Popover.Heading>
        </Popover.Content>
      </Popover>,
    );
    expect(screen.getByRole('heading', { name: 'Filters', level: 2 })).toBeInTheDocument();
  });

  it('wires aria-labelledby on Content to the heading id', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content aria-labelledby="consumer-label">
          <Popover.Heading>Filters</Popover.Heading>
        </Popover.Content>
      </Popover>,
    );
    const dialog = screen.getByRole('dialog');
    const heading = screen.getByRole('heading', { name: 'Filters' });
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);
  });

  it('preserves Content aria-labelledby when no Popover.Heading exists', () => {
    render(
      <Popover defaultOpen>
        <span id="consumer-label">Icon choice</span>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content aria-labelledby="consumer-label">plain body</Popover.Content>
      </Popover>,
    );
    expect(screen.getByRole('dialog', { name: 'Icon choice' })).toHaveAttribute(
      'aria-labelledby',
      'consumer-label',
    );
  });

  it('Content has no aria-labelledby when no Heading is present', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>plain body</Popover.Content>
      </Popover>,
    );
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-labelledby');
  });
});

describe('Popover.Close', () => {
  it('clicking the wrapped child closes the popover', async () => {
    const user = userEvent.setup();
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>
          <Popover.Close>
            <button type="button">Done</button>
          </Popover.Close>
        </Popover.Content>
      </Popover>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('chains the consumer onClick (consumer first, then close)', async () => {
    const user = userEvent.setup();
    const consumer = vi.fn();
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>
          <Popover.Close>
            <button type="button" onClick={consumer}>
              Done
            </button>
          </Popover.Close>
        </Popover.Content>
      </Popover>,
    );
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(consumer).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('throws when children is not a valid React element', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <Popover defaultOpen>
          <Popover.Trigger>
            <button type="button">Open</button>
          </Popover.Trigger>
          <Popover.Content>
            {/* @ts-expect-error — intentionally invalid */}
            <Popover.Close>{null}</Popover.Close>
          </Popover.Content>
        </Popover>,
      ),
    ).toThrow(/exactly one React element/);
    spy.mockRestore();
  });
});

describe('Popover — focus + Escape', () => {
  it('moves focus to the panel when opened', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>panel body</Popover.Content>
      </Popover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });

  it('Escape closes the popover and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>panel body</Popover.Content>
      </Popover>,
    );
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });
});

describe('Popover — outside click dismissal', () => {
  it('closes when pointerdown fires outside the panel and outside the trigger', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Popover>
          <Popover.Trigger>
            <button type="button">Open</button>
          </Popover.Trigger>
          <Popover.Content>panel body</Popover.Content>
        </Popover>
        <div data-testid="elsewhere">elsewhere</div>
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.pointer({ keys: '[MouseLeft>]', target: screen.getByTestId('elsewhere') });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does NOT close when pointerdown fires inside the panel', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>
          <div data-testid="inside">panel body</div>
        </Popover.Content>
      </Popover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.pointer({ keys: '[MouseLeft>]', target: screen.getByTestId('inside') });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does NOT close when pointerdown fires inside a nested floating surface it hosts (portaled DropdownMenu)', async () => {
    // A DropdownMenu opened from within the popover portals its content to
    // document.body — not a DOM descendant of the panel. Interacting with it
    // must not read as an "outside" click and dismiss the host popover.
    const user = userEvent.setup();
    render(
      <Popover>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <button type="button">Menu</button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onSelect={() => {}}>Rename</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </Popover.Content>
      </Popover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Menu' }));
    // pointerdown inside the portaled menu content must NOT dismiss the host popover
    await user.pointer({
      keys: '[MouseLeft>]',
      target: screen.getByRole('menuitem', { name: 'Rename' }),
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does NOT close when pointerdown fires on the trigger (trigger toggles it)', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>panel body</Popover.Content>
      </Popover>,
    );
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(trigger);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Popover — Floating UI positioning + arrow', () => {
  beforeEach(() => {
    window.ResizeObserver = class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  });

  it('data-side reflects the configured side (default bottom)', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>panel body</Popover.Content>
      </Popover>,
    );
    expect(screen.getByRole('dialog').getAttribute('data-side')).toBe('bottom');
  });

  it('respects side="top"', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content side="top">panel body</Popover.Content>
      </Popover>,
    );
    expect(screen.getByRole('dialog').getAttribute('data-side')).toBe('top');
  });

  it('renders an arrow span with aria-hidden inside the panel', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>panel body</Popover.Content>
      </Popover>,
    );
    const panel = screen.getByRole('dialog');
    const arrow = panel.querySelector('span[aria-hidden="true"]');
    expect(arrow).not.toBeNull();
    expect((arrow as HTMLElement).className).toMatch(/arrow/);
  });
});

describe('Popover — animation contract', () => {
  it('the compiled .content rule contains an @starting-style block', () => {
    const scss = readFileSync(resolve(__dirname, './Popover.module.scss'), 'utf8');
    expect(scss).toMatch(/\.content\s*{[\s\S]*@starting-style/);
  });
});

describe('Popover — cleanup + Tab traversal', () => {
  it('removes document-level listeners on unmount while open', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>panel body</Popover.Content>
      </Popover>,
    );
    unmount();
    expect(removeSpy.mock.calls.some(([type]) => type === 'pointerdown')).toBe(true);
    expect(removeSpy.mock.calls.some(([type]) => type === 'keydown')).toBe(true);
    removeSpy.mockRestore();
  });

  it('Tab from inside the panel walks past the panel; popover stays open (no focus trap)', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Popover defaultOpen>
          <Popover.Trigger>
            <button type="button">Open</button>
          </Popover.Trigger>
          <Popover.Content>
            <button type="button">inside-1</button>
          </Popover.Content>
        </Popover>
        <button type="button">after</button>
      </>,
    );

    // The panel itself has focus on open; Tab moves to the first focusable inside (inside-1).
    await user.tab();
    expect(screen.getByRole('button', { name: 'inside-1' })).toHaveFocus();

    // Another Tab walks out of the panel. Because Content portals to document.body
    // (the end of the body), the panel's contents are last in document order — so
    // Tab from inside-1 wraps past the panel rather than cycling back inside it.
    // The exact next-focused element is JSDOM-specific; the contract we lock in
    // is that focus LEAVES the panel and the popover stays open.
    await user.tab();
    expect(screen.getByRole('button', { name: 'inside-1' })).not.toHaveFocus();
    expect(screen.getByRole('dialog')).not.toContainElement(
      document.activeElement as HTMLElement | null,
    );

    // Popover stays open (no focus trap).
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('preserves consumer props on the cloned trigger (className, data-*)', () => {
    render(
      <Popover>
        <Popover.Trigger>
          <button type="button" className="consumer" data-testid="t">
            Open
          </button>
        </Popover.Trigger>
        <Popover.Content>panel body</Popover.Content>
      </Popover>,
    );
    const trigger = screen.getByTestId('t');
    expect(trigger).toHaveClass('consumer');
  });

  it('Trigger forwards a custom aria-haspopup override', () => {
    render(
      <Popover>
        <Popover.Trigger aria-haspopup="listbox">
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>panel</Popover.Content>
      </Popover>,
    );
    expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute(
      'aria-haspopup',
      'listbox',
    );
  });

  it('Trigger click does not bubble to ancestor click handlers', async () => {
    // Locks in the fix for "<ConfirmationPopover> inside <DropdownMenu.Item>
    // closes the dropdown instead of opening the popover" — the trigger
    // should consume the click and not let it bubble to an ancestor.
    const user = userEvent.setup();
    const ancestorClick = vi.fn();
    render(
      <div onClick={ancestorClick}>
        <Popover>
          <Popover.Trigger>
            <button type="button">Open</button>
          </Popover.Trigger>
          <Popover.Content>panel body</Popover.Content>
        </Popover>
      </div>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(ancestorClick).not.toHaveBeenCalled();
  });
});

describe('Popover.Content — width props', () => {
  it('applies no inline max-width by default (uses the token cap)', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>panel</Popover.Content>
      </Popover>,
    );
    expect(screen.getByRole('dialog').style.maxWidth).toBe('');
  });

  it('applies maxWidth as an inline style (number → px)', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content maxWidth={560}>panel</Popover.Content>
      </Popover>,
    );
    expect(screen.getByRole('dialog').style.maxWidth).toBe('560px');
  });

  it('passes a string maxWidth through verbatim', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content maxWidth="fit-content">panel</Popover.Content>
      </Popover>,
    );
    expect(screen.getByRole('dialog').style.maxWidth).toBe('fit-content');
  });

  it('passes maxWidth="none" through verbatim (removes the cap — the marquee use case)', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content maxWidth="none">panel</Popover.Content>
      </Popover>,
    );
    expect(screen.getByRole('dialog').style.maxWidth).toBe('none');
  });

  it('applies minWidth as an inline style (number → px)', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content minWidth={300}>panel</Popover.Content>
      </Popover>,
    );
    expect(screen.getByRole('dialog').style.minWidth).toBe('300px');
  });
});

describe('Popover — overlay elevation', () => {
  it('elevates the content (data-in-overlay) when opened inside an overlay', async () => {
    const user = userEvent.setup();
    render(
      <div data-drawer-portal-root="">
        <Popover>
          <Popover.Trigger>
            <button type="button">Open</button>
          </Popover.Trigger>
          <Popover.Content>Panel</Popover.Content>
        </Popover>
      </div>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(document.querySelector('[data-popover-content]')).toHaveAttribute('data-in-overlay', '');
  });

  it('does not elevate the popover content at page level', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content>Panel</Popover.Content>
      </Popover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(document.querySelector('[data-popover-content]')).not.toHaveAttribute('data-in-overlay');
  });
});

describe('Popover — nested floating-surface elevation', () => {
  beforeEach(() => {
    window.ResizeObserver = class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  });

  it('elevates a DropdownMenu opened from inside a Popover.Content (above the host popover)', async () => {
    const user = userEvent.setup();
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open popover</button>
        </Popover.Trigger>
        <Popover.Content>
          <DropdownMenu>
            <DropdownMenu.Trigger>
              <button type="button">Row actions</button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </Popover.Content>
      </Popover>,
    );
    // The host popover panel is open but NOT elevated (it's at page level).
    expect(document.querySelector('[data-popover-content]')).not.toHaveAttribute('data-in-overlay');
    // Open the nested menu. Its trigger lives inside the popover content host,
    // so the menu content must elevate above the host popover.
    await user.click(screen.getByRole('button', { name: 'Row actions' }));
    expect(screen.getByRole('menu')).toHaveAttribute('data-in-overlay', '');
  });

  it('elevates an inner Popover opened from inside another Popover.Content (popover → popover)', async () => {
    const user = userEvent.setup();
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Outer</button>
        </Popover.Trigger>
        <Popover.Content>
          <Popover>
            <Popover.Trigger>
              <button type="button">Open inner</button>
            </Popover.Trigger>
            <Popover.Content>Inner panel</Popover.Content>
          </Popover>
        </Popover.Content>
      </Popover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open inner' }));
    // Two dialogs now: the outer (page-level, not elevated) and the inner
    // (trigger inside the outer's content host → elevated).
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs).toHaveLength(2);
    const inner = dialogs.find((d) => d.textContent?.includes('Inner panel'));
    expect(inner).toHaveAttribute('data-in-overlay', '');
  });

  // Repro chain: Popover → DropdownMenu → ConfirmationPopover. ConfirmationPopover
  // composes Popover internally, so its content carries [data-popover-content] and
  // reuses the same elevation hook. We mount it with `defaultOpen` rather than
  // driving the DropdownMenu.Item → ConfirmationPopover click open: in jsdom the
  // nested click-outside dismissal handlers race and tear down the whole stack
  // before the innermost dialog mounts (a jsdom timing artifact, not a product
  // bug — the live demo in PopoverDemo exercises the real click path). Mounting
  // it open verifies the load-bearing property directly: a ConfirmationPopover
  // whose trigger sits inside a DropdownMenu content host (itself inside a
  // Popover) elevates above its host.
  it('elevates a ConfirmationPopover whose trigger is inside a DropdownMenu content inside a Popover (repro chain)', () => {
    render(
      <Popover defaultOpen>
        <Popover.Trigger>
          <button type="button">Open popover</button>
        </Popover.Trigger>
        <Popover.Content>
          <DropdownMenu defaultOpen>
            <DropdownMenu.Trigger>
              <button type="button">Row actions</button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <ConfirmationPopover title="Delete record?" onConfirm={() => {}} defaultOpen>
                <DropdownMenu.Item closeOnSelect={false} onSelect={() => {}}>
                  Delete
                </DropdownMenu.Item>
              </ConfirmationPopover>
            </DropdownMenu.Content>
          </DropdownMenu>
        </Popover.Content>
      </Popover>,
    );
    // The dropdown menu (trigger inside the popover content host) is elevated.
    expect(screen.getByRole('menu')).toHaveAttribute('data-in-overlay', '');
    // The confirmation popover's trigger lives inside the dropdown content host,
    // so its dialog elevates too.
    const confirmDialog = screen
      .getAllByRole('dialog')
      .find((d) => d.textContent?.includes('Delete record?'));
    expect(confirmDialog).toBeTruthy();
    expect(confirmDialog).toHaveAttribute('data-in-overlay', '');
  });
});

describe('Popover — viewport cap with a ScrollArea (#598)', () => {
  it('writes --popover-available-height onto the open content', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content aria-label="Panel">
          <ScrollArea maxHeight="md" aria-label="Feed">
            <a href="/x">row</a>
          </ScrollArea>
        </Popover.Content>
      </Popover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = screen.getByRole('dialog');
    await waitFor(() =>
      expect(dialog.style.getPropertyValue('--popover-available-height')).toMatch(
        /^\d+(\.\d+)?px$/,
      ),
    );
  });

  it('SCSS: only a popover containing a ScrollArea becomes a capped flex column; the rest do not shrink', () => {
    const scss = readFileSync(resolve(__dirname, 'Popover.module.scss'), 'utf8');
    const block = scss.match(
      /\.content:has\(> \[data-scroll-area\], > \* > \[data-scroll-area\]\) \{[\s\S]*?\n\}/,
    )![0];
    expect(block).toMatch(/display: flex;/);
    expect(block).toMatch(/flex-direction: column;/);
    expect(block).toMatch(/max-height: var\(--popover-available-height\);/);
    expect(block).toMatch(/> \* \{\s*flex-shrink: 0;/);
    const area = block.match(/> \[data-scroll-area\] \{[^}]*\}/)![0];
    expect(area).toMatch(/flex-shrink: 1;/);
    expect(area).toMatch(/min-height: 0;/);
    expect(area).not.toMatch(/display/);
    // The one-level wrapper is laid out as a flex column so it passes the
    // shrink down to the ScrollArea (a plain div/form wrapper otherwise
    // shrinks while the rows paint outside the chrome). The ScrollArea
    // itself is not made a flex container.
    // The wrapper's shrink stays in the specific rule…
    const wrapper = block.match(/> :has\(> \[data-scroll-area\]\) \{[^}]*\}/)![0];
    expect(wrapper).toMatch(/flex-shrink: 1;/);
    expect(wrapper).toMatch(/min-height: 0;/);
    expect(wrapper).not.toMatch(/display/);
    // …but its LAYOUT is zero-specificity (a Cluster/Grid wrapper keeps its own
    // display) and skips `[hidden]` wrappers (an author display would beat the
    // UA `[hidden] { display: none }`).
    const layout = scss.match(
      /:where\(\s*\.content:has\(> \[data-scroll-area\], > \* > \[data-scroll-area\]\)\s*> :has\(> \[data-scroll-area\]\):not\(\[hidden\]\)\s*\) \{[^}]*\}/,
    )![0];
    expect(layout).toMatch(/display: flex;/);
    expect(layout).toMatch(/flex-direction: column;/);
    // The wrapper's other children (a header) don't shrink; zero specificity
    // so a consumer class setting flex-shrink still wins.
    const guard = scss.match(
      /:where\(\s*\.content:has\(> \[data-scroll-area\], > \* > \[data-scroll-area\]\)\s*> :has\(> \[data-scroll-area\]\)\s*> :not\(\[data-scroll-area\]\)\s*\) \{[^}]*\}/,
    )![0];
    expect(guard).toMatch(/flex-shrink: 0;/);

    // The base `.content` rule stays un-capped and not a flex container.
    const base = scss.match(/^\.content \{[\s\S]*?\n\}/m)![0];
    expect(base).not.toMatch(/display: flex/);
    expect(base).not.toMatch(/max-height/);
    // No overflow on the content itself: it would clip the arrow.
    expect(scss).not.toMatch(/\.content[^{]*\{[^}]*overflow/);
  });

  it('a ScrollArea nested two levels deep leaves the popover uncapped (selectors are >-anchored)', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <Popover.Trigger>
          <button type="button">Open</button>
        </Popover.Trigger>
        <Popover.Content aria-label="Panel">
          <div>
            <div>
              <ScrollArea maxHeight="md" aria-label="Feed">
                <a href="/x">row</a>
              </ScrollArea>
            </div>
          </div>
        </Popover.Content>
      </Popover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = screen.getByRole('dialog');
    const area = screen.getByRole('region', { name: 'Feed' });
    // Two levels deep: neither a direct child nor a grandchild of the content.
    expect(area.parentElement?.parentElement?.parentElement).toBe(dialog);
    // jsdom applies no CSS-module styles, so the contract is the selector
    // text: every `:has(…[data-scroll-area])` must be `>`-anchored, which is
    // what keeps this nesting depth from matching (and from being capped with
    // a ScrollArea that can't shrink, painting rows outside the chrome).
    const scss = readFileSync(resolve(__dirname, 'Popover.module.scss'), 'utf8');
    const hasForms = scss.match(/:has\([^)]*data-scroll-area[^)]*\)/g) ?? [];
    expect(hasForms.length).toBeGreaterThan(0);
    for (const form of hasForms) {
      expect(form).not.toMatch(/:has\(\s*\[data-scroll-area\]/);
      for (const part of form.slice(5, -1).split(',')) expect(part.trim()).toMatch(/^>/);
    }
  });
});
