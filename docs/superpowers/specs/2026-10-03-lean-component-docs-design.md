# Lean component docs — design

## Goal

Cut the tokens an agent spends learning a DS component. Today a component is documented twice: component-level JSDoc `@remarks`/`@example` in `<Name>.tsx` (~335 KB across the library) and `docs/components/<Name>.md` (~302 KB). The primer says "the JSDoc is the contract" and "hover in your editor", which an agent cannot do, so it opens the `.tsx` (Button: 13 KB, 224 of 299 lines comment) and often the `.md` too.

Success: an agent learns any component from `AI-PRIMER.md` + one `docs/components/<Name>.md` and never opens component source; the published package carries no maintainer-only files; repo greps are not flooded by executed plans.

## 1. The component `.md` is the contract

- **Generator** `packages/design-system/scripts/generate-component-docs.mjs`, `npm run build:docs` in that package. Uses the `typescript` compiler API (already a dev dependency) — no new dependency.
- For each component with a `docs/components/<Name>.md`, it resolves the exported props types (`<Name>Props`, plus exported sub-component props for compound components) and rewrites the block between `<!-- props:start -->` and `<!-- props:end -->` with one table per props type:
  - columns `Prop | Type | Required | Default | Description`
  - only the type's own declared members; inherited native/HTML attributes collapse into one trailing row naming the element (e.g. "plus native `<button>` attributes"); other inherited DS props name the source type
  - `Default` from the member's `@default` tag, else `—`
  - `Description` = the member's JSDoc text, collapsed to one line, `|` escaped
  - output deterministic (declaration order), formatted to pass prettier
- A `.md` without markers gets the block inserted after its first code block. A component whose props cannot be resolved fails the script by name (no silent skip).
- **Drift test** in `npm test` (pattern of the manifest drift test): regenerating every `.md` in memory must equal the committed files; the failure names the file and says `npm run build:docs`.
- **JSDoc trim**: each component's component-level JSDoc block becomes a one-line summary plus `@see docs/components/<Name>.md` (path relative to the package root). Before deleting a block, any content present only in the JSDoc (anti-patterns, examples, a11y notes) moves into the `.md`; nothing is dropped. Per-prop and per-type JSDoc stays (it feeds the table and editor hover). JSDoc on non-component exports (hooks, utilities, types) is untouched.
- **Rules follow the contract**: root `CLAUDE.md` core invariant 5, `packages/design-system/CLAUDE.md` (rule 7, the component checklist), `implement-issue` and `pre-push-review` skills: "when NOT to use / anti-patterns go in `docs/components/<Name>.md`; run `npm run build:docs`". The pre-push-review Light-tier exclusion for `@remarks`/prop-doc semantics extends to `docs/components/**` semantics.
- **Primer**: "the JSDoc is the contract / hover" becomes "`docs/components/<Name>.md` is the contract; its props table is generated from the types".

## 2. A leaner primer

Move out of `AI-PRIMER.md`, each leaving a one-line link:

| section                                  | to                        |
| ---------------------------------------- | ------------------------- |
| Setup (once per consuming app)           | `docs/setup.md`           |
| Dark theme; Theming via component tokens | `docs/theming.md`         |
| Transient state and screen readers       | `docs/transient-state.md` |

Kept: hard rules, i18n rules, empty-label rule, component index, anti-patterns, TypeScript, full reference. `contrast.test.ts` already scans `AI-PRIMER.md` + `docs/**`, so moved figures stay gated; its tests that pin a figure to `AI-PRIMER.md` specifically follow the text to its new file. `structure.test.ts` primer references follow likewise.

## 3. Stop shipping noise

- `src/components/TODO.md` (mockup-gap ledger) moves to `packages/playground/TODO.md`; references in `packages/playground/CLAUDE.md`, the `pre-push-review` skill, mockup inline comments and `.github/workflows/release.yml`'s comment follow.
- `(#NNN)` issue references are removed from `AI-PRIMER.md` and `docs/**`. The drift test also fails on `\(#\d+\)` in those files.

## 4. Repo clean-up

- Delete `docs/superpowers/plans/` (155 files, 6.6 MB, executed; nothing references them; history keeps them). `specs/` and `reviews/` stay — code links to specs.
- Untracked root screenshots are deleted locally, outside the PR.

## Out of scope

- Shipping compiled `.d.ts`; changing the package's source-distributed build.
- Rewriting `.md` prose beyond moving JSDoc-only content in and removing issue refs.

## Verification

- `npm test` (whole workspace, exit code read), `npm run typecheck`, `npm run format:check`, `npm run lint:css`.
- Mutations: edit one prop's JSDoc without regenerating → drift test fails naming that file; add `(#123)` to a doc → fails; delete a props type the generator needs → script fails naming the component.
- Size check recorded in the PR: total bytes of component `.tsx`, `AI-PRIMER.md` and the packed tarball (`npm pack --dry-run`) before vs after.
- Shipped through the repo's PR + `pre-push-review` gate (Standard tier), then a DS release. The eocrm bump is a separate `update-design-system` PR.
