import { act, configure, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, type ReactNode } from 'react';
import { DropdownMenu } from './DropdownMenu';

beforeEach(() => {
  window.ResizeObserver = class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

describe('DropdownMenu — Trigger', () => {
  it('renders its child unchanged', () => {
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
      </DropdownMenu>,
    );
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument();
  });

  it('sets aria-haspopup="menu" and aria-expanded=false by default', () => {
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
      </DropdownMenu>,
    );
    const trigger = screen.getByRole('button', { name: 'Open' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles aria-expanded on click', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
      </DropdownMenu>,
    );
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it("preserves the child element's own onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button" onClick={onClick}>
            Open
          </button>
        </DropdownMenu.Trigger>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('forwards a ref through to the child element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button" ref={ref}>
            Open
          </button>
        </DropdownMenu.Trigger>
      </DropdownMenu>,
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});

describe('DropdownMenu — Content', () => {
  it('does not render Content when closed', () => {
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <div>menu body</div>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('renders Content with role="menu" when open', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <div>menu body</div>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('menu body')).toBeInTheDocument();
  });

  it('portals Content outside its parent tree', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <div>menu body</div>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const menu = screen.getByRole('menu');
    expect(container.contains(menu)).toBe(false);
    expect(document.body.contains(menu)).toBe(true);
  });

  it('links trigger to content via aria-controls', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <div>menu body</div>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    const menu = screen.getByRole('menu');
    expect(trigger).toHaveAttribute('aria-controls', menu.id);
  });

  it('forwards ref and merges className on Content', async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLDivElement>();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content ref={ref} className="custom-content">
          <div>menu body</div>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.className).toMatch(/custom-content/);
  });
});

describe('DropdownMenu — Item / Separator', () => {
  async function openMenu() {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item onSelect={() => {}} disabled>
            Disabled
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    return { user };
  }

  it('renders items with role="menuitem"', async () => {
    await openMenu();
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument();
  });

  it('renders Separator with role="separator"', async () => {
    await openMenu();
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('fires onSelect on click of enabled item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={onSelect}>Edit</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('does not fire onSelect on click of disabled item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={onSelect} disabled>
            Edit
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('sets aria-disabled="true" on disabled items', async () => {
    await openMenu();
    const disabled = screen.getByRole('menuitem', { name: 'Disabled' });
    expect(disabled).toHaveAttribute('aria-disabled', 'true');
  });

  it('merges className on Item and Separator', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}} className="custom-item">
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="custom-sep" />
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('menuitem', { name: 'Edit' }).className).toMatch(/custom-item/);
    expect(screen.getByRole('separator').className).toMatch(/custom-sep/);
  });
});

describe('DropdownMenu — dismissal', () => {
  function setup() {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <div>
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <button type="button">Open</button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item onSelect={onSelect}>Edit</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
        <button type="button">Outside</button>
      </div>,
    );
    return { user, onSelect };
  }

  it('closes on outside click (pointerdown on document)', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const { user } = setup();
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('closes on Tab from inside the menu; focus moves past the trigger per WAI', async () => {
    const { user } = setup();
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    screen.getByRole('menu').focus();
    await user.tab();
    expect(screen.queryByRole('menu')).toBeNull();
    // After closing, the trigger was momentarily focused, then default Tab
    // continued to the next focusable element — the WAI-ARIA menu pattern.
    // jsdom does not advance native Tab past the trigger, so we assert the
    // softer form: focus left the trigger (moved to body or next element),
    // confirming preventDefault was NOT called.
    expect(trigger).not.toHaveFocus();
  });

  it('fires onSelect, closes, and refocuses the trigger when clicking an item', async () => {
    const { user, onSelect } = setup();
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('clicking the trigger while open closes the menu (no re-open via outside-click)', async () => {
    const { user } = setup();
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.click(trigger);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('mouse-opening does NOT auto-focus an item; ArrowDown then focuses first', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Alpha</DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => {}}>Beta</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    // Menu is open, but no item has focus yet.
    expect(screen.getByRole('menuitem', { name: 'Alpha' })).not.toHaveFocus();
    expect(screen.getByRole('menuitem', { name: 'Beta' })).not.toHaveFocus();
    // First ArrowDown moves to first enabled item.
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Alpha' })).toHaveFocus();
  });
});

describe('DropdownMenu — Trigger keyboard open', () => {
  function renderMenu() {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>First</DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => {}}>Second</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    return { user };
  }

  it.each(['{Enter}', ' ', '{ArrowDown}'])(
    'opens the menu when Trigger receives %s',
    async (key) => {
      const { user } = renderMenu();
      const trigger = screen.getByRole('button', { name: 'Open' });
      trigger.focus();
      await user.keyboard(key);
      expect(screen.getByRole('menu')).toBeInTheDocument();
    },
  );

  it('opens the menu when Trigger receives ArrowUp', async () => {
    const { user } = renderMenu();
    const trigger = screen.getByRole('button', { name: 'Open' });
    trigger.focus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});

describe('DropdownMenu — item navigation', () => {
  function renderMenu(extra?: ReactNode) {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Alpha</DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => {}} disabled>
            Beta
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item onSelect={() => {}}>Gamma</DropdownMenu.Item>
          {extra}
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    return { user };
  }

  it('first enabled item is active on open via ArrowDown', async () => {
    const { user } = renderMenu();
    const trigger = screen.getByRole('button', { name: 'Open' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Alpha' })).toHaveFocus();
  });

  it('last enabled item is active on open via ArrowUp', async () => {
    const { user } = renderMenu();
    const trigger = screen.getByRole('button', { name: 'Open' });
    trigger.focus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Gamma' })).toHaveFocus();
  });

  it('ArrowDown skips disabled items and separators', async () => {
    const { user } = renderMenu();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}'); // Alpha
    await user.keyboard('{ArrowDown}'); // skip Beta (disabled), skip Separator → Gamma
    expect(screen.getByRole('menuitem', { name: 'Gamma' })).toHaveFocus();
  });

  it('ArrowDown wraps from last enabled to first enabled', async () => {
    const { user } = renderMenu();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowUp}'); // open at last → Gamma
    await user.keyboard('{ArrowDown}'); // wrap → Alpha
    expect(screen.getByRole('menuitem', { name: 'Alpha' })).toHaveFocus();
  });

  it('ArrowUp wraps from first enabled to last enabled', async () => {
    const { user } = renderMenu();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}'); // Alpha
    await user.keyboard('{ArrowUp}'); // wrap → Gamma
    expect(screen.getByRole('menuitem', { name: 'Gamma' })).toHaveFocus();
  });

  it('Home jumps to first enabled item', async () => {
    const { user } = renderMenu();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowUp}'); // Gamma
    await user.keyboard('{Home}'); // → Alpha
    expect(screen.getByRole('menuitem', { name: 'Alpha' })).toHaveFocus();
  });

  it('End jumps to last enabled item', async () => {
    const { user } = renderMenu();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}'); // Alpha
    await user.keyboard('{End}'); // → Gamma
    expect(screen.getByRole('menuitem', { name: 'Gamma' })).toHaveFocus();
  });

  it('only the active item has tabIndex=0', async () => {
    const { user } = renderMenu();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}');
    const alpha = screen.getByRole('menuitem', { name: 'Alpha' });
    const beta = screen.getByRole('menuitem', { name: 'Beta' });
    const gamma = screen.getByRole('menuitem', { name: 'Gamma' });
    expect(alpha.tabIndex).toBe(0);
    expect(beta.tabIndex).toBe(-1);
    expect(gamma.tabIndex).toBe(-1);
  });
});

describe('DropdownMenu — item activation by keyboard', () => {
  function renderMenu(onSelect: () => void) {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={onSelect}>Alpha</DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => {}}>Beta</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    return { user };
  }

  it('Enter on the active item fires onSelect and closes', async () => {
    const onSelect = vi.fn();
    const { user } = renderMenu(onSelect);
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Space on the active item fires onSelect and closes', async () => {
    const onSelect = vi.fn();
    const { user } = renderMenu(onSelect);
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard(' ');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('DropdownMenu — controlled open', () => {
  it('respects the controlled `open` prop', async () => {
    const { rerender } = render(
      <DropdownMenu open={false} onOpenChange={() => {}}>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    expect(screen.queryByRole('menu')).toBeNull();

    rerender(
      <DropdownMenu open={true} onOpenChange={() => {}}>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('calls onOpenChange when internal toggles fire (controlled mode)', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <DropdownMenu open={false} onOpenChange={onOpenChange}>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
    // Internal state is NOT mutated when controlled — menu stays closed.
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('DropdownMenu — placement props', () => {
  async function openWith(props: { side?: 'top' | 'bottom'; align?: 'start' | 'center' | 'end' }) {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content {...props}>
          <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
  }

  it('writes data-side and data-align on Content', async () => {
    await openWith({ side: 'top', align: 'end' });
    const menu = screen.getByRole('menu');
    expect(menu).toHaveAttribute('data-side', 'top');
    expect(menu).toHaveAttribute('data-align', 'end');
  });

  it('defaults to side=bottom and align=start', async () => {
    await openWith({});
    const menu = screen.getByRole('menu');
    expect(menu).toHaveAttribute('data-side', 'bottom');
    expect(menu).toHaveAttribute('data-align', 'start');
  });
});

describe('DropdownMenu — Item variants', () => {
  it('applies data-tone="danger" to danger items', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}} tone="danger">
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveAttribute('data-tone', 'danger');
  });

  it('renders icon in leading slot before label', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}} icon={<span data-testid="icon" />}>
            Edit
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const item = screen.getByRole('menuitem', { name: 'Edit' });
    const icon = screen.getByTestId('icon');
    expect(item).toContainElement(icon);
    // Icon appears before the label in document order.
    const children = Array.from(item.children) as HTMLElement[];
    const iconIdx = children.findIndex((c) => c.contains(icon));
    const labelIdx = children.findIndex((c) => c.textContent === 'Edit');
    expect(iconIdx).toBeLessThan(labelIdx);
    expect(iconIdx).toBeGreaterThanOrEqual(0);
  });

  it('renders shortcut in trailing slot after label', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}} shortcut="⌘D">
            Duplicate
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const item = screen.getByRole('menuitem', { name: /Duplicate/ });
    expect(item).toHaveTextContent('⌘D');
    const children = Array.from(item.children) as HTMLElement[];
    const labelIdx = children.findIndex((c) => c.textContent === 'Duplicate');
    const shortcutIdx = children.findIndex((c) => c.textContent === '⌘D');
    expect(shortcutIdx).toBeGreaterThan(labelIdx);
  });
});

describe('DropdownMenu — Group and Label', () => {
  it('Label renders as a non-interactive text row', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Label>Sort by</DropdownMenu.Label>
          <DropdownMenu.Item onSelect={() => {}}>Name</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByText('Sort by')).toBeInTheDocument();
    // Label is not a menuitem and not focusable.
    expect(screen.queryByRole('menuitem', { name: 'Sort by' })).toBeNull();
  });

  it('Group renders with role="group" and aria-labelledby points at Label id', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Group>
            <DropdownMenu.Label>Sort by</DropdownMenu.Label>
            <DropdownMenu.Item onSelect={() => {}}>Name</DropdownMenu.Item>
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const group = screen.getByRole('group');
    const label = screen.getByText('Sort by');
    expect(group).toHaveAttribute('aria-labelledby', label.id);
    expect(label.id).toBeTruthy();
  });

  it('Label outside a Group renders without aria id wiring', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Label>Quick actions</DropdownMenu.Label>
          <DropdownMenu.Item onSelect={() => {}}>Refresh</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByText('Quick actions')).toBeInTheDocument();
    expect(screen.queryByRole('group')).toBeNull();
  });
});

describe('DropdownMenu — typeahead', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // @testing-library/react's asyncWrapper has a setTimeout(0) drain step that
    // only knows how to advance Jest fake timers. Override it to also advance
    // Vitest fake timers so the internal act() wrapper doesn't deadlock.
    configure({
      asyncWrapper: async (cb) => {
        const result = await cb();
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 0);
          vi.advanceTimersByTime(0);
        });
        return result;
      },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    // Restore the default asyncWrapper for all other test suites.
    configure({ asyncWrapper: async (cb) => cb() });
  });

  function renderMenu() {
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => {}}>Duplicate</DropdownMenu.Item>
          <DropdownMenu.Item onSelect={() => {}}>Delete</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    return { user };
  }

  it('single-character typeahead jumps to first matching label', async () => {
    const { user } = renderMenu();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}'); // Edit active
    await user.keyboard('d');
    expect(screen.getByRole('menuitem', { name: 'Duplicate' })).toHaveFocus();
  });

  it('multi-character typeahead accumulates within 500ms', async () => {
    const { user } = renderMenu();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('d');
    await user.keyboard('e'); // "de"
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
  });

  it('buffer resets after 500ms of inactivity', async () => {
    const { user } = renderMenu();
    screen.getByRole('button', { name: 'Open' }).focus();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('d');
    vi.advanceTimersByTime(600);
    await user.keyboard('e'); // 'e' alone, "Edit"
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus();
  });
});

describe('DropdownMenu — ItemIndicator', () => {
  it('is a passthrough wrapper component', async () => {
    // Standalone test: ItemIndicator inside a regular Item just renders its
    // children inline (Item doesn't extract it — only CheckboxItem/RadioItem do).
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>
            <DropdownMenu.ItemIndicator>marker</DropdownMenu.ItemIndicator>
            Edit
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByText('marker')).toBeInTheDocument();
  });
});

describe('DropdownMenu — RadioGroup and RadioItem', () => {
  function renderRadio(value: string, onValueChange: (v: string) => void = () => {}) {
    return render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.RadioGroup value={value} onValueChange={onValueChange}>
            <DropdownMenu.RadioItem value="name">Name</DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="date">Date</DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="size">Size</DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
  }

  it('renders RadioGroup with role="radiogroup"', async () => {
    const user = userEvent.setup();
    renderRadio('name');
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('RadioItems have role="menuitemradio" and aria-checked reflects value', async () => {
    const user = userEvent.setup();
    renderRadio('date');
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('menuitemradio', { name: 'Name' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('menuitemradio', { name: 'Date' })).toHaveAttribute('aria-checked', 'true');
  });

  it('clicking a RadioItem fires onValueChange with its value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderRadio('name', onValueChange);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Date' }));
    expect(onValueChange).toHaveBeenCalledWith('date');
  });

  it('default closeOnSelect=true — menu closes after click', async () => {
    const user = userEvent.setup();
    renderRadio('name');
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Date' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closeOnSelect={false} keeps menu open after click', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.RadioGroup value="name" onValueChange={() => {}}>
            <DropdownMenu.RadioItem value="name" closeOnSelect={false}>
              Name
            </DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="date" closeOnSelect={false}>
              Date
            </DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitemradio', { name: 'Date' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('renders default ● glyph on the selected RadioItem', async () => {
    const user = userEvent.setup();
    renderRadio('date');
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('menuitemradio', { name: 'Date' }).textContent).toContain('●');
    expect(screen.getByRole('menuitemradio', { name: 'Name' }).textContent).not.toContain('●');
  });

  it('RadioItem outside a RadioGroup throws a helpful error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // open={true} so Content renders immediately and RadioItem mounts synchronously.
    expect(() =>
      render(
        <DropdownMenu open={true} onOpenChange={() => {}}>
          <DropdownMenu.Trigger>
            <button type="button">Open</button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.RadioItem value="x">X</DropdownMenu.RadioItem>
          </DropdownMenu.Content>
        </DropdownMenu>,
      ),
    ).toThrow(/RadioGroup/);
    spy.mockRestore();
  });
});

describe('DropdownMenu — CheckboxItem', () => {
  it('renders as role="menuitemcheckbox" with aria-checked', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked={true} onCheckedChange={() => {}}>
            Show archived
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const item = screen.getByRole('menuitemcheckbox', { name: /Show archived/ });
    expect(item).toHaveAttribute('aria-checked', 'true');
  });

  it('aria-checked is false when checked=false', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked={false} onCheckedChange={() => {}}>
            Show archived
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('menuitemcheckbox', { name: /Show archived/ })).toHaveAttribute('aria-checked', 'false');
  });

  it('fires onCheckedChange with !checked when clicked', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked={false} onCheckedChange={onCheckedChange}>
            Show archived
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: /Show archived/ }));
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('default closeOnSelect=false — menu stays open after click', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked={false} onCheckedChange={() => {}}>
            Show archived
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: /Show archived/ }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('closeOnSelect={true} closes the menu after click', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked={false} onCheckedChange={() => {}} closeOnSelect>
            Show archived
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: /Show archived/ }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('disabled CheckboxItem does not fire onCheckedChange', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked={false} onCheckedChange={onCheckedChange} disabled>
            Show archived
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: /Show archived/ }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('renders default ✓ glyph when checked and no ItemIndicator child', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked={true} onCheckedChange={() => {}}>
            Show archived
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const item = screen.getByRole('menuitemcheckbox', { name: /Show archived/ });
    expect(item.textContent).toContain('✓');
  });

  it('does NOT render default glyph when unchecked', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked={false} onCheckedChange={() => {}}>
            Show archived
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('menuitemcheckbox', { name: /Show archived/ }).textContent).not.toContain('✓');
  });

  it('renders a custom ItemIndicator when provided and checked', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.CheckboxItem checked={true} onCheckedChange={() => {}}>
            <DropdownMenu.ItemIndicator>
              <span data-testid="custom-indicator">★</span>
            </DropdownMenu.ItemIndicator>
            Show archived
          </DropdownMenu.CheckboxItem>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByTestId('custom-indicator')).toBeInTheDocument();
    expect(screen.getByRole('menuitemcheckbox', { name: /Show archived/ }).textContent).not.toContain('✓');
  });
});

describe('DropdownMenu — Sub (scaffolding)', () => {
  it('Sub renders its children inside a fresh context (depth > 0)', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Sub>
            <span data-testid="sub-child">child of sub</span>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByTestId('sub-child')).toBeInTheDocument();
  });
});

describe('DropdownMenu — SubTrigger (click only — hover/keyboard in later tasks)', () => {
  function renderSub() {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Regular</DropdownMenu.Item>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>More</DropdownMenu.SubTrigger>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    return { user };
  }

  it('SubTrigger renders as a menuitem in the parent menu', async () => {
    const { user } = renderSub();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('menuitem', { name: /More/ })).toBeInTheDocument();
  });

  it('SubTrigger has aria-haspopup="menu" and aria-expanded=false initially', async () => {
    const { user } = renderSub();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const sub = screen.getByRole('menuitem', { name: /More/ });
    expect(sub).toHaveAttribute('aria-haspopup', 'menu');
    expect(sub).toHaveAttribute('aria-expanded', 'false');
  });

  it('clicking SubTrigger sets aria-expanded=true', async () => {
    const { user } = renderSub();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitem', { name: /More/ }));
    expect(screen.getByRole('menuitem', { name: /More/ })).toHaveAttribute('aria-expanded', 'true');
  });

  it('disabled SubTrigger does not open the sub on click', async () => {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger disabled>More</DropdownMenu.SubTrigger>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitem', { name: /More/ }));
    expect(screen.getByRole('menuitem', { name: /More/ })).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('DropdownMenu — SubContent', () => {
  function renderNested() {
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>Export</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Item onSelect={() => {}}>CSV</DropdownMenu.Item>
              <DropdownMenu.Item onSelect={() => {}}>JSON</DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    return { user };
  }

  it('SubContent renders the sub items when sub is open', async () => {
    const { user } = renderNested();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.queryByRole('menuitem', { name: 'CSV' })).toBeNull();
    await user.click(screen.getByRole('menuitem', { name: /Export/ }));
    expect(screen.getByRole('menuitem', { name: 'CSV' })).toBeInTheDocument();
  });

  it('selecting an Item inside SubContent closes the ENTIRE chain', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>Export</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Item onSelect={onSelect}>CSV</DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitem', { name: /Export/ }));
    await user.click(screen.getByRole('menuitem', { name: 'CSV' }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryAllByRole('menu')).toHaveLength(0);
  });

  it('Escape from inside SubContent closes only the sub (root stays open)', async () => {
    const { user } = renderNested();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitem', { name: /Export/ }));
    expect(screen.getAllByRole('menu')).toHaveLength(2);
    const subMenu = screen.getAllByRole('menu')[1];
    subMenu.focus();
    await user.keyboard('{Escape}');
    expect(screen.queryAllByRole('menu')).toHaveLength(1);
  });

  it('clicking far outside closes the entire chain', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <button type="button">Open</button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Sub>
              <DropdownMenu.SubTrigger>Export</DropdownMenu.SubTrigger>
              <DropdownMenu.SubContent>
                <DropdownMenu.Item onSelect={() => {}}>CSV</DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Sub>
          </DropdownMenu.Content>
        </DropdownMenu>
        <button type="button">Outside</button>
      </div>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('menuitem', { name: /Export/ }));
    expect(screen.getAllByRole('menu')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryAllByRole('menu')).toHaveLength(0);
  });
});

describe('DropdownMenu — Submenu hover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    configure({
      asyncWrapper: async (cb) => {
        const result = await cb();
        await new Promise<void>((resolve) => {
          setTimeout(resolve, 0);
          vi.advanceTimersByTime(0);
        });
        return result;
      },
    });
  });
  afterEach(() => {
    vi.useRealTimers();
    configure({ asyncWrapper: async (cb) => cb() });
  });

  function renderNested() {
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    render(
      <DropdownMenu>
        <DropdownMenu.Trigger>
          <button type="button">Open</button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger>Export</DropdownMenu.SubTrigger>
            <DropdownMenu.SubContent>
              <DropdownMenu.Item onSelect={() => {}}>CSV</DropdownMenu.Item>
            </DropdownMenu.SubContent>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu>,
    );
    return { user };
  }

  it('hovering SubTrigger opens the sub after 100ms', async () => {
    const { user } = renderNested();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const subTrigger = screen.getByRole('menuitem', { name: /Export/ });
    await user.hover(subTrigger);
    expect(screen.queryByRole('menuitem', { name: 'CSV' })).toBeNull();
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByRole('menuitem', { name: 'CSV' })).toBeInTheDocument();
  });

  it('hovering away from SubTrigger cancels pending open', async () => {
    const { user } = renderNested();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const subTrigger = screen.getByRole('menuitem', { name: /Export/ });
    await user.hover(subTrigger);
    act(() => vi.advanceTimersByTime(50)); // before 100ms threshold
    await user.unhover(subTrigger);
    act(() => vi.advanceTimersByTime(100)); // past original threshold
    expect(screen.queryByRole('menuitem', { name: 'CSV' })).toBeNull();
  });

  it('hovering away from open sub closes it after 200ms', async () => {
    const { user } = renderNested();
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const subTrigger = screen.getByRole('menuitem', { name: /Export/ });
    await user.hover(subTrigger);
    act(() => vi.advanceTimersByTime(100)); // sub opens
    expect(screen.getByRole('menuitem', { name: 'CSV' })).toBeInTheDocument();
    await user.unhover(subTrigger);
    act(() => vi.advanceTimersByTime(100)); // before 200ms close threshold
    expect(screen.getByRole('menuitem', { name: 'CSV' })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(100)); // past 200ms total
    expect(screen.queryByRole('menuitem', { name: 'CSV' })).toBeNull();
  });
});
