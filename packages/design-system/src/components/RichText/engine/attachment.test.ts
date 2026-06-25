import { createBlock } from './model';
import type { Block, RichDoc } from './model';
import { insertAttachmentBlock, updateAttachmentBlock, isVoidBlock } from './attachment';

const p = (id: string, text = '') => createBlock('paragraph', text, { id });
const doc = (blocks: Block[]): RichDoc => ({ blocks });

describe('isVoidBlock', () => {
  it('is true only for attachment blocks', () => {
    expect(isVoidBlock({ id: 'a', type: 'attachment', inlines: [] })).toBe(true);
    expect(isVoidBlock(p('p'))).toBe(false);
  });
});

describe('insertAttachmentBlock', () => {
  it('inserts a void block and a trailing paragraph; caret after the attachment', () => {
    const d = doc([p('a', 'hello')]);
    const r = insertAttachmentBlock(
      d,
      { blockId: 'a', offset: 5 },
      {
        name: 'y.png',
        mime: 'image/png',
        status: 'uploading',
      },
    );
    expect(r.doc.blocks.map((b) => b.type)).toEqual(['paragraph', 'attachment', 'paragraph']);
    expect(r.doc.blocks[1].name).toBe('y.png');
    expect(r.doc.blocks[1].status).toBe('uploading');
    expect(r.doc.blocks[1].inlines).toEqual([]);
    expect(r.selection.anchor.blockId).toBe(r.doc.blocks[2].id);
    expect(r.selection.anchor.offset).toBe(0);
  });
  it('splits mid-paragraph: text before stays, text after moves to the trailing block', () => {
    const d = doc([p('a', 'abcd')]);
    const r = insertAttachmentBlock(
      d,
      { blockId: 'a', offset: 2 },
      { name: 'f', status: 'uploading' },
    );
    expect(r.doc.blocks.map((b) => b.type)).toEqual(['paragraph', 'attachment', 'paragraph']);
    expect(r.doc.blocks[0].inlines[0].text).toBe('ab');
    expect(r.doc.blocks[2].inlines[0].text).toBe('cd');
  });
  it('returns the new block id as attachmentId (split path)', () => {
    const r = insertAttachmentBlock(
      doc([p('a', 'hello')]),
      { blockId: 'a', offset: 5 },
      {
        name: 'y.png',
      },
    );
    const att = r.doc.blocks.find((b) => b.type === 'attachment')!;
    expect(r.attachmentId).toBe(att.id);
  });
  it('returns attachmentId null when the caret block is absent (no-op)', () => {
    const d = doc([p('a')]);
    const r = insertAttachmentBlock(d, { blockId: 'nope', offset: 0 }, { name: 'y' });
    expect(r.attachmentId).toBeNull();
    expect(r.doc).toBe(d);
  });
  it('inserts after a void block instead of splitting it', () => {
    const d = doc([{ id: 'v', type: 'attachment', status: 'ready', name: 'x', inlines: [] }]);
    const r = insertAttachmentBlock(
      d,
      { blockId: 'v', offset: 0 },
      { name: 'y', status: 'uploading' },
    );
    expect(r.doc.blocks.map((b) => b.type)).toEqual(['attachment', 'attachment', 'paragraph']);
  });
});

describe('updateAttachmentBlock', () => {
  it('patches fields by id', () => {
    const d = doc([{ id: 'x', type: 'attachment', name: 'f', status: 'uploading', inlines: [] }]);
    const next = updateAttachmentBlock(d, 'x', {
      status: 'ready',
      src: 'http://u/f.png',
      mime: 'image/png',
    });
    expect(next.blocks[0].status).toBe('ready');
    expect(next.blocks[0].src).toBe('http://u/f.png');
  });
  it('no-op (same ref) when id is absent', () => {
    const d = doc([p('a')]);
    expect(updateAttachmentBlock(d, 'nope', { status: 'ready' })).toBe(d);
  });
  it('no-op (same ref) when the id is not an attachment block', () => {
    const d = doc([p('a')]);
    expect(updateAttachmentBlock(d, 'a', { status: 'ready' })).toBe(d);
  });
});
