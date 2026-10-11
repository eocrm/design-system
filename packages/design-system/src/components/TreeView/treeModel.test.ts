import {
  buildTree,
  flatten,
  keyAction,
  nodeKey,
  typeaheadMatch,
  type TreeModelInput,
  type TreeViewChildren,
  type TreeViewNode,
} from './treeModel';

const n = (id: string, hasChildren = false): TreeViewNode => ({ id, label: id, hasChildren });
// co ─┬ sales ─┬ a
//     │        └ b
//     └ support
const data: Record<string, TreeViewChildren> = {
  co: [n('sales', true), n('support', true)],
  sales: [n('a'), n('b')],
};
const input = (expanded: string[], extra: Partial<TreeModelInput> = {}): TreeModelInput => ({
  roots: [n('co', true), n('other')],
  childrenOf: (id) => data[id],
  expandedIds: new Set(expanded),
  ...extra,
});
const keys = (expanded: string[], extra?: Partial<TreeModelInput>) =>
  flatten(buildTree(input(expanded, extra))).map((i) => i.key);

describe('buildTree / flatten', () => {
  it('lists only visible items in document order', () => {
    expect(keys([])).toEqual(['node:co', 'node:other']);
    expect(keys(['co', 'sales'])).toEqual([
      'node:co',
      'node:sales',
      'node:a',
      'node:b',
      'node:support',
      'node:other',
    ]);
  });

  it('ignores expanded ids of leaves and of hidden descendants', () => {
    expect(keys(['other', 'sales'])).toEqual(['node:co', 'node:other']);
  });

  it('sets level, parent, setsize and posinset', () => {
    const flat = flatten(buildTree(input(['co', 'sales'])));
    const b = flat.find((i) => i.key === 'node:b');
    expect(b).toMatchObject({ level: 3, parentId: 'sales', setSize: 2, posInSet: 2 });
    expect(flat[0]).toMatchObject({
      level: 1,
      parentId: null,
      setSize: 2,
      posInSet: 1,
      expanded: true,
    });
  });

  it('adds a loading row while children are undefined and an error row on failure', () => {
    expect(keys(['co', 'support'])).toContain('loading:support');
    const failing = keys(['co', 'support'], {
      childrenOf: (id) => (id === 'support' ? { error: true } : data[id]),
    });
    expect(failing).toContain('error:support');
    expect(failing).not.toContain('loading:support');
  });

  it('appends overflow rows after a level, root level included; status rows do not count in setsize', () => {
    const overflowOf = (p: string | null) =>
      p === null || p === 'sales' ? { label: 'more' } : null;
    const flat = flatten(buildTree(input(['co', 'sales'], { overflowOf })));
    expect(flat.map((i) => i.key)).toEqual([
      'node:co',
      'node:sales',
      'node:a',
      'node:b',
      'overflow:sales',
      'node:support',
      'node:other',
      'overflow:',
    ]);
    expect(flat.find((i) => i.key === 'node:a')).toMatchObject({ setSize: 2 });
    expect(flat.find((i) => i.key === 'overflow:sales')).toMatchObject({
      level: 3,
      parentId: 'sales',
    });
    expect(flat.at(-1)).toMatchObject({ level: 1, parentId: null });
  });

  it('expanded node with no children yields no child items', () => {
    expect(
      keys(['other'], {
        roots: [n('empty', true)],
        childrenOf: () => [],
        expandedIds: new Set(['empty']),
      }),
    ).toEqual(['node:empty']);
  });

  it('keys are unique per kind', () => {
    expect(nodeKey('x')).toBe('node:x');
    expect(nodeKey('x')).not.toBe('loading:x');
  });
});

describe('keyAction — list view', () => {
  const flat = flatten(buildTree(input(['co', 'sales'])));
  const act = (from: string, key: string) => keyAction(flat, from, key, 'list');

  it('ArrowDown/ArrowUp walk visible items, no wrap', () => {
    expect(act('node:co', 'ArrowDown')).toEqual({ type: 'focus', key: 'node:sales' });
    expect(act('node:b', 'ArrowDown')).toEqual({ type: 'focus', key: 'node:support' });
    expect(act('node:co', 'ArrowUp')).toBeNull();
    expect(act('node:other', 'ArrowDown')).toBeNull();
  });

  it('Home/End jump', () => {
    expect(act('node:b', 'Home')).toEqual({ type: 'focus', key: 'node:co' });
    expect(act('node:co', 'End')).toEqual({ type: 'focus', key: 'node:other' });
  });

  it('ArrowRight expands a collapsed parent, enters an expanded one, ignores leaves', () => {
    expect(act('node:support', 'ArrowRight')).toEqual({ type: 'expand', id: 'support' });
    expect(act('node:sales', 'ArrowRight')).toEqual({ type: 'focus', key: 'node:a' });
    expect(act('node:a', 'ArrowRight')).toBeNull();
  });

  it('ArrowRight enters a loading row', () => {
    const loading = flatten(buildTree(input(['co', 'support'])));
    expect(keyAction(loading, 'node:support', 'ArrowRight', 'list')).toEqual({
      type: 'focus',
      key: 'loading:support',
    });
  });

  it('ArrowLeft collapses an expanded parent, else goes to the parent', () => {
    expect(act('node:sales', 'ArrowLeft')).toEqual({ type: 'collapse', id: 'sales' });
    expect(act('node:a', 'ArrowLeft')).toEqual({ type: 'focus', key: 'node:sales' });
    expect(act('node:other', 'ArrowLeft')).toBeNull();
  });

  it('status rows go to their parent on ArrowLeft', () => {
    const loading = flatten(buildTree(input(['co', 'support'])));
    expect(keyAction(loading, 'loading:support', 'ArrowLeft', 'list')).toEqual({
      type: 'focus',
      key: 'node:support',
    });
  });

  it('Enter and Space activate', () => {
    expect(act('node:a', 'Enter')).toEqual({ type: 'activate', key: 'node:a' });
    expect(act('node:a', ' ')).toEqual({ type: 'activate', key: 'node:a' });
  });

  it('unknown keys and unknown current keys return null', () => {
    expect(act('node:a', 'x')).toBeNull();
    expect(act('node:gone', 'ArrowDown')).toBeNull();
  });
});

describe('keyAction — chart view (spatial)', () => {
  const flat = flatten(buildTree(input(['co', 'sales'])));
  const act = (from: string, key: string) => keyAction(flat, from, key, 'chart');

  it('ArrowDown expands or enters the first child', () => {
    expect(act('node:support', 'ArrowDown')).toEqual({ type: 'expand', id: 'support' });
    expect(act('node:sales', 'ArrowDown')).toEqual({ type: 'focus', key: 'node:a' });
    expect(act('node:a', 'ArrowDown')).toBeNull();
  });

  it('ArrowUp collapses an expanded node, else goes to the parent', () => {
    expect(act('node:sales', 'ArrowUp')).toEqual({ type: 'collapse', id: 'sales' });
    expect(act('node:b', 'ArrowUp')).toEqual({ type: 'focus', key: 'node:sales' });
    expect(act('node:other', 'ArrowUp')).toBeNull();
  });

  it('ArrowLeft/ArrowRight move between siblings without wrapping, skipping descendants', () => {
    expect(act('node:sales', 'ArrowRight')).toEqual({ type: 'focus', key: 'node:support' });
    expect(act('node:support', 'ArrowLeft')).toEqual({ type: 'focus', key: 'node:sales' });
    expect(act('node:co', 'ArrowRight')).toEqual({ type: 'focus', key: 'node:other' });
    expect(act('node:b', 'ArrowRight')).toBeNull();
    expect(act('node:a', 'ArrowLeft')).toBeNull();
  });

  it('status rows are siblings', () => {
    const withMore = flatten(
      buildTree(
        input(['co', 'sales'], { overflowOf: (p) => (p === 'sales' ? { label: 'more' } : null) }),
      ),
    );
    expect(keyAction(withMore, 'node:b', 'ArrowRight', 'chart')).toEqual({
      type: 'focus',
      key: 'overflow:sales',
    });
  });
});

describe('typeaheadMatch', () => {
  const flat = flatten(
    buildTree({
      roots: [n('Sales'), n('Support'), n('R&D'), n('sauna')],
      childrenOf: () => undefined,
      expandedIds: new Set(),
    }),
  );

  it('single char finds the next match after the current item, wrapping, case-insensitive', () => {
    expect(typeaheadMatch(flat, 'node:Sales', 's')).toBe('node:Support');
    expect(typeaheadMatch(flat, 'node:sauna', 's')).toBe('node:Sales');
  });

  it('a longer buffer may stay on the current item', () => {
    expect(typeaheadMatch(flat, 'node:Sales', 'sa')).toBe('node:Sales');
    expect(typeaheadMatch(flat, 'node:Support', 'sau')).toBe('node:sauna');
  });

  it('no match returns null; status rows are skipped', () => {
    expect(typeaheadMatch(flat, 'node:Sales', 'z')).toBeNull();
  });

  it('never lands on loading or overflow rows, even when their label would match', () => {
    const withLoading = flatten(
      buildTree({
        roots: [n('Sales', true), n('Support')],
        childrenOf: () => undefined,
        expandedIds: new Set(['Sales']),
      }),
    );
    expect(withLoading.map((i) => i.kind)).toEqual(['node', 'loading', 'node']);
    expect(typeaheadMatch(withLoading, 'node:Sales', 's')).toBe('node:Support');

    const withOverflow = flatten(
      buildTree({
        roots: [n('Sales'), n('Other')],
        childrenOf: () => undefined,
        expandedIds: new Set(),
        overflowOf: () => ({ label: 'support more' }),
      }),
    );
    expect(withOverflow.map((i) => i.kind)).toEqual(['node', 'node', 'overflow']);
    expect(typeaheadMatch(withOverflow, 'node:Sales', 'su')).toBeNull();
  });
});
