# LiquidEditor — Design

**Date:** 2026-06-17
**Status:** Approved (brainstorming)
**Package:** `@eocrm/design-system`

## Goal

A `<LiquidEditor>` primitive for authoring **Liquid template strings** with the affordances of a real code editor: syntax highlighting, a line-number gutter, a grouped variable-insert menu, caret autocomplete, client-side unknown-variable flagging, and a controlled live-preview pane.

The driving consumer is eocrm's custom-field editing UI (`FieldDrawer`), which today edits Liquid formulas (`config.formula`, `config.visible_when`, `config.required_when`, `config.auto_set.formula`) as a plain `<Textarea>` plus a static "available variables" hint. `LiquidEditor` replaces that with a purpose-built control. The component itself is generic over "a list of available variables" and knows nothing about custom fields.

## Scope decisions (from brainstorming)

- **Tier C (full editor):** highlighting + line numbers + autocomplete + variable picker + preview pane. (Not the cheaper "smart textarea" or "highlighted-only" tiers.)
- **Liquid-specific name:** `LiquidEditor`. Liquid is the only template language eocrm uses; no generic `TemplateEditor`/`CodeEditor` abstraction.
- **Preview = controlled content + status.** The consumer produces the rendered output (in eocrm, a debounced backend `evaluate` call) and passes it in. The component owns only the pane layout and loading/error chrome — it never runs Liquid.
- **Validation = client-side unknown-variable flagging**, against the provided `variables` list, PLUS an external `error`/`invalid` surface for backend Liquid **syntax** errors. The component has no Liquid parser.
- **Preview placement default `bottom`** (the FieldDrawer is a narrow drawer); `right` supported.
- **Toolbar minimal:** the variable-insert menu + a preview show/hide toggle. Nothing else.
- **Filter autocomplete ships** with a default common-Liquid-filter set, overridable via `filters`.

## Rendering architecture — overlay technique

A code editor must paint a styled, colored layer beneath a live text caret. We hand-roll it (CodeMirror/Monaco are banned by the dependency policy; Prism is playground-only):

- A transparent, native `<textarea>` is layered **exactly on top** of a `<pre>` (the "highlight layer") that re-renders the same text as colored `<span>`s. The two share identical font, padding, line-height, and word-wrap so glyphs align 1:1. Scroll is mirrored (`onScroll` → set the `<pre>`'s scroll offset; the gutter follows the same offset).
- The textarea keeps the **real** caret, selection, IME composition, mobile keyboards, undo stack, and screen-reader semantics. The `<pre>` and gutter are `aria-hidden`. This is the react-simple-code-editor approach.
- **`contentEditable` is rejected:** one-layer highlight is tempting but contentEditable is an a11y/IME/selection minefield that fights React's controlled model.

**Autocomplete positioning:** the menu anchors to the **caret**, not an element. We measure caret coordinates with a hidden "mirror" `<div>` that duplicates the textarea's text up to the caret and reads the trailing marker's offset (standard textarea-caret-position technique), then position the floating menu with `@floating-ui/react-dom` (an already-allowed dependency). This is the single most complex piece; everything else is mechanical.

## Liquid tokenizer

A small, self-contained, regex/scan-based tokenizer (no dependency) that classifies, in order:

- **Output** `{{ … }}` and **tag** `{% … %}` delimiters and their interiors.
- Inside those: **identifiers** (variables), **filters** after `|`, **string literals** (`"…"` / `'…'`), **numbers**, and **keywords** (`if`, `unless`, `for`, `in`, `and`, `or`, `else`, `endif`, …) for tag bodies.
- **Plain text** outside `{{ }}`/`{% %}` is left uncolored.

Each token maps to a CSS class backed by a component token (see Theming). The tokenizer is a pure `string → Token[]` function so it can be unit-tested directly and reused by both the highlight layer and the unknown-variable check.

**Unknown-variable flagging:** a variable identifier in an output/tag whose name is not in `variables` (and not a tag keyword/filter) gets an `unknown` class (wavy red underline) when `flagUnknownVariables` is true. This is presentation only — it does not set `invalid` or block input. If `variables` is empty/undefined, nothing is flagged (we can't know what's valid).

## Public API

```ts
export interface LiquidVariable {
  /** Token inserted and matched, e.g. "first_name" → referenced as {{ first_name }}. */
  code: string;
  /** Human label shown in the picker + autocomplete. Defaults to `code`. */
  label?: string;
  /** Optional type hint rendered as a muted tag in suggestions, e.g. "text" | "date". */
  type?: string;
  /** Optional group header that sections the picker + autocomplete, e.g. "Custom fields" | "Built-in". */
  group?: string;
}

export interface LiquidEditorProps {
  /** Controlled template source. */
  value: string;
  /** Fires on every edit (typing, paste, variable insert, autocomplete accept). */
  onChange: (value: string) => void;

  /** Available variables → the insert menu, autocomplete suggestions, and unknown-variable flagging. */
  variables?: LiquidVariable[];

  /** Underline `{{ vars }}` not present in `variables`. Default `true` (no-op when `variables` is empty). */
  flagUnknownVariables?: boolean;
  /** External error visual (red border) — set from a backend Liquid syntax error. Default `false`. */
  invalid?: boolean;
  /** External error message shown in the footer. Pairs with `invalid`. */
  error?: ReactNode;

  /** Consumer-rendered preview output. When provided (or `previewStatus` ≠ 'idle'), the preview pane shows. */
  preview?: ReactNode;
  /** Drives the preview pane chrome. Default `'idle'`. */
  previewStatus?: 'idle' | 'loading' | 'error';
  /** Preview pane position relative to the editor. Default `'bottom'`. */
  previewPlacement?: 'bottom' | 'right';

  /** Show the line-number gutter. Default `true`. */
  showLineNumbers?: boolean;
  /** Show the toolbar (variable-insert menu + preview toggle). Default `true`. */
  showToolbar?: boolean;
  /** Filter names offered in autocomplete after `|`. Defaults to a common Liquid set. */
  filters?: string[];

  /** Minimum visible rows. Default `4`. */
  minRows?: number;
  /** Maximum visible rows before the editor scrolls internally. Default unbounded. */
  maxRows?: number;

  /** Read-only: caret + selection allowed, no edits. Default `false`. */
  readOnly?: boolean;
  /** Disabled: non-interactive + dimmed. Default `false`. */
  disabled?: boolean;

  // Passthrough: id, name, placeholder, aria-* (e.g. aria-label / aria-labelledby), className.
}
```

`ref` forwards to the underlying `<textarea>` (so consumers can focus it / integrate with `<Field>`). Spread order follows the "semantic ARIA preserved" pattern (props first, component-owned `role`/`aria-*`/className last) — see CLAUDE.md Rule 7.

### Default filter set

`filters` defaults to a small, common Liquid list: `upcase`, `downcase`, `capitalize`, `strip`, `truncate`, `truncatewords`, `default`, `date`, `replace`, `append`, `prepend`, `size`, `first`, `last`, `join`, `escape`. Highlighting treats **any** identifier after `|` as a filter; the list only powers autocomplete.

## Behavior

### Variable-insert menu (toolbar)
A button opening a grouped menu of `variables` (sectioned by `group`, label + `type` tag per row). Selecting one inserts `{{ code }}` at the caret (replacing any selection), moves the caret inside/after the inserted token, and fires `onChange`. Built on the existing `DropdownMenu` primitive.

### Autocomplete (combobox)
While the caret is inside an output `{{ … }}` or tag `{% … %}`:
- Typing an identifier prefix opens a listbox of matching `variables` (grouped), filtered by prefix on `code`/`label`.
- Immediately after a `|`, it offers `filters` instead.
- `↑`/`↓` move the active option, `Enter`/`Tab` accept (insert the completion), `Esc` closes the menu (and is swallowed so it doesn't bubble to a Drawer/Modal close). Typing a non-identifier char or moving the caret out closes it.
- ARIA combobox wiring: the textarea gets `role`/`aria-expanded`/`aria-controls`/`aria-activedescendant`; the menu is a `listbox` with `option`s. The menu is the only place `Tab` is intercepted — otherwise `Tab` moves focus normally (no focus trap).

### Preview pane
Renders when `preview` is set or `previewStatus` ≠ `'idle'`. `loading` → a muted "Rendering…" state (optionally over the last preview); `error` → an error-toned pane; otherwise the `preview` node. Collapsible via the toolbar preview toggle. `previewPlacement='right'` splits editor | preview side by side; `'bottom'` stacks (default).

### States
- `readOnly` — textarea `readOnly`, toolbar insert disabled, autocomplete off, highlighting + preview still render.
- `disabled` — textarea `disabled`, dimmed, all interaction off.
- `invalid` — red border + the `error` footer; independent of client unknown-variable flags (both can show).

## Theming (component tokens)

`LiquidEditor.tokens.scss` defines tokens defaulting to existing semantic primitives, so dark theme works with no extra work and consumers can rebrand:

- `--liquid-editor-bg`, `--liquid-editor-border`, `--liquid-editor-gutter-bg`, `--liquid-editor-gutter-fg`
- `--liquid-editor-token-variable`, `--liquid-editor-token-variable-bg`
- `--liquid-editor-token-tag`, `--liquid-editor-token-filter`, `--liquid-editor-token-string`, `--liquid-editor-token-number`, `--liquid-editor-token-keyword`
- `--liquid-editor-token-unknown` (+ underline color)
- `--liquid-editor-preview-bg`, `--liquid-editor-preview-fg`

No raw values in the `.module.scss` (CLAUDE.md Rule 3). No layout/margin/positioning that belongs to a parent (Rule 4) — the editor sizes to `100%` width of its container and grows by rows.

## i18n

New keys in `src/i18n/messages.ts` + `en.ts` + `ru.ts`:

- `liquidEditor.insertVariable` — toolbar menu label
- `liquidEditor.preview` — preview pane label + toggle
- `liquidEditor.previewRendering` — loading text
- `liquidEditor.previewError` — error text
- `liquidEditor.unknownVariable` — unknown-variable footer warning (interpolates the name)
- `liquidEditor.noVariables` — empty state for the insert menu / autocomplete
- `liquidEditor.editorLabel` — default `aria-label` when none supplied

## Files

```
packages/design-system/src/components/LiquidEditor/
  LiquidEditor.tsx           ← forwardRef, full JSDoc (Rule 7)
  LiquidEditor.module.scss   ← tokens only, no layout
  LiquidEditor.tokens.scss   ← component tokens → primitives
  liquidTokenizer.ts         ← pure string → Token[] (highlight + unknown check)
  liquidTokenizer.test.tsx   ← tokenizer unit tests
  caretCoordinates.ts        ← textarea caret → {top,left} via mirror div
  LiquidEditor.test.tsx      ← component unit tests (Rule 1)
  index.ts                   ← export component + types
```

Plus the cross-package completion checklist (repo CLAUDE.md "Core invariant"):
- `src/index.ts` re-export (Rule 5)
- `packages/playground/src/pages/demo/LiquidEditorDemo.tsx` + wire into `App.tsx`, `AppShell.tsx`, `DemoIndex.tsx`
- `_meta/manifest.ts` CLUSTERS entry + `generate-manifest.mjs`, then `npm run build:manifest`
- AGENTS.md TL;DR section + "when NOT to use" `@remarks` in the component JSDoc

## Testing

- **`liquidTokenizer`**: output/tag/filter/string/number/keyword classification; nested filters; unterminated `{{`; plain text passthrough; unknown vs known variable given a list.
- **`caretCoordinates`**: returns a plausible offset for a given caret index (jsdom-tolerant; degrade gracefully like Textarea's measurement does).
- **`LiquidEditor`**: renders default; controlled `value`/`onChange` round-trip; variable-insert inserts `{{ code }}` at caret; autocomplete opens inside `{{ }}`, filters by prefix, accepts on Enter, closes on Esc without bubbling; unknown-variable class applied/omitted per `flagUnknownVariables` + `variables`; `invalid`/`error` footer; preview pane per `previewStatus` and `previewPlacement`; `readOnly`/`disabled`; `ref` forwarded to the `<textarea>`; `className` merged; gutter line count tracks newlines; ARIA combobox attributes present.

## Out of scope (v1)

- Running Liquid in the browser (no parser dep) — syntax correctness comes from the backend via `error`.
- Semantic validation of `{% %}` control-flow logic (we highlight tags, we don't check them).
- Multi-cursor, bracket matching, code folding, find/replace.
- Diff view, version history.

## Anti-patterns (for the JSDoc `@remarks`)

- ❌ Using `LiquidEditor` for plain multi-line prose → use `<Textarea>`.
- ❌ Expecting it to validate Liquid syntax → it doesn't parse; feed `error`/`invalid` from the backend.
- ❌ Producing the preview inside the component → preview is consumer-rendered (`preview` + `previewStatus`).
- ❌ Adding `margin`/positioning in the consumer's hope the component self-places → it's the parent's job (Rule 4).
