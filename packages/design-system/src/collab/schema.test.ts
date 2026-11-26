// @vitest-environment node
import * as Y from 'yjs';
import { describe, expect, it } from 'vitest';
import type { Block, RichDoc } from '../components/RichText/engine/model';
import { emptyDoc } from '../components/RichText/engine/model';
import { BLOCKS, blockMeta, fromRichDoc, toRichDoc } from './schema';

const p = (id: string, inlines: Block['inlines'], extra: Partial<Block> = {}): Block => ({
  id,
  type: 'paragraph',
  inlines,
  ...extra,
});
const ids = (d: RichDoc) => d.blocks.map((b) => b.id);
const strip = (d: RichDoc) => d.blocks.map(({ id: _id, ...rest }) => rest);

// Marks listed in MARK_ORDER, the order toRichDoc emits them in.
const rich: RichDoc = {
  blocks: [
    p('a', [{ text: 'Title', marks: [] }], { type: 'heading', level: 1 }),
    p('b', [{ text: 'Sub', marks: [] }], { type: 'heading', level: 3 }),
    p('c', [
      { text: 'plain ', marks: [] },
      { text: 'b', marks: [{ type: 'bold' }] },
      { text: 'bi', marks: [{ type: 'bold' }, { type: 'italic' }] },
      { text: 'ius', marks: [{ type: 'italic' }, { type: 'underline' }, { type: 'strike' }] },
      { text: 'code', marks: [{ type: 'code' }] },
    ]),
    p('d', [
      { text: 'link', marks: [{ type: 'link', href: 'https://x.test' }] },
      {
        text: 'colored link',
        marks: [
          { type: 'link', href: 'https://x.test' },
          { type: 'textColor', color: 'red' },
          { type: 'bold' },
        ],
      },
      { text: '@Ann', marks: [{ type: 'mention', id: 'u1', label: '@Ann' }] },
      { text: 'bg', marks: [{ type: 'bgColor', color: 'yellow' }] },
      {
        text: 'both',
        marks: [
          { type: 'textColor', color: 'blue' },
          { type: 'bgColor', color: 'green' },
        ],
      },
    ]),
    p('e', [{ text: 'one', marks: [] }], { type: 'bullet_item', depth: 0 }),
    p('f', [{ text: 'two', marks: [] }], { type: 'bullet_item', depth: 2 }),
    p('g', [{ text: 'three', marks: [] }], { type: 'ordered_item', depth: 1 }),
    p('h', [{ text: 'quote', marks: [] }], { type: 'blockquote' }),
    p('i', [{ text: 'const x = 1;\nx++', marks: [] }], { type: 'code_block' }),
    {
      id: 'j',
      type: 'attachment',
      inlines: [],
      src: 'https://cdn.test/a.png',
      name: 'a.png',
      mime: 'image/png',
      width: 640,
      height: 480,
      alt: '',
      align: 'center',
      status: 'ready',
    },
    {
      id: 'k',
      type: 'attachment',
      inlines: [],
      name: 'b.pdf',
      mime: 'application/pdf',
      status: 'uploading',
    },
    p('l', [{ text: '', marks: [] }]),
  ],
};

describe('fromRichDoc → toRichDoc', () => {
  it('round-trips every block type, mark, attachment attribute and list depth', () => {
    expect(strip(toRichDoc(fromRichDoc(rich)))).toEqual(strip(rich));
  });

  it('stores blocks in a Y.Map keyed by id, with order and Y.Text', () => {
    const doc = fromRichDoc(rich);
    const blocks = doc.getMap<Y.Map<unknown>>(BLOCKS);
    const out = toRichDoc(doc);
    expect(blocks.size).toBe(rich.blocks.length);
    for (const b of out.blocks) {
      const m = blocks.get(b.id)!;
      expect(m.get('id')).toBe(b.id);
      expect(typeof m.get('order')).toBe('string');
      expect(m.get('text')).toBeInstanceOf(Y.Text);
    }
  });

  it('stores marks as Y.Text attributes', () => {
    const doc = fromRichDoc({ blocks: [rich.blocks[3]] });
    const m = [...doc.getMap<Y.Map<unknown>>(BLOCKS).values()][0];
    const delta = (m.get('text') as Y.Text).toDelta();
    expect(delta[1].attributes).toEqual({
      link: { href: 'https://x.test' },
      textColor: 'red',
      bold: true,
    });
    expect(delta[2].attributes).toEqual({ mention: { id: 'u1', label: '@Ann' } });
  });

  it('does not share uploadError (it stays local to the uploader)', () => {
    const b: Block = {
      id: 'x',
      type: 'attachment',
      inlines: [],
      name: 'f',
      status: 'error',
      uploadError: 'Too big',
    };
    const [out] = toRichDoc(fromRichDoc({ blocks: [b] })).blocks;
    expect(out.status).toBe('error');
    expect(out).not.toHaveProperty('uploadError');
  });

  it('normalises inline runs: adjacent equal-mark runs merge, empty runs drop', () => {
    const d: RichDoc = {
      blocks: [
        p('a', [
          { text: 'a', marks: [{ type: 'bold' }, { type: 'italic' }] },
          { text: '', marks: [{ type: 'code' }] },
          { text: 'b', marks: [{ type: 'italic' }, { type: 'bold' }] },
          { text: 'c', marks: [] },
        ]),
      ],
    };
    expect(toRichDoc(fromRichDoc(d)).blocks[0].inlines).toEqual([
      { text: 'ab', marks: [{ type: 'bold' }, { type: 'italic' }] },
      { text: 'c', marks: [] },
    ]);
  });

  it('ignores malformed attributes from remote docs', () => {
    const doc = fromRichDoc({ blocks: [p('a', [{ text: 'hi', marks: [] }])] });
    const m = [...doc.getMap<Y.Map<unknown>>(BLOCKS).values()][0];
    (m.get('text') as Y.Text).format(0, 2, {
      link: 5,
      bold: 'yes',
      mention: { id: 1 },
      junk: true,
    });
    m.set('type', 'iframe');
    const [b] = toRichDoc(doc).blocks;
    expect(b.type).toBe('paragraph');
    expect(b.inlines).toEqual([{ text: 'hi', marks: [] }]);
  });
});

describe('hostile remote data', () => {
  const seeded = () => {
    const doc = fromRichDoc({ blocks: [p('a', [{ text: 'hi', marks: [] }])] });
    const blocks = doc.getMap<unknown>(BLOCKS);
    return { doc, blocks, m: [...blocks.values()][0] as Y.Map<unknown> };
  };

  it('sanitises block attributes', () => {
    const { doc, m } = seeded();
    for (const [k, v] of Object.entries({
      type: 'iframe',
      level: 99,
      depth: -1,
      width: NaN,
      height: Infinity,
      src: 'javascript:alert(1)',
      name: 5,
      alt: {},
      mime: null,
      align: 'justify',
      status: 'pwned',
      uploadedBy: -3,
    }))
      m.set(k, v);
    const [b] = toRichDoc(doc).blocks;
    expect(b).toEqual({ id: b.id, type: 'paragraph', inlines: [{ text: 'hi', marks: [] }] });
    expect(blockMeta(m)).toEqual({});
  });

  it('keeps valid values and drops only the bad ones', () => {
    const { doc, m } = seeded();
    m.set('type', 'heading');
    m.set('level', 2);
    m.set('depth', 1.5);
    const [b] = toRichDoc(doc).blocks;
    expect(b).toMatchObject({ type: 'heading', level: 2 });
    expect(b).not.toHaveProperty('depth');
    m.set('type', 'attachment');
    m.set('src', 'https://cdn.test/x.png');
    m.set('width', 10);
    m.set('height', 1e9);
    expect(toRichDoc(doc).blocks[0]).toMatchObject({ src: 'https://cdn.test/x.png', width: 10 });
    expect(toRichDoc(doc).blocks[0]).not.toHaveProperty('height');
  });

  it('sanitises mark attributes', () => {
    const { doc, m } = seeded();
    (m.get('text') as Y.Text).format(0, 2, {
      link: { href: 'javascript:alert(1)' },
      bold: 'yes',
      mention: { id: 1, label: 'x' },
      textColor: 'url(evil)',
      bgColor: 7,
      junk: true,
    });
    expect(toRichDoc(doc).blocks[0].inlines).toEqual([{ text: 'hi', marks: [] }]);
  });

  it('skips entries with a non-map value, non-string or mismatched id, or non-string order', () => {
    const { doc, blocks } = seeded();
    blocks.set('x', 5);
    const bad = (id: unknown, order: unknown) => {
      const m = blocks.set(`k${blocks.size}`, new Y.Map<unknown>());
      m.set('id', id);
      m.set('order', order);
      m.set('text', new Y.Text('evil'));
    };
    bad(42, 'a');
    bad('other', 'a');
    bad(`k${blocks.size}`, 7);
    const out = toRichDoc(doc);
    expect(out.blocks).toHaveLength(1);
    expect(out.blocks[0].inlines).toEqual([{ text: 'hi', marks: [] }]);
  });

  it('treats a non-Y.Text text as empty', () => {
    const { doc, m } = seeded();
    m.set('text', '<script>');
    expect(toRichDoc(doc).blocks[0].inlines).toEqual([{ text: '', marks: [] }]);
  });
});

describe('deterministic seeding', () => {
  it('two docs seeded from the same RichDoc merge without duplicates', () => {
    const a = fromRichDoc(rich);
    const b = fromRichDoc(rich);
    expect(a.clientID).not.toBe(0);
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
    expect(a.getMap(BLOCKS).size).toBe(rich.blocks.length);
    expect(toRichDoc(a)).toEqual(toRichDoc(b));
    expect(toRichDoc(a).blocks.map((x) => x.inlines)).toEqual(rich.blocks.map((x) => x.inlines));
  });

  it('two replicas seeded from DIFFERENT RichDocs keep both sets intact and converge', () => {
    const other: RichDoc = { blocks: [p('z', [{ text: 'other', marks: [{ type: 'bold' }] }])] };
    const a = fromRichDoc(rich);
    const b = fromRichDoc(other);
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
    const out = toRichDoc(a);
    expect(toRichDoc(b)).toEqual(out);
    expect(new Set(ids(out)).size).toBe(rich.blocks.length + 1);
    const texts = (d: RichDoc) => d.blocks.map((x) => JSON.stringify([x.type, x.inlines]));
    expect(texts(out).sort()).toEqual([...texts(rich), ...texts(other)].sort());
  });

  it('seeds under a content-derived, non-zero clientID', () => {
    const client = (d: RichDoc) => [
      ...Y.decodeStateVector(Y.encodeStateVector(fromRichDoc(d))).keys(),
    ];
    const [c1] = client(rich);
    expect(c1).not.toBe(0);
    expect(client(rich)).toEqual([c1]);
    expect(client({ blocks: [p('z', [{ text: 'x', marks: [] }])] })).not.toEqual([c1]);
  });

  // PINNED: the seed's clientID and ids are a hash of the canonical content. Clients on different
  // library versions that seed the same page must agree, or they write it twice (duplicate
  // content). If a change to ATTRS, MARK_ORDER, normalisation or the hash moves this value, it
  // splits mixed-version clients: ship it only as a deliberate, documented migration.
  it('seeds a fixed RichDoc under a fixed clientID and ids', () => {
    const d = fromRichDoc({
      blocks: [
        p('a', [{ text: 'Notes', marks: [] }], { type: 'heading', level: 2 }),
        p('b', [
          { text: 'plain ', marks: [] },
          { text: 'bold', marks: [{ type: 'bold' }] },
          { text: ' link', marks: [{ type: 'link', href: 'https://x.test' }] },
        ]),
        p('c', [{ text: 'item', marks: [{ type: 'textColor', color: 'red' }] }], {
          type: 'bullet_item',
          depth: 1,
        }),
        p('d', [], {
          type: 'attachment',
          name: 'f.png',
          mime: 'image/png',
          src: 'https://cdn.test/f.png',
          width: 10,
          height: 20,
          status: 'ready',
        }),
      ],
    });
    expect([...Y.decodeStateVector(Y.encodeStateVector(d)).keys()]).toEqual([232462597]);
    expect(ids(toRichDoc(d))).toEqual(['s3uehad_0', 's3uehad_1', 's3uehad_2', 's3uehad_3']);
  });

  it.each([
    [
      'mark order',
      [{ text: 'x', marks: [{ type: 'bold' }, { type: 'italic' }] }],
      [{ text: 'x', marks: [{ type: 'italic' }, { type: 'bold' }] }],
      {},
    ],
    [
      'split vs merged runs, empty runs',
      [{ text: 'ab', marks: [] }],
      [
        { text: 'a', marks: [] },
        { text: '', marks: [{ type: 'code' }] },
        { text: 'b', marks: [] },
      ],
      {},
    ],
    [
      'invalid attrs and marks',
      [{ text: 'ab', marks: [] }],
      [
        {
          text: 'ab',
          marks: [
            { type: 'link', href: 'javascript:x' },
            { type: 'textColor', color: '#f00' },
          ],
        },
      ],
      { level: 99, width: NaN },
    ],
  ] as [string, Block['inlines'], Block['inlines'], Partial<Block>][])(
    'seeds byte-identical updates for inputs that normalise equal: %s',
    (_n, x, y, junk) => {
      const enc = (inl: Block['inlines'], extra: Partial<Block>) =>
        Y.encodeStateAsUpdate(fromRichDoc({ blocks: [p('a', inl, extra)] }));
      expect(enc(y, junk)).toEqual(enc(x, {}));
    },
  );

  it('seeds an attachment with stray inline text identically to one without', () => {
    const a: Block = { id: 'a', type: 'attachment', inlines: [], name: 'f' };
    const enc = (b: Block) => Y.encodeStateAsUpdate(fromRichDoc({ blocks: [b] }));
    expect(enc({ ...a, inlines: [{ text: 'junk', marks: [] }] })).toEqual(enc(a));
  });

  it('seeded ids are unique and cannot collide with live `${clientID36}-${n}` ids', () => {
    const out = ids(toRichDoc(fromRichDoc(rich)));
    expect(new Set(out).size).toBe(out.length);
    for (const id of out) expect(id).not.toMatch(/^[0-9a-z]+-\d+$/);
  });

  it('seeds a supplied empty doc, keeping its own clientID', () => {
    const doc = new Y.Doc();
    const id = doc.clientID;
    expect(fromRichDoc(rich, doc)).toBe(doc);
    expect(doc.clientID).toBe(id);
    expect(strip(toRichDoc(doc))).toEqual(strip(rich));
  });

  it('re-seeding the same content after its blocks were deleted does nothing', () => {
    const doc = fromRichDoc(rich);
    const blocks = doc.getMap(BLOCKS);
    for (const k of [...blocks.keys()]) blocks.delete(k);
    fromRichDoc(rich, doc);
    expect(blocks.size).toBe(0);
  });

  it('is a no-op on a non-empty doc', () => {
    const doc = fromRichDoc(rich);
    const before = Y.encodeStateAsUpdate(doc);
    fromRichDoc({ blocks: [p('z', [{ text: 'other', marks: [] }])] }, doc);
    expect(Y.encodeStateAsUpdate(doc)).toEqual(before);
  });
});

describe('toRichDoc of an empty doc', () => {
  it('returns one empty paragraph without writing to the doc', () => {
    const doc = new Y.Doc();
    let updates = 0;
    doc.on('update', () => updates++);
    const out = toRichDoc(doc);
    expect(strip(out)).toEqual(strip(emptyDoc()));
    expect(updates).toBe(0);
    expect(doc.getMap(BLOCKS).size).toBe(0);
  });

  it('gives a stable id equal to seeding that paragraph', () => {
    const empty = toRichDoc(new Y.Doc());
    expect(toRichDoc(new Y.Doc())).toEqual(empty);
    expect(toRichDoc(fromRichDoc(empty))).toEqual(empty);
  });
});

describe('blockMeta', () => {
  it('reads the Y-only uploadedBy without putting it on Block', () => {
    const doc = fromRichDoc({ blocks: [rich.blocks[10]] });
    const m = [...doc.getMap<Y.Map<unknown>>(BLOCKS).values()][0];
    expect(blockMeta(m)).toEqual({});
    m.set('uploadedBy', 42);
    expect(blockMeta(m)).toEqual({ uploadedBy: 42 });
    expect(toRichDoc(doc).blocks[0]).not.toHaveProperty('uploadedBy');
  });
});
