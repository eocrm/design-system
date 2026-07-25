# AppLayout sidebarPinned — Implementation Plan (#324)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** `<AppLayout sidebarPinned>` renders the sidebar slot viewport-pinned — `position: sticky; top: 0; height: 100dvh` with internal overflow scrolling — so a `Rail`'s footer/CollapseToggle glues to the SCREEN bottom on pages taller than the viewport.

**Architecture:** Purely additive boolean prop. AppLayout is the documented layout-owning exception to Rule 4, so the sticky/height rules live in its own `.module.scss` behind a new `.sidebarPinned` class on the existing sidebar wrapper div. `height: 100vh` fallback line before `height: 100dvh` (older engines). `overflow-y: auto` so an over-tall rail scrolls inside the pinned box instead of growing the page.

**Tech Stack:** React 18, TypeScript, SCSS modules, Vitest + RTL (globals — no describe/it/expect imports).

## Global Constraints

- Repo `/home/dpws/projects/design-system`, branch `feat/applayout-sidebar-pinned` (already checked out).
- AppLayout's SCSS header documents its Rule-4 exemption; if stylelint's `property-disallowed-list` still flags `position`/`top`, add `// stylelint-disable-next-line property-disallowed-list -- AppLayout is the layout-owning shell; viewport pinning is its job (see file header)`.
- Full JSDoc on the new prop (rule 7). Vitest globals. Tests from inside the package; gates from repo root. Commit per task; do NOT push.

---

### Task 1: The prop (code + tests + JSDoc)

**Files:**

- Modify: `packages/design-system/src/components/AppLayout/AppLayout.tsx`
- Modify: `packages/design-system/src/components/AppLayout/AppLayout.module.scss`
- Test: `packages/design-system/src/components/AppLayout/AppLayout.test.tsx`

**Interfaces:** `AppLayoutProps.sidebarPinned?: boolean` (default false).

- [ ] **Step 1: Failing tests** — append (match file's existing style; read it first):

```tsx
describe('AppLayout sidebarPinned (#324)', () => {
  it('adds the pinned class to the sidebar wrapper', () => {
    render(
      <AppLayout sidebar={<nav data-testid="rail">nav</nav>} sidebarPinned>
        content
      </AppLayout>,
    );
    const wrapper = screen.getByTestId('rail').parentElement!;
    expect(wrapper.className).toMatch(/sidebarPinned/);
    expect(wrapper.className).toMatch(/sidebar/);
  });

  it('no pinned class by default', () => {
    render(<AppLayout sidebar={<nav data-testid="rail">nav</nav>}>content</AppLayout>);
    expect(screen.getByTestId('rail').parentElement!.className).not.toMatch(/sidebarPinned/);
  });

  it('sidebarPinned without a sidebar renders nothing extra', () => {
    const { container } = render(<AppLayout sidebarPinned>content</AppLayout>);
    expect(container.querySelector('[class*="sidebar"]')).toBeNull();
  });
});
```

- [ ] **Step 2:** Run `cd packages/design-system && npx vitest run src/components/AppLayout/AppLayout.test.tsx` — FAIL (unknown prop / missing class).

- [ ] **Step 3: Implement.**

`AppLayout.tsx` — add to props destructure + interface:

```ts
  /**
   * Pin the sidebar to the viewport: `position: sticky; top: 0; height: 100dvh`
   * with internal overflow scrolling. On pages taller than the viewport the
   * sidebar (and a `Rail` inside it — its `Rail.Spacer` + `Rail.Footer` /
   * CollapseToggle) spans exactly the SCREEN, keeping the footer glued to the
   * viewport bottom instead of the page bottom. Default `false` (sidebar
   * stretches to the full row/page height — the original behavior).
   *
   * Prefer this over wrapping the sidebar slot in `Sticky` — the rail's
   * `height: 100%` + flex spacer need a DEFINITE viewport height to pin the
   * footer, which `Sticky`'s max-height capping can't provide.
   */
  sidebarPinned?: boolean;
```

Sidebar render: `className={clsx(styles.sidebar, sidebarPinned && styles.sidebarPinned)}` (add clsx import if the file doesn't have it — check how it merges className today and stay consistent). Extend the component JSDoc with one `@example` (Rail with footer + sidebarPinned).

`AppLayout.module.scss` — after `.sidebar`:

```scss
// Viewport-pinned sidebar (sidebarPinned): the sidebar spans exactly the
// screen, not the row/page. sticky (not fixed) so it keeps its flex-row slot
// and width; a DEFINITE 100dvh height lets a Rail's `height: 100%` + spacer
// pin its footer to the viewport bottom. dvh tracks mobile dynamic toolbars;
// the vh line is the older-engine fallback. overflow-y: auto scrolls an
// over-tall rail inside the pinned box instead of growing the page.
.sidebarPinned {
  position: sticky;
  top: 0;
  height: 100vh;
  height: 100dvh;
  overflow-y: auto;
}
```

(Add stylelint disables only if `make lint` flags position/top — see Global Constraints.)

- [ ] **Step 4:** Tests PASS; `npm run typecheck` (package); root `make lint`.
- [ ] **Step 5:** Commit — `feat(AppLayout): sidebarPinned — viewport-pinned sidebar, rail footer glued to the screen (#324)`

---

### Task 2: Docs + demo + gates

**Files:**

- Modify: `packages/design-system/AGENTS.md` (AppLayout section — one TL;DR line: when the page scrolls, `sidebarPinned` keeps the rail footer on-screen; mention the Sticky anti-pattern)
- Modify: `packages/playground/src/pages/components/AppLayoutDemo.tsx` (add a pinned example — mirror the file's existing example pattern; a tall content block + Rail with footer inside a scrollable frame so the pinning is visible)

- [ ] **Step 1:** Read both files first; implement.
- [ ] **Step 2:** `npx prettier --write docs/superpowers/plans/2026-07-25-applayout-sidebar-pinned.md`; include the plan doc in this commit.
- [ ] **Step 3:** Full gates: `make test && make build-lib && make lint && npm run format:check && make build`; commit regenerated props.manifest.json if changed.
- [ ] **Step 4:** Commit — `docs(AppLayout): sidebarPinned demo + AGENTS.md note (#324)`

---

## Self-review notes

- sticky (not fixed) keeps the sidebar in normal flow — no width/slot hacks; `align-items: stretch` on `.root` stops mattering for the pinned item because its height is definite.
- The demo can't truly demonstrate viewport pinning inside a demo frame (sticky is relative to the nearest scrollport) — an overflow container around the example IS the scrollport, which actually demonstrates it nicely at demo scale.
- Not adding a `top` offset prop (e.g. below a fixed header) — YAGNI until an issue asks; AppLayout's own topBar sits beside, not above, the sidebar.
