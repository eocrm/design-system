# LiquidEditor Grouped/Dotted Palettes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `LiquidEditor` fit grouped/dotted variable palettes: no false unknown-flagging for dotted codes, `description` surfaced in menus + footer, `collection` variables insert a `{% for %}` snippet, and autocomplete works across dots.

**Architecture:** Four independent surfaces touched: the pure tokenizer (root-set check), the pure autocomplete-context helper (dotted word-walk), the two menus (description line + "list" tag), and the orchestrator (`LiquidEditor.tsx`: loop insert + caret-description footer). Spec: `docs/superpowers/specs/2026-07-22-liquideditor-grouped-palettes-design.md`.

**Tech Stack:** React 18 + TypeScript, Vitest + RTL (globals on — do NOT import describe/it/expect/vi), CSS modules with tokens.

## Global Constraints

- Tokens only in `.module.scss` (no raw values); component tokens preferred.
- No layout props on component roots (internal flex is fine — see existing `.menuItem`).
- Every user-facing string via `useTranslation()` + `messages.ts` + `en.ts` + `ru.ts`.
- Tests live beside code; run from `packages/design-system/` with `npx vitest run <file>`.
- All work on branch `feat/liquid-grouped-palettes` in `/home/dpws/projects/design-system`.

---

### Task 1: Tokenizer — root-set membership for dotted codes

**Files:**
- Modify: `packages/design-system/src/components/LiquidEditor/liquidTokenizer.ts`
- Test: `packages/design-system/src/components/LiquidEditor/liquidTokenizer.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `tokenize(source, knownCodes?)` and `unknownVariables(source, knownCodes)` unchanged signatures; semantics change — a root identifier is known when it matches the FIRST dotted segment of any known code.

- [ ] **Step 1: Write the failing tests** — append to the existing bottom of `liquidTokenizer.test.tsx`:

```tsx
describe('dotted known codes (#304)', () => {
  const KNOWN = new Set(['event.type', 'record.title', 'first_name']);

  it('does not flag a reference whose root matches a dotted code root', () => {
    const tokens = tokenize('{{ event.type }}', KNOWN);
    expect(tokens.find((t) => t.value === 'event')?.type).toBe('variable');
    expect(unknownVariables('{{ event.type }}', KNOWN)).toEqual([]);
  });

  it('any event.* reference is accepted once an event.* code exists', () => {
    expect(unknownVariables('{{ event.other }}', KNOWN)).toEqual([]);
  });

  it('still flags an unknown root', () => {
    expect(unknownVariables('{{ bogus.thing }}', KNOWN)).toEqual(['bogus']);
    expect(tokenize('{{ bogus }}', KNOWN).find((t) => t.value === 'bogus')?.type).toBe('unknown');
  });

  it('flat codes keep working', () => {
    expect(unknownVariables('{{ first_name }}', KNOWN)).toEqual([]);
  });

  it('dotted segments after the root stay unchecked', () => {
    const tokens = tokenize('{{ event.zzz }}', KNOWN);
    expect(tokens.find((t) => t.value === 'zzz')?.type).toBe('variable');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/design-system && npx vitest run src/components/LiquidEditor/liquidTokenizer.test.tsx`
Expected: FAIL — `event` typed `unknown` (roots not derived).

- [ ] **Step 3: Implement** — in `liquidTokenizer.ts`, inside `tokenize`, derive roots once (after the `hasKnown` line):

```ts
  const hasKnown = knownCodes !== undefined && knownCodes.size > 0;
  // #304: `code` is a PATH — "event.type" makes the ROOT `event` known. A
  // reference is checked by its root identifier only, so membership is
  // tested against the set of first dotted segments.
  const knownRoots = hasKnown
    ? new Set([...knownCodes!].map((c) => c.split('.')[0]))
    : undefined;
```

and change the unknown check to use it:

```ts
          const unknown = hasKnown && !seenValue && !knownRoots!.has(word);
```

`unknownVariables` needs no change (it delegates to `tokenize`). Update the `@param knownCodes` JSDoc on `tokenize` to say roots are derived from dotted codes.

- [ ] **Step 4: Run to verify pass**

Run: `cd packages/design-system && npx vitest run src/components/LiquidEditor/liquidTokenizer.test.tsx`
Expected: PASS (all, including pre-existing).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/LiquidEditor/liquidTokenizer.*
git commit -m "fix(LiquidEditor): dotted variable codes no longer false-flag as unknown (#304)"
```

---

### Task 2: Autocomplete context — dotted query word-walk

**Files:**
- Modify: `packages/design-system/src/components/LiquidEditor/useLiquidAutocomplete.ts`
- Test: `packages/design-system/src/components/LiquidEditor/useLiquidAutocomplete.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `getAutocompleteContext(value, caret)` — `query` may now contain dots and `wordStart` spans the whole dotted prefix. `applyCompletion` unchanged.

- [ ] **Step 1: Write the failing tests** — append to `useLiquidAutocomplete.test.tsx`:

```tsx
describe('dotted queries (#304)', () => {
  it('query spans the dotted path', () => {
    const v = '{{ event.ty';
    const ctx = getAutocompleteContext(v, v.length);
    expect(ctx).toEqual({ kind: 'variable', query: 'event.ty', wordStart: 3 });
  });

  it('trailing dot keeps the prefix as query', () => {
    const v = '{{ event.';
    const ctx = getAutocompleteContext(v, v.length);
    expect(ctx?.query).toBe('event.');
    expect(ctx?.wordStart).toBe(3);
  });

  it('accepting a dotted completion replaces the whole dotted prefix', () => {
    const v = '{{ event.ty }}';
    const caret = '{{ event.ty'.length;
    const ctx = getAutocompleteContext(v, caret)!;
    const r = applyCompletion(v, caret, ctx, 'event.type');
    expect(r.value).toBe('{{ event.type }}');
  });

  it('filter context after | is unaffected', () => {
    const v = '{{ x | upc';
    expect(getAutocompleteContext(v, v.length)?.kind).toBe('filter');
  });
});
```

(Import `getAutocompleteContext` / `applyCompletion` the same way the existing tests in that file do.)

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/design-system && npx vitest run src/components/LiquidEditor/useLiquidAutocomplete.test.tsx`
Expected: FAIL — query is `ty`, wordStart wrong.

- [ ] **Step 3: Implement** — in `getAutocompleteContext`, add a query-char class and use it for the walk-back and the sanity check (leave `IDENT_CHAR` for other uses):

```ts
const IDENT_CHAR = /[A-Za-z0-9_]/;
// #304: the QUERY walk includes dots so a dotted code ("event.type") matches
// while the user types past the root. Only the walk-back + validity check
// use it — tokenization/filter detection are unaffected.
const QUERY_CHAR = /[A-Za-z0-9_.]/;
```

```ts
  let wordStart = caret;
  while (wordStart > open + 2 && QUERY_CHAR.test(value[wordStart - 1])) wordStart -= 1;
  const query = value.slice(wordStart, caret);
  if (/[^A-Za-z0-9_.]/.test(query)) return null;
```

- [ ] **Step 4: Run to verify pass**

Run: `cd packages/design-system && npx vitest run src/components/LiquidEditor/useLiquidAutocomplete.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/LiquidEditor/useLiquidAutocomplete.*
git commit -m "feat(LiquidEditor): autocomplete matches dotted variable codes (#304)"
```

---

### Task 3: Types + i18n + autocomplete menu description/tag

**Files:**
- Modify: `packages/design-system/src/components/LiquidEditor/types.ts`
- Modify: `packages/design-system/src/i18n/messages.ts`, `packages/design-system/src/i18n/en.ts`, `packages/design-system/src/i18n/ru.ts`
- Modify: `packages/design-system/src/components/LiquidEditor/useLiquidAutocomplete.ts` (AutocompleteItem plumbing)
- Modify: `packages/design-system/src/components/LiquidEditor/AutocompleteMenu.tsx`
- Modify: `packages/design-system/src/components/LiquidEditor/LiquidEditor.module.scss`
- Test: `packages/design-system/src/components/LiquidEditor/LiquidEditor.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `LiquidVariable.description?: string`, `LiquidVariable.collection?: boolean`; `AutocompleteItem.description?: string`, `AutocompleteItem.collection?: boolean`; i18n key `liquidEditor.collectionTag`; SCSS classes `.menuItemMain`, `.menuItemDesc`. Task 4 and 5 rely on the two new `LiquidVariable` props and the i18n key.

- [ ] **Step 1: Write the failing test** — append to `LiquidEditor.test.tsx` (follow that file's existing render/typing helpers; it already opens autocomplete by typing `{{ ` — see the "scrolls the active suggestion into view" test for the pattern):

```tsx
describe('descriptions + collection tag in autocomplete (#304)', () => {
  const VARS = [
    { code: 'event.type', label: 'Event type', description: 'The journal event type' },
    { code: 'record.associations', label: 'Associations', collection: true },
  ];

  it('renders the description as a second line in suggestions', async () => {
    const user = userEvent.setup();
    renderEditor(<Harness variables={VARS} />);
    const ta = screen.getByRole('combobox');
    await user.click(ta);
    await user.type(ta, '{{{{ ');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('The journal event type')).toBeInTheDocument();
  });

  it('renders a "list" tag for collection variables', async () => {
    const user = userEvent.setup();
    renderEditor(<Harness variables={VARS} />);
    const ta = screen.getByRole('combobox');
    await user.click(ta);
    await user.type(ta, '{{{{ ');
    expect(await screen.findByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('list')).toBeInTheDocument();
  });
});
```

(If the existing `Harness` doesn't take a `variables` prop, extend it or render `<LiquidEditor value="" onChange={...} variables={VARS} />` directly the way the file's other tests do — match local conventions.)

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/design-system && npx vitest run src/components/LiquidEditor/LiquidEditor.test.tsx`
Expected: FAIL — description / tag not rendered.

- [ ] **Step 3: Implement.**

`types.ts` — add to `LiquidVariable` (full JSDoc required, Rule 7):

```ts
  /**
   * Optional human description. Surfaces as a second muted line in the insert
   * menu and autocomplete suggestions, and in the footer when the caret sits
   * on this variable's reference.
   */
  description?: string;
  /**
   * Marks an array/collection variable meant to be iterated, not interpolated.
   * The insert menu drops a `{% for item in code %}{{ item }}{% endfor %}`
   * snippet instead of `{{ code }}`, and menus show a muted "list" tag.
   * Default `false`.
   */
  collection?: boolean;
```

`messages.ts` — inside the `liquidEditor` block:

```ts
    /** Muted tag marking a collection (array) variable in menus. */
    collectionTag: string;
```

`en.ts`: `collectionTag: 'list',` — `ru.ts`: `collectionTag: 'список',`

`useLiquidAutocomplete.ts` — extend `AutocompleteItem`:

```ts
  /** Optional description shown as a muted second line (variables only). */
  description?: string;
  /** Collection flag → "list" tag (variables only). */
  collection?: boolean;
```

and plumb both in `variableItems`:

```ts
      variables.map((v) => ({
        value: v.code,
        label: v.label ?? v.code,
        type: v.type,
        group: v.group,
        description: v.description,
        collection: v.collection,
      })),
```

`AutocompleteMenu.tsx` — replace the option body (`<span>{item.label}</span>` + type span) with:

```tsx
              <span className={styles.menuItemMain}>
                <span>{item.label}</span>
                {item.description ? (
                  <span className={styles.menuItemDesc}>{item.description}</span>
                ) : null}
              </span>
              <span className={styles.menuItemTags}>
                {item.collection ? (
                  <span className={styles.menuItemType}>{t('liquidEditor.collectionTag')}</span>
                ) : null}
                {item.type ? <span className={styles.menuItemType}>{item.type}</span> : null}
              </span>
```

`LiquidEditor.module.scss` — after `.menuItemType`:

```scss
.menuItemMain {
  display: flex;
  flex-direction: column;
}

.menuItemDesc {
  color: var(--color-fg-subtle);
  font-size: var(--font-size-xs);
}

.menuItemTags {
  display: inline-flex;
  gap: var(--space-1);
  flex-shrink: 0;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd packages/design-system && npx vitest run src/components/LiquidEditor/LiquidEditor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/LiquidEditor/ packages/design-system/src/i18n/
git commit -m "feat(LiquidEditor): variable descriptions + collection tag in autocomplete (#304)"
```

---

### Task 4: Insert menu — description line, tag, and collection loop insert

**Files:**
- Modify: `packages/design-system/src/components/LiquidEditor/InsertVariableMenu.tsx`
- Modify: `packages/design-system/src/components/LiquidEditor/LiquidEditor.tsx` (`insertVariable`)
- Modify: `packages/design-system/src/components/LiquidEditor/LiquidEditor.module.scss` (reuses Task 3 classes; add nothing new unless needed)
- Test: `packages/design-system/src/components/LiquidEditor/LiquidEditor.test.tsx`

**Interfaces:**
- Consumes: `LiquidVariable.description` / `.collection`, i18n `liquidEditor.collectionTag` (Task 3).
- Produces: `InsertVariableMenuProps.onInsert: (variable: LiquidVariable) => void` (was `(code: string)`; internal component, not exported from the package).

- [ ] **Step 1: Write the failing tests** — append to `LiquidEditor.test.tsx`:

```tsx
describe('insert menu with grouped palette (#304)', () => {
  const VARS = [
    { code: 'event.type', label: 'Event type', description: 'The journal event type' },
    { code: 'record.associations', label: 'Associations', collection: true },
  ];

  it('inserts a for-loop snippet for collection variables, caret after {{ item }}', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LiquidEditor value="" onChange={onChange} variables={VARS} />);
    await user.click(screen.getByRole('button', { name: 'Insert variable' }));
    await user.click(screen.getByRole('menuitem', { name: /Associations/ }));
    expect(onChange).toHaveBeenCalledWith(
      '{% for item in record.associations %}{{ item }}{% endfor %}',
    );
  });

  it('inserts {{ code }} for non-collection variables', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LiquidEditor value="" onChange={onChange} variables={VARS} />);
    await user.click(screen.getByRole('button', { name: 'Insert variable' }));
    await user.click(screen.getByRole('menuitem', { name: /Event type/ }));
    expect(onChange).toHaveBeenCalledWith('{{ event.type }}');
  });

  it('shows the description line in the insert menu', async () => {
    const user = userEvent.setup();
    render(<LiquidEditor value="" onChange={() => {}} variables={VARS} />);
    await user.click(screen.getByRole('button', { name: 'Insert variable' }));
    expect(screen.getByText('The journal event type')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/design-system && npx vitest run src/components/LiquidEditor/LiquidEditor.test.tsx`
Expected: FAIL — loop snippet not produced; description absent.

- [ ] **Step 3: Implement.**

`InsertVariableMenu.tsx` — change the props + item body. `onInsert` now takes the variable; the tag rides the existing `shortcut` slot of `DropdownMenu.Item`; description is a stacked second line:

```tsx
export interface InsertVariableMenuProps {
  /** Variables offered in the menu, grouped by `group` in first-seen order. */
  variables: LiquidVariable[];
  /** Disable the trigger (read-only / disabled editor). */
  disabled?: boolean;
  /** Called with the chosen variable when an item is selected. */
  onInsert: (variable: LiquidVariable) => void;
}
```

```tsx
              {group.items.map((v) => {
                const tags = [v.collection ? t('liquidEditor.collectionTag') : null, v.type]
                  .filter(Boolean)
                  .join(' · ');
                return (
                  <DropdownMenu.Item
                    key={v.code}
                    onSelect={() => onInsert(v)}
                    shortcut={tags || undefined}
                  >
                    <span className={styles.menuItemMain}>
                      <span>{v.label ?? v.code}</span>
                      {v.description ? (
                        <span className={styles.menuItemDesc}>{v.description}</span>
                      ) : null}
                    </span>
                  </DropdownMenu.Item>
                );
              })}
```

Add `import styles from './LiquidEditor.module.scss';` at the top.

`LiquidEditor.tsx` — `insertVariable` builds the snippet from the variable:

```tsx
    const insertVariable = useCallback(
      (variable: LiquidVariable) => {
        const ta = textareaRef.current;
        // Collections iterate — insert a for-loop with the caret right after
        // `{{ item }}` (the spot the user edits next: `item.name`, separators).
        const head = variable.collection
          ? `{% for item in ${variable.code} %}{{ item }}`
          : `{{ ${variable.code} }}`;
        const snippet = variable.collection ? `${head}{% endfor %}` : head;
        const start = ta?.selectionStart ?? value.length;
        const end = ta?.selectionEnd ?? value.length;
        const next = value.slice(0, start) + snippet + value.slice(end);
        commit(next, start + head.length);
        ta?.focus();
      },
      [value, commit],
    );
```

Add `import type { LiquidEditorProps, LiquidVariable } from './types';` (extend the existing type import).

- [ ] **Step 4: Run to verify pass**

Run: `cd packages/design-system && npx vitest run src/components/LiquidEditor/LiquidEditor.test.tsx`
Expected: PASS (including all pre-existing insert-menu tests).

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/LiquidEditor/
git commit -m "feat(LiquidEditor): collection variables insert a for-loop; insert menu shows descriptions (#304)"
```

---

### Task 5: Footer caret description

**Files:**
- Modify: `packages/design-system/src/components/LiquidEditor/LiquidEditor.tsx`
- Test: `packages/design-system/src/components/LiquidEditor/LiquidEditor.test.tsx`

**Interfaces:**
- Consumes: `LiquidVariable.description` (Task 3), `getAutocompleteContext` (existing).
- Produces: footer precedence `error` > unknown warning > caret description (`label — description`).

- [ ] **Step 1: Write the failing tests** — append to `LiquidEditor.test.tsx`:

```tsx
describe('footer caret description (#304)', () => {
  const VARS = [
    { code: 'event.type', label: 'Event type', description: 'The journal event type' },
  ];

  it('shows label — description when the caret is inside the reference', async () => {
    const user = userEvent.setup();
    const Harness = () => {
      const [v, setV] = React.useState('');
      return <LiquidEditor value={v} onChange={setV} variables={VARS} />;
    };
    render(<Harness />);
    const ta = screen.getByRole('combobox');
    await user.click(ta);
    await user.type(ta, '{{{{ event.type');
    expect(await screen.findByText('Event type — The journal event type')).toBeInTheDocument();
  });

  it('unknown-variable warning wins over the description', async () => {
    const user = userEvent.setup();
    const Harness = () => {
      const [v, setV] = React.useState('');
      return <LiquidEditor value={v} onChange={setV} variables={VARS} />;
    };
    render(<Harness />);
    const ta = screen.getByRole('combobox');
    await user.click(ta);
    await user.type(ta, '{{{{ bogus }}}} {{{{ event.type');
    expect(screen.getByText('Unknown variable "bogus"')).toBeInTheDocument();
    expect(screen.queryByText('Event type — The journal event type')).toBeNull();
  });
});
```

(If the file imports React already, reuse it; otherwise follow its existing Harness pattern.)

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/design-system && npx vitest run src/components/LiquidEditor/LiquidEditor.test.tsx`
Expected: FAIL — description never in footer.

- [ ] **Step 3: Implement** — in `LiquidEditor.tsx`:

State + lookup (near the other `useState` calls). The dotted word under the caret comes from `getAutocompleteContext` (whose query now spans dots, Task 2) extended FORWARD over query chars so a caret mid-word still resolves the whole path:

```tsx
    // #304: the known variable whose reference the caret sits on (exact
    // dotted-path match only) — drives the footer description line.
    const [caretVar, setCaretVar] = useState<LiquidVariable | null>(null);

    const resolveCaretVar = useCallback(
      (nextValue: string, caret: number): LiquidVariable | null => {
        const ctx = getAutocompleteContext(nextValue, caret);
        if (!ctx) return null;
        let end = caret;
        while (end < nextValue.length && /[A-Za-z0-9_.]/.test(nextValue[end])) end += 1;
        const word = nextValue.slice(ctx.wordStart, end);
        return variables.find((v) => v.code === word && v.description) ?? null;
      },
      [variables],
    );
```

Import `getAutocompleteContext` from `./useLiquidAutocomplete` (extend the existing import) and `LiquidVariable` from `./types` (done in Task 4).

In `refresh` (both branches — the dismissed-signature early return AND the normal path), record the caret variable:

```tsx
    const refresh = useCallback(
      (nextValue: string, caret: number) => {
        setCaretVar(resolveCaretVar(nextValue, caret));
        // Honor an active dismissal: don't reopen at the same signature.
        if (dismissedSigRef.current === `${caret}:${nextValue}`) {
          updateAnchor();
          return;
        }
        dismissedSigRef.current = null;
        recompute(nextValue, caret);
        updateAnchor();
      },
      [recompute, updateAnchor, resolveCaretVar],
    );
```

Footer precedence — replace the `footer` computation:

```tsx
    const footer =
      error ??
      (unknowns.length > 0
        ? t('liquidEditor.unknownVariable', { name: unknowns[0] })
        : caretVar?.description
          ? `${caretVar.label ?? caretVar.code} — ${caretVar.description}`
          : null);
```

(The joined string mixes consumer-provided label + description — per Rule 9 the dynamic parts come from props, so no new i18n key is needed for the ` — ` join.)

- [ ] **Step 4: Run to verify pass**

Run: `cd packages/design-system && npx vitest run src/components/LiquidEditor/LiquidEditor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/design-system/src/components/LiquidEditor/LiquidEditor.*
git commit -m "feat(LiquidEditor): footer shows the caret variable's description (#304)"
```

---

### Task 6: JSDoc example + AGENTS.md TL;DR

**Files:**
- Modify: `packages/design-system/src/components/LiquidEditor/LiquidEditor.tsx` (component JSDoc)
- Modify: `packages/design-system/AGENTS.md` (LiquidEditor section)

**Interfaces:**
- Consumes: everything above.
- Produces: docs only.

- [ ] **Step 1: Add a grouped-palette `@example`** to the `LiquidEditor` component JSDoc (after the existing first example):

```tsx
 * @example
 * // Grouped/dotted palette with descriptions and a collection variable.
 * const VARS = [
 *   { code: 'event.type', label: 'Event type', group: 'Event',
 *     description: 'The journal event type' },
 *   { code: 'record.associations', label: 'Associations', group: 'Record',
 *     collection: true, description: "The record's links — iterate with for" },
 * ];
 * // {{ event.type }} is known (root "event" matches), the insert menu drops a
 * // {% for %} snippet for Associations, and the footer explains the variable
 * // under the caret.
 * <LiquidEditor value={tpl} onChange={setTpl} variables={VARS} />
```

- [ ] **Step 2: Update `AGENTS.md`** — find the LiquidEditor section and add/extend the TL;DR with grouped palettes: dotted `code` roots are matched for unknown-flagging, `description` shows in menus + footer, `collection: true` inserts a `{% for %}` snippet and shows a "list" tag. Include a one-line snippet mirroring the `@example`.

- [ ] **Step 3: Run the full suite + typecheck**

Run: `cd /home/dpws/projects/design-system && make test && make build-lib`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add packages/design-system/src/components/LiquidEditor/LiquidEditor.tsx packages/design-system/AGENTS.md
git commit -m "docs(LiquidEditor): grouped-palette example + AGENTS.md TL;DR (#304)"
```
