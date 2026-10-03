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

- `tone`: `neutral` (default) / `info` / `success` / `warning` / `danger` / `purple`. Semantic. Use for status (Active / Won / Churned / Lead / Enterprise).
- `color`: optional `PaletteColor` (30 named colors). Categorical — no semantic meaning. Use for tag-like labels where the 6 tones aren't enough (audit event namespaces, team tags, project labels). Takes precedence over `tone` when both are set. Works for both `filled` and `stripe` variants (stripe's left border picks up the palette fg).
- `size`: `md` (20, default) / `sm` (16). `md` is the uppercase tracked "loud label" pill. `sm` drops the uppercase + tracking and renders case as-typed — use it for dense table cells, compact toolbars, or anywhere the uppercase treatment shouts next to body copy.
- `variant`: `filled` (default) / `stripe`. `filled` is the standard pill. `stripe` renders a rectangular block with a tone-colored 3px left stripe and a softly tinted body — no uppercase or letter-spacing. Use for category markers or sidebar labels where pill emphasis is too loud. Composes with both `tone` (6 semantic) and `color` (30 palette).
- `dot`: `start` / `end` — adds a small filled circle in the badge's text color before or after the content. Use for Slack/GitHub-style status indicators (`<Badge tone="success" dot="start">Online</Badge>`). Decorative only (`aria-hidden`); the text is still the accessible label.
- `align`: `baseline` (default) / `middle`. Use `align="middle"` for a badge inside a heading line (`<Title>` / `<PageHeader.Title>`) — pairs with `<Text size="inherit">` — so it centers on the line box instead of riding the heading's baseline and looking sunken next to large text.
- **Non-interactive.** If it's clickable, use `<Button>` instead.
- Doesn't auto-add `role="status"`. Wrap in `aria-live` if a state change should be announced. **This is not an inconsistency with `EntityChip`, which announces its own state** — a Badge tone is a durable property of the row you are looking at, not a change that happens while you are elsewhere, so there is nothing for the component to announce. See [Transient state and screen readers](../../AI-PRIMER.md#transient-state-and-screen-readers) for the rule both follow.
