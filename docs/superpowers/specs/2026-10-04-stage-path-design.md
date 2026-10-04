# StagePath

## Problem

CRM records move through ordered stages: a project goes Planned → Active →
Review → Done, a deal goes Lead → Qualified → Proposal → Negotiation. The CRM
wants the familiar chevron "path" for this: a row of arrow-shaped segments
showing which stages are done, which one is current, and which are still
ahead. Optionally, clicking a stage moves the record there. Nothing in the library does this
today. `Breadcrumb` is navigation, `Timeline` is a vertical event log, and
`Progress` is a bar.

## Decisions

| Question         | Decision                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| New component?   | Yes, `<StagePath>`. Only the chevron row; the stage-picker chip and outcome buttons stay consumer composition (`Cluster`) |
| Interactivity    | Read-only by default; passing `onStageChange` makes every non-current stage a `<button>`                                  |
| Outcome          | `tone`: `default` / `success` / `danger` on the whole path; recolours done + current stages                               |
| Width / overflow | Root `width: 100%`, stages equal width; labels ellipsis, full label in a tooltip only when clipped                        |
| Focus ring       | Chevron-shaped: ring-coloured layer with a 2px-inset fill layer, both clipped to the stage shape                          |
| State            | Always controlled: `value` is required; no internal state                                                                 |
| Size             | `md` only (32px, matches Button `md`). No `size` prop                                                                     |
| Keyboard         | Each stage button is its own Tab stop; no roving tabindex                                                                 |
| Name             | `StagePath` (not `Pipeline`, which reads as Kanban; not `Stepper`, which reads as a form wizard)                          |
| Branch           | `feat/stage-path`                                                                                                         |

## 1. API

```tsx
<StagePath
  aria-label="Deal stage"
  stages={[
    { id: 'lead', label: 'Lead' },
    { id: 'qualified', label: 'Qualified' },
    { id: 'proposal', label: 'Proposal' },
    { id: 'negotiation', label: 'Negotiation' },
  ]}
  value="proposal"
  tone="default"
  onStageChange={(id) => moveDeal(id)}
/>
```

```ts
interface StagePathStage {
  id: string;
  label: ReactNode;
}

interface StagePathProps extends Omit<HTMLAttributes<HTMLOListElement>, 'children'> {
  stages: StagePathStage[];
  /** Id of the current stage. Stages before it are done, after it upcoming. */
  value: string;
  /** Outcome colour for done + current stages. @default 'default' */
  tone?: 'default' | 'success' | 'danger';
  /** When passed, every non-current stage renders as a button that calls this. */
  onStageChange?: (id: string) => void;
}
```

- `ref` forwards to the root `<ol>`; `className` / `style` / other attributes
  are spread onto it, and `className` is merged with the component's own.
- An unknown `value` (not in `stages`) renders every stage as upcoming and
  logs a dev-only `console.warn`. It does not throw: a stale value from the
  server must not crash a record page.
- The current stage is never a button. "Move to where it already is" is not a real action.
- Every non-current stage is a button, both done stages and upcoming ones. Whether a backwards
  move is allowed is a business rule the consumer enforces in
  `onStageChange` (e.g. with a confirmation). Per-stage `disabled` is out of
  scope until a real case needs it.

## 2. Markup and a11y

```html
<ol class="root tone-default" aria-label="Deal stage">
  <li class="stage done">
    <button type="button">
      <span class="label">Lead</span><span class="vh">, completed</span>
    </button>
  </li>
  <li class="stage current" aria-current="step"><span class="label">Proposal</span></li>
  <li class="stage upcoming">
    <button type="button">
      <span class="label">Negotiation</span><span class="vh">, upcoming</span>
    </button>
  </li>
</ol>
```

- `<ol>` gives the ordered-list semantics (n of m) for free.
- `aria-current="step"` on the current `<li>`.
- Done and upcoming states are announced as visually hidden, localised text
  (`stagePath.completed` / `stagePath.upcoming` added to `i18n/messages.ts`,
  `en.ts`, `ru.ts`). Colour is never the only signal.
- Read-only mode renders `<span>` content instead of `<button>`: no hover, no
  pointer cursor, nothing to tab to.
- Hidden text sits inside the button, so it becomes part of the accessible name
  ("Lead, completed").

## 3. Truncation tooltip

Labels that are clipped show the full label in a `Tooltip` on hover and on
keyboard focus (`:focus-visible`). Labels that fit get no tooltip and no `aria-describedby`, so nothing is announced twice. `EntityChip` already implements exactly this (controlled `Tooltip`, `scrollWidth > clientWidth` check, textContent capture for non-string labels, focus-visible gate with jsdom fallback).

Extract that logic into `src/components/_internal/useClippedTooltip.ts`
and move `EntityChip` onto it. The `EntityChip` test suite must pass
**unchanged**; that is the regression net for the extraction. The hook gets its
own focused test file.

## 4. Styling

- `StagePath.tokens.scss` component tokens, all defaulting to existing
  primitives:
  - default: done `--color-tone-info-bg/fg`, current `--color-accent` /
    `--color-accent-fg`
  - success: done `--color-tone-success-bg/fg`, current `--color-success` /
    `--color-success-fg`
  - danger: done `--color-tone-danger-bg/fg`, current `--color-danger` /
    `--color-danger-fg`
  - upcoming (all tones): `--color-tone-neutral-bg/fg`
  - hover: `color-mix()` of the stage's bg toward its fg, one step darker;
    exposed as `--stage-path-*-hover` component tokens. Checked in both themes
    in the playground.
  - chevron depth `--stage-path-arrow: var(--space-3)`, height
    `--size-md`, gap `2px` via an existing spacing token if one matches,
    else a component token.
  - ring: `--ring-accent` / `--ring-success` / `--ring-danger` by tone.
- Shape: `clip-path: polygon(...)` using the arrow-depth token. The first stage has no
  inner notch and has a rounded left edge; the last stage has a notch and a rounded right edge.
- Focus (`:focus-visible` on the button): the stage background becomes the ring
  colour and a `::before` inset by 2px carries the fill, clipped to the same
  polygon. The label sits above it.
- Current stage label is bold.
- Root: `display: flex; width: 100%`. Stages `flex: 1 1 0; min-width: 0`
  (internal children, so not a Rule 4 violation), label `text-overflow:
ellipsis`.
- RTL: polygons mirror under `:dir(rtl)`.

## 5. Tests (`StagePath.test.tsx`)

- Renders all stages; done/current/upcoming derived from `value`.
- `aria-current="step"` only on the current stage; hidden "completed" /
  "upcoming" text present.
- Each `tone` applies its class.
- Read-only: no buttons rendered.
- Interactive: clicking / Enter on a done or upcoming stage calls
  `onStageChange(id)`; the current stage is not a button.
- Unknown `value`: all upcoming and a `console.warn`.
- `ref` reaches the `<ol>`; `className` merged.
- Clipped-label tooltip covered by the `useClippedTooltip` tests; one smoke test
  that a clipped label (stubbed `scrollWidth`) shows a tooltip on hover.

## 6. Completion checklist

1. `src/components/StagePath/` with `StagePath.tsx`, `.module.scss`, `.tokens.scss`,
   `.test.tsx` and `index.ts`; tokens file imported where other component tokens are;
   re-exported from `src/index.ts`.
2. `_internal/useClippedTooltip.ts` (+ test), with `EntityChip` migrated onto it.
3. i18n keys in `messages.ts`, `en.ts`, `ru.ts`.
4. Playground `StagePathDemo.tsx`: interactive vs read-only, the three
   tones, narrow-width truncation, and a recreation of the CRM record header
   (stage chip + path + Won/Lost buttons in a `Cluster`, where Won/Lost switch
   `tone`). Wired into `App.tsx`, `navItems.ts`, `ComponentsIndex.tsx`,
   `overviewSchematics.tsx`, and the `ComponentName` union.
5. `docs/components/StagePath.md` (TL;DR, when NOT to use: navigation →
   Breadcrumb, form wizard, event history → Timeline; generated props table)
   and the `AI-PRIMER.md` index line; JSDoc is a one-line summary + `@see`.
6. `CLUSTERS` entry in both `manifest.ts` and `generate-manifest.mjs`, then
   `npm run build:manifest`.
7. Live playground link to the user before opening the PR; then the
   pre-push review loop.

## Out of scope

Sizes other than `md`, per-stage `disabled`, icons or check marks, vertical
orientation, a loading/pending state while `onStageChange` resolves (the
consumer can render the path read-only meanwhile), and narrow-width collapse
to bare chevrons. Each can be added later without changing the existing props.
