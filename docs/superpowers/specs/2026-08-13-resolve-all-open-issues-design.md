# Resolve All Open Issues Design

## Goal

Resolve every issue open in `eocrm/design-system` on 2026-08-13 in one reviewable,
test-driven pull request and publish the resulting design-system release. Issues
#446 and #461 describe the same Slider defect and share one implementation; both
issues will be closed against the resulting release.

## Delivery shape

All work lands on `feat/resolve-all-open-issues` in one draft pull request. Each
issue, or tightly coupled pair, receives a focused commit so reviewers can reason
about the large branch incrementally. The complete branch must pass the root
quality gates, package tarball check, and the repository's two-reviewer
pre-push loop before the draft becomes ready. The PR references every issue with
`Addresses`, never an auto-closing keyword. After squash merge and successful
publication, the published version is commented on every issue before closure.

## Accessibility corrections

### Button aria-disabled (#462)

Treat `[aria-disabled='true']` as the visual equivalent of native `:disabled`:
dim the button, use the not-allowed cursor, and suppress every variant's hover
appearance. Unlike native disabled, retain pointer events and focusability so a
consumer can preserve focus and announce the unavailable state. Regression tests
will assert the state class/attribute contract and the stylesheet behavior will
remain token-based.

### Slider range names (#446, #461)

Add `thumbLabels?: readonly [string, string]`. In range mode explicit thumb
labels win. Otherwise an `aria-label` produces localized minimum/maximum names
derived from that label. An `aria-labelledby` value remains the shared visible
label reference and is augmented with internal localized suffix nodes so each
thumb has a distinct accessible name without duplicating the visible label.
Single-thumb naming is unchanged. English and Russian suffixes are added to the
i18n catalog, and the demo and JSDoc show both default derivation and overrides.

### ColorPicker Field association (#460)

The current component is named `ColorPicker`; the issue's `ColorSwatchPicker`
name refers to the same default swatch-trigger behavior. Destructure Field's
injected `id` and send it to the focusable default trigger rather than the
role-less wrapper. Continue forwarding `aria-labelledby` and
`aria-describedby` to that trigger, with external labelling suppressing the
generated `aria-label`. Custom triggers retain their existing consumer-owned
labelling contract. Tests compose a real `Field` and verify the visible label
names the trigger.

### IconPicker Field composition (#456)

Consume `id`, `required`, `invalid`, `aria-invalid`, `aria-required`,
`aria-labelledby`, and `aria-describedby` explicitly so Field-injected
component props never leak onto a role-less DOM wrapper. Route applicable DOM
and ARIA attributes to the focusable trigger. An external `aria-labelledby`
from Field takes precedence over the picker's purpose-based generated name,
while an explicit consumer `aria-label` remains the fallback outside Field.
Tests cover both Field auto-cloning and standalone usage.

### Select root ARIA leakage (#451)

Remove the three naming/description attributes from `...rest` and pass them only
to `Trigger`. The role-less root keeps structural HTML attributes such as
`className` and `data-*`, but no accessible name. Existing trigger behavior and
hidden form inputs are unchanged.

### Switch focus during loading (#447)

Only the explicit `disabled` prop sets native `disabled`. `loading` keeps the
input focusable, exposes busy state, and blocks change handling before invoking
the consumer callback. Pointer and keyboard attempts during loading are inert,
but focus remains on the control. Documentation distinguishes permanent
unavailability from transient in-flight state.

### Modal mounted-open restoration (#450)

Capture the active element during the first layout effect when a Modal mounts
already open, before Content's focus microtask. Restore on a normal open-to-close
transition and also from the layout-effect cleanup when an open modal unmounts.
Restoration remains guarded by `document.contains`, uses `preventScroll`, and
must happen once. Tests cover initially-open close, initially-open unmount, and
the existing always-mounted transition path.

### ErrorState transition guidance (#448)

This issue requests no runtime API change. Expand the A11y remarks to distinguish
an error present on initial load from one replacing a loading state. Document a
persistently mounted `role="status"` container spanning both states, explain why
the live region must pre-exist the mutation, and warn against restoring an
assertive page-level `role="alert"`. Update the agent-facing guidance with the
same concise rule.

## Loading-state timing

### Public Skeleton visibility (#457)

Extract and export `useSkeletonVisibility(loading, options)` where options are
`delay?: number` and `minDuration?: number`. It owns the existing normalized
timing semantics and returns whether the placeholder arm must be shown.
`Skeleton` delegates to the hook, preserving its current API. Consumers can use
the returned boolean to render exactly one of placeholder or content, so the
minimum duration is enforceable rather than displaying both arms. The hook has
fake-timer tests for delayed entry, cancelled fast loads, minimum visible time,
zero timing, and timer cleanup. JSDoc, exports, AGENTS guidance, and the Skeleton
demo show the canonical swap pattern.

### DataTable skeleton timing (#458)

Add `skeletonDelay?: number` and `skeletonMinDuration?: number`, deliberately
named as Skeleton-specific options rather than ambiguous table-wide `delay`.
Drive the empty first-load body swap with `useSkeletonVisibility`. During the
minimum-duration tail, skeleton rows remain in the body and data/empty rows stay
absent; during a delay window, neither skeleton nor empty state flashes. Existing
populated-table refetch behavior remains unchanged. The table keeps `aria-busy`
tied to actual loading, not visual tail timing. Tests cover fast loads, delayed
appearance, the tail window, and populated refetches; demo and guidance expose
the new props.

## Layout capabilities

### Constrain viewport fraction (#459)

Add the named height value `viewport-70`, resolving to `70vh` with a `70dvh`
override, for `height`, `minHeight`, and `maxHeight`. It composes with
`maxHeight="lg"` to express the issue's exact `min(70dvh, 640px)` requirement
without arbitrary CSS lengths. The name is explicit and avoids pretending a
two-thirds value is equivalent to the requested 70 percent. Update types,
class maps, tests, demo, JSDoc, and AGENTS guidance.

### Card scrolling body (#455)

Add `Card.Body`, a forwardRef HTML div subcomponent. `Card fill` establishes the
internal column and shrink chain only when compound body structure is present;
`Card.Body scroll` becomes the flexible, `min-height: 0`, vertical scroll region
while `Card.Header` remains fixed. A non-scrolling body is also valid for
consistent section padding. Compound-child padding detection recognizes Body.
The API avoids a card-wide overflow mode because the header/body ownership is
the capability being requested. Tests cover exports, refs, classes, automatic
padding, and the fill/header/body composition; demo and guidance show the
dashboard-cell pattern.

## Token correction

### Avatar contrast (#452)

Replace only avatar palette primitives that fail 4.5:1 against
`--color-avatar-fg`, retaining six visually distinct hue families. Every final
slot must meet at least 4.5:1 using WCAG relative luminance math. Regenerate web
and Compose outputs from `tokens.json`; never edit generated artifacts directly.
Add or extend a token test that computes the actual contrast so future palette
changes cannot regress the threshold. Run `tokens:check` after generation.

## Cross-cutting implementation constraints

- Production behavior changes follow strict red-green-refactor: add a focused
  regression test, observe the expected failure, then implement the minimum fix.
- Public APIs and exported props receive complete JSDoc, examples, and
  anti-pattern guidance. Relevant existing component demos are updated.
- All user-facing fixed strings use the design-system i18n catalog in English
  and Russian.
- Component styles use tokens/component tokens and obey the repository's layout
  ownership rules. The Card and Constrain additions are explicit layout
  primitives, so their documented layout behavior is intentional and scoped.
- No new third-party dependency is introduced.
- Generated manifests are rebuilt only if public metadata changes require it.

## Verification and release

Run focused tests after every red/green cycle, then run `make test`,
`make build-lib`, `make lint`, `npm run format:check`, `npm run tokens:check`, and
the dry-run package-content gate. Open one draft PR and run two independent,
fresh-context library reviewers across correctness, types, tests, accessibility,
API consistency, token discipline, SCSS rules, cross-package leakage, and
distribution. Fix every Critical and Important finding and repeat with fresh
reviewers until both return `clean enough to stop`. Mark ready, wait for
`Quality / check`, squash-merge without bypassing protection, verify the Release
workflow and new tag, then comment and close all 14 issues.
