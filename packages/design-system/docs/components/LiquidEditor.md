# `<LiquidEditor>` — Liquid template editor

Liquid template editor: syntax highlighting, line-number gutter, variable-insert menu, tag-insert menu (`if`/`case`/`assign`… snippets), caret autocomplete, client-side unknown-variable flagging, and a controlled preview pane. Controlled only (`value` + `onChange`). It never parses or renders Liquid — backend syntax errors arrive via `invalid`/`error`; the rendered preview arrives via `preview`/`previewStatus`.

```tsx
const VARS = [
  { code: 'first_name', label: 'First name', type: 'text', group: 'Built-in' },
  { code: 'last_name', label: 'Last name', type: 'text', group: 'Built-in' },
];

<LiquidEditor value={formula} onChange={setFormula} variables={VARS} />;
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `string` | yes | Controlled template source. |
| `onChange` | `(value: string) => void` | yes | Fires on every edit (typing, paste, variable insert, autocomplete accept). |
| `variables` | `LiquidVariable[]` | no | Available variables → insert menu, autocomplete, unknown flagging. |
| `flagUnknownVariables` | `boolean` | no | Underline `{{ vars }}` not present in `variables`. Default `true` (no-op when `variables` empty). |
| `invalid` | `boolean` | no | External error visual (red border) — set from a backend Liquid syntax error. Default `false`. |
| `error` | `ReactNode` | no | External error message shown in the footer. Pairs with `invalid`. |
| `preview` | `ReactNode` | no | Consumer-rendered preview output. When set (or `previewStatus` ≠ 'idle'), the pane shows. |
| `previewStatus` | `'idle' \| 'loading' \| 'error'` | no | Preview pane chrome. Default `'idle'`. |
| `previewPlacement` | `'bottom' \| 'right'` | no | Preview pane position. Default `'bottom'`. |
| `showLineNumbers` | `boolean` | no | Show the line-number gutter. Default `true`. |
| `showToolbar` | `boolean` | no | Show the toolbar (Insert tag and Insert variable menus). Default `true`. |
| `toolbarActions` | `ReactNode` | no | Custom action buttons rendered in the toolbar, right-aligned just before the "Insert tag" and "Insert variable" buttons (e.g. a Docs / Help link). Pass `<Button size="sm">` elements (or a fragment of them); a `ghost` variant pairs well next to the bordered "Insert variable" button. Only renders when `showToolbar` is true. |
| `tags` | `LiquidTag[]` | no | Liquid tags offered by the "Insert tag" toolbar menu (and `{%` autocomplete). Default: all six (`if`, `unless`, `case`, `assign`, `capture`, `comment`). `[]` hides the menu and disables `{%` autocomplete. Loop tags (`for`) are never offered. |
| `filters` | `string[]` | no | Filter names offered in autocomplete after `\|`. Defaults to a common Liquid set. |
| `minRows` | `number` | no | Minimum visible rows. Default `4`. |
| `maxRows` | `number` | no | Maximum visible rows before the editor scrolls internally. Default unbounded. |
| `readOnly` | `boolean` | no | Read-only: caret + selection allowed, no edits. Default `false`. |
| `disabled` | `boolean` | no | Disabled: non-interactive + dimmed. Default `false`. |
| `id` | `string` | no | Optional id forwarded to the textarea (for `<Field>` / label association). |
| `name` | `string` | no | Optional name forwarded to the textarea. |
| `placeholder` | `string` | no | Placeholder shown when empty. |
| `aria-label` | `string` | no | Accessible label (defaults to the i18n `liquidEditor.editorLabel` when omitted OR empty — an empty string is not an explicit name). |
| `aria-labelledby` | `string` | no | Id of an external label element. |
| `aria-describedby` | `string` | no | Id(s) of external description element(s). Merged with the component's own footer description (the `error` / unknown-variable message), so a screen reader announces both. You usually don't need this — the footer is wired automatically; pass it only to add an extra external description. |
| `className` | `string` | no | Extra class on the root wrapper. |

<!-- props:end -->

**Toolbar:** the right-aligned "Insert variable" dropdown is a bordered `secondary` `sm` button. Pass `toolbarActions` (a `ReactNode`, e.g. `<Button variant="ghost" size="sm">…</Button>` for a Docs/Help link) to add extra buttons right-aligned just before it. Hidden when `showToolbar={false}`.

**Gutter:** `showLineNumbers={false}` hides the line-number gutter (default `true`) — right for single-line formula inputs and dense forms; combine with `showToolbar={false}` for the most minimal chrome.

**Grouped/dotted palettes (`group`, `description`, `collection`):** each `variables` entry can carry a `group` (a section label in the insert menu, first-seen order — ungrouped entries render unlabeled), a `description` (a muted second line in the insert menu and autocomplete list, and — when the caret sits inside that exact reference — the footer, as `label — description`), and `collection: true` (an autocomplete/menu "list" tag; inserting it drops a `{% for item in code %}{{ item }}{% endfor %}` snippet with the caret left after `{{ item }}`, instead of `{{ code }}`). Unknown-variable flagging matches on the dotted `code` **root** (a variable coded `event.type` still validates inside `event.type.sub` — nested-field codes don't false-flag as unknown); autocomplete prefix-matches the full dotted `code` (typing `ev` or `event.t` suggests `event.type`).

```tsx
const VARS = [
  {
    code: 'event.type',
    label: 'Event type',
    group: 'Event',
    description: 'The journal event type',
  },
  {
    code: 'record.associations',
    label: 'Associations',
    group: 'Record',
    collection: true,
    description: "The record's links — iterate with for",
  },
];

<LiquidEditor value={tpl} onChange={setTpl} variables={VARS} />;
```

**Insert tag menu + `tags`:** next to "Insert variable" the toolbar shows an "Insert tag" menu: `if`, `if … else`, `if … elsif … else`, `unless`, `case`, `assign`, `capture`, `comment`. Choosing one inserts the full block with the caret in the condition/name slot; a non-empty selection becomes the block body. `tags` filters which tags are offered (`'if' | 'unless' | 'case' | 'assign' | 'capture' | 'comment'`, default all six); `tags={[]}` hides the menu and disables `{%` autocomplete. Loop tags are never offered — a `collection` variable already inserts a `for` loop from "Insert variable".

```tsx
<LiquidEditor value={tpl} onChange={setTpl} variables={VARS} tags={['if', 'assign']} />
```

**`{%` tag autocomplete:** typing `{%` suggests the allowed tags (first word only); accepting expands the full snippet, consuming a `%}` right after the caret and keeping a `{%-` dash. It does not open inside an already-complete tag such as `{% if x %}`.

**Nested variables:** dotted codes (`record.status.name`) render in "Insert variable" as nested sub-menus (`record › status › name`) within their group. A declared parent (`record.status` declared alongside `record.status.name`) is the first item inside its own sub-menu. Autocomplete still prefix-matches the full dotted code. A dotted root whose variables sit in different `group`s appears under each group.

When NOT to use: plain prose → `Textarea`; static read-only code → playground `CodeBlock`. Don't expect it to validate syntax (feed `error` from the backend) or to produce its own preview (preview is consumer-rendered).

Inside a `<Field>`, the label is associated automatically (`id` / `aria-labelledby`):

```tsx
<Field label="Formula">
  <LiquidEditor value={formula} onChange={setFormula} variables={VARS} />
</Field>
```

- ❌ Adding `margin`/positioning hoping the editor self-places — that is the parent's job (`<Stack>` / `<Cluster>` / a wrapper `className`).
- ❌ Building a tag inserter via `toolbarActions` — the editor exposes no caret API; use the built-in "Insert tag" menu and `tags`.
- ❌ Passing `'for'` (or other loop tags) in `tags` to offer loops — unsupported; mark the variable `collection: true` instead.
