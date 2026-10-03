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
