import { createRef } from 'react';
import { fireEvent, render } from '@testing-library/react';
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
    expect(getByRole('img', { name: 'A photo' })).not.toBeNull();
    expect(getByText('Image failed to load')).not.toBeNull();
    expect(getByRole('button', { name: 'Retry' })).not.toBeNull();
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
});
