import { render, screen, fireEvent, act } from '@testing-library/react';
import { createRef } from 'react';
import { ImageCrop, extractCropBlob, type CropArea } from './index';

// jsdom doesn't implement setPointerCapture; stub it.
function ensurePointerCaptureShim() {
  if (
    typeof (HTMLElement.prototype as unknown as { setPointerCapture?: unknown })
      .setPointerCapture !== 'function'
  ) {
    (
      HTMLElement.prototype as unknown as { setPointerCapture: (id: number) => void }
    ).setPointerCapture = () => {};
  }
  if (
    typeof (HTMLElement.prototype as unknown as { releasePointerCapture?: unknown })
      .releasePointerCapture !== 'function'
  ) {
    (
      HTMLElement.prototype as unknown as { releasePointerCapture: (id: number) => void }
    ).releasePointerCapture = () => {};
  }
}

ensurePointerCaptureShim();

// Mock URL.createObjectURL / revokeObjectURL globally for File/Blob src tests.
const objectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => 'blob:mock-url-1');
const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

beforeEach(() => {
  objectUrlSpy.mockClear();
  revokeSpy.mockClear();
});

// Helper — mock viewport getBoundingClientRect so the component has a known
// canvas. Default: 400×400 viewport.
function mockViewportRect(container: HTMLElement, opts: { width?: number; height?: number } = {}) {
  const { width = 400, height = 400 } = opts;
  const viewport = container.querySelector<HTMLElement>('[class*="viewport"]')!;
  viewport.getBoundingClientRect = () =>
    ({
      width,
      height,
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
  return viewport;
}

// Helper — fire load on the image with given natural dimensions.
function fireImageLoad(
  container: HTMLElement,
  naturalWidth = 1000,
  naturalHeight = 800,
) {
  const img = container.querySelector<HTMLImageElement>('img')!;
  // jsdom doesn't decode the image so naturalWidth is 0 — mock it.
  Object.defineProperty(img, 'naturalWidth', { configurable: true, value: naturalWidth });
  Object.defineProperty(img, 'naturalHeight', { configurable: true, value: naturalHeight });
  act(() => {
    fireEvent.load(img);
  });
  return img;
}

describe('ImageCrop', () => {
  describe('rendering / loading', () => {
    it('renders the viewport container with the image element', () => {
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={null} onChange={() => {}} />,
      );
      expect(container.querySelector('[class*="viewport"]')).toBeInTheDocument();
      expect(container.querySelector('img')).toBeInTheDocument();
    });

    it('shows Skeleton while image is loading', () => {
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={null} onChange={() => {}} />,
      );
      expect(container.querySelector('[class*="skeleton"]')).toBeInTheDocument();
    });

    it('removes skeleton and renders crop box once image loads', () => {
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={null} onChange={() => {}} />,
      );
      mockViewportRect(container);
      fireImageLoad(container);
      expect(container.querySelector('[class*="skeleton"]')).not.toBeInTheDocument();
      expect(container.querySelector('[class*="cropBox"]')).toBeInTheDocument();
    });

    it('shows error message when image fails to load', () => {
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={null} onChange={() => {}} />,
      );
      const img = container.querySelector('img')!;
      act(() => {
        fireEvent.error(img);
      });
      expect(screen.getByText(/Couldn't load image/i)).toBeInTheDocument();
    });

    it('disabled: adds disabled class and disables zoom slider', () => {
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={null} onChange={() => {}} disabled />,
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toMatch(/disabled/);
      // Zoom slider has aria-disabled on its thumb when disabled.
      const sliderThumb = container.querySelector('[role="slider"]');
      expect(sliderThumb).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('object URL lifecycle', () => {
    it('src as File: calls URL.createObjectURL once', () => {
      const file = new File([new Uint8Array(10)], 'a.png', { type: 'image/png' });
      render(<ImageCrop src={file} value={null} onChange={() => {}} />);
      expect(objectUrlSpy).toHaveBeenCalledTimes(1);
      expect(objectUrlSpy).toHaveBeenCalledWith(file);
    });

    it('src as Blob: calls URL.createObjectURL', () => {
      const blob = new Blob([new Uint8Array(10)], { type: 'image/png' });
      render(<ImageCrop src={blob} value={null} onChange={() => {}} />);
      expect(objectUrlSpy).toHaveBeenCalledWith(blob);
    });

    it('src as string: does NOT call createObjectURL', () => {
      render(<ImageCrop src="data:,placeholder" value={null} onChange={() => {}} />);
      expect(objectUrlSpy).not.toHaveBeenCalled();
    });

    it('unmount: revokes the object URL', () => {
      const file = new File([new Uint8Array(10)], 'a.png', { type: 'image/png' });
      const { unmount } = render(<ImageCrop src={file} value={null} onChange={() => {}} />);
      unmount();
      expect(revokeSpy).toHaveBeenCalledWith('blob:mock-url-1');
    });

    it('src change: revokes the old URL', () => {
      const file1 = new File([new Uint8Array(10)], 'a.png', { type: 'image/png' });
      const file2 = new File([new Uint8Array(10)], 'b.png', { type: 'image/png' });
      const { rerender } = render(<ImageCrop src={file1} value={null} onChange={() => {}} />);
      objectUrlSpy.mockReturnValueOnce('blob:mock-url-2');
      rerender(<ImageCrop src={file2} value={null} onChange={() => {}} />);
      expect(revokeSpy).toHaveBeenCalledWith('blob:mock-url-1');
    });
  });

  describe('crop area / value handling', () => {
    it('value=null initial: fires onChange once with the default centered crop after image loads', () => {
      const onChange = vi.fn();
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={null} onChange={onChange} aspectRatio={1} />,
      );
      mockViewportRect(container, { width: 400, height: 400 });
      fireImageLoad(container, 1000, 800);
      expect(onChange).toHaveBeenCalledTimes(1);
      const fired = onChange.mock.calls[0][0] as CropArea;
      // 1000×800 image, aspectRatio=1, default centered square should be 800×800.
      expect(fired.width).toBe(800);
      expect(fired.height).toBe(800);
      expect(fired.x).toBe(100); // (1000 - 800) / 2
      expect(fired.y).toBe(0); // (800 - 800) / 2
    });

    it('controlled value: image rendered with transform reflecting value position', () => {
      const value: CropArea = { x: 100, y: 50, width: 400, height: 400 };
      const { container } = render(
        <ImageCrop
          src="data:,placeholder"
          value={value}
          onChange={() => {}}
          aspectRatio={1}
        />,
      );
      mockViewportRect(container, { width: 400, height: 400 });
      fireImageLoad(container, 1000, 800);
      const img = container.querySelector<HTMLImageElement>('img')!;
      // scale = boxW / value.width = 400 / 400 = 1; box centered at (0, 0) — but viewport is 400×400 too.
      // boxLeft = 0, boxTop = 0, originX = 0 - 100*1 = -100, originY = 0 - 50*1 = -50.
      expect(img.style.transform).toContain('translate(-100px, -50px)');
      expect(img.style.transform).toContain('scale(1)');
    });

    it('aspectRatio=1 with null value: default crop is square', () => {
      const onChange = vi.fn();
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={null} onChange={onChange} aspectRatio={1} />,
      );
      mockViewportRect(container);
      fireImageLoad(container, 1200, 600);
      const fired = onChange.mock.calls[0][0] as CropArea;
      expect(fired.width).toBe(fired.height);
    });

    it('aspectRatio undefined: default crop matches image aspect (no constraint)', () => {
      const onChange = vi.fn();
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={null} onChange={onChange} />,
      );
      mockViewportRect(container, { width: 400, height: 400 });
      fireImageLoad(container, 1000, 800);
      const fired = onChange.mock.calls[0][0] as CropArea;
      // Free aspect = viewport aspect = 1 (400×400 viewport). Default centered crop should be
      // 800×800 in a 1000×800 image (limited by the smaller dimension).
      expect(fired.width).toBe(800);
      expect(fired.height).toBe(800);
    });
  });

  describe('drag', () => {
    it('pointerdown on image starts drag (adds imageDragging class)', () => {
      const { container } = render(
        <ImageCrop
          src="data:,placeholder"
          value={{ x: 100, y: 50, width: 400, height: 400 }}
          onChange={() => {}}
          aspectRatio={1}
        />,
      );
      mockViewportRect(container);
      fireImageLoad(container, 1000, 800);
      const img = container.querySelector('img')!;
      fireEvent.pointerDown(img, { clientX: 200, clientY: 200, pointerId: 1 });
      expect(img.className).toMatch(/imageDragging/);
    });

    it('pointermove during drag fires onChange with shifted value', () => {
      const onChange = vi.fn();
      const value: CropArea = { x: 100, y: 50, width: 400, height: 400 };
      const { container } = render(
        <ImageCrop
          src="data:,placeholder"
          value={value}
          onChange={onChange}
          aspectRatio={1}
        />,
      );
      mockViewportRect(container, { width: 400, height: 400 });
      fireImageLoad(container, 1000, 800);
      onChange.mockClear();
      const img = container.querySelector('img')!;
      fireEvent.pointerDown(img, { clientX: 200, clientY: 200, pointerId: 1 });
      fireEvent.pointerMove(img, { clientX: 250, clientY: 220, pointerId: 1 });
      // scale = 1; dx = 50, dy = 20. Sign-flipped: new x = 100 - 50 = 50, new y = 50 - 20 = 30.
      // width/height unchanged.
      const fired = onChange.mock.calls.at(-1)?.[0] as CropArea;
      expect(fired.x).toBe(50);
      expect(fired.y).toBe(30);
      expect(fired.width).toBe(400);
      expect(fired.height).toBe(400);
    });

    it('pointerup ends drag and fires onChangeEnd', () => {
      const onChangeEnd = vi.fn();
      const { container } = render(
        <ImageCrop
          src="data:,placeholder"
          value={{ x: 100, y: 50, width: 400, height: 400 }}
          onChange={() => {}}
          onChangeEnd={onChangeEnd}
          aspectRatio={1}
        />,
      );
      mockViewportRect(container);
      fireImageLoad(container, 1000, 800);
      const img = container.querySelector('img')!;
      fireEvent.pointerDown(img, { clientX: 200, clientY: 200, pointerId: 1 });
      fireEvent.pointerMove(img, { clientX: 250, clientY: 220, pointerId: 1 });
      fireEvent.pointerUp(img, { clientX: 250, clientY: 220, pointerId: 1 });
      expect(onChangeEnd).toHaveBeenCalled();
    });

    it('drag clamps so value.x stays in [0, imageWidth - width]', () => {
      const onChange = vi.fn();
      const { container } = render(
        <ImageCrop
          src="data:,placeholder"
          value={{ x: 100, y: 50, width: 400, height: 400 }}
          onChange={onChange}
          aspectRatio={1}
        />,
      );
      mockViewportRect(container, { width: 400, height: 400 });
      fireImageLoad(container, 1000, 800);
      onChange.mockClear();
      const img = container.querySelector('img')!;
      fireEvent.pointerDown(img, { clientX: 200, clientY: 200, pointerId: 1 });
      // Huge rightward drag — should clamp x at 0 (can't go below).
      fireEvent.pointerMove(img, { clientX: 5000, clientY: 200, pointerId: 1 });
      const fired = onChange.mock.calls.at(-1)?.[0] as CropArea;
      expect(fired.x).toBe(0);
    });

    it('disabled: pointerdown does not start drag', () => {
      const onChange = vi.fn();
      const { container } = render(
        <ImageCrop
          src="data:,placeholder"
          value={{ x: 100, y: 50, width: 400, height: 400 }}
          onChange={onChange}
          disabled
        />,
      );
      mockViewportRect(container);
      fireImageLoad(container);
      onChange.mockClear();
      const img = container.querySelector('img')!;
      fireEvent.pointerDown(img, { clientX: 200, clientY: 200, pointerId: 1 });
      fireEvent.pointerMove(img, { clientX: 250, clientY: 220, pointerId: 1 });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('zoom', () => {
    it('Slider onChange updates crop area dimensions (smaller at higher zoom)', () => {
      const onChange = vi.fn();
      const value: CropArea = { x: 100, y: 50, width: 400, height: 400 };
      const { container } = render(
        <ImageCrop
          src="data:,placeholder"
          value={value}
          onChange={onChange}
          aspectRatio={1}
        />,
      );
      mockViewportRect(container, { width: 400, height: 400 });
      fireImageLoad(container, 1000, 800);
      onChange.mockClear();
      // Find the embedded zoom slider thumb and fire ArrowRight twice (the Slider's
      // own keyboard handler will move zoom up by 0.01 × 2 = 0.02).
      const sliderThumb = container.querySelector<HTMLElement>('[role="slider"]')!;
      sliderThumb.focus();
      fireEvent.keyDown(sliderThumb, { key: 'ArrowRight' });
      const fired = onChange.mock.calls.at(-1)?.[0] as CropArea;
      // At zoom > 1, width should be less than 400.
      expect(fired.width).toBeLessThan(400);
      expect(fired.height).toBeLessThan(400);
    });

    it('showZoomControl=false: no slider rendered', () => {
      const { container } = render(
        <ImageCrop
          src="data:,placeholder"
          value={null}
          onChange={() => {}}
          showZoomControl={false}
        />,
      );
      expect(container.querySelector('[role="slider"]')).not.toBeInTheDocument();
    });
  });

  describe('extractCropBlob utility', () => {
    // Helper: mock canvas getContext + drawImage + toBlob.
    function mockCanvas() {
      const ctxDrawImage = vi.fn();
      const ctx = { drawImage: ctxDrawImage } as unknown as CanvasRenderingContext2D;
      const toBlob = vi.fn((cb: (blob: Blob | null) => void) => {
        cb(new Blob([new Uint8Array(10)], { type: 'image/png' }));
      });
      const getContext = vi.fn(() => ctx);
      const originalCreate = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((
        tag: string,
      ) => {
        if (tag === 'canvas') {
          return {
            getContext,
            toBlob,
            set width(_v: number) {},
            set height(_v: number) {},
          } as unknown as HTMLCanvasElement;
        }
        return originalCreate(tag);
      }) as typeof document.createElement);
      return { ctxDrawImage, toBlob, getContext, createElementSpy };
    }

    // Helper: stub Image constructor so loading "succeeds" synchronously
    // without a real network/decode.
    function stubImageLoad(naturalWidth = 1000, naturalHeight = 800) {
      const RealImage = window.Image;
      class StubImage {
        crossOrigin = '';
        naturalWidth = naturalWidth;
        naturalHeight = naturalHeight;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_v: string) {
          // Fire onload on next microtask to mimic real image load.
          queueMicrotask(() => this.onload?.());
        }
      }
      (window as unknown as { Image: typeof Image }).Image = StubImage as unknown as typeof Image;
      return () => {
        (window as unknown as { Image: typeof Image }).Image = RealImage;
      };
    }

    it('returns a Blob for the cropped region', async () => {
      const { ctxDrawImage, toBlob, createElementSpy } = mockCanvas();
      const restoreImage = stubImageLoad(1000, 800);
      const area: CropArea = { x: 100, y: 50, width: 400, height: 400 };
      const blob = await extractCropBlob('data:,placeholder', area);
      expect(blob).toBeInstanceOf(Blob);
      // drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
      expect(ctxDrawImage).toHaveBeenCalledWith(
        expect.anything(),
        100,
        50,
        400,
        400,
        0,
        0,
        400,
        400,
      );
      // Default type is 'image/png', default quality 0.92.
      expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png', 0.92);
      restoreImage();
      createElementSpy.mockRestore();
    });

    it('outputWidth scales the canvas dimensions proportionally', async () => {
      const { ctxDrawImage, createElementSpy } = mockCanvas();
      const restoreImage = stubImageLoad(1000, 800);
      const area: CropArea = { x: 100, y: 50, width: 400, height: 400 };
      await extractCropBlob('data:,placeholder', area, { outputWidth: 200 });
      // outputWidth=200, area aspect 1 → outH = 200 * (400/400) = 200.
      expect(ctxDrawImage).toHaveBeenCalledWith(
        expect.anything(),
        100,
        50,
        400,
        400,
        0,
        0,
        200,
        200,
      );
      restoreImage();
      createElementSpy.mockRestore();
    });

    it('passes type and quality to canvas.toBlob', async () => {
      const { toBlob, createElementSpy } = mockCanvas();
      const restoreImage = stubImageLoad();
      const area: CropArea = { x: 0, y: 0, width: 100, height: 100 };
      await extractCropBlob('data:,placeholder', area, { type: 'image/jpeg', quality: 0.5 });
      expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.5);
      restoreImage();
      createElementSpy.mockRestore();
    });
  });

  describe('misc', () => {
    it('className merges with the base class', () => {
      const { container } = render(
        <ImageCrop
          src="data:,placeholder"
          value={null}
          onChange={() => {}}
          className="custom"
        />,
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toMatch(/custom/);
      expect(root.className).toMatch(/root_/);
    });

    it('forwards ref to the outermost div', () => {
      const ref = createRef<HTMLDivElement>();
      render(<ImageCrop ref={ref} src="data:,placeholder" value={null} onChange={() => {}} />);
      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });
});
