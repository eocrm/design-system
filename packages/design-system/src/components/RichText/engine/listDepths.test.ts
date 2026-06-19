import { isListItem, effectiveDepths } from './listDepths';
import { createBlock } from './model';
import type { Block } from './model';

const li = (depth: number): Block => createBlock('bullet_item', 'x', { depth });
const p = (): Block => createBlock('paragraph', 'x');

describe('isListItem', () => {
  it('is true for list items only', () => {
    expect(isListItem(createBlock('bullet_item', 'a'))).toBe(true);
    expect(isListItem(createBlock('ordered_item', 'a'))).toBe(true);
    expect(isListItem(createBlock('paragraph', 'a'))).toBe(false);
  });
});

describe('effectiveDepths', () => {
  it('clamps gaps to at most +1 within a run', () => {
    expect(effectiveDepths([li(0), li(2), li(1)])).toEqual([0, 1, 1]);
  });
  it('clamps a leading deep item to 0', () => {
    expect(effectiveDepths([li(3)])).toEqual([0]);
  });
  it('resets the run on a non-list block', () => {
    expect(effectiveDepths([li(0), li(1), p(), li(2)])).toEqual([0, 1, 0, 0]);
  });
});
