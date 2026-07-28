import { createElement, useRef, type RefObject } from 'react';
import { render, fireEvent } from '@testing-library/react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { applyColumnShifts, measureDragRangeX, useColumnDragShift } from './useColumnDragShift';
import { shiftVarName, type DragRangeX } from './columnShift';

/**
 * Build a detached `<table>` whose header cells carry `data-dt-column-id` and the
 * given rects. jsdom lays nothing out, so the rects have to be stubbed — which
 * is exactly the point: `measureDragRangeX` must read rendered geometry, never
 * the declared `<col>` widths.
 */
function tableWithHeaderRects(cells: { id: string; left: number; width: number }[]) {
  const table = document.createElement('table');
  const row = document.createElement('tr');
  for (const { id, left, width } of cells) {
    const th = document.createElement('th');
    th.setAttribute('data-dt-column-id', id);
    th.getBoundingClientRect = () => new DOMRect(left, 0, width, 32);
    row.appendChild(th);
  }
  table.appendChild(row);
  return table;
}

describe('applyColumnShifts', () => {
  function makeRoot() {
    return document.createElement('table');
  }

  it('writes a px custom property per shifted column', () => {
    const root = makeRoot();
    applyColumnShifts(root, { a: 12, b: -30 }, []);
    expect(root.style.getPropertyValue(shiftVarName('a'))).toBe('12px');
    expect(root.style.getPropertyValue(shiftVarName('b'))).toBe('-30px');
  });

  it('returns the ids it wrote so the next call can clear them', () => {
    const root = makeRoot();
    const written = applyColumnShifts(root, { a: 1, b: 2 }, []);
    expect(written.sort()).toEqual(['a', 'b']);
  });

  it('removes properties for columns that stopped shifting', () => {
    const root = makeRoot();
    const first = applyColumnShifts(root, { a: 1, b: 2 }, []);
    applyColumnShifts(root, { a: 5 }, first);
    expect(root.style.getPropertyValue(shiftVarName('a'))).toBe('5px');
    expect(root.style.getPropertyValue(shiftVarName('b'))).toBe('');
  });

  it('clears everything when handed an empty shift map', () => {
    const root = makeRoot();
    const first = applyColumnShifts(root, { a: 1, b: 2 }, []);
    const written = applyColumnShifts(root, {}, first);
    expect(root.style.getPropertyValue(shiftVarName('a'))).toBe('');
    expect(root.style.getPropertyValue(shiftVarName('b'))).toBe('');
    expect(written).toEqual([]);
  });

  it('is a no-op on a null root', () => {
    expect(() => applyColumnShifts(null, { a: 1 }, [])).not.toThrow();
    expect(applyColumnShifts(null, { a: 1 }, ['b'])).toEqual([]);
  });

  it('rounds sub-pixel offsets to avoid churning the style attribute', () => {
    const root = makeRoot();
    applyColumnShifts(root, { a: 12.4 }, []);
    expect(root.style.getPropertyValue(shiftVarName('a'))).toBe('12px');
  });

  it('the exact call clear() makes: an empty map wipes every id from a previous frame', () => {
    // Regression coverage for the ungated onDragEnd/onDragCancel cleanup path:
    // this is precisely what `clear()` in useColumnDragShift invokes.
    const root = makeRoot();
    const previousIds = applyColumnShifts(root, { a: 1, b: 2, c: 3 }, []);
    const written = applyColumnShifts(root, {}, previousIds);
    expect(root.style.getPropertyValue(shiftVarName('a'))).toBe('');
    expect(root.style.getPropertyValue(shiftVarName('b'))).toBe('');
    expect(root.style.getPropertyValue(shiftVarName('c'))).toBe('');
    expect(written).toEqual([]);
  });
});

describe('measureDragRangeX', () => {
  // Three columns rendered 200px wide each, starting at x=0.
  const cells = [
    { id: 'a', left: 0, width: 200 },
    { id: 'b', left: 200, width: 200 },
    { id: 'c', left: 400, width: 200 },
  ];
  const orderedIds = ['a', 'b', 'c'];

  it('gives the first column no room to travel left and the full band to its right', () => {
    expect(measureDragRangeX(tableWithHeaderRects(cells), orderedIds, 'a')).toEqual({
      min: 0,
      max: 400,
    });
  });

  it('gives the last column no room to travel right', () => {
    expect(measureDragRangeX(tableWithHeaderRects(cells), orderedIds, 'c')).toEqual({
      min: -400,
      max: 0,
    });
  });

  it('bounds a middle column by the real geometry on each side', () => {
    expect(measureDragRangeX(tableWithHeaderRects(cells), orderedIds, 'b')).toEqual({
      min: -200,
      max: 200,
    });
  });

  it('reads RENDERED width, not the declared column size', () => {
    // The regression this function exists for: `table-layout: fixed;
    // width: max-content; min-width: 100%` stretches columns past their
    // declared `<col>` width, so a declared-width sum would have stopped 'a'
    // at 240 (2 x the 120px default) instead of the real 400 — leaving the
    // last slot unreachable.
    const range = measureDragRangeX(tableWithHeaderRects(cells), orderedIds, 'a');
    expect(range.max).toBe(400);
    expect(range.max).toBeGreaterThan(240);
  });

  it('measures correctly regardless of where the wrap is scrolled', () => {
    // Same table, scrolled 1000px left: every rect shifts by the same amount,
    // so the differences — which is all the range is — are unchanged.
    const scrolled = cells.map((c) => ({ ...c, left: c.left - 1000 }));
    expect(measureDragRangeX(tableWithHeaderRects(scrolled), orderedIds, 'a')).toEqual({
      min: 0,
      max: 400,
    });
  });

  it('pins in place when the active column has no header cell', () => {
    expect(measureDragRangeX(tableWithHeaderRects(cells), orderedIds, 'zzz')).toEqual({
      min: 0,
      max: 0,
    });
  });

  it('pins in place on a null root or an empty column list', () => {
    expect(measureDragRangeX(null, orderedIds, 'a')).toEqual({ min: 0, max: 0 });
    expect(measureDragRangeX(tableWithHeaderRects(cells), [], 'a')).toEqual({ min: 0, max: 0 });
  });

  it('handles a column id that would break an unescaped selector', () => {
    // Column ids are consumer-supplied: dots, spaces and quotes all appear in
    // real schemas and all are selector metacharacters.
    const hostile = [
      { id: 'deal.owner name', left: 0, width: 100 },
      { id: 'a"b', left: 100, width: 100 },
    ];
    expect(
      measureDragRangeX(
        tableWithHeaderRects(hostile),
        ['deal.owner name', 'a"b'],
        'deal.owner name',
      ),
    ).toEqual({ min: 0, max: 100 });
  });
});

describe('useColumnDragShift', () => {
  // A draggable handle registered with dnd-kit so a real MouseSensor drag
  // sequence (mousedown -> mousemove -> mouseup) drives actual
  // onDragStart/onDragMove/onDragEnd callbacks through useDndMonitor — not a
  // mock standing in for dnd-kit.
  function Handle() {
    const { attributes, listeners, setNodeRef } = useDraggable({ id: 'a' });
    return createElement('div', {
      ref: setNodeRef,
      ...attributes,
      ...listeners,
      'data-testid': 'handle',
    });
  }

  /**
   * A drop target, so `over` can actually resolve. Without one dnd-kit reports
   * `over: null` for the whole drag and `lastSlotIdRef` would never be written
   * — which would make the staleness test below assert nothing.
   */
  function Drop() {
    const { setNodeRef } = useDroppable({ id: 'b' });
    return createElement('div', { ref: setNodeRef, 'data-testid': 'drop' });
  }

  function Monitor(props: {
    enabled: boolean;
    rootRef: RefObject<HTMLElement | null>;
    dragRangeRef: RefObject<DragRangeX | null>;
    lastSlotIdRef: RefObject<string | null>;
    onDragActiveChange: (active: boolean) => void;
  }) {
    useColumnDragShift({
      rootRef: props.rootRef,
      enabled: props.enabled,
      orderedIds: ['a', 'b'],
      widths: { a: 50, b: 50 },
      dragRangeRef: props.dragRangeRef,
      lastSlotIdRef: props.lastSlotIdRef,
      onDragActiveChange: props.onDragActiveChange,
    });
    return null;
  }

  function Harness({
    enabled,
    onDragActiveChange,
    slotRef,
  }: {
    enabled: boolean;
    onDragActiveChange: (active: boolean) => void;
    /** Caller-supplied so a test can read what the hook wrote. */
    slotRef?: RefObject<string | null>;
  }) {
    const rootRef = useRef<HTMLElement | null>(null);
    const dragRangeRef = useRef<DragRangeX | null>(null);
    const ownSlotRef = useRef<string | null>(null);
    const lastSlotIdRef = slotRef ?? ownSlotRef;
    // distance: 0 so the sensor activates on the first pointer move instead
    // of requiring a real drag-distance threshold jsdom can't produce.
    const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 0 } }));
    return createElement(
      DndContext,
      { sensors },
      createElement(
        'table',
        { ref: rootRef, 'data-testid': 'table' },
        createElement(
          'tbody',
          null,
          createElement(
            'tr',
            null,
            createElement('th', { 'data-dt-column-id': 'a' }),
            createElement('th', { 'data-dt-column-id': 'b' }),
          ),
        ),
      ),
      createElement(Monitor, { rootRef, enabled, dragRangeRef, lastSlotIdRef, onDragActiveChange }),
      createElement(Handle),
      createElement(Drop),
    );
  }

  /**
   * jsdom lays nothing out, so without stubbed rects `measureDragRangeX` would
   * (correctly) report zero travel and every published shift would be 0px.
   * Two columns, 50px each: 'a' may travel 0..+50.
   */
  function stubRects(table: HTMLElement) {
    table.querySelectorAll('th').forEach((th, i) => {
      th.getBoundingClientRect = () => new DOMRect(i * 50, 0, 50, 32);
    });
  }

  it('clamps the published delta to the measured range', () => {
    const { getByTestId } = render(
      createElement(Harness, { enabled: true, onDragActiveChange: () => {} }),
    );
    const handle = getByTestId('handle');
    const table = getByTestId('table');
    stubRects(table);

    fireEvent.mouseDown(handle, { clientX: 0, clientY: 0, button: 0 });
    fireEvent.mouseMove(document, { clientX: 5, clientY: 0 });
    fireEvent.mouseMove(document, { clientX: 30, clientY: 0 });
    // Inside the range — published verbatim.
    expect(table.style.getPropertyValue(shiftVarName('a'))).toBe('30px');

    fireEvent.mouseMove(document, { clientX: 5000, clientY: 0 });
    // Past it — held at the last slot rather than following the pointer.
    expect(table.style.getPropertyValue(shiftVarName('a'))).toBe('50px');

    fireEvent.mouseUp(document);
  });

  it('cleans up and reports drag-inactive even when `enabled` flips to false mid-drag', () => {
    // Reproduces the bug: onDragEnd/onDragCancel used to be gated on
    // `enabled`, so a column left mid-shift when `enabled` flipped false
    // stayed shifted forever and onDragActiveChange(false) never fired.
    const calls: boolean[] = [];
    const onDragActiveChange = (active: boolean) => calls.push(active);
    const { getByTestId, rerender } = render(
      createElement(Harness, { enabled: true, onDragActiveChange }),
    );
    const handle = getByTestId('handle');
    const table = getByTestId('table');
    stubRects(table);

    fireEvent.mouseDown(handle, { clientX: 0, clientY: 0, button: 0 });
    // First move activates the sensor (baseline); the second produces delta.
    fireEvent.mouseMove(document, { clientX: 5, clientY: 0 });
    fireEvent.mouseMove(document, { clientX: 20, clientY: 0 });
    expect(table.style.getPropertyValue(shiftVarName('a'))).toBe('20px');

    rerender(createElement(Harness, { enabled: false, onDragActiveChange }));
    fireEvent.mouseUp(document);

    expect(table.style.getPropertyValue(shiftVarName('a'))).toBe('');
    expect(calls).toEqual([true, false]);
  });

  it('clears the remembered slot at drag START, so no drag inherits the last one', () => {
    // #383. The slot survives its own drag END on purpose — the drop handler
    // reads it there, and clearing at start means it never has to care which of
    // dnd-kit's two end callbacks ran first. The cost is that the clear has to
    // happen, or the next drag commits to wherever the previous one pointed.
    //
    // This has to be asserted at the hook, not through <DataTable>: there, a
    // second drag resolves `over` to the dragged column itself, which IS a band
    // member, so the drop takes the raw-`over` branch and the stale ref is
    // never read. The table-level test would pass with the clear deleted.
    const slotRef: RefObject<string | null> = { current: null };
    const { getByTestId } = render(
      createElement(Harness, { enabled: true, onDragActiveChange: () => {}, slotRef }),
    );
    const handle = getByTestId('handle');
    const drop = getByTestId('drop');
    stubRects(getByTestId('table'));
    // jsdom gives every element a zero-area rect, and a zero-area collision
    // rect intersects nothing — so the drag geometry has to be stubbed too.
    handle.getBoundingClientRect = () => new DOMRect(0, 0, 50, 32);
    drop.getBoundingClientRect = () => new DOMRect(50, 0, 50, 32);

    fireEvent.mouseDown(handle, { clientX: 0, clientY: 0, button: 0 });
    fireEvent.mouseMove(document, { clientX: 0, clientY: 0 });
    fireEvent.mouseMove(document, { clientX: 60, clientY: 0 });
    fireEvent.mouseMove(document, { clientX: 61, clientY: 0 });
    expect(slotRef.current).toBe('b');

    fireEvent.mouseUp(document);
    // Still set: the drop handler reads it on this very tick.
    expect(slotRef.current).toBe('b');

    // A second drag that resolves nothing must start from a clean slate. It
    // moves AWAY from the drop target, so no collision is ever found and the
    // only thing that can null the ref is the clear in `onDragStart`.
    fireEvent.mouseDown(handle, { clientX: 0, clientY: 0, button: 0 });
    fireEvent.mouseMove(document, { clientX: -30, clientY: 0 });
    fireEvent.mouseMove(document, { clientX: -31, clientY: 0 });
    expect(slotRef.current).toBeNull();

    fireEvent.mouseUp(document);
  });
});
