# `<CursorPagination>` — prev / next for streams without total

```tsx
<CursorPagination hasPrevious={hasPrev} hasNext={hasNext} onPrevious={loadPrev} onNext={loadNext} />

// Activity feed with reversed direction labels
<CursorPagination
  hasPrevious={hasNewer}
  hasNext={hasOlder}
  onPrevious={loadNewer}
  onNext={loadOlder}
  previousLabel="Newer"
  nextLabel="Older"
/>
```

<!-- props:start -->

## Props

<!-- prettier-ignore -->
| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `hasPrevious` | `boolean` | yes | — | Whether a previous page exists. When `false`, the previous button is rendered as `disabled` (layout stays stable; consumer doesn't have to conditionally hide it). |
| `hasNext` | `boolean` | yes | — | Whether a next page exists. |
| `onPrevious` | `() => void` | yes | — | Called when the user clicks previous (not fired when disabled). |
| `onNext` | `() => void` | yes | — | Called when the user clicks next (not fired when disabled). |
| `previousLabel` | `ReactNode` | no | — | Label for the previous button. Defaults to the i18n value at `pagination.previous` (`'Previous'` in English). Override for domain phrasing (`'Newer'` in a reverse-chronological feed). An EMPTY string counts as unset, not as an explicit blank: this label is the button's only name source (the chevron is `aria-hidden`), so an empty one would leave the button anonymous rather than merely unlabelled. |
| `nextLabel` | `ReactNode` | no | — | Label for the next button. Defaults to the i18n value at `pagination.next` (`'Next'` in English). An EMPTY string counts as unset, for the same reason as `previousLabel`. |
| `size` | `PaginationSize` | no | — | Visual size — `'sm'` / `'md'` (default) / `'lg'`. Shares the `<Pagination>` size scale so the two components match when used alongside each other. |
| `disabled` | `boolean` | no | — | When `true`, both buttons are disabled regardless of has-prev/-next. |
| `aria-label` | `string` | no | — | Accessible name for the wrapper `<nav>`. Defaults to the i18n value at `pagination.ariaLabel` (`'Pagination'` in English) when omitted OR empty — an empty string is not an explicit name, so it takes the default too. |
| …native | | | | plus native HTML attributes |

<!-- props:end -->

- Two-button prev / next nav for keyset-paginated streams (activity feeds, infinite scroll, cursor-based APIs). Controlled — consumer owns the cursor + `has-prev` / `has-next` flags.
- Buttons render as native `<button disabled>` when `hasPrevious` / `hasNext` is false — no layout shift; consumer doesn't have to conditionally hide them.
- `previousLabel` / `nextLabel` accept `ReactNode` — override for reverse-chronological feeds (`'Newer'` / `'Older'`).
- Shares the `<Pagination>` size scale (`sm` / `md` / `lg`).
- Use `<Pagination>` (numbered) when you have a known total page count. CursorPagination is for streams.

- A11y: the wrapper is `<nav aria-label="Pagination">` (overridable for disambiguation). Disabled buttons are native, so screen readers announce "dimmed" and skip them in Tab order.
- Use `<Pagination>` (numbered, with jump-to-page and progress indication) when you have a total page count.
