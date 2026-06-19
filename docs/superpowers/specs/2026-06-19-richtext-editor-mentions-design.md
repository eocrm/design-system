# RichTextEditor — Mentions slice (Slice 9) Design

**Status:** authored autonomously (user AFK, delegated "do as you recommend"), design approved, ready for plan
**Date:** 2026-06-19
**Component:** `@eocrm/design-system` → `src/components/RichText/` + `src/components/RichTextEditor/`
**Depends on:** the RichText engine + editor (Slices 1–8, all shipped).

## Goal

**Opt-in `@`-mention autocomplete** for `<RichTextEditor>`. When the consumer passes a `mentions` prop, typing the trigger (default `@`) after whitespace or at block start opens a floating combobox of consumer-supplied candidates; ↑/↓ + Enter/Tab picks one; picking inserts a styled, atomic-feeling **mention chip** carrying a stable `id`. Mentions survive an HTML round-trip; Markdown export is lossy (plain `@label`). With **no `mentions` prop, there is zero behavior change** — the feature stays off the hot path.

| Action                               | Result                                                           |
| ------------------------------------ | ---------------------------------------------------------------- |
| Type `@` at start / after whitespace | Menu opens; `onQuery('')` runs                                   |
| Keep typing (`@al`)                  | `onQuery('al')` runs (stale async dropped via a request token)   |
| ↑ / ↓                                | Move the active item                                             |
| Enter / Tab                          | Insert the active item's chip + a trailing space; close the menu |
| Escape / blur / caret leaves context | Close the menu, insert nothing                                   |
| Backspace adjacent to a chip         | Delete the **whole** chip in one undo step                       |

## Non-goals (YAGNI)

- **No multiple trigger types** (`@` for people + `#` for records) — single configurable trigger in v1; multi-trigger is a follow-up.
- **No navigable/clickable chips** — v1 chips are inert styled spans. The `id` is exposed via serialization (`data-mention-id`) and the model, so a consumer can act on it out-of-band; no `onClick`/`href` on the chip itself.
- **No mention preservation through Markdown** — `toMarkdown` is lossy (plain `@label`), like underline. HTML + the model are the mention-preserving formats.
- **No menu grouping/sections, no `renderItem`** — structured fields (`label` / `description` / `avatarUrl`) render a consistent on-brand row; the consumer does not own row markup.
- **No inline editing of a chip's label** — chips are atomic; to change one, delete it and re-add.
- **No new design-system component** — the menu is internal to `RichTextEditor` (no manifest entry, no overview-grid card, no standalone demo page).

## Architecture

```
src/components/RichText/engine/
  model.ts            ← (modify) add `mention` to the Mark union + MarkType
  renderDoc.tsx       ← (modify) wrapMark `mention` case + MARK_ORDER
  transforms.ts       ← (modify) insertMention() + deleteRange snap-to-mention
  toHtml.ts           ← (modify) serialize a mention mark
  fromHtml.ts         ← (modify) parse `<span data-mention-id>` back to a mention mark
  toMarkdown.ts       ← (modify) mention → run text (lossy, documented)
src/components/RichText/
  _prose.scss         ← (modify) one `:where([data-mention])` chip rule (tokens only)

src/components/RichTextEditor/
  mentionContext.ts       ← (new, pure) getMentionContext(blockText, caretOffset, trigger)
  mentionContext.test.ts  ← (new)
  useMention.ts           ← (new) menu state: context detect, async query w/ request token, anchor rect
  useMention.test.tsx     ← (new)
  RichTextMentionMenu.tsx ← (new) floating role="listbox" of MentionItem rows (portal + floating-ui)
  RichTextMentionMenu.test.tsx ← (new)
  RichTextEditor.tsx      ← (modify) wire menu render, key handling, insertion, atomicity
```

The pure layer (`render*`/`to*`/`from*`/`transforms`) never sees the `mentions` config or the trigger — the trigger is baked into the mention run's text, so those functions stay trigger-agnostic. The `mentions` config lives only in the editor + its hook/menu.

**Reuse vs. fork the menu:** LiquidEditor has an `AutocompleteMenu`, but it is internal to `components/LiquidEditor/`; importing it across component boundaries couples the two. `RichTextLinkEditor` already establishes the portal + floating-ui virtual-element pattern _inside this folder_, so `RichTextMentionMenu` is modeled on it (a listbox variant) rather than reaching into LiquidEditor. Unifying the two floating menus into a shared primitive is a possible later refactor, explicitly out of scope here.

## Public API (`src/index.ts`, fully JSDoc'd — Rule 7)

```ts
/** One mentionable candidate returned by `MentionsConfig.onQuery`. */
export interface MentionItem {
  /** Stable id stored on the mention mark and emitted in serialization (`data-mention-id`). */
  id: string;
  /** Display text — becomes the chip's visible text (without the trigger). */
  label: string;
  /** Optional secondary line in the menu row (e.g. an email). Menu-only; not stored. */
  description?: string;
  /** Optional avatar shown in the menu row. Menu-only; not stored. */
  avatarUrl?: string;
}

/** Enables `@`-mention autocomplete on `<RichTextEditor>`. Omit to disable mentions entirely. */
export interface MentionsConfig {
  /**
   * Resolve candidates for the text typed after the trigger. Called as the user
   * types; may be sync or async. The editor drops stale async resolutions, so a
   * slow promise that resolves after the query moved on is ignored.
   */
  onQuery: (query: string) => MentionItem[] | Promise<MentionItem[]>;
  /** Trigger character that opens the menu. Default `'@'`. */
  trigger?: string;
}
```

`RichTextEditor` gains `mentions?: MentionsConfig`. Both interfaces are exported from `index.ts` with `export type`.

## Model (`engine/model.ts`)

Add one variant to the `Mark` union (parallel to `link`) and the `MarkType` union:

```ts
export type MarkType = 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'link' | 'mention';

export type Mark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'underline' }
  | { type: 'strike' }
  | { type: 'code' }
  | { type: 'link'; href: string }
  | { type: 'mention'; id: string; label: string };
```

A mention is a `mention` mark applied to a run whose **`text` is `${trigger}${label}`** (e.g. `"@Alice Smith"`). The mark carries the canonical `id` and `label` (label = the name **without** the trigger). Storing the trigger in the run text keeps `renderDoc`/`toHtml`/`toMarkdown` trigger-agnostic; the atomicity rules below keep the run text and `label` from drifting.

## Atomicity (editor behavior)

A mark is not a true atomic node, so the editor enforces chip-like behavior:

1. **Backspace/Delete adjacent to a chip deletes the whole chip** in one undo step — when a collapsed caret sits at the boundary of a mention run and the user deletes toward it, remove the entire run (not one character).
2. **`deleteRange` snaps an endpoint that lands inside a mention run to that run's boundary** — a range delete never bisects a chip into a half-mention (which would leave a `mention` mark on the wrong text). This is the single safety rule that makes partial-overlap selections safe.
3. **Typing never extends a mention mark** — `'mention'` is excluded from mark continuation (the pending/active mark set never carries it), so text typed immediately after a chip is unmarked.

## Autocomplete flow

### `mentionContext.ts` (pure)

```ts
export interface MentionContext {
  /** Text typed after the trigger, up to the caret (may be ''). */
  query: string;
  /** Offset of the trigger char within the block text. */
  triggerOffset: number;
}

/**
 * Detect an open mention context at a collapsed caret. Returns a context only
 * when the nearest `trigger` before the caret is at block start or preceded by
 * whitespace, and no whitespace sits between it and the caret. Otherwise null.
 */
export function getMentionContext(
  blockText: string,
  caretOffset: number,
  trigger: string,
): MentionContext | null;
```

Adapted from LiquidEditor's `getAutocompleteContext`, but operating on a single block's text (from `runsText` / the selection helpers) rather than a flat textarea string. Scans backward from the caret to the nearest `trigger`; rejects if a whitespace char lies between trigger and caret, or if the char before the trigger is a non-whitespace (mid-word `@`).

### `useMention.ts` (hook)

Owns menu state: `{ open, items, activeIndex, query, anchorRect }`. Responsibilities:

- After each caret/content change (driven by the editor's existing `readSelection` + `commit` cycle), recompute `getMentionContext`. No context → close.
- On a context, call `mentions.onQuery(query)` guarded by a **monotonic request token**: when a resolution arrives, ignore it if a newer query has since been issued (drops stale async).
- Compute `anchorRect` from `getSelection().getRangeAt(0).getBoundingClientRect()` (same technique as the link bubble) so the menu tracks the caret.
- Expose `activeIndex` movement, a `select(index)` that returns the chosen `MentionItem`, and `close()`.
- Reset `activeIndex` to 0 when the item list changes.

### `RichTextMentionMenu.tsx` (presentational)

A floating `role="listbox"` rendered via `createPortal` + a floating-ui virtual element (modeled on `RichTextLinkEditor`: `strategy: 'fixed'`, `offset/flip/shift`, `autoUpdate`). Each row is `role="option"` with a stable id, rendering optional `<Avatar>` (from `avatarUrl`) + bold `label` + muted `description`. Shows an i18n empty-state row ("No matches") when `items` is empty but a context is open. The editor wires combobox ARIA on the editable element: `aria-expanded`, `aria-controls` (the listbox id), and `aria-activedescendant` (the active option id).

### Editor key handling (`RichTextEditor.tsx`)

When the menu is open, a guard near the top of `onKeyDown` (after the existing modifier branches — undo/redo/⌘K — so those still win, but before default text handling) intercepts:

- **ArrowDown/ArrowUp** → move `activeIndex`, `preventDefault`.
- **Enter / Tab** → insert the active item (below), `preventDefault`.
- **Escape** → `close()`, `preventDefault` + `stopPropagation` (don't bubble to a Drawer/Modal).

All other keys fall through to the normal editor path (which keeps the menu's query current via the context recompute). The menu also closes on blur.

### Insertion (`insertMention` in `transforms.ts`)

```ts
/**
 * Replace the trigger+query span [triggerOffset .. caret] in `block` with a
 * mention chip run (`text: trigger+item.label`, mark `{type:'mention', id, label}`)
 * followed by a single trailing space run. Returns the commit payload with the
 * caret placed after the trailing space.
 */
export function insertMention(
  doc: RichDoc,
  blockId: string,
  range: { from: number; to: number }, // block-relative offsets: trigger start .. caret
  trigger: string,
  item: MentionItem,
): { doc: RichDoc; selection: Range };
```

Composes `deleteRange` (to strip the typed `trigger+query`) + an inline-insert of the chip run and a `" "` run. Committed once with `kind: 'other'` → a single undo step (⌘Z reverts the whole insertion).

## Rendering & styling

`wrapMark` gains a `mention` case and `'mention'` joins `MARK_ORDER` as the outermost entry (like `link`):

```tsx
case 'mention':
  return (
    <span
      data-mention
      data-mention-id={mark.type === 'mention' ? mark.id : undefined}
      data-mention-label={mark.type === 'mention' ? mark.label : undefined}
    >
      {child}
    </span>
  );
```

`MARK_ORDER = ['mention', 'link', 'bold', 'italic', 'underline', 'strike', 'code']`. No `className` — consistent with every other mark being a bare semantic tag styled by `_prose.scss`. One rule is added to the `prose()` mixin so read-only `<RichText>` and `<RichTextEditor>` render the chip identically:

```scss
:where([data-mention]) {
  padding: 0 var(--space-1);
  border-radius: var(--radius-sm);
  background: var(--color-bg-accent-subtle);
  color: var(--color-accent);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}
```

(Tokens only — Rule 3. If `--color-bg-accent-subtle` or `--font-weight-medium` is absent from `tokens.scss`, add it there first.)

## Serialization

- **toHtml** — a `mention` mark serializes to `<span data-mention-id="ID" data-mention-label="LABEL">@Label</span>` (id/label via `escapeAttr`, text via `escapeHtml`). The mention is the outermost wrapper, mirroring `MARK_ORDER`.
- **fromHtml** — in the existing inert-DOM allowlist walk, a `<span>` carrying a non-empty `data-mention-id` becomes a run with the span's text and a `{type:'mention', id, label}` mark (`label` from `data-mention-label`, else the text with a leading trigger stripped). A `data-mention-id` that is empty/missing → treat as a plain `<span>` (defensive). Foreign-content/namespace guard unchanged.
- **toMarkdown** — lossy: emit the run text (`@Alice Smith`) as escaped plain text. Documented alongside the existing underline-is-dropped note. No `mention:`-scheme link encoding.
- **fromMarkdown** — unchanged; Markdown has no mention syntax, so `@Alice` stays plain text (round-trip through MD does not preserve mentions, by design).

## i18n (Rule 9)

Add to `src/i18n/messages.ts` + both `en.ts` and `ru.ts`:

- `richTextEditor.mentionsEmpty` — menu empty-state ("No matches" / "Нет совпадений").
- `richTextEditor.mentionsLabel` — listbox `aria-label` ("Mentions" / "Упоминания").

## Testing

**Pure**

- `mentionContext.test.ts` — trigger at start and after whitespace → context with the right `query`/`triggerOffset`; mid-word trigger (preceded by a non-space) → null; a space between trigger and caret → null; the nearest valid trigger is chosen when several precede the caret; a non-default trigger is honored.
- `transforms.test.ts` — `insertMention` strips `trigger+query`, inserts the chip run + trailing space, caret after the space, mark carries `{id,label}`; `deleteRange` snaps an endpoint inside a mention run to its boundary (no half-mention survives).
- `renderDoc.test.tsx` — a `mention` mark renders `<span data-mention data-mention-id data-mention-label>` with the visible `@label` text; mention is outermost when combined with other marks.
- serialization — `fromHtml(toHtml(docWithMention))` reproduces the mention mark (id + label preserved); a `data-mention-id` span with foreign-content siblings still drops the foreign content; `toMarkdown` → plain `@label`; an empty `data-mention-id` imports as plain text.

**Editor (`RichTextEditor.test.tsx`, extend, using the existing `mockReadSelection` harness)**

- Typing `@al` with a mocked `onQuery` opens the menu with the resolved items; Enter inserts the chip + trailing space; Backspace adjacent to a chip removes the whole chip in one step; Escape closes the menu and inserts nothing; ↑/↓ move the active item; **no `mentions` prop → the menu never opens** and typing `@` is literal.

**Browser (Playwright, manual)**

- Type `@`, see the menu; ↓ then Enter inserts a chip; caret lands after the trailing space; Backspace removes the whole chip; ⌘Z reverts the insertion in one step; a stale slow `onQuery` does not clobber a newer result.

## Packaging (CLAUDE.md core invariant)

- **Public API** — `MentionItem`, `MentionsConfig`, and the `mentions` prop exported from `src/index.ts` with full JSDoc.
- **No new component** — the menu is internal; **no** manifest entry (`_meta/manifest.ts` + `generate-manifest.mjs` untouched), no overview-grid card, no new demo page.
- **Demo** — extend the existing `packages/playground/src/pages/components/RichTextEditorDemo.tsx` with a mock-CRM `onQuery` (a small static user list filtered by query, async via `Promise.resolve`) so the team can exercise mentions.
- **JSDoc `@remarks` anti-patterns** — mentions are not for inserting static links (use the link tool), chips are not navigable, and `onQuery` should filter server-side for large lists rather than returning thousands of items.
- **AGENTS.md** — add a "Mentions" note to the `<RichTextEditor>` section (enable via `mentions={{ onQuery }}`; chips carry an id; lossy in Markdown).
- **`structure.test.ts`** — unaffected (new modules live inside `components/RichTextEditor/` and `RichText/engine/`).

## Risks / decisions (resolved)

- **Mark, not atomic node** — chosen for a minimal, well-scoped model change consistent with `link`. Atomicity is layered on in the editor (whole-chip Backspace + `deleteRange` boundary snap + no mark continuation) rather than by extending the core `Inline` type.
- **Trigger baked into run text** — keeps the pure render/serialize layer trigger-agnostic; the configurable trigger lives only in the editor.
- **Markdown is lossy** — accepted; HTML + model preserve mentions. Documented like underline.
- **Menu not shared with LiquidEditor** — `RichTextMentionMenu` is folder-local (modeled on `RichTextLinkEditor`) to avoid cross-component coupling; unification is a possible later refactor.
- **Async staleness** — a monotonic request token in `useMention` drops out-of-order `onQuery` resolutions.
