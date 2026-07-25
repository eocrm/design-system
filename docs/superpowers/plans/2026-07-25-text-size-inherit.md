# Text size="inherit" — Implementation Plan (#319)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** `<Text size="inherit">` renders with no fixed font-size — it inherits font-size AND line-height from its parent, so a muted inline run inside a heading (`<Text as="span" size="inherit" tone="muted">` inside `<PageHeader.Title>`) keeps the heading's size.

**Architecture:** Purely additive: extend the `TextSize` union with `'inherit'`, map it to a new `.sizeInherit` class setting `font-size: inherit; line-height: inherit;` (line-height must inherit too — Text's base 1.5 line-height inside a tight-line-height heading would otherwise inflate the heading's line box). Tone/weight/align keep working unchanged on top.

**Tech Stack:** React 18, TypeScript, SCSS modules, Vitest + RTL (globals — no describe/it/expect imports).

## Global Constraints

- Repo `/home/dpws/projects/design-system`, branch `feat/text-size-inherit` (already checked out).
- Tokens-only SCSS; if stylelint's `scale-unlimited/declaration-strict-value` flags `font-size: inherit` / `line-height: inherit`, use a `// stylelint-disable-next-line scale-unlimited/declaration-strict-value -- CSS-wide keyword, not a raw value` comment (mirror the `.alignLeft` pattern in Text.module.scss).
- Full JSDoc on the changed prop/type (package CLAUDE.md rule 7).
- Tests run from inside the package: `cd packages/design-system && npx vitest run src/components/Text/Text.test.tsx`.
- Lint/format from repo root: `make lint`, `npm run format:check`.
- Commit per task; do NOT push.

---

### Task 1: The feature (code + tests + JSDoc)

**Files:**

- Modify: `packages/design-system/src/components/Text/Text.tsx`
- Modify: `packages/design-system/src/components/Text/Text.module.scss`
- Test: `packages/design-system/src/components/Text/Text.test.tsx`

**Interfaces:**

- Produces: `TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'inherit'`; class `styles.sizeInherit`.

- [ ] **Step 1: Failing tests** — append to `Text.test.tsx` (match the file's existing style — read it first):

```tsx
describe('Text size="inherit" (#319)', () => {
  it('renders the sizeInherit class and no fixed-size class', () => {
    render(
      <Text as="span" size="inherit" data-testid="t">
        ENG-5
      </Text>,
    );
    const el = screen.getByTestId('t');
    expect(el.className).toMatch(/sizeInherit/);
    expect(el.className).not.toMatch(/sizeMd/);
  });

  it('tone and weight still apply with size="inherit"', () => {
    render(
      <Text as="span" size="inherit" tone="muted" weight="medium" data-testid="t">
        ENG-5
      </Text>,
    );
    const el = screen.getByTestId('t');
    expect(el.className).toMatch(/toneMuted/);
    expect(el.className).toMatch(/weightMedium/);
  });
});
```

- [ ] **Step 2: Run** `cd packages/design-system && npx vitest run src/components/Text/Text.test.tsx` — expect FAIL (type error / missing class).

- [ ] **Step 3: Implement.**

`Text.tsx`:

- `export type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'inherit';` — extend the `/** Visual size. */` JSDoc to `/** Visual size. `'inherit'` takes font-size and line-height from the parent (inline runs inside headings). */`
- `SIZE_CLASS`: add `inherit: styles.sizeInherit,`.
- `size` prop JSDoc: add option line:

```
   * - `inherit` — no fixed size; font-size AND line-height inherit from the
   *   parent. For inline runs inside a heading (`as="span"` inside a
   *   `<Title>` / `<PageHeader.Title>`) that must keep the heading's size —
   *   e.g. a muted task-key prefix. Tone / weight still apply.
```

- Add one `@example` after the existing inline-run example:

```
 * @example
 * // Muted inline run inside a heading — keeps the heading's font size:
 * <Title order={1}>
 *   <Text as="span" size="inherit" tone="muted">ENG-5</Text> Fix login
 * </Title>
```

- Extend the `@remarks Anti-patterns` bullet about wrapping `<Title>` in `<Text>`: it stays an anti-pattern; `size="inherit"` is for runs INSIDE a heading, not around one. One sentence.

`Text.module.scss` — after `.sizeXl`:

```scss
// `inherit` — no fixed size: font-size AND line-height come from the parent
// (inline runs inside headings). Line-height must inherit too or Text's
// base 1.5 would inflate a tight heading's line box.
.sizeInherit {
  font-size: inherit;
  line-height: inherit;
}
```

(Add the stylelint disable comments only if `make lint` flags the `inherit` keywords.)

- [ ] **Step 4: Run** the Text tests (PASS), `cd packages/design-system && npm run typecheck`, root `make lint`.

- [ ] **Step 5: Commit** — `feat(Text): size="inherit" — inline runs inside headings keep the parent size (#319)`

---

### Task 2: Docs + demo

**Files:**

- Modify: `packages/design-system/AGENTS.md` (Text section)
- Modify: `packages/playground/src/pages/components/TextDemo.tsx`

- [ ] **Step 1: AGENTS.md** — in the Text section, add one TL;DR line for `size="inherit"` (muted title prefix inside a heading; font-size + line-height inherit). Match surrounding style.

- [ ] **Step 2: TextDemo.tsx** — add a demo section (match the file's existing section/Example component pattern) titled "size=\"inherit\" — inline runs inside headings": a `<Title order={2}>` containing `<Text as="span" size="inherit" tone="muted">ENG-5</Text> Fix login flow` (plus, if the file's style supports it, a contrast line showing the old wrong way with `size="sm"` rendering smaller). Imports only from `@eocrm/design-system`.

- [ ] **Step 3: Verify from repo root** — `make test && make build-lib && make lint && npm run format:check && make build`. Also `npx prettier --write docs/superpowers/plans/2026-07-25-text-size-inherit.md` and commit the plan doc here.

- [ ] **Step 4: Commit** — `docs: Text size="inherit" demo + AGENTS.md note (#319)`

---

## Self-review notes

- Line-height inheritance is the one non-obvious decision; locked in (see Architecture).
- No new component → no manifest CLUSTERS entry; props.manifest.json may regenerate during `make build` — commit if changed.
- Not adding an inline `Title` variant — issue itself prefers the `Text size="inherit"` surface.
