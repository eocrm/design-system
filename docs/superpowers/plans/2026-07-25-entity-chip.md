# EntityChip — Implementation Plan (#322)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** New library component `<EntityChip>` — an inline-safe (span-only, valid inside `<p>`) entity-reference chip: icon + optional muted prefix (task key) + name + optional inline workflow status rendered in the status's OWN color; polymorphic (`a`/RouterLink/`button`/`span`); loading and unavailable states.

**Architecture:** Span-only single component. Status colors reuse the exact model StatusMenu shipped in #320: `category` (6 workflow categories) → `PaletteColor` default, `color?: PaletteColor` override. The category→palette mapping moves from StatusMenu into `_internal/statusColor.ts` (shared vocabulary, no cross-component import — same precedent as `_internal/gridSpan.ts`); StatusMenu is refactored to consume it with ZERO public-API/behavior change. Status text color injected as an inline `var(--color-palette-<c>-fg)` custom property (Badge/Dot/StatusMenu precedent). Polymorphism follows the repo's constrained-`as` dispatch pattern (like `Text`), plus render-prop-free `as` component support for RouterLink (mirror how `Link` does polymorphic `as` — read it first and copy its approach exactly).

**Tech Stack:** React 18, TypeScript, SCSS modules, palette infra, Vitest + RTL (globals — no describe/it/expect imports).

## Global Constraints

- Repo `/home/dpws/projects/design-system`, branch `feat/entity-chip` (already checked out).
- NEW component → FULL core invariant: tests, playground demo + wiring (route/nav/index/schematics/registry), `src/index.ts` re-export, JSDoc `@remarks`, AGENTS.md TL;DR, manifest CLUSTERS in BOTH maps + `npm run build:manifest`.
- Package Hard rules 1–9. Tokens-only SCSS (palette custom-property references inline are the sanctioned pattern). `:focus-visible` only. No layout props. i18n rule 9: no fixed English strings — the "…" loading glyph is punctuation (fine); everything else renders consumer-provided text; if ANY fixed string sneaks in (e.g. an aria-label), it goes through `useTranslation` with en+ru.
- StatusMenu refactor must be behavior-neutral: its tests must pass unchanged.
- Tests from inside the package; full gates from repo root. Commit per task; do NOT push.

---

### Task 1: Shared status color + EntityChip component (code + tests + exports)

**Files:**

- Create: `packages/design-system/src/components/_internal/statusColor.ts`
- Modify: `packages/design-system/src/components/StatusMenu/StatusMenu.tsx` (consume shared mapping; re-export `StatusMenuCategory` as alias of the shared type; NO public API change)
- Create: `packages/design-system/src/components/EntityChip/EntityChip.tsx`
- Create: `packages/design-system/src/components/EntityChip/EntityChip.module.scss`
- Create: `packages/design-system/src/components/EntityChip/EntityChip.tokens.scss`
- Create: `packages/design-system/src/components/EntityChip/EntityChip.test.tsx`
- Create: `packages/design-system/src/components/EntityChip/index.ts`
- Modify: `packages/design-system/src/index.ts`

**Interfaces (public API — exact):**

```ts
// _internal/statusColor.ts
/** Workflow status category — maps to a default palette color. Shared by StatusMenu and EntityChip. */
export type StatusCategory = 'to_do' | 'in_progress' | 'open' | 'done' | 'won' | 'lost';
export const STATUS_CATEGORY_COLOR: Record<StatusCategory, PaletteColor> = {
  to_do: 'slate',
  in_progress: 'blue',
  open: 'violet',
  done: 'green',
  won: 'green',
  lost: 'red',
};
/** `color` wins, then category default, then slate. */
export function resolveStatusColor(s: {
  category?: StatusCategory;
  color?: PaletteColor;
}): PaletteColor;

// StatusMenu.tsx — keep the public name:
export type StatusMenuCategory = StatusCategory; // JSDoc preserved

// EntityChip.tsx
/** Elements EntityChip can render as. All inline-safe phrasing content. */
export type EntityChipAs = 'a' | 'span' | 'button' | ElementType; // read Link.tsx's polymorphic pattern and mirror it — if Link constrains differently, follow Link.

export interface EntityChipStatus {
  /** Status label, rendered inside the chip in the status's own color. */
  label: string;
  category?: StatusCategory;
  /** Wins over `category` (per-state custom colors). */
  color?: PaletteColor;
}

export interface EntityChipProps extends HTMLAttributes<HTMLElement> {
  /** Leading icon — consumer passes the element (e.g. a lucide icon). Rendered aria-hidden. */
  icon?: ReactNode;
  /** Entity name. */
  label: ReactNode;
  /** Muted leading run before the name (e.g. task key `ENG-5`). */
  prefix?: ReactNode;
  /** Inline workflow status, shown as `· <label>` in the status's own color. */
  status?: EntityChipStatus;
  /** Renders `as="a"` with this href when `as` is omitted. */
  href?: string;
  /** Polymorphic element/component (RouterLink etc.). Default: `'a'` when `href` set, else `'span'`. */
  as?: EntityChipAs;
  /** Loading placeholder: icon slot + `…` body, aria-busy, non-interactive. */
  loading?: boolean;
  /** Entity missing/no access: muted, non-interactive (renders `as` forced to 'span'), aria-disabled. */
  unavailable?: boolean;
}
```

**Behavior spec:**

- Element resolution: `unavailable || loading` → `'span'` (never a link/button); else `as ?? (href ? 'a' : 'span')`. When rendering `'a'`, pass `href`. When `'button'`, `type="button"` (rule 6).
- Status run: `<span className={styles.status} style={{ '--entity-chip-status-fg': 'var(--color-palette-<c>-fg)' }}>` containing a separator `·` (aria-hidden, `styles.dot`) + the label. Color resolved via `resolveStatusColor`.
- Prefix run: `<span className={styles.prefix}>` muted (`--entity-chip-prefix-fg: var(--color-fg-muted)` token).
- Icon: wrapped in `<span className={styles.icon} aria-hidden="true">`.
- Loading: replaces prefix/label/status body with `…` (`<span className={styles.ellipsis}>…</span>`), sets `aria-busy="true"`, keeps the icon slot if provided.
- Unavailable: adds `styles.unavailable` (muted fg for the WHOLE chip incl. status run — unavailable overrides status color), `aria-disabled="true"`.
- `forwardRef<HTMLElement>`; className merged; spread order Pattern A (props last, consumer wins) EXCEPT the ARIA state attrs (aria-busy/aria-disabled) which follow rule-7's Pattern B reasoning — put `{...rest}` before the component-owned ARIA attrs, with the required inline comment.
- Everything is spans inside one root inline element — must be valid inside `<p>` (test asserts no div/block tags render).

**SCSS spec:**

- Tokens (`EntityChip.tokens.scss`): `--entity-chip-bg: var(--color-bg-muted)` (subtle neutral chip bg — check what Badge neutral uses and pick the closest primitive), `--entity-chip-fg: var(--color-fg)`, `--entity-chip-fg-hover`/link hover accent if Link has one, `--entity-chip-prefix-fg: var(--color-fg-muted)`, `--entity-chip-radius: var(--radius-sm)`, paddings/gap via space tokens, `--entity-chip-font-size: var(--font-size-sm)`, `--entity-chip-unavailable-fg: var(--color-fg-muted)`.
- `.chip`: `display: inline-flex; align-items: center;` gap/padding/radius/bg/fg; `vertical-align: baseline` (inline flow). Interactive variants (`a`/`button` rendering): hover bg shift + `:focus-visible` ring (rule 3a). `<button>` UA resets (border/font/background) with stylelint disables as needed — mirror how an existing inline button-ish component resets.
- `.status { color: var(--entity-chip-status-fg); }`; `.unavailable`, `.unavailable .status { color: var(--entity-chip-unavailable-fg); }` (specificity: make sure the unavailable override beats `.status` — nest or double-class as needed with a one-line comment).
- No layout props (rule 4); `display: inline-flex` on own root is fine (intrinsic, not layout).

**JSDoc:** full, 3+ examples (comment-text inline usage inside a `<p>` sentence; RouterLink via `as`; status + custom color; loading/unavailable), `@remarks When NOT to use` (plain status without entity → Badge/StatusMenu; standalone navigation → Link; removable filter chips → FilterChip) + `@remarks Anti-patterns` (❌ Badge-in-Badge composition this replaces; ❌ block children inside the chip — inline-safe contract; ❌ raw hex for status color — PaletteColor names).

**Tests (rule 1 + behavior):** renders label; icon aria-hidden; prefix muted class; status run carries resolved `--entity-chip-status-fg` (category default + color override + slate fallback); `href` → `<a href>`; `as` component (dummy RouterLink fn component) receives props; `as="button"` gets type="button"; loading → aria-busy, `…` body, renders span not a; unavailable → span, aria-disabled, unavailable class; valid-inside-`<p>` (render inside a p, assert container.querySelector('div') is null); ref forwarded; className merged. StatusMenu suite still green (refactor neutrality).

- [ ] **Step 1:** Read Link.tsx (polymorphic pattern), Badge.tsx, StatusMenu.tsx, FilterChip (inline chip SCSS patterns), one test file. Write failing tests.
- [ ] **Step 2:** Confirm RED (module missing).
- [ ] **Step 3:** Implement (incl. the `_internal/statusColor.ts` extraction + StatusMenu refactor).
- [ ] **Step 4:** EntityChip + StatusMenu + full package suite pass; typecheck; root `make lint`.
- [ ] **Step 5:** Commit — `feat(EntityChip): inline entity-link chip — icon + prefix + name + status in its own color (#322)`

---

### Task 2: Wiring (demo, nav, manifest, AGENTS.md) + gates

**Files:**

- Create: `packages/playground/src/pages/components/EntityChipDemo.tsx`
- Modify: `packages/playground/src/App.tsx` (route `/components/entity-chip`), `packages/playground/src/layout/AppShell/navItems.ts` (**Display** group, distinct lucide icon), `ComponentsIndex.tsx` (grid entry) + `overviewSchematics.tsx` (`SCHEMATICS['EntityChip']`), `packages/playground/src/pages/mockups/registry.ts` (ComponentName union — required by DemoLayout typing)
- Modify: `packages/design-system/src/_meta/manifest.ts` AND `scripts/generate-manifest.mjs` (CLUSTERS: `EntityChip: 'Display'`) + `npm run build:manifest`, commit regenerated output
- Modify: `packages/design-system/AGENTS.md` (TL;DR section near Badge)

**Demo sections:** (1) inline in flowing comment text inside a `<Text>` paragraph — icon + prefix + name + status, several chips mid-sentence; (2) statuses: categories vs custom `color` override; (3) polymorphic: href link, `as` custom component (fake RouterLink), button variant with onClick; (4) loading + unavailable side by side.

- [ ] **Step 1:** Read wiring files; implement all.
- [ ] **Step 2:** `npx prettier --write docs/superpowers/plans/2026-07-25-entity-chip.md`; include plan doc in commit.
- [ ] **Step 3:** Full gates: `make test && make build-lib && make lint && npm run format:check && make build`; commit regenerated props.manifest.json if changed.
- [ ] **Step 4:** Commit — `docs(EntityChip): playground demo + wiring + AGENTS.md TL;DR (#322)`

---

## Self-review notes

- Raw hex status colors (issue mentions per-state hex in eocrm) are deliberately NOT accepted — `PaletteColor` only, same contract as StatusMenu #320; the consumer maps hex→palette on their side. Consistency beats flexibility here.
- `StatusCategory` becomes the shared public name via EntityChip's exports; `StatusMenuCategory` stays as an alias — no breaking change.
- No i18n keys expected (no fixed English strings); the rule-9 check still runs in review.
