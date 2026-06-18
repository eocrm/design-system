import { createBlock, emptyDoc, docFromText, nextId } from './model';

describe('model constructors', () => {
  it('createBlock makes an empty block with a single empty run + generated id', () => {
    const b = createBlock('paragraph');
    expect(b.type).toBe('paragraph');
    expect(b.inlines).toEqual([{ text: '', marks: [] }]);
    expect(typeof b.id).toBe('string');
    expect(b.id.length).toBeGreaterThan(0);
  });

  it('createBlock with text makes one run carrying the given marks', () => {
    const b = createBlock('paragraph', 'hi', { marks: [{ type: 'bold' }] });
    expect(b.inlines).toEqual([{ text: 'hi', marks: [{ type: 'bold' }] }]);
  });

  it('createBlock applies heading level + list depth attrs', () => {
    expect(createBlock('heading', 'H', { level: 2 }).level).toBe(2);
    expect(createBlock('bullet_item', 'x', { depth: 1 }).depth).toBe(1);
  });

  it('createBlock accepts an explicit id (for deterministic tests)', () => {
    expect(createBlock('paragraph', '', { id: 'fixed' }).id).toBe('fixed');
  });

  it('nextId returns distinct ids', () => {
    expect(nextId()).not.toBe(nextId());
  });

  it('emptyDoc is one empty paragraph', () => {
    const d = emptyDoc();
    expect(d.blocks).toHaveLength(1);
    expect(d.blocks[0].type).toBe('paragraph');
    expect(d.blocks[0].inlines).toEqual([{ text: '', marks: [] }]);
  });

  it('docFromText splits on newlines into paragraphs', () => {
    const d = docFromText('a\nb');
    expect(d.blocks.map((b) => b.type)).toEqual(['paragraph', 'paragraph']);
    expect(d.blocks.map((b) => b.inlines[0].text)).toEqual(['a', 'b']);
  });
});
