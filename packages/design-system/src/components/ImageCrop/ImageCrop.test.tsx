import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { createRef, useLayoutEffect, type ReactNode } from 'react';
import { ImageCrop, extractCropBlob, useCropPreview, type CropArea } from './index';

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

// jsdom doesn't implement ResizeObserver; shim it (same pattern as Tooltip /
// DropdownMenu / Popover tests).
if (typeof window.ResizeObserver === 'undefined') {
  window.ResizeObserver = class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

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
function fireImageLoad(container: HTMLElement, naturalWidth = 1000, naturalHeight = 800) {
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
        <ImageCrop
          src="data:,placeholder"
          value={{ x: 0, y: 0, width: 100, height: 100 }}
          onChange={() => {}}
        />,
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

    it('disabled: adds disabled class', () => {
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={null} onChange={() => {}} disabled />,
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toMatch(/disabled/);
      expect(container.querySelector('[role="slider"]')).not.toBeInTheDocument();
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
      // 1000×800 image, aspectRatio=1: largest square 800 → 80% = 640, centered.
      expect(fired.width).toBeCloseTo(640);
      expect(fired.height).toBeCloseTo(640);
      expect(fired.x).toBeCloseTo(180);
      expect(fired.y).toBeCloseTo(80);
    });

    it('controlled value: image is fitted, still, with a transform from fitImage', () => {
      const value: CropArea = { x: 100, y: 50, width: 400, height: 400 };
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={value} onChange={() => {}} aspectRatio={1} />,
      );
      mockViewportRect(container, { width: 400, height: 400 });
      fireImageLoad(container, 1000, 800);
      const img = container.querySelector<HTMLImageElement>('img')!;
      // scale 0.368, offset (16, 32.8) — independent of value.
      expect(img.style.transform).toMatch(/translate\(16px, 32\.8/);
      expect(img.style.transform).toContain('scale(0.368)');
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

    it('aspectRatio undefined: default crop is 80% of the image', () => {
      const onChange = vi.fn();
      const { container } = render(
        <ImageCrop src="data:,placeholder" value={null} onChange={onChange} />,
      );
      mockViewportRect(container, { width: 400, height: 400 });
      fireImageLoad(container, 1000, 800);
      const fired = onChange.mock.calls[0][0] as CropArea;
      // Free aspect = image aspect: 80% of the whole image.
      expect(fired.width).toBeCloseTo(800);
      expect(fired.height).toBeCloseTo(640);
    });
  });

  describe('crop box', () => {
    const SQ: CropArea = { x: 180, y: 80, width: 640, height: 640 };
    function setup(
      props: Partial<React.ComponentProps<typeof ImageCrop>> = {},
      value: CropArea | null = SQ,
    ) {
      const onChange = vi.fn();
      const onChangeEnd = vi.fn();
      const utils = render(
        <ImageCrop
          src="data:,placeholder"
          value={value}
          onChange={onChange}
          onChangeEnd={onChangeEnd}
          aspectRatio={1}
          {...props}
        />,
      );
      mockViewportRect(utils.container, { width: 400, height: 400 });
      fireImageLoad(utils.container, 1000, 800);
      onChange.mockClear();
      const box = utils.container.querySelector<HTMLElement>('[data-crop-box]')!;
      const handle = (h: string) =>
        utils.container.querySelector<HTMLElement>(`[data-handle="${h}"]`)!;
      return { ...utils, onChange, onChangeEnd, box, handle };
    }
    const last = (fn: ReturnType<typeof vi.fn>) => fn.mock.calls.at(-1)?.[0] as CropArea;

    it('box is positioned from value', () => {
      const { box } = setup();
      expect(parseFloat(box.style.left)).toBeCloseTo(16 + 180 * 0.368);
      expect(parseFloat(box.style.width)).toBeCloseTo(640 * 0.368);
    });

    it('dragging the box moves the crop', () => {
      const { box, onChange } = setup();
      fireEvent.pointerDown(box, { clientX: 200, clientY: 200, pointerId: 1 });
      fireEvent.pointerMove(box, { clientX: 236.8, clientY: 200, pointerId: 1 });
      expect(last(onChange).x).toBeCloseTo(280);
      expect(last(onChange).y).toBeCloseTo(80);
    });

    it('drag clamps to image', () => {
      const { box, onChange } = setup();
      fireEvent.pointerDown(box, { clientX: 200, clientY: 200, pointerId: 1 });
      fireEvent.pointerMove(box, { clientX: 1200, clientY: 200, pointerId: 1 });
      expect(last(onChange).x).toBeCloseTo(360);
    });

    it('pointerup fires onChangeEnd once with last value', () => {
      const { box, onChange, onChangeEnd } = setup();
      fireEvent.pointerDown(box, { clientX: 200, clientY: 200, pointerId: 1 });
      fireEvent.pointerMove(box, { clientX: 220, clientY: 200, pointerId: 1 });
      fireEvent.pointerUp(box, { clientX: 220, clientY: 200, pointerId: 1 });
      expect(onChangeEnd).toHaveBeenCalledTimes(1);
      expect(onChangeEnd).toHaveBeenCalledWith(last(onChange));
    });

    it('se handle resizes with ratio and does not move the box', () => {
      const { handle, onChange } = setup();
      fireEvent.pointerDown(handle('se'), { clientX: 300, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(handle('se'), { clientX: 318.4, clientY: 318.4, pointerId: 1 });
      const fired = last(onChange);
      expect(fired.width).toBeCloseTo(690);
      expect(fired.height).toBeCloseTo(690);
      for (const [a] of onChange.mock.calls) expect((a as CropArea).x).toBe(180);
    });

    it('edge handles only render in free aspect', () => {
      expect(setup().container.querySelectorAll('[data-handle]')).toHaveLength(4);
      const free = setup({ aspectRatio: undefined });
      expect(free.container.querySelectorAll('[data-handle]').length).toBe(8);
    });

    it('cropBoxActive class while dragging, removed on pointerup', () => {
      const { box } = setup();
      fireEvent.pointerDown(box, { clientX: 200, clientY: 200, pointerId: 1 });
      expect(box.className).toMatch(/cropBoxActive/);
      fireEvent.pointerUp(box, { clientX: 200, clientY: 200, pointerId: 1 });
      expect(box.className).not.toMatch(/cropBoxActive/);
    });

    it('out-of-bounds value renders without throwing and next drag clamps', () => {
      const { box, onChange } = setup({}, { x: -50, y: 0, width: 2000, height: 2000 });
      fireEvent.pointerDown(box, { clientX: 200, clientY: 200, pointerId: 1 });
      fireEvent.pointerMove(box, { clientX: 220, clientY: 200, pointerId: 1 });
      const fired = last(onChange);
      expect(Number.isFinite(fired.x)).toBe(true);
      expect(fired.x).toBeLessThanOrEqual(0);
    });

    it('disabled: pointerdown on box/handle does nothing', () => {
      const { box, handle, onChange } = setup({ disabled: true });
      fireEvent.pointerDown(box, { clientX: 200, clientY: 200, pointerId: 1 });
      fireEvent.pointerMove(box, { clientX: 250, clientY: 220, pointerId: 1 });
      fireEvent.pointerDown(handle('se'), { clientX: 300, clientY: 300, pointerId: 1 });
      fireEvent.pointerMove(handle('se'), { clientX: 320, clientY: 320, pointerId: 1 });
      expect(onChange).not.toHaveBeenCalled();
    });

    it('removed props are gone', () => {
      const { container } = setup();
      // @ts-expect-error maxZoom was removed
      const el = <ImageCrop src="x" value={null} onChange={() => {}} maxZoom={2} />;
      expect(el).toBeTruthy();
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
        <ImageCrop src="data:,placeholder" value={null} onChange={() => {}} className="custom" />,
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

  describe('useCropPreview hook', () => {
    function HookHarness({
      src,
      crop,
      debounceMs = 0,
    }: {
      src: string | File | Blob | null;
      crop: CropArea | null;
      debounceMs?: number;
    }) {
      const { previewUrl, previewSize, encoding } = useCropPreview(src, crop, {
        type: 'image/jpeg',
        quality: 0.9,
        outputWidth: 256,
        debounceMs,
      });
      return (
        <div
          data-testid="hook-output"
          data-preview-url={previewUrl ?? ''}
          data-preview-size={previewSize ?? ''}
          data-encoding={String(encoding)}
        />
      );
    }

    // Stub canvas + Image so extractCropBlob resolves synchronously in tests.
    function stubExtractDeps() {
      const RealImage = window.Image;
      class StubImage {
        crossOrigin = '';
        naturalWidth = 1000;
        naturalHeight = 800;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_v: string) {
          queueMicrotask(() => this.onload?.());
        }
      }
      (window as unknown as { Image: typeof Image }).Image = StubImage as unknown as typeof Image;
      const originalCreate = document.createElement.bind(document);
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation(((
        tag: string,
      ) => {
        if (tag === 'canvas') {
          return {
            getContext: () =>
              ({
                drawImage: () => {},
              }) as unknown as CanvasRenderingContext2D,
            toBlob: (cb: (blob: Blob | null) => void) =>
              cb(new Blob([new Uint8Array(50)], { type: 'image/jpeg' })),
            set width(_v: number) {},
            set height(_v: number) {},
          } as unknown as HTMLCanvasElement;
        }
        return originalCreate(tag);
      }) as typeof document.createElement);
      return () => {
        (window as unknown as { Image: typeof Image }).Image = RealImage;
        createElementSpy.mockRestore();
      };
    }

    it('returns null preview when src or crop is null', () => {
      const { getByTestId } = render(<HookHarness src={null} crop={null} />);
      const el = getByTestId('hook-output');
      expect(el.dataset.previewUrl).toBe('');
      expect(el.dataset.encoding).toBe('false');
    });

    it('sets encoding=true when crop is provided, then produces a preview url', async () => {
      const restore = stubExtractDeps();
      const { getByTestId } = render(
        <HookHarness
          src="data:,placeholder"
          crop={{ x: 0, y: 0, width: 100, height: 100 }}
          debounceMs={0}
        />,
      );
      const el = getByTestId('hook-output');
      // Synchronously after render, encoding flag flips on.
      expect(el.dataset.encoding).toBe('true');
      // After debounce + microtask + setState, previewUrl is populated.
      await waitFor(() => {
        expect(el.dataset.previewUrl).toMatch(/^blob:/);
        expect(el.dataset.encoding).toBe('false');
        expect(Number(el.dataset.previewSize)).toBe(50);
      });
      restore();
    });

    it('clears preview when crop transitions back to null', async () => {
      const restore = stubExtractDeps();
      const { getByTestId, rerender } = render(
        <HookHarness
          src="data:,placeholder"
          crop={{ x: 0, y: 0, width: 100, height: 100 }}
          debounceMs={0}
        />,
      );
      const el = getByTestId('hook-output');
      await waitFor(() => {
        expect(el.dataset.previewUrl).toMatch(/^blob:/);
      });
      rerender(<HookHarness src="data:,placeholder" crop={null} debounceMs={0} />);
      expect(el.dataset.previewUrl).toBe('');
      expect(el.dataset.encoding).toBe('false');
      restore();
    });
  });
});

// #574: a cached image can fire `load` before the mount's passive effects run.
function LoadEarly({ selector, children }: { selector: string; children: ReactNode }) {
  useLayoutEffect(() => {
    const img = document.querySelector<HTMLImageElement>(selector)!;
    Object.defineProperty(img, 'naturalWidth', { configurable: true, value: 1000 });
    Object.defineProperty(img, 'naturalHeight', { configurable: true, value: 800 });
    fireEvent.load(img);
  }, [selector]);
  return <>{children}</>;
}

describe('ImageCrop — early load (#574)', () => {
  it('leaves the loading state when the image loads before mount effects run', () => {
    const { container } = render(
      <LoadEarly selector="img">
        <ImageCrop src="https://example.com/logo.png" value={null} onChange={() => {}} />
      </LoadEarly>,
    );
    expect(container.querySelector('[class*="skeleton"]')).toBeNull();
  });
});
