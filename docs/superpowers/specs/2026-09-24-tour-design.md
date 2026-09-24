# Tour — design

**Date:** 2026-09-24
**Status:** approved (pending written-spec review)

## Problem

The CRM needs guided walkthroughs that point at real UI. Four uses, one component:

1. **First-run onboarding** — 5–8 steps over a page, page dimmed, each target spotlit.
2. **Feature announcement** — 1–3 light steps pointing at a new/changed control; page stays usable.
3. **On-demand help** — the user replays a tour from a help menu.
4. **Cross-page flows** — step N on `/deals`, step N+1 on `/contacts`.

Nothing in the library does this. `Popover` anchors a panel to a trigger it owns;
`Modal` inerts the whole page. Neither can spotlight an arbitrary element, walk
through steps, or wait for a target that has not mounted yet.

## Decisions

| Question             | Decision                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| API shape            | Data-driven single component: `<Tour steps={[...]} />`. No compound API, no provider.                    |
| Target reference     | `data-tour="<id>"` attribute on the target; step has `target: '<id>'`. No refs, no raw selectors.        |
| Page takeover        | Per-tour `modal` prop (default `true`): spotlight + blockers + focus trap. `modal={false}` = card only.  |
| Target interaction   | Opt-in per step: `interactive: true` makes the target clickable; `advanceOn: 'click'` advances on click. |
| Routing              | Tour is router-agnostic. Consumer navigates in `onStepChange`; the Tour waits for the next target.       |
| Persistence ("seen") | Consumer's job. `onFinish(reason)` reports `'completed'` vs `'skipped'`.                                 |
| Motion               | Every tour action animates (open, step change, scroll, wait, close). `prefers-reduced-motion` → instant. |
| Strings              | Through `useTranslation()` (`tour.*` keys). Only `doneLabel` is a prop — a contextual label, not i18n.   |
| Background for SR    | `aria-modal="true"` + focus trap + pointer blockers. **No `inert`** (see Accessibility).                 |

## API

```ts
export type TourSide = 'top' | 'right' | 'bottom' | 'left';
export type TourAlign = 'start' | 'center' | 'end';

export interface TourStep {
  /** `data-tour` value of the target. Omit → centered card, no spotlight. */
  target?: string;
  title: ReactNode;
  body?: ReactNode;
  /** Preferred side of the target. Auto-flips. Default `'bottom'`. */
  side?: TourSide;
  /** Default `'center'`. */
  align?: TourAlign;
  /** Px of spotlight around the target. Default `8`. */
  spotlightPadding?: number;
  /** Modal mode only: target receives pointer events and joins the focus trap. */
  interactive?: boolean;
  /** Requires a clickable target (`interactive`, or `modal={false}`). Advances after the target's own click handler runs. */
  advanceOn?: 'click';
}

export interface TourProps {
  steps: TourStep[];
  /** Controlled-only (like Modal) — an uncontrolled tour can't be started or replayed. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fires once per close. Skip / Escape → `'skipped'`; Done → `'completed'`. */
  onFinish?: (reason: 'completed' | 'skipped') => void;
  /** Controlled step index. */
  step?: number;
  /** Fires on every step change, in both controlled and uncontrolled modes. */
  onStepChange?: (index: number) => void;
  /** Uncontrolled start index. Default `0`. Reset to it on each re-open. */
  defaultStep?: number;
  /** Default `true`. */
  modal?: boolean;
  /** Ms to wait for a missing target before falling back to a centered card. Default `5000`. */
  targetTimeout?: number;
  onTargetMissing?: (step: TourStep, index: number) => void;
  /**
   * Contextual label for the last step's button (e.g. `'Got it'` for an
   * announcement). Defaults to `t('tour.done')`. Empty string counts as unset.
   * Same precedent as `ConfirmationPopover.confirmLabel`.
   */
  doneLabel?: string;
}
// TourProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'children'>;
// forwardRef + rest spread land on the card (Hard rule 6). Rest is spread
// FIRST so role / aria-* / tabIndex / data-state always win.
```

`step` uses the existing `_internal/useControllableState`.

### Strings (Hard rule 9)

No per-component label props for translation. New `tour` namespace in
`src/i18n/messages.ts`, populated in `en.ts` and `ru.ts`:

| Key             | en                          | ru                         |
| --------------- | --------------------------- | -------------------------- |
| `tour.next`     | `Next`                      | `Далее`                    |
| `tour.back`     | `Back`                      | `Назад`                    |
| `tour.skip`     | `Skip tour`                 | `Пропустить`               |
| `tour.done`     | `Done`                      | `Готово`                   |
| `tour.progress` | `Step {current} of {total}` | `Шаг {current} из {total}` |
| `tour.waiting`  | `Loading step…`             | `Загрузка шага…`           |

### Usage

```tsx
<Button data-tour="bulk-edit">Bulk edit</Button>

<Tour
  open={open}
  onOpenChange={setOpen}
  onFinish={(reason) => markSeen('bulk-edit', reason)}
  modal={false}
  doneLabel="Got it"
  steps={[{ target: 'bulk-edit', title: 'New: bulk edit', body: 'Select rows, then edit them all at once.' }]}
/>
```

Cross-page: mount `<Tour>` in the app shell above the router outlet, control
`step`, and navigate inside `onStepChange`.

## Rendering

All layers are portaled to `document.body`.

1. **Spotlight** (modal only) — one `position: fixed` div sized to the target
   rect + `spotlightPadding`, rounded corners, a large `box-shadow` in the scrim
   color that dims everything outside it.
2. **Pointer blockers** (modal only) — four transparent fixed divs framing the
   cutout; they absorb clicks on the rest of the page. On non-`interactive`
   steps the spotlight div also takes pointer events (target unclickable); on
   `interactive` steps it is `pointer-events: none`. Clicking a blocker does
   **nothing** — it never closes the tour.
3. **Card** — positioned against the target with Floating UI (`offset`, `flip`,
   `shift({ padding: 8 })`, `arrow`, `autoUpdate`, `strategy: 'fixed'`,
   `transform: false`), same setup as `Popover.Content`. Contains title, body,
   progress text, and the footer buttons. A step without a target (or whose
   target timed out) renders the card centered in the viewport with no arrow;
   in modal mode the spotlight collapses to a zero-size rect at the viewport
   center.

`modal={false}` renders only the card.

### Footer

Library `Button`s: `Skip` (ghost, left) · `Back` / `Next` (right).

- Back hidden on the first step.
- Last step: Next → `doneLabel`, Skip hidden.
- One-step tour: only Done.
- No ✕ — Skip is the dismiss affordance.

## Animation

| Action                       | Motion                                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Open                         | Scrim fades in; card fades + scales from its arrow side (`@starting-style`, as Popover).                                           |
| Next / Back                  | Spotlight transitions `top/left/width/height/border-radius` to the new target; card glides; content cross-fades.                   |
| Off-screen target            | `scrollIntoView({ block: 'center', behavior: 'smooth' })`; spotlight + card follow via `autoUpdate`.                               |
| To / from a centered step    | Cutout shrinks to / grows from the viewport center.                                                                                |
| Waiting for a target         | Cutout collapses to the viewport center; card moves to center and fades to low opacity; both glide to the target when it resolves. |
| Interactive step             | Subtle pulsing ring on the cutout.                                                                                                 |
| Close (Skip / Done / Escape) | `data-state="closed"` reverse fade; unmount on `transitionend` (with a timeout fallback).                                          |
| `prefers-reduced-motion`     | All transitions `none`; scroll uses `behavior: 'auto'`; no pulse.                                                                  |

Durations: fades use `--transition-base`; glide/resize/scroll-follow use the new
`--transition-slow` token (see Tokens).

## Step lifecycle

**Resolution.** `document.querySelector('[data-tour="<id>"]')`. Found only if
`isConnected` and the rect has non-zero width or height. Multiple matches → first
wins + dev-only `console.warn`.

**Waiting.** Missing target → `waiting` state. A `MutationObserver` on `body`
(`childList`, `subtree`, `attributes`, `attributeFilter: ['data-tour']`) re-runs
resolution on each mutation. After `targetTimeout` ms → fallback: centered card,
`onTargetMissing(step, index)`, dev warning. The user can still press Next.

**Lost target.** If the resolved target disconnects mid-step, return to
`waiting` and re-attach when a new matching node appears (the timeout restarts).

**Step change.** Next / Back / `advanceOn` call `onStepChange(next)` first (and
update internal state when uncontrolled). The consumer may navigate or open
disclosure UI; the Tour then resolves or waits.

**advanceOn: 'click'.** A `click` listener on the target (bubble phase,
registered on the target element) that schedules the advance with `setTimeout(0)`,
so the target's own handler — including React's root-delegated `onClick`, which
runs after a native listener on the element — has finished first. Active whenever the target is clickable:
`interactive: true` in modal mode, or any step in `modal={false}` (where the
target is always clickable). In modal mode without `interactive` it is ignored

- dev warning.

**Scroll.** On resolve, if the target is not fully inside the viewport,
`scrollIntoView({ block: 'center' })`. No scroll lock.

**Ending.** Skip / Escape → `onOpenChange(false)` + `onFinish('skipped')`. Done →
`onOpenChange(false)` + `onFinish('completed')`.

**Edge cases.** Empty `steps` or out-of-range `step` → render nothing + dev
warning.

## Accessibility

- Card: `role="dialog"`, `aria-modal={modal}`, `aria-labelledby` → title,
  `aria-describedby` → body, `tabIndex={-1}`.
- Progress text visible: "Step 2 of 5" via `t('tour.progress')`.
- **Waiting state (Hard rule 10):** a visually hidden
  `role="status" aria-live="polite"` live region, INSIDE the card (a plain
  child can't join its `aria-labelledby` name) and rendered unconditionally,
  announces `t('tour.waiting')` while a step's target is being waited for and
  clears when it resolves, times out, or the tour closes. No `aria-busy` — it
  can suppress the region's own update and the focused dialog's announcement.
- **Focus on open:** remember `document.activeElement`, focus the card (both modes).
- **Focus on step change:** focus the card again, so the new title is announced.
- **Focus trap (modal only):** card + target when `interactive`, order card → target → wrap.
  Implemented by extending `_internal/overlay/useFocusTrap` with an optional
  extra-element argument (backward compatible).
- **Focus on close:** restore the remembered element if still connected.
- **Keyboard:** `Escape` → skip, via `overlayStack` (defers to a deeper floating
  surface such as a Select opened in the card — same as Popover #274/#280).
  `ArrowRight` / `ArrowLeft` → next / back, only while focus is inside the card
  and not in an editable element.
- **No `inert`.** Modal's approach inerts every body child, which cannot exempt
  a deeply nested interactive target. Modal mode relies on `aria-modal="true"`,
  the focus trap, and the pointer blockers. Known gap: NVDA browse mode may still
  read background content. Accepted.

## Tokens

Added to `packages/design-tokens/src/tokens.json` (then `npm run tokens:check`):

- `transition.slow` → `--transition-slow`: `260ms ease-in-out`.
- `z.tour` → `--z-tour`: `1150` — above `--z-modal` (1100) so a tour can point
  into an open modal; below `--z-overlay-floating` (1190) so a Select opened in
  the card renders on top.

Component tokens in `Tour.tokens.scss` (card surface/padding/radius/max-width,
scrim color, spotlight radius, pulse ring) reference existing semantic tokens.

## Files

```
packages/design-system/src/components/Tour/
  Tour.tsx            props, JSDoc + @remarks, orchestration, card
  Spotlight.tsx       spotlight + 4 pointer blockers
  useTourTarget.ts    resolve / wait (MutationObserver) / timeout
  Tour.module.scss
  Tour.tokens.scss
  Tour.test.tsx
  index.ts
```

Shared changes: `_internal/overlay/useFocusTrap.ts` (extra element),
`tokens.json` (two tokens).

## Repo invariant checklist

- `Tour.test.tsx` — resolution, waiting + timeout fallback, lost-target
  re-attach, controlled/uncontrolled step, `onFinish` reasons, footer button
  visibility, Escape via overlay stack, arrow keys (and not in inputs), focus
  on open/step/close, focus trap incl. interactive target, `advanceOn`,
  `modal={false}` renders no blockers.
- `useFocusTrap` test for the extra element.
- Playground `TourDemo.tsx`: modal onboarding; single-step announcement with
  `modal={false}`; interactive step with `advanceOn`; simulated cross-page step
  (target mounted after a delay).
- Wire into `App.tsx`, `navItems.ts`, `ComponentsIndex.tsx`,
  `overviewSchematics.tsx`, `ComponentName` in `mockups/registry.ts`.
- Export from `src/index.ts`.
- `@remarks` When NOT to use / anti-patterns in JSDoc + AGENTS.md TL;DR.
- `CLUSTERS` in `manifest.ts` and `generate-manifest.mjs`; `npm run build:manifest`.

## Out of scope

Persistence of seen tours, a global `TourProvider`, per-step `modal`, async
`beforeStep` hooks, custom card render slots, `inert` toggling. All can be
layered by the consumer or added later without breaking this API.
