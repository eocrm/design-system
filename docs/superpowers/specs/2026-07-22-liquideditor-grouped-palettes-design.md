# LiquidEditor: grouped/dotted variable palettes — design

**Issue:** eocrm/design-system#304
**Date:** 2026-07-22
**Status:** approved

## Problem

`LiquidVariable.code` is treated as a flat root token. Consumers with grouped,
dotted palettes (`event.type`, `record.title`, …) hit:

1. **False unknown-flagging** — the tokenizer checks a reference's root
   identifier (`event`) against the set of full codes (`"event.type"`), so every
   grouped reference gets a red underline + footer warning.
2. **No self-documentation** — only `label` + `type` show in menus; nothing can
   explain a non-obvious variable.
3. **No collection affordance** — array variables insert `{{ code }}`, which
   renders unhelpfully; they should insert a `{% for %}` snippet.
4. **Dotted autocomplete is broken** (same class, found during design) — the
   query word-walk stops at `.`, so `{{ event.ty` queries `ty`, matches nothing,
   and accepting a suggestion after a dot would double-insert the root.

## Design

### 1. Unknown-flagging: root-set membership

`tokenize` / `unknownVariables` keep their `knownCodes` parameter (full codes).
Internally they derive `roots = new Set(codes.map(c => c.split('.')[0]))` and
the root-identifier check tests membership in `roots`.

- `{{ event.type }}` known when any `event.*` code exists.
- Flat codes unchanged (`first_name` is its own root).
- Dotted segments after the root stay unchecked (as today): `{{ event.bogus }}`
  is NOT flagged.
- `{{ bogus }}` still flags.

No public API change.

### 2. `description?: string` on `LiquidVariable`

- **Insert menu**: two-line item — label line, then a muted description line.
  Content styled by LiquidEditor's own SCSS (`DropdownMenu.Item` accepts
  arbitrary children).
- **Autocomplete**: `AutocompleteItem` gains `description`; rendered as a muted
  second line under the label.
- **Footer**: when the caret sits inside `{{ }}` / `{% %}` on a word whose
  dotted path exactly matches a known code (full-path match only, not
  root-only), the footer shows `label — description`. Priority: `error` prop >
  unknown-variable warning > caret description. Computed in the existing
  `refresh(value, caret)` path; no new event wiring.

### 3. `collection?: boolean` on `LiquidVariable`

- **Insert menu** inserts `{% for item in <code> %}{{ item }}{% endfor %}` for
  collections, caret placed right after `{{ item }}`. Non-collections insert
  `{{ code }}` as today.
- **Tag**: collections show a muted "list" tag (new i18n key
  `liquidEditor.collectionTag`, en + ru) in both the insert menu and
  autocomplete, alongside `type` when both are set.
- **Autocomplete accept** stays code-only — the caret is already inside a tag;
  dropping a `{% for %}` there would corrupt the template. The "list" tag
  signals the affordance.
- `type` stays purely presentational (free-text tag); no magic `type: 'array'`
  behavior.

### 4. Dotted autocomplete

`getAutocompleteContext`'s query word-walk extends over `.` (an identifier
character for the walk-back only): `{{ event.ty` → query `event.ty`, `wordStart`
before `event`, so accepting `event.type` replaces the whole dotted prefix.
Matching is unchanged (`startsWith` on value/label). Filter context (after `|`)
unaffected — filter names contain no dots. A query that is only dots or has
empty segments falls back gracefully (no match → menu closed).

## Testing

- Tokenizer: dotted-code root rule (known root passes, unknown root flags,
  post-root segments unchecked, flat codes regression).
- `getAutocompleteContext`: dotted queries, wordStart spans the dotted prefix,
  dot-adjacent edge cases (`{{ event.`, leading dot).
- Component: loop insert + caret position for `collection`, `{{ code }}` for
  non-collections, description lines in both menus, "list" tag, footer priority
  (error > unknown > description), caret-on-variable description shows/hides.
- i18n: new key present in `messages.ts`, `en.ts`, `ru.ts`.

## Docs

- JSDoc on `description` / `collection` props with grouped-palette `@example`.
- `AGENTS.md` LiquidEditor TL;DR gains the grouped/dotted palette snippet.
