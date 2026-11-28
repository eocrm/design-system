import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// DS-104: the language picker sits in a strip reserved at the top of every
// editable code block — permanent, so it never covers text and the layout never
// jumps as the caret enters/leaves. Strip = picker offset (space-1) + Select sm
// height + the same gap below. Geometry checked in the playground; this pins it.
it('editable code blocks reserve a top strip for the language picker', () => {
  const scss = readFileSync(resolve(__dirname, 'RichTextEditor.module.scss'), 'utf8');
  const rule = scss.match(/\n\.root:not\(\.readOnly\) pre\s*\{([^}]*)\}/)?.[1] ?? '';
  expect(rule).toMatch(/padding-block-start:\s*calc\(var\(--size-sm\) \+ 2 \* var\(--space-1\)\)/);
});
