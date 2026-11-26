// bridge.ts — RichDoc ⇄ Y.Doc diffing and selection remapping. See the DS-92 spec, "Sync layer".
import * as Y from 'yjs';
import type { Block, Inline, Point, Range, RichDoc } from '../components/RichText/engine/model';
import { MARK_ORDER, marksEqual } from '../components/RichText/engine/marks';
import {
  normalizeInlines,
  runsLength,
  runsText,
  sliceInlines,
} from '../components/RichText/engine/inlines';
import { compareOrder, orderBetween } from './order';
import {
  BLOCKS,
  blockToRich,
  fromRichDoc,
  isBlockEntry,
  marksToAttrs,
  textRuns,
  toRichDoc,
  writeBlock,
} from './schema';

type YBlock = Y.Map<unknown>;
const blocksOf = (doc: Y.Doc) => doc.getMap<unknown>(BLOCKS);
const live = (blocks: Y.Map<unknown>, id: string): YBlock | null => {
  const m = blocks.get(id);
  return isBlockEntry(id, m) ? m : null;
};

/** Equal as the Y.Doc stores them: same type/attrs and normalised runs; `id` and `uploadError` ignored. */
function blockEqual(a: Block, b: Block): boolean {
  if (a === b) return true;
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof Block>) {
    if (k !== 'id' && k !== 'inlines' && k !== 'uploadError' && a[k] !== b[k]) return false;
  }
  const ra = normalizeInlines(a.inlines ?? []);
  const rb = normalizeInlines(b.inlines ?? []);
  return (
    ra.length === rb.length &&
    ra.every((r, i) => r.text === rb[i].text && marksEqual(r.marks, rb[i].marks))
  );
}

// Full attribute object: every mark key present, `null` for absent ones, so a write never
// inherits or keeps a neighbour's (or an invalid remote) formatting.
const fullAttrs = (marks: Inline['marks']) => ({
  ...Object.fromEntries(MARK_ORDER.map((k) => [k, null])),
  ...marksToAttrs(marks),
});

const isHigh = (c: number) => c >= 0xd800 && c <= 0xdbff;
const isLow = (c: number) => c >= 0xdc00 && c <= 0xdfff;

// Re-format `[from, …)` where the current runs' marks differ from the wanted runs' (same length).
function reformat(t: Y.Text, from: number, cur: Inline[], want: Inline[]) {
  let i = 0;
  let j = 0;
  let ci = 0;
  let wj = 0;
  let pos = from;
  while (i < cur.length && j < want.length) {
    const len = Math.min(cur[i].text.length - ci, want[j].text.length - wj);
    if (len > 0 && !marksEqual(cur[i].marks, want[j].marks))
      t.format(pos, len, fullAttrs(want[j].marks));
    pos += len;
    ci += len;
    wj += len;
    if (ci === cur[i].text.length) {
      i++;
      ci = 0;
    }
    if (wj === want[j].text.length) {
      j++;
      wj = 0;
    }
  }
}

// Apply the local text edit `base` → `inlines` to `t`: drop foreign embeds, splice the changed
// middle, re-mark the rest. Normally `t` reads as `base` and is diffed directly (it ends up equal to
// `inlines`). If `t` has diverged from `base` (remote text released by seeding), only the base →
// inlines splice is replayed at the same offsets, so the remote text survives.
function syncText(t: Y.Text, base: Inline[] | undefined, inlines: Inline[]) {
  let pos = 0;
  for (const d of t.toDelta() as { insert: unknown }[]) {
    if (typeof d.insert === 'string') pos += d.insert.length;
    else t.delete(pos, 1);
  }
  const yRuns = textRuns(t);
  const baseRuns = base ? normalizeInlines(base) : yRuns;
  const rebase = runsText(baseRuns) !== runsText(yRuns);
  const cur = rebase ? baseRuns : yRuns;
  const want = normalizeInlines(inlines);
  const a = runsText(cur);
  const b = runsText(want);
  const max = Math.min(a.length, b.length);
  let p = 0;
  while (p < max && a[p] === b[p]) p++;
  if (p > 0 && p < max && isHigh(a.charCodeAt(p - 1))) p--; // never split a surrogate pair
  let s = 0;
  while (s < max - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  if (s > 0 && isLow(a.charCodeAt(a.length - s))) s--;
  let at = Math.min(p, t.length);
  const del = Math.min(a.length - s - p, t.length - at);
  if (del > 0) t.delete(at, del);
  for (const r of sliceInlines(want, p, b.length - s)) {
    if (!r.text) continue;
    t.insert(at, r.text, fullAttrs(r.marks));
    at += r.text.length;
  }
  if (rebase) return;
  reformat(t, 0, sliceInlines(cur, 0, p), sliceInlines(want, 0, p));
  reformat(
    t,
    b.length - s,
    sliceInlines(cur, a.length - s, a.length),
    sliceInlines(want, b.length - s, b.length),
  );
}

// Indices of a longest strictly increasing subsequence of `xs` (patience sort), as a mask.
function lisMask<T>(xs: T[], cmp: (a: T, b: T) => number): boolean[] {
  const tails: number[] = [];
  const back: number[] = [];
  xs.forEach((x, i) => {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cmp(xs[tails[mid]], x) < 0) lo = mid + 1;
      else hi = mid;
    }
    back[i] = lo > 0 ? tails[lo - 1] : -1;
    tails[lo] = i;
  });
  const keep = xs.map(() => false);
  for (let i = tails.length ? tails[tails.length - 1] : -1; i >= 0; i = back[i]) keep[i] = true;
  return keep;
}

// `k` keys strictly between `lo` and `hi`, or null when the bounds are unusable.
function keysBetween(lo: string | null, hi: string | null, k: number): string[] | null {
  const out: string[] = [];
  try {
    for (let a = lo; out.length < k; ) out.push((a = orderBetween(a, hi)));
  } catch {
    return null;
  }
  return out;
}

// `next` with every attr the local edit did not change (old → next) taken from the doc's current
// block, so a local edit never overwrites a concurrent remote attr change.
function rebaseAttrs(cur: Block, old: Block, next: Block): Block {
  const out = { ...next } as Record<string, unknown>;
  const o = old as unknown as Record<string, unknown>;
  const c = cur as unknown as Record<string, unknown>;
  for (const k of new Set([...Object.keys(cur), ...Object.keys(old), ...Object.keys(next)])) {
    if (k !== 'id' && k !== 'inlines' && o[k] === out[k]) out[k] = c[k];
  }
  return out as unknown as Block;
}

/**
 * Order keys for `next`'s blocks: blocks whose current keys already ascend in `next` order (a longest
 * such run) keep them; the rest (new or moved) get keys between their neighbours. When neighbours'
 * keys are unusable (collisions, foreign keys), the run widens over neighbours until it fits.
 */
function assignKeys(ids: string[], current: (string | null)[]): string[] {
  const n = ids.length;
  const present = current.flatMap((o, j) => (o === null ? [] : [{ j, order: o, id: ids[j] }]));
  const keep = lisMask(present, compareOrder);
  const keys: (string | null)[] = ids.map(() => null);
  present.forEach((e, k) => keep[k] && (keys[e.j] = e.order));
  for (let s = 0; s < n; s++) {
    if (keys[s] !== null) continue;
    let e = s;
    while (e + 1 < n && keys[e + 1] === null) e++;
    for (let right = true; ; right = !right) {
      const run = keysBetween(
        s > 0 ? keys[s - 1] : null,
        e < n - 1 ? keys[e + 1] : null,
        e - s + 1,
      );
      if (run) {
        run.forEach((key, k) => (keys[s + k] = key));
        break;
      }
      if ((right || s === 0) && e < n - 1) {
        e++;
        while (e + 1 < n && keys[e + 1] === null) e++;
      } else s--;
    }
    s = e;
  }
  return keys as string[];
}

/**
 * Apply a local editor change (`prev` → `next`) to `doc` in one transaction tagged `origin`.
 * Blocks diff by id (delete / insert / `order`-only moves that keep the `Y.Text`); attrs via
 * `set`/`delete`; text via a prefix/suffix splice plus re-formatting of re-marked runs. The first
 * edit of an empty doc seeds the placeholder paragraph (`fromRichDoc`, deterministic, so clients
 * doing it concurrently collapse) in its own untracked transaction first. Never throws on foreign
 * order keys: it re-keys the neighbouring run instead.
 *
 * Returns the `RichDoc` the editor should now show: `next`, except when seeding released remote
 * updates that were waiting on the seeded paragraph — then the merged `toRichDoc(doc)`.
 * @internal
 */
export function applyLocal(doc: Y.Doc, prev: RichDoc, next: RichDoc, origin: unknown): RichDoc {
  const unchanged =
    prev.blocks.length === next.blocks.length &&
    next.blocks.every((b, i) => b.id === prev.blocks[i].id && blockEqual(b, prev.blocks[i]));
  if (unchanged) return next;
  const blocks = blocksOf(doc);
  let merged = false;
  if (![...blocks.entries()].some(([k, v]) => isBlockEntry(k, v))) {
    fromRichDoc(toRichDoc(doc), doc);
    const now = toRichDoc(doc).blocks;
    merged =
      now.length !== prev.blocks.length || !now.every((b, i) => blockEqual(b, prev.blocks[i]));
  }
  doc.transact(() => {
    const nextIds = new Set(next.blocks.map((b) => b.id));
    for (const b of prev.blocks) if (!nextIds.has(b.id) && blocks.has(b.id)) blocks.delete(b.id);
    const ms = next.blocks.map((b) => live(blocks, b.id));
    const keys = assignKeys(
      next.blocks.map((b) => b.id),
      ms.map((m) => (m ? (m.get('order') as string) : null)),
    );
    const prevById = new Map(prev.blocks.map((b) => [b.id, b]));
    next.blocks.forEach((b, j) => {
      let m = ms[j];
      if (!m) {
        m = blocks.set(b.id, new Y.Map<unknown>());
        m.set('order', keys[j]);
        writeBlock(m, { ...b, inlines: normalizeInlines(b.inlines ?? []) });
        return;
      }
      if (m.get('order') !== keys[j]) m.set('order', keys[j]);
      if (prevById.get(b.id) === b) return;
      const old = prevById.get(b.id);
      writeBlock(m, old ? rebaseAttrs(blockToRich(m), old, b) : b);
      const t = m.get('text');
      if (t instanceof Y.Text) syncText(t, old?.inlines, b.inlines ?? []);
    });
  }, origin);
  return merged ? toRichDoc(doc) : next;
}

// The `blocks` key of the block map an event happened in (or under).
function touchedKey(blocks: Y.Map<unknown>, target: Y.AbstractType<unknown>): string | null {
  let t = target;
  while (t._item && t._item.parent !== blocks) t = t._item.parent as Y.AbstractType<unknown>;
  return t._item?.parentSub ?? null;
}

/**
 * The `RichDoc` after remote `events` (from `blocks.observeDeep`): only blocks the events touched are
 * re-read; every other block, and any rebuilt block that reads back equal, keeps its object identity
 * (and `prev` itself is returned when nothing visible changed). A rebuilt `error` attachment keeps
 * `prev`'s local `uploadError`. Equals `toRichDoc(doc)` up to normalisation.
 * @internal
 */
export function readChanged(
  doc: Y.Doc,
  prev: RichDoc,
  events: readonly Y.YEvent<Y.AbstractType<unknown>>[],
): RichDoc {
  const blocks = blocksOf(doc);
  const touched = new Set<string>();
  for (const e of events) {
    if (e instanceof Y.YMapEvent && e.target === blocks)
      e.keysChanged.forEach((k) => touched.add(k));
    else {
      const k = touchedKey(blocks, e.target as Y.AbstractType<unknown>);
      if (k !== null) touched.add(k);
    }
  }
  const prevById = new Map(prev.blocks.map((b) => [b.id, b]));
  const entries = [...blocks.entries()]
    .filter((e): e is [string, YBlock] => isBlockEntry(...e))
    .map(([id, m]) => ({ id, order: m.get('order') as string, m }))
    .sort(compareOrder);
  const out = entries.length
    ? entries.map(({ id, m }) => {
        const old = prevById.get(id);
        if (old && !touched.has(id)) return old;
        const b = blockToRich(m);
        if (old && blockEqual(old, b)) return old;
        if (old?.uploadError !== undefined && b.status === 'error') b.uploadError = old.uploadError;
        return b;
      })
    : toRichDoc(doc).blocks.map((b) => {
        const old = prevById.get(b.id);
        return old && blockEqual(old, b) ? old : b;
      });
  return out.length === prev.blocks.length && out.every((b, i) => b === prev.blocks[i])
    ? prev
    : { ...prev, blocks: out };
}

/**
 * One end of a selection, portable across edits: the block id and a base64 `Y.RelativePosition` in
 * that block's `Y.Text` (`null` when the block is not in the doc yet, e.g. the empty-doc placeholder).
 * @internal
 */
export interface CollabPoint {
  /** Block the point was in when encoded; used to fall back when the block is gone. */
  blockId: string;
  /** Base64 `Y.encodeRelativePosition` output, or `null`. */
  rel: string | null;
}

/**
 * A selection encoded against a `Y.Doc` (see `encodeSelection`).
 * @internal
 */
export interface CollabSelection {
  /** Encoded `Range.anchor`. */
  anchor: CollabPoint;
  /** Encoded `Range.focus`. */
  focus: CollabPoint;
}

const toB64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function encodePoint(blocks: Y.Map<unknown>, p: Point, assoc: number): CollabPoint {
  const t = live(blocks, p.blockId)?.get('text');
  if (!(t instanceof Y.Text)) return { blockId: p.blockId, rel: null };
  const rel = Y.createRelativePositionFromTypeIndex(t, Math.min(p.offset, t.length), assoc);
  return { blockId: p.blockId, rel: toB64(Y.encodeRelativePosition(rel)) };
}

/**
 * Encode a selection as relative positions so it survives concurrent edits. Association: a caret
 * sticks to the character before it (`assoc -1`), so remote text typed exactly at the caret lands
 * after it and the caret stays put (at a block start it stays at the start). A range's start sticks
 * to its first character and its end to its last, so remote text at either edge stays outside it.
 * @internal
 */
export function encodeSelection(doc: Y.Doc, sel: Range | null): CollabSelection | null {
  if (!sel) return null;
  const blocks = blocksOf(doc);
  const { anchor, focus } = sel;
  let anchorFirst: boolean | null = null; // null = collapsed
  if (anchor.blockId === focus.blockId) {
    if (anchor.offset !== focus.offset) anchorFirst = anchor.offset < focus.offset;
  } else {
    const a = live(blocks, anchor.blockId);
    const f = live(blocks, focus.blockId);
    if (a && f) {
      anchorFirst =
        compareOrder(
          { order: a.get('order') as string, id: anchor.blockId },
          { order: f.get('order') as string, id: focus.blockId },
        ) < 0;
    }
  }
  return {
    anchor: encodePoint(blocks, anchor, anchorFirst === true ? 0 : -1),
    focus: encodePoint(blocks, focus, anchorFirst === false ? 0 : -1),
  };
}

function decodePoint(doc: Y.Doc, p: CollabPoint, fallback: RichDoc): Point | null {
  if (typeof p?.blockId !== 'string') return null;
  const blocks = blocksOf(doc);
  const m = live(blocks, p.blockId);
  if (m) {
    const t = m.get('text');
    let offset = 0;
    if (typeof p.rel === 'string' && t instanceof Y.Text) {
      try {
        const abs = Y.createAbsolutePositionFromRelativePosition(
          Y.decodeRelativePosition(fromB64(p.rel)),
          doc,
        );
        if (abs?.type === t) offset = Math.min(abs.index, t.length);
      } catch {
        // Malformed (remote) data: fall back to the block start.
      }
    }
    return { blockId: p.blockId, offset };
  }
  // The block is gone: start of the next surviving block in `fallback` order, else end of the previous.
  const i = fallback.blocks.findIndex((b) => b.id === p.blockId);
  if (i >= 0) {
    for (let j = i + 1; j < fallback.blocks.length; j++)
      if (live(blocks, fallback.blocks[j].id)) return { blockId: fallback.blocks[j].id, offset: 0 };
    for (let j = i - 1; j >= 0; j--) {
      const pm = live(blocks, fallback.blocks[j].id);
      if (pm)
        return { blockId: fallback.blocks[j].id, offset: runsLength(blockToRich(pm).inlines) };
    }
  }
  return { blockId: toRichDoc(doc).blocks[0].id, offset: 0 };
}

/**
 * Decode a `CollabSelection` against the doc's current state. A point whose block was deleted moves to
 * the nearest surviving point (`fallback` — the view the selection was encoded against — gives the old
 * block order). Returns `null` for `null` or malformed input.
 * @internal
 */
export function decodeSelection(
  doc: Y.Doc,
  sel: CollabSelection | null,
  fallback: RichDoc,
): Range | null {
  if (!sel) return null;
  const anchor = decodePoint(doc, sel.anchor, fallback);
  const focus = decodePoint(doc, sel.focus, fallback);
  return anchor && focus ? { anchor, focus } : null;
}
