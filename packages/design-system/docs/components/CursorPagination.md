# `<CursorPagination>` — prev / next for streams without total

```tsx
<CursorPagination hasPrevious={hasPrev} hasNext={hasNext} onPrevious={loadPrev} onNext={loadNext} />
```

- Two-button prev / next nav for keyset-paginated streams (activity feeds, infinite scroll, cursor-based APIs). Controlled — consumer owns the cursor + `has-prev` / `has-next` flags.
- Buttons render as native `<button disabled>` when `hasPrevious` / `hasNext` is false — no layout shift; consumer doesn't have to conditionally hide them.
- `previousLabel` / `nextLabel` accept `ReactNode` — override for reverse-chronological feeds (`'Newer'` / `'Older'`).
- Shares the `<Pagination>` size scale (`sm` / `md` / `lg`).
- Use `<Pagination>` (numbered) when you have a known total page count. CursorPagination is for streams.
