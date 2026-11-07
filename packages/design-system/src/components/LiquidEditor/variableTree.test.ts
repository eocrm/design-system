import { buildVariableTree } from './variableTree';

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
});
