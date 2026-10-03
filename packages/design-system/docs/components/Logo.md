# `<Logo>` — brand logo lockup

```tsx
import logo from '../assets/eocrm-logo.svg'; // a consumer-owned asset
<Logo src={logo} text="eocrm" size="lg" />                       // mark + wordmark
<Logo src={logo} label="eocrm" />                                // mark only (accessible name)
<Logo src={logo} text="eocrm" textPlacement="bottom" />
<Logo src={logo} text="eocrm" subtext="Free trial" size="sm" />  // mark + name + muted subline
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `src` | `string` | yes | The brand mark image URL — typically an imported SVG/PNG asset. The mark is a **consumer-owned asset**; the design system ships no logo of its own. Rendered as an `<img>` (`object-fit: contain`) with no CSS recolor — the asset carries its own color. For third-party SSO marks use `<BrandIcon>`. |
| `text` | `ReactNode` | no | Wordmark rendered beside (or below) the mark — consumers pass `"eocrm"`. Omit for a mark-only logo. |
| `textPlacement` | `'end' \| 'bottom'` | no | Where the wordmark sits relative to the mark. Defaults to `'end'` (beside); `'bottom'` stacks it under the mark, centered. |
| `size` | `'sm' \| 'md' \| 'lg'` | no | Mark size — `'sm'` (24) / `'md'` (32, default) / `'lg'` (40). |
| `label` | `string` | no | Accessible name for the mark when there's no `text` (used as the image `alt`). Omit for a decorative mark (`alt=""`), or when `text` is present (the wordmark is the name). Never pass both `text` and `label`. |
| `subtext` | `ReactNode` | no | Small, muted secondary line rendered under `text` — e.g. a plan or tagline (`subtext="Free trial"`). Only shown when `text` is present. |
| …native | | | plus native `<div>` attributes |

<!-- props:end -->

- Arranges a **consumer-supplied** mark image (`src`, required — import an SVG/PNG) with an optional wordmark beside (default) or below (`textPlacement="bottom"`). The design system ships **no** logo of its own.
- **Wordmark font:** override `--logo-text-font` / `--logo-text-font-weight` to set the wordmark's font + weight (defaults: inherited sans, bold). Affects only `text`, not the mark or `subtext`; load the font yourself (the DS ships none).
- **Spacing:** `--logo-gap` (mark → wordmark, default `var(--space-2)`) and `--logo-text-gap` (wordmark → subtext, default `var(--space-1)`). `--logo-text-gap` only takes effect where `text-box-trim` is supported; elsewhere the lockup falls back to line-height leading for that separation, so it reads looser and taller (never clipped) — see the migration note below for how much. Where it does apply it is genuine clear space: adding a `subtext` moves the wordmark's under-edge from the baseline down to the font's descent, so a wordmark with descenders (`paygo`) keeps its tails out of the subline instead of eating the gap. Because it is measured from that descent line rather than from the ink, a descender-free wordmark shows roughly 1.8–2.3× the token as visible space (the descent is a fixed fraction of em while the token is a fixed 4px, so the ratio grows with `size`). The subtext itself keeps an `alphabetic` under-edge, so a subtext with descenders puts a little ink below the lockup's own bottom edge — ~2px at `sm`, its worst case; at `md`/`lg` the mark is tall enough to absorb it. Fine inside padded chrome, worth knowing if you clip a box sized exactly to the lockup. Like the migration figures, these depend on the subtext's face, which is `--font-family-sans` rather than your wordmark font.
- **Optical alignment is automatic, and `text` decides it.** Where `text-box-trim` is supported the wordmark is trimmed to its cap edge, or to its x-height edge when every glyph tops out at x-height (`eocrm`, `acme`). Anything with a capital, an ascender (`b d f h k l t`), a dotted `i`/`j`, a digit, or a non-Latin script takes the cap edge — so `<Logo text="eocrm">` and `<Logo text="lockbox">` are trimmed to different edges — their boxes differ, while the ink stays on the same optical centre against the mark. Nothing to configure; pass a non-string `text` (an element) and it takes the cap edge too.
- ⚠️ **_Migration:_ the lockup got shorter wherever `text-box-trim` is supported (Chrome/Safari; not Firefox).** Trimming the wordmark's half-leading is new — previous versions carried the font's full leading — most lockups with a `subtext`, and every `textPlacement="bottom"` lockup, render measurably shorter at the same `size`. Measured, per shape (before → after):
  - `subtext="Free trial"`, beside the mark — `sm` 30.8px → 24.0px, `md` 35.2px → 32.0px
  - `textPlacement="bottom"`, **no** subtext — `lg` 74.4px → 59.6px
  - `textPlacement="bottom"` **with** a subtext — `sm` 62.8px → 55.3px

  These come from the playground, which renders the wordmark in Outfit 600 and leaves the subtext on `--font-family-sans` — so every figure above with a subtext is a function of two faces. The DS ships no font of its own, so yours will shift all of them; treat these as the shape of the change, not constants. The side-by-side lockup **without** a subtext keeps its height at every size (the mark sets it), and at `lg` even the with-subtext lockup does — only `sm`/`md` shrink there.

  **Height is not the only thing that moved.** Trimming the leading also raises the wordmark against the mark in **every** shape, including the ones whose height is unchanged. Side-by-side without a subtext, the wordmark's ink centre sat 1.3 / 2.2 / 3.0px _below_ the mark's **box** centre at `sm`/`md`/`lg` and now sits within 0.1px of it — it rises by roughly 1.5px at `sm` up to 3px at `lg`. That is the correction this is for (the wordmark used to hang low), but it means the shape you use most did change visually even though it did not change size. Firefox keeps the old position as well as the old height, so the same lockup differs across browsers by that 1.5–3px on top of the height gap — which is **up to** ~28% (`sm` with a subtext) and 0% for the side-by-side lockup without one. If you center a Logo in a fixed-height brand bar or auth splash, re-check that container; size containers off the mark, not the lockup.

  ⚠️ Every pixel figure above is Chromium with the playground's Outfit-600 wordmark and `--font-family-sans` subtext, and **none of it is pinned by a test** — the Logo tests assert stylesheet text, not geometry. Retuning `--font-size-*` or swapping the brand font invalidates these numbers with nothing going red. Treat them as the shape and rough scale of the change and re-measure in your own face before sizing anything to them.
