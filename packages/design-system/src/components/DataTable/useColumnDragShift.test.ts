import { createElement, useRef, type RefObject } from 'react';
import { render, fireEvent } from '@testing-library/react';
import { DndContext, useDraggable, MouseSensor, useSensor, useSensors } from '@dnd-kit/core';
import { applyColumnShifts, useColumnDragShift } from './useColumnDragShift';
import { shiftVarName } from './columnShift';

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

  function Monitor(props: {
    enabled: boolean;
    rootRef: RefObject<HTMLElement | null>;
    onDragActiveChange: (active: boolean) => void;
  }) {
    useColumnDragShift({
      rootRef: props.rootRef,
      enabled: props.enabled,
      orderedIds: ['a', 'b'],
      widths: { a: 50, b: 50 },
      onDragActiveChange: props.onDragActiveChange,
    });
    return null;
  }

  function Harness({
    enabled,
    onDragActiveChange,
  }: {
    enabled: boolean;
    onDragActiveChange: (active: boolean) => void;
  }) {
    const rootRef = useRef<HTMLElement | null>(null);
    // distance: 0 so the sensor activates on the first pointer move instead
    // of requiring a real drag-distance threshold jsdom can't produce.
    const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: { distance: 0 } }));
    return createElement(
      DndContext,
      { sensors },
      createElement('table', { ref: rootRef, 'data-testid': 'table' }),
      createElement(Monitor, { rootRef, enabled, onDragActiveChange }),
      createElement(Handle),
    );
  }

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
});
