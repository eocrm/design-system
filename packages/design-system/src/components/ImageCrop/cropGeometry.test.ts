import { defaultCropArea, fitImage, moveCrop, resizeCrop, scaleCrop } from './cropGeometry';

const IMG = { width: 1000, height: 800 };
const SQ = defaultCropArea(IMG, 1);
const FREE = defaultCropArea(IMG);

function expectArea(actual: object, expected: Record<string, number>) {
  for (const [k, v] of Object.entries(expected)) {
    expect((actual as Record<string, number>)[k]).toBeCloseTo(v, 6);
  }
}

describe('cropGeometry', () => {
  it('fitImage contains the image in the padded area', () => {
    expectArea(fitImage({ width: 400, height: 400 }, IMG, 16, 56), {
      scale: 0.368,
      offsetX: 16,
      offsetY: 16 + (328 - 294.4) / 2,
    });
  });
  it('defaultCropArea square = 80% of 800', () => {
    expectArea(SQ, { x: 180, y: 80, width: 640, height: 640 });
  });
  it('defaultCropArea free = 80% of image', () => {
    expectArea(FREE, { x: 100, y: 80, width: 800, height: 640 });
  });
  it('default crop can move on both axes (the bug)', () => {
    const a = defaultCropArea({ width: 800, height: 1200 }, 1);
    expect(a.x).toBeGreaterThan(0);
    expect(a.y).toBeGreaterThan(0);
  });
  it('moveCrop clamps to image', () => {
    expectArea(moveCrop(SQ, 10_000, -10_000, IMG), { x: 360, y: 0, width: 640, height: 640 });
  });
  it('resizeCrop se with ratio grows from top-left anchor', () => {
    expectArea(resizeCrop(SQ, 'se', 50, 50, IMG, 87, 1), {
      x: 180,
      y: 80,
      width: 690,
      height: 690,
    });
  });
  it('resizeCrop ratio-locked stops at edge on both axes', () => {
    expectArea(resizeCrop(SQ, 'se', 500, 500, IMG, 87, 1), {
      x: 180,
      y: 80,
      width: 720,
      height: 720,
    });
  });
  it('resizeCrop nw moves origin, keeps se corner', () => {
    const r = resizeCrop(SQ, 'nw', -50, -50, IMG, 87, 1);
    expect(r.x + r.width).toBeCloseTo(820);
    expect(r.y + r.height).toBeCloseTo(720);
    expect(r.width).toBeCloseTo(690);
  });
  it('resizeCrop free edge e changes width only', () => {
    expectArea(resizeCrop(FREE, 'e', 50, 999, IMG, 87), { ...FREE, width: 850 });
  });
  it('resizeCrop respects min size', () => {
    expect(resizeCrop(SQ, 'se', -10_000, -10_000, IMG, 87, 1).width).toBe(87);
  });
  it('min size clamps to tiny image', () => {
    const tiny = { width: 20, height: 20 };
    const r = scaleCrop(defaultCropArea(tiny, 1), 0.01, tiny, 87, 1);
    expect(r.width).toBeLessThanOrEqual(20);
    expect(r.x).toBeGreaterThanOrEqual(0);
  });
  it('scaleCrop grows around center and clamps', () => {
    expectArea(scaleCrop(SQ, 1.06, IMG, 87, 1), { x: 160.8, y: 60.8, width: 678.4, height: 678.4 });
    expectArea(scaleCrop(SQ, 10, IMG, 87, 1), { x: 100, y: 0, width: 800, height: 800 });
  });
});
