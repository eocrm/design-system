# LiquidEditor: Insert tag menu (#749) + nested variable sub-menus (#750) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `LiquidEditor` insert Liquid tags (menu + `{%` autocomplete) at the caret, and render dotted variable codes as nested sub-menus in "Insert variable".

**Architecture:** One pure snippet engine (`applySnippet` + tag catalogue in `liquidTags.ts`) feeds three entry points: the variable menu, a new `InsertTagMenu`, and a new `tag` autocomplete context. A pure `buildVariableTree` turns dotted codes into a tree that `InsertVariableMenu` renders with the existing `DropdownMenu.Sub`. `DropdownMenu.Item` gains a `textValue` prop so rich-content items join typeahead.

**Tech Stack:** React 18, TypeScript, SCSS modules, Vitest (`unit` = Node for `*.test.ts`, `dom` = jsdom for `*.test.tsx`), Testing Library.

**Spec:** GitHub issues eocrm/design-system#749 and #750, plus the design approved in chat on 2026-11-07, summarised here:

- `tags?: LiquidTag[]`, `LiquidTag = 'if' | 'unless' | 'case' | 'assign' | 'capture' | 'comment'`. Default: all six. `[]` hides the Insert tag menu and disables tag autocomplete. Loop tags (`for`, `tablerow`, `cycle`) are never offered.
- Insert tag menu entries (order fixed; `$0` = caret, `$SEL` = selected text, removed when empty):

  | id | tag | label | template |
  |---|---|---|---|
  | `if` | if | `if` | `{% if $0 %}$SEL{% endif %}` |
  | `ifElse` | if | `if … else` | `{% if $0 %}$SEL{% else %}{% endif %}` |
  | `ifElsif` | if | `if … elsif … else` | `{% if $0 %}$SEL{% elsif %}{% else %}{% endif %}` |
  | `unless` | unless | `unless` | `{% unless $0 %}$SEL{% endunless %}` |
  | `case` | case | `case` | `{% case $0 %}{% when "" %}$SEL{% endcase %}` |
  | `assign` | assign | `assign` | `{% assign $0 = $SEL %}` |
  | `capture` | capture | `capture` | `{% capture $0 %}$SEL{% endcapture %}` |
  | `comment` | comment | `comment` | `{% comment %}$0$SEL{% endcomment %}` |

- `{%` autocomplete: when the caret is on the first word after `{%`, suggest the allowed entries (match the `tag` keyword by prefix). Accepting replaces from the `{%` opener through the caret, plus an immediately following `\s*%}` if present, with the full snippet. After a tag word (`{% if rec`), variable autocomplete works as today.
- Dotted codes render as a tree within each group: intermediate segment → `SubTrigger` labelled with the raw segment; leaf → `Item` labelled `label || code`; a prefix that is itself declared renders as the first `Item` inside its own sub-menu. Undotted codes render exactly as today. Autocomplete unchanged.

## Global Constraints

- Every user-facing string goes through i18n (`useTranslation`), with keys in `src/i18n/messages.ts` (JSDoc on each), `en.ts` and `ru.ts`. Tag labels in the table above are Liquid syntax and are NOT translated; descriptions and "Insert tag" are.
- Tokens only in SCSS; no layout properties in component SCSS (Hard rules 3, 4).
- Every exported prop/type gets JSDoc (Hard rule 7); new public types are re-exported from `src/index.ts`.
- Pure logic tests in `*.test.ts` (Node); DOM tests in `*.test.tsx`. No exact counts on the tag catalogue except where the table itself is the contract.
- Existing `LiquidEditor.test.tsx` and `DropdownMenu.test.tsx` tests must stay green unchanged.
- Run vitest from `packages/design-system` (`npx vitest run <path>`).

## Review Focus

1. Selection that spans text and the menu is opened (focus leaves the textarea) — the selection captured at insert time must still be the one the user had. Owner: Task 2 (test: select "Hello", open Insert tag, pick `if` → `{% if  %}Hello{% endif %}`, caret after `{% if `).
2. `{%-` whitespace-control openers and `{%` with no closing `%}` at end of value — autocomplete must not throw or corrupt text. Owner: Task 3.
3. A declared parent with no declared children (`record.status` alone, no `record.status.x`) is a plain leaf, not an empty sub-menu. Owner: Task 4.
4. Same segment name under different parents (`record.status.name` and `event.status`) must not merge. Owner: Task 4.
5. Read-only / disabled editor: Insert tag trigger disabled and tag autocomplete never opens. Owner: Tasks 2 and 3.

---

### Task 1: Snippet engine + tag catalogue

**Files:**
- Create: `src/components/LiquidEditor/liquidTags.ts`
- Create: `src/components/LiquidEditor/liquidTags.test.ts`
- Modify: `src/components/LiquidEditor/LiquidEditor.tsx` (`insertVariable` → uses `applySnippet`)
- Modify: `src/components/LiquidEditor/types.ts`, `index.ts`, `src/index.ts` (export `LiquidTag`)

**Interfaces:**
- Produces:
  - `export type LiquidTag = 'if' | 'unless' | 'case' | 'assign' | 'capture' | 'comment'` (in `types.ts`, JSDoc'd)
  - `export const ALL_LIQUID_TAGS: readonly LiquidTag[]` (in `liquidTags.ts`, order as table)
  - `export type LiquidTagSnippetId = 'if' | 'ifElse' | 'ifElsif' | 'unless' | 'case' | 'assign' | 'capture' | 'comment'`
  - `export interface LiquidTagSnippet { id: LiquidTagSnippetId; tag: LiquidTag; label: string; template: string }`
  - `export const LIQUID_TAG_SNIPPETS: readonly LiquidTagSnippet[]` (exactly the table rows, in order)
  - `export function snippetsFor(tags: readonly LiquidTag[]): LiquidTagSnippet[]` — catalogue order, filtered by `tag`
  - `export function applySnippet(value: string, selStart: number, selEnd: number, template: string): { value: string; caret: number }` — replaces `value[selStart, selEnd)` with the template where `$SEL` → the replaced text and `$0` → caret position (removed). Template without `$0` → caret at end of inserted text. Template without `$SEL` → selection is discarded.

- [ ] **Step 1: Write failing tests in `liquidTags.test.ts`**

```ts
describe('applySnippet', () => {
  it('inserts at a collapsed caret, caret at $0', () => {
    expect(applySnippet('ab', 1, 1, '{% if $0 %}$SEL{% endif %}')).toEqual({ value: 'a{% if  %}{% endif %}b', caret: 'a{% if '.length });
  });
  it('wraps the selection as $SEL', () => {
    expect(applySnippet('xHelloy', 1, 6, '{% if $0 %}$SEL{% endif %}')).toEqual({ value: 'x{% if  %}Hello{% endif %}y', caret: 'x{% if '.length });
  });
  it('no $0 → caret at end of insertion', () => {
    expect(applySnippet('ab', 1, 1, '{{ x }}')).toEqual({ value: 'a{{ x }}b', caret: 'a{{ x }}'.length });
  });
  it('no $SEL → selection replaced', () => {
    expect(applySnippet('aXXb', 1, 3, '{{ x }}$0')).toEqual({ value: 'a{{ x }}b', caret: 'a{{ x }}'.length });
  });
  it('$0 after $SEL is offset by the selection length', () => {
    expect(applySnippet('Hi', 0, 2, '{% comment %}$SEL$0{% endcomment %}').caret).toBe('{% comment %}Hi'.length);
  });
});
describe('snippetsFor', () => {
  it('keeps catalogue order and filters by tag', () => {
    expect(snippetsFor(['case', 'if']).map((s) => s.id)).toEqual(['if', 'ifElse', 'ifElsif', 'case']);
  });
  it('never offers loop tags', () => {
    expect(LIQUID_TAG_SNIPPETS.some((s) => /\{%\s*(for|tablerow|cycle)\b/.test(s.template))).toBe(false);
  });
  it('catalogue covers every LiquidTag', () => {
    expect(new Set(LIQUID_TAG_SNIPPETS.map((s) => s.tag))).toEqual(new Set(ALL_LIQUID_TAGS));
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/components/LiquidEditor/liquidTags.test.ts` — expect FAIL (module missing).
- [ ] **Step 3: Implement `liquidTags.ts`** with the table above verbatim. `applySnippet`: substitute `$SEL` first, then locate and strip `$0`.
- [ ] **Step 4: Refactor `insertVariable`** in `LiquidEditor.tsx` to build a template (`{{ code }}` or `{% for item in code %}{{ item }}$0{% endfor %}`) and call `applySnippet(value, start, end, template)`; behaviour must be identical.
- [ ] **Step 5: Run** `npx vitest run src/components/LiquidEditor` — all PASS (existing insert tests unchanged).
- [ ] **Step 6: Commit** `feat(liquid-editor): snippet engine + tag catalogue (#749)`

### Task 2: `tags` prop + Insert tag menu

**Files:**
- Create: `src/components/LiquidEditor/InsertTagMenu.tsx`
- Modify: `src/components/LiquidEditor/LiquidEditor.tsx`, `types.ts` (`tags?: LiquidTag[]` on `LiquidEditorProps`, JSDoc: default all six, `[]` hides the menu and disables `{%` autocomplete, loop tags are never offered)
- Modify: `src/i18n/messages.ts`, `en.ts`, `ru.ts`
- Test: `src/components/LiquidEditor/LiquidEditor.test.tsx` (new `describe('insert tag menu (#749)')`)

**Interfaces:**
- Consumes: `snippetsFor`, `applySnippet`, `LiquidTagSnippet` (Task 1).
- Produces: `InsertTagMenu({ snippets: LiquidTagSnippet[]; disabled?: boolean; onInsert: (s: LiquidTagSnippet) => void })`. i18n keys under `liquidEditor`: `insertTag: string`; `tagDescription: Record<LiquidTagSnippetId, string>` (typed as an object with the 8 ids). English descriptions (exact):
  - if: "Show content only when a condition is true"
  - ifElse: "Show one thing or another, depending on a condition"
  - ifElsif: "Check several conditions in order"
  - unless: "Show content only when a condition is false"
  - case: "Choose content by matching a value"
  - assign: "Store a value in a new variable"
  - capture: "Store a block of rendered text in a variable"
  - comment: "Leave a note that is not rendered"
  - insertTag: "Insert tag"; ru: provide natural Russian translations.

- [ ] **Step 1: Write failing tests**
  - `'inserts an if block at the caret with the caret in the condition'`: Harness `initial="Hi "`, place caret at end (`ta.setSelectionRange(3,3)`), click `button "Insert tag"`, click `menuitem /^if Show content only when a condition is true/` → value `'Hi {% if  %}{% endif %}'`, `waitFor` selectionStart === `'Hi {% if '.length`.
  - `'wraps the selected text as the block body'` (Review Focus 1): `initial="Hello"`, `setSelectionRange(0,5)`, pick `if` → `'{% if  %}Hello{% endif %}'`.
  - `'tags prop narrows the menu'`: `tags={['assign']}` → menu has exactly menuitems named /assign/ and none /if/.
  - `'tags={[]} hides the Insert tag button'` → `queryByRole('button', {name: 'Insert tag'})` is null.
  - `'Insert tag is disabled when readOnly'` (Review Focus 5).
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement `InsertTagMenu`** mirroring `InsertVariableMenu` (secondary sm `Button` trigger, `DropdownMenu.Item` per snippet with `textValue={s.label}` once Task 5 lands — until then plain), item content: label + muted description using the existing `styles.menuItemMain` / `styles.menuItemDesc`. In `LiquidEditor`, render it before `InsertVariableMenu` when `snippetsFor(tags).length > 0`; `insertTag` handler = same selection capture + `applySnippet` + `commit` + `focus` as `insertVariable` (share one `insertTemplate(template)` callback).
- [ ] **Step 4: Run** `npx vitest run src/components/LiquidEditor src/i18n` — PASS (i18n parity tests cover ru).
- [ ] **Step 5: Commit** `feat(liquid-editor): Insert tag menu + tags prop (#749)`

### Task 3: `{%` tag autocomplete

**Files:**
- Modify: `src/components/LiquidEditor/useLiquidAutocomplete.ts`, `useLiquidAutocomplete.test.tsx`, `LiquidEditor.tsx`, `AutocompleteMenu.tsx` (only if it needs to render the description for tag items — it already renders `description`)
- Test: `useLiquidAutocomplete.test.tsx` (context), `LiquidEditor.test.tsx` (accept flow)

**Interfaces:**
- Consumes: `snippetsFor`, `applySnippet` (Task 1); `tags` prop (Task 2).
- Produces:
  - `AutocompleteKind = 'variable' | 'filter' | 'tag'`
  - `AutocompleteContext` gains `open: number` (index of the `{{`/`{%` opener).
  - `getAutocompleteContext` returns `kind: 'tag'` when the opener is `{%` and only whitespace (and an optional `-` right after `{%`) sits between `open + 2` and `wordStart`.
  - `AutocompleteItem` gains optional `snippet?: LiquidTagSnippet`.
  - `useLiquidAutocomplete` args gain `tags: readonly LiquidTag[]`; tag items: `{ value: s.id, label: s.label, description: <i18n description passed in>, snippet: s }`, filtered by `s.tag.startsWith(q)`. Pass descriptions via a new arg `tagDescriptions: Record<LiquidTagSnippetId, string>` so the hook stays i18n-free.
  - In `acceptActive`: if `item.snippet`, compute `end = caret` extended over `/^\s*-?%\}/` matched at `value.slice(caret)`, then `applySnippet(value, ctx.open, end, item.snippet.template)` instead of `applyCompletion`.

- [ ] **Step 1: Failing tests**
  - context: `getAutocompleteContext('{% i', 4)` → `{ kind: 'tag', query: 'i', wordStart: 3, open: 0 }`; `getAutocompleteContext('{%- ', 4)?.kind` → `'tag'`; `getAutocompleteContext('{% if rec', 9)?.kind` → `'variable'`; `getAutocompleteContext('{{ i', 4)?.kind` → `'variable'`.
  - LiquidEditor: type `{% ca` → option /case/ visible; Enter → value `'{% case  %}{% when "" %}{% endcase %}'`, caret after `'{% case '`.
  - LiquidEditor: value `'{% un %}'` with caret after `un`, accept → `'{% unless  %}{% endunless %}'` (trailing `%}` consumed).
  - `tags={[]}`: typing `{% i` shows no listbox. `readOnly`: no listbox (Review Focus 5).
  - `'{%'` at end of value with nothing after: typing `{% ` then ArrowDown/Enter does not throw (Review Focus 2).
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** per Interfaces.
- [ ] **Step 4: Run** `npx vitest run src/components/LiquidEditor` — PASS.
- [ ] **Step 5: Commit** `feat(liquid-editor): {% tag autocomplete expands to snippet (#749)`

### Task 4: Variable tree + nested Insert variable menu

**Files:**
- Create: `src/components/LiquidEditor/variableTree.ts`, `variableTree.test.ts`
- Modify: `src/components/LiquidEditor/InsertVariableMenu.tsx`
- Test: `LiquidEditor.test.tsx` (new `describe('nested insert variable menu (#750)')`)

**Interfaces:**
- Produces:
  - `export interface VariableNode { segment: string; path: string; variable?: LiquidVariable; children: VariableNode[] }`
  - `export function buildVariableTree(vars: readonly LiquidVariable[]): VariableNode[]` — split `code` on `.`, first-seen order at every level, key children by full `path` (so equal segments under different parents never merge).

- [ ] **Step 1: Failing tests (`variableTree.test.ts`)**
  - `['record.status.id','record.status.name','score']` → roots `record` (child `status` with leaves `id`,`name`) and leaf `score` (with `variable` set); `record.variable` undefined.
  - declared parent: `['record.status','record.status.name']` → node `record.status` has `variable` set AND one child.
  - Review Focus 3: `['record.status']` alone → `record` › `status` leaf with no children.
  - Review Focus 4: `['record.status.name','event.status']` → two distinct `status` nodes with paths `record.status` and `event.status`.
- [ ] **Step 2: Failing DOM tests**
  - open Insert variable, click `menuitem "record"` (SubTrigger), then `"status"`, then `menuitem /Status name/` → value `'{{ record.status.name }}'`.
  - declared parent appears as first item inside its sub-menu and inserts `{{ record.status }}`.
  - undotted vars still render flat (existing #304 tests stay green).
  - keyboard: ArrowRight on a focused SubTrigger opens its sub-menu (assert the child menuitem becomes visible).
- [ ] **Step 3: Run** both — FAIL.
- [ ] **Step 4: Implement** `buildVariableTree`; in `InsertVariableMenu`, per group build the tree and render recursively: node with children → `<DropdownMenu.Sub><DropdownMenu.SubTrigger>{segment}</…><DropdownMenu.SubContent>{node.variable && <item>}{children}</…></…>`; node without children → the existing item markup (extract it to a local `VariableItem` component, keyed by `code`). The declared-parent item shows its tags (`shortcut`) like any item.
- [ ] **Step 5: Run** `npx vitest run src/components/LiquidEditor` — PASS.
- [ ] **Step 6: Commit** `feat(liquid-editor): nested sub-menus for dotted variables (#750)`

### Task 5: `DropdownMenu.Item` `textValue` (typeahead for rich items)

**Files:**
- Modify: `src/components/DropdownMenu/Item.tsx`, `DropdownMenu.test.tsx`, `docs/components/DropdownMenu.md`
- Modify: `InsertVariableMenu.tsx`, `InsertTagMenu.tsx` (pass `textValue`)

**Interfaces:**
- Produces: `textValue?: string` on `DropdownMenuItemProps` — JSDoc: "Typeahead match string when `children` isn't a plain string. Defaults to `children` when it is a string." Registration label = `textValue ?? (typeof children === 'string' ? children : '')`.

- [ ] **Step 1: Failing test** in `DropdownMenu.test.tsx`: an item with `textValue="Banana"` and children `<span>Banana</span>`; open menu, type `b` → that item is active (`aria-activedescendant`/focus, matching how existing typeahead tests assert).
- [ ] **Step 2: Failing test** in `LiquidEditor.test.tsx`: open Insert variable, type `l` → `Last name` item is active.
- [ ] **Step 3: Implement**; pass `textValue={v.label || v.code}` (variables) and `textValue={s.label}` (tags).
- [ ] **Step 4: Run** `npx vitest run src/components/DropdownMenu src/components/LiquidEditor` — PASS.
- [ ] **Step 5: Commit** `feat(dropdown-menu): textValue for typeahead on rich items (#750)`

### Task 6: Docs + demo

**Files:**
- Modify: `docs/components/LiquidEditor.md` (sections: Insert tag menu + `tags`, `{%` autocomplete, nested variables; anti-pattern: "don't add loop tags via `toolbarActions`"), then `npm run build:docs` from `packages/design-system`
- Modify: `AI-PRIMER.md` LiquidEditor line only if the H1 summary changed
- Modify: `packages/playground/src/pages/components/LiquidEditorDemo.tsx` — add dotted variables (`record.status.{id,name,key}`, `record.assignee.{id,name,email}`, declared `record.status`) and a section showing `tags={['if','unless','case','assign','capture','comment']}` vs a restricted `tags={['if','assign']}`.

- [ ] **Step 1: Edit docs + demo.**
- [ ] **Step 2: Run** from repo root: `make test && make build-lib && make lint && npm run format:check` — all pass; `git status` shows regenerated docs committed.
- [ ] **Step 3: Commit** `docs(liquid-editor): Insert tag, tag autocomplete, nested variables (#749, #750)`
