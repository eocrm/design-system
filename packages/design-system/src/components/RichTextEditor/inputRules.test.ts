import { matchBlockRule, applyBlockRule } from './inputRules';
import { createBlock } from '../RichText/engine/model';
import type { RichDoc } from '../RichText/engine/model';

describe('matchBlockRule', () => {
  it('matches heading markers #/##/###', () => {
    expect(matchBlockRule('paragraph', '#', ' ')).toEqual({
      change: { type: 'heading', level: 1 },
      markerLen: 1,
    });
    expect(matchBlockRule('paragraph', '##', ' ')).toEqual({
      change: { type: 'heading', level: 2 },
      markerLen: 2,
    });
    expect(matchBlockRule('paragraph', '###', ' ')).toEqual({
      change: { type: 'heading', level: 3 },
      markerLen: 3,
    });
  });

  it('matches bullet markers -/*/+', () => {
    for (const m of ['-', '*', '+']) {
      expect(matchBlockRule('paragraph', m, ' ')).toEqual({
        change: { type: 'bullet_item', depth: 0 },
        markerLen: 1,
      });
    }
  });

  it('matches ordered markers like 1. and 2)', () => {
    expect(matchBlockRule('paragraph', '1.', ' ')).toEqual({
      change: { type: 'ordered_item', depth: 0 },
      markerLen: 2,
    });
    expect(matchBlockRule('paragraph', '2)', ' ')).toEqual({
      change: { type: 'ordered_item', depth: 0 },
      markerLen: 2,
    });
  });

  it('matches blockquote and code fence', () => {
    expect(matchBlockRule('paragraph', '>', ' ')).toEqual({
      change: { type: 'blockquote' },
      markerLen: 1,
    });
    expect(matchBlockRule('paragraph', '```', ' ')).toEqual({
      change: { type: 'code_block' },
      markerLen: 3,
    });
  });

  it('returns null for non-paragraph source, non-space trigger, and non-markers', () => {
    expect(matchBlockRule('heading', '#', ' ')).toBeNull();
    expect(matchBlockRule('paragraph', '#', 'x')).toBeNull();
    expect(matchBlockRule('paragraph', '#x', ' ')).toBeNull();
    expect(matchBlockRule('paragraph', 'text', ' ')).toBeNull();
    expect(matchBlockRule('paragraph', '####', ' ')).toBeNull();
  });
});

describe('applyBlockRule', () => {
  const collapsed = (blockId: string, offset: number) => ({
    anchor: { blockId, offset },
    focus: { blockId, offset },
  });

  it('strips the marker and sets the heading type/level, caret at 0', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', '#foo', { id: 'a' })] };
    const r = applyBlockRule(doc, 'a', { change: { type: 'heading', level: 1 }, markerLen: 1 });
    expect(r.doc.blocks[0].type).toBe('heading');
    expect(r.doc.blocks[0].level).toBe(1);
    expect(r.doc.blocks[0].inlines.map((i) => i.text).join('')).toBe('foo');
    expect(r.selection).toEqual(collapsed('a', 0));
  });

  it('converts a bare marker to an empty block', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', '>', { id: 'a' })] };
    const r = applyBlockRule(doc, 'a', { change: { type: 'blockquote' }, markerLen: 1 });
    expect(r.doc.blocks[0].type).toBe('blockquote');
    expect(r.doc.blocks[0].inlines.map((i) => i.text).join('')).toBe('');
  });

  it('sets list depth 0 for a bullet rule', () => {
    const doc: RichDoc = { blocks: [createBlock('paragraph', '-item', { id: 'a' })] };
    const r = applyBlockRule(doc, 'a', { change: { type: 'bullet_item', depth: 0 }, markerLen: 1 });
    expect(r.doc.blocks[0].type).toBe('bullet_item');
    expect(r.doc.blocks[0].depth).toBe(0);
  });
});
