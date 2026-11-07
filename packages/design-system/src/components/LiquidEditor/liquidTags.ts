import type { LiquidTag } from './types';

/** Every tag the Insert tag menu can offer, in catalogue order. */
export const ALL_LIQUID_TAGS: readonly LiquidTag[] = [
  'if',
  'unless',
  'case',
  'assign',
  'capture',
  'comment',
];

/** Stable id of one insertable snippet (a tag can have several variants). */
export type LiquidTagSnippetId =
  | 'if'
  | 'ifElse'
  | 'ifElsif'
  | 'unless'
  | 'case'
  | 'assign'
  | 'capture'
  | 'comment';

/** One entry of the Insert tag catalogue. */
export interface LiquidTagSnippet {
  /** Stable snippet id. */
  id: LiquidTagSnippetId;
  /** The `LiquidTag` this snippet belongs to (what the `tags` prop filters on). */
  tag: LiquidTag;
  /** Menu label. */
  label: string;
  /** Template: `$0` marks the caret, `$SEL` is replaced by the selected text. */
  template: string;
}

/** The Insert tag catalogue, in menu order. */
export const LIQUID_TAG_SNIPPETS: readonly LiquidTagSnippet[] = [
  { id: 'if', tag: 'if', label: 'if', template: '{% if $0 %}$SEL{% endif %}' },
  { id: 'ifElse', tag: 'if', label: 'if … else', template: '{% if $0 %}$SEL{% else %}{% endif %}' },
  {
    id: 'ifElsif',
    tag: 'if',
    label: 'if … elsif … else',
    template: '{% if $0 %}$SEL{% elsif %}{% else %}{% endif %}',
  },
  { id: 'unless', tag: 'unless', label: 'unless', template: '{% unless $0 %}$SEL{% endunless %}' },
  {
    id: 'case',
    tag: 'case',
    label: 'case',
    template: '{% case $0 %}{% when "" %}$SEL{% endcase %}',
  },
  { id: 'assign', tag: 'assign', label: 'assign', template: '{% assign $0 = $SEL %}' },
  {
    id: 'capture',
    tag: 'capture',
    label: 'capture',
    template: '{% capture $0 %}$SEL{% endcapture %}',
  },
  {
    id: 'comment',
    tag: 'comment',
    label: 'comment',
    template: '{% comment %}$0$SEL{% endcomment %}',
  },
];

/** Catalogue snippets whose tag is in `tags`, in catalogue order. */
export function snippetsFor(tags: readonly LiquidTag[]): LiquidTagSnippet[] {
  return LIQUID_TAG_SNIPPETS.filter((s) => tags.includes(s.tag));
}

/**
 * Replace `value[selStart, selEnd)` with `template`: `$SEL` becomes the replaced
 * text, the first `$0` is removed and reported as the caret (default: end of the
 * insertion). A template without `$SEL` discards the selection.
 */
export function applySnippet(
  value: string,
  selStart: number,
  selEnd: number,
  template: string,
): { value: string; caret: number } {
  const selected = value.slice(selStart, selEnd);
  // Split on `$0` BEFORE substituting `$SEL`, so a `$0` inside the selection is not mistaken for the caret.
  const i = template.indexOf('$0');
  const sub = (s: string) => s.split('$SEL').join(selected);
  const pre = sub(i < 0 ? template : template.slice(0, i));
  const post = i < 0 ? '' : sub(template.slice(i + 2));
  return {
    value: value.slice(0, selStart) + pre + post + value.slice(selEnd),
    caret: selStart + pre.length,
  };
}
