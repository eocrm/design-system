// @vitest-environment node
import * as Y from 'yjs';
import { describe, expect, it } from 'vitest';
import type { Block, BlockType, Inline, Mark, RichDoc } from '../components/RichText/engine/model';
import { MARK_ORDER, toggleMark } from '../components/RichText/engine/marks';
import {
  mapMarksOverRange,
  normalizeInlines,
  runsLength,
  sliceInlines,
} from '../components/RichText/engine/inlines';
import { BLOCKS, fromRichDoc, isBlockEntry, toRichDoc } from './schema';
import { applyLocal, decodeSelection, encodeSelection, readChanged } from './bridge';

const LOCAL = Symbol('local');
const REMOTE = 'remote';

// What toRichDoc reads back: marks in MARK_ORDER, normalised runs, attachments run-less,
// no uploadError (local-only).
function norm(d: RichDoc): RichDoc {
  return {
    blocks: d.blocks.map(({ uploadError: _e, ...b }) => {
      const runs = (b.inlines ?? []).map((r) => ({
        text: r.text,
        marks: [...r.marks].sort((x, y) => MARK_ORDER.indexOf(x.type) - MARK_ORDER.indexOf(y.type)),
      }));
      return { ...b, inlines: b.type === 'attachment' ? [] : normalizeInlines(runs) };
    }),
  };
}

const run = (text: string, ...marks: Mark[]): Inline => ({ text, marks });
const blk = (id: string, inlines: Inline[], extra: Partial<Block> = {}): Block => ({
  id,
  type: 'paragraph',
  inlines,
  ...extra,
});
const B: Mark = { type: 'bold' };
const I: Mark = { type: 'italic' };

/** A replica: a Y.Doc plus the editor's view, kept current via readChanged on remote events. */
function replica(client: number) {
  const doc = new Y.Doc();
  doc.clientID = client;
  const r = { doc, view: toRichDoc(doc) };
  doc.getMap(BLOCKS).observeDeep((events, tr) => {
    if (tr.origin !== LOCAL) r.view = readChanged(doc, r.view, events);
  });
  return r;
}
type Replica = ReturnType<typeof replica>;

/** Apply a local edit and assert the core invariant. */
function edit(r: Replica, next: RichDoc, prev = r.view) {
  r.view = applyLocal(r.doc, prev, next, LOCAL);
  expect(toRichDoc(r.doc)).toEqual(norm(r.view));
}

function sync(...rs: Replica[]) {
  for (const a of rs)
    for (const b of rs)
      if (a !== b)
        Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc, Y.encodeStateVector(b.doc)), REMOTE);
}

function seeded(rich: RichDoc, client = 1): Replica {
  const r = replica(client);
  fromRichDoc(rich, r.doc);
  r.view = toRichDoc(r.doc);
  return r;
}

const base: RichDoc = {
  blocks: [
    blk('x', [run('hello '), run('bold', B), run(' world')]),
    blk('y', [run('second')]),
    blk('z', [run('third')], { type: 'bullet_item', depth: 0 }),
  ],
};

const setBlock = (d: RichDoc, i: number, b: Partial<Block>): RichDoc => ({
  blocks: d.blocks.map((x, j) => (j === i ? { ...x, ...b } : x)),
});

describe('applyLocal', () => {
  it('typing inside a run and at a run boundary', () => {
    const r = seeded(base);
    const [x] = r.view.blocks;
    edit(r, setBlock(r.view, 0, { inlines: [run('hello! '), run('bold', B), run(' world')] }));
    edit(r, setBlock(r.view, 0, { inlines: [run('hello! '), run('boldX', B), run(' world')] }));
    expect(x.id).toBe(r.view.blocks[0].id);
  });

  it('deleting across runs', () => {
    const r = seeded(base);
    edit(r, setBlock(r.view, 0, { inlines: [run('hel'), run('ld')] }));
  });

  it('toggling a mark on a range (incl. link, mention, colours) without changing text', () => {
    const r = seeded(base);
    const marks: Mark[] = [
      I,
      { type: 'link', href: 'https://a.test' },
      { type: 'mention', id: 'u1', label: 'Ann' },
      { type: 'textColor', color: 'red' },
      { type: 'bgColor', color: 'yellow' },
    ];
    for (const m of marks) {
      const inl = mapMarksOverRange(r.view.blocks[0].inlines, 3, 12, (ms) => toggleMark(ms, m));
      edit(r, setBlock(r.view, 0, { inlines: inl }));
    }
    // and off again
    edit(r, setBlock(r.view, 0, { inlines: [run('hello bold world')] }));
  });

  it('typing and re-marking in one edit', () => {
    const r = seeded(base);
    edit(r, setBlock(r.view, 0, { inlines: [run('he', I), run('LLO bold'), run(' world', B)] }));
  });

  it('a surrogate pair is replaced whole', () => {
    const r = seeded({ blocks: [blk('e', [run('a😀b')])] });
    edit(r, setBlock(r.view, 0, { inlines: [run('a😃b')] }));
  });

  it('splitting and merging blocks keeps the original Y.Text', () => {
    const r = seeded(base);
    const id = r.view.blocks[0].id;
    const text = r.doc.getMap<Y.Map<unknown>>(BLOCKS).get(id)!.get('text');
    const [x, ...rest] = r.view.blocks;
    edit(r, {
      blocks: [
        { ...x, inlines: [run('hello '), run('bo', B)] },
        blk('n1', [run('ld', B), run(' world')]),
        ...rest,
      ],
    });
    edit(r, { blocks: [x, ...rest] });
    expect(r.doc.getMap<Y.Map<unknown>>(BLOCKS).get(id)!.get('text')).toBe(text);
    expect(r.doc.getMap(BLOCKS).has('n1')).toBe(false);
  });

  it('changing type, heading level and list depth', () => {
    const r = seeded(base);
    edit(r, setBlock(r.view, 1, { type: 'heading', level: 2 }));
    edit(r, setBlock(r.view, 1, { level: 3 }));
    edit(r, setBlock(r.view, 1, { type: 'code_block', level: undefined }));
    edit(r, setBlock(r.view, 2, { depth: 2 }));
    edit(r, setBlock(r.view, 2, { type: 'paragraph', depth: undefined }));
  });

  it('moving a block changes only its order and keeps its Y.Text', () => {
    const r = seeded(base);
    const blocks = r.doc.getMap<Y.Map<unknown>>(BLOCKS);
    const [x, y, z] = r.view.blocks;
    const texts = [x, y, z].map((b) => blocks.get(b.id)!.get('text'));
    const orders = [x, y, z].map((b) => blocks.get(b.id)!.get('order'));
    edit(r, { blocks: [y, z, x] });
    expect([x, y, z].map((b) => blocks.get(b.id)!.get('text'))).toEqual(texts);
    // only x was re-keyed
    expect(blocks.get(y.id)!.get('order')).toBe(orders[1]);
    expect(blocks.get(z.id)!.get('order')).toBe(orders[2]);
    expect(blocks.get(x.id)!.get('order')).not.toBe(orders[0]);
    edit(r, { blocks: [z, x, y] });
  });

  it('inserting, updating and deleting an attachment (uploadError stays local)', () => {
    const r = seeded(base);
    const att: Block = {
      id: 'a1',
      type: 'attachment',
      inlines: [],
      name: 'a.png',
      mime: 'image/png',
      status: 'uploading',
    };
    edit(r, { blocks: [r.view.blocks[0], att, ...r.view.blocks.slice(1)] });
    edit(r, setBlock(r.view, 1, { status: 'error', uploadError: 'Too big' }));
    expect(r.doc.getMap<Y.Map<unknown>>(BLOCKS).get('a1')!.has('uploadError')).toBe(false);
    edit(r, setBlock(r.view, 1, { status: 'ready', src: 'https://cdn.test/a.png' }));
    edit(r, { blocks: r.view.blocks.filter((b) => b.id !== 'a1') });
  });

  it('no-op edits write nothing', () => {
    const r = seeded(base);
    const sv = Y.encodeStateVector(r.doc);
    applyLocal(r.doc, r.view, { blocks: [...r.view.blocks] }, LOCAL);
    expect(Y.encodeStateVector(r.doc)).toEqual(sv);
  });

  it('the first edit of an empty doc seeds the placeholder; two clients collapse into one paragraph', () => {
    const a = replica(1);
    const b = replica(2);
    const [pa] = a.view.blocks;
    edit(a, { blocks: [{ ...pa, inlines: [run('A')] }] });
    edit(b, { blocks: [{ ...b.view.blocks[0], inlines: [run('B')] }] });
    sync(a, b);
    const ra = toRichDoc(a.doc);
    expect(ra).toEqual(toRichDoc(b.doc));
    expect(ra.blocks).toHaveLength(1);
    expect(ra.blocks[0].id).toBe(pa.id);
    expect(['AB', 'BA']).toContain(ra.blocks[0].inlines.map((x) => x.text).join(''));
  });

  it('seeding that releases a pending remote update returns the merged doc', () => {
    const a = replica(1);
    const b = replica(2);
    fromRichDoc(toRichDoc(a.doc), a.doc); // a seeds (as its first edit would)…
    const sv = Y.encodeStateVector(a.doc);
    edit(a, { blocks: [{ ...a.view.blocks[0], type: 'heading', level: 1, inlines: [run('A')] }] });
    // …b gets only a's edit of the seeded paragraph, which waits on the seed b does not have yet.
    Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc, sv), REMOTE);
    expect(toRichDoc(b.doc).blocks[0].type).toBe('paragraph');
    edit(b, { blocks: [{ ...b.view.blocks[0], inlines: [run('B')] }] });
    expect(b.view.blocks[0]).toMatchObject({ type: 'heading' });
    expect(['AB', 'BA']).toContain(b.view.blocks[0].inlines.map((x) => x.text).join(''));
  });

  it('repairs corrupt or colliding neighbour orders instead of throwing', () => {
    const r = seeded(base);
    const blocks = r.doc.getMap<Y.Map<unknown>>(BLOCKS);
    const [x, y, z] = r.view.blocks;
    // x and y collide; z carries a non-canonical key that still sorts last.
    blocks.get(x.id)!.set('order', 'V');
    blocks.get(y.id)!.set('order', 'V');
    blocks.get(z.id)!.set('order', 'W0');
    r.view = toRichDoc(r.doc);
    const [p, q, s] = r.view.blocks;
    edit(r, {
      blocks: [p, blk('n1', [run('between')]), q, blk('n2', [run('after')]), s, blk('n3', [])],
    });
  });

  describe('a stale prev (remote changes in the doc, not yet in the view)', () => {
    // Deliver to `r` without its view hearing of it; `r` then edits from its old view.
    const quiet = (r: Replica, u: () => void) => {
      const v = r.view;
      u();
      r.view = v;
    };

    it('text: the local splice is shifted past remote text', () => {
      const a = seeded({ blocks: [blk('x', [run('hello')])] }, 1);
      const b = seeded({ blocks: [blk('x', [run('hello')])] }, 2);
      edit(a, setBlock(a.view, 0, { inlines: [run('RRhello')] }));
      quiet(b, () => sync(a, b));
      edit(b, setBlock(b.view, 0, { inlines: [run('hello!')] }));
      expect(b.view.blocks[0].inlines).toEqual([run('RRhello!')]);
    });

    it('text: remote text inside a locally deleted span survives', () => {
      const a = seeded({ blocks: [blk('x', [run('abcdef')])] }, 1);
      const b = seeded({ blocks: [blk('x', [run('abcdef')])] }, 2);
      edit(a, setBlock(a.view, 0, { inlines: [run('abcXdef')] }));
      quiet(b, () => sync(a, b));
      edit(b, setBlock(b.view, 0, { inlines: [run('af')] }));
      expect(b.view.blocks[0].inlines).toEqual([run('aXf')]);
    });

    it('text: a local delete overlapping a remote replace keeps the remote text', () => {
      const a = seeded({ blocks: [blk('x', [run('abcdef')])] }, 1);
      const b = seeded({ blocks: [blk('x', [run('abcdef')])] }, 2);
      edit(a, setBlock(a.view, 0, { inlines: [run('abZef')] })); // "cd" → "Z"
      quiet(b, () => sync(a, b));
      edit(b, setBlock(b.view, 0, { inlines: [run('aYf')] })); // "bcde" → "Y"
      expect(b.view.blocks[0].inlines).toEqual([run('aYZf')]);
    });

    it('marks: a remote mark on other text is kept; a local mark is added per key', () => {
      const a = seeded({ blocks: [blk('x', [run('hello world')])] }, 1);
      const b = seeded({ blocks: [blk('x', [run('hello world')])] }, 2);
      edit(a, setBlock(a.view, 0, { inlines: [run('hello '), run('world', B)] }));
      quiet(b, () => sync(a, b));
      edit(b, setBlock(b.view, 0, { inlines: [run('hel', I), run('lo world')] }));
      expect(b.view.blocks[0].inlines).toEqual([run('hel', I), run('lo '), run('world', B)]);
    });

    it('attrs: a remote type change is kept while the local text edit applies', () => {
      const [a, b] = [seeded(base, 1), seeded(base, 2)];
      edit(a, setBlock(a.view, 1, { type: 'heading', level: 2 }));
      quiet(b, () => sync(a, b));
      edit(b, setBlock(b.view, 1, { inlines: [run('second!')] }));
      expect(b.view.blocks[1]).toMatchObject({
        type: 'heading',
        level: 2,
        inlines: [run('second!')],
      });
    });

    it('a block deleted remotely stays deleted, even if edited locally', () => {
      const [a, b] = [seeded(base, 1), seeded(base, 2)];
      const gone = a.view.blocks[1].id;
      edit(a, { blocks: [a.view.blocks[0], a.view.blocks[2]] });
      quiet(b, () => sync(a, b));
      edit(b, setBlock(b.view, 1, { inlines: [run('back')] }));
      expect(b.view.blocks.map((x) => x.id)).not.toContain(gone);
    });

    it('a remote block the view lacks appears in the returned view', () => {
      const [a, b] = [seeded(base, 1), seeded(base, 2)];
      edit(a, { blocks: [...a.view.blocks, blk('n1', [run('new')])] });
      quiet(b, () => sync(a, b));
      const before = b.view;
      edit(b, setBlock(b.view, 0, { inlines: [run('x')] }));
      expect(b.view.blocks.map((x) => x.id)).toContain('n1');
      expect(b.view.blocks[1]).toBe(before.blocks[1]); // untouched blocks keep identity
    });
  });

  it('when seeding cannot make a block (junk-only or all-deleted doc), concurrent first edits both survive', () => {
    for (const prep of [
      (r: Replica) => r.doc.getMap(BLOCKS).set('junk', 'nope'),
      (r: Replica) => {
        edit(r, { blocks: [{ ...r.view.blocks[0], inlines: [run('seeded')] }] });
        r.doc.getMap(BLOCKS).delete(r.view.blocks[0].id);
      },
    ]) {
      const a = replica(1);
      const b = replica(2);
      prep(a);
      sync(a, b);
      expect(a.view.blocks).toHaveLength(1); // the placeholder
      edit(a, { blocks: [{ ...a.view.blocks[0], inlines: [run('A')] }] });
      edit(b, { blocks: [{ ...b.view.blocks[0], inlines: [run('B')] }] });
      sync(a, b);
      const texts = toRichDoc(a.doc).blocks.map((x) => x.inlines.map((i) => i.text).join(''));
      expect(texts.sort()).toEqual(['A', 'B']);
      expect(toRichDoc(b.doc)).toEqual(toRichDoc(a.doc));
    }
  });
});

describe('readChanged', () => {
  it('rebuilds only touched blocks and keeps the rest by identity', () => {
    const a = seeded(base, 1);
    const b = seeded(base, 2);
    const before = b.view;
    edit(a, setBlock(a.view, 1, { inlines: [run('second!')] }));
    sync(a, b);
    expect(norm(b.view)).toEqual(toRichDoc(b.doc));
    expect(b.view.blocks[0]).toBe(before.blocks[0]);
    expect(b.view.blocks[2]).toBe(before.blocks[2]);
    expect(b.view.blocks[1]).not.toBe(before.blocks[1]);
  });

  it('skips entries that are not blocks', () => {
    const a = seeded(base, 1);
    const b = seeded(base, 2);
    a.doc.getMap(BLOCKS).set('junk', 'nope');
    a.doc
      .getMap(BLOCKS)
      .set('alias', a.doc.getMap<Y.Map<unknown>>(BLOCKS).get(a.view.blocks[0].id)!.clone());
    sync(a, b);
    expect(b.view).toEqual(toRichDoc(b.doc));
    expect(b.view.blocks.map((x) => x.id)).toEqual(base.blocks.map((_, i) => b.view.blocks[i].id));
  });

  it('keeps the local uploadError on a rebuilt error block', () => {
    const a = seeded(base, 1);
    const b = seeded(base, 2);
    const att: Block = { id: 'a1', type: 'attachment', inlines: [], name: 'f', status: 'error' };
    edit(b, { blocks: [...b.view.blocks, { ...att, uploadError: 'Too big' }] });
    sync(a, b);
    edit(a, setBlock(a.view, 3, { name: 'g' }));
    sync(a, b);
    expect(b.view.blocks[3]).toMatchObject({ name: 'g', uploadError: 'Too big' });
  });
});

describe('selection remap', () => {
  const caret = (blockId: string, offset: number) => ({
    anchor: { blockId, offset },
    focus: { blockId, offset },
  });
  const setup = () => {
    const a = seeded(base, 1);
    const b = seeded(base, 2);
    return { a, b, id: a.view.blocks[2].id };
  };
  const remap = (b: Replica, sel: ReturnType<typeof caret>, fn: () => void, a: Replica) => {
    const fallback = b.view;
    const enc = encodeSelection(b.doc, sel);
    fn();
    sync(a, b);
    return decodeSelection(b.doc, enc, fallback);
  };

  it('null in, null out', () => {
    const { b } = setup();
    expect(encodeSelection(b.doc, null)).toBeNull();
    expect(decodeSelection(b.doc, null, b.view)).toBeNull();
  });

  it('a remote insert before the caret shifts it; at or after leaves it', () => {
    const { a, b, id } = setup(); // block z: "third"
    const at = (text: string) => () => edit(a, setBlock(a.view, 2, { inlines: [run(text)] }));
    expect(remap(b, caret(id, 3), at('XXthird'), a)).toEqual(caret(id, 5)); // before
    // at the caret: the caret sticks to the character before it (assoc -1), so remote text lands after it
    expect(remap(b, caret(id, 5), at('XXthiYrd'), a)).toEqual(caret(id, 5));
    expect(remap(b, caret(id, 5), at('XXthiYrdZ'), a)).toEqual(caret(id, 5)); // after
    expect(remap(b, caret(id, 0), at('0XXthiYrdZ'), a)).toEqual(caret(id, 0)); // at block start
  });

  it('a range does not grow when remote text lands on its edges', () => {
    const { a, b, id } = setup();
    const sel = { anchor: { blockId: id, offset: 1 }, focus: { blockId: id, offset: 4 } };
    // two edits: one splice replacing "hir" would (correctly) delete the selected characters
    const out = remap(
      b,
      sel,
      () => {
        edit(a, setBlock(a.view, 2, { inlines: [run('tXhird')] }));
        edit(a, setBlock(a.view, 2, { inlines: [run('tXhirYd')] }));
      },
      a,
    );
    expect(out).toEqual({ anchor: { blockId: id, offset: 2 }, focus: { blockId: id, offset: 5 } });
  });

  it('a cross-block range whose end block is not in the doc still keeps its live start outside remote text', () => {
    const { a, b } = setup();
    const y = b.view.blocks[1];
    const view = { blocks: [...b.view.blocks, blk('ghost', [run('zz')])] };
    const sel = { anchor: { blockId: y.id, offset: 1 }, focus: { blockId: 'ghost', offset: 1 } };
    const enc = encodeSelection(b.doc, sel, view);
    edit(a, setBlock(a.view, 1, { inlines: [run('sQecond')] })); // at the range start
    sync(a, b);
    expect(decodeSelection(b.doc, enc, view)!.anchor).toEqual({ blockId: y.id, offset: 2 });
  });

  it("the caret's block deleted → start of the next surviving block, else end of the previous", () => {
    const { a, b } = setup();
    const [x, y, z] = b.view.blocks;
    expect(
      remap(b, caret(y.id, 2), () => edit(a, { blocks: [a.view.blocks[0], a.view.blocks[2]] }), a),
    ).toEqual(caret(z.id, 0));
    expect(remap(b, caret(z.id, 2), () => edit(a, { blocks: [a.view.blocks[0]] }), a)).toEqual(
      caret(x.id, runsLength(x.inlines)),
    );
  });

  it('a block that moved keeps the caret', () => {
    const { a, b, id } = setup();
    const [x, y, z] = a.view.blocks;
    expect(remap(b, caret(id, 2), () => edit(a, { blocks: [z, x, y] }), a)).toEqual(caret(id, 2));
  });
});

describe('concurrent edits converge', () => {
  const pair = () => [seeded(base, 1), seeded(base, 2)] as const;
  const check = (...rs: Replica[]) => {
    sync(...rs);
    const want = toRichDoc(rs[0].doc);
    for (const r of rs) {
      expect(toRichDoc(r.doc)).toEqual(want);
      expect(norm(r.view)).toEqual(want);
    }
    return want;
  };

  it('typing at the same offset', () => {
    const [a, b] = pair();
    edit(a, setBlock(a.view, 1, { inlines: [run('secAond')] }));
    edit(b, setBlock(b.view, 1, { inlines: [run('secBond')] }));
    const t = check(a, b)
      .blocks[1].inlines.map((x) => x.text)
      .join('');
    expect(['secABond', 'secBAond']).toContain(t);
  });

  it('typing in a block the other replica moves', () => {
    const [a, b] = pair();
    const [x, y, z] = a.view.blocks;
    edit(a, { blocks: [z, x, y] });
    edit(b, setBlock(b.view, 2, { inlines: [run('third!')] }));
    const d = check(a, b);
    expect(d.blocks[0]).toMatchObject({ id: z.id, inlines: [run('third!')] });
  });

  it('typing in a block the other replica deletes', () => {
    const [a, b] = pair();
    edit(a, { blocks: [a.view.blocks[0], a.view.blocks[2]] });
    edit(b, setBlock(b.view, 1, { inlines: [run('second!')] }));
    expect(check(a, b).blocks).toHaveLength(2);
  });

  it('both replicas moving the same block', () => {
    const [a, b] = pair();
    const [x, y, z] = a.view.blocks;
    edit(a, { blocks: [y, z, x] });
    edit(b, { blocks: [y, x, z] });
    expect(check(a, b).blocks).toHaveLength(3);
  });

  it('a type change and typing in the same block both survive', () => {
    const [a, b] = pair();
    edit(a, setBlock(a.view, 1, { type: 'heading', level: 1 }));
    edit(b, setBlock(b.view, 1, { inlines: [run('second!')] }));
    expect(check(a, b).blocks[1]).toMatchObject({ type: 'heading', inlines: [run('second!')] });
  });
});

// ---- Randomised convergence -------------------------------------------------------------------

// mulberry32: tiny seeded PRNG so failures replay exactly.
function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TEXT_TYPES: BlockType[] = [
  'paragraph',
  'heading',
  'bullet_item',
  'ordered_item',
  'blockquote',
  'code_block',
];
const RANDOM_MARKS: Mark[] = [
  B,
  I,
  { type: 'underline' },
  { type: 'strike' },
  { type: 'code' },
  { type: 'link', href: 'https://a.test' },
  { type: 'link', href: 'https://b.test' },
  { type: 'mention', id: 'u1', label: 'Ann' },
  { type: 'textColor', color: 'red' },
  { type: 'textColor', color: 'blue' },
  { type: 'bgColor', color: 'yellow' },
];

type OpKind = 'edit' | 'move' | 'delete' | 'none';
/** What the last `randomOp` did, and to which block (for the concurrency counters). */
let lastOp: { kind: OpKind; id: string } = { kind: 'none', id: '' };

/** One random editor-level edit of `d`: a pure function of (d, rnd, newId). */
function randomOp(d: RichDoc, rnd: () => number, newId: () => string): RichDoc {
  const int = (n: number) => Math.floor(rnd() * n);
  const pick = <T>(xs: readonly T[]) => xs[int(xs.length)];
  const blocks = d.blocks;
  const i = int(blocks.length);
  const b = blocks[i];
  lastOp = { kind: 'edit', id: b.id };
  const isText = b.type !== 'attachment';
  const len = runsLength(b.inlines);
  const replace = (...bs: Block[]) => ({
    blocks: [...blocks.slice(0, i), ...bs, ...blocks.slice(i + 1)],
  });
  const withType = (t: BlockType): Block => {
    const { level: _l, depth: _d, ...rest } = b;
    if (t === 'heading') return { ...rest, type: t, level: pick([1, 2, 3] as const) };
    if (t === 'bullet_item' || t === 'ordered_item') return { ...rest, type: t, depth: int(3) };
    return { ...rest, type: t };
  };
  // Weighted so the doc grows to a few dozen blocks: typing ×4, splits ×2, block deletes rare.
  switch (int(16)) {
    case 0:
    case 1:
    case 14:
    case 15: {
      if (!isText) break;
      const at = int(len + 1);
      const marks =
        rnd() < 0.3
          ? [pick(RANDOM_MARKS)]
          : (sliceInlines(b.inlines, Math.max(0, at - 1), at)[0]?.marks ?? []);
      const text = pick(['a', 'b', 'xy', ' ', 'hello']);
      const inl = [
        ...sliceInlines(b.inlines, 0, at),
        { text, marks },
        ...sliceInlines(b.inlines, at, len),
      ];
      return replace({ ...b, inlines: normalizeInlines(inl) });
    }
    case 2: {
      // delete across runs
      if (!isText || len === 0) break;
      const s = int(len);
      const e = s + 1 + int(Math.min(6, len - s));
      return replace({
        ...b,
        inlines: normalizeInlines([
          ...sliceInlines(b.inlines, 0, s),
          ...sliceInlines(b.inlines, e, len),
        ]),
      });
    }
    case 3:
    case 13: {
      // toggle a mark on a range
      if (!isText || len === 0) break;
      const s = int(len);
      const e = s + 1 + int(len - s);
      const m = pick(RANDOM_MARKS);
      return replace({
        ...b,
        inlines: mapMarksOverRange(b.inlines, s, e, (ms) => toggleMark(ms, m)),
      });
    }
    case 4:
    case 10: {
      // split
      if (!isText) break;
      const at = int(len + 1);
      return replace(
        { ...b, inlines: sliceInlines(b.inlines, 0, at) },
        { ...b, id: newId(), inlines: sliceInlines(b.inlines, at, len) },
      );
    }
    case 5: {
      // merge with next
      const n = blocks[i + 1];
      if (!isText || !n || n.type === 'attachment') break;
      lastOp = { kind: 'delete', id: n.id };
      return {
        blocks: [
          ...blocks.slice(0, i),
          { ...b, inlines: normalizeInlines([...b.inlines, ...n.inlines]) },
          ...blocks.slice(i + 2),
        ],
      };
    }
    case 6: {
      if (!isText) break;
      if ((b.type === 'bullet_item' || b.type === 'ordered_item') && rnd() < 0.5)
        return replace({ ...b, depth: int(4) });
      return replace(withType(pick(TEXT_TYPES)));
    }
    case 7: {
      // move
      const rest = blocks.filter((_, j) => j !== i);
      const to = int(rest.length + 1);
      lastOp = { kind: 'move', id: b.id };
      return { blocks: [...rest.slice(0, to), b, ...rest.slice(to)] };
    }
    case 8:
    case 11: {
      // insert an attachment, or finish an upload
      if (rnd() < 0.5 && !isText)
        return replace({ ...b, status: 'ready', src: `https://cdn.test/${int(9)}.png` });
      const att: Block = {
        id: newId(),
        type: 'attachment',
        inlines: [],
        name: 'f.png',
        mime: 'image/png',
        status: 'uploading',
      };
      return replace(b, att);
    }
    case 9:
    case 12: {
      // delete a block (the merge in case 5 deletes too)
      if (blocks.length < 4 || rnd() < 0.5) break;
      lastOp = { kind: 'delete', id: b.id };
      return { blocks: blocks.filter((_, j) => j !== i) };
    }
  }
  lastOp = { kind: 'none', id: '' };
  return d; // no-op this round
}

describe('randomised convergence', () => {
  // Override to sweep seeds locally: SEED=n npx vitest run src/collab/bridge -t randomised
  const DEFAULT_SEED = 0xd5_92;
  const SEED = Number(process.env.SEED ?? DEFAULT_SEED);
  const OPS_PER_REPLICA = 300;

  it(`3 replicas × ${OPS_PER_REPLICA} random edits converge (seed ${SEED})`, () => {
    const rnd = prng(SEED);
    const rs = [1, 2, 3].map(replica);
    const counters = rs.map(() => 0);
    // Each in-flight update carries the op that produced it, to count real concurrent pairs.
    type Meta = { from: Replica; kind: OpKind; id: string };
    const inflight: { to: Replica; u: Uint8Array; meta: Meta }[] = [];
    let meta: Meta | null = null;
    rs.forEach((r) =>
      r.doc.on('update', (u: Uint8Array, origin: unknown) => {
        if (origin !== REMOTE)
          for (const to of rs)
            // Yjs re-emits released pending structs with origin null outside any op.
            if (to !== r) inflight.push({ to, u, meta: meta ?? { from: r, kind: 'none', id: '' } });
      }),
    );
    const deliver = (n: number, only?: Replica) => {
      for (let k = 0; k < n; k++) {
        const pool = inflight.filter((m) => !only || m.to === only);
        if (!pool.length) return;
        const msg = pool[Math.floor(rnd() * pool.length)];
        inflight.splice(inflight.indexOf(msg), 1);
        Y.applyUpdate(msg.to.doc, msg.u, REMOTE);
      }
    };
    const seen = { moveEdit: 0, deleteEdit: 0, sameBlockEdits: 0, moveMove: 0, stalePrev: 0 };
    const done = rs.map(() => 0);
    let step = 0;
    let peak = 0;
    try {
      while (done.some((n) => n < OPS_PER_REPLICA)) {
        step++;
        const ri = Math.floor(rnd() * rs.length);
        if (done[ri] >= OPS_PER_REPLICA) continue;
        done[ri]++;
        const r = rs[ri];
        // Sometimes edit from a stale view: deliver to r while its editor state stays behind.
        const prev = r.view;
        if (rnd() < 0.15) {
          deliver(1 + Math.floor(rnd() * 4), r);
          if (r.view !== prev) seen.stalePrev++;
        }
        const next = randomOp(prev, rnd, () => `${r.doc.clientID.toString(36)}-${++counters[ri]}`);
        // Concurrent pairs: an op on a block another replica changed in an update r hasn't seen yet.
        for (const m of inflight) {
          if (m.to !== r || m.meta.id !== lastOp.id || lastOp.kind === 'none') continue;
          const pair = [m.meta.kind, lastOp.kind].sort().join('+');
          if (pair === 'edit+move') seen.moveEdit++;
          if (pair === 'delete+edit') seen.deleteEdit++;
          if (pair === 'edit+edit') seen.sameBlockEdits++;
          if (pair === 'move+move') seen.moveMove++;
        }
        meta = { from: r, ...lastOp };
        edit(r, next, prev);
        meta = null;
        peak = Math.max(peak, r.view.blocks.length);
        if (rnd() < 0.5) deliver(Math.floor(rnd() * 8)); // random delays: some updates wait
      }
      while (inflight.length) deliver(inflight.length);
      const want = toRichDoc(rs[0].doc);
      for (const r of rs) {
        expect(toRichDoc(r.doc)).toEqual(want);
        expect(norm(r.view)).toEqual(want);
      }
      // Every view block is exactly one live Y entry, and the doc holds no block the view lacks.
      for (const r of rs) {
        const ids = r.view.blocks.map((b) => b.id);
        const blocks = r.doc.getMap(BLOCKS);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.every((id) => isBlockEntry(id, blocks.get(id)))).toBe(true);
        expect([...blocks.entries()].filter((e) => isBlockEntry(...e))).toHaveLength(ids.length);
      }
      expect(peak).toBeGreaterThanOrEqual(5); // coverage floor: the doc really grew
      if (SEED === DEFAULT_SEED) {
        // The fixed run must exercise every concurrency class (counts vary by seed).
        for (const [k, n] of Object.entries(seen)) expect(n, k).toBeGreaterThan(0);
      }
    } catch (e) {
      // Keep the assertion (and its diff), prefixed with what replays it.
      if (e instanceof Error) e.message = `seed=${SEED} step=${step}: ${e.message}`;
      throw e;
    }
  });
});
