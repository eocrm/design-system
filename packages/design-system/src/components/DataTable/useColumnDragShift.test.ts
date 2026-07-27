import { applyColumnShifts } from './useColumnDragShift';
import { shiftVarName } from './columnShift';

describe('applyColumnShifts', () => {
  function makeRoot() {
    return document.createElement('table');
  }

  it('writes a px custom property per shifted column', () => {
    const root = makeRoot();
    applyColumnShifts(root, { a: 12, b: -30 }, []);
    expect(root.style.getPropertyValue(shiftVarName('a'))).toBe('12px');
    expect(root.style.getPropertyValue(shiftVarName('b'))).toBe('-30px');
  });

  it('returns the ids it wrote so the next call can clear them', () => {
    const root = makeRoot();
    const written = applyColumnShifts(root, { a: 1, b: 2 }, []);
    expect(written.sort()).toEqual(['a', 'b']);
  });

  it('removes properties for columns that stopped shifting', () => {
    const root = makeRoot();
    const first = applyColumnShifts(root, { a: 1, b: 2 }, []);
    applyColumnShifts(root, { a: 5 }, first);
    expect(root.style.getPropertyValue(shiftVarName('a'))).toBe('5px');
    expect(root.style.getPropertyValue(shiftVarName('b'))).toBe('');
  });

  it('clears everything when handed an empty shift map', () => {
    const root = makeRoot();
    const first = applyColumnShifts(root, { a: 1, b: 2 }, []);
    const written = applyColumnShifts(root, {}, first);
    expect(root.style.getPropertyValue(shiftVarName('a'))).toBe('');
    expect(root.style.getPropertyValue(shiftVarName('b'))).toBe('');
    expect(written).toEqual([]);
  });

  it('is a no-op on a null root', () => {
    expect(() => applyColumnShifts(null, { a: 1 }, [])).not.toThrow();
    expect(applyColumnShifts(null, { a: 1 }, ['b'])).toEqual([]);
  });

  it('rounds sub-pixel offsets to avoid churning the style attribute', () => {
    const root = makeRoot();
    applyColumnShifts(root, { a: 12.4 }, []);
    expect(root.style.getPropertyValue(shiftVarName('a'))).toBe('12px');
  });
});
