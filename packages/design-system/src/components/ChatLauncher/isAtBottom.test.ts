import { isAtBottom } from './isAtBottom';

describe('isAtBottom', () => {
  it('is true at the exact bottom', () => {
    expect(isAtBottom(600, 1000, 400)).toBe(true);
  });

  it('is true within the default 24px threshold', () => {
    expect(isAtBottom(576, 1000, 400)).toBe(true);
  });

  it('is false one pixel past the threshold', () => {
    expect(isAtBottom(575, 1000, 400)).toBe(false);
    expect(isAtBottom(589, 1000, 400, 10)).toBe(false);
  });

  it('is true when the content is shorter than the viewport', () => {
    expect(isAtBottom(0, 200, 400)).toBe(true);
  });
});
