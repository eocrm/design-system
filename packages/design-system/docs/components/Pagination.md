# `<Pagination>` — numbered nav with windowing

```tsx
const [page, setPage] = useState(1);
<Pagination currentPage={page} pageCount={20} onPageChange={setPage} />;
```

- Controlled-only — consumer owns `currentPage`. No internal state.
- Sibling windowing — `siblingCount` (default `1`) controls how many pages on each side of current. Boundary fixed at 1 (first + last always shown). Slot count stays constant once ellipses kick in (`siblingCount * 2 + 5`) — the row's width doesn't jump as the user clicks.
- Current page stays focusable and carries `aria-current="page"`; activating it is a no-op. Keeping it enabled preserves keyboard focus when controlled `currentPage` updates after a page change.
- Sizes: `'sm'` (24px) / `'md'` (32px, default) / `'lg'` (40px) — tracks the Button / Input scale so Pagination sits cleanly next to a `<Button>` in a Cluster.
- Out-of-range `currentPage` / `pageCount` clamp at render time (defensive — same precedent as `<EmptyState>`'s `clampHeading`).
- **Not bundled**: page-size selector, count caption ("Showing 11–20 of 240"). Compose those with `<Select>` and text — keeps Pagination focused on navigation. `<DataTable>` (coming) owns its own footer.
- For streams without a total → use `<CursorPagination>`.
- For "load more" → use `<Button>` directly. **`<Button>` has no `loading` prop** — this line used to show one. Use `aria-disabled` and guard the handler, keeping the label stable: `<Button onClick={() => !isLoading && loadMore()} aria-disabled={isLoading || undefined}>Load more</Button>`. Native `disabled` would drop the button out of the tab order mid-interaction, and swapping the label renames a control the user just activated — see [Transient state and screen readers](../../AI-PRIMER.md#transient-state-and-screen-readers).
- `paginationRange(currentPage, pageCount, siblingCount)` is exported as a pure utility for advanced consumers that want to compute the same item list themselves (e.g., to render a custom layout with the same windowing).
