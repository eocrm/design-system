import { applyShortcut } from './shortcuts';
import { createBlock } from '../RichText/engine/model';
import type { RichDoc, Range } from '../RichText/engine/model';

const doc: RichDoc = { blocks: [createBlock('paragraph', 'abcd', { id: 'a' })] };
const sel: Range = { anchor: { blockId: 'a', offset: 0 }, focus: { blockId: 'a', offset: 4 } };
const key = (
  k: string,
  mod: Partial<{ metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }> = {},
) => ({
  key: k,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  ...mod,
});

describe('applyShortcut', () => {
  it('Mod+B toggles bold over the selection', () => {
    const r = applyShortcut(doc, sel, key('b', { metaKey: true }))!;
    expect(r.doc.blocks[0].inlines[0].marks).toEqual([{ type: 'bold' }]);
  });

  it('Ctrl+I toggles italic', () => {
    const r = applyShortcut(doc, sel, key('i', { ctrlKey: true }))!;
    expect(r.doc.blocks[0].inlines[0].marks).toEqual([{ type: 'italic' }]);
  });

  it('Mod+U toggles underline', () => {
    const r = applyShortcut(doc, sel, key('u', { metaKey: true }))!;
    expect(r.doc.blocks[0].inlines[0].marks).toEqual([{ type: 'underline' }]);
  });

  it('Mod+Shift+X toggles strike', () => {
    const r = applyShortcut(doc, sel, key('x', { metaKey: true, shiftKey: true }))!;
    expect(r.doc.blocks[0].inlines[0].marks).toEqual([{ type: 'strike' }]);
  });

  it('uppercase key still matches', () => {
    expect(applyShortcut(doc, sel, key('B', { metaKey: true }))).not.toBeNull();
  });

  it('no modifier → null', () => {
    expect(applyShortcut(doc, sel, key('b'))).toBeNull();
  });

  it('Mod+B with shift → null (not a defined shortcut)', () => {
    expect(applyShortcut(doc, sel, key('b', { metaKey: true, shiftKey: true }))).toBeNull();
  });

  it('non-shortcut key with modifier → null', () => {
    expect(applyShortcut(doc, sel, key('a', { metaKey: true }))).toBeNull();
  });
});
