import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// DS-90: a bottom-aligned root left a short endContent button sitting below the
// tab labels. The root now stretches both children: endContent centres its
// controls, and the scroll region pins the tablist to its bottom edge so the
// border tracks still meet. Geometry checked in the playground; this pins it.
it('Tabs endContent centres on the strip; the tablist stays bottom-pinned', () => {
  const scss = readFileSync(resolve(__dirname, 'Tabs.module.scss'), 'utf8');
  const root = scss.match(/\n\.root\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
  expect(root).toMatch(/\n {2}align-items:\s*stretch/);
  expect(root).toMatch(/\.scrollWrap\s*\{[^}]*justify-content:\s*flex-end/);
  const endContent = scss.match(/\n\.endContent\s*\{([^}]*)\}/)?.[1] ?? '';
  expect(endContent).toMatch(/align-items:\s*center/);
});
