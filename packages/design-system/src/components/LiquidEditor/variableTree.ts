import type { LiquidVariable } from './types';

/** One level of the dotted-code variable tree behind the nested Insert variable menu. */
export interface VariableNode {
  /** This level's raw code segment (e.g. `status`). */
  segment: string;
  /** Full dotted path to this node (e.g. `record.status`). */
  path: string;
  /** The declared variable whose `code` equals `path`, if any. */
  variable?: LiquidVariable;
  /** Child nodes, in first-seen order. */
  children: VariableNode[];
}

/**
 * Builds a tree from variables whose `code` is dotted, splitting on `.`.
 * First-seen order at every level; nodes are keyed by full `path`, so equal
 * segments under different parents never merge.
 */
export function buildVariableTree(vars: readonly LiquidVariable[]): VariableNode[] {
  const roots: VariableNode[] = [];
  for (const v of vars) {
    let level = roots;
    let node: VariableNode | undefined;
    const parts = v.code.split('.');
    parts.forEach((segment, i) => {
      const path = parts.slice(0, i + 1).join('.');
      node = level.find((n) => n.path === path);
      if (!node) {
        // Empty segments (`a..b`, `.x`) would give an empty accessible name; show the path.
        node = { segment: segment || path || v.code, path, children: [] };
        level.push(node);
      }
      level = node.children;
    });
    if (node) node.variable = v;
  }
  return roots;
}

/**
 * Display pass: a node with exactly one child and no declared variable of its
 * own merges into that child (recursively), joining the segments with `.`.
 * A merged chain ending in a leaf is a plain item; ending in a branch, a
 * sub-menu labelled by the joined path. Declared nodes are never merged away.
 */
export function collapseChains(nodes: readonly VariableNode[]): VariableNode[] {
  return nodes.map((node) => {
    const children = collapseChains(node.children);
    if (!node.variable && children.length === 1) {
      const [child] = children;
      return { ...child, segment: `${node.segment}.${child.segment}` };
    }
    return { ...node, children };
  });
}
