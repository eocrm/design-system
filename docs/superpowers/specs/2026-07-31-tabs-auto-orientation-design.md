# Tabs automatic orientation design

## Context

`Split collapseBelow` responds to the split's own inline size through a CSS
container query. Consumers cannot reproduce that state with viewport media
queries, so a vertical Tabs rail remains tall after the split stacks above its
panel. Issue #398 asks the design system to make that composition responsive
without app-owned DOM measurement.

## Decision

Extend `TabsOrientation` with `'auto'` and support
`<Tabs orientation="auto">`.

Automatic orientation is based on the Tabs tablist's own measured inline size:

- below 320px: vertical;
- at or above 320px: horizontal.

This makes the canonical `Split asideWidth="220px" collapseBelow="sm"`
composition vertical while side-by-side and horizontal after the aside becomes
a full-width stacked row. The 320px threshold deliberately sits below the
design system's 480px `sm` collapse breakpoint: using the same threshold for
both would leave every sub-480px stacked Split vertical. The threshold is
intentionally fixed for v1; consumers that need a specific axis continue to
pass `horizontal` or `vertical`.

## Runtime behavior

Tabs owns one `ResizeObserver` only when `orientation="auto"`. A layout effect
performs the initial synchronous measurement and observes later inline-size
changes. Automatic mode starts vertical during SSR and in environments without
`ResizeObserver`, which is the safer master-detail fallback and avoids changing
existing explicit modes.

The measured value produces one effective orientation, `horizontal` or
`vertical`. Every orientation-dependent behavior reads that same value:

- `aria-orientation`;
- ArrowLeft/ArrowRight versus ArrowUp/ArrowDown navigation;
- horizontal/vertical CSS classes;
- indicator axis and dimensions;
- scroll wrapper and `endContent` layout.

The public forwarded ref remains attached to the tablist. The internal
measurement ref is merged with it rather than changing the rendered DOM or ref
contract.

## Public API and guidance

`TabsOrientation` becomes `'horizontal' | 'vertical' | 'auto'`. The prop JSDoc,
component examples, design-system `AGENTS.md`, and Tabs playground demo will
document automatic mode as the canonical partner for a collapsing Split. The
existing defaults and explicit modes remain source- and behavior-compatible.

## Testing and validation

Unit tests will provide a controllable `ResizeObserver` test double and prove:

1. auto mode starts vertical;
2. a width at or above 320px switches ARIA, classes, keyboard axis, and
   indicator geometry to horizontal;
3. shrinking below 320px switches those behaviors back to vertical;
4. explicit horizontal and vertical modes do not create an observer.

The playground demo will compose `Split collapseBelow="sm"` with
`Tabs orientation="auto"`. Playwright will verify that a 220px side rail is
vertical, then resize the Split below its 480px collapse breakpoint and verify
that its wider stacked Tabs becomes horizontal with the corresponding arrow-key
behavior.

## Non-goals

- Exposing Split collapse state through context, render props, or data
  attributes.
- Allowing a consumer-configurable automatic threshold in this change.
- Changing the default Tabs orientation from horizontal.
