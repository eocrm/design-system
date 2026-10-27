import { Prism, normalizeTokens } from 'prism-react-renderer';

export type CodeBlockLanguage =
  | 'json'
  | 'bash'
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'go'
  | 'kotlin'
  | 'java'
  | 'csharp'
  | 'rust';

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
  go: 'Go',
  kotlin: 'Kotlin',
  java: 'Java',
  csharp: 'C#',
  rust: 'Rust',
};

// prism-react-renderer ships no bash grammar; register a small one once.
// Prism is a shared singleton: any consumer of the same prism-react-renderer instance sees it.
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

// Nor Java / C#: both are C-like, so extend `clike` (comments, punctuation, functions) with their keywords.
// Needs a lowercase letter, so ALL_CAPS constants stay plain (as do `T`, `IO`, `URL`).
const pascalCase = /\b[A-Z]\w*[a-z]\w*\b/;
if (!Prism.languages.java) {
  Prism.languages.java = Prism.languages.extend('clike', {
    keyword:
      /\b(?:abstract|assert|break|case|catch|class|const|continue|default|do|else|enum|exports|extends|final|finally|for|goto|if|implements|import|instanceof|interface|module|native|new|non-sealed|null|package|permits|private|protected|public|record|requires|return|sealed|static|strictfp|super|switch|synchronized|this|throw|throws|transient|try|var|void|volatile|while|yield|boolean|byte|char|double|float|int|long|short)\b/,
    string: {
      pattern: /"""[\s\S]*?"""|"(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n]){1,6}'/,
      greedy: true,
    },
    number: /\b0x[\da-f_]+l?\b|(?:\b\d[\d_]*\.?[\d_]*|\B\.\d[\d_]*)(?:e[+-]?\d[\d_]*)?[dfl]?/i,
    'class-name': pascalCase,
  });
  Prism.languages.insertBefore('java', 'class-name', {
    annotation: { pattern: /@\w+/, alias: 'builtin' },
  });
}
if (!Prism.languages.csharp) {
  Prism.languages.csharp = Prism.languages.extend('clike', {
    keyword:
      /\b(?:abstract|as|async|await|base|bool|break|byte|case|catch|char|checked|class|const|continue|decimal|default|delegate|do|double|dynamic|else|enum|event|explicit|extern|finally|fixed|float|for|foreach|get|goto|if|implicit|in|init|int|interface|internal|is|lock|long|namespace|nameof|new|null|object|operator|out|override|params|partial|private|protected|public|readonly|record|ref|required|return|sbyte|sealed|set|short|sizeof|stackalloc|static|string|struct|switch|this|throw|try|typeof|uint|ulong|unchecked|unsafe|ushort|using|var|virtual|void|volatile|when|where|while|with|yield)\b/,
    // Raw `"""`, verbatim `@"` / `$@"` / `@$"`, regular / interpolated, char.
    string: {
      pattern:
        /\$*"""[\s\S]*?"""|(?:\$@|@\$|@)"(?:""|[^"])*"|\$?"(?:\\.|[^"\\\r\n])*"|'(?:\\.|[^'\\\r\n]){1,6}'/,
      greedy: true,
    },
    number:
      /\b0x[\da-f_]+\b|(?:\b\d[\d_]*\.?[\d_]*|\B\.\d[\d_]*)(?:e[+-]?\d[\d_]*)?(?:ul|lu|[dfmlu])?/i,
    'class-name': pascalCase,
  });
  // Before (greedy) `string`, so `[Route("api/[controller]")]` is matched (and coloured) whole.
  Prism.languages.insertBefore('csharp', 'string', {
    attribute: {
      // The lookahead (end of line, identifier, next `[`, comment) rejects `[Foo, Bar],` / `[Key] = 1` initializers.
      pattern:
        /^(\s*)\[(?:\w+:\s*)?[A-Z](?:"(?:\\.|[^"\\\r\n])*"|\[[^\]\r\n]*\]|[^\]"\r\n])*\](?=[ \t]*(?:$|[\w[]|\/[/*]))/m,
      lookbehind: true,
      greedy: true,
      alias: 'builtin',
    },
  });
}

const ALIASES: Record<string, string> = {
  shell: 'bash',
  sh: 'bash',
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  golang: 'go',
  kt: 'kotlin',
  kts: 'kotlin',
  cs: 'csharp',
  'c#': 'csharp',
  rs: 'rust',
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
