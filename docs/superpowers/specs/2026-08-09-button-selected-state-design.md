# Button selected state design

## Problem

Standalone filter and toolbar Buttons cannot show that they currently carry an
applied value. Existing Button variants describe action intent, while
ButtonGroup's selected treatment implies a mutually exclusive radio group.
Consumers therefore cannot make several independent applied filters scannable
without custom paint.

## Public API and semantics

Add `selected?: boolean` to `ButtonProps`, defaulting to `false`. It controls
paint only and does not derive `aria-pressed` or any other semantics. Consumers
pass the native `aria-pressed` attribute explicitly only when activating the
Button itself toggles the state. Menu and disclosure triggers retain their own
ARIA contract while still using selected paint to expose an applied value.

`selected` is controlled paint only. Button does not keep state or change it on
click.

## Visual treatment

Selected paint applies only to `secondary` and `ghost` Buttons. Both use a
shared persistent accent treatment: subtle accent background, AA-safe
foreground, accent border, and a visibly distinct selected hover surface. New
Button component tokens wrap existing shared color primitives so consumers can
theme the state without overriding selectors.

`primary`, `danger`, and `success` retain their normal intent paint even when
`selected` is supplied. Disabled Buttons retain the selected cue under the
component's existing disabled opacity.

## Documentation and demonstration

Document `selected` on `ButtonProps`, add a canonical applied-filter example
and anti-pattern guidance to Button's JSDoc, and update the Button section in
`packages/design-system/AGENTS.md`. Expand the existing Button playground demo
with selected secondary and ghost controls that explicitly add `aria-pressed`
because their activation toggles state. Update the Contacts mockup menu triggers
to pass `selected` from their current filter values without toggle-button ARIA,
and make those filters update the visible rows, count, and empty state.

## Testing

Button unit tests will verify:

- selected secondary and ghost Buttons receive selected paint;
- primary, danger, and success Buttons do not receive selected paint;
- `selected={false}` removes selected paint;
- `selected` alone does not add `aria-pressed`;
- an explicit native `aria-pressed` value passes through for a genuine toggle;
- selected and disabled states compose without changing native disabled
  behavior.

The full repository gates and required library/mockup review cycle will run
before publication.
