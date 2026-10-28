# `<AgentAvatar>` — AI agent tile with the acting member

**TL;DR:** a monochrome tile with the agent's mark, plus a badge of the member it acts for. Use it where the agent is the actor and stands alone, such as a Thread or activity node. In a row with a name, use `PersonDisplay.AgentAvatar` instead (see [PersonDisplay](PersonDisplay.md)).

```tsx
// Agent acting for a member: monochrome tile + the member's avatar as a badge
<AgentAvatar name="Scout" member={{ name: 'Sarah Chen', src: '/avatars/sarah.png' }} />

// Agent alone (no `member`): no badge
<AgentAvatar name="Scout" />

// Erased member (`null` or an empty name): placeholder badge, "former member" label
<AgentAvatar name="Scout" member={null} />

// Custom mark; rendered monochrome in the tile
<AgentAvatar name="Scout" mark={<ScoutLogo />} member={{ name: 'Sarah Chen' }} size="lg" />

// Thread node beside a visible byline that already names both: decorative
<Thread.Item node={<AgentAvatar name="Scout" member={{ name: 'Sarah Chen' }} size="sm" decorative />}>
  <PersonDisplay size="inline">
    <PersonDisplay.Name>Scout</PersonDisplay.Name>
    <PersonDisplay.OnBehalfOf>Sarah Chen</PersonDisplay.OnBehalfOf>
  </PersonDisplay>
  …
</Thread.Item>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | yes | Agent label; drives the accessible name (an empty label reads as "?", like `Avatar`). Unused when `decorative`. |
| `mark` | `ReactNode` | no | Agent mark, rendered monochrome in the tile. Defaults to a lucide `Bot`. |
| `member` | `AgentAvatarMember \| null` | no | The member the agent acts for. Omit for an agent alone (no badge); `null` or an empty name for an erased member (placeholder badge). |
| `size` | `'inline' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | no | Diameter, same scale as `Avatar`. The member badge is hidden at `inline`. |
| `decorative` | `boolean` | no | Hide the avatar from assistive tech (`aria-hidden`, no role or label). Use when visible text next to it already names the agent and the member, e.g. a Thread node beside a "Scout for Sarah Chen" byline; otherwise both are announced. Without such text keep the default: a `role="img"` named "{agent}, on behalf of {member}". `PersonDisplay.AgentAvatar` always sets it. Defaults to `false`. |
| …native | | | plus native `<span>` attributes |

<!-- props:end -->

- Same `size` scale as [`Avatar`](Avatar.md). At `inline` the member badge is hidden (too small to read); the label still names the member.
- Accessible name: `role="img"` with `"{agent}, on behalf of {member}"` (localized), `"{agent}, on behalf of a former member"` when erased, or just the agent name when `member` is omitted. An empty `name` reads as `"?"`, as with `Avatar`.
- `decorative`: set it when visible text next to the avatar already names the agent and the member (a Thread node beside a byline). It renders `aria-hidden` with no role or label, so nothing is announced twice. With no such text, keep the default `role="img"`. `PersonDisplay.AgentAvatar` always sets it.

#### When NOT to use

- For a human. A person is an [`Avatar`](Avatar.md) (or `PersonDisplay.Avatar`).
- Next to an agent name in a row. Use `PersonDisplay.AgentAvatar` + `PersonDisplay.OnBehalfOf`, which localize "for {member}" and truncate it.

#### Anti-patterns

- ❌ Leaving the default `role="img"` beside a visible "Scout for Sarah Chen" byline. Screen readers announce the agent and member twice; pass `decorative`.
- ❌ `decorative` with no visible text naming the agent. The avatar then says nothing at all.
- ❌ Recolouring or tinting a brand `mark`. It renders monochrome on purpose; pass the plain glyph.
- ❌ Deriving the brand `mark` from a client-chosen name. Pick the mark from a trusted, server-known agent identity, or an agent can impersonate another product.
