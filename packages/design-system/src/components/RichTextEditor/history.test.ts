import { reset, record, undo, redo, canUndo, canRedo } from './history';
import type { Snapshot } from './history';
import type { RichDoc } from '../RichText/engine/model';

const mkDoc = (id: string): RichDoc => ({
  blocks: [{ id, type: 'paragraph', inlines: [{ text: id, marks: [] }] }],
});
const sa: Snapshot = { doc: mkDoc('a'), selection: null };
const sb: Snapshot = { doc: mkDoc('b'), selection: null };
const sc: Snapshot = { doc: mkDoc('c'), selection: null };

describe('history reset', () => {
  it('starts empty around the present', () => {
    const h = reset(sa);
    expect(h.present).toBe(sa);
    expect(canUndo(h)).toBe(false);
    expect(canRedo(h)).toBe(false);
  });
});

describe('history record', () => {
  it('pushes a new step (present → past) and can undo', () => {
    let h = reset(sa);
    h = record(h, sb, 'other', 1000);
    expect(h.present).toBe(sb);
    expect(h.past).toEqual([sa]);
    expect(canUndo(h)).toBe(true);
  });

  it('coalesces same-kind edits within the window', () => {
    let h = reset(sa);
    h = record(h, sb, 'type', 1000);
    h = record(h, sc, 'type', 1200);
    expect(h.present).toBe(sc);
    expect(h.past).toEqual([sa]);
  });

  it('breaks coalescing when the window elapses', () => {
    let h = reset(sa);
    h = record(h, sb, 'type', 1000);
    h = record(h, sc, 'type', 2000);
    expect(h.past).toEqual([sa, sb]);
  });

  it('breaks coalescing on a kind change', () => {
    let h = reset(sa);
    h = record(h, sb, 'type', 1000);
    h = record(h, sc, 'delete', 1100);
    expect(h.past).toEqual([sa, sb]);
  });

  it('never coalesces "other"', () => {
    let h = reset(sa);
    h = record(h, sb, 'other', 1000);
    h = record(h, sc, 'other', 1050);
    expect(h.past).toEqual([sa, sb]);
  });

  it('clears the redo future on a new record', () => {
    let h = reset(sa);
    h = record(h, sb, 'other', 1000);
    h = undo(h);
    h = record(h, sc, 'other', 1100);
    expect(h.future).toEqual([]);
    expect(h.present).toBe(sc);
  });

  it('is a no-op when the doc is unchanged', () => {
    const h = reset(sa);
    expect(record(h, sa, 'type', 1000)).toBe(h);
  });

  it('caps the past length at 200', () => {
    let h = reset(sa);
    for (let i = 0; i < 250; i += 1) {
      h = record(h, { doc: mkDoc('x' + i), selection: null }, 'other', i * 1000);
    }
    expect(h.past.length).toBe(200);
  });
});

describe('history undo/redo', () => {
  it('undo moves present back and into future', () => {
    let h = reset(sa);
    h = record(h, sb, 'other', 1000);
    h = undo(h);
    expect(h.present).toBe(sa);
    expect(h.future).toEqual([sb]);
    expect(canRedo(h)).toBe(true);
  });

  it('redo re-applies', () => {
    let h = reset(sa);
    h = record(h, sb, 'other', 1000);
    h = redo(undo(h));
    expect(h.present).toBe(sb);
    expect(h.future).toEqual([]);
  });

  it('undo/redo are no-ops at the boundaries', () => {
    const h = reset(sa);
    expect(undo(h)).toBe(h);
    expect(redo(h)).toBe(h);
  });

  it('an edit after undo starts a fresh step (no merge across the undo)', () => {
    let h = reset(sa);
    h = record(h, sb, 'type', 1000);
    h = undo(h);
    h = record(h, sc, 'type', 1100);
    expect(h.past).toEqual([sa]);
    expect(h.future).toEqual([]);
  });
});
