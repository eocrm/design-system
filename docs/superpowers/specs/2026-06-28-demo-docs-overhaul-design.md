# Demo-docs overhaul — self-contained code blocks + auto API tables (2026-06-28)

Two improvements to every component demo page in the playground, requested while
the user was AFK ("do all components one by one"). The whole effort is
**playground-only** — no library files change, so it triggers no `@eocrm/design-system`
release and is not subject to the library's Rule 8 review loop.

## Workstream 1 — API reference table (DONE, Phase A)

Each demo gets an **API** section at the bottom listing the component's props.

- **Source of truth:** the component's own `<Name>Props` TypeScript + JSDoc
  (Rule 7 guarantees it's complete). Never hand-written, so it can't drift.
- **Extractor:** `packages/playground/scripts/extract-props.mjs` uses the TS
  compiler API to resolve each `<Name>Props` exported from
  `design-system/src/components/<Name>/index.ts`, enumerate its apparent
  properties, and keep only those _declared in the library source_ (drops the
  hundreds of inherited `HTMLAttributes` members). For each prop it records
  `{ name, type, required, default, description }`. `default` comes from a
  `@default` JSDoc tag if present, else from the prose convention
  `` `primary` (default) ``. `| undefined` is stripped from optional types.
- **Manifest:** `packages/playground/src/lib/props.manifest.json`. Regenerated on
  every dev/build by a Vite `buildStart` plugin (`vite.config.ts`) so the committed
  copy can never go stale; `npm run build:props` regenerates it manually.
- **Render:** `packages/playground/src/pages/components/ComponentApi.tsx` —
  `<ComponentApi name>` renders a `<Table>` (Prop / Type / Default / Description)
  with a small markdown-lite renderer for the JSDoc (paragraphs, `-` bullets,
  inline `` `code` `` and `**bold**`). Required props get a red `required` Badge.
  Wired once into `DemoBody`, keyed off the existing `componentName`, so all
  demos that pass `componentName` get the table for free. Components with no
  public props (e.g. Toast — imperative API) render nothing.

86 of 90 components produce a table (584 props total). The four demos without a
`componentName` (AppLayout, DatePickers, Field, FormRow, FormSection) are wired
up in Workstream 2.

## Workstream 2 — self-contained code blocks (Phase B, fan-out)

Today each `<Example code={`…`}>` shows only the bare JSX fragment — no imports,
no data objects. The goal: **copy the block, paste it, reproduce the demo.**

### Convention (reference implementation: `ButtonDemo.tsx`)

Every `code` string becomes a complete, runnable snippet:

1. **Imports first**, in this order, only what the snippet uses:
   `react` (hooks/types) → third-party (`lucide-react` icons, etc.) →
   `@eocrm/design-system`. One blank line after the imports.
2. **Data objects next** — any `const rows = […]` / `const options = […]` the
   example references, with realistic data, inlined here (not hidden in a
   module-level const the reader can't see).
3. **The example as a component** — `export function Demo() { return (…); }`, or
   keep the example's existing named function (e.g. `SaveWithSuccessFlash`) and
   just prepend imports. The JSX **must match the live preview exactly** (same
   props, same children, same wrapper) so the code never lies about what's shown.

Rules:

- The code is a template literal; never introduce an unescaped `${` (escape as
  `\${` if the snippet genuinely needs it).
- Don't import demo-harness modules (`DemoLayout`, `Example`, `getComponentFiles`)
  — those are not part of what the consumer copies.
- If the live preview uses playground-only mock data, inline a small realistic
  literal in the snippet instead of importing `../../data/mock`.
- Keep indentation valid TSX so the snippet reads as real code.

### Execution

Fan out one subagent per demo (batched, ~12 per PR). Each subagent rewrites only
the `code` props of its file to the convention above, matching each Example's
live preview, then the batch is gated (`make build`, `make lint`,
`npm run format:check`) and shipped as a playground-only PR. ButtonDemo is the
worked reference.

## Decisions made autonomously (open to revisit)

- **Auto-extracted API table over hand-written prose.** Scales to 90 components
  with zero drift; the trade-off is the table reflects exactly the JSDoc — if a
  prop's JSDoc is thin, its row is thin. Fix by improving the component JSDoc
  (a library change), which the table then picks up for free.
- **`default` via the `(default)` prose heuristic** since the codebase doesn't
  use `@default` tags. Adding `@default` tags later would make the column
  authoritative, but that's a library-wide edit deferred for now.
- **Code blocks wrapped in `export function Demo()`** rather than left as bare
  JSX, to satisfy "reproduce demo component." Verbose but unambiguous; the
  disclosure is collapsed by default so it doesn't add visual noise.
