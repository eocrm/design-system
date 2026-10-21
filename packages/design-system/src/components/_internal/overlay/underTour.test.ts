import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// #685: each elevated floating surface drops just under the tour scrim when
// the tour's current target is inside its panel.
const SURFACES: Array<[string, string]> = [
  ['DropdownMenu/DropdownMenu', '.content'],
  ['Popover/Popover', '.content'],
  ['Select/Select', '.listbox'],
  ['DatePicker/DatePicker', '.popover'],
  ['DateRangePicker/DateRangePicker', '.popover'],
  ['TimeField/TimeField', '.timePopover'],
  ['Rail/Rail', '.flyout'],
  ['TopBar/TopBar', '.results'],
];

describe('surfaces holding the tour target sit under the scrim (#685)', () => {
  it.each(SURFACES)('%s', (file, sel) => {
    const css = readFileSync(resolve(__dirname, `../../${file}.module.scss`), 'utf8');
    const esc = sel.replace('.', '\\.');
    const re = new RegExp(
      `${esc}\\[data-in-overlay\\]:has\\(\\[data-tour-current-target\\]\\)\\s*\\{[^}]*z-index:\\s*calc\\(var\\(--z-tour\\)\\s*-\\s*1\\)`,
    );
    expect(css).toMatch(re);
  });
});
