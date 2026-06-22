import { moveSortableItem } from './moveSortableItem';

const ev = (id: string, fromC: string, fromI: number, toC: string, toI: number) => ({
  id,
  from: { container: fromC, index: fromI },
  to: { container: toC, index: toI },
});

describe('moveSortableItem', () => {
  it('reorders within one container (matches arrayMove semantics)', () => {
    const c = { a: ['x', 'y', 'z'] };
    expect(moveSortableItem(c, ev('x', 'a', 0, 'a', 2))).toEqual({ a: ['y', 'z', 'x'] });
    expect(moveSortableItem(c, ev('z', 'a', 2, 'a', 0))).toEqual({ a: ['z', 'x', 'y'] });
  });

  it('moves an item across containers at the target index', () => {
    const c = { a: ['x', 'y'], b: ['p', 'q'] };
    expect(moveSortableItem(c, ev('y', 'a', 1, 'b', 1))).toEqual({ a: ['x'], b: ['p', 'y', 'q'] });
  });

  it('moves into an empty container', () => {
    const c = { a: ['x'], b: [] as string[] };
    expect(moveSortableItem(c, ev('x', 'a', 0, 'b', 0))).toEqual({ a: [], b: ['x'] });
  });

  it('moves whole objects (generic over item type), by index', () => {
    const c = { a: [{ id: 'x' }, { id: 'y' }], b: [{ id: 'p' }] };
    const next = moveSortableItem(c, ev('y', 'a', 1, 'b', 0));
    expect(next.a).toEqual([{ id: 'x' }]);
    expect(next.b).toEqual([{ id: 'y' }, { id: 'p' }]);
  });

  it('is a no-op for an out-of-range source index', () => {
    const c = { a: ['x'], b: [] as string[] };
    expect(moveSortableItem(c, ev('x', 'a', 5, 'b', 0))).toBe(c);
  });

  it('does not mutate the input (new refs only for affected arrays)', () => {
    const a = ['x', 'y'];
    const b = ['p'];
    const c = { a, b };
    const next = moveSortableItem(c, ev('y', 'a', 1, 'b', 1));
    expect(a).toEqual(['x', 'y']); // original untouched
    expect(b).toEqual(['p']);
    expect(next.a).not.toBe(a);
    expect(next.b).not.toBe(b);
  });
});
