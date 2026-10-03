# `<LiveRegion>` — announcement region for consumer-level outcomes

```tsx
<LiveRegion>{status}</LiveRegion>
<LiveRegion politeness="assertive">{error}</LiveRegion>
<LiveRegion announceKey={saveCount}>{t('saved')}</LiveRegion>
```

- `children?: ReactNode` — the message. Pass a string/number, or an array of only strings/numbers (compares by value). Anything else (JSX) compares by identity and re-announces on every parent render. Empty / `null` / `false` clears the region and announces nothing.
- `politeness?: 'polite' | 'assertive'` — default `'polite'` (`role="status"`, waits its turn). `'assertive'` (`role="alert"`) interrupts immediately — reserve for errors. Both set `aria-atomic="true"`. Change politeness in the SAME render as the message (`politeness={error ? 'assertive' : 'polite'}`) — the role only flips while the region is empty, so old text is never announced as an alert. A politeness-only change re-announces the current text at the new urgency.
- `announceKey?: string | number` — change it to re-announce an identical message (e.g. repeat "Saved" on every Save click).
- **Always mount it unconditionally** — it clears then rewrites its text ~50ms later on mount and on every change, so the empty → text transition is what triggers the announcement. A conditionally-mounted region won't announce reliably. Messages changing faster than every ~50ms keep restarting that delay — only the last one of the burst is announced.
- Props type omits `role` / `aria-live` / `aria-atomic` / `hidden` / `aria-hidden` — it spreads the rest of `HTMLAttributes<HTMLSpanElement>` FIRST so those can't be overridden.

**When NOT to use:** don't wrap a library component that already owns its own transient-state region (see "Transient state and screen readers" below) — two regions announcing one event talk over each other. Don't announce text that's already visible and focused — the user hears it twice. Don't reach for `assertive` for routine success. Prefer a string child over JSX — element children re-announce on every parent render even when the rendered text is unchanged.
