# `<Badge>` — status / category pill

```tsx
<Badge tone="success">Active</Badge>
<Badge tone="danger">Churned</Badge>

// Stripe variant — rectangular category marker with left stripe:
<Badge variant="stripe" tone="info">Lead</Badge>
<Badge variant="stripe" tone="warning">Renewal due</Badge>

// Categorical palette color (non-semantic) — for tag-like labels:
<Badge color="amber">Marketing</Badge>
<Badge color="teal">Engineering</Badge>
<Badge variant="stripe" color="violet">Design</Badge>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `tone` | `BadgeTone` | no | — | Semantic tone. - `neutral` (default) — generic tag, no semantic meaning. - `info` — new / in-progress / informational states ("Lead", "Pipeline 2026"). - `success` — positive states ("Active", "Won", "Healthy"). - `warning` — at-risk / pending states ("Renewal due", "Pending review"). - `danger` — negative states ("Churned", "Lost", "Blocked"). - `purple` — special / highlighted categories ("Enterprise", "VIP"). |
| `size` | `BadgeSize` | no | — | Pill height and emphasis. - `md` (20px, default) — the standard "loud label" pill. Uppercase, tracked, semibold. Reads as a deliberate status marker. - `sm` (16px) — quieter inline tag for tight table cells, compact toolbars, or anywhere a 20px uppercase pill visually crowds adjacent text. Drops the uppercase transform and caps tracking so it sits next to body copy without shouting; case is preserved as-typed (write `Active`, get `Active`). Same 11px size and semibold weight as `md`. |
| `dot` | `BadgeDot` | no | — | Render a small filled circle in the badge's text color alongside the content. Useful when the dot is the primary status signal and the label is supporting context ("● Active", "Failed ●"). - `start` — dot before the content. - `end` — dot after the content. Omit for no dot. The dot is purely decorative (`aria-hidden`) — the badge text remains the accessible label. |
| `variant` | `BadgeVariant` | no | — | Visual variant. - `'filled'` (default) — solid tone-tinted pill. The standard "loud status" look. - `'stripe'` — rectangular block with a tone-colored left stripe + soft tinted body. Use for category markers or sidebar labels where pill emphasis is too loud. |
| `color` | `PaletteColor` | no | — | Optional categorical palette color. When set, takes precedence over `tone`: the badge fills with the matching `--color-palette-<name>-bg/fg` tokens. Use for non-semantic categorical labels (e.g., audit event namespaces, tag colors) where the 6 semantic tones aren't enough. Both filled and stripe variants are supported; for stripe the left-border picks up the palette `fg` token. |
| `align` | `BadgeAlign` | no | — | Vertical alignment within the surrounding line of text. - `baseline` (default) — rides the text baseline; right for body-size text. - `middle` — centers the badge on the line box; use for a badge inside a heading line (`<Title>` / `<PageHeader.Title>`), where baseline riding makes the badge look sunken next to large text. |
| …native | | | | plus native `<span>` attributes |

<!-- props:end -->

- `tone`: `neutral` (default) / `info` / `success` / `warning` / `danger` / `purple`. Semantic. Use for status (Active / Won / Churned / Lead / Enterprise).
- `color`: optional `PaletteColor` (30 named colors). Categorical — no semantic meaning. Use for tag-like labels where the 6 tones aren't enough (audit event namespaces, team tags, project labels). Takes precedence over `tone` when both are set. Works for both `filled` and `stripe` variants (stripe's left border picks up the palette fg).
- `size`: `md` (20, default) / `sm` (16). `md` is the uppercase tracked "loud label" pill. `sm` drops the uppercase + tracking and renders case as-typed — use it for dense table cells, compact toolbars, or anywhere the uppercase treatment shouts next to body copy.
- `variant`: `filled` (default) / `stripe`. `filled` is the standard pill. `stripe` renders a rectangular block with a tone-colored 3px left stripe and a softly tinted body — no uppercase or letter-spacing. Use for category markers or sidebar labels where pill emphasis is too loud. Composes with both `tone` (6 semantic) and `color` (30 palette).
- `dot`: `start` / `end` — adds a small filled circle in the badge's text color before or after the content. Use for Slack/GitHub-style status indicators (`<Badge tone="success" dot="start">Online</Badge>`). Decorative only (`aria-hidden`); the text is still the accessible label.
- `align`: `baseline` (default) / `middle`. Use `align="middle"` for a badge inside a heading line (`<Title>` / `<PageHeader.Title>`) — pairs with `<Text size="inherit">` — so it centers on the line box instead of riding the heading's baseline and looking sunken next to large text.
- **Non-interactive.** If it's clickable, use `<Button>` instead.
- Doesn't auto-add `role="status"`. Wrap in `aria-live` if a state change should be announced. **This is not an inconsistency with `EntityChip`, which announces its own state** — a Badge tone is a durable property of the row you are looking at, not a change that happens while you are elsewhere, so there is nothing for the component to announce. See [Transient state and screen readers](../../AI-PRIMER.md#transient-state-and-screen-readers) for the rule both follow.
