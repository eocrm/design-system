import type { FlowCanvasEdge, FlowCanvasNode, FlowCanvasPoint } from './types';

/** Measured (or estimated) rendered size of a node, in canvas units. */
export interface NodeSize {
  width: number;
  height: number;
}

/** Fallback node size used before ResizeObserver reports real ones (and in jsdom). */
export const ESTIMATED_NODE_SIZE: NodeSize = { width: 160, height: 40 };

const RANK_GAP = 96; // horizontal gap between rank columns
const NODE_GAP = 32; // vertical gap between nodes within a rank

/**
 * Layered auto-layout: longest-path ranks from the graph's sources flow
 * left → right; one barycenter pass orders nodes within a rank to reduce edge
 * crossings; ranks are vertically centered against the tallest rank.
 * Pure, deterministic, and cycle-safe (back-edges to on-stack nodes are
 * skipped). Self-loops and edges to unknown nodes are ignored.
 * Only nodes without an explicit `position` are laid out; a node WITH a
 * `position` is pinned by the consumer and is ignored here — it neither
 * occupies layout space nor anchors edges, so it never shifts the others.
 */
export function computeLayout(
  nodes: readonly FlowCanvasNode[],
  edges: readonly FlowCanvasEdge[],
  sizes?: ReadonlyMap<string, NodeSize>,
): Map<string, FlowCanvasPoint> {
  const result = new Map<string, FlowCanvasPoint>();
  if (nodes.length === 0) return result;

  // Only nodes WITHOUT an explicit position participate in auto-layout. Pinned
  // nodes are placed by the consumer and must not perturb the others' ranking
  // or centering; edges touching a pinned node fall through the unknown-node
  // guard below (the pinned id is absent from `ids`).
  const autoNodes = nodes.filter((node) => node.position === undefined);
  if (autoNodes.length === 0) return result;

  const ids = new Set(autoNodes.map((node) => node.id));
  const out = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const node of autoNodes) {
    out.set(node.id, []);
    incoming.set(node.id, []);
    indegree.set(node.id, 0);
  }
  for (const edge of edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) continue;
    out.get(edge.from)!.push(edge.to);
    incoming.get(edge.to)!.push(edge.from);
    indegree.set(edge.to, indegree.get(edge.to)! + 1);
  }

  // Longest-path ranks, cycle-safe.
  const rank = new Map<string, number>();
  const onStack = new Set<string>();
  const visit = (id: string, r: number): void => {
    if (onStack.has(id)) return; // back-edge in a cycle
    const prev = rank.get(id);
    if (prev !== undefined && prev >= r) return;
    rank.set(id, r);
    onStack.add(id);
    for (const next of out.get(id)!) visit(next, r + 1);
    onStack.delete(id);
  };
  const sources = autoNodes.filter((node) => indegree.get(node.id) === 0);
  for (const source of sources.length > 0 ? sources : [autoNodes[0]]) visit(source.id, 0);
  // Cycle components unreachable from any source: seed a DFS from each still-
  // unranked node so their internal edges keep flowing left → right.
  for (const node of autoNodes) if (!rank.has(node.id)) visit(node.id, 0);

  // Bucket by rank in input order.
  const ranks: FlowCanvasNode[][] = [];
  for (const node of autoNodes) {
    const r = rank.get(node.id)!;
    (ranks[r] ??= []).push(node);
  }
  const orderIndex = new Map<string, number>();
  for (const bucket of ranks) bucket?.forEach((node, i) => orderIndex.set(node.id, i));

  // One barycenter pass: order each rank by the average order of predecessors.
  for (let r = 1; r < ranks.length; r++) {
    const bucket = ranks[r];
    if (!bucket) continue;
    const score = (node: FlowCanvasNode): number => {
      const preds = incoming.get(node.id)!;
      if (preds.length === 0) return orderIndex.get(node.id)!;
      return preds.reduce((sum, p) => sum + (orderIndex.get(p) ?? 0), 0) / preds.length;
    };
    bucket.sort((a, b) => score(a) - score(b) || orderIndex.get(a.id)! - orderIndex.get(b.id)!);
    bucket.forEach((node, i) => orderIndex.set(node.id, i));
  }

  // Position: x per rank column, y stacked and centered per rank.
  const sizeOf = (id: string): NodeSize => sizes?.get(id) ?? ESTIMATED_NODE_SIZE;
  const rankHeights = ranks.map((bucket) =>
    (bucket ?? []).reduce(
      (sum, node, i) => sum + sizeOf(node.id).height + (i > 0 ? NODE_GAP : 0),
      0,
    ),
  );
  const maxHeight = Math.max(0, ...rankHeights);
  let x = 0;
  for (let r = 0; r < ranks.length; r++) {
    const bucket = ranks[r] ?? [];
    let y = (maxHeight - (rankHeights[r] ?? 0)) / 2;
    let maxWidth = 0;
    for (const node of bucket) {
      result.set(node.id, { x, y });
      y += sizeOf(node.id).height + NODE_GAP;
      maxWidth = Math.max(maxWidth, sizeOf(node.id).width);
    }
    x += (maxWidth || ESTIMATED_NODE_SIZE.width) + RANK_GAP;
  }
  return result;
}
