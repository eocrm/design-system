# StatusMenu — Implementation Plan (#320)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** New library component `<StatusMenu>` — a status-transition dropdown: trigger button colored with the current status color, dropdown rows fully colored with each target status color, read-only static chip when there are no options.

**Architecture:** Single closed component (no children slots) that composes `DropdownMenu` (Trigger/Content/Item) internally. Colors are token-backed: a `category` (6 workflow categories) maps to a `PaletteColor`, an optional per-status `color?: PaletteColor` wins (Badge/Dot precedent). Color reaches CSS via injected custom properties (`--status-menu-bg`/`--status-menu-fg`, Avatar pattern) so StatusMenu's SCSS owns base/hover/focus styling; dropdown-row rules use double-class specificity (`.option.option`, plus `:hover`/`:focus-visible` rules) to deterministically beat DropdownMenu's own `.item` rules across module emission order.

**Tech Stack:** React 18, TypeScript, SCSS modules, existing `DropdownMenu` + `palette` + `i18n` infrastructure, Vitest + RTL (globals — no describe/it/expect imports).

## Global Constraints

- Repo `/home/dpws/projects/design-system`, branch `feat/status-menu` (already checked out).
- Package Hard rules 1–9 (packages/design-system/CLAUDE.md) all apply — this is a NEW component, so the FULL core invariant applies: tests, playground demo + wiring, `src/index.ts` re-export, JSDoc `@remarks` anti-patterns, AGENTS.md TL;DR, manifest CLUSTERS in BOTH `src/_meta/manifest.ts` AND `scripts/generate-manifest.mjs` + `npm run build:manifest`.
- Tokens-only SCSS. All status colors via `var(--color-palette-<name>-bg/-fg)` pairs — never raw values. `filter: brightness(...)` is allowed for hover (not a color property); if stylelint objects, add a disable comment with reason.
- i18n rule 9: the trigger's aria-label goes through `useTranslation()` (`statusMenu.changeStatus` key in messages.ts + en.ts + ru.ts). No label props.
- Tests from inside the package: `cd packages/design-system && npx vitest run src/components/StatusMenu/StatusMenu.test.tsx`. Full gates from repo root.
- Commit per task; do NOT push.

---

### Task 1: StatusMenu component (code + tokens + i18n + tests + exports)

**Files:**

- Create: `packages/design-system/src/components/StatusMenu/StatusMenu.tsx`
- Create: `packages/design-system/src/components/StatusMenu/StatusMenu.module.scss`
- Create: `packages/design-system/src/components/StatusMenu/StatusMenu.tokens.scss`
- Create: `packages/design-system/src/components/StatusMenu/StatusMenu.test.tsx`
- Create: `packages/design-system/src/components/StatusMenu/index.ts`
- Modify: `packages/design-system/src/i18n/messages.ts`, `en.ts`, `ru.ts` (new `statusMenu` namespace)
- Modify: `packages/design-system/src/index.ts` (component + types export)

**Interfaces (public API — exact):**

```ts
/** Workflow status category — maps to a default palette color. */
export type StatusMenuCategory = 'to_do' | 'in_progress' | 'open' | 'done' | 'won' | 'lost';

/** One status: current value or a transition target. */
export interface StatusMenuStatus {
  /** Stable id — passed to `onSelect` when this option is chosen. */
  id: string | number;
  /** Visible status name. */
  name: string;
  /** Semantic category → default color: to_do slate / in_progress blue / open violet / done green / won green / lost red. */
  category?: StatusMenuCategory;
  /** Explicit palette color — wins over `category` (per-state custom colors). */
  color?: PaletteColor;
}

export interface StatusMenuProps extends Omit<HTMLAttributes<HTMLElement>, 'onSelect'> {
  current: StatusMenuStatus;
  /** Transition targets. Omitted or empty → read-only mode: a static colored chip (no button, no menu). */
  options?: StatusMenuStatus[];
  /** Fired with the chosen option's `id`. */
  onSelect?: (id: string | number) => void;
  /** Disables the trigger (still colored, dimmed). */
  disabled?: boolean;
  /** Transition in flight: trigger gets `aria-busy` and is non-interactive, keeps its color. */
  busy?: boolean;
}
```

**Behavior spec:**

- Color resolution (shared helper in the same file): `color ?? CATEGORY_COLOR[category] ?? 'slate'` where `const CATEGORY_COLOR: Record<StatusMenuCategory, PaletteColor> = { to_do: 'slate', in_progress: 'blue', open: 'violet', done: 'green', won: 'green', lost: 'red' }`. Inject as inline `style={{ '--status-menu-bg': 'var(--color-palette-<c>-bg)', '--status-menu-fg': 'var(--color-palette-<c>-fg)' }}` — merged AFTER consumer `style` so the component wins (Pattern B note in JSX).
- **Interactive mode** (options non-empty): render `DropdownMenu` root → `DropdownMenu.Trigger` cloning StatusMenu's own `<button type="button" className={styles.trigger}>` (content: `current.name` + inline chevron SVG marked `aria-hidden` — copy the chevron approach used by `Select`'s trigger; do NOT add lucide-react to the library). `DropdownMenu.Content` → one `DropdownMenu.Item` per option with `onSelect={() => onSelect?.(option.id)}`, `className={styles.option}`, and the option's injected color vars via `style`.
- Trigger accessible name: `aria-label={`${t('statusMenu.changeStatus')}: ${current.name}`}` (rule-9 sanctioned interpolation). i18n keys: `statusMenu: { changeStatus: string }`; en `'Change status'`, ru `'Изменить статус'`.
- `disabled` or `busy` → trigger `disabled` attribute (+ `aria-busy={busy || undefined}`), `.trigger:disabled` dims via opacity token. DropdownMenu's Trigger clones handlers onto the button; a disabled button won't fire them — verify in tests.
- **Read-only mode** (options undefined or `[]`): render a static `<span className={styles.chip}>` with the same color vars and `current.name`. No aria-haspopup, no button semantics.
- `forwardRef<HTMLElement>` — ref lands on the `<button>` (interactive) or `<span>` (read-only). `className` merged via clsx. `{...rest}` spread with component-critical attrs AFTER rest (Pattern B — ARIA contract must survive), with the required brief JSX comment.

**SCSS spec (`StatusMenu.module.scss` — tokens in `StatusMenu.tokens.scss`):**

- Component tokens (defaults → primitives): `--status-menu-radius: var(--radius-md)`, `--status-menu-padding-y/-x: var(--space-1)/var(--space-3)` (match Button `md`-ish density — check Button.tokens.scss and mirror), `--status-menu-font-size: var(--font-size-sm)`, `--status-menu-font-weight: var(--font-weight-medium)`, `--status-menu-gap: var(--space-2)`, `--status-menu-disabled-opacity: 0.6` (if an opacity token exists, use it; else define one here), ring tokens mirroring Button focus (`--status-menu-ring-focus`).
- `.trigger` and `.chip` share a base: `background: var(--status-menu-bg); color: var(--status-menu-fg);` inline-flex, gap, radius, padding, font. `.trigger` adds cursor pointer, border transparent, `:focus-visible` ring (rule 3a — `:focus-visible`, NOT `:focus`), `:hover:not(:disabled) { filter: brightness(0.96); }`, `:disabled { opacity: ...; cursor: default; }`.
- `.option.option { background: var(--status-menu-bg); color: var(--status-menu-fg); }` with `.option.option:hover { filter: brightness(0.94); }` and `.option.option:focus-visible { filter: brightness(0.94); }` — double class + pseudo beats DropdownMenu's `.item:hover`/`.item:focus-visible` (0,2,0) deterministically. Brief comments explaining the specificity choice (mirror the collapse comments style).
- No layout properties (rule 4).

**JSDoc (rule 7):** full component JSDoc with 3 `@example` blocks (task statuses with categories; per-state custom `color` override; read-only chip), `@remarks When NOT to use` (single non-status action menu → DropdownMenu; plain non-interactive status display → Badge; picking from long searchable lists → Select) and `@remarks Anti-patterns` (❌ small Badge inside a neutral Button — the thing this replaces; ❌ raw hex in `color` — it's a `PaletteColor` name; ❌ omitting `options` to "disable" — that's read-only mode, use `disabled` for a temporarily blocked transition).

**Tests (rule 1 minimums + behavior):**

- Renders trigger `<button>` with current name; `--status-menu-bg` style contains `var(--color-palette-blue-bg)` for `category="in_progress"`.
- `color="purple"` beats `category` (var(--color-palette-purple-bg)).
- No category/color → slate fallback.
- Open via click → every option rendered as a menuitem with its own injected color var; clicking one fires `onSelect` with the option id and closes.
- Keyboard: ArrowDown to an option, Enter selects (userEvent).
- `disabled` → button disabled, menu does not open on click; `busy` → `aria-busy="true"` + disabled.
- Read-only (`options` omitted AND `options={[]}`): renders a `<span>` (no `button` role, no aria-haspopup), still colored.
- aria-label uses the i18n string (`Change status: In progress` under the default en provider).
- `ref` forwarded (button in interactive mode, span in read-only); `className` merged not replaced.
- TS: (type-level, `@ts-expect-error`) `color` only accepts PaletteColor names — optional; skip if awkward.

- [ ] **Step 1:** Read `DropdownMenu/Item.tsx`, `Trigger.tsx`, `Badge.tsx` (color injection), `Select`'s trigger chevron, `FilterChip.tsx` (i18n consumption), `Button.tokens.scss` (density), and one existing test file for conventions. THEN write the failing tests.
- [ ] **Step 2:** Run tests — expect FAIL (module doesn't exist).
- [ ] **Step 3:** Implement per spec above.
- [ ] **Step 4:** Tests PASS; `cd packages/design-system && npm run typecheck`; root `make lint`.
- [ ] **Step 5:** Commit — `feat(StatusMenu): status-transition dropdown — colored trigger + fully-colored option rows (#320)`

---

### Task 2: Wiring (demo, nav, manifest, AGENTS.md) + gates

**Files:**

- Create: `packages/playground/src/pages/components/StatusMenuDemo.tsx`
- Modify: `packages/playground/src/App.tsx` (import + route `/components/status-menu`)
- Modify: `packages/playground/src/layout/AppShell/navItems.ts` (add to the **Forms** group: `{ to: '/components/status-menu', label: 'StatusMenu', icon: <pick a fitting lucide icon, e.g. CircleDot>, end: false }`)
- Modify: `packages/playground/src/pages/components/ComponentsIndex.tsx` (grid entry) + `overviewSchematics.tsx` (add `SCHEMATICS['StatusMenu']` — mimic a neighboring schematic's shape, simple trigger+rows blueprint)
- Modify: `packages/design-system/src/_meta/manifest.ts` AND `packages/design-system/scripts/generate-manifest.mjs` — add `StatusMenu: 'Forms'` to CLUSTERS in BOTH, then `cd packages/design-system && npm run build:manifest` and commit regenerated output.
- Modify: `packages/design-system/AGENTS.md` — one-section TL;DR (placement consistent with the file's component order) + canonical snippet.

**Demo sections (use `DemoLayout` + `Example` + `getComponentFiles('StatusMenu')` like DropdownMenuDemo):**

1. Task workflow — `to_do/in_progress/done` categories, stateful `current`, `onSelect` updates it.
2. Deal workflow — `open/won/lost` + one option with a custom `color` override.
3. Read-only chip (no options) and `disabled` / `busy` triggers side by side.

- [ ] **Step 1:** Read the wiring files' current shapes first; implement all wiring.
- [ ] **Step 2:** `npx prettier --write docs/superpowers/plans/2026-07-25-status-menu.md` and include the plan doc in this commit.
- [ ] **Step 3:** Full gates from repo root: `make test && make build-lib && make lint && npm run format:check && make build`. Commit regenerated `props.manifest.json` if changed. The manifest meta-test inside `make test` fails if CLUSTERS is incomplete — that's the signal you missed a map.
- [ ] **Step 4:** Commit — `docs(StatusMenu): playground demo + wiring + AGENTS.md TL;DR (#320)`

---

## Self-review notes

- Composes DropdownMenu rather than re-rolling menu a11y — the composition edge is real and auto-derived by generate-manifest from the import.
- Category palette mapping is StatusMenu-owned (no global tokens added) — first consumer; promote to shared tokens only when a second component needs it.
- `busy` = aria-busy + disabled, no spinner — keep v1 minimal; the colored trigger keeps its label.
- Read-only derived from empty `options` (issue's own framing), no separate `readOnly` prop.
