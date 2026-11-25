# `DiffView` — unified text diff (DS-94)

## Intent

eocrm's wiki "compare versions" (EO-273, EO-260 slice C) receives a unified diff of two page versions' plain
text from its API (`sebastian/diff`, `UnifiedDiffOutputBuilder`) and needs to show it. eocrm runs an interim
shim with the same props (`apps/web/src/shared/ds-shims/DiffView.tsx`).

## Approaches

- **Pure parser + renderer — chosen.** `parseUnifiedDiff(diff)` (Node-tested) turns the string into hunks; the
  component renders them, reusing CodeBlock's monospace surface tokens and `maxHeight` scale.
- Compute diffs in the library from two texts — needs a diff-algorithm dependency (dependency policy says no)
  and the API already returns the diff.
- Extend `CodeBlock` with a diff mode — mixes two jobs (syntax samples vs change review) into one API.

## API

```ts
interface DiffViewProps extends HTMLAttributes<HTMLDivElement> {
  diff: string; // unified format
  fromLabel?: string; // header bar "fromLabel → toLabel" (either alone is shown alone)
  toLabel?: string;
  lineNumbers?: boolean; // default true: old/new gutters computed from @@ ranges
  wrap?: boolean; // default true (prose); false = no wrap, horizontal scroll
  maxHeight?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; // CodeBlock's scale; scrolls past it
}
```

`forwardRef` to the root `div`; HTML attributes spread on it.

## Parsing

- `---` / `+++` file headers skipped; `diff --git`, `index …` and other preamble lines ignored.
- `@@ -a[,b] +c[,d] @@[ section]` starts a hunk; missing counts default to 1.
- Line prefixes: `+` added, `-` removed, ` ` context; `\ No newline at end of file` → a `note` line attached
  to the hunk; anything else ignored. CRLF tolerated. A trailing empty line from the final newline is not a line.
- A bare `@@ @@[ section]` header (sebastian/diff `UnifiedDiffOutputBuilder` without line numbers, as eocrm
  uses) starts an _unnumbered_ hunk: range fields and line numbers are `null`; it is not count-driven and takes
  `+`/`-`/` `/`\` lines and bare empty lines (context) until the next `@@`, or a `--- ` line directly followed by
  `+++ ` (next file header, skipped). The component then shows no gutters and labels the hunk "Change N".
- Exactly one trailing `\n` is stripped before splitting, so an overcounting header can't yield a phantom line.
- Old/new line numbers advance per hunk from `a` / `c` (context advances both, removed advances old, added new).
- No hunks → empty state.

## Rendering & a11y

- Root frame like CodeBlock (bg, border, radius, mono font, code font size). Optional header bar with labels.
- A `<table>`; visually hidden `<thead>` (Old line / New line / Change / Text). Each hunk is a `<tbody>` whose
  first row is one full-width `<th scope="rowgroup" colSpan>` reading e.g. "Lines 12–15 → 12–17" (i18n).
- Change cell: visible `+` / `−` sign, plus `VisuallyHidden` "Added" / "Removed" (i18n); context silent.
  Rows tinted with success / danger subtle backgrounds (component tokens defaulting to
  `--color-success-bg-subtle` / `--color-danger-bg-subtle`), the sign coloured `-fg`. Not colour alone: the
  sign and hidden text carry it.
- `lineNumbers={false}` drops both gutter columns (and their headers).
- `wrap` → `white-space: pre-wrap; overflow-wrap: anywhere`; otherwise `pre` with the frame scrolling on x.
- Empty state: muted "No changes" text (i18n) inside the frame.
- All strings in `src/i18n` en + ru.

## Non-goals

Intra-line (word) highlighting; side-by-side view; syntax highlighting; the `too_large` notice (consumer
renders its own); collapsing context (unified diffs already limit it); copy button.

## Done means

Full new-component checklist (root CLAUDE.md Core invariant): tests, playground demo wired into the four
places, `src/index.ts` export, `docs/components/DiffView.md` + AI-PRIMER line, CLUSTERS entry in both maps
(`Display`) + `npm run build:manifest`.
