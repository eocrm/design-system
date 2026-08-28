import { createRef } from 'react';
import { fireEvent, render } from '@testing-library/react';
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
    expect(container.textContent!.match(/Image failed to load/g)).toHaveLength(1);
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
