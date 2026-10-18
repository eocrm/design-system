# `<HighlightedText>` — `Text` with matched runs in `<mark>`

**TL;DR:** render a plain-text excerpt (e.g. a search result) and highlight the matched substrings. Takes the same props as `Text`, plus `text` and `ranges` (UTF-16 offsets, as most search APIs return them).

```tsx
<HighlightedText
  text={result.excerpt}
  ranges={result.highlights} // [{ start: 12, length: 5 }]
  size="sm"
  tone="muted"
  lineClamp={2}
/>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `text` | `string` | yes | The plain text to render. Always rendered as text, never parsed as HTML — safe for untrusted search excerpts. |
| `ranges` | `readonly HighlightRange[]` | no | Runs of `text` to highlight, as `{ start, length }` in UTF-16 code units (JavaScript string offsets — what most search APIs return). Out-of-range runs are clamped, empty ones dropped, overlapping or touching ones merged. Order doesn't matter. Defaults to `[]` (plain text). |
| `htmlFor` | `string` | no | Associates a `<label>` with its form control. Only meaningful when `as="label"` — passes through as the native `for` attribute. |
| `as` | `'p' \| 'span' \| 'div' \| 'label'` | no | Rendered element. Defaults to `'p'` (block, default body text). Use `'span'` for inline runs, `'div'` for block containers that can't be a `<p>` (e.g. when the body needs nested block-level elements that React would warn about inside `<p>`), `'label'` for form labels (pair with `htmlFor`). |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| 'inherit'` | no | Visual size. Defaults to `'md'` (body text). - `xs` — 11px, dense metadata / captions - `sm` — 12px, small body / labels - `md` — 14px, body text (default) - `lg` — 16px, large body / lead text - `xl` — 20px, very large body (rare) - `inherit` — no fixed size; font-size AND line-height inherit from the parent. For inline runs inside a heading (`as="span"` inside a `<Title>` / `<PageHeader.Title>`) that must keep the heading's size — e.g. a muted task-key prefix. Tone / weight still apply — font-weight stays Text's own (default `regular`), it does NOT inherit; pass `weight` to match the heading if needed. |
| `tone` | `'default' \| 'muted' \| 'subtle' \| 'accent' \| 'danger' \| 'success' \| 'warning'` | no | Color tone. Defaults to `'default'`. - `default` — `--color-fg` - `muted` — `--color-fg-muted` (for secondary copy) - `subtle` — **@deprecated: resolves to `muted`. Use `muted`.** In LIGHT theme the two neutrals were indistinguishable: OKLab ΔE 0.0261 when the deprecation was filed, 0.0365 after `--color-fg-muted` was retuned, against the 0.065 floor this library's perceptual gates use. In DARK they were 0.0707 apart — a real step — so **this deprecation changes dark-theme appearance**: `subtle` text in dark gets lighter, moving from `--color-fg-subtle` to `--color-fg-muted`. That is the accepted trade (a tier that exists in one theme only is not a tier), but it is a visual change, not the removal of a duplicate. `--text-fg-subtle` now aliases `--text-fg-muted`, so nothing breaks at the type or build level; if you need the old dark value back, override `--text-fg-subtle`. - `accent` — `--color-accent` - `danger` / `success` / `warning` — state-coded text |
| `weight` | `'regular' \| 'medium' \| 'semibold' \| 'bold'` | no | Font weight. Defaults to `'regular'`. |
| `align` | `'left' \| 'center' \| 'right'` | no | Text alignment. Defaults to `'left'`. |
| `truncate` | `boolean` | no | Truncate to a single line with ellipsis. Defaults to `false`. Use inside narrow containers (table cells, card list rows). Mutually exclusive with `lineClamp` — if both are set, `lineClamp` wins. |
| `lineClamp` | `number` | no | Clamp to N lines with ellipsis (uses `-webkit-line-clamp`). Defaults to `undefined`. Overrides `truncate` when set. Example: `lineClamp={2}` for a 2-line description that ellipses on the third. If you also pass `style.WebkitLineClamp`, the `lineClamp` prop takes precedence — the component merges the dynamic line-clamp value into `style` AFTER spreading your `style`, so the prop wins. |
| …native | | | plus native HTML attributes |

<!-- props:end -->

- Matches render as native `<mark>` (the HTML highlight role), so forced-colors mode and screen readers that report highlights see them — not just a colour change. Background is `--highlighted-text-mark-bg` (defaults to `--color-palette-yellow-bg`); matched text is always full-strength `--highlighted-text-mark-fg` (`--color-fg`) regardless of `tone` — muted and danger text fail AA contrast on the dark-theme yellow, and the stronger match text reads as emphasis anyway.
- `text` is always rendered as text, never parsed as HTML — safe for untrusted excerpts.
- Ranges are forgiving: unsorted, overlapping, touching, out-of-range and empty ranges are all fine (merged / clamped / dropped).

#### When NOT to use

- ❌ Drawing attention to a whole block, card or field — that's `Highlight` (an attention ring), not a text match.
- ❌ Rich formatted content — `HighlightedText` takes a plain string. For formatted docs use `RichText`.
- ❌ Emphasis that isn't a match (`<strong>`-style importance) — use `Text weight="semibold"`.

#### Anti-patterns

- ❌ Building the `<mark>` spans yourself with `dangerouslySetInnerHTML` from the API's highlighted HTML — XSS risk and no tokens. Pass the plain excerpt + `ranges`.
- ❌ Computing ranges with code-point indices (`[...text]`) — offsets are UTF-16 (`text.slice` / `indexOf` units). Emoji and other astral characters shift otherwise.
- ❌ Restyling the mark with an inline `style` — override `--highlighted-text-mark-bg` instead.
