# CodeBlock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `CodeBlock` in `@eocrm/design-system`. It's a read-only, syntax-highlighted, multi-line code display with a header (label or language tabs, wrap toggle, copy), `maxHeight`, highlighted lines and opt-in `syncKey` sample sync. Then refactor the `/mockups/docs` mockup onto it.

**Architecture:** A pure tokenizer module wraps `prism-react-renderer`'s bundled `Prism` and adds a bash grammar. It returns token lines with semantic colour keys, and is Node-testable. A tiny module-level store (`useSyncExternalStore`, server snapshot `undefined`) backs `syncKey`. The component renders our own markup. The header reuses `<Tabs>` for multiple samples, the body `<pre>` is the tabpanel, and copy feedback goes through `<LiveRegion>`. Colours are component tokens aliasing existing primitives, the same way `LiquidEditor` colours its syntax, and are pinned by `contrast.test.ts`.

**Tech Stack:** React 19, TypeScript, SCSS modules + CSS custom properties, `prism-react-renderer@2.4.1`, Vitest (`unit` = Node `*.test.ts`, `dom` = jsdom `*.test.tsx`).

**Spec:** `docs/superpowers/specs/2026-10-26-codeblock-design.md`

## Global Constraints

- Dependency: `prism-react-renderer` pinned to latest (`2.4.1`), in `packages/design-system` `dependencies`. Used as a tokenizer only; never import its `themes`. Do not add `prismjs` to the library.
- Languages: `json`, `bash`, `javascript`, `typescript`, `python`. Anything else, or none, renders as plain text with no throw.
- The surface follows the page theme (light/dark). No `tone`/dark variant.
- No line numbers, no editing, no language auto-detection.
- The library never touches `localStorage`. `window`/`navigator` are touched only inside event handlers or effects (SSR-safe; docs.eocrm.io is Next.js SSR).
- Copy writes the exact `code` string of the visible sample.
- Every syntax colour reaches **4.5:1** against both the block background and the highlighted-line tint, in light and dark, for every accent.
- Library hard rules: forwardRef + spread attrs, JSDoc on every exported member, i18n (en + ru) for every visible/ARIA string, tokens only, no layout props in `.module.scss`, Hard rule 10 (read `.claude/skills/transient-state-a11y/SKILL.md` before Task 4).
- Packages: run vitest from `packages/design-system` (cwd matters). Check `make test`'s exit code, not a grep of its output.
- Commits: plain messages, no `Co-Authored-By`, no session links.

## Review Focus

1. **Trailing newline** (`"a\nb\n"`, as most fetched snippets have): no empty trailing line is rendered, and copy still writes `"a\nb\n"` unchanged. Tested in Task 1 and Task 4.
2. **CRLF input** (`"a\r\nb"`, from Windows-authored payloads): two lines, no stray `\r` rendered, and copy is unchanged. Tested in Task 1.
3. **Clipboard unavailable or rejected** (http origin, sandboxed iframe): no throw, and "Copy failed" is announced. Tested in Task 4.
4. **Highlighted-line ranges out of bounds or reversed** (`[[7, 5], 99]` on a 6-line block): reversed ranges are normalised, out-of-range lines are ignored, and nothing crashes. Tested in Task 1.
5. **`syncKey` value missing from a block's samples** (one block has `curl`/`python`, another only `json`): that block keeps its own selection. Tested in Task 2 and Task 4.

---

### Task 1: Tokenizer engine + dependency + rule updates

**Files:**

- Modify: `packages/design-system/package.json` (add `"prism-react-renderer": "2.4.1"` to `dependencies`; run `npm install` from repo root)
- Create: `packages/design-system/src/components/CodeBlock/highlight.ts`
- Test: `packages/design-system/src/components/CodeBlock/highlight.test.ts`
- Modify: `packages/design-system/CLAUDE.md`: under "Dependency policy" add exception **(e)** `prism-react-renderer` (tokenizer only: returns token arrays; markup, colours, ARIA and copy are ours), and update the "four narrow exceptions" wording. Remove `prism-react-renderer` from "What does NOT belong here" (keep `prismjs`, `@types/prismjs` stays transitive).
- Modify: `packages/playground/CLAUDE.md` Hard rule 5: remove `prism-react-renderer` from the "MUST NOT appear in the library's dependencies" list. Note it is now a library dependency.

**Interfaces:**

- Produces:
  - `type CodeBlockLanguage = 'json' | 'bash' | 'javascript' | 'typescript' | 'python'`
  - `type SyntaxKey = 'keyword' | 'string' | 'number' | 'comment' | 'function' | 'property' | 'punctuation' | 'plain'`
  - `interface CodeToken { content: string; key: SyntaxKey }`
  - `tokenizeLines(code: string, language?: string): CodeToken[][]`: one array per rendered line
  - `highlightedLineSet(spec: readonly (number | readonly [number, number])[] | undefined, lineCount: number): ReadonlySet<number>`: 1-based
  - `LANGUAGE_LABELS: Record<CodeBlockLanguage, string>` = `{ json: 'JSON', bash: 'Bash', javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python' }` (proper nouns, not translated)

- [ ] **Step 1: Write failing tests in `highlight.test.ts`**

```ts
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
it('empty code → one empty line', () => expect(tokenizeLines('', 'json')).toHaveLength(1));
it('highlightedLineSet normalises reversed ranges and ignores out-of-range', () => {
  expect([...highlightedLineSet([[7, 5], 99, 0, 2], 6)].sort()).toEqual([2, 5, 6]);
  expect(highlightedLineSet(undefined, 6).size).toBe(0);
});
```

- [ ] **Step 2: Run, expect FAIL** (module missing)

Run: `cd packages/design-system && npx vitest run src/components/CodeBlock/highlight.test.ts`

- [ ] **Step 3: Implement `highlight.ts`**

Register `Prism.languages.bash` (imported from `prism-react-renderer`) once at module load, if absent. It's a small grammar: `comment` (`#…` not after `$`), `string` (double- and single-quoted, double allowing `$VAR` inside), `variable` (`$NAME`, `${…}`), `function` (first word of a command: `curl`, `npm`, … via `(^|[;|&]\s*)[\w.-]+`), `parameter` (`--?[\w-]+`), `operator` (`| && || ; > <`), `punctuation` (`\\` line continuation). Alias `shell`/`sh` → bash and `js` → javascript, `ts` → typescript, `py` → python.

Tokenize via `normalizeTokens(Prism.tokenize(normalizedCode, grammar))`. Normalise CRLF to LF and strip one trailing `\n` first. Map each token's `types` to a `SyntaxKey` using the first type that matches:

| SyntaxKey   | Prism types                                             |
| ----------- | ------------------------------------------------------- |
| keyword     | keyword, builtin, important, atrule, boolean            |
| string      | string, char, attr-value, url, regex, template-string   |
| number      | number, constant                                        |
| comment     | comment, prolog, doctype, cdata                         |
| function    | function, class-name                                    |
| property    | property, attr-name, tag, variable, parameter, selector |
| punctuation | punctuation, operator                                   |
| plain       | anything else (`plain`, `text`)                         |

Merge adjacent tokens with the same key. `highlightedLineSet` expands `[a, b]` as `min..max`, keeps `1..lineCount` only, and ignores non-integers.

- [ ] **Step 4: Run, expect PASS** (same command)

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/package.json package-lock.json packages/design-system/src/components/CodeBlock/highlight.* packages/design-system/CLAUDE.md packages/playground/CLAUDE.md
git commit -m "feat(code-block): prism tokenizer engine with bash grammar"
```

---

### Task 2: `syncKey` store

**Files:**

- Create: `packages/design-system/src/components/CodeBlock/sampleSync.ts`
- Test: `packages/design-system/src/components/CodeBlock/sampleSync.test.ts`

**Interfaces:**

- Produces:
  - `getSynced(key: string): string | undefined`
  - `setSynced(key: string, sampleId: string): void`: notifies only that key's subscribers
  - `subscribeSynced(key: string, onChange: () => void): () => void`
  - `useSyncedSample(key: string | undefined): string | undefined`: `useSyncExternalStore(subscribe, () => getSynced(key), () => undefined)`; returns `undefined` when `key` is undefined
  - `resolveActiveSample(ids: readonly string[], opts: { controlled?: string; synced?: string; own?: string; fallback?: string }): string`: precedence **controlled → synced (only if in `ids`) → own (last local pick, if in `ids`) → fallback/default (if in `ids`) → `ids[0]`**

- [ ] **Step 1: Failing tests**: `setSynced('k','py')` notifies a `'k'` subscriber and not a `'j'` subscriber; unsubscribe stops notifications. For `resolveActiveSample(['curl','py'], { synced: 'json', fallback: 'py' })` → `'py'` (synced id missing → ignored); `{ controlled: 'curl', synced: 'py' }` → `'curl'`; `{}` → `'curl'`.
- [ ] **Step 2: Run, expect FAIL**: `npx vitest run src/components/CodeBlock/sampleSync.test.ts`
- [ ] **Step 3: Implement**: module-level `Map<string, string>` + `Map<string, Set<() => void>>`. No storage, no `window`.
- [ ] **Step 4: Run, expect PASS**
- [ ] **Step 5: Commit**: `feat(code-block): in-memory syncKey store`

---

### Task 3: Component tokens + contrast gate

**Files:**

- Create: `packages/design-system/src/components/CodeBlock/CodeBlock.tokens.scss` (prefix `--code-block-*`; `--code-*` belongs to `Code`)
- Modify: `packages/design-system/src/styles/contrast.test.ts` (add pairs, and register the tokens file wherever that test enumerates component token files)

**Interfaces:**

- Produces these tokens, which Task 4's SCSS consumes. Initial aliases are below; retune within existing primitives (`--color-palette-<c>-fg`, `--color-fg-*`, semantic colours) until every pair passes. Add a new `tokens.json` primitive only if no existing one passes, then run `npm run tokens:generate && npm run tokens:check`.
  - Surface: `--code-block-bg: var(--color-bg-subtle)`, `--code-block-border-color: var(--color-border)`, `--code-block-radius: var(--radius-md)`, `--code-block-header-bg: var(--color-bg)`, `--code-block-fg: var(--color-fg)`, `--code-block-font-size: var(--font-size-code)`, `--code-block-line-height: var(--line-height-normal)`, `--code-block-padding-y: var(--space-3)`, `--code-block-padding-x: var(--space-4)`
  - Highlighted line: `--code-block-line-highlight-bg: var(--color-accent-bg-subtle)`, `--code-block-line-highlight-bar: var(--color-accent)`. Fall back to `--color-bg-hover` / `--color-border-strong` if any accent fails contrast.
  - Syntax: `--code-block-syntax-keyword: var(--color-palette-violet-fg)`, `-string: var(--color-palette-green-fg)`, `-number: var(--color-warning-strong)`, `-comment: var(--color-fg-muted)`, `-function: var(--color-palette-blue-fg)`, `-property: var(--color-palette-teal-fg)`, `-punctuation: var(--color-fg-muted)`, `-plain: var(--code-block-fg)`
  - Max height: none (Task 4 maps `maxHeight` straight to `var(--measure-<step>)`)

- [ ] **Step 1: Failing test**: in `contrast.test.ts`, assert each of the 8 `--code-block-syntax-*` tokens (resolved through aliases) is ≥ 4.5 against `--code-block-bg` **and** against `--code-block-line-highlight-bg`, for every theme × accent (use the existing `THEMED_ACCENTS` / alias-resolving helpers).
- [ ] **Step 2: Run, expect FAIL** (tokens file absent): `npx vitest run src/styles/contrast.test.ts`
- [ ] **Step 3: Create the tokens file** with the aliases above. Make sure it's loaded the same way `Code.tokens.scss` is.
- [ ] **Step 4: Run, expect PASS**; retune aliases if a pair fails, and note any retune in the commit message.
- [ ] **Step 5: Commit**: `feat(code-block): component tokens with contrast gate`

---

### Task 4: `CodeBlock` component

**Files:**

- Create: `packages/design-system/src/components/CodeBlock/CodeBlock.tsx`, `CodeBlock.module.scss`, `index.ts`
- Test: `packages/design-system/src/components/CodeBlock/CodeBlock.test.tsx`
- Modify: `packages/design-system/src/i18n/messages.ts`, `en.ts`, `ru.ts` (new `codeBlock` group)

**Interfaces:**

- Consumes: Task 1 (`tokenizeLines`, `highlightedLineSet`, `LANGUAGE_LABELS`, `CodeBlockLanguage`), Task 2 (`useSyncedSample`, `setSynced`, `resolveActiveSample`), Task 3 tokens, library `Tabs`, `LiveRegion`, `Button`, `Tooltip`.
- Produces (exported from `index.ts`):

```ts
export interface CodeBlockSample {
  id: string;
  label: string;
  code: string;
  language?: CodeBlockLanguage | (string & {});
}
export type CodeBlockHighlightLines = readonly (number | readonly [number, number])[];
export type CodeBlockMaxHeight = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export interface CodeBlockProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'onChange'> {
  code?: string; // single-sample mode
  language?: CodeBlockLanguage | (string & {});
  title?: string; // header label; default LANGUAGE_LABELS[language] ?? t('codeBlock.plainText')
  samples?: readonly CodeBlockSample[]; // multi-sample mode (wins over code/language)
  activeSampleId?: string; // controlled
  defaultSampleId?: string;
  onSampleChange?: (id: string) => void; // fires only on the block the user clicked
  syncKey?: string;
  highlightLines?: CodeBlockHighlightLines;
  maxHeight?: CodeBlockMaxHeight; // body max-height = var(--measure-<step>)
  defaultWrap?: boolean; // initial wrap state; default false
}
export const CodeBlock: ForwardRefExoticComponent<CodeBlockProps & RefAttributes<HTMLDivElement>>;
```

- i18n keys (`codeBlock.*`), with en / ru values:
  - `copy`: 'Copy code' / 'Скопировать код'
  - `copied`: 'Copied' / 'Скопировано'
  - `copyFailed`: 'Couldn't copy' / 'Не удалось скопировать'
  - `wrap`: 'Wrap lines' / 'Переносить строки'
  - `plainText`: 'Plain text' / 'Текст'
  - `code`: 'Code' / 'Код' (the scroll region's name when there's no title)

**Behaviour decided here:**

- **Header:** with one sample, `title` is shown as text. With 2+ samples, a horizontal `<Tabs>` with `panelIdPrefix` set from `useId()`. On the right, an icon-only wrap toggle (`aria-pressed`, `aria-label={t('codeBlock.wrap')}`, lucide `WrapText`) and an icon-only copy button (`aria-label={t('codeBlock.copy')}`, lucide `Copy` → `Check` for 1500 ms after success). Both are `Button variant="ghost" size="sm" iconOnly` with a `Tooltip`.
- **Body:** a `<pre>` with `role="tabpanel"`, `id`/`aria-labelledby` matching Tabs in multi mode. When `maxHeight` is set, also `tabIndex={0}` and `aria-label={title ?? t('codeBlock.code')}`. Inside it, one `<span data-line>` per line, `data-highlighted` on highlighted lines, and `<span className={styles[key]}>` per token. Wrap off = `white-space: pre` + horizontal scroll; wrap on = `pre-wrap`.
- **Highlighted lines** are visual only (tint + 3px inline-start bar via `box-shadow`). The docs tell consumers to explain the emphasis in prose.
- **Copy:** `navigator.clipboard.writeText(activeSample.code)` inside the click handler. On rejection, or when the API is missing, nothing throws and `copyFailed` is announced. An always-rendered `<LiveRegion>` announces `copied`/`copyFailed`. Clear the timer on unmount and on re-click.
- **Selection:** `resolveActiveSample(ids, { controlled: activeSampleId, synced: useSyncedSample(syncKey), own: localPick, fallback: defaultSampleId })`. On a tab change: set `localPick`, call `setSynced(syncKey, id)` if `syncKey` is set, then `onSampleChange?.(id)`.
- **Spread order:** props first, then `ref` and our ARIA-bearing structure (pattern B), with a comment saying why.

- [ ] **Step 1: Failing tests** in `CodeBlock.test.tsx` (globals; `render`, `screen`, `userEvent`; mock `navigator.clipboard.writeText` with `vi.fn`):
  - single sample: header shows `title`, falling back to `JSON` for `language="json"` and `Plain text` for an unknown language; the body text equals the code minus one trailing newline
  - copy writes the exact original string, including its trailing `\n`; the live region reads `Copied`, and later `Couldn't copy` when `writeText` rejects or `navigator.clipboard` is undefined
  - samples: renders tabs with labels; switching to Python changes the body and the copied text; `onSampleChange('py')` is called once
  - `syncKey`: two blocks with the same key; picking `py` in one switches the other; a third block with the same key but no `py` keeps its selection; a block with a different key is unaffected
  - controlled `activeSampleId` wins over `syncKey`
  - wrap toggle flips `aria-pressed` and the body wrap class; `defaultWrap` sets the initial state
  - `maxHeight="sm"` adds the max-height class plus `tabIndex=0` and an accessible name on the body; without it, no `tabIndex`
  - `highlightLines={[2]}` puts `data-highlighted` on line 2 only
  - `ref` reaches the root div; `className` is merged; arbitrary `data-*` attributes pass through
- [ ] **Step 2: Run, expect FAIL**: `npx vitest run src/components/CodeBlock/CodeBlock.test.tsx`
- [ ] **Step 3: Implement** `CodeBlock.tsx`, `CodeBlock.module.scss` (tokens only, no layout props; `max-height` on the body is the component's own internal scroll box, allowed like `ScrollArea`), the i18n keys, and `index.ts`. Use full JSDoc per Rule 7, with a one-line component summary and `@see docs/components/CodeBlock.md`.
- [ ] **Step 4: Run, expect PASS**, then `npm run lint:css` and `npm run typecheck` from the repo root.
- [ ] **Step 5: Commit**: `feat(code-block): CodeBlock component`

---

### Task 5: Library integration (exports, docs, manifest)

**Files:**

- Modify: `packages/design-system/src/index.ts` (export `CodeBlock` + `CodeBlockProps`, `CodeBlockSample`, `CodeBlockLanguage`, `CodeBlockHighlightLines`, `CodeBlockMaxHeight`)
- Create: `packages/design-system/docs/components/CodeBlock.md`: a TL;DR snippet (single JSON; multi-sample with `syncKey`; app persistence via `defaultSampleId` + `onSampleChange` writing `localStorage`); "When NOT to use" (inline code → `Code`; editable code → `LiquidEditor`/`RichTextEditor`; unsupported language → expect plain text); highlighted lines need explaining in prose; SSR note. Generate the props table with `npm run build:docs`.
- Modify: `packages/design-system/docs/components/Code.md`: replace "Block code … belongs in the playground's `CodeBlock` (Prism), not the library" with a pointer to `CodeBlock`.
- Modify: `packages/design-system/AI-PRIMER.md`: add an index line next to `Code`: ``- [`CodeBlock`](docs/components/CodeBlock.md) — multi-line, highlighted, copyable code``
- Modify: `CLUSTERS` in **both** `packages/design-system/src/_meta/manifest.ts` and `packages/design-system/scripts/generate-manifest.mjs`: `CodeBlock: 'Display'`. Then run `npm run build:manifest`.

- [ ] **Step 1:** Make the edits above and run `npm run build:docs && npm run build:manifest` (from `packages/design-system`).
- [ ] **Step 2: Verify:** `make test` exits 0 (covers `publicApi.test.ts`, manifest drift, docs checks). `npm pack --dry-run -w @eocrm/design-system` lists no `*.test.*`.
- [ ] **Step 3: Commit**: `feat(code-block): export, docs, primer, manifest`

---

### Task 6: Playground demo + docs mockup refactor

**Files:**

- Create: `packages/playground/src/pages/components/CodeBlockDemo.tsx` (`DemoLayout` + `Example`, `componentName="CodeBlock"`), with examples for: single JSON response, a multi-sample cURL/JS/Python block, two blocks sharing a `syncKey`, `maxHeight="sm"` with a long payload, `highlightLines`, `defaultWrap`, and an unknown language rendering as plain text
- Modify: `packages/playground/src/App.tsx` (route `/components/code-block`), `src/layout/AppShell/navItems.ts` (`componentGroups` → Display), `src/pages/components/ComponentsIndex.tsx` + `overviewSchematics.tsx` (schematic: tinted header strip + lines, exactly one solid-accent focal element), `src/pages/mockups/registry.ts` (`'CodeBlock'` in the `ComponentName` union and in the docs mockup's `usesComponents`)
- Modify: `packages/playground/src/pages/mockups/Docs/Docs.tsx`:
  - delete `CodeSample` and `LanguageTabs`
  - use `<CodeBlock samples={…} syncKey="docs-lang" />` for request samples; the mockup persists the choice with `defaultSampleId` read from `localStorage` inside a lazy `useState` initializer wrapped in try/catch, plus `onSampleChange` writing it
  - single-language blocks (`title="Base URL"`, response JSON with `language="json"`, MCP snippets with `language="bash"` or plain for TOML)
  - the AI-assistants client `Tabs` stay as they are; only their snippet becomes a `CodeBlock`
- Modify: `packages/playground/TODO.md`: tick the `CodeBlock` entry (`[x]`, "Shipped: 2026-10-26 — …"), leaving it in place as history

- [ ] **Step 1:** Make the edits above. In `Docs.tsx`, no `style=` or `<pre>` remains (`grep -n "style=\|<pre" Docs.tsx` returns only the `<main>` TODO line).
- [ ] **Step 2: Verify:** `make test`, `make build`, `make lint` each exit 0.
- [ ] **Step 3: Visual check:** run the playground on port 8090+ (`npx vite --port 8090 --strictPort` in `packages/playground`). Check `/components/code-block` and `/mockups/docs/api/contacts/list` in light and dark, with both accents. Switching to Python on the home page carries over to the endpoint page.
- [ ] **Step 4: Commit**: `feat(playground): CodeBlock demo; docs mockup uses CodeBlock`

---

## After the tasks

Pause with a live playground link so dpws can check the demo (per the established workflow), then run `pre-push-review` **variant A** (library) and **variant B** (mockup) on one PR.
