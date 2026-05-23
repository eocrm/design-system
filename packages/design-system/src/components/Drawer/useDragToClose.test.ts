import { renderHook } from '@testing-library/react';
import { useRef, type RefObject } from 'react';
import { useDragToClose, type DrawerSide } from './useDragToClose';

function makeDrawer(side: DrawerSide, size = 400) {
  // header is the drag origin; content is the element whose transform updates.
  // overlay is content's parentElement — opacity updates here.
  const overlay = document.createElement('div');
  overlay.setAttribute('data-test', 'overlay');
  const content = document.createElement('div');
  content.setAttribute('data-test', 'content');
  if (side === 'left' || side === 'right') {
    Object.defineProperty(content, 'offsetWidth', { configurable: true, value: size });
    Object.defineProperty(content, 'offsetHeight', { configurable: true, value: 800 });
  } else {
    Object.defineProperty(content, 'offsetWidth', { configurable: true, value: 1024 });
    Object.defineProperty(content, 'offsetHeight', { configurable: true, value: size });
  }
  const header = document.createElement('div');
  header.setAttribute('data-test', 'header');
  content.appendChild(header);
  overlay.appendChild(content);
  document.body.appendChild(overlay);
  return { overlay, content, header };
}

function dispatchTouch(
  target: HTMLElement,
  type: 'touchstart' | 'touchmove' | 'touchend',
  x: number,
  y: number,
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const touchList = [{ clientX: x, clientY: y, identifier: 0, target }];
  Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : touchList });
  Object.defineProperty(event, 'changedTouches', { value: touchList });
  target.dispatchEvent(event);
}

function dragHook(
  headerEl: HTMLElement,
  contentEl: HTMLElement,
  side: DrawerSide,
  options: { active?: boolean; onDismiss?: () => void } = {},
) {
  return renderHook(() => {
    const headerRef = useRef<HTMLElement | null>(headerEl);
    const contentRef = useRef<HTMLElement | null>(contentEl);
    useDragToClose(headerRef as RefObject<HTMLElement | null>, {
      side,
      active: options.active ?? true,
      onDismiss: options.onDismiss ?? (() => {}),
      contentRef: contentRef as RefObject<HTMLElement | null>,
    });
  });
}

describe('useDragToClose', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('right side: drag past 40% threshold + release → onDismiss called', () => {
    const { header, content } = makeDrawer('right', 400);
    const onDismiss = vi.fn();
    dragHook(header, content, 'right', { onDismiss });

    dispatchTouch(header, 'touchstart', 100, 100);
    dispatchTouch(header, 'touchmove', 300, 100); // +200px = 50% of 400
    dispatchTouch(header, 'touchend', 300, 100);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('right side: drag below threshold + slow release → no dismiss + snap-back', () => {
    const { header, content } = makeDrawer('right', 400);
    const onDismiss = vi.fn();
    dragHook(header, content, 'right', { onDismiss });

    // touchstart needs an explicit start time so velocity = 100px / large elapsed time → small
    dispatchTouch(header, 'touchstart', 100, 100);
    // jsdom's performance.now() advances ~0 between sync calls; we patch performance.now to give a large elapsed time
    const origNow = performance.now.bind(performance);
    let nowOffset = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => origNow() + (nowOffset += 0));
    dispatchTouch(header, 'touchmove', 200, 100); // +100px = 25% of 400
    nowOffset = 5000; // 5s elapsed
    dispatchTouch(header, 'touchend', 200, 100);
    (performance.now as unknown as { mockRestore: () => void }).mockRestore();

    expect(onDismiss).not.toHaveBeenCalled();
    // Snap-back: transform / custom prop removed
    expect(content.style.getPropertyValue('--drag-translate-x')).toBe('');
  });

  it('right side: velocity-based dismiss (small distance + fast flick) → onDismiss called', () => {
    const { header, content } = makeDrawer('right', 400);
    const onDismiss = vi.fn();
    dragHook(header, content, 'right', { onDismiss });

    // Patch performance.now so we control elapsed time
    let virtualNow = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => virtualNow);
    dispatchTouch(header, 'touchstart', 100, 100);
    virtualNow = 1010; // 10ms elapsed
    dispatchTouch(header, 'touchmove', 150, 100); // +50px in 10ms = 5 px/ms (>0.5)
    dispatchTouch(header, 'touchend', 150, 100);
    (performance.now as unknown as { mockRestore: () => void }).mockRestore();

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('left side: drag past threshold to the LEFT → onDismiss called', () => {
    const { header, content } = makeDrawer('left', 400);
    const onDismiss = vi.fn();
    dragHook(header, content, 'left', { onDismiss });

    dispatchTouch(header, 'touchstart', 300, 100);
    dispatchTouch(header, 'touchmove', 100, 100); // -200px = 50%
    dispatchTouch(header, 'touchend', 100, 100);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('top side: drag UP past threshold → onDismiss called', () => {
    const { header, content } = makeDrawer('top', 400);
    const onDismiss = vi.fn();
    dragHook(header, content, 'top', { onDismiss });

    dispatchTouch(header, 'touchstart', 100, 300);
    dispatchTouch(header, 'touchmove', 100, 100); // -200px = 50%
    dispatchTouch(header, 'touchend', 100, 100);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('bottom side: drag DOWN past threshold → onDismiss called', () => {
    const { header, content } = makeDrawer('bottom', 400);
    const onDismiss = vi.fn();
    dragHook(header, content, 'bottom', { onDismiss });

    dispatchTouch(header, 'touchstart', 100, 100);
    dispatchTouch(header, 'touchmove', 100, 300); // +200px = 50%
    dispatchTouch(header, 'touchend', 100, 300);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('drag in non-dismiss direction does NOT dismiss', () => {
    const { header, content } = makeDrawer('right', 400);
    const onDismiss = vi.fn();
    dragHook(header, content, 'right', { onDismiss });

    // For right side, dragging LEFT is the wrong direction
    dispatchTouch(header, 'touchstart', 300, 100);
    dispatchTouch(header, 'touchmove', 100, 100); // -200px in wrong direction
    dispatchTouch(header, 'touchend', 100, 100);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('active=false → no listeners attached; touch on header is a no-op', () => {
    const { header, content } = makeDrawer('right', 400);
    const onDismiss = vi.fn();
    dragHook(header, content, 'right', { active: false, onDismiss });

    dispatchTouch(header, 'touchstart', 100, 100);
    dispatchTouch(header, 'touchmove', 400, 100);
    dispatchTouch(header, 'touchend', 400, 100);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(content.style.getPropertyValue('--drag-translate-x')).toBe('');
  });

  it('touchmove updates --drag-translate-x on content', () => {
    const { header, content } = makeDrawer('right', 400);
    dragHook(header, content, 'right');

    dispatchTouch(header, 'touchstart', 100, 100);
    dispatchTouch(header, 'touchmove', 250, 100);
    expect(content.style.getPropertyValue('--drag-translate-x')).toBe('150px');
  });

  it('touchmove updates --drag-opacity on overlay parent', () => {
    const { header, content, overlay } = makeDrawer('right', 400);
    dragHook(header, content, 'right');

    dispatchTouch(header, 'touchstart', 100, 100);
    dispatchTouch(header, 'touchmove', 300, 100); // +200px = 50% progress
    // opacity = 1 - 0.5 = 0.5
    expect(overlay.style.getPropertyValue('--drag-opacity')).toBe('0.5');
  });
});
