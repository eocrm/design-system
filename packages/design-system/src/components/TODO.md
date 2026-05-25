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

### [ ] `<StatTile>` (or `<IconTile>`) — tinted square (or circle) containing a centered icon

**Filed:** 2026-05-25
**Mocked in:**

- `packages/playground/src/pages/mockups/Dashboard/Dashboard.tsx` — used as the trailing element inside each stat Card (label / value / Badge column on the left, tile on the right). Rounded-square shape.
- `packages/playground/src/pages/mockups/Members/Members.tsx` — leading icon on each pending-invitation row in the Invitations table. Circular shape, warning tone.

**What's needed:**
A size-prop-driven container (default 32×32) that centers an icon child. Tinted background matching a `tone` prop (`accent` / `success` / `warning` / `danger` / `info` / `neutral`), with the icon color picking up the tone's accent. Props: `icon: ReactNode` (or just `children`), `tone?: Tone`, `size?: 'sm' | 'md' | 'lg'`, `shape?: 'square' | 'circle'` (default `'square'`). No interactive state — purely decorative.

Distinct from `<Avatar>` (initials / image) and `<Badge>` (text-bearing chip). The closest current primitive is a Cluster around a lucide icon, but that doesn't give the tinted-bg square / circle shape.

**Current workaround:**
Inline `style={...}` on a `<div>` (or `<span>`) with `display: grid; place-items: center; width/height: var(--size-md); border-radius: var(--radius-md | --radius-full); background: var(--color-*-bg); color: var(--color-*)`. Marked with the standard TODO comment.

**When this ships:** refactor the Dashboard and Members mocks in the files above, then tick this checkbox.

### [ ] `<NavCard>` — clickable Card with router/href navigation, hover affordance, full-area click target

**Filed:** 2026-05-25
**Mocked in:**

- `packages/playground/src/pages/mockups/MockupsIndex.tsx` — grid of cards linking to each mockup page.

**What's needed:**
A Card variant whose entire surface is a single click target (anchor or button), with hover affordance (border-color shift + shadow elevation) and proper `:focus-visible` keyboard ring. Should accept either `href` (renders `<a>`) or `to` for router integration (consumer-supplied LinkComponent prop — same pattern Mantine / Chakra use to stay router-agnostic). Props: `href?: string`, `onClick?`, `LinkComponent?`, plus all standard Card props (`padding`, `tone`). Children render inside the card body as usual.

Distinct from `<Button>` (text + icon, not a layout container) and plain `<Card>` (no click semantics). The router-aware variant matters because the library can't depend on `react-router-dom` (it's a playground-only dep per Rule 5), but consumers need a way to plug their own Link in.

**Current workaround:**
`<Link>` from `react-router-dom` wraps a `<Card>` with inline `style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}` to suppress default anchor styling. No hover affordance — the underlying Card doesn't change on hover the way the previous hand-rolled link-card did.

**When this ships:** refactor the MockupsIndex mock in the file above (and any other mockup-index pages that follow the same grid-of-clickable-cards pattern), then tick this checkbox.

### [ ] `<MutedBox>` — non-Card subdued-background container

**Filed:** 2026-05-25
**Mocked in:**

- `packages/playground/src/pages/mockups/Deals/Deals.tsx` — each kanban column needs a `--color-bg-muted` background so the columns read as distinct lanes against the white page background.

**What's needed:**
A simple container with `padding` and a tinted background — the Kanban-column / sidebar-region / chat-bubble pattern. `<Card>` is the wrong primitive: Card is a bordered, white-background surface for "elevated content," and its `tone` prop only paints a left-edge stripe. What's needed here is the inverse: a "subdued region" that recedes against the page. Props: `padding?: 'none' | 'sm' | 'md' | 'lg'`, `tone?: 'muted' | 'sunken' | 'subtle'` (controlling which bg token applies), `radius?: 'sm' | 'md' | 'lg' | 'none'`, plus `children`. No border (or optional `bordered`).

The name `<MutedBox>` is a placeholder — could also land as `<Surface>` / `<Region>` / `<Lane>` depending on which metaphor wins.

**Current workaround:**
Inline `style={{ background: 'var(--color-bg-muted)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}` on a `<div>` (or wrapping `<Stack>` if a child needs vertical rhythm). Marked with the standard TODO comment.

**When this ships:** refactor the Deals mockup column-wrapper sites, then tick this checkbox.

## Closed

_(filled as entries are resolved.)_
