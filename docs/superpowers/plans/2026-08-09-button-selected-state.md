# Button Selected State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an accessible persistent selected state to secondary and ghost Buttons and demonstrate it in the playground.

**Architecture:** `Button` remains controlled and stateless. A boolean `selected` prop adds only a CSS-module modifier; consumers opt into native `aria-pressed` explicitly for genuine toggle buttons. Selectors constrain selected paint to secondary and ghost variants, with component tokens wrapping existing color primitives.

**Tech Stack:** React 19, TypeScript, CSS Modules/SCSS, Vitest, Testing Library, Vite playground.

## Global Constraints

- Selected paint applies only to `secondary` and `ghost`; intent variants retain their existing paint.
- `selected` never derives ARIA semantics.
- Explicit native `aria-pressed` passes through Button's props-last spread contract.
- Use Button component tokens in SCSS; do not add raw colors, spacing, radii, or layout ownership.
- Button owns no selected state and does not toggle itself on click.
- Any mockup JSX continues to use only exports from `@eocrm/design-system`.

---

### Task 1: Button selected API, semantics, and paint

**Files:**

- Modify: `packages/design-system/src/components/Button/Button.test.tsx`
- Modify: `packages/design-system/src/components/Button/Button.tsx`
- Modify: `packages/design-system/src/components/Button/Button.module.scss`
- Modify: `packages/design-system/src/components/Button/Button.tokens.scss`

**Interfaces:**

- Consumes: React's native `ButtonHTMLAttributes<HTMLButtonElement>` including `aria-pressed`.
- Produces: `ButtonProps.selected?: boolean`; selected CSS modifier; `--button-bg-selected`, `--button-bg-selected-hover`, `--button-fg-selected`, and `--button-border-color-selected` tokens.

- [ ] **Step 1: Add failing accessibility and class-scope tests**

Add focused cases to `Button.test.tsx` that render every selected variant. Assert that secondary and ghost class names contain `selected`, primary/danger/success do not, `selected={false}` removes selected paint, selected alone does not add `aria-pressed`, an explicit native `aria-pressed` value passes through, and a selected disabled Button remains disabled.

```tsx
it('keeps selected paint separate from native toggle-button semantics', () => {
  render(
    <Button variant="secondary" selected>
      Owner: Ada
    </Button>,
  );
  expect(screen.getByRole('button', { name: 'Owner: Ada' })).not.toHaveAttribute('aria-pressed');
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npm test --workspace @eocrm/design-system -- Button/Button.test.tsx`

Expected: TypeScript/runtime assertions fail because `selected` is not yet consumed and no selected class is applied.

- [ ] **Step 3: Implement the minimal controlled paint prop**

Add fully documented `selected?: boolean` to `ButtonProps`. Destructure it without a default and restrict the selected class to the approved variants. Do not derive ARIA; explicit native attributes continue through the props-last spread.

```tsx
const paintsSelected = selected && (variant === 'secondary' || variant === 'ghost');

<button
  ref={ref}
  type={type}
  className={clsx(
    styles.button,
    styles[variant],
    styles[size],
    iconOnly && styles.iconOnly,
    paintsSelected && styles.selected,
    className,
  )}
  {...props}
/>;
```

Keep the existing props-last contract and add the required explanatory JSX comment. Expand component examples and `@remarks` to establish selected filter triggers as valid and internal toggle state as invalid.

- [ ] **Step 4: Add component tokens and scoped selected selectors**

In `Button.tokens.scss`, map selected state tokens to existing primitives with AA-safe text and distinct resting/hover backgrounds. In `Button.module.scss`, apply the tokens only to compound selectors so intent variants cannot acquire selected paint.

```scss
.secondary.selected,
.ghost.selected {
  background: var(--button-bg-selected);
  color: var(--button-fg-selected);
  border-color: var(--button-border-color-selected);

  &:hover:not(:disabled) {
    background: var(--button-bg-selected-hover);
  }
}
```

- [ ] **Step 5: Run focused tests and stylesheet lint to confirm GREEN**

Run: `npm test --workspace @eocrm/design-system -- Button/Button.test.tsx`

Run: `npm run lint:css`

Expected: Button tests and stylelint pass.

- [ ] **Step 6: Commit the Button API slice**

```bash
git add packages/design-system/src/components/Button
git commit -m "feat(Button): add selected state (#442)"
```

### Task 2: Consumer guidance and demonstrations

**Files:**

- Modify: `packages/design-system/AGENTS.md`
- Modify: `packages/playground/src/pages/components/ButtonDemo.tsx`
- Modify: `packages/playground/src/pages/mockups/Contacts/Contacts.tsx`

**Interfaces:**

- Consumes: `ButtonProps.selected?: boolean` from Task 1.
- Produces: Canonical selected-filter documentation, an interactive demo, and realistic Contacts filter usage.

- [ ] **Step 1: Add the Button guidance contract**

Add a canonical example and bullets to the existing Button section:

```tsx
<Button variant="secondary" size="sm" selected={ownerApplied} aria-pressed={ownerApplied}>
  Owner: {ownerLabel}
</Button>
```

State that `selected` is controlled paint only, paints secondary/ghost, and is for durable applied values rather than transient success or mutually exclusive ButtonGroup choices. Consumers add native `aria-pressed` only when Button activation toggles the state; menu/disclosure triggers keep their existing semantics.

- [ ] **Step 2: Add an interactive selected-state demo**

In `ButtonDemo.tsx`, add a small local component with independent Status and Owner booleans. Render both secondary and ghost examples with `selected` driven by state and include a code sample showing consumer-owned toggling.

```tsx
const [statusApplied, setStatusApplied] = useState(true);
<Button
  variant="secondary"
  selected={statusApplied}
  aria-pressed={statusApplied}
  onClick={() => setStatusApplied((value) => !value)}
>
  Status: Active
</Button>;
```

- [ ] **Step 3: Dogfood selected state in the Contacts mockup**

Pass `selected={statusFilter !== 'all'}` and `selected={ownerFilter !== 'all'}` to the corresponding existing secondary menu Buttons without `aria-pressed`. Filter the displayed rows/count by both values and render the library `EmptyState` for zero matches. Add `EmptyState` to the registry. Do not add raw HTML, inline styles, or CSS Modules.

- [ ] **Step 4: Run formatting and relevant typechecks**

Run: `npx prettier --check packages/design-system/AGENTS.md packages/playground/src/pages/components/ButtonDemo.tsx packages/playground/src/pages/mockups/Contacts/Contacts.tsx`

Run: `npm run typecheck --workspaces --if-present`

Expected: formatting and all workspace typechecks pass.

- [ ] **Step 5: Commit guidance and demos**

```bash
git add packages/design-system/AGENTS.md packages/playground/src/pages/components/ButtonDemo.tsx packages/playground/src/pages/mockups/Contacts/Contacts.tsx
git commit -m "docs(Button): demonstrate selected filter triggers (#442)"
```

### Task 3: Repository gates and publication readiness

**Files:**

- Verify: all files changed since `origin/main`

**Interfaces:**

- Consumes: completed Button API and demonstrations from Tasks 1-2.
- Produces: a gate-clean branch ready for the mandatory pre-push review workflow.

- [ ] **Step 1: Run all repository gates**

Run: `make test && make build-lib && make lint && npm run format:check`

Expected: every command exits 0.

- [ ] **Step 2: Verify the package tarball excludes development files**

Run:

```bash
npm pack --workspace @eocrm/design-system --dry-run 2>&1 | grep -cE '\.test\.(t|j)sx?|\.spec\.|/types/|CLAUDE\.md|tsconfig'
```

Expected: output `0` (the pipeline exit may be `1` because grep found zero matches).

- [ ] **Step 3: Invoke the repository `pre-push-review` skill**

Because the diff touches both `packages/design-system/**` and a mockup, run the skill's applicable library and mockup review requirements. Fix every Critical/Important finding and repeat its required clean-review cycle.

- [ ] **Step 4: Re-run final verification after review fixes**

Run: `make test && make build-lib && make lint && npm run format:check`

Expected: every command exits 0 on the final reviewed head.
