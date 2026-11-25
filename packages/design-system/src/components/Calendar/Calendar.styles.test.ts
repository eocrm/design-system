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

// DS-88: per-day action in non-month views on coarse pointers.
describe('dayAction touch behaviour', () => {
  const read = (f: string) => readFileSync(resolve(__dirname, f), 'utf8');
  it('week header action is hidden under pointer: coarse', () => {
    const scss = read('WeekView.module.scss');
    expect(scss).toMatch(
      /@media \(pointer: coarse\)\s*\{[^}]*\.headerAction\s*\{[^}]*display:\s*none/,
    );
  });
  it('day and agenda actions take touch-hit-area', () => {
    for (const [f, cls] of [
      ['DayView.module.scss', 'headerAction'],
      ['AgendaView.module.scss', 'dayAction'],
    ]) {
      const block = read(f).match(new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
      expect(block).toMatch(/@include touch-hit-area/);
    }
  });
});
