# Focus-ring conformance and the `fg-subtle` tone — design

Date: 2026-09-01
Issues: #511, #512, #513, #514

Four issues filed off the review of PR #510. Two are bounded fixes, one is a
token retune with a library-wide blast radius, one introduces a browser-based
CI gate that does not exist yet.

---

## 1. `--color-fg-subtle` is sub-AA on three of four surfaces (#511)

### Measured

`--color-fg-subtle` against every page-level surface, both themes:

| on                       | light    | dark     |
| ------------------------ | -------- | -------- |
| `--color-bg`             | 4.52     | 4.66     |
| `--color-bg-subtle`      | **4.37** | **4.34** |
| `--color-bg-muted`       | **4.15** | **3.96** |
| `--color-bg-muted-hover` | **3.62** | **3.23** |

#511 reports only the `bg-muted` row. `bg-subtle` fails as well and had not been
noticed; `bg-default` passes but sits on the line at 4.52.

### Why "darken until it clears `bg-muted`" is not available

Two constraints bind, both in the light theme:

1. **The tone collapses into `--color-fg-muted`.** The two are already only
   ΔE(OKLab) **0.0387** apart — below the 0.065 perceptibility floor this
   library pins for a single hover step (`contrast.test.ts`). Any value that
   clears 4.5 on `bg-muted` (≤ `#657185`) puts them at ΔE ≤ 0.019. They stop
   being two colours.
2. **The presence gate fires.** `presence.color.offline` aliases
   `color.foreground.subtle` (#506). Every light value from `#677286` down to
   `#4b5362` drops the `online/offline` pair below the pinned 0.13 ΔE floor.
   The first value clearing both `bg-muted` and that gate is `#4a5261` —
   _darker than `--color-fg-muted`_, which inverts both the token naming and
   the visual hierarchy.

### Decision — option B

Darken one notch, certify a scoped surface set, and cut the presence coupling.

|                           | light                         | dark                          |
| ------------------------- | ----------------------------- | ----------------------------- |
| `color.foreground.subtle` | `#6b778c` → **`#687388`**     | `#7e8b9a` → **`#8591a0`**     |
| `presence.color.offline`  | alias → literal **`#6b778c`** | alias → literal **`#7e8b9a`** |

Only lightness moves; hue and saturation are untouched, following #484.

Resulting ratios: `bg` 4.78 / 5.06, `bg-subtle` 4.61 / 4.71. Both clear AA with
headroom rather than sitting on the line. ΔE vs `fg-muted` becomes 0.026 light /
0.071 dark. Presence minimum returns to 0.1344 light / 0.1958 dark — unchanged
from today, because offline no longer follows `fg-subtle`.

De-aliasing offline is not incidental. Coupling a presence dot to a typography
token means every future type retune is a two-gate problem, and the #484
knock-on (`busy` IS `--color-danger`) is the same mistake one layer over.
Freezing offline at today's rendered value changes nothing visually and removes
the coupling permanently.

### The scoped rule

`--color-fg-subtle` is certified for `--color-bg` and `--color-bg-subtle` only.
Text on `--color-bg-muted` or darker uses `tone="muted"`
(`--color-fg-muted` reads 4.87 light / 5.60 dark there).

Pinned in `contrast.test.ts` alongside the existing rows:

```
['subtle text on page bg',     '--color-fg-subtle', '--color-bg',        4.5],
['subtle text on subtle bg',   '--color-fg-subtle', '--color-bg-subtle', 4.5],
['muted text on muted bg',     '--color-fg-muted',  '--color-bg-muted',  4.5],
```

`--color-fg-subtle` on `--color-bg-muted` is deliberately NOT pinned; the rule
is that the pairing does not occur, not that it passes.

### Consumer fix

`--options-picker-group-header-hint-fg` re-points from `--color-fg-subtle` to
`--color-fg-muted`. That is #511's actual reported instance. The `@contrast`
annotations in `OptionsPicker.tokens.scss` are updated to the new measurements.

Every other `--color-fg-subtle` consumer (46 references) is swept to confirm it
paints on `bg` or `bg-subtle`, not on `bg-muted` or darker.

---

## 2. Focus-ring geometry gate (#512)

### State

The repo has no Playwright: no config, no specs, no dependency. This introduces
it.

`contrast.test.ts` certifies a ring's colour. Nothing certifies its geometry.
Since #505 the ring is an `outline` at `outline-offset: 2px`, sitting 2–4px
outside the border box, so any focusable flush against an `overflow` ancestor
loses whole bands. jsdom computes no layout, so the vitest suite cannot see it.
A static gate cannot see it either — the clipping ancestor is routinely in a
different file (`TimedEvent`'s is `HourGrid`; `DayCell`'s is the month grid).

### Shape

- `@playwright/test` as a root dev dependency.
- `playwright.config.ts` at root. `webServer` runs `vite preview` for the
  playground on **port 8090** (never the default — the user's own dev server
  holds it).
- One spec, `tests/focus-ring-geometry.spec.ts`:
  1. enumerate the demo routes (113) from the playground route table rather
     than a hand-maintained list, so a new demo is covered on arrival;
  2. per route, collect every focusable and focus it;
  3. read the computed `outline-width` / `outline-offset` and the element's
     border box; derive the four ring bands;
  4. walk ancestors for a computed `overflow` other than `visible`, intersect
     to a clip rect;
  5. fail on any band **fully** lost.
- A committed baseline file records known pre-existing clips (`EmojiPicker`
  cells, Kanban card, and whatever the first run surfaces). Only new losses
  fail. This is what keeps the gate actionable instead of a wall of noise.
- CI: a dedicated job in `quality.yml` running
  `npx playwright install --with-deps chromium`.

### Validation

The gate must reproduce the three clips #505 shipped and #510 fixed — `Tabs`
`.tab`, `Calendar/TimedEvent`, `Calendar/DayCell` — when their inset offsets are
temporarily reverted. A gate that cannot re-find the bugs it was built for is
not a gate.

### Not in scope

The IconPicker `box-shadow` → `outline` migration that #512 says this unblocks.
It is a separate change once the sweep is trusted.

---

## 3. Suppressed and hand-rolled rings (#513)

Three components bypass the `focus-ring` mixin, with three different results.

**Root cause, for two of them, is one shape:** `:focus-visible` sharing a rule
with `:hover` that sets `outline: none`. The focused state then cannot be
distinguished from the hovered one.

- `FileUpload.module.scss:28` — `.dropzone:hover, .dropzone:focus-visible` sets
  `outline: none` with only a border tint. No focus indicator at all: **WCAG
  2.4.7 failure**. Split the selectors, `@include focus-ring` on the
  `:focus-visible` half.
- `Slider.module.scss:134` — `.thumb:hover, .thumb:focus-visible`, same shape.
  There is a visible change, but it is the hover change. Same fix.
- `Rail.module.scss` — four literal `outline: var(--ring-width) solid
var(--ring-accent)` rules (`:223`, `:311`, `:361`, `:453`), three of them with
  a raw `-2px` offset, which is also a token violation. Replace with
  `@include focus-ring` plus
  `outline-offset: calc(-1 * var(--ring-offset))`. Emission is unchanged; the
  point is that a future change to the mixin reaches them.

Three further `outline: none` + `:focus-visible` sites are legitimate and stay:
`AvatarGroup` (box-shadow ring, documented reason — an offset gap would show
another avatar), `FlowCanvas` (deliberate), `LiquidEditor` (`.root:focus-within`
draws the ring instead).

### Static gates, so this cannot recur

Two rules added to `structure.test.ts`. Both are mechanically precise and
produce no false positives against the three legitimate exceptions above:

1. A rule whose selector list contains both `:hover` and `:focus-visible` may
   not set `outline: none`.
2. `outline: var(--ring-width) solid …` may not appear outside
   `styles/mixins.scss`.

These are the half of #512's problem that a static check _can_ see. They do not
replace the browser sweep; they cover a different failure.

---

## 4. OptionsPicker comment says 1px (#514)

`OptionsPicker.tsx:569` describes the group-header bottom border as 1px. The
token is `--options-picker-group-header-border-width` →
`--border-width-emphasis` → `2px`. The width is load-bearing since #510 gave the
header a 2px inset ring that covers the border exactly, so a reader reasoning
from "1px" computes a partial occlusion and reaches a different conclusion about
whether that trade is sound. Correct the number and check the rest of the block
against the tokens.

---

## Delivery

Three PRs, one commit per issue, matching the last two batches:

1. **#514 + #513** — comment fix, three ring fixes, two `structure.test.ts`
   gates.
2. **#511** — token change; `npm run tokens:check` required.
3. **#512** — Playwright config, spec, baseline, CI job.

#513's ring changes are candidates for #512's sweep, but #512 is not a
prerequisite: FileUpload's dropzone and Slider's thumb are getting an indicator
where there was none or a weakened one, which is an improvement under either
geometry. If the sweep later shows a clip, the inset offset is a one-line
follow-up.

## Testing

- #511: `npm run tokens:check`, plus the new `contrast.test.ts` rows and the
  existing presence ΔE gate.
- #512: the reproduce-the-three-known-clips validation above.
- #513: the two new `structure.test.ts` rules fail against the pre-fix source.
- #514: none; it is a comment.
