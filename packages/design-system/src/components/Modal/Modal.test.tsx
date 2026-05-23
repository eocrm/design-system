/**
 * Integration tests for <Modal>. The three hooks (useFocusTrap, useScrollLock,
 * useModalStack) have their own unit tests; these tests exercise the
 * assembled component behavior.
 */
import { useRef, useState, type ComponentProps, type RefObject } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';
import { modalStack } from './useModalStack';

function Harness(props: Partial<ComponentProps<typeof Modal>>) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Modal open={open} onOpenChange={setOpen} {...props}>
        {props.children ?? (
          <>
            <Modal.Header>Title</Modal.Header>
            <Modal.Body>
              <button>Inner button</button>
            </Modal.Body>
            <Modal.Footer>
              <Modal.Close>
                <button>Cancel</button>
              </Modal.Close>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </>
  );
}

describe('<Modal>', () => {
  afterEach(() => {
    modalStack._reset();
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  it('renders nothing when closed', () => {
    render(<Harness />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders dialog with role="dialog" and aria-modal when open', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('Open'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('wires aria-labelledby to Modal.Header heading', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('Open'));
    const dialog = screen.getByRole('dialog');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const heading = document.getElementById(labelledBy!);
    expect(heading?.textContent).toBe('Title');
  });

  it('uses aria-label fallback when no Header is rendered', async () => {
    const user = userEvent.setup();
    function NoHeaderHarness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <Modal open={open} onOpenChange={setOpen} aria-label="Confirm action">
            <Modal.Body>Body</Modal.Body>
          </Modal>
        </>
      );
    }
    render(<NoHeaderHarness />);
    await user.click(screen.getByText('Open'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'Confirm action');
    expect(dialog).not.toHaveAttribute('aria-labelledby');
  });

  it('Escape fires onOpenChange(false) by default', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    function Ctrl() {
      const [open, setOpen] = useState(true);
      return (
        <Modal
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            onOpenChange(next);
          }}
        >
          <Modal.Header>Title</Modal.Header>
          <Modal.Body>x</Modal.Body>
        </Modal>
      );
    }
    render(<Ctrl />);
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Escape is ignored when disableEscapeClose is true', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} disableEscapeClose aria-label="x">
        <Modal.Body>x</Modal.Body>
      </Modal>,
    );
    await user.keyboard('{Escape}');
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('overlay click fires onOpenChange(false) by default', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { container } = render(
      <Modal open onOpenChange={onOpenChange} aria-label="x">
        <Modal.Body>x</Modal.Body>
      </Modal>,
    );
    const overlay = container.ownerDocument.querySelector(
      '[data-modal-portal-root]',
    ) as HTMLElement;
    await user.click(overlay);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('overlay click is ignored when dismissOnOverlayClick is false', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { container } = render(
      <Modal open onOpenChange={onOpenChange} dismissOnOverlayClick={false} aria-label="x">
        <Modal.Body>x</Modal.Body>
      </Modal>,
    );
    const overlay = container.ownerDocument.querySelector(
      '[data-modal-portal-root]',
    ) as HTMLElement;
    await user.click(overlay);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('clicking inside Content does NOT fire onOpenChange', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} aria-label="x">
        <Modal.Body>
          <p>click me</p>
        </Modal.Body>
      </Modal>,
    );
    await user.click(screen.getByText('click me'));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('Modal.Close click fires onOpenChange(false)', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} aria-label="x">
        <Modal.Body>x</Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <button>Cancel</button>
          </Modal.Close>
        </Modal.Footer>
      </Modal>,
    );
    await user.click(screen.getByText('Cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Header × close button fires onOpenChange(false) by default', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange}>
        <Modal.Header>Title</Modal.Header>
        <Modal.Body>x</Modal.Body>
      </Modal>,
    );
    await user.click(screen.getByRole('button', { name: /close dialog/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Header with closeButton={false} does NOT render the × button', () => {
    render(
      <Modal open onOpenChange={() => {}}>
        <Modal.Header closeButton={false}>Title</Modal.Header>
        <Modal.Body>x</Modal.Body>
      </Modal>,
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
          <Modal
            open={open}
            onOpenChange={setOpen}
            initialFocusRef={inputRef as RefObject<HTMLElement | null>}
          >
            <Modal.Header>Title</Modal.Header>
            <Modal.Body>
              <input ref={inputRef} aria-label="Name" />
            </Modal.Body>
          </Modal>
        </>
      );
    }
    render(<FocusHarness />);
    await user.click(screen.getByText('Open'));
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).toBe(screen.getByLabelText('Name'));
  });

  it('locks body scroll while open', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(document.body.style.position).toBe('');
    await user.click(screen.getByText('Open'));
    expect(document.body.style.position).toBe('fixed');
  });

  it('releases body scroll after close', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('Open'));
    expect(document.body.style.position).toBe('fixed');
    await user.keyboard('{Escape}');
    expect(document.body.style.position).toBe('');
  });

  it('data-size reflects size prop', async () => {
    const user = userEvent.setup();
    render(<Harness size="lg" />);
    await user.click(screen.getByText('Open'));
    expect(screen.getByRole('dialog')).toHaveAttribute('data-size', 'lg');
  });

  it('warns in dev when neither Header nor aria-label is provided', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Modal open onOpenChange={() => {}}>
        <Modal.Body>x</Modal.Body>
      </Modal>,
    );
    await new Promise((r) => setTimeout(r, 0)); // flush microtasks
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does NOT warn when <Modal.Header> is provided', async () => {
    const user = userEvent.setup();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Harness />);
    await user.click(screen.getByText('Open'));
    // Flush microtasks so the deferred warning check has a chance to fire.
    await new Promise((r) => setTimeout(r, 0));
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does NOT warn when aria-label is provided without <Modal.Header>', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Modal open onOpenChange={() => {}} aria-label="Confirm">
        <Modal.Body>x</Modal.Body>
      </Modal>,
    );
    await new Promise((r) => setTimeout(r, 0)); // flush microtasks
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('Footer applies align prop class', () => {
    const { container } = render(
      <Modal open onOpenChange={() => {}} aria-label="x">
        <Modal.Body>x</Modal.Body>
        <Modal.Footer align="space-between">
          <button>Left</button>
          <button>Right</button>
        </Modal.Footer>
      </Modal>,
    );
    const footer = container.ownerDocument.querySelector('[role="group"]');
    expect(footer?.className).toMatch(/footerAlign-space-between/);
  });

  it('stacked modals: Esc only closes topmost', async () => {
    const user = userEvent.setup();
    const onOuter = vi.fn();
    const onInner = vi.fn();
    function Stacked() {
      const [outer, setOuter] = useState(true);
      const [inner, setInner] = useState(true);
      return (
        <>
          <Modal
            open={outer}
            onOpenChange={(next) => {
              setOuter(next);
              onOuter(next);
            }}
            aria-label="Outer"
          >
            <Modal.Body>outer</Modal.Body>
          </Modal>
          <Modal
            open={inner}
            onOpenChange={(next) => {
              setInner(next);
              onInner(next);
            }}
            aria-label="Inner"
          >
            <Modal.Body>inner</Modal.Body>
          </Modal>
        </>
      );
    }
    render(<Stacked />);
    await user.keyboard('{Escape}');
    expect(onInner).toHaveBeenCalledWith(false);
    expect(onOuter).not.toHaveBeenCalled();
  });

  it('forces step combo: open + disableEscapeClose + dismissOnOverlayClick=false + no Close', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { container } = render(
      <Modal
        open
        onOpenChange={onOpenChange}
        disableEscapeClose
        dismissOnOverlayClick={false}
        aria-label="Forced"
      >
        <Modal.Header closeButton={false}>Forced</Modal.Header>
        <Modal.Body>Cannot escape.</Modal.Body>
      </Modal>,
    );
    await user.keyboard('{Escape}');
    const overlay = container.ownerDocument.querySelector(
      '[data-modal-portal-root]',
    ) as HTMLElement;
    await user.click(overlay);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  // ─── Amendment A: overlay variant ───────────────────────────────────

  it('overlay variant defaults to data-variant="solid"', () => {
    const { container } = render(
      <Modal open onOpenChange={() => {}} aria-label="x">
        <Modal.Body>x</Modal.Body>
      </Modal>,
    );
    const overlay = container.ownerDocument.querySelector(
      '[data-modal-portal-root]',
    ) as HTMLElement;
    expect(overlay).toHaveAttribute('data-variant', 'solid');
  });

  it('overlay="blur" writes data-variant="blur"', () => {
    const { container } = render(
      <Modal open onOpenChange={() => {}} overlay="blur" aria-label="x">
        <Modal.Body>x</Modal.Body>
      </Modal>,
    );
    const overlay = container.ownerDocument.querySelector(
      '[data-modal-portal-root]',
    ) as HTMLElement;
    expect(overlay).toHaveAttribute('data-variant', 'blur');
  });

  // ─── Amendment B: stack display model ───────────────────────────────

  it('stacked modals (replace mode): outer is data-stack-position="hidden", inner is "top"', () => {
    const { container } = render(
      <>
        <Modal open onOpenChange={() => {}} aria-label="Outer" stackMode="replace">
          <Modal.Body>outer</Modal.Body>
        </Modal>
        <Modal open onOpenChange={() => {}} aria-label="Inner" stackMode="replace">
          <Modal.Body>inner</Modal.Body>
        </Modal>
      </>,
    );
    const overlays = Array.from(
      container.ownerDocument.querySelectorAll('[data-modal-portal-root]'),
    ) as HTMLElement[];
    expect(overlays).toHaveLength(2);
    // Last-registered modal (inner) is top; first-registered (outer) is hidden.
    const positions = overlays.map((el) => el.getAttribute('data-stack-position'));
    expect(positions).toContain('top');
    expect(positions).toContain('hidden');
    // Exactly one top.
    expect(positions.filter((p) => p === 'top')).toHaveLength(1);
  });

  it('stackMode="replace": top paints overlay, hidden does not', () => {
    render(
      <>
        <Modal open onOpenChange={() => {}} aria-label="Outer" stackMode="replace">
          <Modal.Body>outer</Modal.Body>
        </Modal>
        <Modal open onOpenChange={() => {}} aria-label="Inner" stackMode="replace">
          <Modal.Body>inner</Modal.Body>
        </Modal>
      </>,
    );
    const overlays = Array.from(
      document.querySelectorAll('[data-modal-portal-root]'),
    ) as HTMLElement[];
    expect(overlays).toHaveLength(2);
    const top = overlays.find((el) => el.getAttribute('data-stack-position') === 'top')!;
    const hidden = overlays.find((el) => el.getAttribute('data-stack-position') === 'hidden')!;
    expect(top.getAttribute('data-overlay-paint')).toBe('yes');
    expect(hidden.getAttribute('data-overlay-paint')).toBe('no');
  });

  it('stackMode="overlay" (default): outer is underneath, inner is top transparent (paint=no)', () => {
    render(
      <>
        <Modal open onOpenChange={() => {}} aria-label="Outer">
          <Modal.Body>outer</Modal.Body>
        </Modal>
        <Modal open onOpenChange={() => {}} aria-label="Inner">
          <Modal.Body>inner</Modal.Body>
        </Modal>
      </>,
    );
    const overlays = Array.from(
      document.querySelectorAll('[data-modal-portal-root]'),
    ) as HTMLElement[];
    expect(overlays).toHaveLength(2);
    const positions = overlays.map((el) => el.getAttribute('data-stack-position')).sort();
    expect(positions).toEqual(['top', 'underneath']);
    // Bottom (depth 0) paints; top is transparent (paint=no).
    const top = overlays.find((el) => el.getAttribute('data-stack-position') === 'top')!;
    const underneath = overlays.find(
      (el) => el.getAttribute('data-stack-position') === 'underneath',
    )!;
    expect(top.getAttribute('data-overlay-paint')).toBe('no');
    expect(underneath.getAttribute('data-overlay-paint')).toBe('yes');
  });

  it('stacked modals: inner modal portal is NOT inert (delete-confirmation regression)', () => {
    render(
      <>
        <Modal open onOpenChange={() => {}} aria-label="Outer">
          <Modal.Body>outer</Modal.Body>
        </Modal>
        <Modal open onOpenChange={() => {}} aria-label="Inner">
          <Modal.Body>
            <button>Confirm delete</button>
          </Modal.Body>
        </Modal>
      </>,
    );
    const overlays = Array.from(
      document.querySelectorAll('[data-modal-portal-root]'),
    ) as HTMLElement[];
    // Neither modal portal should be inert — both must remain interactive
    // (the lower one is display:none anyway; the top one must be clickable).
    for (const el of overlays) {
      expect(el.hasAttribute('inert')).toBe(false);
    }
  });

  it('restores focus to the previously-focused element on close', async () => {
    const user = userEvent.setup();
    function FocusRestoreHarness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)} data-testid="trigger">
            Open
          </button>
          <Modal open={open} onOpenChange={setOpen} aria-label="x">
            <Modal.Body>x</Modal.Body>
          </Modal>
        </>
      );
    }
    render(<FocusRestoreHarness />);
    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);
    await user.click(trigger);
    // Modal opens; focus moves to dialog.
    expect(document.activeElement).not.toBe(trigger);
    await user.keyboard('{Escape}');
    // Modal closes; focus restored to the trigger.
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).toBe(trigger);
  });

  it('does not throw when the previously-focused trigger is removed while modal is open', async () => {
    const user = userEvent.setup();
    function TriggerRemovalHarness() {
      const [open, setOpen] = useState(false);
      const [triggerVisible, setTriggerVisible] = useState(true);
      return (
        <>
          {triggerVisible && (
            <button
              onClick={() => {
                setOpen(true);
                // Remove the trigger from the DOM while the modal is open
                setTriggerVisible(false);
              }}
              data-testid="trigger"
            >
              Open
            </button>
          )}
          <Modal open={open} onOpenChange={setOpen} aria-label="x">
            <Modal.Body>x</Modal.Body>
          </Modal>
        </>
      );
    }
    render(<TriggerRemovalHarness />);
    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    await user.click(trigger);
    expect(screen.queryByTestId('trigger')).toBeNull();
    // Should close without throwing — the document.contains() guard skips the
    // focus() call when the saved element is no longer in the DOM.
    await user.keyboard('{Escape}');
    // Focus should land somewhere sensible; document.body is fine for jsdom.
    expect(document.activeElement).toBeDefined();
  });
});
