import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// DS-65: on a phone the toolbar controls must wrap under the period title, not
// squeeze it onto three lines and overflow the container. Geometry checked in
// the playground at 360px; this pins the rule that makes it happen.
it('the Calendar header wraps its controls under the title', () => {
  const scss = readFileSync(resolve(__dirname, 'Calendar.module.scss'), 'utf8');
  const header = scss.match(/\n\.header\s*\{([^}]*)\}/)?.[1] ?? '';
  expect(header).toMatch(/flex-wrap:\s*wrap/);
});
