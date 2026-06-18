export { RichText } from './RichText';
export type { RichTextProps } from './RichText';
// Model types are exported with a `Rich` prefix so the package's flat namespace
// doesn't claim generic names — `Block`/`Mark`/`Point`/`Inline` are likely future
// collisions and `Range` shadows the DOM global. The engine keeps the short names
// internally; only the public surface is prefixed.
export type {
  RichDoc,
  Block as RichBlock,
  BlockType as RichBlockType,
  Inline as RichInline,
  Mark as RichMark,
  MarkType as RichMarkType,
  Point as RichPoint,
  Range as RichRange,
} from './engine/model';
export { emptyDoc, createBlock, docFromText } from './engine/model';
export {
  insertText,
  deleteRange,
  splitBlock,
  mergeBlockBackward,
  applyMark,
  removeMark,
  toggleMark,
  setBlockType,
} from './engine/transforms';
