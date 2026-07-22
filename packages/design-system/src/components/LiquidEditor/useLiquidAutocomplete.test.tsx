import { getAutocompleteContext, applyCompletion } from './useLiquidAutocomplete';

describe('getAutocompleteContext', () => {
  it('returns null when the caret is outside any tag', () => {
    expect(getAutocompleteContext('hello world', 5)).toBeNull();
  });

  it('detects variable context inside an output tag', () => {
    const ctx = getAutocompleteContext('{{ fir', 6);
    expect(ctx).toEqual({ kind: 'variable', query: 'fir', wordStart: 3 });
  });

  it('detects filter context right after a pipe', () => {
    const ctx = getAutocompleteContext('{{ name | up', 12);
    expect(ctx).toEqual({ kind: 'filter', query: 'up', wordStart: 10 });
  });

  it('detects an empty query just after the opening delimiter', () => {
    const ctx = getAutocompleteContext('{{ ', 3);
    expect(ctx).toEqual({ kind: 'variable', query: '', wordStart: 3 });
  });

  it('returns null after the tag is closed', () => {
    expect(getAutocompleteContext('{{ name }} ', 10)).toBeNull();
  });
});

describe('applyCompletion', () => {
  it('replaces the current word with the completion and returns the new caret', () => {
    const result = applyCompletion('{{ fir', 6, { wordStart: 3, query: 'fir' }, 'first_name');
    expect(result.value).toBe('{{ first_name');
    expect(result.caret).toBe('{{ first_name'.length);
  });

  it('replaces a partial filter name', () => {
    const result = applyCompletion('{{ name | up', 12, { wordStart: 10, query: 'up' }, 'upcase');
    expect(result.value).toBe('{{ name | upcase');
    expect(result.caret).toBe('{{ name | upcase'.length);
  });
});

describe('dotted queries (#304)', () => {
  it('query spans the dotted path', () => {
    const v = '{{ event.ty';
    const ctx = getAutocompleteContext(v, v.length);
    expect(ctx).toEqual({ kind: 'variable', query: 'event.ty', wordStart: 3 });
  });

  it('trailing dot keeps the prefix as query', () => {
    const v = '{{ event.';
    const ctx = getAutocompleteContext(v, v.length);
    expect(ctx?.query).toBe('event.');
    expect(ctx?.wordStart).toBe(3);
  });

  it('accepting a dotted completion replaces the whole dotted prefix', () => {
    const v = '{{ event.ty }}';
    const caret = '{{ event.ty'.length;
    const ctx = getAutocompleteContext(v, caret)!;
    const r = applyCompletion(v, caret, ctx, 'event.type');
    expect(r.value).toBe('{{ event.type }}');
  });

  it('filter context after | is unaffected', () => {
    const v = '{{ x | upc';
    expect(getAutocompleteContext(v, v.length)?.kind).toBe('filter');
  });
});
