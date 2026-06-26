import type { ReactNode } from 'react';

/** A mention encountered while rendering, passed to `renderMention`. */
export interface RichTextMention {
  /** The mention's stable id (from the `mention` mark). */
  id: string;
  /** The mention's display label (without the trigger). */
  label: string;
}

/**
 * Replace how a `mention` mark renders. Return your own node (e.g. an interactive
 * member chip / popover trigger) to substitute the mention, or `defaultNode` for
 * the standard non-interactive mention span. Mirrors {@link RenderLink}.
 */
export type RenderMention = (mention: RichTextMention, defaultNode: ReactNode) => ReactNode;
