import { computeDisplaySize, measureImageFromFile } from './imageSize';

describe('computeDisplaySize', () => {
  it('returns undefined when natural dimensions are missing or non-positive', () => {
    expect(computeDisplaySize(undefined, 100, 2, 700)).toBeUndefined();
    expect(computeDisplaySize(100, undefined, 2, 700)).toBeUndefined();
    expect(computeDisplaySize(0, 100, 2, 700)).toBeUndefined();
    expect(computeDisplaySize(100, 0, 2, 700)).toBeUndefined();
  });

  it('divides natural pixels by the device pixel ratio (perceived size)', () => {
    expect(computeDisplaySize(1200, 800, 2, 0)).toEqual({ width: 600, height: 400 });
  });

  it('caps the perceived width to the editor content width, scaling height to keep aspect', () => {
    expect(computeDisplaySize(1200, 800, 1, 700)).toEqual({ width: 700, height: 467 });
  });

  it('applies ÷DPR then the cap together', () => {
    expect(computeDisplaySize(1200, 800, 2, 500)).toEqual({ width: 500, height: 333 });
  });

  it('treats a zero/negative dpr as 1, and a zero/absent cap as no cap', () => {
    expect(computeDisplaySize(300, 150, 0, 0)).toEqual({ width: 300, height: 150 });
  });
});

describe('measureImageFromFile', () => {
  it('resolves null for a non-image file', async () => {
    await expect(
      measureImageFromFile(new File(['x'], 'f.txt', { type: 'text/plain' })),
    ).resolves.toBeNull();
  });

  it('resolves null when image decoding is unavailable (jsdom has no createImageBitmap)', async () => {
    // The default measurer must degrade to null (no sizing) rather than throw/hang
    // where createImageBitmap is absent — this is what keeps the upload path safe.
    await expect(
      measureImageFromFile(new File(['x'], 'p.png', { type: 'image/png' })),
    ).resolves.toBeNull();
  });
});
