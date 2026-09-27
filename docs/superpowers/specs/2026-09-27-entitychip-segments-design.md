# EntityChip segments — design

Issue: eocrm/design-system#582 ("SegmentedChip"), superseding #581. Decided
2026-09-27: no new component — **EntityChip gains coloured segments**. EntityChip
is the chip that "migrates" to the segmented form, in place.

## Goal

Render an entity as one inline chip made of coloured segments — e.g. a task:
type · key + title · priority · status — each on its own colour, only the outer
corners rounded, segments butting together. Replaces eocrm's shim
(`apps/web/src/shared/ds-shims/SegmentedChip.tsx`) used by `TaskChip`;
appointments follow.

Success: `TaskChip` renders from `EntityChip` with no local CSS; the chip sits in
a comment `<p>` at exactly the height of a plain `EntityChip`; one Tab stop whose
name carries type, key, title, priority and status.

## Decisions (with the user)

1. **The whole chip is the link** (not only the key+title segment). One Tab stop;
   the accessible name includes every segment (Rule 10: properties you arrive
   at belong in the name — as EntityChip's `status` already is).
2. **Title stays in EntityChip's root props** (`prefix`, `label`, `as`/`href`);
   palette segments go in `before` / `after` arrays. Exactly one title by type.
3. **Long titles:** CSS cap (`labelMaxWidth`, in `ch`) + ellipsis; the full title
   stays in the DOM and the accessible name; a tooltip with the full title only
   when the label is actually clipped. Replaces the shim's `shownLabel` /
   `maxTitle` character slicing.
4. **Evolve EntityChip**, not a new `SegmentedChip`.
5. After the issue update: whole-chip link kept (the issue now reads as a
   body-only link); weights stay `medium` (issue: semibold); segment `size` in
   `em` (issue: rem).

## API (additions only)

```ts
export type EntityChipSegment =
  /** A glyph on a palette colour. `label` is its accessible name and tooltip. */
  | { kind: 'icon'; icon: ReactNode; label: string; color?: PaletteColor; size?: number }
  /** A short value (e.g. a status) on a palette colour, optional tooltip. */
  | { kind: 'text'; text: ReactNode; color?: PaletteColor; tooltip?: ReactNode; size?: number };

interface EntityChipOwnProps {
  // …existing props unchanged…
  /** Segments rendered before the core (icon/prefix/label/status/trailing), in order. */
  before?: EntityChipSegment[];
  /** Segments rendered after the core, in order. */
  after?: EntityChipSegment[];
  /** Caps the label's width, in `ch`; the label ellipsizes past it. */
  labelMaxWidth?: number;
}
```

`labelMaxWidth` makes the label single-line: `max-width: <n>ch`, `nowrap`,
ellipsis — also on a chip without `truncate` (a capped label that wraps would
not be capped).

`size` (issue update 2026-09-27): icon → glyph size, text → font size, **in
`em`** of the chip text (the issue asked rem; decided em so a sized segment
still follows the surrounding text, e.g. in a heading). Defaults: glyph
`0.85em`, text `0.9em` (slightly smaller than the title).

`color` on a segment defaults to `'slate'`; colours resolve via `paletteTokens`
(`bg` / `fg`). `EntityChipSegment` is exported from `src/index.ts`.

## Rendering

**No segments** (`before` and `after` absent or empty): DOM and CSS exactly as
today. No consumer sees a change. (`labelMaxWidth` and the clipped-label tooltip
apply in both modes — they only add behaviour.)

**With segments:** the root gets `.segmented`:

- root: `display: inline-flex; align-items: stretch;` no padding, no background,
  keeps `border-radius`, `overflow: hidden` (rounds only the outer corners),
  `max-width: 100%`, `min-width: 0`, `white-space: nowrap`.
- core: a `<span class="core">` wrapping today's children (icon, prefix, label,
  status dot + status, trailing, hidden state words). It takes today's chip
  padding, gap, fill (`--entity-chip-bg` / `color` override) and fg. It is the
  **only** part that shrinks (`flex-shrink: 1; min-width: 0`); inside it the
  label ellipsizes (same rules as `truncate`). A segmented chip is always one
  line — `truncate` is implied.
- segment: `<span class="segment">`, `flex-shrink: 0`, same vertical padding and
  `line-height` tokens as the core (so the chip height equals a plain chip),
  `padding-inline: var(--space-1)` (icon) / `var(--space-2)` (text), background
  / colour from the segment's palette tokens via `--entity-chip-segment-bg/-fg`.
  Icon glyphs: `> svg { width/height: 0.85em }` (token).
- Weights: EntityChip's own — label `medium` (matches @mention), prefix muted.
  Text segments use the label's weight. (The issue asks semibold; decided
  medium so a segmented chip matches a plain chip / @mention beside it.)
- Text segment font size `var(--entity-chip-segment-text-size)` (0.9em);
  `size` overrides it inline (`font-size: <n>em`). Icon `size` overrides
  `--entity-chip-segment-glyph-size` inline (`<n>em`).
- Hover (interactive root): today's affordance on the whole chip
  (`filter: brightness(0.96)`); focus ring on the root (outline is not clipped by
  the root's own `overflow`).

**States:** `loading` and `unavailable` do not render segments — the same rule
`loading` already applies to `prefix` / `status` (a not-yet-loaded or deleted
entity has no known type/status).

## Accessibility

- Name from content: "Bug ENG-15 Fix the login bug Normal Reported". Icon
  segment: `<span role="img" aria-label={label}>` with the glyph wrapped
  `aria-hidden`. Text segment: plain text.
- Tooltips attach to their own segment span, never the root, so one hover shows
  one tooltip: icon → `label`; text → `tooltip` (if given); label → full label
  text, only when clipped (`scrollWidth > clientWidth`, checked on
  pointerenter/focus of the label; otherwise no tooltip and no
  `aria-describedby`, so a visible title is never announced twice).
- Touch: a tap inside the link navigates (Tooltip docs); tooltips are
  supplementary, the name carries everything.
- Anti-pattern kept: no interactive content in segments or `trailing`.

## Tokens (EntityChip.tokens.scss)

`--entity-chip-segment-padding-x-icon: var(--space-1)`,
`--entity-chip-segment-padding-x-text: var(--space-2)`,
`--entity-chip-segment-glyph-size: 0.85em`, `--entity-chip-segment-text-size: 0.9em`. Segment fill/fg are runtime custom
properties from `paletteTokens` (not declared).

## Testing

- No segments: rendered DOM equal to a snapshot of today's markup for a
  representative chip (icon + prefix + label + status + trailing).
- Order: before → core → after; `.segmented` only when a segment exists.
- Name: `getByRole('link', { name: 'Bug ENG-15 Fix … Normal Reported' })`.
- Icon segment `role="img"` + label; glyph `aria-hidden`; palette vars set.
- Tooltips: segment tooltip content on hover; label tooltip only when clipped
  (stub `scrollWidth`/`clientWidth`), none when not.
- `labelMaxWidth` sets the max-width in `ch` on the label.
- loading/unavailable render no segments.
- Compiled-CSS assertions: `.segmented` overflow/radius/no padding; core
  shrinks; segments don't.
- Visual (playground, Chromium): segmented chip height == plain chip height in a
  `<p>`; ellipsis at container edge; outer corners only.

## Docs

JSDoc on the new props + union, `@example` for the task chip, `@remarks`
anti-patterns (interactive content in segments; segments for decoration without
meaning — every icon needs a `label`). AGENTS.md EntityChip section: segments
bullet + snippet. Playground EntityChip demo: "Segmented (task)" example incl. a
`<p>` beside a plain chip and a narrow truncating row. Manifest regenerated.

## Out of scope

- Re-expressing `status` / `icon` / `trailing` as segments (possible later; no
  consumer needs it now).
- Interactive segments.
