import { describe, expect, it } from 'vitest';
import { ALL_LIQUID_TAGS, LIQUID_TAG_SNIPPETS, applySnippet, snippetsFor } from './liquidTags';

describe('applySnippet', () => {
  it('inserts at a collapsed caret, caret at $0', () => {
    expect(applySnippet('ab', 1, 1, '{% if $0 %}$SEL{% endif %}')).toEqual({
      value: 'a{% if  %}{% endif %}b',
      caret: 'a{% if '.length,
    });
  });
  it('wraps the selection as $SEL', () => {
    expect(applySnippet('xHelloy', 1, 6, '{% if $0 %}$SEL{% endif %}')).toEqual({
      value: 'x{% if  %}Hello{% endif %}y',
      caret: 'x{% if '.length,
    });
  });
  it('no $0 → caret at end of insertion', () => {
    expect(applySnippet('ab', 1, 1, '{{ x }}')).toEqual({
      value: 'a{{ x }}b',
      caret: 'a{{ x }}'.length,
    });
  });
  it('no $SEL → selection replaced', () => {
    expect(applySnippet('aXXb', 1, 3, '{{ x }}$0')).toEqual({
      value: 'a{{ x }}b',
      caret: 'a{{ x }}'.length,
    });
  });
  it('$0 after $SEL is offset by the selection length', () => {
    expect(applySnippet('Hi', 0, 2, '{% comment %}$SEL$0{% endcomment %}').caret).toBe(
      '{% comment %}Hi'.length,
    );
  });
});

describe('snippetsFor', () => {
  it('keeps catalogue order and filters by tag', () => {
    expect(snippetsFor(['case', 'if']).map((s) => s.id)).toEqual([
      'if',
      'ifElse',
      'ifElsif',
      'case',
    ]);
  });
  it('never offers loop tags', () => {
    expect(LIQUID_TAG_SNIPPETS.some((s) => /\{%\s*(for|tablerow|cycle)\b/.test(s.template))).toBe(
      false,
    );
  });
  it('catalogue covers every LiquidTag', () => {
    expect(new Set(LIQUID_TAG_SNIPPETS.map((s) => s.tag))).toEqual(new Set(ALL_LIQUID_TAGS));
  });
});
