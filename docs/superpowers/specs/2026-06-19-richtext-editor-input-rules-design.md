# RichTextEditor — Markdown input rules slice (Slice 8) Design

**Status:** authored autonomously (user AFK, delegated "do as you recommend"), ready for plan
**Date:** 2026-06-19
**Component:** `@eocrm/design-system` → `src/components/RichTextEditor/`
**Depends on:** the RichText engine + editor (Slices 1–7, all shipped).

## Goal

**Markdown-style block input rules** — typing a marker + space at the start of a paragraph auto-converts the block, so the editor feels like a modern Markdown-aware editor:

| Type at the start of a paragraph  | Becomes           |
| --------------------------------- | ----------------- |
| `# ` / `## ` / `### `             | Heading 1 / 2 / 3 |
| `- ` / `* ` / `+ `                | Bullet list item  |
| `1. ` / `1) ` (any `N.`/`N)`)     | Ordered list item |
| `> `                              | Blockquote        |
| ` ``` ` (three backticks + space) | Code block        |

The trigger is always the **space**. The marker text is consumed (not left in the block), and the block type changes in one undoable step.

## Non-goals (YAGNI)

- **No inline rules** (`**bold**`/`*italic*`/`` `code` ``/`~~strike~~` auto-format on the closing delimiter) — deferred to a future slice; ⌘B/I/U + the toolbar already cover inline formatting. v1 is block rules only.
- **No conversion of non-paragraph blocks** — a rule only fires when the source block is a `paragraph` (typing `# ` inside a heading/list/quote does nothing surprising).
- **No opt-out prop** — input rules are always on (the expected Markdown-editor behavior). The escape hatch for a literal marker is **Undo** (⌘Z) right after the rule fires, which reverts the conversion.
- **No new public API / no new dependency.**

## Architecture

```
src/components/RichTextEditor/
  inputRules.ts          ← (new) pure: matchBlockRule(...) + applyBlockRule(...)
  inputRules.test.ts     ← (new)
  RichTextEditor.tsx     ← (modify) hook the rules into the beforeinput insertText path
```

**No new public exports.** `inputRules.ts` is internal (in `components/RichTextEditor/`, so no four-file rule). The editor's public API is unchanged.

**Where it hooks — the `beforeinput` insertText path.** When the user types a single space at a collapsed caret in a `paragraph`, and the block text from the block start to the caret equals a marker, the rule fires: `preventDefault`, convert the block, and DON'T insert the space. Otherwise, the existing insert path runs unchanged.

## The pure module (`inputRules.ts`)

```ts
import type { RichDoc, BlockType, Range } from '../RichText/engine/model';

/** The block change a matched rule applies. */
export interface BlockRuleChange {
  type: BlockType;
  level?: 1 | 2 | 3;
  depth?: number;
}
export interface BlockRuleMatch {
  change: BlockRuleChange;
  /** Number of leading marker chars to strip from the block. */
  markerLen: number;
}

/**
 * Match a block input rule. Fires only when `sourceType` is 'paragraph', the
 * `trigger` is a space, and `before` (block start → caret) is exactly a marker.
 * Returns the block change + marker length, or null.
 */
export function matchBlockRule(
  sourceType: BlockType,
  before: string,
  trigger: string,
): BlockRuleMatch | null;

/**
 * Apply a matched rule to the block: strip the marker, set the block type.
 * Returns the `{ doc, selection }` commit payload (caret at the block start).
 */
export function applyBlockRule(
  doc: RichDoc,
  blockId: string,
  match: BlockRuleMatch,
): { doc: RichDoc; selection: Range };
```

**`matchBlockRule` logic** — only `sourceType === 'paragraph'` and `trigger === ' '`; then match `before` against:

- `#`,`##`,`###` → `heading` level 1/2/3 (`####`+ → not matched; only 1–3).
- `-`,`*`,`+` → `bullet_item` depth 0.
- `/^\d+[.)]$/` → `ordered_item` depth 0.
- `>` → `blockquote`.
- ` ``` ` (exactly three backticks) → `code_block`.
- else → null. `markerLen = before.length`.

**`applyBlockRule`** composes existing transforms: `deleteRange(doc, {block start … block start + markerLen})` to strip the marker, then `setBlockType(result.doc, blockId, match.change)` (which cleans up `level`/`depth` per type and lands the caret at offset 0). No new engine transform.

## Editor wiring (`RichTextEditor.tsx`)

In the `beforeinput` handler, in the `insertText` path (after the pending-marks branch, before the generic `applyInput`):

```
if (inputType === 'insertText' && data === ' ' && isCollapsed(range)) {
  const block = blockAt(doc, range.anchor.blockId)
  const before = textFromBlockStartToCaret(block, range.anchor.offset)
  const match = matchBlockRule(block.type, before, ' ')
  if (match) {
    e.preventDefault()
    commit(applyBlockRule(doc, range.anchor.blockId, match), 'other')   // 'other' kind → its own undo step
    return
  }
}
```

- `before` is the block's text from offset 0 to the caret (the existing `selection.ts`/`inlines` helpers give per-block text; compute via `runsText(sliceInlines(block.inlines, 0, caretOffset))` or equivalent).
- The space is consumed (`preventDefault`); the marker is stripped; the block type changes. One `commit` → one undo step (`kind: 'other'`), so ⌘Z reverts the conversion (leaving the marker text, e.g. `#`).
- All non-matching spaces fall through to the existing insert path (zero behavior change when no rule matches).

## Testing

- **`inputRules.test.ts`** (pure): `matchBlockRule` — each marker (`#`/`##`/`###`, `-`/`*`/`+`, `1.`/`2)`, `>`, ` ``` `) → the right change; non-paragraph source → null; non-space trigger → null; non-marker `before` (e.g. `#x`, `text`) → null; `####` → null. `applyBlockRule` — strips the marker and sets the type/level/depth; caret at offset 0; preserves text after the marker (`#foo` → heading `foo`).
- **`RichTextEditor.test.tsx`** (extend, using the existing `mockReadSelection` harness + a synthetic `beforeinput` insertText of `' '`): typing `# ` in a paragraph yields a heading; `- ` yields a bullet list; `> ` yields a blockquote; the space is not inserted; a non-marker space inserts normally; the conversion is one undo step (⌘Z reverts to the marker text).
- **Browser (Playwright, manual):** type `# Title` → heading; `- item` → bullet; `1. item` → ordered; `> quote` → blockquote; ` ``` ` + space → code block; ⌘Z right after a rule reverts the conversion; typing a space mid-word does nothing.

## Packaging (CLAUDE.md core invariant)

- **No new public API** — `inputRules.ts` internal; editor props unchanged; nothing added to `src/index.ts`.
- **No manifest drift** — no new component; the editor composes no new design-system component.
- **`structure.test.ts`** unaffected (internal module in `components/RichTextEditor/`).
- **Demo:** the existing editors gain input rules for free — add a one-line note to the "Editable with toolbar" demo description ("type `# `, `- `, `> `, etc. to auto-format").
- **JSDoc:** add input rules to the `RichTextEditor` description + an `@remarks` note that ⌘Z reverts an auto-format.
- **AGENTS.md:** add an "Input rules" note to the `<RichTextEditor>` section.
- **i18n:** none (no new user-facing strings).

## Risks / decisions (resolved, autonomously)

- **Undo of an auto-format:** one `commit` (kind `'other'`) → one undo step. ⌘Z reverts to the stripped marker text (e.g. `#`), not `# ` (the consumed space isn't restored) — acceptable; documented. This is the standard "Undo as the literal-text escape hatch."
- **Paragraph-only source:** keeps conversions predictable (no `# ` reinterpreting an existing list item).
- **Space-triggered code fence** (` ``` ` + space) rather than firing on the 3rd backtick — less aggressive, consistent with the other rules, and lets the user type `` ` `` / ` ` `` without an accidental conversion.
- **No new transform:** `applyBlockRule` composes `deleteRange` + `setBlockType`.
