# RichTextEditor wave 2 (divider, checklist, code language + inline code, slash menu) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship DS-101, DS-99, DS-104 and DS-103 in `@eocrm/design-system`'s RichText / RichTextEditor on one branch.

**Architecture:** Extend the flat block model (`RichText/engine/model.ts`): `divider` is a void block like `attachment`, `checklist_item` is a list item with `checked`, `code_block` gains `language`. Prism highlighting is reached only via dynamic `import()`. The slash menu reuses the mention menu's trigger detection (`getMentionContext` already takes a trigger char) and listbox pattern.

**Tech Stack:** React 19, TypeScript, Vitest (projects `unit` = Node for `*.test.ts`, `dom` = jsdom for `*.test.tsx`), SCSS modules with tokens only, `prism-react-renderer` (CodeBlock's tokenizer).

**Spec:** `docs/superpowers/specs/2026-11-28-rte-wave2-blocks-design.md` — read it before any task; it is the source of truth for behaviour. This plan fixes files, names and tests.

## Global Constraints

- Read `packages/design-system/CLAUDE.md` Hard rules first. Tokens only in SCSS, no layout props in component SCSS, every user-facing string via `useTranslation()` with keys in `src/i18n/messages.ts`, `en.ts` AND `ru.ts`.
- Paths below are relative to `packages/design-system/` unless they start with `packages/`.
- Run tests from `packages/design-system`: `npx vitest run <paths>`. Test-placement rules: pure logic in `*.test.ts` (Node), DOM in `*.test.tsx`.
- Stored values: `type: 'divider'`; `type: 'checklist_item'` with `checked?: boolean` (absent = unchecked) and `depth`; `code_block.language?: string` (absent = plain, canonical names only).
- Every edit a user makes in the editor goes through the existing `commit(result, kind)` path; checkbox toggle, language change, slash pick and divider insert use kind `'other'`.
- No new dependencies. No static import of `CodeBlock/highlight` or `prism-react-renderer` from any file under `src/components/RichText/` or `src/components/RichTextEditor/`.
- Slash menu is off unless `slashMenu` is passed.
- Commit after each task with a conventional message naming the task key(s). No Co-Authored-By trailer.

## Review Focus

1. **Undo after a checkbox click** returns exactly the previous `checked` value and the caret is not lost — test in Task 5.
2. **Pasting HTML from GitHub/Notion** (`<li><input type="checkbox" checked>`, `<pre><code class="language-ts">`, `<hr>`) imports as checklist / typescript / divider — tests in Task 2.
3. **A document saved before this release** (code+bold runs, bullet then ordered at depth 0, code blocks with no language) renders byte-identical HTML — snapshot-free equality test in Task 3.
4. **Typing `/` inside a URL or word** (`a/b`, `http://x`) opens no menu; `/` during IME composition opens no menu — tests in Task 7.
5. **Highlighter chunk fails to load** (rejected import) leaves plain, editable code with no error thrown — test in Task 3.

---

### Task 1: Model and engine primitives

**Files:**

- Modify: `src/components/RichText/engine/model.ts`, `attachment.ts` (`isVoidBlock`), `listDepths.ts` (`isListItem`), `transforms.ts` (`splitBlock`, `setBlockType`)
- Create: `src/components/RichText/engine/codeLanguage.ts`
- Test: `src/components/RichText/engine/transforms.test.ts`, `codeLanguage.test.ts`

**Interfaces:**

- Produces: `BlockType` gains `'divider' | 'checklist_item'`; `Block.checked?: boolean`; `Block.language?: string`; `CreateBlockAttrs.checked?`, `.language?` copied by `createBlock`.
- Produces: `isVoidBlock(b)` true for `attachment` and `divider`. `isListItem(b)` true for bullet, ordered, checklist.
- Produces: `setBlockType(doc, id, patch)` where `patch: Partial<Pick<Block,'type'|'level'|'depth'|'checked'|'language'>>`; it keeps `depth` for all three list types, drops `checked` unless target is `checklist_item`, drops `language` unless target is `code_block`.
- Produces (`codeLanguage.ts`): `CODE_LANGUAGES: readonly string[]` (the 16 canonical names in spec order), `normalizeCodeLanguage(raw: string | null | undefined): string | undefined` — trims, lower-cases, maps the spec's alias table, returns `undefined` for `''`/`plain`/`text`/`plaintext`, otherwise the canonical or the lower-cased verbatim value.

- [ ] **Step 1: Write failing tests**
  - `transforms.test.ts`: `splitBlock` at the end of a `checklist_item` with `checked: true` yields a new `checklist_item` at the same depth with `checked: false`; `setBlockType` from `checklist_item`(checked) to `bullet_item` keeps `depth`, removes `checked`; from `code_block`(language `ts`) to `paragraph` removes `language`; `setBlockType` on a `divider` is a no-op.
  - `codeLanguage.test.ts`: `normalizeCodeLanguage('JS') === 'javascript'`, `('tsx') === 'typescript'`, `('zsh') === 'bash'`, `('yml') === 'yaml'`, `('c#') === 'csharp'`, `('xml') === 'html'`, `(' Plain ') === undefined`, `('Elixir') === 'elixir'`, `(undefined) === undefined`; every entry of `CODE_LANGUAGES` normalises to itself.
- [ ] **Step 2:** Run `npx vitest run src/components/RichText/engine` — expect the new cases to FAIL.
- [ ] **Step 3:** Implement the interfaces above.
- [ ] **Step 4:** Run the same command plus `npx tsc --noEmit` — PASS. Fix any exhaustive-`switch` errors the new union exposes by adding the minimal case (later tasks fill real behaviour); `npx vitest run src/components/RichText src/components/RichTextEditor` must stay green.
- [ ] **Step 5:** Commit `feat(RichText): divider/checklist/language model fields (DS-99/101/104)`.

### Task 2: Serialization (HTML + Markdown, both ways)

**Files:**

- Modify: `src/components/RichText/engine/toHtml.ts`, `fromHtml.ts`, `toMarkdown.ts`, `mdToHtml.ts`
- Test: `toHtml.test.ts`, `fromHtml.test.ts`, `toMarkdown.test.ts`, `fromMarkdown.test.ts` (create if absent; Node)

**Interfaces:** Consumes Task 1. Exact output strings:

- divider → `<hr>`; Markdown `---`.
- checklist run → `<ul data-type="checklist"><li data-checked="true"><input type="checkbox" checked disabled>Buy milk</li><li data-checked="false"><input type="checkbox" disabled>Call</li></ul>`; Markdown `- [x] Buy milk` / `- [ ] Call`, nested by two spaces per depth like bullets. A type switch at the same depth closes the list.
- code → `<pre><code class="language-typescript">…</code></pre>` (no class when plain); Markdown fence info string = canonical language.

- [ ] **Step 1: Write failing tests** — one round-trip per format per block (`fromHtml(toHtml(doc))` and `fromMarkdown(toMarkdown(doc))` deep-equal ignoring ids), plus imports: `<hr/>`; `<ul><li><input type="checkbox" checked>Done</li></ul>` (GitHub shape, no `data-type`) → `checklist_item` checked; `<pre><code class="language-ts">` → `language: 'typescript'`; Markdown ` ```py ` → `python`; `***` and `___` → divider; `- [X] a` → checked. Mixed `- a` then `- [ ] b` at depth 0 → bullet then checklist.
- [ ] **Step 2:** Run `npx vitest run src/components/RichText/engine` — FAIL.
- [ ] **Step 3:** Implement. In `fromHtml`, the checkbox `<input>` inside an `<li>` sets `checked` and contributes no text; `HR` becomes a divider block instead of being flushed. Language read via `normalizeCodeLanguage` from the first `language-*`/`lang-*` class on `code` or `pre`.
- [ ] **Step 4:** Re-run — PASS (existing serializer tests unchanged).
- [ ] **Step 5:** Commit `feat(RichText): serialize divider, checklist and code language (DS-99/101/104)`.

### Task 3: Read-only rendering and lazy highlighting

**Files:**

- Modify: `src/components/CodeBlock/highlight.ts` (add `php`, `sql`, `yaml`, `html`, `css`, `markdown` to `CodeBlockLanguage` + `LANGUAGE_LABELS`; register a small PHP grammar the way bash is registered), `src/components/RichText/engine/renderDoc.tsx`, `src/components/RichText/RichText.tsx`, `RichText.module.scss`/`_prose.scss`
- Create: `src/components/RichText/useHighlight.ts`, `src/components/RichText/RichTextCodeBlock.tsx`
- Test: `renderDoc.test.tsx`, `RichText.test.tsx`, `src/components/RichText/lazyHighlight.test.ts` (Node static scan), `src/components/CodeBlock/highlight.test.ts` (new languages tokenise)

**Interfaces:**

- Produces: `RenderDocOptions.onToggleCheck?: (blockId: string, checked: boolean) => void` and `RichTextProps.onToggleCheck` (same signature, JSDoc per Hard rule 7).
- Produces: `useHighlight(code: string, language: string | undefined): CodeToken[][] | null` — `null` until the dynamic `import('../CodeBlock/highlight')` resolves or when language is absent/unknown or the import rejects; module-level cached promise.
- Produces: `RichTextCodeBlock({ block, editable })` renders `<pre data-block-id?><code class="language-x">` with token spans (CodeBlock's token class names/CSS) and, when not editable, a Copy button reusing CodeBlock's copy strings (`t('codeBlock.copy')`-style keys — reuse whatever CodeBlock uses).
- Divider renders `<hr>` (read-only) / `<figure data-block-id contentEditable={false}><hr/></figure>` (editable). Checklist renders per spec: `<ul data-type="checklist">`, `<li>` with `<input type="checkbox">` (`aria-labelledby` → text span id from `useId`-free deterministic `${blockId}-label`; empty text → `aria-label={t('richText.checklistItem')}`), `disabled` when no `onToggleCheck` and not editable; editable checkbox wrapped `contentEditable={false}`.

- [ ] **Step 1: Write failing tests**
  - `renderDoc.test.tsx`: divider read-only is an `hr` with role separator; checklist item checkbox has accessible name = item text, `checked` reflects model, disabled without handler, clicking calls `onToggleCheck('id', false)` when it was checked; a checklist between two ordered runs yields `ol, ul, ol`.
  - Review Focus 3: a fixture doc of pre-existing types (code+bold run, bullet then ordered at depth 0, language-less code block) renders `container.innerHTML` equal to the value captured from `main` before this branch (paste the literal string into the test).
  - `RichText.test.tsx`: code block with `language: 'typescript'` eventually (`findBy`) contains token spans; Copy button present read-only and copies the raw text; Review Focus 5: mock the dynamic import to reject → code text still rendered, no throw.
  - `lazyHighlight.test.ts`: read every `.ts/.tsx` (non-test) under `src/components/RichText` and `src/components/RichTextEditor`; assert none contains a static `from '…CodeBlock/highlight'` / `from 'prism-react-renderer'` / `from '…/CodeBlock'` import; assert `useHighlight.ts` contains `import('../CodeBlock/highlight')`.
- [ ] **Step 2:** Run `npx vitest run src/components/RichText src/components/CodeBlock` — FAIL.
- [ ] **Step 3:** Implement. `collectList` closes the current list when `isChecklist(block) !== isChecklist(first)` at the base depth; bullet/ordered behaviour otherwise unchanged.
- [ ] **Step 4:** Re-run — PASS. `npm run build && npm run size`: record the new `rte` and `all` numbers and raise only those budgets in `size-budgets.json` to measured + ~1%; every other entry must pass unchanged.
- [ ] **Step 5:** Commit `feat(RichText): render divider, checklist, highlighted code (DS-99/101/104)`.

### Task 4: Editor — divider

**Files:**

- Modify: `src/components/RichTextEditor/inputRules.ts`, `RichTextEditor.tsx` (input-rule call site ~1203 and Enter handling), `selection.ts` (`figureBlock` callers that assume attachment), `RichTextToolbar.tsx` (block dropdown "Divider" item), `RichTextBlockMenu.tsx` ("Insert divider below"; divider rows show no "Turn into"), `commands.ts`
- Test: `inputRules.test.ts`, `commands.test.ts`, `RichTextEditor.test.tsx`

**Interfaces:**

- Produces: `runInsertDivider(doc: RichDoc, range: Range): CommandResult` in `commands.ts` — same split/void/trailing-paragraph shape as `insertAttachmentBlock`; caret in the trailing paragraph; an empty current paragraph is replaced.
- Produces: `matchBlockRule(sourceType, before, trigger)` accepts `trigger === 'Enter'` for `---` only; `---` + space also matches. Returns `{ change: { type: 'divider' }, markerLen: 3 }`; `applyBlockRule` for a divider change delegates to `runInsertDivider` semantics.

- [ ] **Step 1: Write failing tests** — `matchBlockRule('paragraph','---',' ')` and `(…, 'Enter')` match, `('paragraph','--',' ')` and `('heading','---',' ')` don't, `('paragraph','#','Enter')` doesn't; `runInsertDivider` on `"ab|cd"` gives `[p "ab", divider, p "cd"]`; editor: typing `---` + Enter yields a divider and caret in the following paragraph; Backspace at start of that paragraph deletes the divider (one undo restores it); the attachment resize/alt UI never appears for a divider.
- [ ] **Step 2:** `npx vitest run src/components/RichTextEditor` — FAIL.
- [ ] **Step 3:** Implement; i18n key `richTextEditor.divider` (en "Divider", ru "Разделитель").
- [ ] **Step 4:** Re-run — PASS.
- [ ] **Step 5:** Commit `feat(RichTextEditor): divider block (DS-101)`.

### Task 5: Editor — checklist

**Files:**

- Modify: `inputRules.ts`, `commands.ts` (`runToggleList` and `runIndent` accept `checklist_item`), `RichTextToolbar.tsx` (`onToggleList` type widens to `'bullet_item' | 'ordered_item' | 'checklist_item'`; third list button with a new checklist icon in `icons.tsx`), `RichTextBlockMenu.tsx` (Turn into → Checklist), `RichTextEditor.tsx` (`inList` checks at ~1691/1702 use `isListItem`; checkbox click handler)
- Test: `inputRules.test.ts`, `commands.test.ts`, `RichTextEditor.test.tsx`

**Interfaces:**

- Consumes: Task 3's editable checkbox markup.
- Produces: `runToggleCheck(doc: RichDoc, blockId: string): RichDoc` in `commands.ts`.
- Input rules: `[]`, `[ ]` → `{ type: 'checklist_item', depth: 0 }`; `[x]`, `[X]` → same plus `checked: true` (`BlockRuleChange` gains `checked?: boolean`).

- [ ] **Step 1: Write failing tests** — rule matches for all four markers; toolbar checklist button toggles a paragraph to `checklist_item` and back; Enter on a checked item creates an unchecked one; Enter on an empty item exits to paragraph; Tab/Shift+Tab change depth; Review Focus 1: clicking the checkbox flips `checked`, `onChange` fires once, editor keeps focus, Ctrl+Z restores the previous value and leaves the caret in the same block; Space on the focused checkbox toggles too.
- [ ] **Step 2:** `npx vitest run src/components/RichTextEditor` — FAIL.
- [ ] **Step 3:** Implement. The checkbox uses `onPointerDown` preventDefault (keep selection) and `onChange` → `commit({ doc: runToggleCheck(value, id), selection }, 'other')`. i18n: `richTextEditor.checklist` (en "Checklist", ru "Чек-лист"), `richText.checklistItem` (en "Checklist item", ru "Пункт чек-листа").
- [ ] **Step 4:** Re-run — PASS.
- [ ] **Step 5:** Commit `feat(RichTextEditor): checklist items (DS-99)`.

### Task 6: Editor — code language, Tab handling, inline code

**Files:**

- Create: `src/components/RichTextEditor/RichTextCodeLanguagePicker.tsx`
- Modify: `RichTextEditor.tsx`, `shortcuts.ts` (`shortcutMark`: Mod+E → `{ type: 'code' }`), `RichTextToolbar.tsx` (`MARKS` adds code after strike, new icon), `commands.ts`, `src/components/RichTextEditor/inlineCodeRule.ts` (create)
- Test: `shortcuts.test.ts`, `commands.test.ts`, `inlineCodeRule.test.ts`, `RichTextEditor.test.tsx`

**Interfaces:**

- Produces: `runSetCodeLanguage(doc, blockId, language: string | undefined): RichDoc`.
- Produces: `matchInlineCode(blockText: string, caretOffset: number): { start: number; end: number } | null` — called when the user types a backtick; matches `` `x…` `` where the opening backtick is at block start or after whitespace, content non-empty and not starting/ending with a space, no backtick inside. Applying removes both backticks and adds the code mark as ONE `'other'` commit.
- Produces: `runToggleMark` with `code`: applying `code` strips bold/italic/underline/strike/textColor/bgColor in the range (link kept); `activeMarks`-driven toolbar disables those buttons when the whole selection is code, and `stageOrToggleMark` ignores them there.
- Picker: DS `Select` (or `DropdownMenu` if Select cannot be anchored) positioned with `useAnchoredFloating` at the code block's top-end while the caret is in a `code_block`; options = "Plain text" + `CODE_LANGUAGES` labelled via `LANGUAGE_LABELS`-equivalent strings that do not pull Prism (put a plain `CODE_LANGUAGE_LABELS` map in `codeLanguage.ts`; `highlight.ts` may import it); aria-label `t('richTextEditor.codeLanguage')` (en "Code language", ru "Язык кода"); "Plain text" via `t('richTextEditor.plainText')` (ru "Обычный текст").
- Keys in a code block: Tab inserts two spaces at caret (or before each selected line); Shift+Tab removes up to two leading spaces per line; Escape sets a one-shot flag so the next Tab is not intercepted (focus moves out).

- [ ] **Step 1: Write failing tests** — `shortcutMark` Mod+E; `matchInlineCode('a `b`', 5)` → `{start:2,end:5}`, `('``', 2)` null, `('a ` b`', 6)` null; toolbar code button toggles; applying code over a bold range leaves only code; picker changes `language` in one undo step; Tab inserts two spaces, Escape then Tab leaves the editor (`document.activeElement` not the editor).
- [ ] **Step 2:** `npx vitest run src/components/RichTextEditor` — FAIL.
- [ ] **Step 3:** Implement; i18n `richTextEditor.inlineCode` (en "Inline code", ru "Код").
- [ ] **Step 4:** Re-run — PASS.
- [ ] **Step 5:** Commit `feat(RichTextEditor): code language picker, Tab in code, inline code mark (DS-104)`.

### Task 7: Slash menu

**Files:**

- Create: `src/components/RichTextEditor/slashItems.tsx` (types + `defaultSlashItems`), `useSlashMenu.ts`, `RichTextSlashMenu.tsx`; extract shared listbox shell from `RichTextMentionMenu.tsx` / state from `useMention.ts` into `useTriggerMenu.ts` only if it removes duplication without changing mention tests
- Modify: `RichTextEditor.tsx` (prop, selectionchange recompute, keydown routing, `aria-controls`/`aria-activedescendant` when slash is open), `index.ts` and `src/index.ts` (export `SlashItem`, `SlashApi`, `SlashGroup`, `RichTextSlashMenuOption` types), `src/publicApi.test.ts` expectations
- Test: `slashItems.test.ts`, `useSlashMenu.test.tsx`, `RichTextEditor.test.tsx`

**Interfaces:**

- Produces: exactly the `SlashGroup` / `SlashItem` / `SlashApi` types in the spec; prop `slashMenu?: boolean | { items?: (defaults: SlashItem[]) => SlashItem[] }` on `RichTextEditorProps` with JSDoc.
- Produces: `defaultSlashItems(opts: { t: Translate; hasUpload: boolean }): SlashItem[]` — ids `paragraph, heading1, heading2, heading3, quote, code, bullet, numbered, checklist, divider, image, file` (last two only with upload); groups per spec.
- Produces: `filterSlashItems(items: SlashItem[], query: string): SlashItem[]` — case-insensitive prefix-or-substring on label and keywords, group order preserved.
- Trigger: `getMentionContext(text, caret, '/')` in a `paragraph` or `heading` block only; skipped while composing (`isComposing`/composition flag the editor already tracks).

- [ ] **Step 1: Write failing tests** — `filterSlashItems` (`'h2'` keyword hit, `'quo'`, `''` returns all, `'zzz'` empty); editor with `slashMenu`: typing `/` opens a listbox named `t('richTextEditor.slashMenuLabel')`, `/hea` filters, ArrowDown + Enter on "Heading 2" converts the block and removes `/hea`, one Ctrl+Z restores `/hea` text; Escape closes leaving `/hea`; "No matches" row for `/zzz`; Review Focus 4: `a/b` and `http://x` open nothing, `/` during composition opens nothing, no menu without the prop and in a code block; custom `items` callback adds an item whose `run` calls `api.insertBlocks([...])` and the blocks appear with new ids.
- [ ] **Step 2:** `npx vitest run src/components/RichTextEditor src/publicApi.test.ts` — FAIL.
- [ ] **Step 3:** Implement. i18n (en/ru): `richTextEditor.slashMenuLabel` ("Insert block"/"Вставить блок"), group names `slashGroupText/Lists/Media/Advanced` ("Text"/"Текст", "Lists"/"Списки", "Media"/"Медиа", "Advanced"/"Дополнительно"), `slashNoMatches` ("No matches"/"Ничего не найдено"), one `…Hint` per default item (short phrase, e.g. "Big section heading"), reusing existing block-name keys for labels.
- [ ] **Step 4:** Re-run — PASS.
- [ ] **Step 5:** Commit `feat(RichTextEditor): slash insert menu (DS-103)`.

### Task 8: Docs, playground, stored format, gates

**Files:**

- Modify: `docs/components/RichTextEditor.md`, `docs/components/RichText.md` (blocks list line 3, input rules, shortcuts, `slashMenu`, `onToggleCheck`, new **Stored format** section listing every block type + attribute with the new ones flagged), `AI-PRIMER.md` (only if the one-line summaries change), `packages/playground/src/pages/components/RichTextEditorDemo.tsx` (a "Wiki page" example with `slashMenu` and every new block in its seed doc) and `RichTextDemo.tsx` if present (checklist with `onToggleCheck`)
- Test: gates only

- [ ] **Step 1:** Write docs; run `npm run build:docs` from `packages/design-system`.
- [ ] **Step 2:** From repo root: `make test && make build-lib && make lint && npm run format:check` — all exit 0; `npm run size` (in package) passes.
- [ ] **Step 3:** Commit `docs(RichTextEditor): wave-2 blocks, slash menu, stored format (DS-99/101/103/104)`.
