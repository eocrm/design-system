/** Kind of a parsed diff line; `note` is a `\ No newline at end of file` marker. */
export type DiffLineKind = 'added' | 'removed' | 'context' | 'note';

/** One line of a hunk. `text` excludes the prefix character; unused numbers are `null`. */
export interface DiffLine {
  kind: DiffLineKind;
  text: string;
  oldNumber: number | null;
  newNumber: number | null;
}

/** One `@@ -a,b +c,d @@` hunk with its lines. `section` is the text after the closing `@@`. */
export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  section: string;
  lines: DiffLine[];
}

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@ ?(.*)$/;

/**
 * Parses a unified text diff (e.g. PHP sebastian/diff output) into hunks.
 * Preamble, file headers and unknown lines are ignored; returns `[]` when there are no hunks.
 */
export function parseUnifiedDiff(diff: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  let hunk: DiffHunk | null = null;
  let oldNo = 0;
  let newNo = 0;
  for (const raw of diff.split('\n')) {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
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
    const text = line.slice(1);
    switch (line[0]) {
      case '+':
        hunk.lines.push({ kind: 'added', text, oldNumber: null, newNumber: newNo++ });
        break;
      case '-':
        hunk.lines.push({ kind: 'removed', text, oldNumber: oldNo++, newNumber: null });
        break;
      case ' ':
        hunk.lines.push({ kind: 'context', text, oldNumber: oldNo++, newNumber: newNo++ });
        break;
      case '\\':
        hunk.lines.push({ kind: 'note', text: text.trim(), oldNumber: null, newNumber: null });
        break;
    }
  }
  return hunks;
}
