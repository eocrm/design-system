# IconPicker — optional palette colour + size

## Intent

CRM forms pair an `IconPicker` (32px bordered square) with a `PillMenu` colour chip ("Teal ▾") for one conceptual choice: _how this record looks_. The result is two labels, two heights, nothing aligned to the input grid. We fold colour choice into `IconPicker` itself so one trigger, one popover, one value-pair covers it — instead of introducing a new component that overlaps `IconPicker`.

## Goals

- `IconPicker` optionally picks a **palette colour** (`PaletteColor`, the 30 named colours `IconTile` / `PillMenu` / `Badge` use) alongside the icon.
- The trigger can match field heights via a `size` prop (`sm` 24 / `md` 32 / `lg` 40px — same scale and tokens as `Input` / `Select`), so it sits flush beside an `Input` of the same size.
- **Sibling-agnostic.** The picker knows nothing about what is next to it (Name input, table cell, settings row, alone in a `<Field label>`). Placement is the consumer's job (`Cluster`), per the "components don't own layout" rule.

## Non-goals

- Hex / free-form colour. That's `ColorPicker`; the CRM stores palette names ("teal"), not hex.
- Custom colours outside the palette, multi-select, search/filter in the icon grid.
- Migrating the CRM's call sites (separate repo, after release).
- A new component (`AppearancePicker` was considered and rejected — overlaps `IconPicker`).

## Anti-goals (failure even if it "works")

- Any visual or behavioural change for existing icon-only consumers (no `color` passed). Same trigger look, same 32px default, same close-on-pick, same a11y names.
- A trigger whose height doesn't equal the same-size `Input`.

## API (decided)

Additions to `IconPickerProps`:

| Prop | Type | Notes |
|---|---|---|
| `size` | `'sm' \| 'md' \| 'lg'` | Trigger box size. Default `'md'` (32px — today's size, so no change for existing users). Applies in both modes. |
| `color` | `PaletteColor` | Controlled colour. Passing it turns on colour mode. |
| `onColorChange` | `(color: PaletteColor) => void` | Required together with `color`. |
| `colors` | `PaletteColor[]` | Optional subset/order of offered colours. Default `PALETTE_COLORS` (all 30). Ignored without `color`. |

- **Two separate controlled pairs** (`value`/`onChange` for the icon, `color`/`onColorChange` for colour), not one `{icon, color}` object — they bind 1:1 to two form fields / DB columns. _(Claude's call; user did not object.)_
- `color` + `onColorChange` must come together — enforce in the type (union: both present or both absent), not with a runtime warning.
- A `color` not in `colors` still renders the trigger in that colour; the colour row simply has no checked dot (mirrors how an unknown icon `value` is handled today).

## Behaviour (decided)

**Icon-only mode (no `color`)** — unchanged, except `size`.

**Colour mode:**

- **Trigger:** looks like a tinted `IconTile` — background/foreground from `paletteTokens(color)` (`--color-palette-<name>-bg/-fg`), no neutral border, keeps the existing focus ring, invalid and disabled states. Shows the selected icon glyph (empty tinted square if `value` matches no option).
- **Popover:** two sections, top to bottom:
  1. **Colour** — a row/grid of palette dots, one `role="radiogroup"` named "Colour" (localized).
  2. **Icon** — the existing icon grid, `role="radiogroup"` named as today; cells tinted with the currently selected colour so the user previews the result.
- **Picking doesn't close** the popover in colour mode (user usually sets both). Click / Enter / Space on a dot or icon commits it and keeps the popover open. Esc and outside-click close (Esc returns focus to the trigger — existing Popover behaviour). Icon-only mode keeps close-on-pick.
- **Keyboard:** each radiogroup is its own roving-tabindex stop; Tab / Shift+Tab move between Colour and Icon. Arrow keys move + select within a group (same radio semantics the icon grid has today — arrows fire `onChange` / `onColorChange`). Opening focuses the checked colour dot (first stop).
- **Accessible name of the trigger:** purpose + icon + colour, e.g. "Pick icon: Calendar, Teal" (and the `aria-labelledby` path appends both via hidden text, as it does for the icon today). Colour dots are named with the localized colour name.
- **Empty `options`:** trigger disabled, as today, even in colour mode.
- **Disabled in colour mode:** the trigger keeps its palette tint and dims via opacity, so a read-only record still shows its stored colour. Same precedent as `PillMenu` ("stays coloured, dims via opacity"). Icon-only disabled keeps today's neutral disabled look. _(Claude's call.)_
- **Visible section headings:** "Colour" and "Icon" appear as small headings in the popover, as in the mockup the user picked from, and each heading names its radiogroup via `aria-labelledby`. In colour mode the default purpose becomes "Pick icon and colour" (new i18n key), which names the trigger and dialog. A consumer `aria-label` still overrides it. _(Claude's call.)_

## Constraints

- Tokens only; no raw values in SCSS. New component tokens (`--icon-picker-*`) for swatch size, swatch gap, swatch selected ring, and per-size trigger size. The existing public `--icon-picker-trigger-size` stays the **md** value (default `--size-md`), so every override in use today, all of them at md, keeps working. Add `--icon-picker-trigger-size-sm` / `-lg` (default `--size-sm` / `--size-lg`) for the other sizes. Include a regression test that an override of `--icon-picker-trigger-size` still sizes the default trigger. _(Claude's call.)_ Add new tokens to `ICON_PICKER_TOKEN_NAMES` so portaled popover content still receives consumer overrides.
- Colour tint via runtime custom properties from `paletteTokens()` — the same technique `IconTile` uses — not a 30-entry class list. Dark mode comes free from the palette tokens.
- No layout properties in the component SCSS (no margin/position/flex:1).
- i18n: new keys in `messages.ts`, `en.ts`, `ru.ts` — `iconPicker.colorLabel` ("Colour"), `iconPicker.iconLabel` ("Icon") and `iconPicker.triggerLabelWithColor` ("Pick icon and colour"), and localized names for all 30 palette colours. _(Claude's call: put colour names in a new shared `palette` namespace rather than reusing `richText.color*`, which is RTE-scoped and covers a different set.)_
- Usual library gates: unit tests in `IconPicker.test.tsx` (colour mode render, both radiogroups, keyboard Tab/arrows, no-close-on-pick, icon-only unchanged incl. close-on-pick, trigger accessible name, `size` heights via class, `colors` subset, unknown `color`), docs (`docs/components/IconPicker.md` — new props via `npm run build:docs`, colour-mode example, a "beside an Input" `Cluster` example, anti-patterns: don't pair with a separate colour PillMenu; don't use for hex), AI-PRIMER line updated to mention colour, playground demo sections (colour mode, sizes beside matching `Input`s, standalone in `<Field label>`), pre-push review loop. Not a new component → no manifest/route/nav changes.

## Left to the builder

- Colour-row column count and popover width so the dot row and icon grid feel like one panel (icon grid is 4 columns today; 30 dots probably want 10×3 or 6×5). Settle visually in the playground; user reviews the demo before PR.
- Dot shape/size (circle, roughly 20px) and the selected-dot indicator, within tokens.
- Glyph size per trigger `size`.
- Exact internal restructuring of the keyboard handler to support two groups.
