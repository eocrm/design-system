import { render, screen, fireEvent, act } from '@testing-library/react';
import { createRef } from 'react';
import {
  Slider,
  type SliderOrientation,
  type SliderSize,
  type SliderTone,
} from './Slider';

// jsdom doesn't implement setPointerCapture; stub it on HTMLElement so the
// component's try/catch fast-path is exercised (and we still get pointer
// events).
function ensurePointerCaptureShim() {
  if (typeof (HTMLElement.prototype as unknown as { setPointerCapture?: unknown }).setPointerCapture !== 'function') {
    (HTMLElement.prototype as unknown as { setPointerCapture: (id: number) => void }).setPointerCapture = () => {};
  }
  if (typeof (HTMLElement.prototype as unknown as { releasePointerCapture?: unknown }).releasePointerCapture !== 'function') {
    (HTMLElement.prototype as unknown as { releasePointerCapture: (id: number) => void }).releasePointerCapture = () => {};
  }
}

ensurePointerCaptureShim();

// Helper — find thumb(s) by their role.
function getThumbs(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[role="slider"]'));
}

// Helper — mock the track's getBoundingClientRect so pointer-math has a known
// canvas. Default: 100px-wide / 6px-tall horizontal track at (0, 0).
function mockTrackRect(container: HTMLElement, opts: { width?: number; height?: number; left?: number; top?: number } = {}) {
  const { width = 100, height = 6, left = 0, top = 0 } = opts;
  const track = container.querySelector<HTMLElement>('[class*="track"]')!;
  track.getBoundingClientRect = () =>
    ({
      width,
      height,
      left,
      top,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
  return track;
}

describe('Slider', () => {
  describe('rendering / structure', () => {
    it('renders with role="slider" for single value', () => {
      const { container } = render(<Slider value={50} onChange={() => {}} />);
      const thumbs = getThumbs(container);
      expect(thumbs).toHaveLength(1);
      expect(thumbs[0]).toHaveAttribute('role', 'slider');
    });

    it('renders TWO role="slider" elements for range value', () => {
      const { container } = render(<Slider value={[20, 80]} onChange={() => {}} />);
      const thumbs = getThumbs(container);
      expect(thumbs).toHaveLength(2);
    });

    it('default tone applies the tone-default class to the fill', () => {
      const { container } = render(<Slider value={50} onChange={() => {}} />);
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toMatch(/tone-default/);
    });

    it.each<[SliderTone, string]>([
      ['default', 'tone-default'],
      ['success', 'tone-success'],
      ['warning', 'tone-warning'],
      ['danger', 'tone-danger'],
    ])('tone="%s" applies class %s', (toneValue, expectedClass) => {
      const { container } = render(<Slider value={50} tone={toneValue} onChange={() => {}} />);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(expectedClass));
    });

    it.each<[SliderSize, string]>([
      ['sm', 'size-sm'],
      ['md', 'size-md'],
      ['lg', 'size-lg'],
    ])('size="%s" applies class %s', (sizeValue, expectedClass) => {
      const { container } = render(<Slider value={50} size={sizeValue} onChange={() => {}} />);
      expect((container.firstChild as HTMLElement).className).toMatch(new RegExp(expectedClass));
    });

    it('default orientation is horizontal', () => {
      const { container } = render(<Slider value={50} onChange={() => {}} />);
      expect((container.firstChild as HTMLElement).className).toMatch(/orientation-horizontal/);
    });

    it.each<SliderOrientation>(['horizontal', 'vertical'])(
      'orientation="%s" applies the matching class',
      (orientationValue) => {
        const { container } = render(
          <Slider value={50} orientation={orientationValue} onChange={() => {}} />,
        );
        expect((container.firstChild as HTMLElement).className).toMatch(
          new RegExp(`orientation-${orientationValue}`),
        );
      },
    );

    it('className from props merges with the base class', () => {
      const { container } = render(
        <Slider value={50} className="custom" onChange={() => {}} />,
      );
      const cls = (container.firstChild as HTMLElement).className;
      expect(cls).toMatch(/custom/);
      expect(cls).toMatch(/root_/);
    });

    it('forwards ref to the outermost <div>', () => {
      const ref = createRef<HTMLDivElement>();
      render(<Slider ref={ref} value={50} onChange={() => {}} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });

    it('spreads native HTML attributes (id, data-testid, aria-label)', () => {
      render(
        <Slider value={50} id="vol" data-testid="s" aria-label="Volume" onChange={() => {}} />,
      );
      const el = screen.getByTestId('s');
      expect(el).toHaveAttribute('id', 'vol');
      expect(el).toHaveAttribute('aria-label', 'Volume');
    });
  });

  describe('value / fill positioning', () => {
    it('single value={50} (min=0 max=100): fill width is 50%, thumb left is 50%', () => {
      const { container } = render(<Slider value={50} onChange={() => {}} />);
      const fill = container.querySelector<HTMLElement>('[class*="fill"]')!;
      expect(fill.style.width).toBe('50%');
      const thumb = getThumbs(container)[0];
      expect(thumb.style.left).toBe('50%');
    });

    it('range value=[20, 80]: fill spans 20%–80%, thumbs at 20% and 80%', () => {
      const { container } = render(<Slider value={[20, 80]} onChange={() => {}} />);
      const fill = container.querySelector<HTMLElement>('[class*="fill"]')!;
      expect(fill.style.left).toBe('20%');
      expect(fill.style.width).toBe('60%');
      const thumbs = getThumbs(container);
      expect(thumbs[0].style.left).toBe('20%');
      expect(thumbs[1].style.left).toBe('80%');
    });

    it('fractional step (min=0 max=1 step=0.1 value=0.3): thumb positioned at 30%', () => {
      const { container } = render(
        <Slider value={0.3} min={0} max={1} step={0.1} onChange={() => {}} />,
      );
      const thumb = getThumbs(container)[0];
      // Floating-point: 0.3 / 1.0 * 100 may be 30 or 29.999999... — accept both.
      expect(thumb.style.left === '30%' || thumb.style.left === '29.999999999999996%').toBe(true);
    });
  });

  describe('ARIA', () => {
    it('single mode: thumb has aria-valuemin/max/now/orientation', () => {
      const { container } = render(<Slider value={42} min={0} max={100} onChange={() => {}} />);
      const thumb = getThumbs(container)[0];
      expect(thumb).toHaveAttribute('aria-valuemin', '0');
      expect(thumb).toHaveAttribute('aria-valuemax', '100');
      expect(thumb).toHaveAttribute('aria-valuenow', '42');
      expect(thumb).toHaveAttribute('aria-orientation', 'horizontal');
    });

    it('range mode: both thumbs have their own aria-valuenow', () => {
      const { container } = render(<Slider value={[10, 90]} onChange={() => {}} />);
      const thumbs = getThumbs(container);
      expect(thumbs[0]).toHaveAttribute('aria-valuenow', '10');
      expect(thumbs[1]).toHaveAttribute('aria-valuenow', '90');
    });

    it('disabled: aria-disabled="true" on thumbs and tabIndex=-1', () => {
      const { container } = render(<Slider value={50} disabled onChange={() => {}} />);
      const thumb = getThumbs(container)[0];
      expect(thumb).toHaveAttribute('aria-disabled', 'true');
      expect(thumb).toHaveAttribute('tabIndex', '-1');
    });

    it('orientation=vertical sets aria-orientation=vertical', () => {
      const { container } = render(
        <Slider value={50} orientation="vertical" onChange={() => {}} />,
      );
      const thumb = getThumbs(container)[0];
      expect(thumb).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('label as function sets aria-valuetext to the formatted output', () => {
      const { container } = render(
        <Slider value={42} label={(v) => `${v}%`} onChange={() => {}} />,
      );
      const thumb = getThumbs(container)[0];
      expect(thumb).toHaveAttribute('aria-valuetext', '42%');
    });

    it('label=true: aria-valuetext is NOT set (SR uses raw aria-valuenow)', () => {
      const { container } = render(<Slider value={42} label onChange={() => {}} />);
      const thumb = getThumbs(container)[0];
      expect(thumb).not.toHaveAttribute('aria-valuetext');
    });
  });

  describe('keyboard', () => {
    it('ArrowRight increments by step and fires onChange', () => {
      const onChange = vi.fn();
      const { container } = render(<Slider value={50} step={5} onChange={onChange} />);
      const thumb = getThumbs(container)[0];
      thumb.focus();
      fireEvent.keyDown(thumb, { key: 'ArrowRight' });
      expect(onChange).toHaveBeenCalledWith(55);
    });

    it('ArrowLeft decrements by step', () => {
      const onChange = vi.fn();
      const { container } = render(<Slider value={50} step={5} onChange={onChange} />);
      fireEvent.keyDown(getThumbs(container)[0], { key: 'ArrowLeft' });
      expect(onChange).toHaveBeenCalledWith(45);
    });

    it('ArrowUp increments (vertical orientation)', () => {
      const onChange = vi.fn();
      const { container } = render(
        <Slider value={50} step={5} orientation="vertical" onChange={onChange} />,
      );
      fireEvent.keyDown(getThumbs(container)[0], { key: 'ArrowUp' });
      expect(onChange).toHaveBeenCalledWith(55);
    });

    it('Home sets value to min', () => {
      const onChange = vi.fn();
      const { container } = render(
        <Slider value={50} min={0} max={100} onChange={onChange} />,
      );
      fireEvent.keyDown(getThumbs(container)[0], { key: 'Home' });
      expect(onChange).toHaveBeenCalledWith(0);
    });

    it('End sets value to max', () => {
      const onChange = vi.fn();
      const { container } = render(
        <Slider value={50} min={0} max={100} onChange={onChange} />,
      );
      fireEvent.keyDown(getThumbs(container)[0], { key: 'End' });
      expect(onChange).toHaveBeenCalledWith(100);
    });

    it('PageUp adds 10×step', () => {
      const onChange = vi.fn();
      const { container } = render(<Slider value={50} step={2} onChange={onChange} />);
      fireEvent.keyDown(getThumbs(container)[0], { key: 'PageUp' });
      expect(onChange).toHaveBeenCalledWith(70);
    });

    it('PageDown subtracts 10×step', () => {
      const onChange = vi.fn();
      const { container } = render(<Slider value={50} step={2} onChange={onChange} />);
      fireEvent.keyDown(getThumbs(container)[0], { key: 'PageDown' });
      expect(onChange).toHaveBeenCalledWith(30);
    });

    it('range mode: left thumb cannot cross right thumb (keyboard clamp)', () => {
      const onChange = vi.fn();
      const { container } = render(
        <Slider value={[40, 50]} step={20} onChange={onChange} />,
      );
      // ArrowRight on left thumb tries to go to 60, but it clamps to 50 (right thumb).
      fireEvent.keyDown(getThumbs(container)[0], { key: 'ArrowRight' });
      expect(onChange).toHaveBeenCalledWith([50, 50]);
    });

    it('blur fires onChangeEnd ONLY when value changed during the focus session', () => {
      const onChangeEnd = vi.fn();
      const { container } = render(
        <Slider value={42} step={5} onChange={() => {}} onChangeEnd={onChangeEnd} />,
      );
      const thumb = getThumbs(container)[0];
      // Tab in, no nav, Tab out — no onChangeEnd fire (no value change).
      thumb.focus();
      thumb.blur();
      expect(onChangeEnd).not.toHaveBeenCalled();
      // Tab in, ArrowRight, Tab out — onChangeEnd fires.
      thumb.focus();
      fireEvent.keyDown(thumb, { key: 'ArrowRight' });
      thumb.blur();
      expect(onChangeEnd).toHaveBeenCalledTimes(1);
    });

    it('disabled: keyboard does nothing', () => {
      const onChange = vi.fn();
      const { container } = render(<Slider value={50} disabled onChange={onChange} />);
      fireEvent.keyDown(getThumbs(container)[0], { key: 'ArrowRight' });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('pointer / drag', () => {
    it('track click snaps the (single) thumb to click position', () => {
      const onChange = vi.fn();
      const { container } = render(<Slider value={50} onChange={onChange} />);
      const track = mockTrackRect(container, { width: 100, left: 0 });
      // Click at clientX=25 → 25% of the 100px track → value 25.
      fireEvent.pointerDown(track, { clientX: 25, clientY: 3, pointerId: 1 });
      expect(onChange).toHaveBeenCalledWith(25);
    });

    it('thumb pointerdown + pointermove fires onChange per move; pointerup fires onChangeEnd', () => {
      const onChange = vi.fn();
      const onChangeEnd = vi.fn();
      const { container } = render(
        <Slider value={50} onChange={onChange} onChangeEnd={onChangeEnd} />,
      );
      mockTrackRect(container, { width: 100, left: 0 });
      const thumb = getThumbs(container)[0];
      fireEvent.pointerDown(thumb, { clientX: 50, clientY: 3, pointerId: 1 });
      fireEvent.pointerMove(thumb, { clientX: 70, clientY: 3, pointerId: 1 });
      // 70px / 100px = 70% → value 70.
      expect(onChange).toHaveBeenCalledWith(70);
      fireEvent.pointerUp(thumb, { clientX: 70, clientY: 3, pointerId: 1 });
      expect(onChangeEnd).toHaveBeenCalled();
    });

    it('range mode: pointer-dragging thumb 0 past thumb 1 clamps to thumb 1 value', () => {
      const onChange = vi.fn();
      const { container } = render(
        <Slider value={[20, 50]} onChange={onChange} />,
      );
      mockTrackRect(container, { width: 100, left: 0 });
      const thumbs = getThumbs(container);
      fireEvent.pointerDown(thumbs[0], { clientX: 20, clientY: 3, pointerId: 1 });
      fireEvent.pointerMove(thumbs[0], { clientX: 80, clientY: 3, pointerId: 1 });
      // 80 would be the natural snap; clamped to thumb 1's value of 50.
      expect(onChange).toHaveBeenCalledWith([50, 50]);
    });

    it('disabled: pointerdown does nothing', () => {
      const onChange = vi.fn();
      const { container } = render(<Slider value={50} disabled onChange={onChange} />);
      mockTrackRect(container);
      const thumb = getThumbs(container)[0];
      fireEvent.pointerDown(thumb, { clientX: 30, clientY: 3, pointerId: 1 });
      fireEvent.pointerMove(thumb, { clientX: 70, clientY: 3, pointerId: 1 });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('marks + label', () => {
    it('marks={[0, 50, 100]} renders 3 mark elements', () => {
      const { container } = render(<Slider value={50} marks={[0, 50, 100]} onChange={() => {}} />);
      // The mark spans match `[class*="mark"]`. Marks with values within the
      // fill range get an extra `.markFilled` class — they're still in the
      // selector. Count the mark spans (excluding markFilled-only matches):
      const allMarks = container.querySelectorAll('span[class*="mark"]');
      // Filter to spans where className contains `mark` but NOT `markLabel`.
      const markSpans = Array.from(allMarks).filter((el) => !/markLabel/.test(el.className));
      expect(markSpans.length).toBeGreaterThanOrEqual(3);
    });

    it('marks within the fill range get markFilled class', () => {
      const { container } = render(
        <Slider value={75} marks={[25, 75]} onChange={() => {}} />,
      );
      // Both 25 and 75 are <= 75, so both should have markFilled.
      const filled = container.querySelectorAll('[class*="markFilled"]');
      expect(filled.length).toBe(2);
    });

    it('label=true shows the value bubble when the thumb is focused', () => {
      const { container } = render(<Slider value={42} label onChange={() => {}} />);
      const thumb = getThumbs(container)[0];
      // Direct .focus() triggers a React state update (setIsFocused); wrap in
      // act so the render flushes before asserting.
      act(() => { thumb.focus(); });
      const labelEl = container.querySelector('[class*="label"]:not([class*="markLabel"])');
      expect(labelEl).not.toBeNull();
      expect(labelEl).toHaveTextContent('42');
    });

    it('label as function renders the formatted text', () => {
      const { container } = render(
        <Slider value={42} label={(v) => `${v} GB`} onChange={() => {}} />,
      );
      const thumb = getThumbs(container)[0];
      // Same act-flush as above.
      act(() => { thumb.focus(); });
      const labelEl = container.querySelector('[class*="label"]:not([class*="markLabel"])');
      expect(labelEl).toHaveTextContent('42 GB');
    });

    it('label=false (default): no label element rendered even when focused', () => {
      const { container } = render(<Slider value={42} onChange={() => {}} />);
      const thumb = getThumbs(container)[0];
      thumb.focus();
      // No bubble span — only the thumb itself has any "label-like" class.
      const labelEl = container.querySelector(
        '[class*="label"]:not([class*="markLabel"]):not([role="slider"])',
      );
      expect(labelEl).toBeNull();
    });
  });

  describe('hidden form input', () => {
    it('single mode + name="zoom": renders one hidden <input>', () => {
      const { container } = render(<Slider value={50} name="zoom" onChange={() => {}} />);
      const inputs = container.querySelectorAll('input[type="hidden"]');
      expect(inputs).toHaveLength(1);
      expect(inputs[0]).toHaveAttribute('name', 'zoom');
      expect(inputs[0]).toHaveAttribute('value', '50');
    });

    it('range mode + name="price": renders TWO hidden inputs (price-min and price-max)', () => {
      const { container } = render(
        <Slider value={[10, 90]} name="price" onChange={() => {}} />,
      );
      const inputs = container.querySelectorAll<HTMLInputElement>('input[type="hidden"]');
      expect(inputs).toHaveLength(2);
      expect(inputs[0]).toHaveAttribute('name', 'price-min');
      expect(inputs[0]).toHaveAttribute('value', '10');
      expect(inputs[1]).toHaveAttribute('name', 'price-max');
      expect(inputs[1]).toHaveAttribute('value', '90');
    });

    it('disabled: hidden inputs are NOT rendered (form does not submit a stale value)', () => {
      const { container } = render(
        <Slider value={50} name="vol" disabled onChange={() => {}} />,
      );
      const inputs = container.querySelectorAll('input[type="hidden"]');
      expect(inputs).toHaveLength(0);
    });
  });
});
