import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Stack, LiquidEditor, Button, type LiquidVariable } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const VARS: LiquidVariable[] = [
  { code: 'first_name', label: 'First name', type: 'text', group: 'Built-in fields' },
  { code: 'last_name', label: 'Last name', type: 'text', group: 'Built-in fields' },
  { code: 'email', label: 'Email', type: 'text', group: 'Built-in fields' },
  { code: 'job_title', label: 'Job title', type: 'text', group: 'Custom fields' },
  { code: 'join_date', label: 'Join date', type: 'date', group: 'Custom fields' },
];

// Stand-in for a backend render so the demo exercises the real preview contract.
function fakeRender(template: string): string {
  const data: Record<string, string> = {
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    job_title: 'Engineer',
    join_date: '2024-01-12',
  };
  return template.replace(/\{\{\s*(\w+)(\s*\|\s*upcase)?\s*\}\}/g, (_m, code, up) => {
    const v = data[code] ?? '';
    return up ? v.toUpperCase() : v;
  });
}

export function LiquidEditorDemo() {
  const [formula, setFormula] = useState('{{ first_name }} {{ last_name | upcase }}');
  const [withTypo, setWithTypo] = useState('{{ first_naem }}');

  return (
    <DemoLayout
      name="LiquidEditor"
      componentName="LiquidEditor"
      description="Liquid template editor — highlighting, line numbers, a variable-insert menu, caret autocomplete, unknown-variable flagging, and a controlled preview pane."
      files={getComponentFiles('LiquidEditor')}
    >
      <Example
        title="With variables + live preview"
        description="Type {{ to autocomplete a variable; add | to autocomplete a filter. The preview is consumer-rendered (here a stand-in for a backend call)."
        code={`<LiquidEditor
  value={formula}
  onChange={setFormula}
  variables={VARS}
  preview={fakeRender(formula)}
/>`}
      >
        <LiquidEditor
          value={formula}
          onChange={setFormula}
          variables={VARS}
          preview={fakeRender(formula)}
        />
      </Example>

      <Example
        title="Custom toolbar actions"
        description='Pass toolbarActions to add buttons (e.g. a Docs link) right-aligned in the toolbar, just before the bordered "Insert variable" button.'
        code={`<LiquidEditor
  value={formula}
  onChange={setFormula}
  variables={VARS}
  toolbarActions={
    <Button variant="ghost" size="sm">
      <BookOpen size={14} />
      Docs
    </Button>
  }
/>`}
      >
        <LiquidEditor
          value={formula}
          onChange={setFormula}
          variables={VARS}
          toolbarActions={
            <Button variant="ghost" size="sm">
              <BookOpen size={14} />
              Docs
            </Button>
          }
        />
      </Example>

      <Example
        title="Unknown-variable flagging"
        description="A {{ variable }} not in the provided list is underlined and named in the footer."
        code={`<LiquidEditor value={value} onChange={setValue} variables={VARS} />`}
      >
        <LiquidEditor value={withTypo} onChange={setWithTypo} variables={VARS} />
      </Example>

      <Example
        title="External (backend) syntax error"
        description="invalid + error surface a backend Liquid parse error; independent of client unknown-variable flags."
        code={`<LiquidEditor value={value} onChange={setValue} invalid error="Unexpected end of template" />`}
      >
        <LiquidEditor
          value="{{ first_name "
          onChange={() => {}}
          variables={VARS}
          invalid
          error="Unexpected end of template"
        />
      </Example>

      <Example
        title="Read-only"
        description="Selection allowed, edits blocked; highlighting + preview still render."
        code={`<LiquidEditor value={value} onChange={() => {}} variables={VARS} readOnly />`}
      >
        <Stack gap="sm">
          <LiquidEditor
            value="{{ first_name }} — {{ job_title }}"
            onChange={() => {}}
            variables={VARS}
            readOnly
          />
        </Stack>
      </Example>
    </DemoLayout>
  );
}
