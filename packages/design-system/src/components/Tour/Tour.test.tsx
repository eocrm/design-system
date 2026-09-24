import { createRef, useState } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { stubClientRects } from '../_internal/layoutStub.testutil';
import { overlayStack } from '../_internal/overlay';
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
