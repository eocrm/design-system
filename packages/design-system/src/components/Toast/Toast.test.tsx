import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastViewport, type ToastViewportProps } from './ToastViewport';
import { toast, _setViewportConfig } from './api';
import { store } from './store';

function renderViewport(props: Partial<ToastViewportProps> = {}) {
  return render(<ToastViewport {...props} />);
}

describe('<ToastViewport>', () => {
  beforeEach(() => {
    store._reset();
    _setViewportConfig({ position: 'bottom-right', duration: 4000 });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when the store is empty', () => {
    const { container } = renderViewport();
    // Portal renders into document.body; viewport returns null fragment.
    expect(container.firstChild).toBeNull();
    expect(document.body.querySelector('[data-position]')).toBeNull();
  });

  it('renders a single toast after toast.success', () => {
    renderViewport();
    act(() => {
      toast.success('Saved');
    });
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it.each([
    ['info', 'status', 'polite'],
    ['success', 'status', 'polite'],
    ['warning', 'status', 'polite'],
    ['loading', 'status', 'polite'],
    ['error', 'alert', 'assertive'],
  ] as const)('tone=%s gets role=%s aria-live=%s', (tone, expectedRole, expectedLive) => {
    renderViewport();
    act(() => {
      toast[tone]('msg');
    });
    const node = screen.getByText('msg').closest('[role]');
    expect(node).toHaveAttribute('role', expectedRole);
    expect(node).toHaveAttribute('aria-live', expectedLive);
  });

  it('auto-dismisses after the default duration', () => {
    renderViewport({ duration: 1000 });
    act(() => {
      toast.success('Saved');
    });
    expect(screen.getByText('Saved')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    // status flips to exiting, then the store removes after 250ms.
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('duration: persistent does not auto-dismiss', () => {
    renderViewport({ duration: 1000 });
    act(() => {
      toast.error('Boom', { duration: 'persistent' });
    });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText('Boom')).toBeInTheDocument();
  });

  it('pauses the timer while hovered', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderViewport({ duration: 1000 });
    act(() => {
      toast.success('Saved');
    });
    const toastNode = screen.getByText('Saved').closest('[role]')!;
    await user.hover(toastNode as Element);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('action button fires onClick AND dismisses the toast', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onUndo = vi.fn();
    renderViewport();
    act(() => {
      toast.success('Item deleted', { action: { label: 'Undo', onClick: onUndo } });
    });
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByText('Item deleted')).not.toBeInTheDocument();
  });

  it('close button (×) dismisses the toast', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderViewport();
    act(() => {
      toast.success('Saved');
    });
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('close button is hidden when dismissible: false', () => {
    renderViewport();
    act(() => {
      toast.success('Saved', { dismissible: false });
    });
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull();
  });

  it('persistent toasts always show the close button (overrides dismissible: false)', () => {
    renderViewport();
    act(() => {
      toast.error('Boom', { duration: 'persistent', dismissible: false });
    });
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('toast.dismiss(id) dismisses programmatically', () => {
    renderViewport();
    let id = '';
    act(() => {
      id = toast.success('Saved');
    });
    act(() => {
      toast.dismiss(id);
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('toast.update(id, ...) mutates the rendered card', () => {
    renderViewport();
    let id = '';
    act(() => {
      id = toast.loading('Uploading');
    });
    expect(screen.getByText('Uploading')).toBeInTheDocument();
    act(() => {
      toast.update(id, { tone: 'success', message: 'Uploaded' });
    });
    expect(screen.queryByText('Uploading')).not.toBeInTheDocument();
    expect(screen.getByText('Uploaded')).toBeInTheDocument();
  });

  it('two toasts stack in the same position bucket', () => {
    renderViewport();
    act(() => {
      toast.success('a');
      toast.success('b');
    });
    const stack = document.body.querySelector('[data-position="bottom-right"]')!;
    expect(within(stack as HTMLElement).getByText('a')).toBeInTheDocument();
    expect(within(stack as HTMLElement).getByText('b')).toBeInTheDocument();
  });

  it('per-call position routes to the right bucket', () => {
    renderViewport({ position: 'bottom-right' });
    act(() => {
      toast.success('here', { position: 'top-center' });
    });
    const topCenter = document.body.querySelector('[data-position="top-center"]');
    expect(topCenter).not.toBeNull();
    expect(within(topCenter as HTMLElement).getByText('here')).toBeInTheDocument();
  });

  it('beyond maxVisible, toasts get data-peek="true"', () => {
    renderViewport({ maxVisible: 2 });
    act(() => {
      toast.success('a');
      toast.success('b');
      toast.success('c');
      toast.success('d');
    });
    const peekItems = document.body.querySelectorAll('[data-peek="true"]');
    expect(peekItems.length).toBe(2);
  });

  it('hovering the stack expands peek-collapsed toasts', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderViewport({ maxVisible: 1 });
    act(() => {
      toast.success('a');
      toast.success('b');
    });
    const stack = document.body.querySelector('[data-position="bottom-right"]')!;
    expect(stack.getAttribute('data-expanded')).toBe('false');
    await user.hover(stack as Element);
    expect(stack.getAttribute('data-expanded')).toBe('true');
  });

  it('expand: true keeps the stack fanned without hover', () => {
    renderViewport({ maxVisible: 1, expand: true });
    act(() => {
      toast.success('a');
      toast.success('b');
    });
    const stack = document.body.querySelector('[data-position="bottom-right"]')!;
    expect(stack.getAttribute('data-expanded')).toBe('true');
  });

  it('toast.promise: loading then success on resolve', async () => {
    renderViewport();
    let p!: Promise<{ name: string }>;
    act(() => {
      p = toast.promise(Promise.resolve({ name: 'file.pdf' }), {
        loading: 'Uploading',
        success: (r) => `Uploaded ${r.name}`,
        error: 'Failed',
      });
    });
    expect(screen.getByText('Uploading')).toBeInTheDocument();
    await act(async () => {
      await p;
    });
    expect(screen.getByText('Uploaded file.pdf')).toBeInTheDocument();
  });

  it('toast.promise: loading then error on reject', async () => {
    renderViewport();
    const err = new Error('500');
    let p!: Promise<never>;
    act(() => {
      p = toast.promise(Promise.reject(err) as Promise<never>, {
        loading: 'Uploading',
        success: 'Uploaded',
        error: (e) => `Failed: ${(e as Error).message}`,
      });
    });
    await act(async () => {
      await p.catch(() => {});
    });
    expect(screen.getByText('Failed: 500')).toBeInTheDocument();
  });

  it('two <ToastViewport> instances: dev-warn fires and only the first renders', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <>
        <ToastViewport />
        <ToastViewport />
      </>
    );
    act(() => {
      toast.success('once');
    });
    expect(screen.getAllByText('once')).toHaveLength(1);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('Multiple <ToastViewport>')
    );
    errSpy.mockRestore();
  });
});
