// history.ts — pure undo/redo history for <RichTextEditor>. Snapshots of
// { doc, selection }; consecutive same-kind edits (typing, deleting) coalesce
// into one step within a short window. `now` is injected so this module stays
// pure and deterministically testable.
import type { RichDoc, Range } from '../RichText/engine/model';

export interface Snapshot {
  doc: RichDoc;
  selection: Range | null;
}

/**
 * The kind of edit that produced a snapshot — drives coalescing. Same-kind
 * non-`other` edits within {@link COALESCE_MS} merge into one undo step: `type`
 * and `delete` for keystroke bursts, `resize` for a continuous image-width drag
 * (slider or handle) so the whole drag reverts in a single undo.
 */
export type EditKind = 'type' | 'delete' | 'resize' | 'other';

export interface History {
  past: Snapshot[];
  present: Snapshot;
  future: Snapshot[];
  /** Kind of the last recorded step (for coalescing); null after reset/undo/redo. */
  lastKind: EditKind | null;
  /** Timestamp of the last record (for the pause-based coalescing break). */
  lastAt: number;
}

/** Consecutive same-kind edits within this many ms merge into one undo step. */
const COALESCE_MS = 600;
/** Max retained past entries (immutable snapshots structurally share blocks). */
const CAP = 200;

/** A fresh history whose only state is `present` (mount + external value replace). */
export function reset(present: Snapshot): History {
  return { past: [], present, future: [], lastKind: null, lastAt: 0 };
}

/**
 * Record a newly committed state. Coalesces with the previous step when it's the
 * same non-`other` kind within `COALESCE_MS`; otherwise pushes the prior present
 * onto `past` (capped) and clears `future`. A no-op (same doc) returns `h`.
 */
export function record(h: History, next: Snapshot, kind: EditKind, now: number): History {
  if (next.doc === h.present.doc) return h;
  const coalesce = kind !== 'other' && kind === h.lastKind && now - h.lastAt < COALESCE_MS;
  if (coalesce) {
    // Extend the current step: keep `past`/`future` (the burst's single boundary
    // already sits on top of `past`). The new value shares those arrays with `h`
    // — safe because arrays are never mutated and no caller compares them by ref.
    return { ...h, present: next, lastAt: now };
  }
  return {
    past: [...h.past, h.present].slice(-CAP),
    present: next,
    future: [],
    lastKind: kind,
    lastAt: now,
  };
}

/** Move one step back. No-op when there's nothing to undo. */
export function undo(h: History): History {
  if (h.past.length === 0) return h;
  return {
    past: h.past.slice(0, -1),
    present: h.past[h.past.length - 1],
    future: [h.present, ...h.future],
    lastKind: null,
    lastAt: 0,
  };
}

/** Move one step forward. No-op when there's nothing to redo. */
export function redo(h: History): History {
  if (h.future.length === 0) return h;
  return {
    past: [...h.past, h.present],
    present: h.future[0],
    future: h.future.slice(1),
    lastKind: null,
    lastAt: 0,
  };
}

export function canUndo(h: History): boolean {
  return h.past.length > 0;
}

export function canRedo(h: History): boolean {
  return h.future.length > 0;
}
