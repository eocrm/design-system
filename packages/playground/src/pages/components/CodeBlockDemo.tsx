import { CodeBlock, Stack, type CodeBlockSample } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const RESPONSE = `{
  "data": [
    { "id": "c_8f2k1", "first_name": "Ana", "email": "ana@northwind.io" }
  ],
  "meta": { "page": 1, "per_page": 25, "total": 1 }
}`;

const SAMPLES: CodeBlockSample[] = [
  {
    id: 'curl',
    label: 'cURL',
    language: 'bash',
    code: `curl https://acme.eocrm.io/api/v1/contacts \\
  -H "Authorization: Bearer $EOCRM_API_KEY"`,
  },
  {
    id: 'js',
    label: 'JavaScript',
    language: 'javascript',
    code: `const res = await fetch('https://acme.eocrm.io/api/v1/contacts', {
  headers: { Authorization: \`Bearer \${process.env.EOCRM_API_KEY}\` },
});
const { data } = await res.json();`,
  },
  {
    id: 'python',
    label: 'Python',
    language: 'python',
    code: `import os, requests

res = requests.get(
    "https://acme.eocrm.io/api/v1/contacts",
    headers={"Authorization": f"Bearer {os.environ['EOCRM_API_KEY']}"},
)
data = res.json()["data"]`,
  },
];

const LONG = JSON.stringify(
  {
    data: Array.from({ length: 12 }, (_, i) => ({
      id: `c_${i + 1}`,
      first_name: `Contact ${i + 1}`,
      email: `contact${i + 1}@example.com`,
    })),
  },
  null,
  2,
);

const LONG_CURL = `curl -X POST https://acme.eocrm.io/api/v1/contacts -H "Authorization: Bearer $EOCRM_API_KEY" -H "Content-Type: application/json" -d '{"first_name":"Ana","last_name":"Kovač","email":"ana@northwind.io"}'`;

const RUST = 'fn main() {\n    println!("hello");\n}';

const SNIPPET = `function greet(name) {
  const msg = 'Hello, ' + name;
  console.log(msg);
  return msg;
}`;

export function CodeBlockDemo() {
  return (
    <DemoLayout
      name="CodeBlock"
      componentName="CodeBlock"
      description="Highlighted, copyable code sample. One block, or tabbed samples whose language choice can be shared between blocks."
      files={getComponentFiles('CodeBlock')}
    >
      <Example
        title="Single block"
        description="A JSON response; the header shows the language and the copy button."
        code={`<CodeBlock language="json" code={RESPONSE} />`}
      >
        <CodeBlock language="json" code={RESPONSE} />
      </Example>

      <Example
        title="Multiple samples"
        description="Two or more samples render as tabs."
        code={`<CodeBlock samples={SAMPLES} />`}
      >
        <CodeBlock samples={SAMPLES} />
      </Example>

      <Example
        title="Shared syncKey"
        description="Blocks with the same syncKey switch together — pick Python in one and the other follows."
        code={`<CodeBlock samples={SAMPLES} syncKey="demo-lang" />
<CodeBlock samples={SAMPLES} syncKey="demo-lang" />`}
      >
        <Stack gap="md">
          <CodeBlock samples={SAMPLES} syncKey="demo-lang" />
          <CodeBlock samples={SAMPLES} syncKey="demo-lang" />
        </Stack>
      </Example>

      <Example
        title="maxHeight"
        description="The body scrolls inside the cap and stays keyboard-focusable."
        code={`<CodeBlock language="json" code={LONG} maxHeight="sm" />`}
      >
        <CodeBlock language="json" code={LONG} maxHeight="sm" />
      </Example>

      <Example
        title="highlightLines"
        description="Emphasises lines 2 and 4 (visual only)."
        code={`<CodeBlock language="javascript" code={SNIPPET} highlightLines={[2, [4, 4]]} />`}
      >
        <CodeBlock language="javascript" code={SNIPPET} highlightLines={[2, [4, 4]]} />
      </Example>

      <Example
        title="defaultWrap"
        description="Starts with long lines wrapped; the toggle in the header switches back."
        code={`<CodeBlock defaultWrap language="bash" code={LONG_CURL} />`}
      >
        <CodeBlock defaultWrap language="bash" code={LONG_CURL} />
      </Example>

      <Example
        title="Unknown language"
        description="A language outside the supported list renders as plain text."
        code={`<CodeBlock language="rust" code={RUST} />`}
      >
        <CodeBlock language="rust" code={RUST} />
      </Example>
    </DemoLayout>
  );
}
