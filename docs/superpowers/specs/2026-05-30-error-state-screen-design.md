# `<ErrorState>` + `<Screen>` — page-status block & full-bleed screen layout

## Goal

Ship two library primitives that back the EOCRM's **404** and **error-boundary** screens, then build
those screens as playground mockups (each in an **in-app** and a **standalone** variant) on top of them:

1. **`<ErrorState>`** — a page-level status/result block (icon · title · description · actions · extra),
   the dedicated component `EmptyState`'s JSDoc already points to for "page-level 404 / 500" and the
   "danger-tinted treatment … live regions, retry actions" it intentionally doesn't ship.
2. **`<Screen>`** — a full-bleed / centered screen layout primitive (header · centered main · footer,
   optional tinted backdrop). It absorbs the inline-style escape hatch the Login mockup hand-rolls today
   and backs every standalone screen, closing the deferred `<AuthScreen>` `TODO.md` gap.

Then four mockups (two registry entries, each with an in-app + standalone variant) + the Login refactor.

## Locked-in decisions (brainstorm)

1. **Two components, both new library primitives** — `<ErrorState>` (Display cluster) and `<Screen>`
   (Layout cluster). Not mockup-only.
2. **Name `ErrorState`** (chosen over `Result` / `StatusState`). It carries a `tone` so a _neutral_ 404
   and a _danger_ 500 both compose from it; the name is error-leaning by deliberate choice.
3. **`ErrorState` tone scale = `neutral | danger` only.** `warning` / `success` are out of scope
   (YAGNI) but trivially extensible (one color class + one token each).
4. **Error screen shows an Error ID, no stack trace** — `extra={<Text>Error ID: a1b2-c3d4</Text>}`,
   end-user-facing. No dev `Code`/stack block.
5. **Actions are nav-focused.** 404: `Back to dashboard` + `Search` (in-app) / `Go to homepage` +
   `Go back` (standalone). Error: `Try again` + `Back to dashboard` (in-app) / `Reload` + `Go to
homepage` (standalone).
6. **Four states, organized as 2 registry entries + a toggle.** `Not found` (`/mockups/404`) and
   `Error` (`/mockups/error`) are the in-app variants and the only nav / index entries; each links to
   its standalone full-bleed route (`/mockups/404-standalone`, `/mockups/error-standalone`), which are
   reachable only via that toggle (not in nav, not in the index grid).
7. **`Screen` owns `fill` + `backdrop`.** `fill="block"` for the in-app variants (fills the content
   area), `fill="viewport"` (default, `min-height:100vh`) for standalone. `backdrop` = `none | plain |
accent | danger`.
8. **Refactor Login onto `<Screen>` in this same PR** — delete both inline-style escape-hatch blocks +
   TODO comments, add `Screen` to its registry list, tick the `<AuthScreen>` `TODO.md` entry as
   **superseded by `<Screen>`**.
9. **No i18n on either component** — every string is consumer-supplied (like `EmptyState`). Mockups use
   plain English strings (like the Login mockup), since Hard rule 9 (i18n) is library-only.

---

## Component A — `<ErrorState>`

**Cluster:** Display (beside `EmptyState`). **Tier:** primitive (imports no other library component).

### Why a separate component (vs `EmptyState`)

`EmptyState`'s JSDoc explicitly defers three things to "a dedicated error page": page-level 404/500
treatment, danger tinting, and error a11y (live regions, retry). `ErrorState` is that component. It
mirrors EmptyState's stacked shape and prop ergonomics so the two read as siblings, and differs only
where the page-status role demands:

|                        | `EmptyState`                    | `ErrorState`                                           |
| ---------------------- | ------------------------------- | ------------------------------------------------------ |
| Role                   | "nothing here" inside a surface | page-level status / result screen                      |
| `tone`                 | —                               | `neutral` \| `danger` (icon tint + danger live-region) |
| `extra` slot           | —                               | yes (error ID, status link) below actions              |
| `size` default         | `md`                            | `lg`                                                   |
| `headingLevel` default | `3`                             | `1`                                                    |
| danger a11y            | —                               | `role="alert"` on the `<section>` (overridable)        |

### Props

```ts
import { type HTMLAttributes, type ReactNode } from 'react';

/** Visual size. Tracks the typography + spacing scale (mirrors EmptyState). */
export type ErrorStateSize = 'sm' | 'md' | 'lg';

/** Horizontal alignment of the stacked content. */
export type ErrorStateAlign = 'center' | 'start';

/** Status tone — drives the icon tint and the danger live-region. */
export type ErrorStateTone = 'neutral' | 'danger';

/** Valid `<h*>` heading levels. */
export type ErrorStateHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface ErrorStateProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Icon above the title. Pass a lucide icon, sized by the consumer (lg→48, md→32, sm→24). */
  icon?: ReactNode;
  /** Required title, rendered as a semantic heading (default `<h1>`). */
  title: ReactNode;
  /** Optional description below the title. */
  description?: ReactNode;
  /** Optional action(s) — a `<Button>` or a `<Cluster gap="sm">` of buttons. */
  actions?: ReactNode;
  /**
   * Optional supplemental content rendered below the actions — e.g. an
   * `Error ID: …` line or a "view status" link. Distinct from `description`:
   * it sits after the actions and reads as metadata, not primary copy.
   */
  extra?: ReactNode;
  /**
   * Status tone. Defaults to `'neutral'`.
   * - `'neutral'` — informational (404 / not-found). Icon uses `--color-fg-muted`.
   * - `'danger'` — an error (500 / crash). Icon uses `--color-danger`, and the
   *   wrapper gets `role="alert"` so an error-boundary fallback announces on mount.
   */
  tone?: ErrorStateTone;
  /** Visual size. Defaults to `'lg'` (page-level). `sm`/`md` for embedded use. */
  size?: ErrorStateSize;
  /** Horizontal alignment of the stacked content. Defaults to `'center'`. */
  align?: ErrorStateAlign;
  /** Heading level for `title`. Defaults to `1` (page-level). Values outside 1–6 clamp to `1`. */
  headingLevel?: ErrorStateHeadingLevel;
}
```

### Render & a11y

- `forwardRef<HTMLElement>` → the `<section>`. **Pattern A** (props spread last) so a consumer can
  override `role`, `aria-*`, etc.
- Structure mirrors EmptyState: `<section>` → optional `.icon` span → heading (`createElement(\`h${level}\`)`)
→ optional `.description` `<p>`→ optional`.actions` `<div>`→ **optional`.extra` `<div>`\*\*.
- `tone="danger"` adds `role="alert"` to the `<section>` (default, before `{...props}` so the consumer
  can override). `tone="neutral"` sets no role — the `<h1>` is the page heading; the section becomes a
  named landmark only if the consumer passes `aria-label`/`aria-labelledby` (same contract as EmptyState).
- Icon is NOT auto-`aria-hidden` (consumer's icon may be semantic) — demos/mockups pass
  `aria-hidden="true"` on decorative icons.
- **No i18n** — all visible text is consumer-supplied.

### SCSS (`ErrorState.module.scss` + `ErrorState.tokens.scss`)

Follows EmptyState exactly: `display:flex; flex-direction:column; width:100%`, `.align-center`
(`align-items:center; text-align:center`) / `.align-start`, `.size-{sm,md,lg}` (gap + padding),
`.icon` (color by tone), `.title` (margin-reset via the documented `stylelint-disable
property-disallowed-list`), `.description` (margin-reset + `max-width:48ch`), `.actions`
(`inline-flex`), `.extra`. Tone drives icon color via `.tone-neutral .icon { color: var(--error-state-icon-fg-neutral) }`
and `.tone-danger .icon { color: var(--error-state-icon-fg-danger) }`.

Component tokens in `ErrorState.tokens.scss` (default to primitives, per the component-tokens convention):

```scss
:root {
  --error-state-icon-fg-neutral: var(--color-fg-muted);
  --error-state-icon-fg-danger: var(--color-danger);
  --error-state-title-fg: var(--color-fg);
  --error-state-description-fg: var(--color-fg-subtle);
  /* gap / padding / font-size per size — mirror the --empty-state-* scale (title-fg/desc-fg match EmptyState) */
}
```

No layout properties on the component box (`width:100%` only; the parent — usually `<Screen>` or
`<Page>` — positions it). `margin`/`max-width` resets carry the same `stylelint-disable` justification
comments EmptyState uses.

### Tests (`ErrorState.test.tsx`)

- Renders title as the default `<h1>`; `headingLevel={2}` → `<h2>`; out-of-range clamps to `<h1>`.
- `tone="danger"` → `role="alert"` present + danger icon class; `tone="neutral"` (default) → no `role`,
  neutral icon class.
- `size`/`align` apply the right classes (default `lg` + `center`).
- `icon` / `description` / `actions` / `extra` each render when passed and are absent when omitted; the
  `extra` node renders after the actions in DOM order.
- `ref` forwards to the `<section>`.
- `className` merges (not replaces); other attrs (`data-*`, and a consumer `role` override) spread onto
  the `<section>`.

---

## Component B — `<Screen>`

**Cluster:** Layout (beside `Page`). **Tier:** primitive. **Layout-owning primitive** — the documented
Rule-4 exception (like `Page` / `Rail`): it intentionally sets page-layout properties (`min-height`,
`flex:1`) that ordinary components may not.

### Props

```ts
import { type HTMLAttributes, type ReactNode } from 'react';

/** How tall the screen is. */
export type ScreenFill = 'viewport' | 'block';
/** Backdrop treatment behind the centered content. */
export type ScreenBackdrop = 'none' | 'plain' | 'accent' | 'danger';
/** Vertical placement of the main content. */
export type ScreenAlign = 'center' | 'start';

export interface ScreenProps extends HTMLAttributes<HTMLDivElement> {
  /** The centered main content. */
  children: ReactNode;
  /** Pinned-top slot — a back link, wordmark, etc. Omit for none. */
  header?: ReactNode;
  /** Pinned-bottom slot — legal / footer links. Omit for none. */
  footer?: ReactNode;
  /**
   * Screen height. Defaults to `'viewport'`.
   * - `'viewport'` — `min-height:100vh`; a true standalone page (login, standalone 404/error).
   * - `'block'` — fills its container instead of the viewport; use when the Screen is embedded
   *   inside the app shell's content area (the in-app 404 / error variants).
   */
  fill?: ScreenFill;
  /**
   * Backdrop behind the content. Defaults to `'none'` (transparent — inherits the surface).
   * - `'none'` — transparent. Use for `fill="block"` inside the shell.
   * - `'plain'` — solid `--color-bg-subtle`.
   * - `'accent'` — accent-tinted radial (the Login backdrop).
   * - `'danger'` — danger-tinted radial (standalone error screen).
   */
  backdrop?: ScreenBackdrop;
  /** Vertical placement of the main content. Defaults to `'center'`. `'start'` top-aligns it. */
  align?: ScreenAlign;
}
```

### Render

`forwardRef<HTMLDivElement>`, **Pattern A** (props last). Structure:

```tsx
<div
  ref={ref}
  className={clsx(styles.root, styles[`fill-${fill}`], styles[`backdrop-${backdrop}`], className)}
  {...rest}
>
  {header != null && <div className={styles.header}>{header}</div>}
  <div className={clsx(styles.main, styles[`align-${align}`])}>{children}</div>
  {footer != null && <div className={styles.footer}>{footer}</div>}
</div>
```

- **No i18n** — slots are consumer-supplied.
- `header`/`footer` render only when provided (no empty boxes that disturb centering).

### SCSS (`Screen.module.scss` + `Screen.tokens.scss`)

```scss
.root {
  display: flex;
  flex-direction: column;
  padding: var(--screen-padding);
}

/* Layout-owning primitive — Rule-4 exception (see Page/Rail). */
/* stylelint-disable property-disallowed-list -- Screen is a page-layout primitive; min-height/flex are its purpose. */
.fill-viewport {
  min-height: 100vh;
}
.fill-block {
  min-height: var(--screen-block-min-height);
} /* fills the shell content area */
.main {
  flex: 1;
  display: grid;
}
/* stylelint-enable property-disallowed-list */

.align-center {
  place-items: center;
}
.align-start {
  place-items: start center;
}

.backdrop-plain {
  background: var(--screen-backdrop-plain);
}
.backdrop-accent {
  background: var(--screen-backdrop-accent);
}
.backdrop-danger {
  background: var(--screen-backdrop-danger);
}
/* backdrop-none: no background rule (transparent) */
```

Component tokens (`Screen.tokens.scss`) — the gradient stops reference primitives so stylelint's
strict-value rule is satisfied (geometry percentages are not tokenized values):

```scss
:root {
  --screen-padding: var(--space-6);
  --screen-block-min-height: 60vh; /* enough to center within the shell content area */
  --screen-backdrop-plain: var(--color-bg-subtle);
  --screen-backdrop-accent: radial-gradient(
    120% 90% at 50% -8%,
    var(--color-accent-subtle-bg) 0%,
    var(--color-bg-subtle) 52%
  );
  --screen-backdrop-danger: radial-gradient(
    120% 90% at 50% -8%,
    var(--color-danger-bg-subtle) 0%,
    var(--color-bg-subtle) 55%
  );
}
```

> The exact `.stylelintrc.json` rule name + whether `min-height`/`flex` are in the disallow list is
> verified during plan-writing; if the linter doesn't flag them, the `stylelint-disable` comments are
> dropped. Either way the SCSS reads as a documented layout primitive.

### Tests (`Screen.test.tsx`)

- Renders `children` inside `.main`.
- `fill` default `viewport` class; `fill="block"` swaps it. `backdrop` default `none` (no backdrop
  class); each of `plain`/`accent`/`danger` applies its class. `align` default `center`; `start` swaps.
- `header` / `footer` render when passed; absent (no `.header` / `.footer` node) when omitted.
- `ref` forwards to the root `<div>`.
- `className` merges; other attrs spread onto the root.

---

## Mockups (playground)

Four screens, two registry entries. All under `packages/playground/src/pages/mockups/`. Plain English
strings (mockups, not library). Navigation uses `useNavigate()` for action buttons and
`<Link as={RouterLink}>` for the toggles, exactly as the Login mockup wires `react-router-dom`.

### Files

```
pages/mockups/NotFound/NotFound.tsx               # /mockups/404            (in-app, fill="block")
pages/mockups/NotFound/NotFoundStandalone.tsx     # /mockups/404-standalone (full-bleed)
pages/mockups/AppError/AppError.tsx               # /mockups/error          (in-app, fill="block")
pages/mockups/AppError/AppErrorStandalone.tsx     # /mockups/error-standalone (full-bleed)
```

(`AppError`, not `Error`, to avoid shadowing the global `Error`.)

### Composition

**404 in-app** (`NotFound.tsx`) — rendered inside the AppShell content:

```tsx
<Screen
  fill="block"
  footer={
    <Cluster justify="center">
      <Link as={RouterLink} to="/mockups/404-standalone" variant="muted">
        View as standalone page →
      </Link>
    </Cluster>
  }
>
  <ErrorState
    tone="neutral"
    icon={<Compass size={48} aria-hidden="true" />}
    title="Page not found"
    description="We couldn't find that page. It may have been moved or deleted."
    actions={
      <Cluster gap="sm" justify="center">
        <Button onClick={() => navigate('/mockups/dashboard')}>Back to dashboard</Button>
        <Button variant="secondary" onClick={() => navigate('/mockups/contacts')}>
          Search
        </Button>
      </Cluster>
    }
  />
</Screen>
```

**404 standalone** (`NotFoundStandalone.tsx`) — full-bleed, mirrors Login's chrome:

```tsx
<Screen
  backdrop="accent"
  header={
    <Cluster justify="start">
      <Link as={RouterLink} to="/mockups" variant="muted">
        ← Back to mockups
      </Link>
    </Cluster>
  }
  footer={
    <Cluster justify="center" gap="lg">
      <Link href="/legal/privacy" variant="muted">
        Privacy
      </Link>
      <Link href="/legal/terms" variant="muted">
        Terms
      </Link>
      <Link href="/status" variant="muted">
        Status
      </Link>
    </Cluster>
  }
>
  <Stack gap="lg" align="center">
    <Text as="span" size="xl" weight="bold">
      eocrm
    </Text>
    <ErrorState
      tone="neutral"
      icon={<Compass size={48} aria-hidden="true" />}
      title="Page not found"
      description="The page you're looking for doesn't exist or has been moved."
      actions={
        <Cluster gap="sm" justify="center">
          <Button onClick={() => navigate('/mockups')}>Go to homepage</Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Go back
          </Button>
        </Cluster>
      }
    />
  </Stack>
</Screen>
```

**Error in-app** (`AppError.tsx`) — `tone="danger"`, `extra` Error ID, in-app footer toggle:

```tsx
<Screen
  fill="block"
  footer={
    <Cluster justify="center">
      <Link as={RouterLink} to="/mockups/error-standalone" variant="muted">
        View as standalone page →
      </Link>
    </Cluster>
  }
>
  <ErrorState
    tone="danger"
    icon={<TriangleAlert size={48} aria-hidden="true" />}
    title="Something went wrong"
    description="An unexpected error occurred. We've logged it and our team is on it."
    actions={
      <Cluster gap="sm" justify="center">
        <Button onClick={() => navigate(0)}>Try again</Button>
        <Button variant="secondary" onClick={() => navigate('/mockups/dashboard')}>
          Back to dashboard
        </Button>
      </Cluster>
    }
    extra={
      <Text size="sm" tone="muted">
        Error ID: a1b2-c3d4
      </Text>
    }
  />
</Screen>
```

**Error standalone** (`AppErrorStandalone.tsx`) — full-bleed `backdrop="danger"`, wordmark + chrome,
actions `Reload` + `Go to homepage`, same `extra`.

### Wiring (playground Hard rule 4)

1. **`App.tsx`** — four routes: `/mockups/404`, `/mockups/404-standalone`, `/mockups/error`,
   `/mockups/error-standalone`.
2. **`AppShell.tsx`**
   - Full-bleed guard: replace `if (pathname === '/mockups/login')` with a set —
     `const FULL_BLEED_PATHS = new Set(['/mockups/login', '/mockups/404-standalone', '/mockups/error-standalone']); if (FULL_BLEED_PATHS.has(pathname)) return <>{children}</>;`
   - `mockupItems`: add `{ to:'/mockups/404', label:'Not found', icon: <lucide>, end:true }` and
     `{ to:'/mockups/error', label:'Error', icon: <lucide>, end:true }` (icons: e.g. `Compass` /
     `TriangleAlert`, picked in-plan from not-already-imported lucide names).
   - `componentGroups`: add `ErrorState` to the **Display** group and `Screen` to the **Layout** group.
3. **`registry.ts`** — two entries (in-app paths are the canonical entries):

   ```ts
   { slug:'404', title:'Not found', path:'/mockups/404',
     blurb:'404 page — the not-found result state, in-app and as a standalone page.',
     usesComponents:['Button','Cluster','ErrorState','Link','Screen','Stack','Text'] },
   { slug:'error', title:'Error', path:'/mockups/error',
     blurb:'Error-boundary fallback — "something went wrong", in-app and standalone.',
     usesComponents:['Button','Cluster','ErrorState','Link','Screen','Stack','Text'] },
   ```

   Extend the `ComponentName` union with `'ErrorState'` and `'Screen'`. The `-standalone` routes are NOT
   registry entries → excluded from the index grid automatically (and absent from nav).

4. **Login refactor** (`Login/Login.tsx`): rewrite onto `<Screen backdrop="accent" header={<back link>}
footer={<legal links>}>`, delete both `style={{…}}` blocks + their `TODO: replace when <AuthScreen>`
   comments, keep all form internals. Add `'Screen'` to Login's `registry.ts` `usesComponents`.

### Demo pages (library Hard rule 2)

- **`ErrorStateDemo.tsx`** — `DemoLayout` + `Example` blocks: neutral 404; danger 500 with `extra`;
  sizes sm/md/lg; `align="start"`; multiple actions via `Cluster`. Wire into `App.tsx`
  (`/components/error-state`), `AppShell` Display group, `ComponentsIndex` card.
- **`ScreenDemo.tsx`** — demoed with `fill="block"` inside bordered `Example` containers (a true
  `fill="viewport"` would blow out the demo page); show each `backdrop`; header/footer slots; and a
  callout linking to the live `/mockups/404-standalone`, `/mockups/error-standalone`, `/mockups/login`
  for the real full-viewport behavior. Wire into `App.tsx` (`/components/screen`), `AppShell` Layout
  group, `ComponentsIndex` card.

---

## Library bookkeeping (core invariant, ×2 components)

- `src/index.ts` — re-export `ErrorState` + its types and `Screen` + its types.
- `_meta/manifest.ts` **and** `scripts/generate-manifest.mjs` `CLUSTERS` — add `ErrorState:'Display'`
  and `Screen:'Layout'` to BOTH (kept in sync); then `npm run build:manifest` to regenerate
  `src/components.manifest.json`.
- `AGENTS.md` — one-section TL;DR + canonical snippet for each (`ErrorState` under Display, `Screen`
  under Layout).
- `TODO.md` — tick the `<AuthScreen>` entry as **superseded by `<Screen>`** (note the Login refactor).
- JSDoc: full component description + `@example`s + `@remarks` "When NOT to use" / "Anti-patterns" /
  "A11y" on both, per Hard rule 7.

### `ErrorState` "When NOT to use" (JSDoc `@remarks` + AGENTS.md)

- In-surface "nothing here" (empty table, empty search) → `<EmptyState>`. ErrorState is page-level.
- Inline, dismissible, in-flow error notification → `<Alert tone="error">`. ErrorState is a whole-screen
  state, not a banner.
- Recoloring beyond `neutral`/`danger` → not a tone, it's a new status; extend the union if a real
  status page needs `warning`.
- Anti-pattern: ❌ multiple primary buttons (one clear primary; secondaries are `variant="secondary"`/`ghost`).

### `Screen` "When NOT to use" (JSDoc `@remarks` + AGENTS.md)

- A normal in-shell page → `<Page>`. Screen is for full-bleed / chromeless screens (auth, 404, error,
  onboarding) that render _outside_ the app shell.
- Centering a small element inside an existing layout → `<Cluster justify="center">` /
  `<Stack align="center">`. Screen is a page root, not a generic centering box.
- Anti-pattern: ❌ nesting `<Screen>` inside `<Page>` or another `<Screen>` (compounds layout). The
  in-app variants use `fill="block"` + `backdrop="none"` precisely so they don't fight the shell.

---

## Out of scope (v1)

- `ErrorState` `warning` / `success` tones; a `403` / maintenance preset.
- `Screen` size/max-width caps on the centered content (the content sizes itself; `ErrorState` caps its
  own description width).
- A real React error boundary in the library or playground — the error mockups depict the _fallback UI_;
  wiring an actual `componentDidCatch` boundary is CRM-side work.
- Replacing the Login backdrop design — the refactor is mechanical (same `accent` radial, now via
  `<Screen backdrop="accent">`).

```

```
