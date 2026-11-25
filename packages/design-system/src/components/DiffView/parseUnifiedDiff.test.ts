import { parseUnifiedDiff } from './parseUnifiedDiff';

const SAMPLE = [
  '--- Original',
  '+++ New',
  '@@ -1,4 +1,4 @@',
  ' keep',
  '-old',
  '+new',
  ' tail',
].join('\n');

describe('parseUnifiedDiff', () => {
  it('numbers lines of the eocrm sample', () => {
    const [h] = parseUnifiedDiff(SAMPLE);
    expect(h).toMatchObject({ oldStart: 1, oldLines: 4, newStart: 1, newLines: 4, section: '' });
    expect(h.lines).toEqual([
      { kind: 'context', text: 'keep', oldNumber: 1, newNumber: 1 },
      { kind: 'removed', text: 'old', oldNumber: 2, newNumber: null },
      { kind: 'added', text: 'new', oldNumber: null, newNumber: 2 },
      { kind: 'context', text: 'tail', oldNumber: 3, newNumber: 3 },
    ]);
  });

  it('parses two hunks with independent numbering', () => {
    const hunks = parseUnifiedDiff('@@ -1,2 +1,2 @@\n a\n-b\n+c\n@@ -10,2 +10,2 @@\n x\n-y\n+z\n');
    expect(hunks).toHaveLength(2);
    expect(hunks[1].lines.map((l) => [l.oldNumber, l.newNumber])).toEqual([
      [10, 10],
      [11, null],
      [null, 11],
    ]);
  });

  it('defaults omitted counts to 1', () => {
    const [h] = parseUnifiedDiff('@@ -5 +7 @@\n-a\n+b');
    expect(h).toMatchObject({ oldStart: 5, oldLines: 1, newStart: 7, newLines: 1 });
  });

  it('numbers new lines from 1 for -0,0 +1,3', () => {
    const [h] = parseUnifiedDiff('@@ -0,0 +1,3 @@\n+a\n+b\n+c');
    expect(h.lines.map((l) => l.newNumber)).toEqual([1, 2, 3]);
    expect(h.lines.every((l) => l.oldNumber === null)).toBe(true);
  });

  it('tolerates CRLF', () => {
    const [h] = parseUnifiedDiff('@@ -1 +1 @@\r\n-a\r\n+b\r\n');
    expect(h.lines.map((l) => l.text)).toEqual(['a', 'b']);
  });

  it('does not add a line for the trailing newline', () => {
    expect(parseUnifiedDiff('@@ -1 +1 @@\n-a\n+b\n')[0].lines).toHaveLength(2);
  });

  it('turns "\\ No newline at end of file" into a note', () => {
    const [h] = parseUnifiedDiff('@@ -1 +1 @@\n-a\n\\ No newline at end of file\n+b');
    expect(h.lines[1]).toEqual({
      kind: 'note',
      text: 'No newline at end of file',
      oldNumber: null,
      newNumber: null,
    });
    expect(h.lines[2].newNumber).toBe(1);
  });

  it('ignores preamble and unknown lines', () => {
    const hunks = parseUnifiedDiff(
      'diff --git a/x b/x\nindex 1..2 100644\n--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\nweird\n+b',
    );
    expect(hunks).toHaveLength(1);
    expect(hunks[0].lines.map((l) => l.kind)).toEqual(['removed', 'added']);
  });

  it('returns [] for empty and headers-only input', () => {
    expect(parseUnifiedDiff('')).toEqual([]);
    expect(parseUnifiedDiff('--- a\n+++ b\n')).toEqual([]);
  });

  it('carries the text after the closing @@ as section', () => {
    expect(parseUnifiedDiff('@@ -1 +1 @@ function foo()\n-a\n+b')[0].section).toBe(
      'function foo()',
    );
  });

  it('counts a bare empty line as context while the hunk expects lines', () => {
    const [h] = parseUnifiedDiff('@@ -1,3 +1,3 @@\n a\n\n-b\n+c\n');
    expect(h.lines).toEqual([
      { kind: 'context', text: 'a', oldNumber: 1, newNumber: 1 },
      { kind: 'context', text: '', oldNumber: 2, newNumber: 2 },
      { kind: 'removed', text: 'b', oldNumber: 3, newNumber: null },
      { kind: 'added', text: 'c', oldNumber: null, newNumber: 3 },
    ]);
  });

  it('ignores empty lines once the hunk counts are exhausted', () => {
    expect(parseUnifiedDiff('@@ -1 +1 @@\n-a\n+b\n\n\n')[0].lines).toHaveLength(2);
  });

  it('skips file headers that follow a completed hunk', () => {
    const hunks = parseUnifiedDiff('@@ -1 +1 @@\n-a\n+b\n--- a/y\n+++ b/y\n@@ -1 +1 @@\n-c\n+d');
    expect(hunks).toHaveLength(2);
    expect(hunks[0].lines.map((l) => l.text)).toEqual(['a', 'b']);
    expect(hunks[1].lines).toEqual([
      { kind: 'removed', text: 'c', oldNumber: 1, newNumber: null },
      { kind: 'added', text: 'd', oldNumber: null, newNumber: 1 },
    ]);
  });

  it('keeps ---/+++-looking lines inside a hunk that still expects lines', () => {
    const [h] = parseUnifiedDiff('@@ -1,2 +1,2 @@\n--- x\n+++ y\n a');
    expect(h.lines.map((l) => [l.kind, l.text])).toEqual([
      ['removed', '-- x'],
      ['added', '++ y'],
      ['context', 'a'],
    ]);
  });

  it('ignores a malformed @@ line', () => {
    expect(parseUnifiedDiff('@@ -x +y @@\n-a\n+b')).toEqual([]);
  });
});
