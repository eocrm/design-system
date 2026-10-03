# `<LiveRegion>` — announcement region for consumer-level outcomes

```tsx
<LiveRegion>{status}</LiveRegion>
<LiveRegion politeness="assertive">{error}</LiveRegion>
<LiveRegion announceKey={saveCount}>{t('saved')}</LiveRegion>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `ReactNode` | no | The message. Pass a string, a number, or an array of only strings/ numbers (e.g. `[count, ' files uploaded']`) — these compare by value, so an unchanged value does not re-announce and a changed one does. Anything else (JSX elements) compares by identity and re-announces on every parent render, even when the rendered text is unchanged. Empty, `null`, or `false` clears the region and announces nothing. |
| `politeness` | `'polite' \| 'assertive'` | no | How urgently the region interrupts. - `'polite'` (default) — `role="status"` + `aria-live="polite"`. Waits for the screen reader to finish its current utterance. Use for routine outcomes: saves, copy confirmations, background updates. - `'assertive'` — `role="alert"` + `aria-live="assertive"`. Interrupts immediately. Reserve for errors that need immediate attention. Change politeness in the SAME render as the message (`politeness={error ? 'assertive' : 'polite'}` next to `{error ?? status}`): the role only flips while the region is empty, so the old text is never announced at the new urgency. A politeness-only change re-announces the current text at the new urgency. |
| `announceKey` | `string \| number` | no | Change this (e.g. a counter) to announce the same message again. Without it, re-rendering with identical text is a no-op — screen readers only announce a live region on a text change. |
| …native | | | plus native `<span>` attributes |

<!-- props:end -->

- **Always mount it unconditionally** — it clears then rewrites its text ~50ms later on mount and on every change, so the empty → text transition is what triggers the announcement. A conditionally-mounted region won't announce reliably. Messages changing faster than every ~50ms keep restarting that delay — only the last one of the burst is announced.
- Props type omits `role` / `aria-live` / `aria-atomic` / `hidden` / `aria-hidden` — it spreads the rest of `HTMLAttributes<HTMLSpanElement>` FIRST so those can't be overridden.

**When NOT to use:** don't wrap a library component that already owns its own transient-state region (see [Transient state and screen readers](../transient-state.md)) — two regions announcing one event talk over each other. Don't announce text that's already visible and focused — the user hears it twice. Don't reach for `assertive` for routine success. Prefer a string child over JSX — element children re-announce on every parent render even when the rendered text is unchanged.

- ❌ Placing it inside a `<label>` or a `<button>` — inside a `<label>` it joins the control's accessible name via name-from-content; inside a `<button>` it is pruned as children-presentational. Render it as a sibling instead.
- ❌ Mounting it conditionally (`{msg && <LiveRegion>…}`) — keep it mounted and pass an empty message.
