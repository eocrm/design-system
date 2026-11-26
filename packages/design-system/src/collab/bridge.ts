// bridge.ts — RichDoc ⇄ Y.Doc diffing and selection remapping. See the DS-92 spec, "Sync layer".
import * as Y from 'yjs';
import type {
  Block,
  Inline,
  Mark,
  Point,
  Range,
  RichDoc,
} from '../components/RichText/engine/model';
import { MARK_ORDER, marksEqual } from '../components/RichText/engine/marks';
import {
  normalizeInlines,
  runsLength,
  runsText,
  sliceInlines,
} from '../components/RichText/engine/inlines';
import { compareOrder, orderBetween } from './order';
import { keptIndices } from './textDiff';
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

// The prefix/suffix splice turning `a` into `b`: `[p, a.length - s)` is replaced. Never splits a
// surrogate pair.
function splice(a: string, b: string): { p: number; s: number } {
  const max = Math.min(a.length, b.length);
  let p = 0;
  while (p < max && a[p] === b[p]) p++;
  if (p > 0 && p < max && isHigh(a.charCodeAt(p - 1))) p--;
  let s = 0;
  while (s < max - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  if (s > 0 && isLow(a.charCodeAt(a.length - s))) s--;
  return { p, s };
}

// Only the mark keys that differ between `from` and `to` (`to`'s value, or null to remove), so a
// re-format never touches marks a concurrent remote edit set.
function markDelta(from: Mark[], to: Mark[]): Record<string, unknown> | null {
  const f = marksToAttrs(from);
  const t = marksToAttrs(to);
  const out: Record<string, unknown> = {};
  for (const k of MARK_ORDER)
    if (JSON.stringify(f[k] ?? null) !== JSON.stringify(t[k] ?? null)) out[k] = t[k] ?? null;
  return Object.keys(out).length ? out : null;
}

interface MarkDiff {
  from: number;
  len: number;
  attrs: Record<string, unknown>;
}

// Segments (offset by `from`) where two same-length run lists carry different marks.
function markDiffs(base: Inline[], want: Inline[], from: number): MarkDiff[] {
  const out: MarkDiff[] = [];
  let i = 0;
  let j = 0;
  let bi = 0;
  let wj = 0;
  let pos = from;
  while (i < base.length && j < want.length) {
    const len = Math.min(base[i].text.length - bi, want[j].text.length - wj);
    const attrs = len > 0 ? markDelta(base[i].marks, want[j].marks) : null;
    if (attrs) out.push({ from: pos, len, attrs });
    pos += len;
    bi += len;
    wj += len;
    if (bi === base[i].text.length) {
      i++;
      bi = 0;
    }
    if (wj === want[j].text.length) {
      j++;
      wj = 0;
    }
  }
  return out;
}

/**
 * Apply the local text edit `base` → `inlines` to `t` (dropping foreign embeds first). The edit is a
 * prefix/suffix splice plus per-key re-marking of the kept prefix/suffix. When `t` has drifted from
 * `base` (a stale view: remote text already in the doc), the edit's offsets are mapped through a
 * character diff of base → `t`: each base offset goes to where its character now is (offsets inside
 * remotely deleted text go to the end of that change), only surviving base characters are deleted
 * or re-marked, and remote text inside a locally deleted span survives.
 */
function syncText(t: Y.Text, base: Inline[] | undefined, inlines: Inline[]) {
  let pos = 0;
  for (const d of t.toDelta() as { insert: unknown }[]) {
    if (typeof d.insert === 'string') pos += d.insert.length;
    else t.delete(pos, 1);
  }
  const yRuns = textRuns(t);
  const baseRuns = base ? normalizeInlines(base) : yRuns;
  const want = normalizeInlines(inlines);
  const a = runsText(baseRuns);
  const b = runsText(want);
  const y = runsText(yRuns);
  const { p, s } = splice(a, b); // local edit, base offsets
  // Base offset → `t` offset, and a base span's surviving characters as `t` spans. Identity on the
  // fast path; on a stale base, through a character diff of base → `t` (every remote hunk mapped).
  let map = (x: number) => x;
  let pieces = (lo: number, hi: number): [number, number][] => (hi > lo ? [[lo, hi]] : []);
  if (a !== y) {
    const keep = keptIndices(a, y);
    // A deleted base character maps to the next kept one: offsets inside remotely deleted (or
    // replaced) text land at the end of the remote change.
    map = (x) => {
      for (let j = x; j < a.length; j++) if (keep[j] >= 0) return keep[j];
      return y.length;
    };
    pieces = (lo, hi) => {
      const out: [number, number][] = [];
      for (let j = lo; j < hi; j++) {
        const k = keep[j];
        if (k < 0) continue;
        const last = out[out.length - 1];
        if (last && last[1] === k) last[1] = k + 1;
        else out.push([k, k + 1]);
      }
      return out;
    };
  }
  // Formats first (they move no offsets), then deletes right to left, then the insert.
  const diffs = [
    ...markDiffs(sliceInlines(baseRuns, 0, p), sliceInlines(want, 0, p), 0),
    ...markDiffs(
      sliceInlines(baseRuns, a.length - s, a.length),
      sliceInlines(want, b.length - s, b.length),
      a.length - s,
    ),
  ];
  for (const d of diffs)
    for (const [u, v] of pieces(d.from, d.from + d.len)) t.format(u, v - u, d.attrs);
  for (const [u, v] of pieces(p, a.length - s).reverse()) t.delete(u, v - u);
  let at = map(p);
  for (const run of sliceInlines(want, p, b.length - s)) {
    if (!run.text) continue;
    t.insert(at, run.text, fullAttrs(run.marks));
    at += run.text.length;
  }
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

// The doc as a `RichDoc`, sharing `base`'s block objects: a block not `reread` is taken from `base`
// as is; a re-read block that reads back equal to `base`'s keeps `base`'s object; a re-read `error`
// attachment keeps `base`'s local `uploadError`. Returns `base` itself when nothing differs.
function viewOf(doc: Y.Doc, base: RichDoc, reread: (id: string) => boolean): RichDoc {
  const blocks = blocksOf(doc);
  const byId = new Map(base.blocks.map((b) => [b.id, b]));
  const entries = [...blocks.entries()]
    .filter((e): e is [string, YBlock] => isBlockEntry(...e))
    .map(([id, m]) => ({ id, order: m.get('order') as string, m }))
    .sort(compareOrder);
  const out = entries.length
    ? entries.map(({ id, m }) => {
        const old = byId.get(id);
        if (old && !reread(id)) return old;
        const b = blockToRich(m);
        if (old && blockEqual(old, b)) return old;
        if (old?.uploadError !== undefined && b.status === 'error') b.uploadError = old.uploadError;
        return b;
      })
    : toRichDoc(doc).blocks.map((b) => {
        const old = byId.get(b.id);
        return old && blockEqual(old, b) ? old : b;
      });
  return out.length === base.blocks.length && out.every((b, i) => b === base.blocks[i])
    ? base
    : { ...base, blocks: out };
}

const hasLive = (blocks: Y.Map<unknown>) =>
  [...blocks.entries()].some(([k, v]) => isBlockEntry(k, v));

/**
 * What `applyLocal` returns.
 * @internal
 */
export interface LocalResult {
  /** The `RichDoc` the editor must now show. */
  view: RichDoc;
  /** A block id of `next` that was written (and appears in `view`) under a new id. */
  renamed?: { from: string; to: string };
}

/**
 * Apply a local editor change (`prev` → `next`) to `doc` in one transaction tagged `origin`.
 * Returns `{ view, renamed? }`: `view` is the `RichDoc` the editor must now show (adopt it: it is
 * `next` itself unless the doc holds more than the edit); `renamed` is set when a block of `next`
 * was written under a different id (see the placeholder case below) — move a selection on
 * `renamed.from` to `renamed.to`, same offsets.
 *
 * - Blocks diff by id: delete, insert, and `order`-only moves that keep the `Y.Text`. Attrs are
 *   written only where `prev` → `next` changed them; text is a prefix/suffix splice plus per-key
 *   re-marking of re-marked runs.
 * - A stale `prev` (remote changes already in `doc`, not yet in the editor) is tolerated: the local
 *   edit is rebased onto the doc (text offsets mapped through a character diff of the remote change,
 *   untouched attrs and marks kept), a block deleted remotely stays deleted, and the return value is the merged doc.
 * - The first edit of an empty doc seeds the placeholder paragraph (`fromRichDoc`, deterministic, so
 *   clients doing it concurrently collapse) in its own untracked transaction first. When seeding
 *   cannot produce a block (the doc holds only junk entries, or its seeded blocks were deleted), the
 *   placeholder gets a fresh client-scoped id instead (reported as `renamed`), so concurrent first
 *   edits cannot collide.
 * - Never throws on foreign order keys: it re-keys the neighbouring run instead.
 * @internal
 */
export function applyLocal(doc: Y.Doc, prev: RichDoc, next: RichDoc, origin: unknown): LocalResult {
  const unchanged =
    prev.blocks.length === next.blocks.length &&
    next.blocks.every((b, i) => b.id === prev.blocks[i].id && blockEqual(b, prev.blocks[i]));
  // ponytail: re-reads every block per call (O(doc)) so a stale `prev` can never leave the editor
  // out of sync; take a "prev is current" hint from the caller if large docs make this measurable.
  if (unchanged) return { view: viewOf(doc, next, () => true) };
  let renamed: LocalResult['renamed'];
  const blocks = blocksOf(doc);
  if (!hasLive(blocks)) {
    fromRichDoc(toRichDoc(doc), doc);
    if (!hasLive(blocks)) {
      // The clock is unique per client and grows with the write below.
      const placeholder = toRichDoc(doc).blocks[0].id;
      const id = `${doc.clientID.toString(36)}-s${Y.getState(doc.store, doc.clientID)}`;
      if (next.blocks.some((b) => b.id === placeholder)) {
        renamed = { from: placeholder, to: id };
        next = {
          ...next,
          blocks: next.blocks.map((b) => (b.id === placeholder ? { ...b, id } : b)),
        };
      }
    }
  }
  doc.transact(() => {
    const prevById = new Map(prev.blocks.map((b) => [b.id, b]));
    const nextIds = new Set(next.blocks.map((b) => b.id));
    for (const b of prev.blocks) if (!nextIds.has(b.id) && blocks.has(b.id)) blocks.delete(b.id);
    // A block `prev` had that the doc no longer has was deleted remotely: it stays deleted.
    const kept = next.blocks.filter((b) => live(blocks, b.id) || !prevById.has(b.id));
    const ms = kept.map((b) => live(blocks, b.id));
    const keys = assignKeys(
      kept.map((b) => b.id),
      ms.map((m) => (m ? (m.get('order') as string) : null)),
    );
    kept.forEach((b, j) => {
      let m = ms[j];
      if (!m) {
        m = blocks.set(b.id, new Y.Map<unknown>());
        m.set('order', keys[j]);
        writeBlock(m, { ...b, inlines: normalizeInlines(b.inlines ?? []) });
        return;
      }
      if (m.get('order') !== keys[j]) m.set('order', keys[j]);
      const old = prevById.get(b.id);
      if (old === b) return;
      writeBlock(m, old ? rebaseAttrs(blockToRich(m), old, b) : b);
      const t = m.get('text');
      if (t instanceof Y.Text) syncText(t, old?.inlines, b.inlines ?? []);
    });
  }, origin);
  const view = viewOf(doc, next, () => true);
  return renamed ? { view, renamed } : { view };
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
  return viewOf(doc, prev, (id) => touched.has(id));
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
 * Which end is the start comes from the doc's block order, or from `view` (the editor's doc) when
 * an end's block is not in the doc.
 * @internal
 */
export function encodeSelection(
  doc: Y.Doc,
  sel: Range | null,
  view?: RichDoc,
): CollabSelection | null {
  if (!sel) return null;
  const blocks = blocksOf(doc);
  const { anchor, focus } = sel;
  let anchorFirst: boolean | null = null; // null = collapsed
  if (anchor.blockId === focus.blockId) {
    if (anchor.offset !== focus.offset) anchorFirst = anchor.offset < focus.offset;
  } else {
    const a = live(blocks, anchor.blockId);
    const f = live(blocks, focus.blockId);
    const ia = view?.blocks.findIndex((b) => b.id === anchor.blockId) ?? -1;
    const iff = view?.blocks.findIndex((b) => b.id === focus.blockId) ?? -1;
    if (a && f) {
      anchorFirst =
        compareOrder(
          { order: a.get('order') as string, id: anchor.blockId },
          { order: f.get('order') as string, id: focus.blockId },
        ) < 0;
    } else if (ia >= 0 && iff >= 0) anchorFirst = ia < iff;
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
