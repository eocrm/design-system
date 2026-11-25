/** Kind of a parsed diff line; `note` is a `\ No newline at end of file` marker. */
export type DiffLineKind = 'added' | 'removed' | 'context' | 'note';

/** One line of a hunk. `text` excludes the prefix character; unused numbers are `null`. */
export interface DiffLine {
  kind: DiffLineKind;
  text: string;
  oldNumber: number | null;
  newNumber: number | null;
}

/**
 * One `@@ -a,b +c,d @@` hunk with its lines. `section` is the text after the closing `@@`.
 * A bare `@@ @@` hunk (sebastian/diff without line numbers) is unnumbered: the range
 * fields and its lines' numbers are `null`.
 */
export interface DiffHunk {
  oldStart: number | null;
  oldLines: number | null;
  newStart: number | null;
  newLines: number | null;
  section: string;
  lines: DiffLine[];
}

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@ ?(.*)$/;
const BARE_HEADER = /^@@ @@ ?(.*)$/;

/**
 * Parses a unified text diff (e.g. PHP sebastian/diff output) into hunks.
 * Preamble, file headers and unknown lines are ignored; returns `[]` when there are no hunks.
 */
export function parseUnifiedDiff(diff: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let hunk: DiffHunk | null = null;
  let oldNo = 0;
  let newNo = 0;
  // Strip exactly one final newline so an overcounting header can't turn it into a blank context line.
  const normalized = diff.replace(/\r\n/g, '\n');
  const lines = (normalized.endsWith('\n') ? normalized.slice(0, -1) : normalized).split('\n');
  for (const [i, line] of lines.entries()) {
    const bare = BARE_HEADER.exec(line);
    if (bare) {
      hunk = {
        oldStart: null,
        oldLines: null,
        newStart: null,
        newLines: null,
        section: bare[1],
        lines: [],
      };
      hunks.push(hunk);
      continue;
    }
    const m = HUNK_HEADER.exec(line);
    if (m) {
      oldNo = Number(m[1]);
      newNo = Number(m[3]);
      hunk = {
        oldStart: oldNo,
        oldLines: m[2] === undefined ? 1 : Number(m[2]),
        newStart: newNo,
        newLines: m[4] === undefined ? 1 : Number(m[4]),
        section: m[5],
        lines: [],
      };
      hunks.push(hunk);
      continue;
    }
    if (!hunk) continue;
    const num = (n: number): number | null => (hunk!.oldStart === null ? null : n);
    const text = line.slice(1);
    // Count-driven: once both counts are exhausted, only a trailing `\ No newline` note belongs
    // to the hunk; anything else (e.g. the next file's `---`/`+++`) waits for the next `@@`.
    // An unnumbered hunk has no counts: it runs to the next `@@`, or to the next file's header pair.
    const unnumbered = hunk.oldStart === null;
    if (unnumbered && line.startsWith('--- ') && lines[i + 1]?.startsWith('+++ ')) {
      hunk = null;
      continue;
    }
    const expecting =
      unnumbered ||
      oldNo - hunk.oldStart! < hunk.oldLines! ||
      newNo - hunk.newStart! < hunk.newLines!;
    if (!expecting && line[0] !== '\\') continue;
    // A bare empty line is a context line whose trailing space was stripped.
    const prefix = line === '' ? ' ' : line[0];
    switch (prefix) {
      case '+':
        hunk.lines.push({ kind: 'added', text, oldNumber: null, newNumber: num(newNo++) });
        break;
      case '-':
        hunk.lines.push({ kind: 'removed', text, oldNumber: num(oldNo++), newNumber: null });
        break;
      case ' ':
        hunk.lines.push({
          kind: 'context',
          text,
          oldNumber: num(oldNo++),
          newNumber: num(newNo++),
        });
        break;
      case '\\':
        hunk.lines.push({ kind: 'note', text: text.trim(), oldNumber: null, newNumber: null });
        break;
    }
  }
  return hunks;
}
