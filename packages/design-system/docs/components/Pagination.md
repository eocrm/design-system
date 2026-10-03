# `<Pagination>` — numbered nav with windowing

```tsx
const [page, setPage] = useState(1);
<Pagination currentPage={page} pageCount={20} onPageChange={setPage} />;
```

<!-- props:start -->

## Props

| Prop           | Type                     | Required | Default | Description                                                                                                                                                                                                                                                                      |
| -------------- | ------------------------ | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `currentPage`  | `number`                 | yes      | —       | Current 1-indexed page. Values outside `[1, pageCount]` clamp at render time (defensive — same precedent as `clampHeading` in `<EmptyState>`).                                                                                                                                   |
| `pageCount`    | `number`                 | yes      | —       | Total number of pages. Values `< 1` clamp to `1`. The component still renders when `pageCount === 1` (single enabled current-page button + both prev/next disabled) so consumers don't have to conditionally hide it. The `disabled` prop still disables all three controls.     |
| `onPageChange` | `(page: number) => void` | yes      | —       | Called with the new 1-indexed page when the user clicks prev, next, or a page number. Not fired when the user clicks the current page.                                                                                                                                           |
| `siblingCount` | `number`                 | no       | —       | How many page-number buttons to show on each side of `currentPage`. Default `1`. Set to `0` for the tightest possible display (sidebar / narrow column) or `2` for wider footers. Boundary is fixed at 1 — first and last pages are always shown.                                |
| `size`         | `PaginationSize`         | no       | —       | Visual size — `'sm'` (24px), `'md'` (32px, default), `'lg'` (40px). Tracks the Button / Input scale so Pagination sits cleanly inside a `<Cluster>` next to those components.                                                                                                    |
| `disabled`     | `boolean`                | no       | —       | When `true`, all buttons (prev / next / numbers) are disabled. Use during page transitions (loading, saving) to prevent double-clicks.                                                                                                                                           |
| `aria-label`   | `string`                 | no       | —       | Accessible name for the `<nav>` wrapper. Defaults to `'Pagination'` when omitted OR empty — an empty string is not an explicit name, so it takes the default too. Override when multiple paginations appear on the same page (e.g., `'Top pagination'` / `'Bottom pagination'`). |
| …native        |                          |          |         | plus native HTML attributes                                                                                                                                                                                                                                                      |

<!-- props:end -->

- Controlled-only — consumer owns `currentPage`. No internal state.
- Sibling windowing — `siblingCount` (default `1`) controls how many pages on each side of current. Boundary fixed at 1 (first + last always shown). Slot count stays constant once ellipses kick in (`siblingCount * 2 + 5`) — the row's width doesn't jump as the user clicks.
- Current page stays focusable and carries `aria-current="page"`; activating it is a no-op. Keeping it enabled preserves keyboard focus when controlled `currentPage` updates after a page change.
- Sizes: `'sm'` (24px) / `'md'` (32px, default) / `'lg'` (40px) — tracks the Button / Input scale so Pagination sits cleanly next to a `<Button>` in a Cluster.
- Out-of-range `currentPage` / `pageCount` clamp at render time (defensive — same precedent as `<EmptyState>`'s `clampHeading`).
- **Not bundled**: page-size selector, count caption ("Showing 11–20 of 240"). Compose those with `<Select>` and text — keeps Pagination focused on navigation. `<DataTable>` (coming) owns its own footer.
- For streams without a total → use `<CursorPagination>`.
- For "load more" → use `<Button>` directly. **`<Button>` has no `loading` prop** — this line used to show one. Use `aria-disabled` and guard the handler, keeping the label stable: `<Button onClick={() => !isLoading && loadMore()} aria-disabled={isLoading || undefined}>Load more</Button>`. Native `disabled` would drop the button out of the tab order mid-interaction, and swapping the label renames a control the user just activated — see [Transient state and screen readers](../../AI-PRIMER.md#transient-state-and-screen-readers).
- `paginationRange(currentPage, pageCount, siblingCount)` is exported as a pure utility for advanced consumers that want to compute the same item list themselves (e.g., to render a custom layout with the same windowing).
