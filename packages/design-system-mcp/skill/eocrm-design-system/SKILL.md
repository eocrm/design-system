---
name: eocrm-design-system
description: Use when building or changing UI in a project that depends on @eocrm/design-system.
---

# EOCRM design system

Rules for UI code in a project that depends on `@eocrm/design-system` (the EOCRM React component library):

- Use design-system components only; never raw `<button>`/`<input>`/`<select>` etc.
- Design tokens only; no raw colour, px or spacing values.
- No margin or positioning on components; lay out with `Stack`/`Cluster`.
- Import from the package root ("@eocrm/design-system") only, never deep paths. The one exception is the published "@eocrm/design-system/i18n/ru" subpath, for lazily importing the Russian catalogue.

## Where the docs are

If tools named `get_primer`, `list_components`, `get_component_doc` (the `eocrm-design-system` MCP server) are available, use them: call `get_primer` once per UI task, `list_components` before choosing components, and `get_component_doc` before using one. `get_doc` serves topic guides (setup, theming, ..., and `readme` for the package README).

Otherwise read `node_modules/@eocrm/design-system/AI-PRIMER.md`, then `node_modules/@eocrm/design-system/docs/components/<Name>.md` for each component you use.
