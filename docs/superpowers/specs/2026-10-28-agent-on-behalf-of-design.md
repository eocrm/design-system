# Agent acting on behalf of a member — design (#717)

## Intent

eocrm records which AI agent acted on behalf of a member (a comment, a status
change, a task created by "Claude Code · demo laptop" for Ada Lovelace). Today
the app composes `Avatar` + violet `IconTile(Bot)` + one flat `Text` run. The
result is two coloured marks side by side and no hierarchy between who acted,
who it acted for, and the timestamp. The DS should give every author surface
(comment threads, activity rows, task Reporter field, document lists, the
"Your agents" list) one consistent way to show **both identities**.

Success: eocrm replaces its composed shim with the DS parts. An agent author
reads like a normal `PersonDisplay` author: the agent label is emphasised, and
"for Ada Lovelace" is muted meta.

## Decisions (made with the maintainer)

1. **Extend `PersonDisplay`**; don't add a sibling component. Every author surface
   then gets the same sizes, inline mode and truncation.
2. **Agent-primary.** The agent's mark is the primary avatar, and the member is a
   small overlapping corner badge.
3. **No kind chip.** The brand mark and the label already identify the agent. An
   app that really wants a chip can put a `Badge` in a `PersonDisplay.Description`.
4. **`size="inline"` shows the mark only, with no member badge.** At 1lh a badge
   would be about 8px with illegible initials. At inline the member is carried
   only by the "for …" text.
5. **Name line:** the label and "for …" share **one row** at every size. When
   space runs out, the "for …" part ellipsises first. The label ellipsises only
   when it alone overflows.

## API

### `AgentAvatar` (new, standalone, exported from `src/index.ts`)

Lives in `src/components/Avatar/` beside `Avatar` (it is an avatar variant, not
a new component directory). Usable alone, e.g. as a `Thread.Item` `node`.

```tsx
<AgentAvatar
  name="Claude Code · demo laptop"   // agent label; drives the accessible name
  mark={<ClaudeMark />}              // optional ReactNode (app-supplied SVG)
  member={{ name: 'Ada Lovelace', src: '/ada.png' }} // optional
  size="sm"                          // AvatarSize, same scale as Avatar
/>
```

- `forwardRef<HTMLSpanElement>`; extends `HTMLAttributes<HTMLSpanElement>`, so
  the rest of the props spread onto the root (repo Pattern B: component-owned
  ARIA wins).
- **Tile:** same diameter and shape as `Avatar` at that size. **Neutral**
  background (a neutral surface token via a component token, never the
  name-hashed `--color-avatar-N` palette), so a brand mark is never recoloured.
- **Mark:** rendered at a fixed fraction of the tile (the builder picks the ratio
  so marks read like an icon in the tile), monochrome via `color` = a neutral
  foreground token. Brand SVGs that use `currentColor` follow it. Marks with
  hard-coded fills are the app's responsibility. The wrapper is `aria-hidden`.
- **Fallback mark:** lucide `Bot` (lucide-react is already a peer dependency).
- **Member badge** (sizes `sm` and up, never `inline`): a real `<Avatar>` of the
  member (photo, or initials on its hashed colour), at roughly 40–50% of the
  tile, overlapping the bottom-right corner with a surface-coloured ring, the
  same idea as the presence dot / in-group ring. `aria-hidden`. Positioning is an
  internal child, so it uses the same Rule 4 escape hatch Avatar's presence dot
  uses. Exact badge sizes per avatar size are the builder's call; tokenise them
  in `Avatar.tokens.scss`.
- **Three member states** (maintainer decision). `member?: { name: string; src?: string } | null`:
  - `undefined` (omitted) → **agent alone**: no badge. Used for the "Your
    agents" list and for agents acting for nobody.
  - `null`, or an object with an empty `name` → **erased member**: the badge is a
    neutral placeholder (neutral bg + generic lucide `User` glyph), never
    initials of "?".
  - `{ name, src? }` → a normal member badge.
- **Accessible name (standalone):** `role="img"`, `aria-label`:
  - agent alone → `{agent}`
  - member → i18n `avatar.agent.onBehalfOf` → "{agent}, on behalf of {member}"
  - erased → `avatar.agent.onBehalfOfFormer` → "{agent}, on behalf of a former
    member". (en + ru.)
- Not supported (YAGNI): `status`, `tooltip`, `src` for the agent itself.

### `PersonDisplay.AgentAvatar`

A thin wrapper (same pattern as `PersonDisplay.Avatar`): it takes `size` from
the PersonDisplay context, and Root sorts it into the avatar slot exactly like
`PersonDisplay.Avatar`. **Inside a PersonDisplay it is decorative**
(`aria-hidden="true"`, no role/label), because the visible Name + OnBehalfOf
text already carries both identities and would otherwise be announced twice.

### `PersonDisplay.OnBehalfOf`

```tsx
<PersonDisplay size="md">
  <PersonDisplay.AgentAvatar name="Claude Code · demo laptop" mark={<ClaudeMark />}
    member={{ name: 'Ada Lovelace', src }} />
  <PersonDisplay.Name>Claude Code · demo laptop</PersonDisplay.Name>
  <PersonDisplay.OnBehalfOf>Ada Lovelace</PersonDisplay.OnBehalfOf>
</PersonDisplay>
```

- Renders muted "for {children}" through i18n (`personDisplay.onBehalfOf` →
  "for {member}"). With no or empty children it renders
  `personDisplay.onBehalfOfFormer` → "for a former member".
- Muted tone, regular weight, the same text size as the Name at that size. At
  `inline` it inherits size like the Name and is muted.
- Children are a `ReactNode` (an app may pass a `Link` to the member). So the
  "for" prefix is rendered as its own string next to the children, not
  interpolated into one `t()` string. `t()` returns plain strings.
- **Russian copy** (my call; the DS can't inflect arbitrary names, so the form is
  case-neutral): prefix "от имени:" → "от имени: Ada Lovelace". Former member:
  "от имени бывшего участника". Accessible name: "{agent}, от имени: {member}" /
  "{agent}, от имени бывшего участника".

## Layout

- When a `PersonDisplay` contains an `OnBehalfOf`, the Root puts `Name` and
  `OnBehalfOf` into **one row** inside the column (Descriptions still stack
  below). Within that row:
  - `Name` keeps its intrinsic width up to the available width (lower flex-shrink),
    then ellipsises.
  - `OnBehalfOf` shrinks first (`min-width: 0`, ellipsis, `white-space: nowrap`).
  - Small gap between them (a space token).
  - **"for …" never shrinks to nothing** (my call, from the builder check). At
    `inline` it is the only place the member appears. `OnBehalfOf` has a
    minimum width of a few characters plus the ellipsis (e.g. `min-width:
    min(<token-ish ~6ch>, max-content)`). Below that, `Name` gives way and
    ellipsises.
  - Each ellipsised element carries its full text in `title` **only when its
    children are a string** (builder's call on the exact mechanism; don't
    measure overflow in JS).
  - **Focus rings on links aren't clipped** (my call). `Name` (with `href`) and a
    `Link` inside `OnBehalfOf` sit inside an ellipsis container that reserves
    the focus-ring extent with inline/block padding (padding inside the
    `overflow: hidden` box). The ring then paints inside the clip, and no new
    entries go into `tests/focus-ring-geometry.baseline.json`. The
    focus-ring-geometry test must still pass unchanged.
- PersonDisplays without `OnBehalfOf` must render byte-for-byte as they do today
  (no extra wrapper). This keeps the snapshot/DOM tests and consumers stable.
- Must hold in a ~360px side card with long label + long member name at `sm`,
  `md` and `inline` (demo shows this).
- Tokens only; no layout properties on the component beyond what Rule 4 allows
  for internal children.

## Out of scope

- A kind chip; per-brand colours; picking a brand from a client name (eocrm
  picks the mark from the verified OAuth redirect host and passes it in).
- Member-primary layout.
- Shipping brand SVGs in the DS.

## Definition of done (Core invariant)

`PersonDisplay` and `Avatar` already exist, so this is an extension, not a new
component:

- Unit tests: `AgentAvatar` (fallback mark, custom mark, badge present/absent
  at inline, erased placeholder, standalone accessible name en + former,
  ref/prop spread) and `PersonDisplay` (OnBehalfOf text, former-member text,
  AgentAvatar `aria-hidden` inside PersonDisplay, the no-OnBehalfOf DOM
  unchanged, row structure).
- Playground: an "Agent on behalf of" section on the existing `PersonDisplay`
  demo (all sizes, a fallback mark, a sample brand mark, erased member, a
  360px card with long names, an activity-row example after an event
  `IconTile`, a `Thread.Item` node example), plus an `AgentAvatar` section on the
  `Avatar` demo. No new route needed unless the builder finds the demos lack a
  natural home.
- `AgentAvatar` exported from `src/index.ts` (and the Avatar barrel).
- Docs: update `docs/components/PersonDisplay.md` and `docs/components/Avatar.md`
  (usage + anti-patterns: don't use for humans, don't recolour brand marks), then
  `npm run build:docs`. Update the AI-PRIMER lines if their summaries change.
- Manifest: add `AgentAvatar` to the appropriate CLUSTERS entry in **both**
  `src/_meta/manifest.ts` and `scripts/generate-manifest.mjs`, then
  `npm run build:manifest`.
- i18n keys in `en.ts`, `ru.ts`, `messages.ts`.
- Transient-state a11y skill: not applicable (no async state).
