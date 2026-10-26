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
