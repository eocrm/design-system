# Rail Group Subitem Tooltip Design

## Problem

`RailItem` automatically wraps string-labelled items in `Tooltip` whenever the rail is collapsed. `RailGroup` renders the same items in a collapsed flyout where their labels are already visible, so hovering a grouped item duplicates its label. This contradicts the existing `RailItem` documentation.

## Design

Add a private boolean React context owned by the Rail component folder. `RailGroup` provides `true` around its children in both inline and flyout render paths. `RailItem` reads the context and retains its automatic collapsed Tooltip only when it is not inside a group.

The context is internal and has no public export or consumer-facing API. It follows React ancestry through the flyout portal, unlike DOM-ancestry detection, and does not require cloning or restricting valid React children.

## Compatibility and boundaries

- Standalone collapsed `RailItem` instances with string children keep their Tooltip.
- Grouped `RailItem` instances never add the automatic collapsed Tooltip; the flyout's visible label remains the discoverability surface.
- Expanded behavior and non-string children remain unchanged.
- Both toggle-only and linkable groups receive the same provider boundary.
- Nested groups remain unsupported per the existing public contract.

## Verification

Add regression tests that first demonstrate the redundant tooltip and then prove the grouped/standalone boundary. Run the focused Rail test suite, all repository quality gates, package-content audit, and a real-browser Playwright scenario that opens the collapsed group flyout and hovers/focuses a subitem without producing a second tooltip.
