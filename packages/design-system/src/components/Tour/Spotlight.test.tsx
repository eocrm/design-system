import { render } from '@testing-library/react';
import { holeFor, Spotlight } from './Spotlight';

function rect(top: number, left: number, width: number, height: number) {
  return {
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
  } as DOMRect;
}

describe('holeFor', () => {
  it('pads the target rect on every side', () => {
    expect(holeFor(rect(100, 50, 80, 20), 8, 1000, 800)).toEqual({
      top: 92,
      left: 42,
      width: 96,
      height: 36,
    });
  });
  it('collapses to a zero-size hole at the viewport center without a target', () => {
    expect(holeFor(null, 8, 1000, 800)).toEqual({ top: 400, left: 500, width: 0, height: 0 });
  });
});

describe('Spotlight', () => {
  function target() {
    const el = document.createElement('button');
    document.body.appendChild(el);
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(rect(100, 50, 80, 20));
    return el;
  }
  afterEach(() => vi.restoreAllMocks());

  it('sizes the cutout to the padded target rect', () => {
    const { container } = render(
      <Spotlight target={target()} padding={8} interactive={false} state="open" glide={false} />,
    );
    const spot = container.querySelector<HTMLElement>('[data-tour-spotlight]')!;
    expect(spot.style.top).toBe('92px');
    expect(spot.style.left).toBe('42px');
    expect(spot.style.width).toBe('96px');
    expect(spot.style.height).toBe('36px');
    expect(spot).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders four blockers framing the cutout', () => {
    const { container } = render(
      <Spotlight target={target()} padding={8} interactive={false} state="open" glide={false} />,
    );
    const blockers = container.querySelectorAll<HTMLElement>('[data-tour-blocker]');
    expect(blockers).toHaveLength(4);
    expect(blockers[0]!.style.height).toBe('92px'); // above the hole
    expect(blockers[1]!.style.top).toBe('128px'); // below: 92 + 36
  });

  it('marks interactive steps so the cutout lets clicks through', () => {
    const { container, rerender } = render(
      <Spotlight target={target()} padding={8} interactive={false} state="open" glide={false} />,
    );
    const spot = () => container.querySelector('[data-tour-spotlight]')!;
    expect(spot()).not.toHaveAttribute('data-interactive');
    rerender(<Spotlight target={target()} padding={8} interactive state="open" glide={false} />);
    expect(spot()).toHaveAttribute('data-interactive');
  });

  it('propagates state and glide as data attributes', () => {
    const { container } = render(
      <Spotlight target={null} padding={8} interactive={false} state="closed" glide />,
    );
    const spot = container.querySelector('[data-tour-spotlight]')!;
    expect(spot).toHaveAttribute('data-state', 'closed');
    expect(spot).toHaveAttribute('data-glide');
    container
      .querySelectorAll('[data-tour-blocker]')
      .forEach((b) => expect(b).toHaveAttribute('data-state', 'closed'));
  });
});
