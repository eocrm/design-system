# `<EmojiPicker>` — searchable emoji grid (popover-ready) — design

**Date:** 2026-06-27
**Status:** Design (autonomous, issue #221) → plan → build
**Component:** `@eocrm/design-system` › new `EmojiPicker`

---

## Context

Issue #221: no DS emoji picker. Comment **reactions** need a searchable emoji grid
that renders inside a `Popover`. `onSelect(emoji: string)` fires with the unicode
char. Keyboard-navigable, token-themed, dark-mode-safe, localized labels where
practical. The consumer owns the trigger (`<Popover.Content><EmojiPicker/></...>`),
plus a convenience `<EmojiPickerPopover trigger onSelect>` wrapper.

## Dependency decision: bundle a curated dataset, hand-roll the UI

The package hard rule forbids **UI/component libraries** (only `@floating-ui` and
`@dnd-kit` are excepted), and bundle size matters. So: **no emoji-picker library**
(frimousse/emoji-mart are UI libs → out). Instead bundle a **curated local emoji
dataset** (`emojiData.ts` — plain data, like the `libphonenumber-js` data-dep
precedent, not a UI lib) and hand-roll the grid + search + keyboard per WAI-ARIA APG,
exactly as the DS hand-rolls every other interactive primitive. The dataset is a
focused common set (~10 categories, the high-frequency reaction + input emojis), kept
light and expandable; it is NOT the full ~1900-emoji Unicode set (YAGNI for v1
reactions).

## API

```tsx
// Consumer owns the trigger:
<Popover>
  <Popover.Trigger><Button iconOnly aria-label="Add reaction">＋</Button></Popover.Trigger>
  <Popover.Content><EmojiPicker onSelect={(e) => toggleReaction(e)} /></Popover.Content>
</Popover>

// Or the convenience wrapper (owns the Popover):
<EmojiPickerPopover
  trigger={<Button iconOnly aria-label="Add reaction">＋</Button>}
  onSelect={(e) => toggleReaction(e)}
/>
```

- **`EmojiPicker`** (`extends Omit<HTMLAttributes<HTMLDivElement>, 'onSelect'>`):
  - `onSelect: (emoji: string) => void` — fires with the chosen unicode char.
  - `className` merges; other div attrs spread (Pattern A).
  - Renders: a search `<Input>` (filters by name + keywords), then a scrollable
    panel of **category sections** (each a heading + a grid of emoji buttons). A
    "no results" empty line when the filter matches nothing.
- **`EmojiPickerPopover`**:
  - `trigger: ReactNode` (the consumer's button — `Popover.Trigger` injects the
    ref + ARIA), `onSelect`, and optional `open` / `onOpenChange` / `defaultOpen`
    passthrough to `Popover`. Selecting an emoji fires `onSelect` **and closes** the
    popover (default-uncontrolled: it manages its own open state and closes on
    select; controlled: it calls `onOpenChange(false)`).

## Keyboard + a11y (hand-rolled, APG grid pattern)

- Search input is the primary focus target (type to filter). It's a normal text
  `<Input>`; `aria-controls` the grid.
- The emoji area is a **grid** (`role="grid"`, rows = `role="row"`, cells =
  `role="gridcell"` wrapping a `<button>` per emoji). Roving tabindex: exactly one
  emoji button is tabbable at a time.
- From the search input: `ArrowDown` moves focus into the grid (first visible emoji).
- In the grid: `ArrowLeft/Right` move by one; `ArrowUp/Down` move by one **row**
  (column count); `Home`/`End` jump to row start/end; `Enter`/`Space` select (fires
  `onSelect`). `ArrowUp` from the first row returns focus to the search input.
  Typing a printable char while in the grid refocuses the search and appends (nice to
  have — at minimum, the search box is reachable via Shift+Tab / ArrowUp).
- Each emoji button has an `aria-label` = the emoji's name (so SR announces "thumbs
  up"); the char itself is `aria-hidden` decorative text inside.
- Filtering recomputes the visible grid; the roving index resets to 0.
- Escape / outside-click dismissal is the Popover's job (when wrapped).

## Dataset (`emojiData.ts`)

```ts
export interface EmojiEntry {
  char: string;
  name: string;
  keywords: string[];
}
export interface EmojiCategory {
  id: EmojiCategoryId;
  emojis: EmojiEntry[];
}
export type EmojiCategoryId =
  | 'smileys'
  | 'gestures'
  | 'people'
  | 'animals'
  | 'food'
  | 'activities'
  | 'travel'
  | 'objects'
  | 'symbols'
  | 'flags';
export const EMOJI_CATEGORIES: EmojiCategory[];
```

- Category **id** only (no label) — the component maps id → i18n key
  (`emojiPicker.category.<id>`) via `useTranslation`, so labels localize. `name` +
  `keywords` stay English (search corpus; "localize where practical" — names are the
  practical floor).
- ~12–24 emojis per category, common/reaction-first (👍👎❤️🎉😄😢😮😡🙏👏🔥💯✅❌
  …). Authored as a static TS file (data, tree-shakeable). Each `char` is a single
  user-perceived emoji (incl. needed ZWJ/variation sequences).

## Tokens (`EmojiPicker.tokens.scss`)

```
--emoji-picker-width            // panel width (e.g. a fixed comfortable grid width)
--emoji-picker-max-height       // scroll cap on the sections area
--emoji-picker-cell-size        // square emoji button
--emoji-picker-emoji-size       // font-size of the glyph
--emoji-picker-grid-gap
--emoji-picker-section-gap
--emoji-picker-radius           // cell hover/focus radius (var(--radius-sm))
--emoji-picker-cell-hover-bg    // var(--color-bg-muted)
```

All map to existing primitives (Rule 3, tokens only). Cell focus uses
`:focus-visible` (Rule 3a). No layout props on the component beyond its own grid.

## Component tokens / theming

Dark mode: colors via tokens (bg, hover, fg) so it inherits the theme. The emoji
glyphs themselves are system-rendered (no theming needed).

## i18n (Rule 9)

New `Messages` keys (en + ru): `emojiPicker.search` (placeholder),
`emojiPicker.noResults`, and `emojiPicker.category.<id>` for all 10 category ids.
Consumed via `useTranslation`. (`EmojiPickerPopover` adds no fixed strings — the
trigger + its aria-label are the consumer's.)

## Testing (`EmojiPicker.test.tsx`)

- Renders the search box + category sections + emoji buttons.
- Clicking an emoji button fires `onSelect` with its char.
- Typing in search filters the grid (matching emojis shown, non-matching hidden);
  no-match shows the empty message.
- Each emoji button exposes its name as the accessible name (`aria-label`).
- Keyboard: ArrowDown from search enters the grid; Arrow keys move the roving focus;
  Enter selects (fires `onSelect`). (Roving tabindex: one tabbable cell.)
- `EmojiPickerPopover`: clicking the trigger opens the panel; selecting an emoji
  fires `onSelect` and closes the popover.
- forwardRef on `EmojiPicker` → its root div; `className` merges; arbitrary attrs
  spread.

Live Playwright pass: open the picker in the demo, search, keyboard-navigate, select.

## Core-invariant checklist (new component)

- `src/components/EmojiPicker/`: `emojiData.ts`, `EmojiPicker.tsx`
  (forwardRef + spread + full JSDoc + `@remarks`), `EmojiPicker.module.scss`,
  `EmojiPicker.tokens.scss`, `EmojiPicker.test.tsx`, `index.ts`.
- `src/index.ts` re-export: `EmojiPicker`, `EmojiPickerPopover`, `EmojiPickerProps`,
  `EmojiPickerPopoverProps`, `EmojiEntry`/`EmojiCategory`/`EmojiCategoryId` types.
- i18n keys in `messages.ts` + `en.ts` + `ru.ts`.
- Demo `pages/components/EmojiPickerDemo.tsx` + wiring: App route, AppShell nav
  (Forms or Display group), ComponentsIndex card, mockups registry `ComponentName`
  union (the demo `componentName` prop is typed against it).
- `AGENTS.md` TL;DR + canonical snippet.
- Manifest CLUSTERS entry in BOTH `_meta/manifest.ts` + `generate-manifest.mjs`
  (EmojiPicker composes `Popover`/`Input`/`Button`), then `npm run build:manifest`.

## When NOT to use (`@remarks`)

- A fixed small set of reaction choices (no search) → a `Cluster` of `Button`s.
- A full free-text editor with inline emoji autocomplete → out of scope (that's an
  editor `@`-style menu, cf. RichTextEditor mentions).
- Rendering existing reactions as chips with counts → that's a `Badge`/chip cluster
  the consumer builds; `EmojiPicker` is only the chooser.
