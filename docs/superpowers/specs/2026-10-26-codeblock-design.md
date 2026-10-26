# CodeBlock — design

**Date:** 2026-10-26
**Status:** draft for approval
**Origin:** `packages/playground/TODO.md` → "`<CodeBlock>` — multi-line code with copy button", filed by the developer-docs mockup (PR #703).

## Intent

`@eocrm/design-system` has no block-level code display — `Code` is an inline chip only. Two consumers need one:

1. **The public developer docs site** (docs.eocrm.io, mocked at `/mockups/docs`): request samples in several languages, JSON responses, MCP config snippets. Unhighlighted, unstyled `<pre>` blocks are a large part of why the current site reads as amateur.
2. **CRM product screens** (dpws chose "docs + CRM"): API-keys page ("here's your curl"), webhook payload previews, integration setup instructions, audit-log JSON details.

`CodeBlock` is a **read-only** display of multi-line code with syntax highlighting, a header, and copy.

## Goals

- Syntax-highlighted, multi-line, read-only code, coloured by **our** tokens in light and dark.
- A header bar on every block: a label (filename, e.g. `request.sh`; falls back to the language name) on the left; wrap toggle + copy button on the right.
- **Built-in language switcher**: a block can hold several samples (cURL / JavaScript / Python). The header then shows them as tabs instead of the single label; copy always copies the visible sample.
- **Opt-in sync**: blocks sharing a `syncKey` switch sample together (pick Python once → every block with that key shows Python). The library keeps this in memory only; the **app** decides whether to persist (e.g. to `localStorage`) via a controlled/callback API.
- **Copy**: copies the raw source string (never rendered markup); transient "Copied" confirmation reaches screen readers.
- **Wrap toggle**: a user-facing header button that switches between horizontal scroll (default) and soft wrap. A prop sets the initial state.
- **`maxHeight` prop**: when set, the body scrolls internally past that height (long JSON payloads).
- **Highlighted lines prop**: tint specific lines (e.g. lines 3 and 5–7) to draw attention.
- **Languages shipped**: `json`, `bash` (also used for cURL / shell), `javascript`, `typescript`, `python`. Any other or missing language renders as plain text — no error, no throw.

## Non-goals

- Editing (that's `LiquidEditor` / a future editor). No caret, no input.
- Line numbers (decided: skip).
- Language auto-detection.
- Migrating the playground's own source-view `CodeBlock` (`packages/playground/src/pages/components/CodeBlock.tsx`, needs `tsx`/`scss`) — it stays as is in this change.
- A dark-always / "tone" variant. **dpws chose: the block follows the page theme** (light on light, dark on dark). No `tone="dark"` prop.

## Anti-goals (would make it a failure even if it works)

- The library writing to `localStorage` (or any storage) on its own.
- Copy putting anything other than the exact source string on the clipboard (no line-number artefacts, no trailing whitespace changes, no highlight markup).
- Syntax colours that fail contrast against the block background in either theme.
- Colours hard-coded inside the component instead of tokens (violates Rule 3).

## Constraints

- **Dependency — dpws decided:** highlighting via `prism-react-renderer` (latest, currently `2.4.1`) used as a tokenizer only. Markup, colours, ARIA and copy are ours; do **not** use its bundled themes. It is ~34 KB gzipped unminified (more than first estimated). Its bundled grammars include json/javascript/typescript/python but **not bash** — bash must be added by registering a grammar on the bundled `Prism` instance (a small regex grammar; do not pull in `prismjs` and its global-Prism side-effect hack).
- **This requires rule changes, made in the same PR:**
  - `packages/design-system/CLAUDE.md` → "Dependency policy": add `prism-react-renderer` as an algorithm-dependency exception (tokenizer only, like `d3-scale`/`qrcode-generator`) and remove it from "What does NOT belong here".
  - `packages/playground/CLAUDE.md` → Hard rule 5: drop `prism-react-renderer` from the "must not appear in the library" list (`prismjs` stays playground-only).
  - `@types/prismjs` comes in as a dependency of `prism-react-renderer`; confirm consumer `tsc` resolves types (library "Shipping TS source" rule).
- Library hard rules apply in full: forwardRef + spread attrs, JSDoc on every prop, tests, i18n for every visible/ARIA string (en + ru), tokens only, no layout props, transient-state a11y (Hard rule 10 — read `.claude/skills/transient-state-a11y/SKILL.md` for the copy confirmation).
- New colour tokens go through `packages/design-tokens/src/tokens.json` (light + dark), then `npm run tokens:check`. Contrast must pass the existing contrast test approach.
- Root `CLAUDE.md` "component is not complete until" checklist: tests, playground demo + 4 wiring points + `ComponentName` union, `src/index.ts` export, `docs/components/CodeBlock.md` + `AI-PRIMER.md` line, `CLUSTERS` entry in both manifest maps + `npm run build:manifest`.

## Decided by dpws

| Topic                        | Decision                                   |
| ---------------------------- | ------------------------------------------ |
| Where it's used              | Docs site + CRM product screens            |
| Highlighting                 | Yes, via `prism-react-renderer`            |
| Header bar (label + actions) | Yes                                        |
| Built-in language switcher   | Yes                                        |
| Max height                   | Yes, via prop                              |
| Highlighted lines            | Yes, via prop                              |
| Wrap                         | Yes — user-facing toggle                   |
| Line numbers                 | No                                         |
| Cross-block language sync    | Opt-in via `syncKey`; app owns persistence |
| Surface                      | Follows the theme (no always-dark)         |

## Calls made during the builder check (Claude's, not dpws's — check these)

- **Static import of Prism, exported from `src/index.ts` like everything else.** No lazy `import()`, no subpath export. Why: `prism-react-renderer` declares `"sideEffects": true`, so a consumer that imports anything from the barrel ships Prism. That's the same trade-off the library already makes for `d3-scale` (Chart) and `qrcode-generator` (QrCode). Both known consumers (the CRM and the docs site) render `CodeBlock` anyway. A lazy load would cause an unhighlighted flash and, on the server-rendered docs site, unhighlighted HTML on first paint and for crawlers.
- **SSR-safe.** docs.eocrm.io is a Next.js app that server-renders DS components (seen in its HTML). Highlighting must render identically on the server and the client. The `syncKey` store may live at module level but is written only by client interaction; its server snapshot is the block's default sample, so hydration never mismatches and nothing leaks between requests. Copy, wrap and the clipboard touch `window`/`navigator` only in event handlers.
- **Contrast: every syntax colour (comments and punctuation included) reaches 4.5:1** against both the block background and the highlighted-line tint, in light and dark, for both accent sets if the tint follows the accent. Extend the existing `contrast.test.ts` approach to cover these pairs. If that forces the tint to be accent-neutral, make it neutral.

## Left to the builder

- Exact prop names and shapes (e.g. `code` + `language` for a single sample vs `samples={[{ id, label, language, code }]}`; how `syncKey`, the selected sample, `defaultSample` and a change callback combine so an app can persist a choice). Keep it consistent with existing library naming (`Tabs`: `activeId`/`onChange`; `Constrain` size steps).
- `maxHeight` scale — reuse an existing named scale (e.g. `Constrain`'s height steps) rather than inventing one.
- Highlighted-lines input format (array of numbers/ranges vs string), and whether highlighted lines carry any non-visual cue.
- Whether the header's switcher reuses `<Tabs>` or implements the ARIA tabs pattern internally — either way the code body is the tabpanel.
- Keyboard access to a scrollable body (`tabIndex={0}` + accessible name when it overflows).
- Syntax token set: map Prism token types to a small set of semantic tokens (keyword, string, number, comment, function, property, punctuation, …) — names and values, light + dark, contrast-checked. Whether the highlighted-line tint follows the active accent (blue / tealpine).
- Copy fallback when the Clipboard API is unavailable.
- Whether the new tokens get Compose outputs or stay web-only.

## Follow-on (same PR)

- Playground: `CodeBlockDemo` + wiring; refactor `/mockups/docs` to use `CodeBlock` (replace `CodeSample` and `LanguageTabs`, using `syncKey` across the page) and tick the `CodeBlock` TODO entry.
