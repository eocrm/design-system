import { Prism, normalizeTokens } from 'prism-react-renderer';

export type CodeBlockLanguage = 'json' | 'bash' | 'javascript' | 'typescript' | 'python';

export type SyntaxKey =
  | 'keyword'
  | 'string'
  | 'number'
  | 'comment'
  | 'function'
  | 'property'
  | 'punctuation'
  | 'plain';

export interface CodeToken {
  content: string;
  key: SyntaxKey;
}

export const LANGUAGE_LABELS: Record<CodeBlockLanguage, string> = {
  json: 'JSON',
  bash: 'Bash',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
};

// prism-react-renderer ships no bash grammar; register a small one once.
if (!Prism.languages.bash) {
  const variable = /\$(?:\w+|\{[^}]*\})/;
  Prism.languages.bash = {
    comment: { pattern: /(^|\s)#.*/, lookbehind: true },
    string: [
      {
        pattern: /"(?:\\[\s\S]|[^"\\])*"/,
        greedy: true,
        inside: { variable },
      },
      { pattern: /'[^']*'/, greedy: true },
    ],
    variable,
    function: { pattern: /(^|[;|&]\s*)[\w.][\w.-]*/m, lookbehind: true },
    parameter: /--?[\w-]+/,
    operator: /&&|\|\||[|;<>]/,
    punctuation: /\\/,
  };
}

const ALIASES: Record<string, string> = {
  shell: 'bash',
  sh: 'bash',
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
};

const KEY_BY_TYPE: Record<string, SyntaxKey> = {};
const TYPE_GROUPS: Record<Exclude<SyntaxKey, 'plain'>, string[]> = {
  keyword: ['keyword', 'builtin', 'important', 'atrule', 'boolean'],
  string: ['string', 'char', 'attr-value', 'url', 'regex', 'template-string'],
  number: ['number', 'constant'],
  comment: ['comment', 'prolog', 'doctype', 'cdata'],
  function: ['function', 'class-name'],
  property: ['property', 'attr-name', 'tag', 'variable', 'parameter', 'selector'],
  punctuation: ['punctuation', 'operator'],
};
for (const [key, types] of Object.entries(TYPE_GROUPS)) {
  for (const type of types) KEY_BY_TYPE[type] = key as SyntaxKey;
}

const keyOf = (types: string[]): SyntaxKey => {
  for (const type of types) if (KEY_BY_TYPE[type]) return KEY_BY_TYPE[type];
  return 'plain';
};

/** One array of merged tokens per rendered line. Unknown languages render as plain text. */
export function tokenizeLines(code: string, language?: string): CodeToken[][] {
  const src = code.replace(/\r\n?/g, '\n').replace(/\n$/, '');
  const name = language && (Object.hasOwn(ALIASES, language) ? ALIASES[language] : language);
  // Allow-list: Prism bundles ~40 grammars (and helpers like `extend`) we don't style.
  const grammar = name && Object.hasOwn(LANGUAGE_LABELS, name) && Prism.languages[name];
  if (!grammar) return src.split('\n').map((l) => [{ content: l, key: 'plain' as const }]);

  return normalizeTokens(Prism.tokenize(src, grammar)).map((line) => {
    const out: CodeToken[] = [];
    for (const { types, content, empty } of line) {
      // normalizeTokens pads blank lines with a "\n" token; it would add a second line box.
      if (empty) continue;
      const key = keyOf(types);
      const last = out[out.length - 1];
      if (last?.key === key) last.content += content;
      else out.push({ content, key });
    }
    return out;
  });
}

/** Expands `[a, b]` ranges and single numbers into a 1-based set clipped to 1..lineCount. */
export function highlightedLineSet(
  spec: readonly (number | readonly [number, number])[] | undefined,
  lineCount: number,
): ReadonlySet<number> {
  const set = new Set<number>();
  for (const item of spec ?? []) {
    const [a, b] = typeof item === 'number' ? [item, item] : item;
    if (!Number.isInteger(a) || !Number.isInteger(b)) continue;
    for (let n = Math.max(1, Math.min(a, b)); n <= Math.min(lineCount, Math.max(a, b)); n++) {
      set.add(n);
    }
  }
  return set;
}
