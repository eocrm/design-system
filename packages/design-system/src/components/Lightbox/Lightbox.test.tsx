import { useState } from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { overlayStack } from '../_internal/overlay';
import { Lightbox, type LightboxItem, type LightboxProps } from './Lightbox';
import { Modal } from '../Modal';

const ITEMS: LightboxItem[] = [
  { src: 'https://x/a.jpg', alt: 'Alpha', caption: 'Cap A' },
  { src: 'https://x/b.jpg', alt: 'Bravo' },
  { src: 'https://x/c.jpg', alt: 'Charlie' },
];

beforeAll(() => {
  // jsdom has no scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
});

function open(props: Partial<LightboxProps> = {}) {
  return render(<Lightbox open onOpenChange={() => {}} items={ITEMS} {...props} />);
}

describe('Lightbox', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<Lightbox open={false} onOpenChange={() => {}} items={ITEMS} />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders nothing with no items', () => {
    const { container } = render(<Lightbox open onOpenChange={() => {}} items={[]} />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('shows the defaultIndex image in a dialog', () => {
    open({ defaultIndex: 1 });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByAltText('Bravo')).toBeInTheDocument();
  });

  it('next/prev chevrons change the image and fire onIndexChange', async () => {
    const onIndexChange = vi.fn();
    open({ defaultIndex: 0, onIndexChange });
    await userEvent.click(screen.getByRole('button', { name: 'Next image' }));
    expect(screen.getByAltText('Bravo')).toBeInTheDocument();
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    await userEvent.click(screen.getByRole('button', { name: 'Previous image' }));
    expect(screen.getByAltText('Alpha')).toBeInTheDocument();
  });

  it('arrow keys navigate; Escape closes', async () => {
    const onOpenChange = vi.fn();
    open({ defaultIndex: 0, onOpenChange });
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByAltText('Bravo')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('loops by default (next from last → first)', async () => {
    open({ defaultIndex: 2 });
    await userEvent.click(screen.getByRole('button', { name: 'Next image' }));
    expect(screen.getByAltText('Alpha')).toBeInTheDocument();
  });

  it('loop={false} disables prev at start and next at end', async () => {
    open({ defaultIndex: 0, loop: false });
    expect(screen.getByRole('button', { name: 'Previous image' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next image' })).not.toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Next image' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next image' }));
    expect(screen.getByAltText('Charlie')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next image' })).toBeDisabled();
  });

  it('controlled index does not self-advance, but fires onIndexChange', async () => {
    const onIndexChange = vi.fn();
    open({ index: 0, onIndexChange });
    await userEvent.click(screen.getByRole('button', { name: 'Next image' }));
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    expect(screen.getByAltText('Alpha')).toBeInTheDocument();
  });

  it('shows the caption and counter for a multi-image gallery', () => {
    open({ defaultIndex: 0 });
    expect(screen.getByText('Cap A')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('hides chevrons, counter, and strip for a single item', () => {
    render(<Lightbox open onOpenChange={() => {}} items={[ITEMS[0]]} />);
    expect(screen.queryByRole('button', { name: 'Next image' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Previous image' })).toBeNull();
    expect(screen.queryByText('1 / 1')).toBeNull();
  });

  it('thumbnails jump to an index', async () => {
    const onIndexChange = vi.fn();
    open({ defaultIndex: 0, onIndexChange });
    await userEvent.click(screen.getByRole('button', { name: 'Charlie' }));
    expect(onIndexChange).toHaveBeenLastCalledWith(2);
    expect(screen.getByAltText('Charlie')).toBeInTheDocument();
  });

  it('close button and backdrop click close; clicking the image does not', async () => {
    const onOpenChange = vi.fn();
    open({ defaultIndex: 0, onOpenChange });
    await userEvent.click(screen.getByRole('button', { name: 'Close gallery' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    onOpenChange.mockClear();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    onOpenChange.mockClear();
    fireEvent.click(screen.getByAltText('Alpha'));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('reopening with a new defaultIndex shows that image', () => {
    const { rerender } = render(
      <Lightbox open={false} onOpenChange={() => {}} items={ITEMS} defaultIndex={0} />,
    );
    rerender(<Lightbox open onOpenChange={() => {}} items={ITEMS} defaultIndex={2} />);
    expect(screen.getByAltText('Charlie')).toBeInTheDocument();
  });

  it('shows the load-error message and marks the broken img for hiding on error', () => {
    open({ defaultIndex: 0 });
    const stageImg = screen.getByAltText('Alpha');
    fireEvent.error(stageImg);
    // data-state='error' drives `.image[data-state='error'] { display: none }`;
    // the role="img" error overlay carries the accessible name instead.
    expect(stageImg).toHaveAttribute('data-state', 'error');
    expect(screen.getByText('Image failed to load')).toBeInTheDocument();
  });

  const pdfItem = { src: 'https://f/contract.pdf', alt: 'Contract.pdf', kind: 'pdf' as const };

  it('renders a PDF item in an iframe (not an img) with the alt as title', () => {
    render(<Lightbox open onOpenChange={() => {}} items={[pdfItem]} />);
    const frame = document.querySelector('iframe');
    expect(frame).toBeTruthy();
    expect(frame).toHaveAttribute('src', 'https://f/contract.pdf');
    expect(frame).toHaveAttribute('title', 'Contract.pdf');
  });

  it('auto-detects a .pdf src as a document even without kind', () => {
    render(
      <Lightbox open onOpenChange={() => {}} items={[{ src: 'https://f/a.pdf', alt: 'A' }]} />,
    );
    expect(document.querySelector('iframe')).toBeTruthy();
  });

  it('shows a download action for a PDF item', () => {
    render(<Lightbox open onOpenChange={() => {}} items={[pdfItem]} />);
    const dl = screen.getByRole('link', { name: 'Download' });
    expect(dl).toHaveAttribute('href', 'https://f/contract.pdf');
    expect(dl).toHaveAttribute('download');
  });

  it('blocks an unsafe PDF src (no iframe, no download, shows preview-unavailable)', () => {
    render(
      <Lightbox
        open
        onOpenChange={() => {}}
        items={[{ src: 'javascript:alert(1)', alt: 'x', kind: 'pdf' }]}
      />,
    );
    expect(document.querySelector('iframe')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Download' })).toBeNull(); // no unsafe href
    expect(screen.getByText('Preview unavailable')).toBeInTheDocument();
  });

  it.each([
    ['with an alt', 'Quarterly report', 'Quarterly report: Preview unavailable'],
    ['with an empty alt', '', 'Preview unavailable'],
  ])('names the unavailable-preview tile %s', (_what, alt, expected) => {
    // The branch's only Lightbox behaviour change and it was unpinned: the
    // empty-`alt` guard stops the name being ": Preview unavailable". Both the
    // pre-fix unconditional concat AND forcing the other branch left this file
    // green, because its only related assertion reads the visible child and is
    // blind to `aria-label`.
    //
    // Concatenated here where Image deliberately is NOT: the text is a CHILD
    // of this `role="img"`, so children-presentational prunes it and the name
    // is all that is left. In Image it is a sibling that survives.
    render(
      <Lightbox
        open
        onOpenChange={() => {}}
        items={[{ src: 'javascript:alert(1)', alt, kind: 'pdf' }]}
      />,
    );
    expect(screen.getByRole('img')).toHaveAccessibleName(expected);
  });

  it('blocks data: and blob: PDF srcs too', () => {
    for (const src of ['data:text/html,<script>1</script>', 'blob:https://x/abc']) {
      const { unmount } = render(
        <Lightbox open onOpenChange={() => {}} items={[{ src, alt: 'x', kind: 'pdf' as const }]} />,
      );
      expect(document.querySelector('iframe')).toBeNull();
      unmount();
    }
  });

  it('does not sandbox the PDF iframe (Chrome blocks its PDF viewer in any sandboxed frame), keeps no-referrer', () => {
    render(<Lightbox open onOpenChange={() => {}} items={[pdfItem]} />);
    const frame = document.querySelector('iframe')!;
    // No `sandbox`: Chrome refuses to render PDFs inside ANY sandboxed iframe
    // (regardless of allow-* tokens), which blocks the viewer entirely. The real
    // guards stay: no-referrer + the http(s)/relative-only src check (safeDocSrc).
    expect(frame.hasAttribute('sandbox')).toBe(false);
    expect(frame.getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  it('the download link opens in a new tab (cross-origin download safety)', () => {
    render(<Lightbox open onOpenChange={() => {}} items={[pdfItem]} />);
    const dl = screen.getByRole('link', { name: 'Download' });
    expect(dl).toHaveAttribute('target', '_blank');
    expect(dl).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('shows a doc-icon placeholder thumbnail for a PDF without a thumbnail', () => {
    render(
      <Lightbox
        open
        onOpenChange={() => {}}
        items={[{ src: 'https://f/p.png', alt: 'P' }, pdfItem]}
      />,
    );
    // the pdf thumb is a button (placeholder), labelled by its alt — not an <img>
    expect(screen.getByRole('button', { name: 'Contract.pdf' })).toBeInTheDocument();
  });

  it('an image item still renders an img (no regression)', () => {
    render(
      <Lightbox open onOpenChange={() => {}} items={[{ src: 'https://f/p.png', alt: 'P' }]} />,
    );
    expect(document.querySelector('img')).toBeTruthy();
    expect(document.querySelector('iframe')).toBeNull();
  });

  it('a mixed gallery navigates from image to pdf', async () => {
    const user = userEvent.setup();
    render(
      <Lightbox
        open
        onOpenChange={() => {}}
        items={[{ src: 'https://f/p.png', alt: 'P' }, pdfItem]}
      />,
    );
    expect(document.querySelector('img')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Next image' }));
    expect(document.querySelector('iframe')).toBeTruthy();
  });

  it('restores focus to the trigger on close', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>trigger</button>
          <Lightbox open={open} onOpenChange={setOpen} items={ITEMS} />
        </>
      );
    }
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'trigger' });
    trigger.focus();
    await userEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close gallery' }));
    expect(trigger).toHaveFocus();
  });
});

describe('Lightbox — Escape yields to open floating surfaces (#274)', () => {
  afterEach(() => {
    overlayStack._reset();
  });

  it('does not close while a floating surface is registered; closes after', () => {
    const onOpenChange = vi.fn();
    open({ onOpenChange });
    overlayStack.registerFloating('probe-surface');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).not.toHaveBeenCalled();
    overlayStack.unregisterFloating('probe-surface');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('Lightbox — nested overlay does not steal focus back on release (#551)', () => {
  afterEach(() => {
    overlayStack._reset();
  });

  it('releasing the top slot back to the Lightbox does not re-focus its container', async () => {
    function Harness() {
      const [lbOpen, setLbOpen] = useState(false);
      return (
        <>
          <button onClick={() => setLbOpen(true)}>trigger</button>
          <button data-testid="inner-opener">inner opener</button>
          <Lightbox open={lbOpen} onOpenChange={setLbOpen} items={ITEMS} />
        </>
      );
    }
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'trigger' }));
    expect(screen.getByRole('dialog')).toHaveFocus();

    // A nested overlay (e.g. a Modal) opens above the Lightbox — its isTop flips false.
    act(() => {
      overlayStack.register('nested-overlay', 'overlay');
    });

    // The nested overlay restores focus to its own opener, then releases the
    // top slot back to the Lightbox — mirrors a real Modal's close sequence
    // (focus restore, then overlayStack.unregister).
    const innerOpener = screen.getByTestId('inner-opener');
    act(() => {
      innerOpener.focus();
      overlayStack.unregister('nested-overlay');
    });
    await new Promise((r) => setTimeout(r, 0));

    expect(document.activeElement).toBe(innerOpener);
  });
});

describe('Lightbox — closing over a replace-hidden overlay restores focus (#551)', () => {
  afterEach(() => {
    overlayStack._reset();
  });

  // Lightbox stacks in replace mode, so a Modal under it is display:none when
  // the Lightbox closes and the first focus() of the opener no-ops in a real
  // browser. jsdom ignores display, so emulate that no-op.
  it('retries the opener once the lower modal is shown again', async () => {
    function Harness() {
      const [lbOpen, setLbOpen] = useState(false);
      return (
        <Modal open onOpenChange={() => {}} aria-label="outer">
          <Modal.Body>
            <button onClick={() => setLbOpen(true)}>View</button>
            <Lightbox open={lbOpen} onOpenChange={setLbOpen} items={ITEMS} />
          </Modal.Body>
        </Modal>
      );
    }
    render(<Harness />);
    await new Promise((r) => setTimeout(r, 0));
    const opener = screen.getByRole('button', { name: 'View' });
    opener.focus();
    await userEvent.click(opener);
    vi.spyOn(opener, 'focus').mockImplementationOnce(() => {});
    await userEvent.keyboard('{Escape}');
    await new Promise((r) => setTimeout(r, 0));
    expect(document.activeElement).toBe(opener);
  });
});

describe('Lightbox — empty aria-label', () => {
  // An empty aria-label on a role="dialog" leaves the dialog unnamed; `||`
  // keeps the default, `??` would not.
  it('falls back to the default dialog name when aria-label is an empty string', () => {
    open({ 'aria-label': '' });
    expect(screen.getByRole('dialog', { name: 'Image gallery' })).toBeInTheDocument();
  });
});
