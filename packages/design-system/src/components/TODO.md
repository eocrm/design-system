# Component TODOs — gaps surfaced by mockups

This file tracks **missing library primitives** that mockup authors needed but couldn't find in the existing component set. Each entry was filed when a mockup hit a wall and had to fall back to inline HTML / styles (which Hard rule 6 in `packages/playground/CLAUDE.md` otherwise forbids).

When a primitive listed here ships, follow the "Mocked in" link, refactor the mockup to use the real primitive, and tick the checkbox. Don't delete the entry — leave it ticked as a historical record of what drove the primitive.

## Entry format

```markdown
## [ ] `<PrimitiveName>` — one-line description

**Filed:** YYYY-MM-DD
**Mocked in:**

- `packages/playground/src/pages/mockups/<Path>.tsx:<line>`

**What's needed:**
What the primitive should do in user terms — props, behavior, accessibility expectations.

**Current workaround:**
How the mockup hacks around the gap right now. Be specific so the reviewer can verify the workaround when the primitive replaces it.

**When this ships:** refactor the mocked-in locations to use the new primitive, then tick this checkbox.
```

Keep entries terse but specific. The "Mocked in" path is load-bearing — the implementer needs it to find the existing hack.

## Open

### [ ] `<StatTile>` (or `<IconTile>`) — accent-tinted square containing a centered icon

**Filed:** 2026-05-25
**Mocked in:**

- `packages/playground/src/pages/mockups/Dashboard/Dashboard.tsx` — used as the trailing element inside each stat Card (label / value / Badge column on the left, tile on the right).

**What's needed:**
A 32×32 (or size-prop-driven) rounded-square container that centers an icon child. Tinted background matching a `tone` prop (`accent` / `success` / `warning` / `danger` / `info` / `neutral`), with the icon color picking up the tone's accent. Props: `icon: ReactNode` (or just `children`), `tone?: Tone`, `size?: 'sm' | 'md' | 'lg'`. No interactive state — purely decorative.

Distinct from `<Avatar>` (initials / image) and `<Badge>` (text-bearing chip). The closest current primitive is a Cluster around a lucide icon, but that doesn't give the tinted-bg square shape.

**Current workaround:**
Inline `style={...}` on a `<div>` with `display: grid; place-items: center; width/height: var(--size-md); border-radius: var(--radius-md); background: var(--color-accent-subtle-bg); color: var(--color-accent)`. Marked with the standard TODO comment.

**When this ships:** refactor the Dashboard mock in the file above, then tick this checkbox.

## Closed

_(filled as entries are resolved.)_
