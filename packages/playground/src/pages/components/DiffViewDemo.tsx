import { DiffView, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const DIFF = `@@ -12,6 +12,8 @@ Contact
 first_name: Ana
 last_name: Kovač
-email: ana@northwind.io
-phone: +385 91 000 0000
+email: ana.kovac@northwind.io
+phone: +385 91 123 4567
+tags: vip, newsletter
 owner: Marko Horvat
 stage: Lead
@@ -40,3 +42,3 @@ Notes
 Last contacted: 2026-10-02
-Next step: send proposal
+Next step: schedule demo call
 Source: website form`;

const LONG = `@@ -1,3 +1,3 @@
 id: c_8f2k1
-notes: Met at the Zagreb retail summit and agreed to a follow-up once the pricing review is finished, then introduce the regional manager and share the case studies from last quarter.
+notes: Met at the Zagreb retail summit and agreed to a follow-up once the pricing review is finished, then introduce the regional manager and share the updated case studies from this quarter.
 status: active`;

const MANY = `@@ -1,10 +1,10 @@
${Array.from({ length: 10 }, (_, i) =>
  i % 3 === 1 ? `-field_${i}: old ${i}\n+field_${i}: new ${i}` : ` field_${i}: value ${i}`,
).join('\n')}`;

export function DiffViewDemo() {
  return (
    <DemoLayout
      name="DiffView"
      componentName="DiffView"
      description="Read-only unified text diff with added/removed tinting, line numbers and a fixed header. Feed it the output of git diff or a backend diff."
      files={getComponentFiles('DiffView')}
    >
      <Example
        title="Default"
        description="Labelled header, line numbers from the hunk ranges."
        code={`<DiffView fromLabel="Version 3" toLabel="Version 4" diff={DIFF} />`}
      >
        <DiffView fromLabel="Version 3" toLabel="Version 4" diff={DIFF} />
      </Example>

      <Example title="Without line numbers" code={`<DiffView diff={DIFF} lineNumbers={false} />`}>
        <DiffView diff={DIFF} lineNumbers={false} />
      </Example>

      <Example
        title="Long lines"
        description="wrap (default) breaks long lines; wrap={false} keeps one row per line and scrolls horizontally."
        code={`<DiffView diff={LONG} />
<DiffView diff={LONG} wrap={false} />`}
      >
        <Stack gap="md">
          <DiffView diff={LONG} />
          <DiffView diff={LONG} wrap={false} />
        </Stack>
      </Example>

      <Example
        title="maxHeight"
        description="The header stays fixed while the diff scrolls."
        code={`<DiffView fromLabel="Version 3" toLabel="Version 4" diff={MANY} maxHeight="xs" />`}
      >
        <DiffView fromLabel="Version 3" toLabel="Version 4" diff={MANY} maxHeight="xs" />
      </Example>

      <Example title="Empty" code={`<DiffView diff="" />`}>
        <DiffView diff="" />
      </Example>
    </DemoLayout>
  );
}
