import { tokenize, unknownVariables } from './liquidTokenizer';

function types(source: string, known?: string[]) {
  return tokenize(source, known ? new Set(known) : undefined)
    .filter((t) => t.value.trim() !== '') // drop whitespace-only tokens for readability
    .map((t) => [t.type, t.value]);
}

describe('tokenize', () => {
  it('reconstructs the source exactly from token values', () => {
    const src = 'Hi {{ first_name }} — {% if active %}yes{% endif %}';
    const joined = tokenize(src)
      .map((t) => t.value)
      .join('');
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
    expect(
      tokenize('{{ name')
        .map((t) => t.value)
        .join(''),
    ).toBe('{{ name');
  });
});

describe('dotted known codes (#304)', () => {
  const KNOWN = new Set(['event.type', 'record.title', 'first_name']);

  it('does not flag a reference whose root matches a dotted code root', () => {
    const tokens = tokenize('{{ event.type }}', KNOWN);
    expect(tokens.find((t) => t.value === 'event')?.type).toBe('variable');
    expect(unknownVariables('{{ event.type }}', KNOWN)).toEqual([]);
  });

  it('any event.* reference is accepted once an event.* code exists', () => {
    expect(unknownVariables('{{ event.other }}', KNOWN)).toEqual([]);
  });

  it('still flags an unknown root', () => {
    expect(unknownVariables('{{ bogus.thing }}', KNOWN)).toEqual(['bogus']);
    expect(tokenize('{{ bogus }}', KNOWN).find((t) => t.value === 'bogus')?.type).toBe('unknown');
  });

  it('flat codes keep working', () => {
    expect(unknownVariables('{{ first_name }}', KNOWN)).toEqual([]);
  });

  it('dotted segments after the root stay unchecked', () => {
    const tokens = tokenize('{{ event.zzz }}', KNOWN);
    expect(tokens.find((t) => t.value === 'zzz')?.type).toBe('variable');
  });
});

describe('for-loop variables (#304)', () => {
  const KNOWN = new Set(['record.associations']);

  it('does not flag the loop variable declared by a for tag', () => {
    const src = '{% for item in record.associations %}{{ item }}{% endfor %}';
    expect(unknownVariables(src, KNOWN)).toEqual([]);
    // The loop variable is typed 'variable' everywhere, including inside {{ }}.
    expect(tokenize(src, KNOWN).every((t) => t.type !== 'unknown')).toBe(true);
  });

  it('still flags {{ item }} used BEFORE any for-tag declares it', () => {
    const src = '{{ item }}{% for item in record.associations %}{% endfor %}';
    expect(unknownVariables(src, KNOWN)).toEqual(['item']);
  });

  it('still flags a genuinely unknown root inside the loop body', () => {
    const src = '{% for item in record.associations %}{{ bogus }}{% endfor %}';
    expect(unknownVariables(src, KNOWN)).toEqual(['bogus']);
  });
});

describe('assign variables (#310)', () => {
  const KNOWN = new Set(['record.associations']);

  it('does not flag a variable declared by an assign tag', () => {
    const src = '{% assign total = 3 %}{{ total }}';
    expect(unknownVariables(src, KNOWN)).toEqual([]);
    expect(tokenize(src, KNOWN).every((t) => t.type !== 'unknown')).toBe(true);
  });

  it('still flags {{ total }} used BEFORE the assign declares it', () => {
    const src = '{{ total }}{% assign total = 3 %}';
    expect(unknownVariables(src, KNOWN)).toEqual(['total']);
  });

  it('a keyword between for/assign and the name cancels the declaration capture', () => {
    // `case` is a keyword, so `bogus` must NOT be mis-recorded as a declared
    // name (it is the collection here) — and being the first value identifier
    // in the tag, it is root-checked and flagged.
    const src = '{% for case in bogus %}{{ bogus }}{% endfor %}';
    expect(unknownVariables(src, KNOWN)).toEqual(['bogus']);
  });
});
