import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Image } from './Image';

const SRC = 'https://example.com/photo.jpg';

function getImg(container: HTMLElement): HTMLImageElement {
  return container.querySelector('img') as HTMLImageElement;
}

describe('Image', () => {
  it('renders an <img> with the given src and alt', () => {
    const { container } = render(<Image src={SRC} alt="A photo" />);
    const img = getImg(container);
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe(SRC);
    expect(img.getAttribute('alt')).toBe('A photo');
  });

  it('starts in the loading state with a Skeleton overlay', () => {
    const { container } = render(<Image src={SRC} alt="A photo" />);
    expect(container.querySelector('[data-state="loading"]')).not.toBeNull();
    // Skeleton renders an aria-hidden span.
    expect(container.querySelector('span[aria-hidden="true"]')).not.toBeNull();
  });

  it('transitions to loaded on the img load event', () => {
    const { container } = render(<Image src={SRC} alt="A photo" />);
    fireEvent.load(getImg(container));
    expect(container.querySelector('[data-state="loaded"]')).not.toBeNull();
  });

  it('shows the default error placeholder on the img error event', () => {
    const { container, getByRole, getByText } = render(<Image src={SRC} alt="A photo" />);
    fireEvent.error(getImg(container));
    expect(container.querySelector('[data-state="error"]')).not.toBeNull();
    // The failure must be announced, but exactly ONCE. #488 put it in the
    // icon's name because `alt || t(...)` dropped the error word whenever
    // `alt` was set — a broken image announced exactly like a loaded one.
    // Concatenating fixed that and introduced the opposite defect: the
    // sibling below renders the same phrase as visible text, so a reader
    // said it twice in a row. The icon now carries only `alt`; the text
    // carries the failure.
    expect(getByRole('img', { name: 'A photo' })).not.toBeNull();
    expect(getByText('Image failed to load')).not.toBeNull();
    // The NAME is what the concatenation bug lived in, so that is what has to
    // be pinned — `aria-label` is an attribute, not text, so a textContent
    // count passed identically before and after the fix. Kept alongside it to
    // catch the other direction: a second visible copy of the sentence.
    expect(container.textContent!.match(/Image failed to load/g)).toHaveLength(1);
    expect(getByRole('img').getAttribute('aria-label')).not.toMatch(/failed to load/i);
    expect(getByRole('button', { name: 'Retry' })).not.toBeNull();
  });

  it('goes decorative when there is no alt, leaving the text to carry the failure', () => {
    const { container, getByText, queryByRole } = render(<Image src={SRC} alt="" />);
    fireEvent.error(getImg(container));
    // Nothing left to name, so naming it with the failure phrase would only
    // duplicate the text node below.
    expect(queryByRole('img')).toBeNull();
    expect(getByText('Image failed to load')).not.toBeNull();
  });

  it('renders a custom fallback instead of the default placeholder on error', () => {
    const { container, getByText, queryByText } = render(
      <Image src={SRC} alt="A photo" fallback={<span>custom oops</span>} />,
    );
    fireEvent.error(getImg(container));
    expect(getByText('custom oops')).not.toBeNull();
    expect(queryByText('Image failed to load')).toBeNull();
  });

  it('retry returns to loading and re-fetches (img remounts, then loads)', () => {
    const { container, getByRole } = render(<Image src={SRC} alt="A photo" />);
    fireEvent.error(getImg(container));
    fireEvent.click(getByRole('button', { name: 'Retry' }));
    expect(container.querySelector('[data-state="loading"]')).not.toBeNull();
    fireEvent.load(getImg(container));
    expect(container.querySelector('[data-state="loaded"]')).not.toBeNull();
  });

  it('resets to loading when src changes after an error', () => {
    const { container, rerender } = render(<Image src={SRC} alt="A photo" />);
    fireEvent.error(getImg(container));
    expect(container.querySelector('[data-state="error"]')).not.toBeNull();
    rerender(<Image src="https://example.com/other.jpg" alt="A photo" />);
    expect(container.querySelector('[data-state="loading"]')).not.toBeNull();
  });

  it('applies objectFit via the --image-object-fit custom property (default cover)', () => {
    const { container, rerender } = render(<Image src={SRC} alt="" />);
    const wrapper = container.querySelector('span') as HTMLElement;
    expect(wrapper.style.getPropertyValue('--image-object-fit')).toBe('cover');
    rerender(<Image src={SRC} alt="" objectFit="contain" />);
    expect(wrapper.style.getPropertyValue('--image-object-fit')).toBe('contain');
  });

  it('applies the radius class (default md; none gives square corners)', () => {
    const { container, rerender } = render(<Image src={SRC} alt="" />);
    const wrapper = container.querySelector('span') as HTMLElement;
    expect(wrapper.className).toMatch(/radiusMd/);
    rerender(<Image src={SRC} alt="" radius="none" />);
    expect(wrapper.className).toMatch(/radiusNone/);
  });

  it('applies aspect-ratio from a number or a CSS string', () => {
    const { container, rerender } = render(<Image src={SRC} alt="" aspectRatio={1.5} />);
    const wrapper = container.querySelector('span') as HTMLElement;
    // JSDOM normalises "1.5" → "1.5 / 1"; either represents the same ratio.
    expect(wrapper.style.aspectRatio).toMatch(/^1\.5/);
    rerender(<Image src={SRC} alt="" aspectRatio="16 / 9" />);
    expect(wrapper.style.aspectRatio).toBe('16 / 9');
  });

  it('defaults loading to lazy and allows override', () => {
    const { container, rerender } = render(<Image src={SRC} alt="" />);
    expect(getImg(container).getAttribute('loading')).toBe('lazy');
    rerender(<Image src={SRC} alt="" loading="eager" />);
    expect(getImg(container).getAttribute('loading')).toBe('eager');
  });

  it('forwards ref to the <img>', () => {
    const ref = createRef<HTMLImageElement>();
    const { container } = render(<Image src={SRC} alt="" ref={ref} />);
    expect(ref.current).toBe(getImg(container));
  });

  it('merges className onto the wrapper and spreads other attrs onto the img', () => {
    const { container } = render(
      <Image src={SRC} alt="" className="custom" data-testid="pic" sizes="50vw" />,
    );
    const wrapper = container.querySelector('span') as HTMLElement;
    expect(wrapper.className).toMatch(/custom/);
    const img = getImg(container);
    expect(img.getAttribute('data-testid')).toBe('pic');
    expect(img.getAttribute('sizes')).toBe('50vw');
  });

  it('applies a fixed-square size class only when size is set (default has none)', () => {
    const { container, rerender } = render(<Image src={SRC} alt="" />);
    const wrapper = container.querySelector('span') as HTMLElement;
    expect(wrapper.className).not.toMatch(/size(Xs|Sm|Md|Lg)/);
    rerender(<Image src={SRC} alt="" size="lg" />);
    expect(wrapper.className).toMatch(/sizeLg/);
  });

  it('maps each size value to its class', () => {
    const { container, rerender } = render(<Image src={SRC} alt="" size="xs" />);
    const wrapper = container.querySelector('span') as HTMLElement;
    expect(wrapper.className).toMatch(/sizeXs/);
    rerender(<Image src={SRC} alt="" size="sm" />);
    expect(wrapper.className).toMatch(/sizeSm/);
    rerender(<Image src={SRC} alt="" size="md" />);
    expect(wrapper.className).toMatch(/sizeMd/);
    rerender(<Image src={SRC} alt="" size="lg" />);
    expect(wrapper.className).toMatch(/sizeLg/);
  });

  it('ignores aspectRatio when size is set (the fixed square wins)', () => {
    const { container } = render(<Image src={SRC} alt="" size="lg" aspectRatio="16 / 9" />);
    const wrapper = container.querySelector('span') as HTMLElement;
    expect(wrapper.style.aspectRatio).toBe('');
    expect(wrapper.className).toMatch(/sizeLg/);
  });

  it('renders a decorative image with an empty alt without error', () => {
    const { container } = render(<Image src={SRC} alt="" />);
    const img = getImg(container);
    expect(img.getAttribute('alt')).toBe('');
    expect(container.querySelector('[data-state="loading"]')).not.toBeNull();
  });

  it('is not interactive by default (no trigger button in the loaded state)', () => {
    const { container } = render(<Image src={SRC} alt="A photo" />);
    fireEvent.load(getImg(container));
    expect(container.querySelector('button')).toBeNull();
  });

  it('interactive renders the img inside a trigger <button>', () => {
    const { container } = render(<Image src={SRC} alt="A photo" interactive />);
    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    expect(button!.querySelector('img')).not.toBeNull();
  });

  it('onClick implies interactive and fires on click', async () => {
    const onClick = vi.fn();
    const { container } = render(<Image src={SRC} alt="A photo" onClick={onClick} />);
    const button = container.querySelector('button') as HTMLButtonElement;
    expect(button).not.toBeNull();
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('the trigger fires onClick on keyboard activation (Enter)', async () => {
    const onClick = vi.fn();
    const { container } = render(<Image src={SRC} alt="A photo" onClick={onClick} />);
    const button = container.querySelector('button') as HTMLButtonElement;
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('uses ariaLabel for the trigger name, falling back to alt', () => {
    const withLabel = render(
      <Image src={SRC} alt="report.png" interactive ariaLabel="Preview report.png" />,
    );
    expect(withLabel.getByRole('button', { name: 'Preview report.png' })).not.toBeNull();

    const fallback = render(<Image src={SRC} alt="report.png" interactive />);
    expect(fallback.getByRole('button', { name: 'report.png' })).not.toBeNull();
  });

  it('disables the trigger in the error state and never nests the retry button inside it', () => {
    const { container, getByRole } = render(<Image src={SRC} alt="A photo" onClick={() => {}} />);
    fireEvent.error(getImg(container));
    const trigger = container.querySelector('button') as HTMLButtonElement; // FIRST button is the trigger
    expect(trigger.disabled).toBe(true);
    const retry = getByRole('button', { name: 'Retry' });
    expect(trigger.contains(retry)).toBe(false); // retry is a sibling, not nested
  });

  it('keeps the .retry class on the Retry button (its inset focus ring hangs off it)', () => {
    // `.error .retry:focus-visible` in Image.module.scss draws the ring INSET,
    // because the wrapper's `overflow: hidden` clips the outset one's whole
    // bottom band in a small square box (#524). Drop this className and the
    // rule stops matching and the clip returns — silently, since jsdom paints
    // nothing. The browser gate (tests/focus-ring-geometry.spec.ts) is what
    // measures the ring; this only pins the hook it hangs off, so a break
    // names the cause instead of a hashed Button class on an unrelated route.
    const { container, getByRole } = render(<Image src={SRC} alt="A photo" />);
    fireEvent.error(getImg(container));
    expect(getByRole('button', { name: 'Retry' }).className).toMatch(/retry/);
  });

  it('forwards ref to the <img> even when interactive', () => {
    const ref = createRef<HTMLImageElement>();
    const { container } = render(<Image src={SRC} alt="A photo" interactive ref={ref} />);
    expect(ref.current).toBe(getImg(container));
  });

  it('does not remount the <img> across state transitions when interactive (no refetch)', () => {
    const { container } = render(<Image src={SRC} alt="A photo" interactive />);
    const imgNode = getImg(container);
    fireEvent.load(getImg(container));
    expect(getImg(container)).toBe(imgNode); // loaded: same DOM node
    fireEvent.error(getImg(container));
    expect(getImg(container)).toBe(imgNode); // error: still the same node
  });
});

describe('the error tile does not prune its own contents (#496)', () => {
  it('keeps role="img" on a leaf, so the Retry control stays exposed', () => {
    // `role="img"` is Children Presentational — as a container it removed its
    // descendants from the accessibility tree, so the Retry button was a
    // focusable control with no role and no name. Testing Library computes
    // roles from the DOM and does not model that pruning, which is why the
    // existing Retry assertion passed throughout; this asserts the STRUCTURE
    // instead, which is the part a browser acts on.
    const { container } = render(<Image src={SRC} alt="A photo" />);
    fireEvent.error(getImg(container));

    const named = container.querySelector('[role="img"]');
    expect(named, 'the error tile names itself').not.toBeNull();
    expect(
      named!.querySelector('button'),
      'nothing interactive may sit inside the role="img" subtree',
    ).toBeNull();
  });

  it('still names the failure, and still offers Retry', () => {
    const { container, getByRole, getByText } = render(<Image src={SRC} alt="A photo" />);
    fireEvent.error(getImg(container));
    expect(getByRole('img', { name: 'A photo' })).not.toBeNull();
    expect(getByText('Image failed to load')).not.toBeNull();
    expect(getByRole('button', { name: 'Retry' })).not.toBeNull();
  });
});

describe('Image — empty ariaLabel', () => {
  // `ariaLabel={row.title ?? ''}` is ordinary consumer code. An empty
  // aria-label contributes no name, so the computation drops through to the
  // button's content — and once the image has failed that content is an
  // aria-hidden <img alt="">, leaving the trigger with no name at all. `||`
  // is what keeps `alt` as the fallback; `??` would not.
  it('interactive image falls back to alt when ariaLabel is an empty string', () => {
    const { container } = render(<Image src={SRC} alt="A photo" onClick={() => {}} ariaLabel="" />);
    expect(screen.getByRole('button', { name: 'A photo' })).toBeInTheDocument();

    fireEvent.error(getImg(container));
    expect(screen.getByRole('button', { name: 'A photo' })).toBeInTheDocument();
  });
});

describe('Image — fixed-size error tile is icon-only (#538)', () => {
  // The defect: the error column is ~100px tall, the sized wrapper is 20-40px
  // and `overflow: hidden`, so the Retry button was painted nowhere and stayed
  // in the tab order. jsdom paints nothing, so geometry is not assertable here
  // — the assertable invariant is that the control does not EXIST.
  // Tabbability, not the `disabled` ATTRIBUTE: an element moved to
  // `aria-disabled` is still in the tab order, and filtering on `disabled`
  // would pass vacuously the day the trigger changes hands. `tabIndex < 0` is
  // out of the tab order; `focus()` then decides the rest, so a control that
  // only LOOKS disabled is still counted.
  function focusables(container: HTMLElement) {
    return Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]',
      ),
    ).filter((el) => {
      if (el.tabIndex < 0) return false;
      el.focus();
      return document.activeElement === el;
    });
  }

  it.each(['xs', 'sm', 'md', 'lg'] as const)(
    'renders nothing focusable inside a failed size="%s" tile',
    (size) => {
      const { container } = render(<Image src={SRC} alt="A photo" size={size} />);
      fireEvent.error(getImg(container));
      expect(container.querySelector('[data-state="error"]')).not.toBeNull();
      expect(focusables(container)).toHaveLength(0);
    },
  );

  it('stays free of focusable content when the sized image is also interactive', () => {
    // The trigger still renders, disabled in the error state — so the tile as
    // a whole is unreachable by Tab. `focusables` decides that by focusing,
    // not by reading the attribute.
    const { container } = render(<Image src={SRC} alt="A photo" size="lg" onClick={() => {}} />);
    fireEvent.error(getImg(container));
    expect(focusables(container)).toHaveLength(0);
  });

  it('names the icon with alt + the failure, since no visible text carries it there', () => {
    const { container, getByRole, queryByText } = render(
      <Image src={SRC} alt="A photo" size="lg" />,
    );
    fireEvent.error(getImg(container));
    expect(getByRole('img', { name: 'A photo: Image failed to load' })).not.toBeNull();
    // No text node and no Retry label — the tile renders no text at all, so
    // nothing can duplicate the phrase the name now carries.
    expect(queryByText('Image failed to load')).toBeNull();
    expect(container.textContent).toBe('');
  });

  it('names a decorative sized tile with the failure alone', () => {
    // alt="" goes decorative in the fluid tile because the visible text still
    // announces the failure. Here there is no text, so silence would make the
    // sized branch the one place a broken image is absent from the tree.
    const { container, getByRole } = render(<Image src={SRC} alt="" size="sm" />);
    fireEvent.error(getImg(container));
    expect(getByRole('img', { name: 'Image failed to load' })).not.toBeNull();
  });

  it('hangs the icon off .errorIcon, which is what scales it to the box', () => {
    // `--image-error-icon-size` is set per size class on the wrapper and read
    // by `.errorIcon`; drop the className and lucide's own 24px attribute
    // takes over, overflowing xs and sm again. jsdom applies no CSS, so this
    // pins the hook — the browser gate measures the result.
    const { container } = render(<Image src={SRC} alt="" size="xs" />);
    fireEvent.error(getImg(container));
    expect(container.querySelector('svg')!.getAttribute('class')).toMatch(/errorIcon/);
  });

  it('leaves the fluid tile alone — text and Retry both still render', () => {
    const { container, getByRole, getByText } = render(<Image src={SRC} alt="A photo" />);
    fireEvent.error(getImg(container));
    expect(getByText('Image failed to load')).not.toBeNull();
    expect(getByRole('button', { name: 'Retry' })).not.toBeNull();
    // And its icon keeps the bare `alt` — the phrase must not be said twice.
    expect(getByRole('img', { name: 'A photo' })).not.toBeNull();
    expect(focusables(container)).toHaveLength(1);
  });

  it('a custom fallback still wins at a fixed size, inside the positioned slot', () => {
    // The slot is what keeps a fallback from flowing after the `height: 100%`
    // trigger and landing wholly outside the wrapper's clip — #538 reached
    // through the very prop its docs point at. jsdom applies no CSS, so this
    // pins the hook; the browser measurement is in the report.
    const { container, getByRole } = render(
      <Image
        src={SRC}
        alt="A photo"
        size="lg"
        onClick={() => {}}
        fallback={<button>Report</button>}
      />,
    );
    fireEvent.error(getImg(container));
    const report = getByRole('button', { name: 'Report' });
    expect(container.querySelector('[role="img"]')).toBeNull();
    const slot = report.parentElement as HTMLElement;
    expect(slot.className).toMatch(/fallback/);
    // A sibling of the trigger, not a descendant of it — a control nested in a
    // disabled button is unreachable, which is the opposite failure.
    expect((container.querySelector('button') as HTMLElement).contains(report)).toBe(false);
  });

  it('slots an aspectRatio fallback too — that box is the wrapper’s own', () => {
    // Same defect as the sized case: with `onClick`, an in-flow fallback flows
    // after the full-height trigger and starts exactly on the wrapper's bottom
    // edge. The aspect-ratio box does not depend on this child, so slotting it
    // costs nothing.
    const { container, getByRole } = render(
      <Image src={SRC} alt="A photo" aspectRatio="16 / 9" fallback={<button>Report</button>} />,
    );
    fireEvent.error(getImg(container));
    const slot = getByRole('button', { name: 'Report' }).parentElement as HTMLElement;
    expect(slot.className).toMatch(/fallback/);
  });

  it('leaves a boxless fallback in flow, where it still gives the wrapper its height', () => {
    // Deliberately NOT slotted: with neither `size` nor `aspectRatio` the
    // wrapper takes its height from this child (measured: a 20px fallback
    // gives a 20px wrapper), so absolutely positioning it would collapse the
    // box to zero — a defect tracked separately, not one to widen here.
    const { container, getByRole } = render(
      <Image src={SRC} alt="A photo" fallback={<button>Report</button>} />,
    );
    fireEvent.error(getImg(container));
    const slot = getByRole('button', { name: 'Report' }).parentElement as HTMLElement;
    expect(slot.className).not.toMatch(/fallback/);
  });
});

describe('Image — a fluid tile with no room (#542)', () => {
  // jsdom has no layout and no container queries, so the icon-only degrade is
  // checked in a real browser (the playground's "Error in a tight box" demo).
  // The geometry (Retry inside the wrapper, or absent) is asserted in a real
  // browser by tests/image-error-tile.spec.ts. What IS assertable here: which
  // wrapper gets the error-state spacer.
  it('spaces only an unreserved wrapper — no size, no aspectRatio, no fallback', () => {
    const { container, rerender } = render(<Image src={SRC} alt="x" />);
    const wrapper = container.querySelector('span') as HTMLElement;
    expect(wrapper.className).toMatch(/unreserved/);
    rerender(<Image src={SRC} alt="x" aspectRatio="16 / 9" />);
    expect(wrapper.className).not.toMatch(/unreserved/);
    rerender(<Image src={SRC} alt="x" size="lg" />);
    expect(wrapper.className).not.toMatch(/unreserved/);
    // A boxless fallback is in flow and sizes the wrapper itself.
    rerender(<Image src={SRC} alt="x" fallback={<span>nope</span>} />);
    expect(wrapper.className).not.toMatch(/unreserved/);
  });
});
