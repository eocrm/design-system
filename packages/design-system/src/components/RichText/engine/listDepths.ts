// listDepths.ts — list-item detection + gap-free depth normalization, shared by
// the renderer (renderDoc) and the HTML serializer (toHtml) so both reconstruct
// list nesting identically.
import type { Block } from './model';

/** True for the flat list-item block types. */
export function isListItem(block: Block): boolean {
  return block.type === 'bullet_item' || block.type === 'ordered_item';
}

/**
 * Effective render depth per block. `depth` is a free integer on the model, but
 * nesting needs gap-free levels — within each run of consecutive list items,
 * clamp each item to at most one level deeper than the previous (never below 0).
 * Non-list blocks get 0 and reset the run. Lossless: no item is dropped during
 * grouping.
 */
export function effectiveDepths(blocks: Block[]): number[] {
  const eff = new Array<number>(blocks.length).fill(0);
  let prev = -1; // effective depth of the previous list item in the current run
  for (let i = 0; i < blocks.length; i += 1) {
    if (!isListItem(blocks[i])) {
      prev = -1;
      continue;
    }
    const raw = blocks[i].depth ?? 0;
    const e = Math.max(0, Math.min(raw, prev + 1));
    eff[i] = e;
    prev = e;
  }
  return eff;
}
