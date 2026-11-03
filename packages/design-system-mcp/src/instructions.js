export const INSTRUCTIONS = `Serves the docs of @eocrm/design-system (the EOCRM React component library) at the exact version this project pins.

Rules for UI code in this project:
- Use design-system components only; never raw <button>/<input>/<select> etc.
- Design tokens only; no raw colour, px or spacing values.
- No margin or positioning on components; lay out with Stack/Cluster.
- Import from the package root ("@eocrm/design-system") only, never deep paths.

Call \`get_primer\` once per UI task, \`list_components\` before choosing components, and \`get_component_doc\` before using one. \`get_doc\` serves topic guides (setup, theming, ...).`;
