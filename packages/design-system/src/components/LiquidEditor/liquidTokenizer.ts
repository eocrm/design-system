// liquidTokenizer.ts — pure, dependency-free Liquid tokenizer.
//
// Emits CONTIGUOUS tokens: tokens.map(t => t.value).join('') === source. The
// highlight overlay relies on this so its <pre> text matches the <textarea>
// character-for-character. Classification is presentational, not a parser —
// it never throws on malformed input.

export type LiquidTokenType =
  | 'text' // plain text outside {{ }} / {% %}, and neutral punctuation/space inside
  | 'delimiter' // {{  }}  {%  %}
  | 'variable' // a known (or unvalidated) identifier in value position
  | 'unknown' // an identifier in value position not present in knownCodes
  | 'filter' // an identifier immediately after `|`
  | 'string' // "…" or '…'
  | 'number' // 42, 3.14
  | 'keyword' // if, for, in, and, or, …
  | 'operator'; // | == != <= >= < > = . : , ( )

export interface LiquidToken {
  type: LiquidTokenType;
  value: string;
  /** Start index in the source string (inclusive). */
  start: number;
  /** End index in the source string (exclusive). */
  end: number;
}

const KEYWORDS = new Set([
  'if',
  'elsif',
  'else',
  'endif',
  'unless',
  'endunless',
  'case',
  'when',
  'endcase',
  'for',
  'endfor',
  'in',
  'break',
  'continue',
  'and',
  'or',
  'not',
  'contains',
  'assign',
  'capture',
  'endcapture',
  'true',
  'false',
  'nil',
  'empty',
  'null',
]);

const IDENT_START = /[A-Za-z_]/;
const IDENT_CHAR = /[A-Za-z0-9_]/;
const DIGIT = /[0-9]/;

/**
 * Tokenize a Liquid template string for highlighting + unknown-variable
 * detection.
 *
 * @param source The raw template string.
 * @param knownCodes When provided and non-empty, a root identifier in value
 *   position that is not in the set is typed `unknown`. Codes may be dotted
 *   paths (e.g., "event.type"); the root identifier (first segment before the
 *   first dot) is derived for membership testing. Omit (or pass an empty set)
 *   to never flag — the caller cannot assert validity.
 */
export function tokenize(source: string, knownCodes?: ReadonlySet<string>): LiquidToken[] {
  const tokens: LiquidToken[] = [];
  const n = source.length;
  let i = 0;
  const hasKnown = knownCodes !== undefined && knownCodes.size > 0;
  // #304: `code` is a PATH — "event.type" makes the ROOT `event` known. A
  // reference is checked by its root identifier only, so membership is
  // tested against the set of first dotted segments.
  const knownRoots = hasKnown ? new Set([...knownCodes!].map((c) => c.split('.')[0])) : undefined;
  // #304: `{% for item in … %}` declares `item` — collect loop variables as the
  // pass encounters them so later references (in tags and {{ }} bodies) aren't
  // flagged unknown. Single forward pass: a use BEFORE its declaration stays
  // flagged — acceptable ceiling, generated snippets always declare first.
  const loopVars = new Set<string>();

  const push = (type: LiquidTokenType, start: number, end: number) => {
    if (end > start) tokens.push({ type, value: source.slice(start, end), start, end });
  };

  while (i < n) {
    const isOpen = source[i] === '{' && (source[i + 1] === '{' || source[i + 1] === '%');
    if (!isOpen) {
      // Accumulate plain text up to the next tag open or EOF.
      const start = i;
      while (i < n && !(source[i] === '{' && (source[i + 1] === '{' || source[i + 1] === '%'))) {
        i += 1;
      }
      push('text', start, i);
      continue;
    }

    // Tag: emit the opening delimiter, then the interior, then the close.
    const isOutput = source[i + 1] === '{';
    const close = isOutput ? '}}' : '%}';
    push('delimiter', i, i + 2);
    i += 2;

    const interiorEnd = (() => {
      const idx = source.indexOf(close, i);
      return idx === -1 ? n : idx;
    })();

    // `expectFilter` is set right after a `|` so the next identifier is a filter.
    // `seenValue` tracks whether we've already consumed the leading value
    // identifier in this tag (so only the ROOT identifier is unknown-checked).
    let expectFilter = false;
    let seenValue = false;
    // Set right after the `for` keyword in a `{% %}` tag — the next identifier
    // is the loop-variable declaration.
    let expectLoopVar = false;
    // For `{% if … %}` the first identifier is the tag-name keyword.

    while (i < interiorEnd) {
      const c = source[i];

      if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
        const start = i;
        while (i < interiorEnd && /\s/.test(source[i])) i += 1;
        push('text', start, i);
        continue;
      }

      if (c === '"' || c === "'") {
        const start = i;
        i += 1;
        while (i < interiorEnd && source[i] !== c) i += 1;
        if (i < interiorEnd) i += 1; // closing quote
        push('string', start, i);
        continue;
      }

      if (DIGIT.test(c)) {
        const start = i;
        while (i < interiorEnd && (DIGIT.test(source[i]) || source[i] === '.')) i += 1;
        push('number', start, i);
        continue;
      }

      if (IDENT_START.test(c)) {
        const start = i;
        i += 1;
        while (i < interiorEnd && IDENT_CHAR.test(source[i])) i += 1;
        const word = source.slice(start, i);
        const isDottedProperty = start > 0 && source[start - 1] === '.';

        if (expectFilter) {
          push('filter', start, i);
          expectFilter = false;
        } else if (KEYWORDS.has(word)) {
          push('keyword', start, i);
          if (!isOutput && word === 'for') expectLoopVar = true;
        } else if (isDottedProperty) {
          push('variable', start, i); // neutral property access; not unknown-checked
        } else {
          if (expectLoopVar) loopVars.add(word);
          const unknown =
            hasKnown &&
            !seenValue &&
            !expectLoopVar &&
            !knownRoots!.has(word) &&
            !loopVars.has(word);
          // Only the leading value identifier is the "root"; subsequent ones
          // (rare) are treated as variables but not unknown-checked.
          push(unknown ? 'unknown' : 'variable', start, i);
          seenValue = true;
          expectLoopVar = false;
        }
        continue;
      }

      if (c === '|') {
        push('operator', i, i + 1);
        expectFilter = true;
        i += 1;
        continue;
      }

      // Multi-char operators (==, !=, <=, >=) then single punctuation.
      const two = source.slice(i, i + 2);
      if (['==', '!=', '<=', '>='].includes(two)) {
        push('operator', i, i + 2);
        i += 2;
        continue;
      }
      if ('<>=.,:()'.includes(c)) {
        push('operator', i, i + 1);
        i += 1;
        continue;
      }

      // Anything else (neutral) — emit as text so the stream stays contiguous.
      push('text', i, i + 1);
      i += 1;
    }

    // Closing delimiter (if present).
    if (interiorEnd < n) {
      push('delimiter', interiorEnd, interiorEnd + 2);
      i = interiorEnd + 2;
    } else {
      i = n;
    }
  }

  return tokens;
}

/**
 * The root variable codes referenced in `{{ }}` / `{% %}` that are NOT in
 * `knownCodes` — i.e. the names the editor flags. Empty when `knownCodes` is
 * omitted/empty. Drives the footer "unknown variable" warning.
 */
export function unknownVariables(source: string, knownCodes: ReadonlySet<string>): string[] {
  if (knownCodes.size === 0) return [];
  const seen = new Set<string>();
  for (const t of tokenize(source, knownCodes)) {
    if (t.type === 'unknown') seen.add(t.value);
  }
  return [...seen];
}
