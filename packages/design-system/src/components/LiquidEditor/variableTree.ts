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
        node = { segment, path, children: [] };
        level.push(node);
      }
      level = node.children;
    });
    if (node) node.variable = v;
  }
  return roots;
}
