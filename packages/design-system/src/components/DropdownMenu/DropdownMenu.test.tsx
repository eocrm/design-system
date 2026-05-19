import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
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

  it('closes on Tab from inside the menu and focuses the trigger', async () => {
    const { user } = setup();
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    screen.getByRole('menu').focus();
    await user.tab();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
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
});
