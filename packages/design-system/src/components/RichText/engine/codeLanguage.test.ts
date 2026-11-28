import { CODE_LANGUAGES, normalizeCodeLanguage as n } from './codeLanguage';

describe('normalizeCodeLanguage', () => {
  it('maps aliases', () => {
    expect(n('JS')).toBe('javascript');
    expect(n('tsx')).toBe('typescript');
    expect(n('zsh')).toBe('bash');
    expect(n('yml')).toBe('yaml');
    expect(n('c#')).toBe('csharp');
    expect(n('xml')).toBe('html');
  });
  it('plain/empty → undefined', () => {
    expect(n(' Plain ')).toBeUndefined();
    expect(n(undefined)).toBeUndefined();
    expect(n('')).toBeUndefined();
  });
  it('unknown passes through lower-cased', () => expect(n('Elixir')).toBe('elixir'));
  it('canonical names are fixed points', () => {
    expect(CODE_LANGUAGES).toHaveLength(16);
    for (const l of CODE_LANGUAGES) expect(n(l)).toBe(l);
  });
});
