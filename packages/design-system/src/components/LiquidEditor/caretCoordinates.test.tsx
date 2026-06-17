import { getCaretCoordinates } from './caretCoordinates';

describe('getCaretCoordinates', () => {
  it('returns finite numeric top/left/height for a textarea + index', () => {
    const ta = document.createElement('textarea');
    ta.value = 'hello\nworld';
    document.body.appendChild(ta);

    const coords = getCaretCoordinates(ta, 8);
    expect(Number.isFinite(coords.top)).toBe(true);
    expect(Number.isFinite(coords.left)).toBe(true);
    expect(Number.isFinite(coords.height)).toBe(true);
    expect(coords.height).toBeGreaterThanOrEqual(0);

    ta.remove();
  });

  it('does not throw for index 0 / empty value', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    expect(() => getCaretCoordinates(ta, 0)).not.toThrow();
    ta.remove();
  });

  it('cleans up the mirror div it creates', () => {
    const before = document.body.childElementCount;
    const ta = document.createElement('textarea');
    ta.value = 'abc';
    document.body.appendChild(ta);
    getCaretCoordinates(ta, 2);
    // Only the textarea remains; the mirror is removed.
    expect(document.body.childElementCount).toBe(before + 1);
    ta.remove();
  });
});
