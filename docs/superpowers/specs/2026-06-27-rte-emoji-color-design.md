# RichTextEditor: emoji insert + text/highlight color — design

**Status:** approved (design)
**Date:** 2026-06-27

## Goal

Add two toolbar capabilities to `<RichTextEditor>`:

1. **Emoji** — a toolbar button that opens the existing `EmojiPickerPopover` and inserts the chosen emoji at the caret.
2. **Color** — text (foreground) and highlight (background) color as inline marks, chosen from a **curated, token-backed palette**, applied from **two surfaces**: a toolbar color button (popover panel) and the per-block ⠿ menu (a "Color ▸" submenu that colors the whole block).

Both are always present when `toolbar` is on (no new opt-in prop), consistent with the existing always-on marks (bold/italic/link). Color in the ⠿ menu requires `blockControls` (that's where the menu lives).

## Decisions (from brainstorming)

- **Palette, not arbitrary color.** Colors come from a fixed token-backed palette; the mark stores a palette **key** (e.g. `"red"`), never raw hex. Keeps the document theme-able and tokens-only.
- **Popover surfaces = toolbar button + block ⠿ menu.** The toolbar button opens a popover panel; the ⠿ menu gets a "Color ▸" submenu.
- **Text + highlight, each with Clear.**
- **Block ⠿ "Color" applies to the whole block's text** (block-scoped, matching the menu's other actions). The toolbar applies to the current selection.

## Architecture

Color is an **inline mark**, modeled like the existing value-carrying marks (`link` carries `href`; `mention` carries `id`/`label`). Per-span, composes with other marks, round-trips through the doc and serializers. (Rejected: a block-level color attribute — too coarse to color a single word.)

## Slice 1 — Emoji (no engine change)

- **Toolbar** (`RichTextToolbar`): a new smiley button. Clicking opens `EmojiPickerPopover`; `onSelect(emoji)` calls a new editor callback `onInsertEmoji(emoji)`.
- **Editor** (`RichTextEditor`): `onInsertEmoji` runs `insertText(value, caretRange, emoji)` through the existing `commit` path (so it is one undo step; over a non-collapsed selection it replaces). Uses the live selection; if there is no selection in the editor, it is a no-op.
- **i18n:** `richTextEditor.emoji` ("Emoji" / "Эмодзи").
- **Tests:** clicking the toolbar emoji button opens the picker; selecting an emoji inserts it at the caret (and replaces a selection). Demo: note the emoji button.
- Ships as its own small PR first.

## Slice 2 — Color

### Model (`RichText/engine/model.ts`)

```ts
export type MarkType =
  | 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'link' | 'mention'
  | 'textColor' | 'bgColor';

export type Mark =
  | …existing…
  | { type: 'textColor'; color: string }   // color = palette key
  | { type: 'bgColor'; color: string };
```

`color` is typed as `string` in the model (no coupling to the palette enum); the palette validates/resolves it. Unknown keys render as no color (defensive).

### Palette (`RichText/engine/colorMarks.ts`)

A single source of truth shared by the renderer, serializers, and UI:

```ts
export type ColorKey = 'gray' | 'red' | 'green' | 'amber' | 'blue';
export const COLOR_KEYS: ColorKey[] = ['gray', 'red', 'green', 'amber', 'blue'];

// CSS custom properties (NOT raw hex) so it stays theme-able.
const TEXT_VAR: Record<ColorKey, string> = {
  gray: '--color-fg-muted',
  red: '--color-danger',
  green: '--color-success',
  amber: '--color-warning',
  blue: '--color-accent',
};
const BG_VAR: Record<ColorKey, string> = {
  gray: '--color-bg-muted',
  red: '--color-danger-bg-subtle',
  green: '--color-success-bg-subtle',
  amber: '--color-warning-bg-subtle',
  blue: '--color-accent-bg-subtle',
};

export function isColorKey(s: string): s is ColorKey { … }
export function textColorVar(key: string): string | undefined; // → "var(--color-…)" or undefined
export function bgColorVar(key: string): string | undefined;
```

"Clear" is the absence of the mark (no special key).

### Transform (`RichText/engine/transforms.ts`)

```ts
// "set/replace" semantics: a run never carries two textColors. key === null clears.
export function setColorMark(
  doc: RichDoc,
  range: Range,
  type: 'textColor' | 'bgColor',
  key: string | null,
): RichDoc {
  let d = removeMark(doc, range, type); // drop any existing color of this type
  if (key) d = applyMark(d, range, { type, color: key });
  return d;
}
```

`marksEqual` (`engine/marks.ts`) is extended so two color marks compare equal only when both type AND `color` match (mirrors how `link`/`mention` already compare by value), so adjacent same-color runs coalesce and dedup works.

### Commands + editor wiring (`RichTextEditor/commands.ts`, `RichTextEditor.tsx`)

- `activeColors(doc, range, pending)` → `{ textColor?: ColorKey; bgColor?: ColorKey }` for the active swatch ring (the color spanning the whole selection, else none).
- `onSetColor(type, key|null)` → `commit(setColorMark(value, selection, type, key))`. With a **collapsed** caret, set/clear a **pending** color mark (so the next typed text gets it), reusing the existing pending-marks machinery (color is a set/replace pending mark: applying one color clears the other pending color of that type).
- `onBlockColor(blockId, type, key|null)` → `commit(setColorMark(value, wholeBlockRange(blockId), type, key))` for the ⠿ menu.

### Render (`RichText/engine/renderDoc.tsx`)

Per-mark wrapping, both editable and read-only:

- `textColor` → `<span style={{ color: 'var(--token)' }}>`
- `bgColor` → `<span style={{ backgroundColor: 'var(--token)' }}>`

Unknown/invalid key → no style (defensive).

### Serialization

- **`toHtml`** — `textColor` → `<span style="color:var(--token)">`; `bgColor` → `<span style="background-color:var(--token)">`. Added to `MARK_ORDER`.
- **`toMarkdown`** — dropped (Markdown has no color, same as alignment/width).
- **`fromHtml`** — parse inline `color` / `background-color`; map a recognized palette token-var (or its resolved hex) back to a palette key; **drop unknown colors** so the model stays token-only.

### Color UI

- **`RichTextColorMenu.tsx`** (new internal, presentational) — the swatch grid: a **Text** row and a **Highlight** row, each led by a ⌀ Clear swatch; the active key shows a ring. Props: `active`, `onPick(type, key|null)`. Reused by both surfaces. Each swatch is a `Button`/role-appropriate control with an i18n `aria-label` (color name).
- **Toolbar** — a "Color" button (icon: "A" with a color underline) → a `Popover` containing `RichTextColorMenu`; `onPick` → `onSetColor`. `onMouseDown preventDefault` to keep the editor selection (same as the other toolbar buttons).
- **Block ⠿ menu** (`RichTextBlockMenu`) — a "Color ▸" `DropdownMenu.Sub` whose content renders the swatch grid; `onPick` → `onBlockColor` (whole block). Gated by a new `onColor?` prop (omitted ⇒ no entry), wired by the editor when `blockControls`.
- **i18n:** `textColor`, `highlight`, `colorClear`, `color`, and the five color names (`colorGray/Red/Green/Amber/Blue`), en + ru.

### SCSS

`.colorMenu`, `.colorRow`, `.swatch`, `.swatchActive` in `RichTextEditor.module.scss`, tokens only. Swatches show the token color as their background (text swatch = the text var on a neutral chip; highlight swatch = the bg var). Fixed-size square via `height` + `aspect-ratio` (no `width`, Rule 4) like the resize handle.

## Testing & Core invariant

- **Engine units:** `colorMarks` resolvers + `isColorKey`; `setColorMark` apply / replace / clear; `marksEqual` color equality + run coalescing; `toHtml`/`fromHtml` round-trip (recognized → key, unknown → dropped); `toMarkdown` drops color; `renderDoc` emits the style for editable + read-only.
- **Component:** toolbar color popover applies + clears a color over a selection and reflects the active swatch; collapsed-caret pending color applies to the next typed text; emoji button inserts at the caret / replaces a selection; ⠿ "Color" colors the whole block.
- **Demo** (`RichTextEditorDemo`) gains an emoji + color example; **AGENTS.md** + JSDoc updated.
- **No new exported component** — both pickers already exist and `RichTextColorMenu` is internal (like `RichTextBlockMenu`), so `src/index.ts` and the manifest are unchanged.

## Out of scope

- Per-character gradient / multiple colors per run (one text + one highlight per run).
- Persisting recent emoji (the toolbar emoji may pass through an optional `recent` later).
- A custom/arbitrary hex color (palette only, by decision).
