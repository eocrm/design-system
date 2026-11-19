# Rail.Group sub-sections — design

## Intent

A `Rail.Group` (e.g. "Задачи") needs to split its subitems into labelled chunks
— "Saved views" and "Spaces" — instead of one flat list.

## Goals / non-goals

- Goal: titled sub-lists inside a group, both inline (rail expanded) and in the
  collapsed-mode flyout.
- Non-goals: collapsible sub-sections, groups nested more than one level.

## Approaches

1. **Nest the existing `Rail.Section` inside `Rail.Group`** — picked. Zero new
   API; `Section` already is a titled `role="group"`.
2. New `Rail.GroupSection` part — same result, extra export/docs/manifest for no
   behavioural difference.
3. Divider only — loses the labels visually and for screen readers.

## Design

- No TSX API change. `<Rail.Section title>` is allowed as a child of
  `<Rail.Group>`; mixing loose `Rail.Item`s and sections stays allowed.
- SCSS only (`Rail.module.scss`):
  - `.subitems .sectionTitle` — left padding aligned with subitem labels
    (`--rail-subitem-padding-left`), so the heading reads as part of the group.
  - `.flyoutBody .sectionTitle` — padding aligned with flyout items; always
    visible (flyout is portaled outside `.collapsed`, so it already isn't hidden).
  - Spacing between consecutive nested sections via the existing `gap`.
- Active-state cascade, auto-open and flyout already key off any descendant
  `.item`, so they keep working through the extra wrapper — covered by tests.
- Docs: `docs/components/Rail.md` — usage example, replace the "only
  `<Rail.Item>` children" anti-pattern with "only `Rail.Item` or `Rail.Section`
  of items". Playground Rail demo gets a group with two sections.
- Tests: section inside group renders a named `role="group"` inline and in the
  flyout; group with a current subitem inside a section auto-opens.

## Left to the builder

Exact token values for nested-title padding (new component tokens in
`Rail.tokens.scss` if no existing one fits).

## Follow-up decided during demo review (2026-11-19)

- The user rejected the uppercase caps look for nested titles. From six variants they picked
  "label + trailing hairline", then asked for it on **all** Rail section titles, at
  `--font-size-md` (14px), with even spacing above and below each title.
