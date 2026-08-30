// Meta-test: codifies the "every component has the four required files and
// is re-exported from src/index.ts" rule from packages/design-system/CLAUDE.md
// so a missing test/export fails CI instead of being caught only at review.

import ts from 'typescript';
import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const componentsDir = join(__dirname, 'components');
const indexPath = join(__dirname, 'index.ts');

const allComponentDirs = readdirSync(componentsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);
/**
 * Directories subject to the STRUCTURAL rules — four files, a public export.
 *
 * Underscore-prefixed directories (e.g. `_internal`) are private helpers
 * shared between components, not components themselves, so they owe no
 * `index.ts` entry and no demo page.
 *
 * That is the only thing the exclusion licenses. It does NOT exempt them from
 * Hard rules 9 and 10: `_internal/overlay` is shipped library code, and a
 * private helper rendering inline English or a bare `aria-busy` is exactly as
 * broken as a public one. The source-scanning gates use `allComponentDirs`
 * instead — a probe file under `_internal` used to run the whole suite green
 * because it was never enumerated.
 */
const components = allComponentDirs.filter((name) => !name.startsWith('_'));

/**
 * Strip comments using the TypeScript PARSER.
 *
 * Five hand-rolled versions preceded this and each had a defect no gate could
 * have caught — two of them BLINDNESS, silently deleting real code from the
 * scan. The one worth remembering: `FileUpload.tsx:162` is
 * `} else if (token.endsWith('/*'))`, so a `/*` inside a STRING opened a
 * comment that a file-wide regex closed 116 lines later. `ts.createScanner`
 * does not fix it either — JSX context is parser-driven, so a raw token
 * scanner reads JSX text as a comment.
 *
 * The parser yields exact spans for string literals, template parts, regex
 * literals and JSX text; a `/` outside all of them starts a comment. Comments
 * are BLANKED rather than removed so every other character keeps its offset
 * and failure line numbers stay right.
 */
const stripComments = (code: string) => {
  const sourceFile = ts.createSourceFile(
    'probe.tsx',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  // Bytes covered by a literal or by JSX text, where `//` and `/*` are content.
  const literal = new Uint8Array(code.length);
  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isJsxText(node) ||
      ts.isRegularExpressionLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      literal.fill(1, node.getStart(sourceFile), node.getEnd());
    }
    node.forEachChild(visit);
  };
  visit(sourceFile);

  // Loud on a bad parse. Without this a file the parser cannot read yields no
  // literal spans, every `/` reads as a comment opener, and the gate degrades
  // silently to exactly the blindness this function was written to remove.
  // Every component source parses clean today, so this is a tripwire, not a
  // fix — but a silent one is what the first five versions had.
  const diagnostics = (sourceFile as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics;
  if (diagnostics && diagnostics.length > 0) {
    throw new Error(`stripComments: source did not parse (${diagnostics.length} diagnostics)`);
  }

  const out = code.split('');
  const blank = (from: number, to: number) => {
    for (let i = from; i < to && i < out.length; i += 1) if (out[i] !== '\n') out[i] = ' ';
  };
  for (let i = 0; i < code.length; i += 1) {
    if (code[i] !== '/' || literal[i]) continue;
    if (code[i + 1] === '/') {
      let j = i;
      while (j < code.length && code[j] !== '\n') j += 1;
      blank(i, j);
      i = j;
    } else if (code[i + 1] === '*') {
      let j = i + 2;
      while (j < code.length && !(code[j] === '*' && code[j + 1] === '/')) j += 1;
      blank(i, j + 2);
      i = j + 1;
    }
  }
  return out.join('');
};

// Comments stripped: a commented-out `export { Pagination }` satisfied the
// re-export gate while the component was unimportable from the package
// entry — tests green, consumer build broken, which is the exact failure
// Hard rule 5 exists for.
/**
 * Every non-test `.tsx` under `components/`, at any depth, in ONE pass.
 *
 * Previously two walkers had to agree on skip rules by hand — one driven off a
 * caller-supplied directory list, one counting straight off the disk — and
 * they diverged in two ways that made the count gate reject CORRECT code: a
 * `_`-prefixed SUBdirectory holding a `.tsx` (skipped by one, counted by the
 * other), and a `.tsx` sitting directly under `components/` (counted, never
 * walked). Both produced `expected 191 to be 192` naming neither the file nor
 * the cause.
 *
 * One pass removes the disagreement rather than patching it. `_internal` is
 * READ — it is shipped library code and Hard rules 9 and 10 apply to it — and
 * the underscore filter survives only on `components`, which serves the
 * structural four-file rules where a private helper genuinely owes nothing.
 */
const allSources = (): { label: string; code: string }[] => {
  const walk = (dir: string, prefix: string): { label: string; code: string }[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return walk(full, `${prefix}${entry.name}/`);
      return entry.name.endsWith('.tsx') && !entry.name.includes('.test.')
        ? [{ label: `${prefix}${entry.name}`, code: readFileSync(full, 'utf-8') }]
        : [];
    });
  return walk(componentsDir, '');
};

const indexContent = stripComments(readFileSync(indexPath, 'utf-8'));

const TOKENS_SCSS = readFileSync(
  join(__dirname, '../../design-tokens/generated/web/tokens.scss'),
  'utf-8',
);
const DARK_SCSS_FILE = readFileSync(
  join(__dirname, '../../design-tokens/generated/web/dark.scss'),
  'utf-8',
);
/**
 * Only the `:root[data-theme='dark']` block.
 *
 * `dark.scss` also contains a `:root[data-theme='light']` block, so resolving a
 * dark value by taking the first match in the whole FILE was correct only
 * because the generator happens to emit the dark selector first. Reordering it
 * would silently resolve dark annotations against light literals — every dark
 * `@contrast` then checked against the wrong number, with nothing failing.
 */
const DARK_SCSS = (() => {
  const start = DARK_SCSS_FILE.indexOf(":root[data-theme='dark'] {");
  if (start < 0) throw new Error("dark.scss has no :root[data-theme='dark'] block");
  const open = DARK_SCSS_FILE.indexOf('{', start);
  let depth = 1;
  for (let i = open + 1; i < DARK_SCSS_FILE.length; i++) {
    if (DARK_SCSS_FILE[i] === '{') depth++;
    else if (DARK_SCSS_FILE[i] === '}' && --depth === 0) return DARK_SCSS_FILE.slice(open + 1, i);
  }
  throw new Error("dark.scss :root[data-theme='dark'] block is unterminated");
})();

describe('library structure', () => {
  it('discovered at least one component', () => {
    expect(components.length).toBeGreaterThan(0);
  });

  it.each(components)(
    '%s has all four required files (Name.tsx, Name.test.tsx, Name.module.scss, index.ts)',
    (name) => {
      const dir = join(componentsDir, name);
      expect(existsSync(join(dir, `${name}.tsx`))).toBe(true);
      expect(existsSync(join(dir, `${name}.test.tsx`))).toBe(true);
      expect(existsSync(join(dir, `${name}.module.scss`))).toBe(true);
      expect(existsSync(join(dir, 'index.ts'))).toBe(true);
    },
  );

  it.each(components)('%s is re-exported from src/index.ts', (name) => {
    // The name, case-insensitively — nothing else. The previous form allowed
    // an uppercase continuation so that `ToastViewport` could satisfy `Toast`,
    // and that branch let a COMPOUND export stand in for the component's own:
    // 13 of 92 components passed without exporting themselves, so deleting
    // `export { Button }` left `ButtonGroup` keeping the gate green while
    // Button became unimportable. Its own comment defended only the lowercase
    // direction while the uppercase branch it was defending opened that hole.
    //
    // Case-insensitivity is what the `[A-Z]` branch was really for, and it is
    // load-bearing for exactly one component: Toast, exported as `toast`.
    // Measured across all 92: no false alarms, no remaining holes.
    const namedRe = new RegExp(`export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`, 'i');
    const starRe = new RegExp(`export\\s+\\*\\s+from\\s+['"][^'"]*${name}[^'"]*['"]`);
    expect(namedRe.test(indexContent) || starRe.test(indexContent)).toBe(true);
  });
});

describe('transient state does not rely on aria-busy alone', () => {
  const sources = allSources().map(({ label, code }) => ({
    label,
    code: stripComments(code),
  }));

  const withAriaBusy = sources.filter(({ code }) => /aria-busy=/.test(code));

  it('found files to check', () => {
    // Guards the guard: a rename of the attribute or a restructure of the tree
    // would otherwise make every assertion below vacuously pass.
    // COVERAGE by naming files, not by counting them. A count needed a second
    // walker to compare against, and the two disagreed on `_`-prefixed
    // subdirectories and on files directly under `components/` — rejecting
    // correct code twice with a message naming neither the file nor the cause.
    // With one walker there is nothing to disagree with, so the check names
    // what must be reachable instead.
    const labels = sources.map((s) => s.label);
    expect(labels).toContain('RichText/engine/renderDoc.tsx'); // nested directory
    expect(labels).toContain('Badge/Badge.tsx'); // ordinary component
    expect(labels.every((l) => !l.includes('.test.'))).toBe(true);
    expect(sources.length).toBeGreaterThan(50);
    expect(withAriaBusy.length).toBeGreaterThan(0);
  });

  it.each(withAriaBusy.map(({ label, code }) => [label, code]))(
    '%s carries a live region or a named state word alongside aria-busy',
    (_label, code) => {
      // Anchored to an opening tag — a bare `[role="status"]` selector literal
      // would otherwise satisfy this (no component source does that today; the
      // anchor is defensive, not a fix for a live pass). `aria-live` must be a
      // value that actually announces: `aria-live="off"` is the attribute
      // present and explicitly disabled, which is not a mechanism.
      // The `aria-live="off"` rejection has to be a NEGATIVE lookahead, not a
      // value match on the aria-live branch: `role="status"` implies polite, so
      // an element carrying both `role="status"` and an explicit
      // `aria-live="off"` matched on the role branch and never had its
      // aria-live inspected. The comment claimed otherwise — fourth time in
      // this PR that a comment named an input the gate could not fail on.
      const liveRegion =
        /<[A-Za-z](?![^>]*aria-live=("|')off\1)[^>]*(role=("|')(status|alert)\3|aria-live=("|')(polite|assertive)\5)/.test(
          code,
        );
      // Scoped to a qualifying span, not two file-wide tests. The `}` anchor
      // rejects `srOnlyDecorativeThing` and `hiddenLabelWrapper`, and the `t(`
      // must sit inside SOME visually-hidden span's children — not necessarily
      // the state one, which a regex cannot identify. Testing them separately
      // meant the `t(` could be anywhere in the file — 70 of 190 component
      // files have one — so
      // EntityChip with BOTH state spans deleted still passed, carried by a
      // decorative hiddenLabel span and an unrelated call. That is the #483
      // regression this gate exists for, third version in a row where the
      // comment named an input the gate could not fail on.
      //
      // Known limits. One IS a current shape: `aria-live={expr}` is rejected,
      // and `Toast` is exactly that — it does not false-alarm only because
      // Toast sets no `aria-busy`. The rest are not current: the opening-tag scan stops
      // at the first `>`, so an arrow function in the tag before the attribute
      // would false-alarm; `t` is hardcoded as the hook's binding; and an
      // element between the span and its `t()` would not match.
      const namedState = /styles\.(srOnly|hiddenLabel)\}[^>]*>[^<]*\bt\(/.test(code);
      expect(liveRegion || namedState).toBe(true);
    },
  );
});

/**
 * No component token may hard-code a value a semantic token already holds.
 *
 * This is the shape #490 asked for, and deliberately NOT another hand-written
 * list: the two gates #484 added were enumerations of tones someone already
 * knew to worry about, and that mechanism failed three review rounds running.
 * It walks every `*.tokens.scss` and compares literal hexes against every
 * generated semantic value.
 *
 * What it catches is the copy-by-hand shape: a component literal that equals a
 * semantic token's value with no `var()` linking them, so the two track each
 * other only by luck. `--color-info` and `--color-accent` were byte-identical
 * for exactly that reason until a retune split them silently, and Badge's 36
 * literals were the same bet at scale.
 *
 * Deliberately NOT flagged: values with no semantic equivalent (the categorical
 * avatar and palette scales are meant to be independent), and anything already
 * written as `var(...)`.
 */
describe('component tokens do not shadow a semantic value', () => {
  const semanticByValue = new Map<string, string[]>();
  for (const src of [TOKENS_SCSS, DARK_SCSS]) {
    for (const m of src.matchAll(/(--color-[a-z0-9-]+):\s*(#[0-9a-f]{6});/gi)) {
      const [, name, value] = m;
      const key = value!.toLowerCase();
      semanticByValue.set(key, [...(semanticByValue.get(key) ?? []), name!]);
    }
  }

  // Independent by design: these scales are categorical, not semantic, so
  // sharing a value with a tone is coincidence rather than a broken link.
  const INDEPENDENT = /^--color-(avatar|palette)-/;

  const componentTokenFiles = components.flatMap((name) => {
    const dir = join(componentsDir, name);
    return readdirSync(dir)
      .filter((f) => f.endsWith('.tokens.scss'))
      .map((f) => ({ label: `${name}/${f}`, code: readFileSync(join(dir, f), 'utf-8') }));
  });

  it('found component token files to check', () => {
    expect(componentTokenFiles.length).toBeGreaterThan(10);
    expect(semanticByValue.size).toBeGreaterThan(20);
  });

  it.each(componentTokenFiles.map(({ label, code }) => [label, code]))('%s', (_label, code) => {
    const shadowed: string[] = [];
    // Not anchored to line start, `;` optional, and 3-digit hexes expanded.
    // All three were ordinary ways to write the same shadow and all three were
    // invisible: `#fff` is how a person hand-copying actually types the most
    // shadowed value in the system (it is --color-bg, --color-accent-fg,
    // --color-avatar-fg, --color-danger-fg, --color-fg-on-overlay and
    // --color-success-fg), a final declaration often has no `;`, and two
    // declarations on one line only ever matched the first.
    for (const m of code.matchAll(/(--[a-z0-9-]+):\s*(#(?:[0-9a-f]{3}){1,2})\b/gi)) {
      const [, name, raw] = m;
      const short = raw!.length === 4;
      const value = short
        ? `#${raw!
            .slice(1)
            .split('')
            .map((c) => c + c)
            .join('')}`
        : raw!;
      const owners = (semanticByValue.get(value.toLowerCase()) ?? []).filter(
        (owner) => !INDEPENDENT.test(owner),
      );
      if (owners.length > 0) shadowed.push(`${name} (${raw}) === ${owners.join(' / ')}`);
    }
    expect(
      shadowed,
      'hard-coded a value a semantic token already holds — alias it with var() instead, or the two track each other only by luck',
    ).toEqual([]);
  });
});

/**
 * Hard rule 9: no inline English on a user-visible surface.
 *
 * Walked on the TypeScript AST. Every `aria-*` is textual unless it is one of
 * the enumerated ID- or enum-valued ones in NON_TEXTUAL below, so a NEW
 * textual ARIA attribute is caught by default rather than needing to be
 * remembered — that enumeration is what made #492's count wrong four times
 * running. JSX text is read too.
 *
 * Six regex and hand-scanner versions preceded this, each of which could not
 * fail on some shape of its own stated input, and each replaced after a
 * reviewer found the shape rather than the gate finding it. They are in the
 * git history; the lesson worth keeping in the file is that recognising where
 * a value starts and ends needs the grammar, and the compiler is already a
 * devDependency. Two live violations surfaced when the scan replaced the
 * regexes, and three more when the AST replaced the scan.
 *
 * Known limits, stated rather than discovered later:
 * - A string assembled in a variable is invisible. Only literals reachable
 *   from the attribute or the JSX text are judged.
 * - A template literal wrapping a ternary is one literal whose `${…}` is
 *   blanked before judging, so both branches go unseen.
 * - `isEnglish` is a heuristic: two letters after URLs, interpolations and CSS
 *   units are removed. It cannot tell prose from an identifier, so a literal
 *   like `en-US` would be reported. Nothing in the library hits that today.
 */
describe('user-facing strings go through the i18n provider', () => {
  /** ARIA attributes whose values are ids, enums, booleans or numbers. */
  const NON_TEXTUAL = new Set([
    'aria-hidden',
    'aria-expanded',
    'aria-selected',
    'aria-checked',
    'aria-disabled',
    'aria-controls',
    'aria-labelledby',
    'aria-describedby',
    'aria-current',
    'aria-orientation',
    'aria-live',
    'aria-atomic',
    'aria-modal',
    'aria-multiselectable',
    'aria-invalid',
    'aria-busy',
    'aria-haspopup',
    'aria-pressed',
    'aria-readonly',
    'aria-required',
    'aria-activedescendant',
    'aria-owns',
    'aria-valuemin',
    'aria-valuemax',
    'aria-valuenow',
    'aria-autocomplete',
    'aria-multiline',
    'aria-level',
    'aria-posinset',
    'aria-setsize',
    'aria-colcount',
    'aria-colindex',
    'aria-rowcount',
    'aria-rowindex',
    'aria-sort',
    'aria-relevant',
    'aria-dropeffect',
    'aria-grabbed',
    'aria-flowto',
    'aria-details',
    'aria-errormessage',
    'aria-keyshortcuts',
  ]);

  const sources = allSources();

  it('found sources to check', () => {
    // COVERAGE by naming files, not by counting them. A count needed a second
    // walker to compare against, and the two disagreed on `_`-prefixed
    // subdirectories and on files directly under `components/` — rejecting
    // correct code twice with a message naming neither the file nor the cause.
    // With one walker there is nothing to disagree with, so the check names
    // what must be reachable instead.
    const labels = sources.map((s) => s.label);
    expect(labels).toContain('RichText/engine/renderDoc.tsx'); // nested directory
    expect(labels).toContain('Badge/Badge.tsx'); // ordinary component
    expect(labels.every((l) => !l.includes('.test.'))).toBe(true);
    expect(sources.length).toBeGreaterThan(50);
  });

  it.each(sources.map(({ label, code }) => [label, code]))('%s', (_label, code) => {
    const offenders: string[] = [];
    // Walked on the AST, not scanned. `stripComments` already builds a full
    // SourceFile for this file and threw it away, while ~90 lines below it
    // hand-rolled a brace walk, quote tracking, a length bound, and heuristics
    // for "is this literal an operand" and "is this inside t()" — all of which
    // the parser answers exactly. Deleting them also closed the hole those
    // heuristics existed to paper over: JSX TEXT, which the previous docblock
    // conceded it never read while claiming the exclusion-derived attribute
    // set had addressed it.
    const sourceFile = ts.createSourceFile(
      'probe.tsx',
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    const isKey = (lit: string) => /^[a-z][a-zA-Z]*\.[a-zA-Z.]+$/.test(lit);
    const isEnglish = (lit: string) => {
      const bare = lit
        // URLs first, while each is still one token: the interpolation and
        // unit strips below both split one and leave prose-looking remnants.
        .replace(/(?<![A-Za-z])[a-z][a-z0-9+.-]*:\/\/\S*/g, ' ')
        .replace(/\$\{[^}]*\}/g, ' ')
        // TWO forms. A digit-attached unit needs the digits in the pattern —
        // `\b` finds no boundary between `0` and `p`, so the bare shape this
        // was written for, "100px", was flagged as English while only the
        // interpolated form was exempt. The standalone form is kept for what
        // interpolation-blanking leaves behind (`${w}px` -> " px"). NOT solved
        // by dropping the leading boundary: `(em)\b` alone would strip the tail
        // of "them" and "problem".
        .replace(/\b\d+(?:px|em|rem|vh|vw|ms|fr|ch|pt|deg)\b/g, ' ')
        .replace(/\b(px|em|rem|vh|vw|ms|fr|ch|pt|deg)\b/g, ' ')
        .trim();
      return /[A-Za-z]{2}/.test(bare);
    };

    /** True when this node sits inside a `t(...)` call — routed by definition. */
    const insideTranslator = (node: ts.Node) => {
      for (let n: ts.Node | undefined = node.parent; n; n = n.parent) {
        if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 't')
          return true;
      }
      return false;
    };

    const literalsIn = (node: ts.Node, out: string[]) => {
      // Defensive only, and currently UNREACHABLE: `literalsIn` has one caller,
      // a watched attribute's initializer, and none of `aria-*`/`placeholder`/
      // `title`/`alt` can hold JSX. The "failing 30 files at once" it used to
      // cite happened in an intermediate where this also served the child
      // branch; `renderedLiterals` took that job. Kept because giving it back
      // a JSX-bearing caller is a one-line change.
      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node))
        return;
      if (
        (ts.isStringLiteral(node) ||
          ts.isNoSubstitutionTemplateLiteral(node) ||
          ts.isTemplateHead(node) ||
          ts.isTemplateMiddle(node) ||
          ts.isTemplateTail(node)) &&
        !insideTranslator(node)
      ) {
        // A comparison operand or an index key is never rendered. The parser
        // says which, where the old scanner guessed from the preceding char.
        const parent = node.parent;
        const isOperand =
          (ts.isBinaryExpression(parent) &&
            [
              ts.SyntaxKind.EqualsEqualsEqualsToken,
              ts.SyntaxKind.ExclamationEqualsEqualsToken,
              ts.SyntaxKind.EqualsEqualsToken,
              ts.SyntaxKind.ExclamationEqualsToken,
            ].includes(parent.operatorToken.kind)) ||
          ts.isElementAccessExpression(parent);
        if (!isOperand) out.push(node.text);
      }
      node.forEachChild((child) => literalsIn(child, out));
    };

    /**
     * Literals a child expression can actually RENDER.
     *
     * Narrower than `literalsIn` on purpose. An attribute value is judged by
     * walking everything inside it, but a child expression holds arbitrary
     * code — `.map()` callbacks, CSS template literals, option objects — and
     * walking all of it reported `translateX(var(` as visible text. Only
     * positions whose value becomes the child are followed.
     */
    const renderedLiterals = (node: ts.Node, out: string[]) => {
      if (ts.isParenthesizedExpression(node)) return renderedLiterals(node.expression, out);
      if (ts.isConditionalExpression(node)) {
        renderedLiterals(node.whenTrue, out);
        renderedLiterals(node.whenFalse, out);
        return;
      }
      if (
        ts.isBinaryExpression(node) &&
        [
          ts.SyntaxKind.AmpersandAmpersandToken,
          ts.SyntaxKind.BarBarToken,
          ts.SyntaxKind.QuestionQuestionToken,
        ].includes(node.operatorToken.kind)
      ) {
        renderedLiterals(node.left, out);
        renderedLiterals(node.right, out);
        return;
      }
      if (ts.isTemplateExpression(node)) {
        out.push(node.head.text, ...node.templateSpans.map((span) => span.literal.text));
        return;
      }
      if (
        (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
        !insideTranslator(node)
      ) {
        out.push(node.text);
      }
    };

    const visit = (node: ts.Node) => {
      if (ts.isJsxAttribute(node) && ts.isIdentifier(node.name)) {
        const attr = node.name.text;
        // Every `aria-*` is textual unless enumerated below, so a new textual
        // ARIA attribute is caught by default rather than needing to be
        // remembered. `data-*` never matches: it is not a JsxAttribute name we
        // watch, which the old regex could only approximate with a lookbehind.
        const watched =
          (attr.startsWith('aria-') && !NON_TEXTUAL.has(attr)) ||
          attr === 'placeholder' ||
          attr === 'title' ||
          attr === 'alt';
        if (watched && node.initializer) {
          const found: string[] = [];
          literalsIn(node.initializer, found);
          const candidates = found.filter((lit) => !isKey(lit));
          // Judged as a SET: reporting per-literal named only the halves that
          // individually cleared the floor, so `cond ? 'Yes' : 'No'` listed
          // 'Yes' and stayed silent about 'No'.
          if (candidates.some(isEnglish))
            for (const lit of candidates.filter((c) => /[A-Za-z]/.test(c)))
              offenders.push(`${attr}: "${lit}"`);
        }
      }
      // CHILDREN, in BOTH syntactic positions. Reading only `ts.isJsxText`
      // read the one position this library never uses: all 24 visible-text
      // sites render through an expression container, so the branch caught the
      // shape the codebase had already eliminated and missed the one it
      // universally writes — `<Button>{busy ? 'Saving…' : 'Save'}</Button>` is
      // the most idiomatic way to inline English and it was green.
      if (ts.isJsxText(node)) {
        // `node.text` is UNDECODED source, so `&nbsp;` reads as "nbsp" and
        // `&quot;` as "quot", both clearing the two-letter floor. Not
        // hypothetical: Select's create row carried `&quot;` until earlier in
        // this PR, and an entity-only variant has no `t()` to route through,
        // so the reported fix would have been impossible.
        const text = node.text
          .replace(/&[a-z]+;|&#\d+;/gi, ' ')
          .replace(/\{[^}]*\}/g, ' ')
          .trim();
        if (isEnglish(text)) offenders.push(`text: "${text}"`);
      }
      if (
        ts.isJsxExpression(node) &&
        node.expression &&
        node.parent &&
        (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))
      ) {
        const found: string[] = [];
        renderedLiterals(node.expression, found);
        const candidates = found.filter((lit) => !isKey(lit));
        if (candidates.some(isEnglish))
          for (const lit of candidates.filter((c) => /[A-Za-z]/.test(c)))
            offenders.push(`text: "${lit}"`);
      }
      node.forEachChild(visit);
    };
    visit(sourceFile);

    expect(
      offenders,
      'inline English on a user-facing surface — route it through useTranslation()',
    ).toEqual([]);
  });
});

/**
 * A contrast ratio written in a comment is a claim, and nothing checked it.
 *
 * #484 corrected the same class of stale figure FOUR times across thirteen
 * review rounds, every one found by a person reading rather than by a test. A
 * retune moves a primitive and every number describing it silently rots.
 *
 * Numbers opt in by carrying an annotation the gate can resolve:
 *
 *   // @contrast --color-warning on --color-bg = 2.14:1 light
 *
 * Both sides resolve through the generated tokens for the named theme and the
 * ratio is recomputed, against an ABSOLUTE bound — `toBeCloseTo(x, 1)` accepts
 * a delta under 0.05, which is larger than the defects #484 actually had.
 *
 * Every `N.NN:1` in a `.tokens.scss` or `.module.scss` must then BIND to a
 * value some annotation in that file computes. Counting annotations instead
 * left every file slack equal to its surplus; requiring a decimal point let
 * integer claims rot; per-line matching made the two halves disagree about
 * what an annotation is. Ranges bind neither endpoint and are exempt, as are
 * WCAG's own thresholds — see the note at WCAG_THRESHOLDS for why that is a
 * trade rather than a fix.
 *
 * Scope: `.tokens.scss` and `.module.scss`. Ratios in `.ts`/`.tsx` prose are
 * not forced — binding a number to its pair needs the author's help, and a
 * gate demanding annotation of arbitrary sentences is gamed by rewording.
 */
describe('stated contrast ratios still hold', () => {
  function literal(name: string, dark: boolean, seen: string[] = []): string | undefined {
    if (seen.includes(name)) return undefined;
    for (const src of dark ? [DARK_SCSS, TOKENS_SCSS] : [TOKENS_SCSS]) {
      const m = new RegExp(`(?:^|[^-a-z0-9])${name}:\\s*([^;\\n]+);`, 'm').exec(src);
      if (!m) continue;
      const raw = m[1]!.trim();
      if (raw.startsWith('var('))
        return literal(raw.slice(4, -1).split(',')[0]!.trim(), dark, [...seen, name]);
      return /^#[0-9a-f]{6}$/i.test(raw) ? raw : undefined;
    }
    return undefined;
  }
  function ratio(a: string, b: string): number {
    const lum = (hex: string) => {
      const c = [0, 2, 4].map((i) => parseInt(hex.slice(1 + i, 3 + i), 16) / 255);
      const [r, g, bl] = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
    };
    const [x, y] = [lum(a), lum(b)].sort((p, q) => p - q);
    return (y! + 0.05) / (x! + 0.05);
  }

  const files = components.flatMap((name) => {
    const dir = join(componentsDir, name);
    return readdirSync(dir)
      .filter((f) => f.endsWith('.scss') || (f.endsWith('.ts') && !f.includes('.test.')))
      .map((f) => ({ label: `${name}/${f}`, code: readFileSync(join(dir, f), 'utf-8') }));
  });

  const annotations = files.flatMap(({ label, code }) =>
    [
      ...code.matchAll(
        /@contrast\s+(--[a-z0-9-]+)\s+on\s+(--[a-z0-9-]+)\s*=\s*([\d.]+):1\s*(light|dark)/g,
      ),
    ].map((m) => ({ label, fg: m[1]!, bg: m[2]!, stated: Number(m[3]), theme: m[4]! })),
  );

  it('found annotations to check', () => {
    expect(annotations.length).toBeGreaterThan(10);
  });

  it.each(annotations.map((a) => [`${a.label}: ${a.fg} on ${a.bg} (${a.theme})`, a]))(
    '%s',
    (_label, a) => {
      const dark = a.theme === 'dark';
      const [fg, bg] = [literal(a.fg, dark), literal(a.bg, dark)];
      expect(fg, `${a.fg} resolves`).toBeDefined();
      expect(bg, `${a.bg} resolves`).toBeDefined();
      // An ABSOLUTE bound, not `toBeCloseTo(stated, 1)`, which accepts a delta
      // under 0.05 — ten times the slack an honestly-rounded 2dp figure needs
      // (the worst of the live annotations is off by 0.0049) and enough to
      // hide a wrong second decimal, which is the only error class this gate
      // exists for. #484's real defects — Calendar's 4.55, the Progress
      // family's 4.17 — were exactly this magnitude, so the gate written to
      // catch them could not have.
      expect(Math.abs(ratio(fg!, bg!) - a.stated)).toBeLessThan(0.006);
    },
  );

  it.each(
    files
      // `.module.scss` too, not just `.tokens.scss`. The docblock justified the
      // narrower scope as "that is where token-pair ratios live" — and Dot's
      // 2.14:1 sat in a `.module.scss`, read for annotations but exempt from
      // the binding, falsifying the stated rationale. `.ts` prose stays exempt
      // as documented: binding a number in a sentence needs the author's help.
      .filter(({ label }) => label.endsWith('.tokens.scss') || label.endsWith('.module.scss'))
      .map(({ label, code }) => [label, code]),
  )('%s annotates every ratio it states', (_label, code) => {
    // COUNTED, not "does this file mention @contrast anywhere". The first
    // version fell back to a file-scoped `hasBlockAnnotation`, so any file
    // containing one annotation satisfied the check no matter how many
    // unannotated ratios sat beside it — four were live behind that escape.
    // A gate that cannot fail on its own stated input is the exact thing this
    // suite keeps being written to stop.
    //
    // Counting was still not a BINDING. `annotations.length >= stated.length`
    // leaves every file slack equal to its surplus — thirteen files carried
    // one to three — so the first unannotated ratio added to any of them
    // passed. Verified: appending a bare `9.99:1` claim to Text.tokens.scss
    // left the suite green.
    //
    // So match on the VALUE. Every ratio stated in prose must equal one an
    // annotation in the same file actually computes; a number no annotation
    // produces is a claim nothing checks, which is the whole point. Surplus
    // annotations and duplicates now buy nothing.
    // Per MATCH, not per line. Filtering whole lines gave three escapes: a
    // prose ratio sharing a line with an annotation was skipped entirely, one
    // range anywhere on a line exempted every other ratio on it, and `/* */`
    // comments — legal in SCSS — were never read at all.
    // The COMMENT PORTION of every line, tracking BLOCK STATE across lines.
    //
    // Two escapes preceded this. Requiring a line to START with a marker let
    // `.x { color: red; } // contrast is 9.99:1` through entirely. Slicing per
    // line then found only a block's OPENING line: continuations were rescued
    // solely by a `/^\s*\*/` fallback, so a block whose continuation lines do
    // not begin with `*` was invisible — and MonthView.module.scss already
    // writes five such lines. SCSS is not TSX, so the parser-based
    // `stripComments` above does not apply; this tracks the state itself.
    // Each line scanned to its END, resuming after a closed block. Taking one
    // slice and moving on left a third variant of the same escape alive:
    // `/* ok */ .x { } // contrast is 9.99:1` passed, because the first closed
    // block consumed the line and the `//` after it was never seen.
    const lines: string[] = [];
    let inBlock = false;
    for (const raw of code.split('\n')) {
      let rest = raw;
      while (rest.length > 0) {
        if (inBlock) {
          const close = rest.indexOf('*/');
          lines.push(close >= 0 ? rest.slice(0, close) : rest);
          if (close < 0) break;
          inBlock = false;
          rest = rest.slice(close + 2);
          continue;
        }
        // A `//` inside a quoted value or a url() is content, not a comment:
        // `content: '//x'` and `url(https://…)` both false-alarmed. SCSS has no
        // parser here the way TSX does, so this is a targeted skip rather than
        // a general fix, and it is stated as such.
        const at = rest.search(/\/\/|\/\*/);
        if (at < 0) break;
        const before = rest.slice(0, at);
        const quoted =
          (before.match(/'/g)?.length ?? 0) % 2 === 1 ||
          (before.match(/"/g)?.length ?? 0) % 2 === 1;
        if (quoted || /url\([^)]*$/.test(before)) {
          rest = rest.slice(at + 2);
          continue;
        }
        if (rest.slice(at, at + 2) === '//') {
          lines.push(rest.slice(at));
          break;
        }
        const close = rest.indexOf('*/', at + 2);
        if (close < 0) {
          lines.push(rest.slice(at));
          inBlock = true;
          break;
        }
        lines.push(rest.slice(at + 2, close));
        rest = rest.slice(close + 2);
      }
    }
    // Integers included — `// white on black is 21:1` and `// this pair is 7:1`
    // were exempt from binding entirely and rotted freely, because the pattern
    // demanded a decimal point.
    //
    // WCAG's own thresholds are then exempt BY VALUE. They are normative
    // constants, not measurements of a pair, so nobody can annotate them —
    // and `// must clear the 4.5:1 minimum` is the commonest contrast
    // sentence in CSS prose. Failing on it is the false alarm this file's own
    // reasoning says gets a gate deleted.
    // Exempt BY VALUE, and this is a trade rather than a fix. Every integer
    // ratio written in this repo today is one of these: `3:1` cited as the
    // 1.4.11 requirement (six files) and `1:1` meaning one-to-one alignment
    // (two files). None is a measurement. So a claim of `7:1` or `21:1` stays
    // unbindable — the cost of admitting integers at all, accepted because a
    // real measured pair essentially never lands on a whole number, while
    // `// must clear the 4.5:1 minimum` is the commonest contrast sentence in
    // CSS prose and failing on it is the false alarm that gets a gate deleted.
    const WCAG_THRESHOLDS = new Set(['1', '3', '4.5', '7', '21']);
    const ratios = (l: string) =>
      [...l.matchAll(/(\d+(?:\.\d+)?):1/g)]
        .map((m) => m[1]!)
        .filter((r) => !WCAG_THRESHOLDS.has(r));
    // Built from the ANNOTATION PATTERN, not from whole annotation lines — a
    // bogus figure written after a real annotation on the same line otherwise
    // landed in this set and exempted itself.
    const ANNOTATION =
      /@contrast\s+--[a-z0-9-]+\s+on\s+--[a-z0-9-]+\s*=\s*([\d.]+):1\s*(?:light|dark)/g;
    // Matched against the JOINED comment text, with the same newline-tolerant
    // `\s+` the value test above uses. Per-line matching made the two halves of
    // one gate disagree about what an annotation IS: an annotation wrapped
    // across two lines was still resolved and still recomputed correctly by
    // the value test, while the binding half rejected the file — a verified
    // pair failing purely on where the line broke.
    const joined = lines.join('\n');
    const annotated = new Set([...joined.matchAll(ANNOTATION)].map((m) => m[1]!));
    // Strip what is exempt BY CONSTRUCTION rather than skipping the line it
    // sits on: an annotation's own figure, and a range, which states two
    // endpoints and binds neither.
    // Per line, so the message still says WHERE. The joined-text refactor
    // reported a bare "9.99:1" with no location, which in a file with five
    // block-comment lines is a number and nowhere to look.
    const stripped = joined.replace(ANNOTATION, ' ').replace(/\d+\.\d+\s*[-–]\s*\d+\.\d+:1/g, ' ');
    const unbound = stripped
      .split('\n')
      .flatMap((line) => ratios(line).map((r) => ({ r, line })))
      .filter(({ r }) => !annotated.has(r));
    expect(
      unbound.map(({ r, line }) => `${r}:1 in "${line.trim()}"`),
      'states a ratio no @contrast annotation in this file computes — annotate the pair so it can be recomputed, or drop the number',
    ).toEqual([]);
  });
});
