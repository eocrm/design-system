# EntityChip Segments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `EntityChip` gains coloured `before` / `after` segments, `labelMaxWidth`, and a clipped-only label tooltip, so eocrm's `TaskChip` renders a type · key+title · priority · status chip from the DS (#582).

**Architecture:** Additions only to `EntityChip`. Without segments the markup is unchanged. With segments the root becomes a rounded clip (`.segmented`), today's children move into a `.core` span that keeps the chip fill/padding and is the only shrinking part, and palette segments (`.segment`) butt against it. Tooltips attach per segment; the label's tooltip is a controlled `<Tooltip>` that refuses to open unless the label is clipped.

**Tech Stack:** React 19 + TypeScript, CSS Modules (SCSS), Vitest + Testing Library, `postcss` + `sass` for compiled-CSS assertions.

**Spec:** `docs/superpowers/specs/2026-09-27-entitychip-segments-design.md`

## Global Constraints

- Work on branch `feat/entitychip-segments-582` (already checked out). Library root: `packages/design-system`.
- Tokens only in `.module.scss`; new tokens go in `EntityChip.tokens.scss` (`--entity-chip-segment-padding-x-icon: var(--space-1)`, `--entity-chip-segment-padding-x-text: var(--space-2)`, `--entity-chip-segment-glyph-size: 0.85em`, `--entity-chip-segment-text-size: 0.9em`).
- Segment `size?: number` is in **em** (not rem): icon → glyph size, text → font size.
- Rule 4: no layout props on the component root beyond what exists; an `align-self` on an internal child needs a `// stylelint-disable-next-line property-disallowed-list -- …` justification (precedent in `EntityChip.module.scss` `.icon`).
- Vitest has `globals: true` — do not import `describe`/`it`/`expect`/`vi`. Run tests from `packages/design-system`: `npx vitest run src/components/EntityChip`.
- Without `before`/`after`, EntityChip's DOM must stay byte-identical to today (Task 1 guards it).
- Segment `color` defaults to `'slate'`; colours via `paletteTokens(color)` from `../../palette` (returns `{ bg, fg }` CSS `var(...)` strings).
- Label weight stays `--entity-chip-label-font-weight` (medium); text segments use the same weight.
- `loading` / `unavailable` render no segments.
- i18n: no new user-facing strings are introduced (segment labels come from the consumer).
- Commits: end messages with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`; no session link.

## Review Focus

- An empty `before={[]}` / `after={[]}` must behave exactly like no segments (no `.segmented`, unchanged DOM) — Task 2 test.
- A segmented chip inside running text must share the text baseline (root baseline comes from the core, not an icon segment) — Task 2 CSS test (`align-items: baseline` on root, `align-self: stretch` on `.segment`) + Task 4 visual check.
- Hovering an icon segment must show ONE tooltip (its own), never the label tooltip too — Task 3 test.
- A fully visible label must never get a tooltip / `aria-describedby` (no double announcement) — Task 3 test.
- `labelMaxWidth` on a non-truncate, non-segmented chip still yields a single-line capped label — Task 3 test.

---

### Task 1: Guard today's markup

**Files:**
- Test: `packages/design-system/src/components/EntityChip/EntityChip.test.tsx` (append)

**Interfaces:**
- Consumes: nothing new.
- Produces: `normalizeClasses(html: string): string` helper local to the test file (used again in Task 2).

- [ ] **Step 1: Append the guard test**

```tsx
// CSS-module class names carry a per-file hash (`_chip_08a367`); strip it so
// the baseline survives stylesheet edits.
function normalizeClasses(html: string): string {
  return html.replace(/_([A-Za-z]+)_[0-9a-z]{6}/g, '$1');
}

describe('<EntityChip> — markup without segments is unchanged (#582)', () => {
  it('renders exactly the pre-segments DOM', () => {
    const { container } = render(
      <EntityChip
        href="/tasks/5"
        icon={<svg data-testid="i" />}
        prefix="ENG-5"
        label="Fix login bug"
        status={{ label: 'In progress', category: 'in_progress' }}
        trailing={<span>High</span>}
        truncate
      />,
    );
    expect(normalizeClasses(container.innerHTML)).toBe(
      '<a style="--entity-chip-status-fg: var(--color-palette-blue-fg);" class="chip truncate" href="/tasks/5">' +
        '<span class="icon" aria-hidden="true"><svg data-testid="i"></svg></span>' +
        '<span class="prefix">ENG-5</span>' +
        '<span class="label">Fix login bug</span>' +
        '<span class="dot" aria-hidden="true"></span>' +
        '<span class="status">In progress</span>' +
        '<span class="trailing"><span>High</span></span>' +
        '</a>',
    );
  });
});
```

- [ ] **Step 2: Run it — it must PASS against today's code**

Run: `npx vitest run src/components/EntityChip -t "pre-segments DOM"`
Expected: PASS (this is a regression guard, captured from the current implementation).

- [ ] **Step 3: Commit**

```bash
git add src/components/EntityChip/EntityChip.test.tsx
git commit -m "test: guard EntityChip markup before segments (#582)"
```

---

### Task 2: Segment types, rendering and layout

**Files:**
- Modify: `packages/design-system/src/components/EntityChip/EntityChip.tsx`
- Modify: `packages/design-system/src/components/EntityChip/EntityChip.module.scss`
- Modify: `packages/design-system/src/components/EntityChip/EntityChip.tokens.scss`
- Modify: `packages/design-system/src/components/EntityChip/index.ts`
- Modify: `packages/design-system/src/index.ts:146-152`
- Test: `packages/design-system/src/components/EntityChip/EntityChip.test.tsx`

**Interfaces:**
- Consumes: `normalizeClasses` (Task 1), `paletteTokens` from `../../palette`.
- Produces (exported from `src/index.ts`):
  ```ts
  export type EntityChipSegment =
    | { kind: 'icon'; icon: ReactNode; label: string; color?: PaletteColor; size?: number }
    | { kind: 'text'; text: ReactNode; color?: PaletteColor; tooltip?: ReactNode; size?: number };
  ```
  New `EntityChipOwnProps` fields: `before?: EntityChipSegment[]`, `after?: EntityChipSegment[]`.
  Internal: `function Segment({ segment }: { segment: EntityChipSegment }): ReactElement` in `EntityChip.tsx` (Task 3 adds tooltips inside it).
  CSS classes: `.segmented` (root), `.core`, `.segment`, `.segmentIcon`, `.segmentText`, `.segmentGlyph`.

- [ ] **Step 1: Write the failing tests** (append to `EntityChip.test.tsx`; add `import { parse, type Rule } from 'postcss';` and `import { compile } from 'sass';` to the imports)

```tsx
const TASK_BEFORE = [
  { kind: 'icon' as const, icon: <svg data-testid="type" />, label: 'Bug', color: 'red' as const },
];
const TASK_AFTER = [
  { kind: 'icon' as const, icon: <svg data-testid="prio" />, label: 'Normal' },
  { kind: 'text' as const, text: 'Reported', color: 'amber' as const },
];

describe('<EntityChip> — segments (#582)', () => {
  it('renders before → core → after, the whole chip one link named by every part', () => {
    render(
      <EntityChip href="/tasks/15" prefix="ENG-15" label="Fix the login bug" before={TASK_BEFORE} after={TASK_AFTER} />,
    );
    // jsdom has no layout, so it doesn't separate the core's own prefix/label
    // spans (browsers do — they're blockified flex items); the whitespace the
    // component puts BETWEEN segments and core is what this asserts.
    const link = screen.getByRole('link', { name: /^Bug ENG-15.*Fix the login bug Normal Reported$/ });
    expect(link.className).toMatch(/segmented/);
    const parts = Array.from(link.children).map((c) => c.className.replace(/_([A-Za-z]+)_[0-9a-z]{6}/g, '$1'));
    expect(parts).toEqual(['segment segmentIcon', 'core', 'segment segmentIcon', 'segment segmentText']);
  });

  it('icon segment: role=img named by label, glyph hidden, palette colours set (slate default)', () => {
    render(<EntityChip href="/t" label="T" before={TASK_BEFORE} after={TASK_AFTER} />);
    const bug = screen.getByRole('img', { name: 'Bug' });
    expect(screen.getByTestId('type').parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(bug.style.getPropertyValue('--entity-chip-segment-bg')).toBe('var(--color-palette-red-bg)');
    expect(screen.getByRole('img', { name: 'Normal' }).style.getPropertyValue('--entity-chip-segment-fg')).toBe(
      'var(--color-palette-slate-fg)',
    );
  });

  it('size overrides the glyph (icon) or font size (text), in em', () => {
    render(
      <EntityChip
        href="/t"
        label="T"
        after={[
          { kind: 'icon', icon: <svg />, label: 'Big', size: 1.2 },
          { kind: 'text', text: 'Small', size: 0.75 },
        ]}
      />,
    );
    expect(screen.getByRole('img', { name: 'Big' }).style.getPropertyValue('--entity-chip-segment-glyph-size')).toBe(
      '1.2em',
    );
    expect(screen.getByText('Small').style.fontSize).toBe('0.75em');
  });

  it('keeps the core content (icon, prefix, label, status, trailing) inside .core', () => {
    const { container } = render(
      <EntityChip
        href="/t"
        prefix="K"
        label="L"
        status={{ label: 'Open', category: 'to_do' }}
        trailing={<span>tr</span>}
        after={TASK_AFTER}
      />,
    );
    const core = container.querySelector('[class*="core"]') as HTMLElement;
    expect(core).toHaveTextContent('KLOpentr');
  });

  it('empty segment arrays behave exactly like none', () => {
    const { container } = render(<EntityChip href="/t" label="L" before={[]} after={[]} />);
    expect(normalizeClasses(container.innerHTML)).toBe(
      '<a class="chip" href="/t"><span class="label">L</span></a>',
    );
  });

  it('loading and unavailable render no segments', () => {
    const { container, rerender } = render(
      <EntityChip href="/t" label="L" loading before={TASK_BEFORE} after={TASK_AFTER} />,
    );
    expect(container.querySelector('[class*="segment"]')).toBeNull();
    rerender(<EntityChip href="/t" label="L" unavailable before={TASK_BEFORE} after={TASK_AFTER} />);
    expect(container.querySelector('[class*="segment"]')).toBeNull();
  });
});

describe('<EntityChip> — segmented layout CSS (#582)', () => {
  const css = parse(compile(resolve(__dirname, './EntityChip.module.scss')).css);
  const decl = (selector: string, prop: string): string | undefined => {
    let value: string | undefined;
    css.walkRules((rule: Rule) => {
      if (rule.selector !== selector) return;
      rule.walkDecls(prop, (d) => {
        value = d.value;
      });
    });
    return value;
  };

  it('root is the rounded clip: no padding/fill, clips, baseline from the core', () => {
    expect(decl('.chip.segmented', 'padding')).toBe('0');
    expect(decl('.chip.segmented', 'background')).toBe('none');
    expect(decl('.chip.segmented', 'overflow')).toBe('hidden');
    expect(decl('.chip.segmented', 'align-items')).toBe('baseline');
    expect(decl('.chip.segmented', 'max-width')).toBe('100%');
    expect(decl('.chip.segmented', 'white-space')).toBe('nowrap');
  });

  it('core shrinks and ellipsizes its label; segments never shrink and stretch to the core', () => {
    expect(decl('.core', 'flex-shrink')).toBe('1');
    expect(decl('.core', 'min-width')).toBe('0');
    expect(decl('.core > .label', 'text-overflow')).toBe('ellipsis');
    expect(decl('.segment', 'flex-shrink')).toBe('0');
    expect(decl('.segment', 'align-self')).toBe('stretch');
    expect(decl('.segmentGlyph > svg', 'width')).toBe('var(--entity-chip-segment-glyph-size)');
    expect(decl('.segmentText', 'font-size')).toBe('var(--entity-chip-segment-text-size)');
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/components/EntityChip`
Expected: the new "segments" and "segmented layout CSS" tests FAIL (props ignored / selectors missing); Task 1's guard still PASSES.

- [ ] **Step 3: Implement — tokens** (`EntityChip.tokens.scss`, inside `:root`, after `--entity-chip-dot-size`)

```scss
  // Segments (#582): palette-coloured parts butted against the core. The
  // fill/fg come from the segment's PaletteColor at runtime
  // (--entity-chip-segment-bg/-fg), so they're not declared here.
  --entity-chip-segment-padding-x-icon: var(--space-1);
  --entity-chip-segment-padding-x-text: var(--space-2);

  // Relative to the inherited text size, like the chip itself; a segment's
  // `size` prop overrides them in em.
  --entity-chip-segment-glyph-size: 0.85em;
  --entity-chip-segment-text-size: 0.9em;
```

- [ ] **Step 4: Implement — styles** (append to `EntityChip.module.scss`)

```scss
// Segmented chip (#582): the root is only the rounded clip; the core carries
// today's fill and padding, and palette segments butt against it. One line:
// only the core's label gives way.
.chip.segmented {
  align-items: baseline;
  gap: 0;
  max-width: 100%;
  min-width: 0;
  padding: 0;
  overflow: hidden;
  background: none;
  white-space: nowrap;

  &:is(a, button):hover {
    background: none;
  }
}

.core {
  display: inline-flex;
  flex-shrink: 1;
  align-items: baseline;
  gap: var(--entity-chip-gap);
  min-width: 0;
  padding: var(--entity-chip-padding-top) var(--entity-chip-padding-x)
    var(--entity-chip-padding-bottom);
  background: var(--entity-chip-bg);

  > * {
    flex-shrink: 0;
  }

  > .label {
    flex-shrink: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.segmented:is(a, button):hover .core {
  background: var(--entity-chip-bg-hover);
}

.segment {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  // stylelint-disable-next-line property-disallowed-list -- internal child of the chip's OWN flex row: the root aligns on the core's text baseline, segments fill its height
  align-self: stretch;
  padding-top: var(--entity-chip-padding-top);
  padding-bottom: var(--entity-chip-padding-bottom);
  background: var(--entity-chip-segment-bg);
  color: var(--entity-chip-segment-fg);
}

.segmentIcon {
  padding-inline: var(--entity-chip-segment-padding-x-icon);
}

.segmentText {
  padding-inline: var(--entity-chip-segment-padding-x-text);
  font-size: var(--entity-chip-segment-text-size);
  font-weight: var(--entity-chip-label-font-weight);
}

.segmentGlyph {
  display: inline-flex;

  > svg {
    width: var(--entity-chip-segment-glyph-size);
    height: var(--entity-chip-segment-glyph-size);
  }
}
```

- [ ] **Step 5: Implement — types and rendering** (`EntityChip.tsx`)

Add after `EntityChipStatus`:

```tsx
/**
 * A coloured part of a segmented chip (#582), rendered before or after the
 * chip's core (icon · prefix · label · status · trailing).
 * - `icon` — a glyph on a palette colour. `label` is its accessible name (the
 *   segment is `role="img"`) and its tooltip; the glyph is sized to the text.
 * - `text` — a short value (e.g. a status) on a palette colour, same weight as
 *   the label, with an optional `tooltip`.
 * `color` defaults to `'slate'`. `size` (in em of the chip text) overrides
 * the glyph size (icon, default 0.85em) or the font size (text, default
 * 0.9em). Non-interactive: the chip is the link.
 */
export type EntityChipSegment =
  | { kind: 'icon'; icon: ReactNode; label: string; color?: PaletteColor; size?: number }
  | { kind: 'text'; text: ReactNode; color?: PaletteColor; tooltip?: ReactNode; size?: number };
```

Add to `EntityChipOwnProps` (after `trailing`):

```tsx
  /**
   * Coloured segments before the chip's core, in order (e.g. the task type).
   * Any segment turns the chip segmented: one line, only the outer corners
   * rounded, only the label shrinks (as with `truncate`). Every segment's text
   * joins the accessible name ("Bug ENG-15 Fix login bug Normal Reported").
   * Not rendered while `loading` or `unavailable`.
   */
  before?: EntityChipSegment[];
  /** Coloured segments after the core, in order (e.g. priority, status). See `before`. */
  after?: EntityChipSegment[];
```

Add above the component:

```tsx
/** Palette fill/fg for one segment, read by `.segment`, plus its `size` override. */
function segmentStyle(segment: EntityChipSegment): CSSProperties {
  const { bg, fg } = paletteTokens(segment.color ?? 'slate');
  const style: Record<string, string> = { '--entity-chip-segment-bg': bg, '--entity-chip-segment-fg': fg };
  if (segment.size != null) {
    if (segment.kind === 'icon') style['--entity-chip-segment-glyph-size'] = `${segment.size}em`;
    else style.fontSize = `${segment.size}em`;
  }
  return style as CSSProperties;
}

function Segment({ segment }: { segment: EntityChipSegment }) {
  if (segment.kind === 'icon') {
    return (
      <span
        className={clsx(styles.segment, styles.segmentIcon)}
        style={segmentStyle(segment)}
        role="img"
        aria-label={segment.label}
      >
        <span className={styles.segmentGlyph} aria-hidden="true">
          {segment.icon}
        </span>
      </span>
    );
  }
  return (
    <span className={clsx(styles.segment, styles.segmentText)} style={segmentStyle(segment)}>
      {segment.text}
    </span>
  );
}
```

In the component: destructure `before`, `after`; then

```tsx
  // Segments only in the normal state — like prefix/status under `loading`, a
  // not-yet-loaded or unavailable entity has no known type/status (#582).
  const segmented = !loading && !unavailable && ((before?.length ?? 0) > 0 || (after?.length ?? 0) > 0);
```

Add `Fragment` to the `react` import. Add `segmented && styles.segmented` to the root `clsx(...)`. Assign today's JSX children (the `{icon && …}{loading ? … : …}` block) to `const content = (<>…</>);` unchanged, and render:

```tsx
      {segmented ? (
        <>
          {/* A space after/before each part keeps the accessible name
              "Bug ENG-15 … Normal Reported" separated in every engine, not
              only where blockified flex items get a separator. Whitespace-only
              text between flex items isn't rendered, so layout is unchanged. */}
          {before?.map((segment, i) => (
            <Fragment key={`b${i}`}>
              <Segment segment={segment} />{' '}
            </Fragment>
          ))}
          <span className={styles.core}>{content}</span>
          {after?.map((segment, i) => (
            <Fragment key={`a${i}`}>
              {' '}
              <Segment segment={segment} />
            </Fragment>
          ))}
        </>
      ) : (
        content
      )}
```

- [ ] **Step 6: Export the type** — `EntityChip/index.ts`: add `EntityChipSegment` to the `export type { … } from './EntityChip'` list; `src/index.ts`: add `EntityChipSegment,` to the EntityChip type export block.

- [ ] **Step 7: Run tests**

Run: `npx vitest run src/components/EntityChip && cd ../.. && npx stylelint "packages/design-system/src/components/EntityChip/*.scss" && npm run typecheck`
Expected: all PASS, stylelint and typecheck clean.

- [ ] **Step 8: Commit**

```bash
git add src/components/EntityChip src/index.ts
git commit -m "feat: EntityChip before/after coloured segments (#582)"
```

---

### Task 3: Tooltips and `labelMaxWidth`

**Files:**
- Modify: `packages/design-system/src/components/EntityChip/EntityChip.tsx`
- Modify: `packages/design-system/src/components/EntityChip/EntityChip.module.scss`
- Test: `packages/design-system/src/components/EntityChip/EntityChip.test.tsx`

**Interfaces:**
- Consumes: `Segment`, `segmented`, `.core > .label` from Task 2; `Tooltip` from `../Tooltip` (`content`, `open`, `onOpenChange`, `delay`; sets `aria-describedby` only while open; merges the child's `ref`).
- Produces: prop `labelMaxWidth?: number` (ch); CSS class `.capped` on the label.

- [ ] **Step 1: Write the failing tests** (append)

```tsx
// jsdom has no layout: fake the label's box to say whether it is clipped.
function fakeClip(el: HTMLElement, clipped: boolean) {
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: 100 });
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: clipped ? 300 : 100 });
}

describe('<EntityChip> — tooltips and labelMaxWidth (#582)', () => {
  it('icon segment shows its label on hover, and only that tooltip', async () => {
    const user = userEvent.setup();
    render(<EntityChip href="/t" label="Fix" truncate before={TASK_BEFORE} />);
    await user.hover(screen.getByRole('img', { name: 'Bug' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Bug');
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
  });

  it('text segment shows its tooltip when given', async () => {
    const user = userEvent.setup();
    render(
      <EntityChip href="/t" label="Fix" after={[{ kind: 'text', text: 'Reported', tooltip: 'Status: Reported' }]} />,
    );
    await user.hover(screen.getByText('Reported'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Status: Reported');
  });

  it('label tooltip shows the full label only when the label is clipped', async () => {
    const user = userEvent.setup();
    render(<EntityChip href="/t" label="A very long task title" truncate />);
    const label = screen.getByText('A very long task title');
    fakeClip(label, true);
    await user.hover(label);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('A very long task title');
  });

  it('a fully visible label gets no tooltip and no aria-describedby', async () => {
    const user = userEvent.setup();
    render(<EntityChip href="/t" label="Short" truncate />);
    const label = screen.getByText('Short');
    fakeClip(label, false);
    await user.hover(label);
    await new Promise((r) => setTimeout(r, 600)); // past Tooltip's 400ms delay
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(label).not.toHaveAttribute('aria-describedby');
  });

  it('labelMaxWidth caps the label in ch, single-line, even without truncate/segments', () => {
    render(<EntityChip href="/t" label="Long title" labelMaxWidth={40} />);
    const label = screen.getByText('Long title');
    expect(label.style.maxWidth).toBe('40ch');
    expect(label.className).toMatch(/capped/);
  });

  it('.capped makes the label single-line with an ellipsis', () => {
    const scss = readFileSync(resolve(__dirname, 'EntityChip.module.scss'), 'utf8');
    expect(scss).toMatch(
      /\.capped\s*\{[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap;/,
    );
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/components/EntityChip -t "tooltips and labelMaxWidth"`
Expected: FAIL (no tooltips, no `labelMaxWidth`).

- [ ] **Step 3: Implement styles** (append to `EntityChip.module.scss`)

```scss
// `labelMaxWidth` (#582): the label alone is capped (max-width set inline in
// `ch`) and ellipsizes on one line — also on a chip that otherwise wraps.
.capped {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 4: Implement tooltips + prop** (`EntityChip.tsx`)

Imports: add `useRef`, `useState` to the `react` import; add `import { Tooltip } from '../Tooltip';`.

Prop (after `after`):

```tsx
  /**
   * Caps the label's width, in `ch`; past it the label ellipsizes on one line
   * (also on a chip without `truncate`). For chips in running text, where the
   * container edge is a whole paragraph away. The full label stays in the DOM
   * and the accessible name; hovering a clipped label shows it in a tooltip.
   */
  labelMaxWidth?: number;
```

In `Segment`: wrap the icon span in `<Tooltip content={segment.label}>…</Tooltip>`; for text, `const node = <span …>{segment.text}</span>; return segment.tooltip != null ? <Tooltip content={segment.tooltip}>{node}</Tooltip> : node;`.

In the component: destructure `labelMaxWidth`; add

```tsx
  // Full label on hover, but only when it is actually clipped: a controlled
  // Tooltip that refuses to open otherwise, so a fully visible label gets no
  // tooltip and no aria-describedby (it would be announced twice).
  const labelRef = useRef<HTMLSpanElement>(null);
  const [labelTipOpen, setLabelTipOpen] = useState(false);
  const clippable = segmented || truncate || labelMaxWidth != null;
  const onLabelTip = (next: boolean) => {
    const el = labelRef.current;
    setLabelTipOpen(next && el != null && el.scrollWidth > el.clientWidth);
  };
```

Replace the label span `<span className={styles.label}>{label}</span>` with:

```tsx
          {clippable ? (
            <Tooltip content={label} open={labelTipOpen} onOpenChange={onLabelTip}>
              <span
                ref={labelRef}
                className={clsx(styles.label, labelMaxWidth != null && styles.capped)}
                style={labelMaxWidth != null ? { maxWidth: `${labelMaxWidth}ch` } : undefined}
              >
                {label}
              </span>
            </Tooltip>
          ) : (
            <span className={styles.label}>{label}</span>
          )}
```

(Task 1's guard uses `truncate`, so the Tooltip wrapper is active there: a closed Tooltip adds only event handlers and a ref — no attributes — so the guard must still pass.)

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/components/EntityChip src/components/Tooltip`
Expected: all PASS, including Task 1's markup guard.

- [ ] **Step 6: Commit**

```bash
git add src/components/EntityChip
git commit -m "feat: EntityChip segment tooltips, clipped-label tooltip, labelMaxWidth (#582)"
```

---

### Task 4: Docs, demo, manifest, visual check

**Files:**
- Modify: `packages/design-system/src/components/EntityChip/EntityChip.tsx` (JSDoc on the component)
- Modify: `packages/design-system/AGENTS.md` (EntityChip section)
- Modify: `packages/playground/src/pages/components/EntityChipDemo.tsx`
- Regenerate: `packages/playground/src/lib/props.manifest.json` (`npm run build:props -w playground` from repo root)

**Interfaces:**
- Consumes: `EntityChip` props `before`, `after`, `labelMaxWidth`, type `EntityChipSegment` (Tasks 2–3).
- Produces: nothing consumed by code.

- [ ] **Step 1: Component JSDoc** — add an `@example` and anti-patterns to the EntityChip docblock:

```tsx
 * @example
 * // Segmented task chip — the whole chip is one link, one Tab stop:
 * <EntityChip
 *   as={RouterLink} to="/tasks/ENG-15"
 *   prefix="ENG-15" label="Fix the login bug on Safari" labelMaxWidth={40}
 *   before={[{ kind: 'icon', icon: <Bug />, label: 'Bug', color: 'red' }]}
 *   after={[
 *     { kind: 'icon', icon: <Equal />, label: 'Normal priority', color: 'slate' },
 *     { kind: 'text', text: 'Reported', color: 'amber' },
 *   ]}
 * />
```

and under `@remarks Anti-patterns`:

```tsx
 * - ❌ Nesting `<IconTile>` / `<Badge>` in `icon`/`trailing` to fake coloured
 *   parts — use `before`/`after` segments, which line up with the chip's text.
 * - ❌ An icon segment without a meaningful `label` — it is the segment's
 *   accessible name; a decorative glyph belongs in `icon`, not a segment.
```

- [ ] **Step 2: AGENTS.md** — in the EntityChip section add a snippet (same as the JSDoc example) and a bullet:

```md
- **Segments** (`before` / `after`, #582): coloured parts butted against the chip — `{ kind: 'icon', icon, label, color? }` (label = accessible name + tooltip) or `{ kind: 'text', text, color?, tooltip? }`. The whole chip stays one link; every segment joins its name. Any segment makes the chip one line (only the label shrinks) with only the outer corners rounded. Not rendered while `loading`/`unavailable`. `labelMaxWidth` (ch) caps the label in running text; a clipped label shows its full text in a tooltip on hover.
```

- [ ] **Step 3: Playground demo** — in `EntityChipDemo.tsx` add imports `Bug`, `Equal` from `lucide-react`, then a new `<Example title="Segmented (task chip)">` before `</DemoLayout>` whose rendered JSX and `code` string are identical and self-contained:

```tsx
<Stack gap="md">
  <Text>
    Blocked by{' '}
    <EntityChip
      href="#"
      prefix="ENG-15"
      label="Fix the login bug that only happens on Safari when the session cookie expires"
      labelMaxWidth={40}
      before={[{ kind: 'icon', icon: <Bug />, label: 'Bug', color: 'red' }]}
      after={[
        { kind: 'icon', icon: <Equal />, label: 'Normal priority', color: 'slate' },
        { kind: 'text', text: 'Reported', color: 'amber' },
      ]}
    />{' '}
    and <EntityChip href="#" icon={<Building2 />} label="Acme Corp" />.
  </Text>
  <ResizablePreview>
    <EntityChip
      href="#"
      prefix="ENG-15"
      label="Fix the login bug that only happens on Safari when the session cookie expires"
      before={[{ kind: 'icon', icon: <Bug />, label: 'Bug', color: 'red' }]}
      after={[
        { kind: 'icon', icon: <Equal />, label: 'Normal priority', color: 'slate' },
        { kind: 'text', text: 'Reported', color: 'amber' },
      ]}
    />
  </ResizablePreview>
</Stack>
```

(Check `ResizablePreview`'s props in `ResizablePreview.tsx` and match the file's existing usage; import only from `@eocrm/design-system` and `lucide-react`.)

- [ ] **Step 4: Manifest + gates** (repo root)

Run:
```bash
npm run build:props -w playground && npx prettier --write packages/playground/src/lib/props.manifest.json
cd packages/design-system && npm run build:manifest && cd ../..
make test && make build-lib && make lint && npm run format:check && npm run typecheck
```
Expected: all exit 0.

- [ ] **Step 5: Visual check** (dev server on port 8090, never the default): `cd packages/playground && npx vite --port 8090 --strictPort`, open `/components/entity-chip` in Playwright and measure in the "Segmented (task chip)" example:
  - the segmented chip's height equals the plain `Acme Corp` chip's height in the same `<p>`, and their text shares a baseline (compare label glyph-box `top`/`bottom` via a Range);
  - the capped label ellipsizes at ~40ch; in the ResizablePreview the chip never exceeds the container and only the label shrinks;
  - only the chip's outer corners are rounded.
  Kill the server and `rm -rf .playwright-mcp` afterwards.

- [ ] **Step 6: Commit**

```bash
git add packages/design-system packages/playground
git commit -m "docs: EntityChip segments — JSDoc, AGENTS.md, demo (#582)"
```
