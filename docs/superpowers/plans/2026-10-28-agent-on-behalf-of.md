# Agent on behalf of a member — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `AgentAvatar`, `PersonDisplay.AgentAvatar` and `PersonDisplay.OnBehalfOf` so that eocrm can show "agent X acted for member Y" on every author surface (#717).

**Architecture:** `AgentAvatar` lives beside `Avatar` in `src/components/Avatar/`. It is a neutral tile holding an app-supplied mark (fallback lucide `Bot`), with a real `<Avatar>` of the member as a corner badge. `PersonDisplay` gains a context-sized `AgentAvatar` wrapper (decorative inside PersonDisplay) and an `OnBehalfOf` part. When `OnBehalfOf` is present, Root puts `Name` and `OnBehalfOf` into one truncating row.

**Tech Stack:** React 18 + TS, SCSS modules + component tokens, Vitest + Testing Library, lucide-react, Playwright (focus-ring geometry spec).

**Spec:** `docs/superpowers/specs/2026-10-28-agent-on-behalf-of-design.md` (read it; this plan only adds decisions on top).

## Global Constraints

- Read `CLAUDE.md` (root) and `packages/design-system/CLAUDE.md` before coding. Tokens-only SCSS; components don't own layout (Rule 4). Internal-child `position: absolute` is allowed only on the escape-hatch pattern Avatar's `.presence` uses; `forwardRef` + prop spread; i18n via `useTranslation`.
- Tests run from `packages/design-system` (`npx vitest run <path>`), not the repo root.
- Copy (exact):
  - en: `avatar.agent.onBehalfOf` → `${agent}, on behalf of ${member}`; `avatar.agent.onBehalfOfFormer` → `${agent}, on behalf of a former member`; `personDisplay.onBehalfOfPrefix` → `for`; `personDisplay.onBehalfOfFormer` → `for a former member`.
  - ru: `${agent}, от имени: ${member}`; `${agent}, от имени бывшего участника`; `от имени:`; `от имени бывшего участника`.
- `member` prop: `undefined` = agent alone (no badge); `null` or `{ name: '' }` = erased (placeholder badge, lucide `User`); `{ name, src? }` = member badge.
- No member badge at `size="inline"`, in any member state.
- PersonDisplay output without `OnBehalfOf` must be DOM-identical to today.
- Branch: `git checkout main && git pull && git checkout -b feat/agent-on-behalf-of` (the plan and spec docs are committed on this branch).

## Review Focus

1. **Long label + long member at 360px, at `inline`.** "for …" stays visible (≥ a few chars + ellipsis) and Name ellipsises. Owned by Task 2 (compiled-CSS assertion) and Task 3 (visual check).
2. **A `Link` inside `OnBehalfOf` / a `Name href` in the truncating row.** The focus ring isn't clipped, and `tests/focus-ring-geometry.spec.ts` passes with no new baseline entries. Owned by Task 3.
3. **A brand mark SVG with no `currentColor` and a fixed `width`/`height`** still fits the tile (the mark wrapper constrains `svg` to its box). Owned by Task 1.
4. **`AgentAvatar` with consumer `aria-label` / `role` props.** Component-owned ARIA wins standalone. Inside PersonDisplay it stays `aria-hidden`. Owned by Tasks 1 and 2.
5. **Erased member via `{ name: '' }` / whitespace-only name** is treated like `null`. Owned by Task 1.

---

### Task 1: `AgentAvatar` + i18n

**Files:**

- Create: `packages/design-system/src/components/Avatar/AgentAvatar.tsx`, `AgentAvatar.module.scss`, `AgentAvatar.test.tsx`
- Modify: `src/components/Avatar/Avatar.tokens.scss` (agent tokens), `src/components/Avatar/index.ts`, `src/index.ts:140-141`, `src/i18n/messages.ts:481`, `src/i18n/en.ts:223`, `src/i18n/ru.ts:226`

**Interfaces:**

- Produces:

  ```ts
  export interface AgentAvatarMember {
    name: string;
    src?: string;
  }
  export interface AgentAvatarProps extends HTMLAttributes<HTMLSpanElement> {
    name: string; // agent label
    mark?: ReactNode; // default <Bot />
    member?: AgentAvatarMember | null; // see Global Constraints
    size?: AvatarSize; // default 'md', like Avatar
    /** internal: PersonDisplay passes true; renders aria-hidden, no role/label */
    decorative?: boolean;
  }
  export const AgentAvatar: ForwardRefExoticComponent<
    AgentAvatarProps & RefAttributes<HTMLSpanElement>
  >;
  ```

  The DOM has root `span[data-agent-avatar]`, a mark wrapper `[data-part="mark"]` (aria-hidden), and a badge `[data-part="badge"]` (aria-hidden, contains an `<Avatar>` or a placeholder with `data-erased`).
  i18n: `t('avatar.agent.onBehalfOf', { agent, member })`, `t('avatar.agent.onBehalfOfFormer', { agent })`, `t('personDisplay.onBehalfOfPrefix')`, `t('personDisplay.onBehalfOfFormer')`. Add a `personDisplay` section to messages/en/ru if absent.

- [ ] **Step 1: Write failing tests** in `AgentAvatar.test.tsx`:
  - `renders the Bot fallback when no mark` → `container.querySelector('[data-part="mark"] svg')` exists.
  - `renders a custom mark` → `<AgentAvatar name="Claude Code" mark={<svg data-testid="m" />} />` shows `getByTestId('m')`.
  - `agent alone: no badge, label is the agent` → `getByRole('img', { name: 'Claude Code' })`; no `[data-part="badge"]`.
  - `member: badge with the member Avatar, label "on behalf of"` → `getByRole('img', { name: 'Claude Code · demo laptop, on behalf of Ada Lovelace' })`; the badge contains text `AL`; the badge is `aria-hidden="true"`.
  - `erased via null / '' / '  '` (it.each) → `[data-part="badge"][data-erased]` exists; name `'Claude Code, on behalf of a former member'`.
  - `no badge at size inline` (it.each over the three member states) → no `[data-part="badge"]`; the accessible name is still the full label.
  - `decorative: aria-hidden, no role` → `container.firstChild` has `aria-hidden="true"` and no `role`/`aria-label`.
  - `component ARIA wins over consumer props` → passing `aria-label="x" role="button"` still yields `role="img"` with the computed name.
  - `forwards ref and spreads className/data attrs`.
  - `ru copy` → wrapped in the repo's locale provider with `ru-RU` (pattern: `Banner.test.tsx` `wrap()`), name `'Claude Code, от имени: Ada Lovelace'`.
  - Compiled-stylesheet assertion (pattern: `Avatar.test.tsx` `compiledRule`): the mark wrapper rule constrains `svg` (`width: 100%`/`height: 100%` or equivalent tokens), and the tile background uses an `--agent-avatar-bg` token, never `--color-avatar-`.
- [ ] **Step 2:** `cd packages/design-system && npx vitest run src/components/Avatar/AgentAvatar.test.tsx` → FAIL (module not found).
- [ ] **Step 3: Implement.** Reuse `Avatar`'s size classes and tokens for the tile diameter. Add the tokens `--agent-avatar-bg` (neutral surface, e.g. `var(--color-bg-muted)`), `--agent-avatar-fg` (`var(--color-fg-muted)` or `--color-fg`), `--agent-avatar-mark-size-{sm,md,lg,xl,inline}` (a fraction of the tile), `--agent-avatar-badge-size-{sm,md,lg,xl}` (~40–50% of the tile, mapped to existing size tokens where possible), and a badge ring reusing `--avatar-presence-ring-width/color`. The badge is positioned like `.presence` (bottom-right, absolute inside the relative root). The badge Avatar renders with a size class that the badge size overrides; pick the least-hacky way (e.g. render `<Avatar size="sm">` inside a sized badge box whose CSS forces the inner avatar to 100%). Trim the member name before deciding the erased state.
- [ ] **Step 4:** Run the same command → PASS. Run `npx vitest run src/components/Avatar` → all PASS.
- [ ] **Step 5: Commit** `feat(Avatar): AgentAvatar — agent mark with member badge (#717)`.

### Task 2: `PersonDisplay.AgentAvatar` + `PersonDisplay.OnBehalfOf`

**Files:**

- Modify: `src/components/PersonDisplay/PersonDisplay.tsx`, `PersonDisplay.module.scss`, `PersonDisplay.tokens.scss`, `PersonDisplay.test.tsx`, `index.ts`, `src/index.ts:204-211`

**Interfaces:**

- Consumes: `AgentAvatar`, `AgentAvatarProps`, and the i18n keys from Task 1.
- Produces:

  ```ts
  export interface PersonDisplayAgentAvatarProps extends Omit<
    AgentAvatarProps,
    'size' | 'decorative'
  > {}
  export interface PersonDisplayOnBehalfOfProps extends HTMLAttributes<HTMLSpanElement> {
    children?: ReactNode;
  }
  PersonDisplay.AgentAvatar;
  PersonDisplay.OnBehalfOf;
  ```

  Root: `PersonDisplay.AgentAvatar` children are sorted into the avatar slot (like `PersonDisplay.Avatar`). If any child is `PersonDisplay.OnBehalfOf`, Root wraps the `Name` + `OnBehalfOf` children in `<div className={styles.agentRow}>` as the first column item, and the Descriptions follow. Otherwise the output is unchanged.

- [ ] **Step 1: Write failing tests** in `PersonDisplay.test.tsx`:
  - `OnBehalfOf renders "for" + member` → the row text contains `for` and `Ada Lovelace`; its element is in `.agentRow` together with the Name.
  - `OnBehalfOf with no children renders "for a former member"`.
  - `OnBehalfOf accepts a Link child` → `getByRole('link', { name: 'Ada Lovelace' })`.
  - `AgentAvatar inside PersonDisplay is aria-hidden and sized from context` (it.each over sizes) → no `img` role in the tree from it; at `inline` there's no badge, and at `md` the badge is present.
  - `without OnBehalfOf the DOM is unchanged` → snapshot the existing `Avatar`+`Name`+`Description` composition _before_ the change (write this test first and let it pass against the current code), and it must still pass after.
  - `title carries the full text when children are strings` → Name/OnBehalfOf truncating elements have `title="Claude Code · demo laptop"` / `title="for Ada Lovelace"`; no `title` when children aren't a string.
  - `ru prefix` → `от имени:`.
  - Compiled-stylesheet assertions (Review Focus 1): the `.agentRow` rule is `display: flex` + `min-width: 0`; the OnBehalfOf rule has `flex-shrink` greater than Name's (it shrinks first) and a `min-width` built from the `--person-display-on-behalf-of-min-width` token; both truncating rules use `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap` on a **block** container (the existing comment explains why flex containers don't paint the ellipsis), plus padding from ring tokens (`--ring-width` + `--ring-offset`) with a matching negative inline/block margin compensation **on the internal element only**, so the focus ring paints inside the clip.
- [ ] **Step 2:** `npx vitest run src/components/PersonDisplay` → the new tests FAIL; the DOM-unchanged test PASSES.
- [ ] **Step 3: Implement.** OnBehalfOf: muted `Text` at `DESCRIPTION`-tier tone but the **same size as Name** (inline → inherit), regular weight. The prefix and the children are separate nodes (`{t('personDisplay.onBehalfOfPrefix')} {children}`). Add the token `--person-display-on-behalf-of-min-width` (~6ch, expressed via a size token or `calc` over existing tokens per the tokens rule; if no token fits, add a component token whose value the stylelint token rule accepts) and the row gap token `--person-display-agent-row-gap: var(--space-1)`. Name in the agent row: `flex-shrink: 1` and OnBehalfOf: `flex-shrink: 100` (or `flex: 0 100 auto`), so Name gives way only once OnBehalfOf hits its min-width.
- [ ] **Step 4:** `npx vitest run src/components/PersonDisplay src/components/Avatar` → PASS.
- [ ] **Step 5: Commit** `feat(PersonDisplay): AgentAvatar + OnBehalfOf parts (#717)`.

### Task 3: Playground demos + focus-ring geometry

**Files:**

- Modify: `packages/playground/src/pages/components/PersonDisplayDemo.tsx`, `packages/playground/src/pages/components/AvatarDemo.tsx`
- Possibly modify: `tests/focus-ring-geometry.baseline.json` — **only** if entries for existing controls shift; adding new clipped entries is a failure of Task 2's padding approach, so go back and fix the CSS.

**Interfaces:**

- Consumes: the `@eocrm/design-system` exports `AgentAvatar` and `PersonDisplay.AgentAvatar/OnBehalfOf`.

- [ ] **Step 1: PersonDisplay demo section "Agent on behalf of a member"**, following the page's existing section/`DemoLayout` pattern:
  - Each size (`inline`, `sm`, `md`, `lg`) with a sample brand mark: an inline monochrome `currentColor` SVG defined in the demo file, generic and not a real brand logo (e.g. a sparkle).
  - The fallback mark.
  - All three member states (alone, member with photo/initials, erased).
  - A 360px-wide `Card` with a long label + long member at `sm`, `md` and `inline`.
  - An activity row: event `IconTile` + `size="inline"` PersonDisplay + muted timestamp + the action on the line below.
  - A `Thread.Item` with `node={<AgentAvatar size="sm" …/>}`.
  - One `OnBehalfOf` with a `Link` child and a `Name href`.
- [ ] **Step 2: Avatar demo section "AgentAvatar"**: sizes × member states.
- [ ] **Step 3: Visual check** on a dev server at port ≥ 8090 (never the default port) with Playwright: screenshot the new sections in light + dark. Verify Review Focus 1 (at inline, "for …" visible at 360px), that the badge doesn't cover the mark, and that the neutral tile doesn't tint the mark. Kill the Playwright Chrome afterwards.
- [ ] **Step 4:** Run the focus-ring geometry spec exactly as the repo's script/Makefile does (find it in the root `package.json`/`Makefile`) → PASS, with no new baseline entries for the new demos.
- [ ] **Step 5:** `make lint` → PASS. **Commit** `feat(playground): agent-on-behalf-of demos (#717)`.
- [ ] **Step 6 (controller, not subagent):** leave the dev server running and give the maintainer the live playground link to check before the PR is opened.

### Task 4: Docs, primer, manifest

**Files:**

- Modify: `packages/design-system/docs/components/PersonDisplay.md`, `docs/components/Avatar.md`, `AI-PRIMER.md` (Avatar + PersonDisplay index lines), `src/_meta/manifest.ts` + `scripts/generate-manifest.mjs` (add `AgentAvatar: 'Display'` to `CLUSTERS` in both, beside `Avatar`), the generated manifest output; the JSDoc on the new exports is a one-line summary + `@see docs/components/<Name>.md`.

- [ ] **Step 1:** Docs. In PersonDisplay.md, add an "Agent acting for a member" section: usage, the three member states, inline behaviour, the fact that the avatar is decorative inside PersonDisplay. Anti-patterns: don't use for humans; don't recolour brand marks; don't pick the brand from a client-chosen name; don't add a kind chip. Avatar.md: an `AgentAvatar` section (standalone/Thread node use, accessible names). Then `cd packages/design-system && npm run build:docs`.
- [ ] **Step 2:** Manifest. Add the CLUSTERS entries in both files, then `npm run build:manifest`.
- [ ] **Step 3:** Full gates from the repo root: `make test && make build-lib && make lint && npm run format:check` → all PASS. Then `npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'` → `0`.
- [ ] **Step 4: Commit** `docs: AgentAvatar + PersonDisplay agent parts (#717)`.
