import { buildVariableTree, collapseChains } from './variableTree';

const v = (...codes: string[]) => codes.map((code) => ({ code }));

describe('buildVariableTree (#750)', () => {
  it('nests dotted codes and keeps undotted ones as leaves', () => {
    const tree = buildVariableTree(v('record.status.id', 'record.status.name', 'score'));
    expect(tree.map((n) => n.segment)).toEqual(['record', 'score']);
    expect(tree[0].variable).toBeUndefined();
    expect(tree[0].children[0].children.map((n) => n.segment)).toEqual(['id', 'name']);
    expect(tree[1].variable?.code).toBe('score');
  });

  it('keeps a declared parent and its children', () => {
    const status = buildVariableTree(v('record.status', 'record.status.name'))[0].children[0];
    expect(status.variable?.code).toBe('record.status');
    expect(status.children).toHaveLength(1);
  });

  it('a lone dotted code is a childless leaf', () => {
    const status = buildVariableTree(v('record.status'))[0].children[0];
    expect(status.variable).toBeDefined();
    expect(status.children).toEqual([]);
  });

  it('does not merge equal segments under different parents', () => {
    const tree = buildVariableTree(v('record.status.name', 'event.status'));
    expect(tree[0].children[0].path).toBe('record.status');
    expect(tree[1].children[0].path).toBe('event.status');
  });

  it('never yields an empty display segment', () => {
    const all = (ns: ReturnType<typeof buildVariableTree>): string[] =>
      ns.flatMap((n) => [n.segment, ...all(n.children)]);
    expect(all(buildVariableTree(v('a..b', '.x', 'x.'))).every((s) => s !== '')).toBe(true);
  });
});

describe('collapseChains (#750)', () => {
  const shape = (ns: ReturnType<typeof collapseChains>): unknown[] =>
    ns.map((n) => [n.segment, n.variable ? 'v' : '-', shape(n.children)]);
  const run = (...codes: string[]) => collapseChains(buildVariableTree(v(...codes)));

  it('a lone dotted code becomes a root leaf', () => {
    expect(shape(run('event.type'))).toEqual([['event.type', 'v', []]]);
  });

  it('merges an undeclared single-child chain into one labelled sub-menu', () => {
    expect(shape(run('record.status.id', 'record.status.name'))).toEqual([
      [
        'record.status',
        '-',
        [
          ['id', 'v', []],
          ['name', 'v', []],
        ],
      ],
    ]);
  });

  it('keeps a branching parent and collapses inside it', () => {
    expect(shape(run('record.status.id', 'record.status.name', 'record.owner'))).toEqual([
      [
        'record',
        '-',
        [
          [
            'status',
            '-',
            [
              ['id', 'v', []],
              ['name', 'v', []],
            ],
          ],
          ['owner', 'v', []],
        ],
      ],
    ]);
  });

  it('merges into a declared single child, keeping it as the sub-menu parent', () => {
    expect(shape(run('record.status', 'record.status.name'))).toEqual([
      ['record.status', 'v', [['name', 'v', []]]],
    ]);
  });

  it('never merges away a declared node', () => {
    expect(shape(run('record', 'record.status.name'))).toEqual([
      ['record', 'v', [['status.name', 'v', []]]],
    ]);
  });
});
