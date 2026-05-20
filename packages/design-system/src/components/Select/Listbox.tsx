import { useSelectContext } from './context';

/**
 * Skeletal Listbox — inline (not portaled yet). Task 5 lifts this into a
 * portaled, Floating-UI-positioned panel with outside-click + Escape
 * dismissal. Phase 2 starts with the simplest possible rendering so the
 * Trigger + state plumbing can be exercised first.
 */
export function Listbox() {
  const ctx = useSelectContext('Listbox');
  return (
    <ul
      ref={ctx.listboxRef}
      id={ctx.listboxId}
      role="listbox"
      aria-multiselectable={ctx.multiple || undefined}
    >
      {ctx.rows.map((row, i) =>
        row.kind === 'header' ? (
          <li key={`h-${i}`} role="presentation">
            {row.label}
          </li>
        ) : (
          <li
            key={row.option.value}
            id={ctx.getOptionId(row.option.value)}
            role="option"
            aria-selected={
              ctx.multiple
                ? (ctx.value as string[]).includes(row.option.value)
                : ctx.value === row.option.value
            }
            aria-disabled={row.option.disabled || undefined}
          >
            {row.option.label}
          </li>
        ),
      )}
    </ul>
  );
}
