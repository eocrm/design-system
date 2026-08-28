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

const components = readdirSync(componentsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  // Underscore-prefixed directories (e.g. `_internal`) are private helpers
  // shared between components, not components themselves. They have no
  // public export and aren't subject to the four-file rule.
  .filter((name) => !name.startsWith('_'));

const indexContent = readFileSync(indexPath, 'utf-8');

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
    // Match `<Name>` followed by a word boundary OR an uppercase letter.
    // The word-boundary branch catches the exact name (e.g. `Toast` as a
    // standalone export). The uppercase branch allows compound exports whose
    // name starts with `<Name>` (e.g. `ToastViewport` satisfies `Toast`).
    // Crucially, a purely lowercase continuation is NOT matched, so `Button`
    // does NOT accidentally satisfy itself via a hypothetical `Buttons` export,
    // and `Toast` does NOT satisfy `Toasty`. This tightens the earlier
    // `\b${name}[^}]*` form which was over-permissive.
    const namedRe = new RegExp(`export\\s*\\{[^}]*\\b${name}(\\b|[A-Z])[^}]*\\}`);
    const starRe = new RegExp(`export\\s+\\*\\s+from\\s+['"][^'"]*${name}[^'"]*['"]`);
    expect(namedRe.test(indexContent) || starRe.test(indexContent)).toBe(true);
  });
});

/**
 * Strip comments using the TypeScript PARSER.
 *
 * Five hand-rolled versions preceded this and every one had a defect, none
 * found by the gate itself:
 *
 *   1. A file-wide `/\*[\s\S]*?\*\/` sweep. `FileUpload.tsx:162` is
 *      `} else if (token.endsWith('/*'))`, so a `/*` in a STRING opened a
 *      comment closed 116 lines later — both gates read that file with a hole
 *      in it. BLINDNESS.
 *   2. A line-oriented pass. Fixed that, broke three: a trailing `//` strip
 *      truncated lines at the `//` of a URL, a block comment closing mid-line
 *      dropped the rest of that line, one opening mid-line leaked its body in.
 *   3. A character scanner tracking quote state. An apostrophe in JSX text
 *      (`<p>don't</p>`) opened a phantom string that swallowed the next
 *      comment. FALSE ALARM.
 *   4. The same plus "a newline ends a `'` or `\"` string". Fixed the
 *      apostrophe; still could not see JSX TEXT, so `<p>https://x.com</p>`
 *      had a `//` outside any string and the rest of that line was deleted.
 *      BLINDNESS again, the same class as (1) by a different route.
 *   5. `ts.createScanner`. Exact for strings and regexes, but a raw token
 *      scanner has no JSX context — the parser drives that — so it read the
 *      same JSX text as a comment.
 *
 * The common thread: knowing where a comment starts requires the grammar, and
 * each version approximated it slightly better while still guessing. The
 * compiler is already a devDependency, so this stops guessing. The parser
 * yields the exact spans of string literals, template parts, regex literals
 * and JSX text; a `/` outside all of them genuinely starts a comment.
 *
 * Comments are blanked, not removed, so every other character keeps its offset
 * and line numbers in failure messages still point where they should.
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

describe('transient state does not rely on aria-busy alone', () => {
  const sources = components.flatMap((name) => {
    const dir = join(componentsDir, name);
    return readdirSync(dir)
      .filter((f) => f.endsWith('.tsx') && !f.includes('.test.'))
      .map((f) => ({
        label: `${name}/${f}`,
        code: stripComments(readFileSync(join(dir, f), 'utf-8')),
      }));
  });

  const withAriaBusy = sources.filter(({ code }) => /aria-busy=/.test(code));

  it('found files to check', () => {
    // Guards the guard: a rename of the attribute or a restructure of the tree
    // would otherwise make every assertion below vacuously pass.
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
    for (const m of code.matchAll(/^\s*(--[a-z0-9-]+):\s*(#[0-9a-f]{6});/gim)) {
      const [, name, value] = m;
      const owners = (semanticByValue.get(value!.toLowerCase()) ?? []).filter(
        (owner) => !INDEPENDENT.test(owner),
      );
      if (owners.length > 0) shadowed.push(`${name} (${value}) === ${owners.join(' / ')}`);
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
 * Keyed off the RULE, not off a list of attributes — that enumeration is what
 * made #492's count wrong four times running. Each fix widened one dimension
 * and left another: excluding braces hid values starting with `${…}`; listing
 * `aria-label|placeholder|title` hid `aria-valuetext`; being attribute-keyed at
 * all hid JSX text nodes, which were half the real violations.
 *
 * So the attribute set is derived by EXCLUSION: every `aria-*` is textual
 * unless it is one of the enumerated/ID-valued ones below. A new textual ARIA
 * attribute is caught by default rather than needing to be remembered.
 *
 * The value is SCANNED rather than matched by one regex, because every regex
 * shape lost a case: anchoring on a quote after `={` missed `cond ? 'A' : 'B'`
 * and `x ?? 'A'`; a `\{([^}]*)\}` capture fixed those but truncated a template
 * literal at the `}` of its first `${…}` and stopped catching the plainest
 * shape of all, `aria-label="Close dialog"`. Each of those was a version that
 * could not fail on its own stated input. Two live violations surfaced when the
 * scan replaced them: Sortable's `ariaLabel ?? 'Reorder item'`, which sat in
 * #492's own table the whole time the gate reported the file clean, and a
 * template-literal label.
 *
 * Known limits, stated rather than discovered later: it does not read JSX text
 * nodes (a separate parse, and the naive regex over-matches TypeScript
 * generics badly) — including inside a braced value, so `title={<b>Delete
 * row</b>}` is silent, which the "attributes are covered" reading of this
 * block would not predict. A template literal WRAPPING a ternary,
 * `` aria-label={`${n === 1 ? 'item' : 'items'}`} ``, is one literal whose
 * `${…}` is stripped before judging, so both branches are silent too. It
 * cannot see a string assembled in a variable.
 *
 * The failure direction of a trailing `//` comment is worth stating precisely,
 * because it inverted: such a comment IS stripped (`stripComments` removes
 * `//` to end of line after handling blocks), but an apostrophe in one that
 * sits inside a braced value used to unbalance the walk. Since an unbalanced
 * value became an offender rather than a skip, that now REPORTS rather than
 * silences — noisy in the right direction. Inside a
 * braced value, literals preceded by `=` or `[` are skipped as comparison
 * operands and index keys (`typeof x === 'string'`, `props['aria-label']`), so
 * a rendered literal in that position would be missed — the trade is against
 * five false alarms, and a false alarm is what gets a gate deleted.
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

  const sources = components.flatMap((name) => {
    const dir = join(componentsDir, name);
    return readdirSync(dir)
      .filter((f) => f.endsWith('.tsx') && !f.includes('.test.'))
      .map((f) => ({ label: `${name}/${f}`, code: readFileSync(join(dir, f), 'utf-8') }));
  });

  it('found sources to check', () => {
    expect(sources.length).toBeGreaterThan(50);
  });

  it.each(sources.map(({ label, code }) => [label, code]))('%s', (_label, code) => {
    const offenders: string[] = [];
    // Comment lines are stripped WHOLESALE and the rest scanned as one string,
    // so a value prettier wrapped across lines is still seen. Scanning
    // line-by-line missed those.
    // Shared with the aria-busy gate above. A file-wide block-comment sweep
    // deleted real code whenever a string contained the characters `/*`.
    const body = stripComments(code);
    {
      // Scanned, not matched in one regex. The one-regex version had to pick a
      // shape for the value, and every choice lost a case: anchoring on a quote
      // after `={` missed `cond ? 'A' : 'B'` and `x ?? 'A'`; switching to a
      // `\{([^}]*)\}` capture fixed those, truncated a template literal at the
      // `}` of its first `${…}`, and — because the quoted branch then yielded
      // string CONTENT with no quotes left inside it to find — stopped catching
      // the plainest shape of all, `aria-label="Close dialog"`. Fifth gate in
      // this PR that could not fail on its own stated input.
      //
      // `(?<![-\w])` so `data-title=` / `data-alt=` do not match: `-` is a word
      // boundary, so `\b` alone flagged them and reported a false violation.
      const isKey = (lit: string) => /^[a-z][a-zA-Z]*\.[a-zA-Z.]+$/.test(lit);
      const isEnglish = (lit: string) => {
        // Interpolations are permitted — the rule allows mixing translated text
        // with data. A fixed English phrase around them is not.
        const bare = lit
          .replace(/\$\{[^}]*\}/g, ' ')
          // CSS units are not prose. `aria-valuetext={`${width}px`}` is the
          // only thing standing between a two-letter floor and a clean run,
          // and the floor has to be two: at three, `aria-label="OK"`,
          // `alt="Up"` and `placeholder="ID"` were all silent.
          .replace(/\b(px|em|rem|vh|vw|ms|fr|ch|pt|deg)\b/g, ' ')
          .trim();
        // A URL is not prose, but only the URL is exempt. Returning false for
        // the whole literal silenced `"Open the docs at https://x.io"` — a
        // sentence with a link in it, which is exactly a translatable string.
        // Strip the URL, then judge what is left.
        return /[A-Za-z]{2}/.test(bare.replace(/[a-z][a-z0-9+.-]*:\/\/\S*/g, ' ').trim());
      };
      // Measured against the real distribution: see the note on the walk below.
      const SCAN_BOUND = 2000;
      const flag = (attr: string, lit: string) => {
        if (!isKey(lit) && isEnglish(lit)) offenders.push(`${attr}: "${lit}"`);
      };

      // `.` in the lookbehind alongside `-`: `document.title=` and
      // `props.alt=` are property assignments, not attributes, and matched.
      for (const m of body.matchAll(/(?<![-.\w])(aria-[a-z]+|placeholder|title|alt)=/g)) {
        const attr = m[1]!;
        if (NON_TEXTUAL.has(attr)) continue;
        const i = m.index + m[0].length;
        const ch = body[i];

        if (ch === '"' || ch === "'" || ch === '`') {
          const close = body.indexOf(ch, i + 1);
          if (close !== -1) flag(attr, body.slice(i + 1, close));
          continue;
        }
        if (ch !== '{') continue;

        // Balanced scan, so a template literal's `${…}` does not end the value
        // at its first `}`. String-aware, because a brace inside a string is
        // not structure: `aria-label={x.replace('{', '')}` would otherwise
        // leave depth permanently above zero and run the value to the end of
        // the file, scanning every literal after it as if it were this
        // attribute's.
        let depth = 0;
        let quote = '';
        let j = i;
        // BOUNDED, and REPORTED rather than skipped when it does not balance.
        // Chasing the lexical constructs that desync a hand-rolled scanner is
        // a losing game — a regex literal containing a quote,
        // `x.replace(/'/g, '')`, still defeats the quote tracking below — so
        // the walk is capped and a value that does not close is surfaced
        // instead of swallowing the rest of the file.
        //
        // The bound is MEASURED, not guessed. "No real value approaches 400"
        // was false when first written — DateRangePicker's `placeholder` was
        // already at 346 — and blanking comments rather than deleting them
        // (which keeps offsets, so failure line numbers stay correct) inflates
        // every value that contains one: Slider's `aria-label` carries three
        // comment lines and measures 472. The longest today is that 472, so
        // 2000 leaves room without being unbounded. A bound whose overflow is
        // silent is the same defect as a gate that cannot fail, so overflow is
        // reported.
        for (; j < body.length && j - i < SCAN_BOUND; j++) {
          const c = body[j]!;
          if (quote) {
            if (c === '\\') j++;
            else if (c === quote) quote = '';
            continue;
          }
          if (c === '"' || c === "'" || c === '`') quote = c;
          else if (c === '{') depth++;
          else if (c === '}' && --depth === 0) break;
        }
        if (depth !== 0) {
          offenders.push(`${attr}: <value did not close within the ${SCAN_BOUND}-char scan bound>`);
          continue;
        }
        const value = body.slice(i + 1, j);

        // Only the string literals inside the expression are judged, and not
        // all of them: one preceded by `=` or `[` is a comparison operand or an
        // index key (`typeof x === 'string'`, `props['aria-label']`,
        // `state === 'error'`), never rendered. Without this the scan reports
        // five, and a false alarm is what gets a gate deleted.
        // Judged as a SET, then reported as a set. A per-literal report listed
        // only the halves that individually cleared the English floor, so
        // `cond ? 'Yes' : 'No'` named 'Yes' and stayed silent about 'No' —
        // someone fixes what the failure names, re-runs, gets green, and ships
        // the other half. A partial report certifies the remainder. So if ANY
        // literal in one value is English, every candidate in that value is
        // reported.
        //
        // The floor itself is TWO letters (see `isEnglish`), which is a
        // deliberate false-alarm trade rather than a free win: `'en-US'` and
        // `'MMM d'` both read as English at two, and neither appears in a
        // watched attribute today. If one ever does, extend the unit-strip
        // list — raising the floor back to three re-silences `"OK"`, `"Up"`
        // and `"ID"`, which is the worse direction.
        const candidates: string[] = [];
        for (const lm of value.matchAll(/(["'`])((?:\\.|(?!\1).)*)\1/gs)) {
          const before = value.slice(0, lm.index);
          if (/[=[]\s*$/.test(before)) continue;
          // Anything sitting directly inside `t(` is routed through the
          // translator by definition, whatever it looks like. The dotted-key
          // heuristic alone rejected a DYNAMIC key —
          // t(`richTextEditor.${key}`) — because stripping the interpolation
          // leaves a trailing dot that the pattern will not match.
          if (/\bt\(\s*$/.test(before)) continue;
          if (!isKey(lm[2]!)) candidates.push(lm[2]!);
        }
        // Report every candidate that carries letters at all, not literally
        // every candidate — an empty string or a bare `%s` alongside the real
        // offender is noise in the failure message.
        if (candidates.some(isEnglish))
          for (const lit of candidates.filter((c) => /[A-Za-z]/.test(c)))
            offenders.push(`${attr}: "${lit}"`);
      }
    }
    expect(
      offenders,
      'inline English on a user-facing attribute — route it through useTranslation()',
    ).toEqual([]);
  });
});

/**
 * A contrast ratio written in a comment is a claim, and nothing checked it.
 *
 * #484 corrected the same class of stale figure FOUR times across thirteen
 * review rounds — Calendar's `4.55`, the Progress family's `4.17`, and two
 * theme-scoping misses — every one found by a person reading, never by a test.
 * A retune moves a primitive and every number describing it silently rots.
 *
 * Numbers opt in by carrying an annotation the gate can resolve:
 *
 *   // @contrast --color-warning on --color-bg = 2.14:1 light
 *
 * Both sides are resolved through the generated tokens for the named theme and
 * the ratio recomputed. A stale number fails with both figures.
 *
 * Scope, stated rather than implied: every `N.NN:1` in a `.tokens.scss` or a
 * `.module.scss` must be bound, because that is where token-pair ratios live
 * and where the rot happened. The scope said `.tokens.scss` only while Dot's
 * `2.14:1` sat in a `.module.scss` — read for annotations, exempt from the
 * binding — so the sentence justifying the narrower scope was falsified by a
 * file the gate was already reading. Ratios in prose elsewhere (`.ts`/`.tsx`)
 * are not forced: binding a number to its pair needs the author's help, and a
 * gate that demands annotation of arbitrary sentences would be gamed by
 * rewording. Ranges (`5.11-6.82:1`) are exempt for the same reason; annotate
 * the endpoints individually if they matter.
 *
 * `:1` is the opt-in marker, which makes dropping it a bypass — so a live
 * figure must carry it. A HISTORICAL figure ("both read 4.17 until #484 raised
 * them") is written without `:1` on purpose: no current pair computes it, so
 * no annotation can bind it, and the omission is spelled out where it occurs
 * rather than left to look like an oversight.
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
      expect(ratio(fg!, bg!)).toBeCloseTo(a.stated, 1);
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
    const lines: string[] = [];
    let inBlock = false;
    for (const raw of code.split('\n')) {
      if (inBlock) {
        const close = raw.indexOf('*/');
        lines.push(close >= 0 ? raw.slice(0, close) : raw);
        inBlock = close < 0;
        continue;
      }
      const at = raw.search(/\/\/|\/\*/);
      if (at < 0) continue;
      if (raw.slice(at, at + 2) === '/*') {
        const close = raw.indexOf('*/', at + 2);
        lines.push(close >= 0 ? raw.slice(at, close) : raw.slice(at));
        inBlock = close < 0;
      } else {
        lines.push(raw.slice(at));
      }
    }
    const ratios = (l: string) => [...l.matchAll(/(\d+\.\d+):1/g)].map((m) => m[1]!);
    // Built from the ANNOTATION PATTERN, not from whole annotation lines — a
    // bogus figure written after a real annotation on the same line otherwise
    // landed in this set and exempted itself.
    const ANNOTATION =
      /@contrast\s+--[a-z0-9-]+\s+on\s+--[a-z0-9-]+\s*=\s*([\d.]+):1\s*(?:light|dark)/g;
    const annotated = new Set(lines.flatMap((l) => [...l.matchAll(ANNOTATION)].map((m) => m[1]!)));
    const unbound = lines
      .flatMap((l) => {
        // Strip the parts that are exempt BY CONSTRUCTION rather than skipping
        // the line they sit on: the annotation's own figure, and a range,
        // which states two endpoints and binds neither.
        const rest = l
          .replace(
            /@contrast\s+--[a-z0-9-]+\s+on\s+--[a-z0-9-]+\s*=\s*[\d.]+:1\s*(light|dark)/g,
            '',
          )
          .replace(/\d+\.\d+\s*[-–]\s*\d+\.\d+:1/g, '');
        return ratios(rest).map((r) => ({ r, l }));
      })
      .filter(({ r }) => !annotated.has(r));
    expect(
      unbound.map(({ r, l }) => `${r}:1 in "${l.trim()}"`),
      'states a ratio no @contrast annotation in this file computes — annotate the pair so it can be recomputed, or drop the number',
    ).toEqual([]);
  });
});
