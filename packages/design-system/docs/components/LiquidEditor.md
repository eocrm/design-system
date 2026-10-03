# `<LiquidEditor>` — Liquid template editor

Liquid template editor: syntax highlighting, line-number gutter, variable-insert menu, caret autocomplete, client-side unknown-variable flagging, and a controlled preview pane. Controlled only (`value` + `onChange`). It never parses or renders Liquid — backend syntax errors arrive via `invalid`/`error`; the rendered preview arrives via `preview`/`previewStatus`.

```tsx
const VARS = [
  { code: 'first_name', label: 'First name', type: 'text', group: 'Built-in' },
  { code: 'last_name', label: 'Last name', type: 'text', group: 'Built-in' },
];

<LiquidEditor value={formula} onChange={setFormula} variables={VARS} />;
```

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

When NOT to use: plain prose → `Textarea`; static read-only code → playground `CodeBlock`. Don't expect it to validate syntax (feed `error` from the backend) or to produce its own preview (preview is consumer-rendered).
