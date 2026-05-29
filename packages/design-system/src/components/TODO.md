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

### [ ] `<AuthScreen>` (or `<AuthLayout>`) — full-viewport centered surface with a tinted backdrop for auth pages

**Filed:** 2026-05-29
**Mocked in:**

- `packages/playground/src/pages/mockups/Login/Login.tsx:51` — outer full-bleed wrapper (gradient backdrop, flex column, full viewport height)
- `packages/playground/src/pages/mockups/Login/Login.tsx:69` — card-centering region (flex: 1, grid place-items center)

**What's needed:**
A page-level layout primitive for sign-in / forgot-password / accept-invite screens: takes over the full viewport (`min-height: 100vh`), paints a subtle token-based backdrop (default a soft accent wash), and lays out three slots — an optional top bar (back-link / brand), a vertically + horizontally centered main slot (the auth card), and an optional footer (legal links). Props sketch: `backdrop?: 'plain' | 'tinted'`, plus `header` / `footer` slots and `children` (the centered content). No interactive state. The real eocrm app has an `AuthCardLayout` serving exactly this role, so the CRM will want it too.

**Current workaround:**
Two raw `<div style={{…}}>` at the exact mock site, token-only values: the outer wrapper (`min-height: 100vh; display: flex; flex-direction: column; padding: var(--space-6); background: radial-gradient(120% 90% at 50% -8%, var(--color-accent-subtle-bg) 0%, var(--color-bg-subtle) 52%)`) and the centering region (`flex: 1; display: grid; place-items: center`). Marked with the standard TODO comment.

**When this ships:** refactor the Login mockup's two wrapper `<div>`s to use the primitive, then tick this checkbox.

### [ ] `<BrandIcon>` / social-login icon set — multi-color brand marks (Google, Microsoft, Apple…)

**Filed:** 2026-05-29
**Mocked in:**

- `packages/playground/src/pages/mockups/Login/Login.tsx:89` — the Google "G" inside the "Continue with Google" SSO button.

**What's needed:**
A small set of brand / social-provider marks for SSO buttons. These are multi-color, fixed-brand-color assets (Google's 4-color "G", etc.) that intentionally do **not** map to design tokens — brand guidelines mandate the exact colors. `lucide-react` (the demo icon set) has no brand logos. Could ship as a tiny `<GoogleIcon>` / `<BrandIcon name="google">` component or an assets module.

**Current workaround:**
A hand-authored inline `<svg viewBox="0 0 48 48">` with four `<path fill="#…">` brand-hex colors at the exact mock site, `aria-hidden="true"`. Marked with the standard TODO comment. (Note: brand hex is correct here — this is the documented exception to token-only color.)

**When this ships:** refactor the Login SSO button to use the brand icon, then tick this checkbox.

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

### [ ] `<Box>` (or `<Constrain>`) — width-constrained container for flex children

**Filed:** 2026-05-25
**Mocked in:**

- `packages/playground/src/pages/mockups/Members/Members.tsx` — the Progress + Upgrade-button cluster on the seats card. Progress is `width: 100%` of its parent; inside a `<Cluster>` (flex row, no explicit width) it collapses to 0. The original mockup gave that wrapper `min-width: 320px`.

**What's needed:**
A layout primitive that takes a `width` / `minWidth` / `maxWidth` prop and applies it to its container. Could also be the place to land a `flex` prop for "grow into remaining space in a parent flex row." Today, `<Cluster>` and `<Stack>` follow Rule 4 and can't carry any width tokens — they're spacing-only primitives.

Adjacent gaps that this would close:

- Members search Input — original had `max-width: 320px`; current refactor lets it stretch full-width (deliberate adoption gap, acceptable but worth fixing).
- Contacts search Input — same pattern.
- Any time a Progress / Slider / Input needs a defined intrinsic width inside a flex row.

Props sketch: `width?`, `minWidth?`, `maxWidth?` (all strings — token names or px values), `flex?: 'grow' | 'shrink' | 'auto' | number`, plus passthrough children.

**Current workaround:**
A raw `<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: '320px' }}>` at the exact mock site, with the standard TODO comment.

**When this ships:** refactor the Members seats card and re-evaluate the search-input constraints across mockups, then tick this checkbox.

## Closed

### [x] `<FilterChip>` — dismissible "active filter" pill

**Filed:** 2026-05-26
**Shipped:** 2026-05-26
**Mocked in:**

- `packages/playground/src/pages/mockups/Audit/Audit.tsx` — filter chip row (now uses real `<FilterChip>`)

Shipped as a standalone primitive `<FilterChip>` (not as a Badge variant) — the compound API (`<FilterChip.Label>` + `<FilterChip.Value>`) and the dedicated white-pill geometry mapped poorly onto Badge's solid-fill shape. The Audit mockup's chip row was refactored to drop the Hard rule 6 escape hatch (no more `role="button"` + `tabIndex={0}` + inline `cursor: pointer` on a `<Badge>`); the dismiss control is now keyboard-accessible via the chip's built-in dismiss button. See `packages/design-system/src/components/FilterChip/`.

### [x] `<MutedBox>` — non-Card subdued-background container

**Filed:** 2026-05-25
**Mocked in:**

- `packages/playground/src/pages/mockups/Deals/Deals.tsx` — each kanban column needs a `--color-bg-muted` background so the columns read as distinct lanes against the white page background.

**What's needed:**
A simple container with `padding` and a tinted background — the Kanban-column / sidebar-region / chat-bubble pattern. `<Card>` is the wrong primitive: Card is a bordered, white-background surface for "elevated content," and its `tone` prop only paints a left-edge stripe. What's needed here is the inverse: a "subdued region" that recedes against the page. Props: `padding?: 'none' | 'sm' | 'md' | 'lg'`, `tone?: 'muted' | 'sunken' | 'subtle'` (controlling which bg token applies), `radius?: 'sm' | 'md' | 'lg' | 'none'`, plus `children`. No border (or optional `bordered`).

The name `<MutedBox>` is a placeholder — could also land as `<Surface>` / `<Region>` / `<Lane>` depending on which metaphor wins.

**Current workaround:**
Inline `style={{ background: 'var(--color-bg-muted)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}` on a `<div>` (or wrapping `<Stack>` if a child needs vertical rhythm). Marked with the standard TODO comment.

**When this ships:** refactor the Deals mockup column-wrapper sites, then tick this checkbox.

**Resolved:** absorbed by `<Kanban.Column>`'s built-in muted-background styling (commit `08853a3`). Deals mockup migrated to use `<Kanban>` in the same PR.
