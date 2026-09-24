import { useRef, useState, type RefObject } from 'react';
import { act, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmationPopover } from './ConfirmationPopover';
import { I18nProvider } from '../../i18n/I18nProvider';

describe('ConfirmationPopover — initial render', () => {
  it('renders only the trigger when closed', () => {
    render(
      <ConfirmationPopover
        title="Delete record?"
        description="This action cannot be undone."
        variant="danger"
        onConfirm={() => {}}
      >
        <button type="button">Delete</button>
      </ConfirmationPopover>,
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ConfirmationPopover — content rendering (sync)', () => {
  it('opens with title, description, Cancel and Confirm buttons', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmationPopover
        title="Delete record?"
        description="This action cannot be undone."
        variant="danger"
        onConfirm={() => {}}
      >
        <button type="button">Delete</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('heading', { name: 'Delete record?' })).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    // The Confirm button defaults to label 'Confirm' (since confirmLabel
    // prop is not provided here). The trigger 'Delete' button is no longer
    // the active focus context once the panel opens.
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  // Exact name, not a non-empty one: the pending spinner beside the label is
  // aria-hidden, so with `??` the confirm button has no accessible name at all
  // and only an exact assertion distinguishes "defaulted" from "coincidence".
  it('treats confirmLabel="" as unset rather than as a nameless button', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmationPopover title="Archive?" confirmLabel="" onConfirm={() => {}}>
        <button type="button">Archive…</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Archive…' }));
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveAccessibleName('Confirm');
  });

  it('respects custom confirmLabel and i18n override for cancel', async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider locale="en" overrides={{ confirmationPopover: { cancel: 'Keep' } }}>
        <ConfirmationPopover title="Archive?" confirmLabel="Archive" onConfirm={() => {}}>
          <button type="button">Archive…</button>
        </ConfirmationPopover>
      </I18nProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Archive…' }));
    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument();
  });

  it('default variant uses primary button; danger variant uses danger button', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ConfirmationPopover title="Default?" onConfirm={() => {}}>
        <button type="button">Open</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    // Button doesn't use data-variant — it composes a CSS-Module class
    // named after the variant (e.g. `styles.primary`). The compiled class
    // ends up containing the substring 'primary' / 'danger', so match on
    // that. Bare class equality would be brittle across module hashing.
    expect(screen.getByRole('button', { name: 'Confirm' }).className).toMatch(/primary/);

    rerender(
      <ConfirmationPopover title="Default?" variant="danger" onConfirm={() => {}}>
        <button type="button">Open</button>
      </ConfirmationPopover>,
    );
    expect(screen.getByRole('button', { name: 'Confirm' }).className).toMatch(/danger/);
  });

  it('aria-labelledby points at the title; aria-describedby points at the description', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmationPopover title="Delete?" description="Cannot be undone." onConfirm={() => {}}>
        <button type="button">Open</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const dialog = screen.getByRole('dialog');
    const heading = screen.getByRole('heading', { name: 'Delete?' });
    expect(dialog.getAttribute('aria-labelledby')).toBe(heading.id);

    const description = screen.getByText('Cannot be undone.');
    expect(dialog.getAttribute('aria-describedby')).toBe(description.id);
  });

  it('sync onConfirm: click Confirm → onConfirm runs once → popover closes', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmationPopover title="Confirm?" onConfirm={onConfirm}>
        <button type="button">Open</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Cancel click closes + fires onCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmationPopover title="Confirm?" onConfirm={() => {}} onCancel={onCancel}>
        <button type="button">Open</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ConfirmationPopover — initial focus', () => {
  it('focuses the Cancel button after open (both variants)', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ConfirmationPopover title="Confirm?" onConfirm={() => {}}>
        <button type="button">Open</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    rerender(
      <ConfirmationPopover title="Confirm?" variant="danger" onConfirm={() => {}}>
        <button type="button">Open</button>
      </ConfirmationPopover>,
    );
    // Re-rendering with a new variant keeps the popover open; focus has
    // already moved to Cancel on the original open. Verify it's still there.
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
  });

  it('initialFocusRef receives focus on open (overrides Cancel)', async () => {
    const user = userEvent.setup();
    function FocusHarness() {
      const [open, setOpen] = useState(false);
      const inputRef = useRef<HTMLInputElement | null>(null);
      return (
        <ConfirmationPopover
          open={open}
          onOpenChange={setOpen}
          title="Rename view?"
          description={<input aria-label="New name" ref={inputRef} />}
          initialFocusRef={inputRef as RefObject<HTMLElement | null>}
          confirmLabel="Rename"
          onConfirm={() => {}}
        >
          <button type="button">Open</button>
        </ConfirmationPopover>
      );
    }
    render(<FocusHarness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    // Drain the microtask queue so both Popover.Content's panel-focus and
    // ConfirmationPopover's initialFocusRef-focus have run.
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).toBe(screen.getByLabelText('New name'));
    // The hosted input — NOT the Cancel button — owns focus.
    expect(screen.getByRole('button', { name: 'Cancel' })).not.toHaveFocus();
  });
});

describe('ConfirmationPopover — async onConfirm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // @testing-library/react's asyncWrapper has a setTimeout(0) drain step
    // that only knows how to advance Jest fake timers. Override it to also
    // advance Vitest fake timers (matches the pattern Tooltip uses).
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

  it('async onConfirm: pending → buttons disabled → resolve → close', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let resolveFn: () => void = () => {};
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFn = resolve;
        }),
    );

    render(
      <ConfirmationPopover title="Confirm?" onConfirm={onConfirm}>
        <button type="button">Open</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    // aria-disabled, not native `disabled` — native would drop both buttons
    // out of the tab order the moment the user confirms, leaving focus on a
    // detached element (#497).
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Confirm' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await act(async () => {
      resolveFn();
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('async onConfirm rejects → popover stays open, buttons re-enable, onCancel NOT fired', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onCancel = vi.fn();
    let rejectFn: (e: Error) => void = () => {};
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((_, reject) => {
          rejectFn = reject;
        }),
    );

    render(
      <ConfirmationPopover title="Confirm?" onConfirm={onConfirm} onCancel={onCancel}>
        <button type="button">Open</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await act(async () => {
      rejectFn(new Error('boom'));
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).not.toHaveAttribute('aria-disabled');
    expect(screen.getByRole('button', { name: 'Confirm' })).not.toHaveAttribute('aria-disabled');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('double-click Confirm during pending → onConfirm runs once', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let resolveFn: () => void = () => {};
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFn = resolve;
        }),
    );

    render(
      <ConfirmationPopover title="Confirm?" onConfirm={onConfirm}>
        <button type="button">Open</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    const confirmBtn = screen.getByRole('button', { name: 'Confirm' });
    await user.click(confirmBtn);
    await user.click(confirmBtn); // disabled → ignored
    await user.click(confirmBtn); // disabled → ignored

    expect(onConfirm).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveFn();
    });
  });

  it('while pending: Escape does NOT close', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let resolveFn: () => void = () => {};
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFn = resolve;
        }),
    );

    render(
      <ConfirmationPopover title="Confirm?" onConfirm={onConfirm}>
        <button type="button">Open</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await act(async () => {
      resolveFn();
    });
  });

  it('while pending: click-outside does NOT close', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let resolveFn: () => void = () => {};
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveFn = resolve;
        }),
    );

    render(
      <>
        <ConfirmationPopover title="Confirm?" onConfirm={onConfirm}>
          <button type="button">Open</button>
        </ConfirmationPopover>
        <div data-testid="elsewhere">elsewhere</div>
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await user.pointer({ keys: '[MouseLeft>]', target: screen.getByTestId('elsewhere') });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await act(async () => {
      resolveFn();
    });
  });
});

describe('pending state reaches assistive tech (#497)', () => {
  // Same harness as the async-onConfirm block above: this component's open
  // path uses queueMicrotask + timers for focus, so real timers deadlock.
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

  it('announces from a live region, and keeps both buttons focusable', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let resolveFn: () => void = () => {};
    const onConfirm = vi.fn(() => new Promise<void>((r) => (resolveFn = r)));

    render(
      <ConfirmationPopover title="Confirm?" onConfirm={onConfirm}>
        <button type="button">Open</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));

    // Popover.Content renders in a portal, so query the document, not the
    // render container.
    const region = document.body.querySelector('[role="status"][aria-live="polite"]');
    expect(region, 'region is rendered unconditionally').not.toBeNull();
    expect(region!.textContent).toBe('');

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(region!.textContent).toBe('Working…'));

    // Neither button leaves the tab order: native `disabled` would have.
    expect(screen.getByRole('button', { name: 'Cancel' })).not.toHaveAttribute('disabled');
    expect(screen.getByRole('button', { name: 'Confirm' })).not.toHaveAttribute('disabled');

    await act(async () => {
      resolveFn();
    });
  });

  it('guards both handlers, since aria-disabled does not block activation', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onCancel = vi.fn();
    const onConfirm = vi.fn(() => new Promise<void>(() => {}));

    render(
      <ConfirmationPopover title="Confirm?" onConfirm={onConfirm} onCancel={onCancel}>
        <button type="button">Open</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    // Both are still clickable — that is the point of aria-disabled — so the
    // handlers themselves must refuse.
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });
});

describe('ConfirmationPopover — focus return (#552, #553)', () => {
  let originalScrollIntoView: typeof Element.prototype.scrollIntoView;
  beforeEach(() => {
    originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  it('Cancel click returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmationPopover title="Delete?" onConfirm={() => {}}>
        <button>Delete</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
  });

  it('Confirm click returns focus to the trigger when it survives', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmationPopover title="Delete?" onConfirm={() => {}}>
        <button>Delete</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
  });

  it('returnFocusRef wins and is scrolled into view; the trigger unmounting does not matter', async () => {
    const user = userEvent.setup();
    function Row() {
      const [present, setPresent] = useState(true);
      const survivorRef = useRef<HTMLElement | null>(null);
      return (
        <>
          <button ref={survivorRef as RefObject<HTMLButtonElement>}>Add row</button>
          {present && (
            <ConfirmationPopover
              title="Delete?"
              onConfirm={() => setPresent(false)}
              returnFocusRef={survivorRef}
            >
              <button>Delete</button>
            </ConfirmationPopover>
          )}
        </>
      );
    }
    render(<Row />);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await new Promise((r) => setTimeout(r, 0));
    const survivor = screen.getByRole('button', { name: 'Add row' });
    expect(survivor).toHaveFocus();
    expect(survivor.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
  });

  it('a detached / empty returnFocusRef falls back to the trigger and does not scroll', async () => {
    const user = userEvent.setup();
    const ref = { current: document.createElement('button') };
    render(
      <ConfirmationPopover title="Delete?" onConfirm={() => {}} returnFocusRef={ref}>
        <button>Delete</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    const trigger = screen.getByRole('button', { name: 'Delete' });
    expect(trigger).toHaveFocus();
    expect(trigger.scrollIntoView).not.toHaveBeenCalled();
  });

  it('Escape honours returnFocusRef too', async () => {
    const user = userEvent.setup();
    function H() {
      const r = useRef<HTMLElement | null>(null);
      return (
        <>
          <button ref={r as RefObject<HTMLButtonElement>}>Other</button>
          <ConfirmationPopover title="Delete?" onConfirm={() => {}} returnFocusRef={r}>
            <button>Delete</button>
          </ConfirmationPopover>
        </>
      );
    }
    render(<H />);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Other' })).toHaveFocus();
  });

  it('an outside pointerdown close does not steal focus or scroll (focus is moving to the click target)', async () => {
    const user = userEvent.setup();
    function H() {
      const r = useRef<HTMLElement | null>(null);
      return (
        <>
          <button ref={r as RefObject<HTMLButtonElement>}>Other</button>
          <div data-testid="outside">Outside</div>
          <ConfirmationPopover title="Delete?" onConfirm={() => {}} returnFocusRef={r}>
            <button>Delete</button>
          </ConfirmationPopover>
        </>
      );
    }
    render(<H />);
    const trigger = screen.getByRole('button', { name: 'Delete' });
    await user.click(trigger);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus());
    const focusSpy = vi.spyOn(trigger, 'focus');
    // Real browsers commit the close before mousedown moves focus; fireEvent
    // reproduces that window (focus is not moved by the pointerdown).
    fireEvent.pointerDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 0));
    expect(focusSpy).not.toHaveBeenCalled();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(document.body);
  });

  it('an outside pointerdown that did not close (pending) does not suppress the later restore', async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    render(
      <>
        <div data-testid="outside">Outside</div>
        <ConfirmationPopover
          title="Delete?"
          onConfirm={() => new Promise<void>((r) => (resolve = r))}
        >
          <button>Delete</button>
        </ConfirmationPopover>
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    fireEvent.pointerDown(screen.getByTestId('outside'));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await act(async () => resolve());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
  });

  it('a normal Cancel focuses the trigger exactly once', async () => {
    const user = userEvent.setup();
    render(
      <ConfirmationPopover title="Delete?" onConfirm={() => {}}>
        <button>Delete</button>
      </ConfirmationPopover>,
    );
    const trigger = screen.getByRole('button', { name: 'Delete' });
    await user.click(trigger);
    const focusSpy = vi.spyOn(trigger, 'focus');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(focusSpy).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveFocus();
  });

  it('unmounting while open without returnFocusRef does not throw and focuses nothing', async () => {
    const user = userEvent.setup();
    function Row() {
      const [present, setPresent] = useState(true);
      return present ? (
        <ConfirmationPopover title="Delete?" onConfirm={() => setPresent(false)}>
          <button>Delete</button>
        </ConfirmationPopover>
      ) : null;
    }
    render(<Row />);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(document.body);
  });

  it('a { current: null } returnFocusRef falls back to the trigger', async () => {
    const user = userEvent.setup();
    const ref = { current: null };
    render(
      <ConfirmationPopover title="Delete?" onConfirm={() => {}} returnFocusRef={ref}>
        <button>Delete</button>
      </ConfirmationPopover>,
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
  });

  it('an outside click onto another focusable element leaves focus there', async () => {
    const user = userEvent.setup();
    render(
      <>
        <input aria-label="Elsewhere" />
        <ConfirmationPopover title="Delete?" onConfirm={() => {}}>
          <button>Delete</button>
        </ConfirmationPopover>
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByLabelText('Elsewhere'));
    expect(screen.getByLabelText('Elsewhere')).toHaveFocus();
  });
});
