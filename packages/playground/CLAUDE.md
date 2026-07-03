# CLAUDE.md — playground

Local dev gallery + demo pages. **This package is private (`"private": true`) and never publishes.**

The playground exists to be the most realistic possible preview of `@eocrm/design-system` as the CRM will see it — it imports the library through the workspace symlink exactly the way the CRM will import it from GitHub Packages.

## Mockups vs. components

The playground has two top-level sections, each with its own sidebar group and overview page.

**Mockups** live under `src/pages/mockups/`. They are believable CRM screens built entirely from `@eocrm/design-system` primitives. Each mockup declares which library components it uses via `src/pages/mockups/registry.ts` — that file is the single source of truth for the cross-link.

**Components** live under `src/pages/components/`. One demo page per shipped component, using `DemoLayout` + `Example`.

The cross-link is registry-driven and bidirectional: every mockup page lists "Components used" and every component demo lists "Seen in". To make a new mockup's components show up under each component's "Seen in" list, add the mockup to the registry.

Routes: `/mockups/*` for mockups, `/components/*` for component demos. Root `/` redirects to `/mockups`.

The sidebar rail is section-contextual: when you're under `/mockups/*` it shows only the Mockups items; under `/components/*` it shows only the Components items, grouped by category (Layout, Forms, Display, Navigation). A single switch link pinned to the bottom of the rail jumps between sections.

## Hard rules

### 1. Every library component has a demo page here

If `@eocrm/design-system` exports a component and the playground doesn't have a corresponding `src/pages/components/<Name>Demo.tsx`, that's a bug. Fix it. The demo grid + sidebar must list every shipped component.

### 2. Imports use `@eocrm/design-system` — never relative paths into the library

Yes:

```ts
import { Button } from '@eocrm/design-system';
import '@eocrm/design-system/styles/global.scss';
```

No:

```ts
import { Button } from '../../../design-system/src/components/Button'; // ❌
```

The whole point of the workspace split is that the playground exercises the library's public API the same way the CRM does. Relative imports defeat that.

**Exception:** demo pages display library source code via `@lib-source/*` `?raw` imports (Vite alias defined in `vite.config.ts`). This bypass is internal to the playground and keeps the library's public `exports` field clean of internal paths.

### 3. Demo pages follow the `DemoLayout` + `Example` pattern

Every component demo:

```tsx
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function <Name>Demo() {
  return (
    <DemoLayout
      name="<Name>"
      componentName="<Name>"
      description="One sentence on what it is and when to use it."
      files={getComponentFiles('<Name>')}
    >
      <Example title="..." description="..." code={`...`}>
        {/* live preview */}
      </Example>
      {/* more <Example> blocks for each variant / size / state */}
    </DemoLayout>
  );
}
```

The `files` prop is a build-time scan of the component's directory (`packages/playground/src/lib/componentFiles.ts`). Every `.tsx`, `.scss`, `.ts`, and `.css` file in `packages/design-system/src/components/<Name>/` becomes a tab in the source-view, excluding `.test.tsx`/`.test.ts`. Tab order: primary `<Name>.tsx` → other `.tsx` → `<Name>.module.scss` → `<Name>.tokens.scss` → other `.scss` → `index.ts` last.

If your demo covers a component whose sources live outside `components/` (rare — `PaletteDemo` is the only example today), construct `files` as an inline `[{ filename, code, language }]` literal from explicit `?raw` imports.

### 4. Wire new demos into four places

For a new demo page to be reachable:

1. `src/App.tsx` — add a `<Route path="/components/<name>" element={<<Name>Demo />} />`
2. `src/layout/AppShell/AppShell.tsx` — add the item to the appropriate group in `componentGroups` (`Layout`, `Forms`, `Display`, `Navigation`). If none of the existing groups fit, add a new group rather than stuffing the item somewhere it doesn't belong.
3. `src/pages/components/ComponentsIndex.tsx` — add a card to the overview grid, plus a schematic preview in `overviewSchematics.tsx` (blueprint-accent vocabulary — tinted shapes, exactly one solid-accent focal element; see the SCHEMATICS record). Overview previews are schematics, not live renders.
4. `src/pages/mockups/registry.ts` — if the new component is used by any mockup, add its name to that mockup's `usesComponents` list (and extend the `ComponentName` union if it's a brand-new component name)

Skipping 1–3 → users can navigate to the URL but the page is unreachable through nav. Skipping 4 → the cross-link between mockups and component demos is broken.

### 5. Demo-only deps stay here

`react-router-dom`, `prismjs`, `prism-react-renderer`, `@types/prismjs`, `@types/node` — these are in the playground's `package.json`. They MUST NOT appear in `@eocrm/design-system`'s `dependencies`. If you find yourself wanting to use one of these in a library component, you're solving the problem in the wrong layer.

### 6. Mockups build EXCLUSIVELY from `@eocrm/design-system` components

This rule applies **only to files under `src/pages/mockups/`** — NOT to demo pages, AppShell, or other playground tooling. Mockups exist to dogfood the library, so they must use the same surface a CRM consumer does.

**Forbidden in mockup `.tsx`:**

- ❌ Inline `style={{...}}` attributes. The library's components own their styling; if you need a visual variant the component doesn't expose, that's a library gap (see below), not an excuse to inline CSS.
- ❌ Raw HTML elements: `<div>`, `<span>`, `<button>`, `<a>`, `<input>`, `<p>`, `<h1>`–`<h6>`, `<img>`, `<ul>`, `<li>`, `<table>`, `<form>`, etc. Use the library's equivalent — `<Stack>` / `<Cluster>` / `<Button>` / `<Link>` / `<Input>` / `<Text>` / `<Title>` / `<Avatar>` / `<Table>` and so on.
- ❌ CSS Modules `*.module.scss` files co-located with a mockup `.tsx`. The library is your only styling layer; mockups don't ship custom CSS.

**Allowed in mockup `.tsx`:**

- ✅ Library components from `@eocrm/design-system`.
- ✅ React Fragments (`<>...</>`).
- ✅ Native HTML that the library re-exports under a typed component (e.g., the `<Table>` primitive renders a `<table>` element internally; you write `<Table>` in the mockup).

**When the library doesn't cover what the mockup needs:**

1. Open `packages/design-system/src/components/TODO.md` and add a new entry describing the missing functionality (primitive name, what it should do, where in which mockup you needed it, how you're currently mocking it).
2. Inline-mock the gap in the mockup with a one-line comment pointing to the TODO entry: `{/* TODO: replace when <PrimitiveName> ships — see components/TODO.md */}`.
3. The inline mock MAY use raw HTML / inline styles **only at the exact mock site**, contained to the smallest possible block. Mark it visually with the TODO comment so the next reviewer notices.
4. When the library primitive ships, the TODO entry's "Mocked in" path tells the implementer exactly which files to refactor. Tick the TODO and delete the inline mock.

**Why this rule:** mockups are the canary for missing primitives. Every hand-rolled `<div className="...">` inside a mockup is a signal that either (a) we're missing a primitive the CRM will also need, or (b) the existing primitive needs a new prop. Filing the TODO captures that signal so it doesn't get lost. Letting mockups drift into bespoke HTML defeats the dogfooding purpose — the CRM consumer can't reach for "inline a div with styling" the way a mockup author can, so a mockup that does so isn't realistic.

### 7. Pre-push review-fix cycle (mockup changes only)

Mirrors the library's Hard rule 8 (`packages/design-system/CLAUDE.md`). Mockups are the most visible artifact of the library — they're what a new engineer or stakeholder loads first, and what AI agents pattern-match against when building real CRM screens. A drift here propagates straight into consumer code. The review cycle catches it before push.

**When this rule applies**: any change that touches files under `packages/playground/src/pages/mockups/**`, the mockup registry (`packages/playground/src/pages/mockups/registry.ts`), or mock-data shared by mockups (`packages/playground/src/data/**`).

**When this rule does NOT apply**: changes scoped to demo pages, AppShell, root `App.tsx`, layout files, or other playground tooling. Push those normally. Pure docs changes (this file, root README, etc.) also push directly per the root-CLAUDE.md's "standalone docs may be direct-pushed" carve-out.

**The loop**:

1. **Run gates first** — `make test`, `make build` (typecheck + bundle), `make lint`. They must all pass before review.
2. **Spawn a fresh-context review agent** (`general-purpose`) targeted at the changed mockup file(s). Brief it on these 10 review categories:
   1. **Hard rule 6 compliance** — no inline `style={...}`, no raw HTML tags, no co-located `.module.scss`. Any escape-hatch mock has a matching entry in `packages/design-system/src/components/TODO.md` AND an inline `{/* TODO: replace when … */}` comment.
   2. **Registry sync** — every library component used in the mockup is listed in that mockup's `usesComponents` array in `registry.ts`. No stale entries (a name listed that's no longer imported).
   3. **Imports** — only from `@eocrm/design-system`, never relative paths into the library (Rule 2). Demo-only deps from Rule 5 stay out.
   4. **Realism** — does the mockup look like a real CRM screen, or a contrived demo? Mock data plausible (names, dates, currency formatting). No "lorem ipsum" or `"Click me"` placeholder text.
   5. **Accessibility** — landmarks (`<main>` / nav present via library components), heading hierarchy (one h1 per page), images have alt text via `<Avatar name>` or equivalent, interactive elements have accessible labels.
   6. **Keyboard / focus** — tab order matches visual order, no focus traps, Escape closes modals/popovers.
   7. **Layout discipline** — spacing comes from `<Stack gap>` / `<Cluster gap>` props, not from inline margins or custom CSS. Vertical rhythm consistent across the page.
   8. **Component coverage** — if a primitive exists for what the mockup does, the mockup uses it (no `<Button>` ignored in favor of a hand-rolled trigger). Cross-reference against the manifest at `packages/design-system/src/components.manifest.json`.
   9. **State realism** — interactive state (open/closed, selected, loading, empty) reflects how the CRM would use it. If the mockup has only a single state, flag whether the empty / loading / error variants are worth adding.
   10. **No stale TODOs** — any `{/* TODO: replace when … */}` comment has a matching open entry in `TODO.md`; any TODO entry whose listed primitive HAS shipped should be ticked + the inline mock refactored away.

   Ask for output as `Critical` / `Important` / `Nice-to-have` / `Regression-watch` + a final verdict line (`clean enough to stop` or `keep iterating`).

3. **Fix every Critical and every Important finding**. Nice-to-have is judgment — fix when cheap, skip when churn outweighs.
4. **For every finding deliberately skipped**, leave a one-line explanation so the next reviewer doesn't re-flag it.
5. **Re-run gates** after fixes.
6. **Spawn another reviewer** with the same prompt.
7. **Repeat** until the verdict is `clean enough to stop`.

**Hard exit criteria**:

- 0 Critical, 0 Important findings (or each remaining one has an explicit documented skip).
- All three gates (test, build, lint) green.
- All open TODOs in `packages/design-system/src/components/TODO.md` that the changed mockup touches are either still open with a matching inline comment, OR ticked + the refactor done in this PR.

**Trivial-change escape hatch**: a one-character text fix or a typo in mock data doesn't need a full review loop. Use judgment — if the change couldn't plausibly affect Rule 6 compliance, layout, or component coverage, push without the cycle.

## What goes here vs in the library

|                                                           | Playground | Library |
| --------------------------------------------------------- | ---------- | ------- |
| `pages/`, `layout/AppShell`                               | ✅         | ❌      |
| Mock data (`data/mock.ts`)                                | ✅         | ❌      |
| Demo helpers (`CodeBlock`, `Example`, `DemoLayout`)       | ✅         | ❌      |
| Prism setup                                               | ✅         | ❌      |
| Reusable visual primitives (`Button`, `Card`, `Stack`...) | ❌         | ✅      |
| Tokens, reset, typography, mixins                         | ❌         | ✅      |

Heuristic: "would the CRM benefit from this?" If yes → library. If no → playground.

## Routing on GitHub Pages

`BrowserRouter` is mounted with `basename={import.meta.env.BASE_URL}`. For local dev that's `/`. For the Pages build (`VITE_BASE_PATH=/<repo>/`), it's `/<repo>/`. The `public/404.html` + the snippet in `index.html` cover SPA deep-link refreshes via the spa-github-pages technique.

Don't switch to `HashRouter`. The cleaner-URL solution is already in place.
