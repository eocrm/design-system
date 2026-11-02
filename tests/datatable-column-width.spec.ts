import { test, expect } from '@playwright/test';

/**
 * #733: `table-layout: fixed; width: max-content` took the DataTable's width
 * from cell content, so one long nowrap cell (or a wide Badge) widened its
 * column far past `ColumnDef.size`. Injects a ~1,500-char link plus a long
 * inline-block "badge" inside a nested flex block into one body cell, then
 * checks every header cell still renders at its declared `<col>` width when
 * the table is wider than its wrap, and that the table does not outgrow a
 * wider wrap.
 */
test('DataTable column sizes stay authoritative over long cell content (#733)', async ({
  page,
}) => {
  await page.goto('/components/datatable');
  const table = page.locator('table[style*="--data-table-width"]').first();
  await expect(table).toBeVisible();

  const result = await table.evaluate(async (t) => {
    const frame = () => new Promise((r) => requestAnimationFrame(r));
    const wrap = t.parentElement!;
    const declared = [...t.querySelectorAll('col')].map((c) => parseFloat(c.style.width));
    const sum = declared.reduce((a, b) => a + b, 0);
    const headerWidths = () =>
      [...t.querySelectorAll('thead th')].map((th) => th.getBoundingClientRect().width);

    const cell = t.querySelector('tbody tr td:nth-child(2)')!;
    cell.innerHTML =
      '<div style="display:flex;gap:8px"><a href="#">' +
      'x'.repeat(1500) +
      '</a><span style="display:inline-block;white-space:nowrap">' +
      'badge '.repeat(50) +
      '</span></div>';

    // Wider wrap: the table fills it and no more.
    wrap.style.width = `${sum + 200}px`;
    await frame();
    const wide = { table: t.getBoundingClientRect().width, wrap: wrap.clientWidth };

    // Narrower wrap: columns render at exactly their declared widths.
    wrap.style.width = `${Math.floor(sum / 2)}px`;
    await frame();
    return { declared, narrow: headerWidths(), wide };
  });

  expect(result.declared.length).toBeGreaterThan(1);
  expect(result.narrow).toHaveLength(result.declared.length);
  result.narrow.forEach((w, i) => expect(w).toBeCloseTo(result.declared[i]!, 0));
  expect(result.wide.table).toBeLessThanOrEqual(result.wide.wrap + 1);
});
