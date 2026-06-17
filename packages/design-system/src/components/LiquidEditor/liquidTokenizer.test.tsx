import { tokenize } from './liquidTokenizer';

function types(source: string, known?: string[]) {
  return tokenize(source, known ? new Set(known) : undefined)
    .filter((t) => t.value.trim() !== '') // drop whitespace-only tokens for readability
    .map((t) => [t.type, t.value]);
}

describe('tokenize', () => {
  it('reconstructs the source exactly from token values', () => {
    const src = 'Hi {{ first_name }} — {% if active %}yes{% endif %}';
    const joined = tokenize(src).map((t) => t.value).join('');
    expect(joined).toBe(src);
  });

  it('classifies plain text outside tags', () => {
    expect(types('hello world')).toEqual([['text', 'hello world']]);
  });

  it('classifies an output variable and its delimiters', () => {
    expect(types('{{ name }}')).toEqual([
      ['delimiter', '{{'],
      ['variable', 'name'],
      ['delimiter', '}}'],
    ]);
  });

  it('classifies a filter after a pipe', () => {
    expect(types('{{ name | upcase }}')).toEqual([
      ['delimiter', '{{'],
      ['variable', 'name'],
      ['operator', '|'],
      ['filter', 'upcase'],
      ['delimiter', '}}'],
    ]);
  });

  it('classifies tag keywords and strings', () => {
    expect(types('{% if title == "Senior" %}')).toEqual([
      ['delimiter', '{%'],
      ['keyword', 'if'],
      ['variable', 'title'],
      ['operator', '=='],
      ['string', '"Senior"'],
      ['delimiter', '%}'],
    ]);
  });

  it('classifies numbers', () => {
    expect(types('{{ 42 }}')).toEqual([
      ['delimiter', '{{'],
      ['number', '42'],
      ['delimiter', '}}'],
    ]);
  });

  it('flags an unknown variable when knownCodes is provided', () => {
    expect(types('{{ job_titl }}', ['job_title', 'name'])).toEqual([
      ['delimiter', '{{'],
      ['unknown', 'job_titl'],
      ['delimiter', '}}'],
    ]);
  });

  it('does NOT flag a known variable', () => {
    expect(types('{{ job_title }}', ['job_title'])).toEqual([
      ['delimiter', '{{'],
      ['variable', 'job_title'],
      ['delimiter', '}}'],
    ]);
  });

  it('never flags when knownCodes is omitted (cannot know validity)', () => {
    expect(types('{{ whatever }}')).toEqual([
      ['delimiter', '{{'],
      ['variable', 'whatever'],
      ['delimiter', '}}'],
    ]);
  });

  it('checks only the root identifier for unknown, not dotted properties', () => {
    // `user` is known; `.name` property is neutral, not flagged.
    const out = types('{{ user.name }}', ['user']);
    expect(out).toContainEqual(['variable', 'user']);
    expect(out.every(([type]) => type !== 'unknown')).toBe(true);
  });

  it('does not flag the filter name as an unknown variable', () => {
    const out = types('{{ name | upcase }}', ['name']);
    expect(out.every(([type]) => type !== 'unknown')).toBe(true);
  });

  it('handles an unterminated tag without throwing', () => {
    expect(() => tokenize('{{ name')).not.toThrow();
    expect(tokenize('{{ name').map((t) => t.value).join('')).toBe('{{ name');
  });
});
