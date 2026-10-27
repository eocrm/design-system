import { tokenizeLines, highlightedLineSet } from './highlight';
const text = (lines: ReturnType<typeof tokenizeLines>) =>
  lines.map((l) => l.map((t) => t.content).join(''));

it('json: strings, numbers, punctuation get semantic keys', () => {
  const [line] = tokenizeLines('{"a": 1}', 'json');
  expect(line.find((t) => t.content === '"a"')?.key).toBe('property');
  expect(line.find((t) => t.content === '1')?.key).toBe('number');
  expect(line.find((t) => t.content === '{')?.key).toBe('punctuation');
});
it('bash is registered: curl flag and quoted string are highlighted', () => {
  const [line] = tokenizeLines('curl -H "Authorization: Bearer x"', 'bash');
  expect(line.some((t) => t.key === 'string' && t.content.includes('Authorization'))).toBe(true);
  expect(line.some((t) => t.key !== 'plain')).toBe(true);
});
it.each(['javascript', 'typescript', 'python'])('%s yields a keyword', (lang) => {
  const src = lang === 'python' ? 'import os' : 'const a = 1';
  expect(tokenizeLines(src, lang)[0].some((t) => t.key === 'keyword')).toBe(true);
});
it('unknown or missing language → one plain token per line, no throw', () => {
  expect(tokenizeLines('a <b>\nc', 'ruby')).toEqual([
    [{ content: 'a <b>', key: 'plain' }],
    [{ content: 'c', key: 'plain' }],
  ]);
  expect(tokenizeLines('x')).toEqual([[{ content: 'x', key: 'plain' }]]);
});
it('drops exactly one trailing newline', () =>
  expect(text(tokenizeLines('a\nb\n', 'json'))).toEqual(['a', 'b']));
it('splits CRLF without leaving \\r', () =>
  expect(text(tokenizeLines('a\r\nb', 'bash'))).toEqual(['a', 'b']));
it('blank lines are empty, with no stray newline tokens', () => {
  const lines = tokenizeLines('a\n\nb', 'python');
  expect(text(lines)).toEqual(['a', '', 'b']);
  expect(lines.flat().some((t) => t.content.includes('\n'))).toBe(false);
});
it('empty code → one empty line', () => expect(tokenizeLines('', 'json')).toHaveLength(1));
it('highlightedLineSet normalises reversed ranges and ignores out-of-range', () => {
  expect([...highlightedLineSet([[7, 5], 99, 0, 2], 6)].sort()).toEqual([2, 5, 6]);
  expect(highlightedLineSet(undefined, 6).size).toBe(0);
});

it.each(['ruby', 'sql', 'extend', 'constructor', '__proto__'])(
  'language %s is not on the allow-list → plain',
  (lang) => {
    expect(tokenizeLines('let a = 1;\nb', lang)).toEqual([
      [{ content: 'let a = 1;', key: 'plain' }],
      [{ content: 'b', key: 'plain' }],
    ]);
  },
);
it('bash: # starts a comment only at line start or after whitespace', () => {
  const [url] = tokenizeLines('curl https://a.io/#frag -H "X"', 'bash');
  expect(url.some((t) => t.key === 'comment')).toBe(false);
  const [note] = tokenizeLines('echo hi # note', 'bash');
  expect(note.some((t) => t.key === 'comment')).toBe(true);
});

it.each([
  ['go', 'func main() { x := "hi" }'],
  ['kotlin', 'fun main() { val s = "hi" }'],
  ['java', 'public static void main(String[] a) { var s = "hi"; }'],
  ['csharp', 'public static void Main() { var s = "hi"; }'],
  ['rust', 'fn main() { let s = "hi"; }'],
])('%s: keyword and string are highlighted', (lang, src) => {
  const [line] = tokenizeLines(src, lang);
  expect(line.some((t) => t.key === 'keyword')).toBe(true);
  expect(line.some((t) => t.key === 'string' && t.content === '"hi"')).toBe(true);
});
it.each([
  ['golang', 'go'],
  ['kt', 'kotlin'],
  ['kts', 'kotlin'],
  ['cs', 'csharp'],
  ['c#', 'csharp'],
  ['rs', 'rust'],
])('alias %s tokenizes exactly like %s', (alias, canonical) => {
  // Each grammar keywords a different subset of `src`, so any wrong mapping changes the output.
  const src = 'fn func fun nameof native let "a"';
  expect(tokenizeLines(src, alias)).toEqual(tokenizeLines(src, canonical));
  for (const other of ['go', 'kotlin', 'csharp', 'rust', 'java', 'typescript']) {
    if (other !== canonical) {
      expect(tokenizeLines(src, alias)).not.toEqual(tokenizeLines(src, other));
    }
  }
});
it('java/C#: PascalCase types are highlighted, ALL_CAPS constants are not', () => {
  const [line] = tokenizeLines('int n = HttpStatus.OK + MAX_SIZE;', 'java');
  expect(line.find((t) => t.content === 'HttpStatus')?.key).toBe('function');
  expect(line.some((t) => t.key === 'function' && /OK|MAX_SIZE/.test(t.content))).toBe(false);
});
it('java annotation, C# attribute and char literals are not plain', () => {
  const [ann] = tokenizeLines("@Override char c = 'x';", 'java');
  expect(ann.find((t) => t.content === '@Override')?.key).toBe('keyword');
  expect(ann.find((t) => t.content === "'x'")?.key).toBe('string');
  expect(tokenizeLines('[HttpGet]', 'csharp')[0][0].key).toBe('keyword');
});
it.each([
  '[HttpGet("{id}")]',
  '[Route("api/[controller]")]',
  '[assembly: InternalsVisibleTo("T")]',
])('C# attribute %s is one keyword token', (src) =>
  expect(tokenizeLines(src, 'csharp')[0]).toEqual([{ content: src, key: 'keyword' }]),
);
it('C# attribute followed by code on the same line', () => {
  const [line] = tokenizeLines('[Obsolete] public void M() {}', 'csharp');
  expect(line[0]).toEqual({ content: '[Obsolete]', key: 'keyword' });
});
it('C# indexers / collection expressions at line start are not attributes', () => {
  for (const src of ['[0]', '    [One, Two];', '    [Foo, Bar],', '    [Key] = 1,']) {
    expect(tokenizeLines(src, 'csharp')[0].some((t) => t.key === 'keyword')).toBe(false);
  }
});
it('C# raw and @$ strings stay one string token', () => {
  const lines = tokenizeLines('var j = """\n  { "a": 1 }\n  """;', 'csharp');
  expect(lines[1]).toEqual([{ content: '  { "a": 1 }', key: 'string' }]);
  const [v] = tokenizeLines('var p = @$"C:\\{dir}";', 'csharp');
  expect(v.find((t) => t.key === 'string')?.content).toBe('@$"C:\\{dir}"');
});
