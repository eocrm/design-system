import { createRef, useState } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { stubClientRects } from '../_internal/layoutStub.testutil';
import { overlayStack } from '../_internal/overlay';
import { Popover } from '../Popover';
import { Tour, type TourProps, type TourStep } from './Tour';

const STEPS: TourStep[] = [
  { title: 'Welcome', body: 'Quick tour.' },
  { title: 'Filters', body: 'Narrow the list.' },
  { title: 'All set' },
];

function Harness(props: Partial<TourProps> & { initialOpen?: boolean }) {
  const { initialOpen = true, ...rest } = props;
  const [open, setOpen] = useState(initialOpen);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Start
      </button>
      <Tour steps={STEPS} open={open} onOpenChange={setOpen} {...rest} />
    </>
  );
}

beforeEach(() => {
  stubClientRects();
  overlayStack._reset();
});
afterEach(() => vi.restoreAllMocks());

describe('Tour — rendering', () => {
  it('renders nothing while closed', () => {
    render(<Harness initialOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the first step as a labelled modal dialog', () => {
    render(<Harness />);
    const dialog = screen.getByRole('dialog', { name: 'Welcome' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Quick tour.');
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });

  it('omits aria-describedby when the step has no body', () => {
    render(<Harness defaultStep={2} />);
    expect(screen.getByRole('dialog')).not.toHaveAttribute('aria-describedby');
  });

  it('forwards ref to the card and merges className', () => {
    const ref = createRef<HTMLDivElement>();
    render(<Tour steps={STEPS} open onOpenChange={() => {}} ref={ref} className="mine" />);
    expect(ref.current).toBe(screen.getByRole('dialog'));
    expect(ref.current!.className).toMatch(/card/);
    expect(ref.current).toHaveClass('mine');
  });

  it('keeps role and aria-modal even if the consumer passes them', () => {
    render(<Tour steps={STEPS} open onOpenChange={() => {}} role="note" aria-modal={false} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('renders blockers in modal mode and none with modal={false}', () => {
    const { rerender } = render(<Tour steps={STEPS} open onOpenChange={() => {}} />);
    expect(document.querySelectorAll('[data-tour-blocker]')).toHaveLength(4);
    rerender(<Tour steps={STEPS} open onOpenChange={() => {}} modal={false} />);
    expect(document.querySelectorAll('[data-tour-blocker]')).toHaveLength(0);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'false');
  });

  it('renders nothing and warns for an empty steps array', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<Tour steps={[]} open onOpenChange={() => {}} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(warn).toHaveBeenCalled();
  });
});

describe('Tour — navigation', () => {
  it('Next / Back walk the steps and report onStepChange', async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();
    render(<Harness onStepChange={onStepChange} />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
    expect(onStepChange).toHaveBeenLastCalledWith(1);
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('dialog', { name: 'Welcome' })).toBeInTheDocument();
    expect(onStepChange).toHaveBeenLastCalledWith(0);
  });

  it('last step shows Done and hides Skip; Done completes', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <Tour steps={STEPS} open onOpenChange={onOpenChange} onFinish={onFinish} defaultStep={2} />,
    );
    expect(screen.queryByRole('button', { name: 'Skip tour' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onFinish).toHaveBeenCalledWith('completed');
  });

  it('Skip finishes with reason "skipped"', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<Harness onFinish={onFinish} />);
    await user.click(screen.getByRole('button', { name: 'Skip tour' }));
    expect(onFinish).toHaveBeenCalledWith('skipped');
  });

  it('a one-step tour shows only Done, honouring doneLabel', () => {
    render(<Tour steps={[{ title: 'New' }]} open onOpenChange={() => {}} doneLabel="Got it" />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual(['Got it']);
  });

  it('an empty doneLabel falls back to the translated default', () => {
    render(<Tour steps={[{ title: 'New' }]} open onOpenChange={() => {}} doneLabel="" />);
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('controlled step: Next reports but does not move until the prop changes', async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();
    const { rerender } = render(
      <Tour steps={STEPS} open onOpenChange={() => {}} step={0} onStepChange={onStepChange} />,
    );
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(onStepChange).toHaveBeenCalledWith(1);
    expect(screen.getByRole('dialog', { name: 'Welcome' })).toBeInTheDocument();
    rerender(
      <Tour steps={STEPS} open onOpenChange={() => {}} step={1} onStepChange={onStepChange} />,
    );
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
  });

  it('re-opening an uncontrolled tour starts again at defaultStep', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Skip tour' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByRole('dialog', { name: 'Welcome' })).toBeInTheDocument();
  });
});

describe('Tour — presence', () => {
  it('keeps the card mounted with data-state="closed" while exiting, then unmounts', async () => {
    const { rerender } = render(<Tour steps={STEPS} open onOpenChange={() => {}} />);
    rerender(<Tour steps={STEPS} open={false} onOpenChange={() => {}} />);
    expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('data-state', 'closed');
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument(),
    );
  });
});

describe('Tour — targets', () => {
  function addTarget(id: string) {
    const el = document.createElement('button');
    el.dataset.tour = id;
    el.textContent = id;
    document.body.appendChild(el);
    return el;
  }
  afterEach(() => {
    // Unmount rendered Tours (disconnecting useTourTarget's MutationObserver)
    // BEFORE wiping the body — otherwise the body wipe is itself a mutation
    // the still-active observer picks up, driving a real state update
    // (found -> waiting) outside act(). Same pitfall documented in
    // useTourTarget.test.tsx's own afterEach.
    cleanup();
    document.querySelectorAll('[data-tour]').forEach((el) => el.remove());
  });

  it('anchors to a present target (not centered) with an arrow', () => {
    addTarget('filters');
    render(<Tour steps={[{ target: 'filters', title: 'Filters' }]} open onOpenChange={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toHaveAttribute('data-centered');
    expect(dialog.querySelector('[class*="arrow"]')).not.toBeNull();
  });

  it('centers a step without a target, with no arrow', () => {
    render(<Tour steps={[{ title: 'Hi' }]} open onOpenChange={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('data-centered');
    expect(dialog.querySelector('[class*="arrow"]')).toBeNull();
  });

  it('is aria-busy while waiting and resolves when the target mounts', async () => {
    render(<Tour steps={[{ target: 'later', title: 'Later' }]} open onOpenChange={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-busy', 'true');
    expect(dialog).toHaveAttribute('data-waiting');
    act(() => {
      addTarget('later');
    });
    await waitFor(() => expect(dialog).not.toHaveAttribute('aria-busy'));
    expect(dialog).not.toHaveAttribute('data-centered');
  });

  it('falls back to centered and calls onTargetMissing after the timeout', async () => {
    const onTargetMissing = vi.fn();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const step: TourStep = { target: 'ghost', title: 'Ghost' };
    render(
      <Tour
        steps={[step]}
        open
        onOpenChange={() => {}}
        targetTimeout={20}
        onTargetMissing={onTargetMissing}
      />,
    );
    await waitFor(() => expect(onTargetMissing).toHaveBeenCalledWith(step, 0));
    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toHaveAttribute('aria-busy');
    expect(dialog).toHaveAttribute('data-centered');
    expect(warn).toHaveBeenCalled();
  });

  it('scrolls an off-screen target into view', () => {
    const el = addTarget('far');
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      top: 5000,
      left: 0,
      bottom: 5020,
      right: 80,
      width: 80,
      height: 20,
      x: 0,
      y: 5000,
    } as DOMRect);
    const scroll = vi.fn();
    el.scrollIntoView = scroll;
    render(<Tour steps={[{ target: 'far', title: 'Far' }]} open onOpenChange={() => {}} />);
    expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ block: 'center' }));
  });

  it('does not scroll a target that is already in view', () => {
    const el = addTarget('near');
    const scroll = vi.fn();
    el.scrollIntoView = scroll;
    render(<Tour steps={[{ target: 'near', title: 'Near' }]} open onOpenChange={() => {}} />);
    expect(scroll).not.toHaveBeenCalled();
  });
});

describe('Tour — advanceOn', () => {
  const STEPS2: TourStep[] = [
    { target: 'go', title: 'Click it', interactive: true, advanceOn: 'click' },
    { title: 'Next one' },
  ];
  afterEach(() => {
    // Same ordering pitfall as "Tour — targets" above: unmount before wiping
    // the body, or the live MutationObserver sets state outside act().
    cleanup();
    document.querySelectorAll('[data-tour]').forEach((el) => el.remove());
  });

  function addTarget(onClick?: () => void) {
    const el = document.createElement('button');
    el.dataset.tour = 'go';
    el.textContent = 'Go';
    if (onClick) el.addEventListener('click', onClick);
    document.body.appendChild(el);
    return el;
  }

  it('advances after the target is clicked, after its own handler', async () => {
    const order: string[] = [];
    const onStepChange = vi.fn(() => order.push('advance'));
    // The target's click handler is registered via React's onClick prop, not
    // addEventListener, so the ordering assertion actually exercises the
    // setTimeout(0) race against React's root-delegated click dispatch —
    // two native addEventListener calls would pass on DOM registration
    // order alone and never touch that race.
    render(
      <>
        <button type="button" data-tour="go" onClick={() => order.push('target')}>
          Go
        </button>
        <Tour steps={STEPS2} open onOpenChange={() => {}} onStepChange={onStepChange} />
      </>,
    );
    screen.getByRole('button', { name: 'Go' }).click();
    await waitFor(() => expect(onStepChange).toHaveBeenCalledWith(1));
    expect(order).toEqual(['target', 'advance']);
  });

  it('advanceOn survives the target unmounting because of the click', async () => {
    const onStepChange = vi.fn();
    const el = addTarget(() => el.remove());
    render(<Tour steps={STEPS2} open onOpenChange={() => {}} onStepChange={onStepChange} />);
    el.click();
    await waitFor(() => expect(onStepChange).toHaveBeenCalledWith(1));
  });

  it('is ignored with a dev warning on a non-interactive modal step', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onStepChange = vi.fn();
    const el = addTarget();
    render(
      <Tour
        steps={[{ target: 'go', title: 'Look', advanceOn: 'click' }, { title: 'B' }]}
        open
        onOpenChange={() => {}}
        onStepChange={onStepChange}
      />,
    );
    el.click();
    // act-wrapped: unrelated effects (glide, floating-ui autoUpdate) can
    // flush state asynchronously during this window; a bare setTimeout
    // wait would let that happen outside act and warn.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(onStepChange).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('advanceOn'));
  });

  it('works on any step when modal={false}', async () => {
    const onStepChange = vi.fn();
    const el = addTarget();
    render(
      <Tour
        steps={[{ target: 'go', title: 'Look', advanceOn: 'click' }, { title: 'B' }]}
        open
        modal={false}
        onOpenChange={() => {}}
        onStepChange={onStepChange}
      />,
    );
    el.click();
    await waitFor(() => expect(onStepChange).toHaveBeenCalledWith(1));
  });
});

describe('Tour — focus', () => {
  it('focuses the card on open and again on each step change', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Filters' })).toHaveFocus());
  });

  it('restores focus to the previously focused element on close', async () => {
    const user = userEvent.setup();
    render(<Harness initialOpen={false} />);
    const start = screen.getByRole('button', { name: 'Start' });
    await user.click(start);
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());
    await user.keyboard('{Escape}');
    await waitFor(() => expect(start).toHaveFocus());
  });

  it('modal mode traps Tab inside the card', async () => {
    const user = userEvent.setup();
    render(<Harness defaultStep={1} />);
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());
    await user.tab(); // Skip
    await user.tab(); // Back
    await user.tab(); // Next
    await user.tab(); // wraps
    expect(screen.getByRole('button', { name: 'Skip tour' })).toHaveFocus();
  });

  it('an interactive target joins the trap after the card', async () => {
    const user = userEvent.setup();
    const el = document.createElement('button');
    el.dataset.tour = 'it';
    el.textContent = 'Target';
    document.body.appendChild(el);
    render(
      <Tour
        steps={[{ target: 'it', title: 'Try it', interactive: true }, { title: 'B' }]}
        open
        onOpenChange={() => {}}
      />,
    );
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());
    screen.getByRole('button', { name: 'Next' }).focus();
    await user.tab();
    expect(el).toHaveFocus();
    // cleanup() BEFORE removing the manually-appended target: unmounts the
    // Tour (and its useTourTarget MutationObserver) first, so the removal
    // below isn't observed as a mutation that sets state outside act().
    cleanup();
    el.remove();
  });

  it('modal={false} does not trap focus', async () => {
    const user = userEvent.setup();
    render(<Harness modal={false} defaultStep={2} />);
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());
    await user.tab(); // Back
    await user.tab(); // Done
    await user.tab(); // leaves the card
    expect(screen.getByRole('dialog')).not.toContainElement(document.activeElement as HTMLElement);
  });
});

describe('Tour — keyboard', () => {
  it('Escape skips', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<Harness onFinish={onFinish} />);
    await user.keyboard('{Escape}');
    expect(onFinish).toHaveBeenCalledWith('skipped');
  });

  it('ArrowRight / ArrowLeft move between steps while focus is in the card', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('dialog', { name: 'Welcome' })).toBeInTheDocument();
  });

  it('ArrowRight on the last step does not close the tour', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<Tour steps={STEPS} open onOpenChange={onOpenChange} defaultStep={2} />);
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());
    await user.keyboard('{ArrowRight}');
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('arrow keys typed into an input inside the card do not change steps', async () => {
    const user = userEvent.setup();
    render(
      <Tour
        steps={[{ title: 'Name', body: <input aria-label="name" /> }, { title: 'B' }]}
        open
        onOpenChange={() => {}}
      />,
    );
    await user.click(screen.getByRole('textbox', { name: 'name' }));
    await user.keyboard('ab{ArrowLeft}');
    expect(screen.getByRole('dialog', { name: 'Name' })).toBeInTheDocument();
  });

  it('chains a consumer onKeyDown', async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn();
    render(<Harness onKeyDown={onKeyDown} />);
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());
    await user.keyboard('x');
    expect(onKeyDown).toHaveBeenCalled();
  });

  it('Escape closes a Popover opened inside the card first, not the tour', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(
      <Tour
        steps={[
          {
            title: 'Nested',
            body: (
              <Popover>
                <Popover.Trigger>
                  <button type="button">More</button>
                </Popover.Trigger>
                <Popover.Content>inner</Popover.Content>
              </Popover>
            ),
          },
        ]}
        open
        onOpenChange={() => {}}
        onFinish={onFinish}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByText('inner')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByText('inner')).not.toBeInTheDocument();
    expect(onFinish).not.toHaveBeenCalled();
  });
});
