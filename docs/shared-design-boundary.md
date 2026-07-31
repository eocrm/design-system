# Shared design ownership

EOCRM shares visual decisions across platforms through design tokens, not
through a cross-platform component framework. This keeps the common contract
small and lets each platform use its native interaction and accessibility
models.

## Neutral token contract

`packages/design-tokens/src/tokens.json` owns platform-neutral visual facts:
semantic colors, spacing, dimensions, radii, typography, shadows, durations,
and categorical palettes. Generators turn that source into committed Sass and
typed Kotlin. The neutral layer must not depend on React, the DOM, CSS modules,
Node at runtime, or product-specific Compose UI.

Examples that belong here:

- the light and dark application background colors;
- the medium control height;
- spacing and radius scales;
- semantic success, warning, and danger tones.

The generated web contract also preserves pre-migration public custom
properties as compatibility aliases, including the existing Badge surface.
Those aliases are not a precedent for moving new component-specific decisions
into the neutral layer. New component tokens remain owned beside their React
component and should alias neutral primitives.

## React design system

`packages/design-system` owns the React DOM implementation: component APIs,
HTML semantics, ARIA behavior, focus management, portals, browser overlays,
CSS modules, and component-scoped styling. Its stable Sass entry points forward
the generated web token contract.

Examples that belong here:

- `Button` props and markup;
- `Modal` focus trapping and portal behavior;
- `Popover` browser positioning;
- a component token such as `--button-bg` that aliases a neutral primitive.

## Mobile Compose product UI

Mobile applications consume `design-tokens-compose` and own their Compose
components, navigation, screens, state, and product interaction patterns.
Shared tokens provide values; they do not prescribe a React-shaped component
API or move mobile product code into this repository.

Examples that belong in the mobile product:

- a Compose customer card;
- mobile navigation and screen layout;
- gesture behavior and Android/iOS product flows;
- adapting neutral tokens into the app's Material theme.

## Native platform layer

Platform-specific capabilities stay in their platform source sets or host
applications. This includes Android resources and system UI, iOS UIKit/SwiftUI
bridges, permissions, haptics, accessibility integrations, and OS-specific
behavior.

The decision rule is simple: share stable visual data through tokens; implement
behavior where its runtime and users live.
