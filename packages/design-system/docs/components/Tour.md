# `<Tour>` — guided tour / onboarding walkthrough

```tsx
<Button data-tour="bulk-edit">Bulk edit</Button>

<Tour
  open={open}
  onOpenChange={setOpen}
  onFinish={(reason) => markSeen('bulk-edit', reason)}
  steps={[
    { title: 'Welcome', body: 'A quick look around.' },
    { target: 'bulk-edit', title: 'Bulk edit', body: 'Select rows, then edit them together.' },
  ]}
/>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `steps` | `TourStep[]` | yes | — | The steps, in order. Must be non-empty. |
| `open` | `boolean` | yes | — | Controlled open state (required — like `Modal`, there is no uncontrolled mode: an uncontrolled tour could not be started or replayed). |
| `onOpenChange` | `(open: boolean) => void` | yes | — | Called with `false` on Skip, Escape and Done. |
| `onFinish` | `((reason: TourFinishReason) => void)` | no | — | Fires once per Skip / Escape / Done. NOT called when the consumer closes the tour itself by setting `open={false}` — only the tour's own end gestures fire it. Use it to persist "seen" state. |
| `step` | `number` | no | — | Controlled step index. Control it when a step change must do something first — navigate to another page, open an accordion, switch a tab — then the Tour waits for the next target to mount. |
| `onStepChange` | `((index: number) => void)` | no | — | Fires on every step change (Next, Back, arrow keys, `advanceOn`), controlled or not. |
| `defaultStep` | `number` | no | — | Uncontrolled starting step. Default `0`. Every re-open starts here again. |
| `modal` | `boolean` | no | — | `true` (default): dims the page with a spotlight cutout, blocks clicks outside it and traps focus — onboarding. `false`: card only, page stays usable — feature announcements. |
| `targetTimeout` | `number` | no | — | Ms to wait for a step's target before falling back to a centered card. Default `5000` (room for a route change + data fetch). `Infinity` waits forever. |
| `onTargetMissing` | `((step: TourStep, index: number) => void)` | no | — | Called when a step's target didn't appear within `targetTimeout`. Log it. |
| `doneLabel` | `string` | no | — | Contextual label for the last step's button, e.g. `'Got it'` for a one-step announcement. Defaults to the i18n `tour.done` (`'Done'`). An empty string counts as unset. |
| …native | | | | plus native `<div>` attributes |

<!-- props:end -->

- **Targets are `data-tour` values**, not selectors or refs: put `data-tour="x"` on the element, `target: 'x'` on the step. No `target` → centered step.
- **Controlled `open`.** `onFinish(reason)` → `'completed'` (Done) or `'skipped'` (Skip / Escape). Persisting "seen" is the app's job.
- **`modal` (default `true`)** dims the page with a spotlight, blocks clicks outside it, traps focus. `modal={false}` = card only (announcements); pair with `doneLabel="Got it"`.
- **Cross-page tours:** mount `<Tour>` once in the app shell, control `step`, navigate inside `onStepChange`. The Tour waits for the next target (`targetTimeout`, default 5000ms, `Infinity` = forever), then falls back to a centered card and calls `onTargetMissing`.
- **"Click it to continue":** `{ interactive: true, advanceOn: 'click' }` — target stays clickable and joins the focus trap; the tour advances after its click handler runs.
- Strings (`Next`, `Back`, `Skip tour`, `Done`, `Step n of m`) come from i18n `tour.*`; only `doneLabel` is a prop.

**Anti-patterns:**

- ❌ `target: '#bulk-edit'` — it's the `data-tour` value, not a selector.
- ❌ Mounting a cross-page `<Tour>` inside a routed page — it unmounts on navigation.
- ❌ `advanceOn: 'click'` without `interactive: true` in modal mode — the target is blocked.
- ❌ Auto-opening every visit — gate on your own seen flag.
- ❌ An `interactive: true` modal step whose target opens a `Modal`/`Drawer` — it
  renders beneath the tour's scrim. End the step first (`advanceOn: 'click'`,
  point the next step into the opened Modal/Drawer) or use `modal={false}`.
  Library floating surfaces (menus, popovers, selects) opened from an
  interactive target elevate above the tour automatically.

```tsx
// One-step feature announcement — page stays usable:
<Tour open={open} onOpenChange={setOpen} modal={false} doneLabel="Got it"
  steps={[{ target: 'bulk-edit', title: 'New: bulk edit', body: 'Select rows, then edit them together.' }]} />

// Cross-page: controlled step, navigate first, Tour waits for the target.
// Symmetric on i, not a one-shot `i === 3`: Back past step 3 must navigate away too.
<Tour open={open} onOpenChange={setOpen} step={step}
  onStepChange={(i) => { navigate(i >= 3 ? '/contacts' : '/deals'); setStep(i); }}
  steps={steps} />
```

- Each step spotlights its `data-tour` target and anchors a card (title, body, "Step n of m", Skip / Back / Next) to it. Steps without a target, or whose target never appears, render as a centered card. Every transition animates; all motion drops under `prefers-reduced-motion`.
- **Keyboard:** Escape skips; ←/→ move between steps (not inside inputs).

**When NOT to use**

- A single contextual hint on hover/focus: `<Tooltip>`.
- An interactive panel the user opens themselves: `<Popover>`.
- A blocking decision: `<Modal>` / `<ConfirmationPopover>`.
- Persistent inline guidance: `<Alert>` or `EmptyState`.

**More anti-patterns**

- ❌ Two elements with the same `data-tour` value on screen: the first rendered wins (dev warning). Keep ids unique per screen.
- ❌ 10+ step tours: keep onboarding to about 5-7 steps; split longer ones per page.
