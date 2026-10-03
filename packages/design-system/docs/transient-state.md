# Transient state and screen readers

Which components announce their own transient state, and what you must not wrap.

Components in this library handle their own transient state (`loading`, `busy`, async failure). For the components that do, you do not need to wrap them in a live region — and you should not, because two regions announcing one event talk over each other. **But not every component does**: see Known gaps below, and check the component's own JSDoc before assuming.

For your OWN outcomes — a consumer-level event with no visible text of its own (e.g. "Authenticator app added") — reach for `<LiveRegion>` rather than hand-rolling a live region; see [`LiveRegion`](components/LiveRegion.md).

The rule the library follows, so you can predict any component:

- **State you meet by arriving** — an `EntityChip` placeholder you tab onto — is folded into the **accessible name**. Its name therefore _changes_ when the state resolves, so don't select those elements by exact name in tests while a placeholder can be on screen.
- **State that changes while you are elsewhere** — a `Switch` saving, a `DataTable` loading, a `PillMenu` committing, a `Select` resolving its async options, a `FileUpload` batch finishing, a `ConfirmationPopover` going pending — is announced from a **live region the component owns**. Names stay stable.
- **Purely visual state** — `Badge` tone, `Skeleton` — is yours to announce if it matters. These are documented as visual-only.
- **One deliberate exception to the noise rule.** `Textarea`'s character counter is an `aria-live="polite"` region that updates on every keystroke — the same per-keystroke announcing that was rejected for `Field`'s validation errors. It is kept because a counter is only useful while you are typing in the field it belongs to, where the user's attention already is, and because a remaining-characters count that arrives after you have run out is not a warning. If that trade is wrong for your form, `Textarea` takes `showCount={false}`. Noted here because the rule above would otherwise imply the library never announces per keystroke, and it does, once.
- **`Progress` / `CircularProgress`** carry `role="progressbar"`. A _determinate_ one exposes its value through `aria-valuenow`; an _indeterminate_ one has no `aria-valuenow` at all and puts its meaning in `aria-valuetext`, whose fallback is translated via `progress.indeterminate`. Don't wrap either — but do pass an `aria-label`, because that fallback is the only thing spoken if you don't.

**Form validation is yours to announce, and that is a decision, not a gap.** `Field` links its error with `aria-describedby`, which is read on focus — so an error appearing after a submit reaches nobody until focus arrives. A live region per `Field` would be worse: validate-on-change announces every keystroke, and a failed submit fires one announcement per field, over each other. The form knows how many failed and when the user asked; the field does not. Announce a summary on submit:

```tsx
<div role="status" aria-live="polite">
  {submitted && errorCount > 0 ? `${errorCount} fields need attention` : ''}
</div>
```

Known gaps: **none currently open**, with one boundary case worth stating. A fluid `Image`'s error tile is DISCOVERABLE but not announced: the failure is visible text in the accessible tree, reachable in browse mode, and the icon is named by `alt` alone. It is deliberately not folded into the name — that made a reader hear the sentence twice — and deliberately not a live region, because an image failing is not worth interrupting for. A fixed-`size` `Image` renders no text, so there the failure IS folded into the icon's name; still discoverable, still not announced. If your case needs it to interrupt, that announcement is yours. The three that stood here — `ConfirmationPopover` while pending, `FileUpload` per-file failure and its `pending` state, and `Select`'s async loading/error rows — all announce for themselves now, so do NOT wrap them. `FileUpload`'s `uploading` state still carries a `Progress` that is readable on focus rather than announced; don't wrap that either. Assume nothing about a component not named in **this list** — every component appears somewhere on this page, so the list, not the page, is the boundary. Check the component's own JSDoc. `Field`'s validation errors are covered above — documented behaviour, not an oversight.

One consequence for your tests: components that own a region expose `role="status"`, so `getByRole('status')` on a page containing a `Switch`, `PillMenu` or `DataTable` may now match more than one element. Scope the query, or select by the text you expect.

What this means for you:

```tsx
// ✅ First load of an empty table: the component announces it, and the
//    outcome ("Rows loaded" / "No rows loaded"). Nothing to add.
<DataTable instance={table} loading={isFetching} aria-label="Deals" />

// ⚠️ A refetch OVER rows that are already on screen is deliberately silent —
//    nothing changes visually, so a 30s poll shouldn't interrupt a reader.
//    This depends on rows STAYING on screen: if your fetch layer clears data
//    during a refetch (react-query v5 without `placeholderData: keepPreviousData`),
//    the skeleton returns and every poll announces — correctly, because the
//    screen really does change.

// ❌ Don't wrap the first-load case — your region and the component's
//    both fire for one event.
<div aria-live="polite">
  <DataTable instance={table} loading={isFetching} aria-label="Deals" />
</div>

// ✅ Skeleton is aria-hidden by design — this one IS yours to announce.
<div role="status" aria-live="polite">
  {isFetching ? 'Loading contacts…' : ''}
</div>
{isFetching ? <Skeleton variant="text" /> : <ContactList items={items} />}
```

`aria-busy` appears on several components for tooling and testing. **Do not rely on it to inform a user** — no mainstream screen reader speaks it on a non-live element, which is why the components above carry a live region as well.
