import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// DS-89: a child's min-content (a truncated / nowrap run) must not widen the
// main track past the viewport. minmax(0, …) also zeroes the grid item's
// automatic minimum, so a width: 100% child clips. Geometry checked in the
// playground at 375px; this pins the rule that makes it happen.
it('the Screen main track has a zero minimum', () => {
  const scss = readFileSync(resolve(__dirname, 'Screen.module.scss'), 'utf8');
  const main = scss.match(/\n\.main\s*\{([^}]*)\}/)?.[1] ?? '';
  expect(main).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});
