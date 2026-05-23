import { useRef, useState, type ComponentProps, type RefObject } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Drawer } from './Drawer';
import { overlayStack } from '../_internal/overlay';

function Harness(props: Partial<ComponentProps<typeof Drawer>>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Drawer open={open} onOpenChange={setOpen} {...props}>
        {props.children ?? (
          <>
            <Drawer.Header>Title</Drawer.Header>
            <Drawer.Body>
              <button>Inner button</button>
            </Drawer.Body>
            <Drawer.Footer>
              <Drawer.Close>
                <button>Cancel</button>
              </Drawer.Close>
            </Drawer.Footer>
          </>
        )}
      </Drawer>
    </>
  );
}

describe('<Drawer>', () => {
  afterEach(() => {
    overlayStack._reset();
  });

  it('renders nothing when closed', () => {
    render(<Harness />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders dialog with role="dialog" + aria-modal when open', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('Open'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('default side is right (data-side="right")', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('Open'));
    expect(screen.getByRole('dialog')).toHaveAttribute('data-side', 'right');
  });

  it.each(['left', 'right', 'top', 'bottom'] as const)(
    'side="%s" sets data-side="%s"',
    async (side) => {
      const user = userEvent.setup();
      render(<Harness side={side} />);
      await user.click(screen.getByText('Open'));
      expect(screen.getByRole('dialog')).toHaveAttribute('data-side', side);
    },
  );

  it.each(['sm', 'md', 'lg'] as const)('size="%s" sets data-size="%s"', async (size) => {
    const user = userEvent.setup();
    render(<Harness size={size} />);
    await user.click(screen.getByText('Open'));
    expect(screen.getByRole('dialog')).toHaveAttribute('data-size', size);
  });

  it('aria-labelledby wires to Drawer.Header heading', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('Open'));
    const dialog = screen.getByRole('dialog');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)?.textContent).toBe('Title');
  });

  it('aria-label fallback when no Header is rendered', () => {
    render(
      <Drawer open onOpenChange={() => {}} aria-label="Confirm">
        <Drawer.Body>x</Drawer.Body>
      </Drawer>,
    );
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Confirm');
  });

  it('Escape closes', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Drawer open onOpenChange={onOpenChange} aria-label="x">
        <Drawer.Body>x</Drawer.Body>
      </Drawer>,
    );
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disableEscapeClose suppresses Escape', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Drawer open onOpenChange={onOpenChange} disableEscapeClose aria-label="x">
        <Drawer.Body>x</Drawer.Body>
      </Drawer>,
    );
    await user.keyboard('{Escape}');
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('overlay click closes', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Drawer open onOpenChange={onOpenChange} aria-label="x">
        <Drawer.Body>x</Drawer.Body>
      </Drawer>,
    );
    const overlay = document.querySelector('[data-drawer-portal-root]') as HTMLElement;
    await user.click(overlay);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('dismissOnOverlayClick=false suppresses overlay click', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Drawer open onOpenChange={onOpenChange} dismissOnOverlayClick={false} aria-label="x">
        <Drawer.Body>x</Drawer.Body>
      </Drawer>,
    );
    const overlay = document.querySelector('[data-drawer-portal-root]') as HTMLElement;
    await user.click(overlay);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('clicking inside Content does NOT fire onOpenChange', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Drawer open onOpenChange={onOpenChange} aria-label="x">
        <Drawer.Body>
          <p>click me</p>
        </Drawer.Body>
      </Drawer>,
    );
    await user.click(screen.getByText('click me'));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('Drawer.Close fires onOpenChange(false)', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Drawer open onOpenChange={onOpenChange} aria-label="x">
        <Drawer.Body>x</Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close>
            <button>Cancel</button>
          </Drawer.Close>
        </Drawer.Footer>
      </Drawer>,
    );
    await user.click(screen.getByText('Cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Header × close button fires onOpenChange(false)', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Drawer open onOpenChange={onOpenChange}>
        <Drawer.Header>Title</Drawer.Header>
        <Drawer.Body>x</Drawer.Body>
      </Drawer>,
    );
    await user.click(screen.getByRole('button', { name: /close dialog/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Header closeButton={false} does NOT render × button', () => {
    render(
      <Drawer open onOpenChange={() => {}}>
        <Drawer.Header closeButton={false}>Title</Drawer.Header>
        <Drawer.Body>x</Drawer.Body>
      </Drawer>,
    );
    expect(screen.queryByRole('button', { name: /close dialog/i })).toBeNull();
  });

  it('initialFocusRef receives focus on open', async () => {
    const user = userEvent.setup();
    function FocusHarness() {
      const [open, setOpen] = useState(false);
      const inputRef = useRef<HTMLInputElement | null>(null);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <Drawer
            open={open}
            onOpenChange={setOpen}
            initialFocusRef={inputRef as RefObject<HTMLElement | null>}
          >
            <Drawer.Header>Title</Drawer.Header>
            <Drawer.Body>
              <input ref={inputRef} aria-label="Name" />
            </Drawer.Body>
          </Drawer>
        </>
      );
    }
    render(<FocusHarness />);
    await user.click(screen.getByText('Open'));
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).toBe(screen.getByLabelText('Name'));
  });

  it('body scroll locked while open', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(document.body.style.position).toBe('');
    await user.click(screen.getByText('Open'));
    expect(document.body.style.position).toBe('fixed');
  });

  it('overlay variant defaults to solid', () => {
    render(
      <Drawer open onOpenChange={() => {}} aria-label="x">
        <Drawer.Body>x</Drawer.Body>
      </Drawer>,
    );
    expect(document.querySelector('[data-drawer-portal-root]')).toHaveAttribute(
      'data-variant',
      'solid',
    );
  });

  it('overlay="blur" sets data-variant="blur"', () => {
    render(
      <Drawer open onOpenChange={() => {}} overlay="blur" aria-label="x">
        <Drawer.Body>x</Drawer.Body>
      </Drawer>,
    );
    expect(document.querySelector('[data-drawer-portal-root]')).toHaveAttribute(
      'data-variant',
      'blur',
    );
  });

  it('stacked drawers: outer is underneath (overlay mode default)', () => {
    render(
      <>
        <Drawer open onOpenChange={() => {}} aria-label="Outer">
          <Drawer.Body>outer</Drawer.Body>
        </Drawer>
        <Drawer open onOpenChange={() => {}} aria-label="Inner">
          <Drawer.Body>inner</Drawer.Body>
        </Drawer>
      </>,
    );
    const overlays = Array.from(
      document.querySelectorAll('[data-drawer-portal-root]'),
    ) as HTMLElement[];
    expect(overlays).toHaveLength(2);
    const positions = overlays.map((el) => el.getAttribute('data-stack-position')).sort();
    expect(positions).toEqual(['top', 'underneath']);
  });

  it('stacked drawers replace mode: outer hidden', () => {
    render(
      <>
        <Drawer open onOpenChange={() => {}} aria-label="Outer" stackMode="replace">
          <Drawer.Body>outer</Drawer.Body>
        </Drawer>
        <Drawer open onOpenChange={() => {}} aria-label="Inner" stackMode="replace">
          <Drawer.Body>inner</Drawer.Body>
        </Drawer>
      </>,
    );
    const overlays = Array.from(
      document.querySelectorAll('[data-drawer-portal-root]'),
    ) as HTMLElement[];
    const positions = overlays.map((el) => el.getAttribute('data-stack-position'));
    expect(positions).toContain('top');
    expect(positions).toContain('hidden');
  });

  it('cross-component stack: Drawer-inside-Modal — neither portal carries inert', async () => {
    const { Modal } = await import('../Modal');
    render(
      <>
        <Modal open onOpenChange={() => {}} aria-label="Modal">
          <Modal.Body>m</Modal.Body>
        </Modal>
        <Drawer open onOpenChange={() => {}} aria-label="Drawer">
          <Drawer.Body>d</Drawer.Body>
        </Drawer>
      </>,
    );
    const modalPortal = document.querySelector('[data-modal-portal-root]') as HTMLElement;
    const drawerPortal = document.querySelector('[data-drawer-portal-root]') as HTMLElement;
    expect(modalPortal.hasAttribute('inert')).toBe(false);
    expect(drawerPortal.hasAttribute('inert')).toBe(false);
  });

  it('warns in dev when neither Header nor aria-label is provided', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Drawer open onOpenChange={() => {}}>
        <Drawer.Body>x</Drawer.Body>
      </Drawer>,
    );
    await new Promise((r) => setTimeout(r, 0));
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does NOT warn when Drawer.Header is provided', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('Open'));
    await new Promise((r) => setTimeout(r, 0));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('restores focus to the previously-focused element on close', async () => {
    const user = userEvent.setup();
    function H() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)} data-testid="trigger">
            Open
          </button>
          <Drawer open={open} onOpenChange={setOpen} aria-label="x">
            <Drawer.Body>x</Drawer.Body>
          </Drawer>
        </>
      );
    }
    render(<H />);
    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    await user.click(trigger);
    expect(document.activeElement).not.toBe(trigger);
    await user.keyboard('{Escape}');
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).toBe(trigger);
  });

  it('forced step combo (no dismissal paths)', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Drawer
        open
        onOpenChange={onOpenChange}
        disableEscapeClose
        dismissOnOverlayClick={false}
        dragToClose={false}
        aria-label="Forced"
      >
        <Drawer.Header closeButton={false}>Forced</Drawer.Header>
        <Drawer.Body>x</Drawer.Body>
      </Drawer>,
    );
    await user.keyboard('{Escape}');
    const overlay = document.querySelector('[data-drawer-portal-root]') as HTMLElement;
    await user.click(overlay);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
