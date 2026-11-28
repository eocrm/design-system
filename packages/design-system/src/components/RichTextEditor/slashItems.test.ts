import { en } from '../../i18n/en';
import { lookupKey } from '../../i18n/format';
import { createBlock, type RichDoc } from '../RichText/engine/model';
import { applySlashItem, defaultSlashItems, filterSlashItems, type SlashItem } from './slashItems';

const t = (key: string) => lookupKey(en as unknown as Record<string, unknown>, key) as string;
const ids = (items: SlashItem[]) => items.map((i) => i.id);
const defaults = defaultSlashItems({ t, hasUpload: true });

describe('defaultSlashItems', () => {
  it('offers the block set, with image/file only when upload is configured', () => {
    expect(ids(defaultSlashItems({ t, hasUpload: false }))).toEqual([
      'paragraph',
      'heading1',
      'heading2',
      'heading3',
      'quote',
      'code',
      'bullet',
      'numbered',
      'checklist',
      'divider',
    ]);
    expect(ids(defaults)).toEqual(expect.arrayContaining(['image', 'file']));
  });

  it('labels and hints every item from the catalogue', () => {
    for (const item of defaults) {
      expect(item.label).toBeTruthy();
      expect(item.hint).toBeTruthy();
      expect(item.label).not.toContain('richTextEditor.');
      expect(item.hint).not.toContain('richTextEditor.');
    }
  });
});

describe('filterSlashItems', () => {
  it("matches keywords ('h2' → Heading 2)", () => {
    expect(ids(filterSlashItems(defaults, 'h2'))).toEqual(['heading2']);
  });
  it("matches a label prefix ('quo')", () => {
    expect(ids(filterSlashItems(defaults, 'QUO'))).toEqual(['quote']);
  });
  it("'' returns every item; 'zzz' none", () => {
    expect(ids(filterSlashItems(defaults, '')).sort()).toEqual(ids(defaults).sort());
    expect(filterSlashItems(defaults, 'zzz')).toEqual([]);
  });
  it('keeps group order, so a custom item lands with its group', () => {
    const custom: SlashItem = { id: 'x', group: 'text', label: 'Xtra', run: () => {} };
    const out = ids(filterSlashItems([...defaults, custom], ''));
    expect(out.indexOf('x')).toBeLessThan(out.indexOf('bullet'));
  });
});

describe('applySlashItem', () => {
  const doc = (text: string): RichDoc => ({
    blocks: [{ id: 'k', type: 'paragraph', inlines: [{ text, marks: [] }] }],
  });
  const byId = (id: string) => defaults.find((i) => i.id === id)!;

  it('strips /query and turns the block into the chosen type', () => {
    const { result } = applySlashItem(
      doc('ab /hea'),
      { blockId: 'k', from: 3, to: 7 },
      byId('heading2'),
    );
    expect(result.doc.blocks[0]).toMatchObject({ id: 'k', type: 'heading', level: 2 });
    expect(result.doc.blocks[0].inlines[0].text).toBe('ab ');
  });

  it('turnInto refuses void targets', () => {
    const item: SlashItem = {
      id: 'v',
      group: 'text',
      label: 'v',
      run: (api) => api.turnInto({ type: 'divider' }),
    };
    const { result } = applySlashItem(doc('/v'), { blockId: 'k', from: 0, to: 2 }, item);
    expect(result.doc.blocks).toHaveLength(1);
    expect(result.doc.blocks[0].type).toBe('paragraph');
  });

  it('divider replaces an empty block and leaves a paragraph for the caret', () => {
    const { result } = applySlashItem(
      doc('/div'),
      { blockId: 'k', from: 0, to: 4 },
      byId('divider'),
    );
    expect(result.doc.blocks.map((b) => b.type)).toEqual(['divider', 'paragraph']);
    expect(result.selection.anchor.blockId).toBe(result.doc.blocks[1].id);
  });

  it('insertBlocks keeps a non-empty block and gives inserted blocks fresh ids', () => {
    const item: SlashItem = {
      id: 'tpl',
      group: 'advanced',
      label: 'Template',
      run: (api) => api.insertBlocks([createBlock('paragraph', 'T', { id: 'k' })]),
    };
    const { result } = applySlashItem(doc('ab /t'), { blockId: 'k', from: 3, to: 5 }, item);
    expect(result.doc.blocks.map((b) => b.inlines[0].text)).toEqual(['ab ', 'T']);
    expect(new Set(result.doc.blocks.map((b) => b.id)).size).toBe(2);
  });

  it('openUpload is reported back, not run inline', () => {
    const { result, upload } = applySlashItem(
      doc('/im'),
      { blockId: 'k', from: 0, to: 3 },
      byId('image'),
    );
    expect(upload).toBe('image');
    expect(result.doc.blocks[0].inlines[0].text).toBe('');
  });
});
