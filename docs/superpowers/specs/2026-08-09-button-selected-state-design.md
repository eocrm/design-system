# Button selected state design

## Problem

Standalone filter and toolbar Buttons cannot show that they currently carry an
applied value. Existing Button variants describe action intent, while
ButtonGroup's selected treatment implies a mutually exclusive radio group.
Consumers therefore cannot make several independent applied filters scannable
without custom paint.

## Public API and semantics

Add `selected?: boolean` to `ButtonProps`, defaulting to `false`. A selected
Button exposes `aria-pressed="true"`; an explicitly supplied native
`aria-pressed` value continues to win through Button's existing props-last
spread contract. An unselected Button exposes `aria-pressed="false"` only when
the `selected` prop was explicitly supplied, preserving today's DOM for callers
that do not opt into the state.

`selected` is controlled paint and semantics only. Button does not keep state
or change it on click.

## Visual treatment

Selected paint applies only to `secondary` and `ghost` Buttons. Both use a
shared persistent accent treatment: subtle accent background, accent
foreground, accent border, and a selected hover surface. New Button component
tokens wrap the existing shared color primitives so consumers can theme the
state without overriding selectors.

`primary`, `danger`, and `success` retain their normal intent paint even when
`selected` is supplied, while still receiving the requested `aria-pressed`
state. Disabled Buttons retain the selected cue under the component's existing
disabled opacity.

## Documentation and demonstration

Document `selected` on `ButtonProps`, add a canonical applied-filter example
and anti-pattern guidance to Button's JSDoc, and update the Button section in
`packages/design-system/AGENTS.md`. Expand the existing Button playground demo
with selected secondary and ghost controls. Update the Contacts mockup filter
triggers to pass `selected` from their current filter values so the realistic
consumer example uses the shipped pattern.

## Testing

Button unit tests will verify:

- selected secondary and ghost Buttons receive selected paint;
- primary, danger, and success Buttons do not receive selected paint;
- explicit `selected={true}` and `selected={false}` map to matching
  `aria-pressed` values;
- omitting `selected` omits `aria-pressed`;
- an explicit native `aria-pressed` value overrides the derived value;
- selected and disabled states compose without changing native disabled
  behavior.

The full repository gates and required library/mockup review cycle will run
before publication.
