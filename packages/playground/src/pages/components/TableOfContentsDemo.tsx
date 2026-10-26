import { useState } from 'react';
import { Split, Stack, Sticky, TableOfContents, Text, Title } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const SECTIONS = [
  { id: 'toc-overview', label: 'Overview', level: 2 },
  { id: 'toc-auth', label: 'Authentication', level: 2 },
  { id: 'toc-api-keys', label: 'API keys', level: 3 },
  { id: 'toc-scopes', label: 'Scopes', level: 3 },
  { id: 'toc-pagination', label: 'Pagination', level: 2 },
  { id: 'toc-errors', label: 'Errors', level: 2 },
  { id: 'toc-retries', label: 'Retries', level: 3 },
  { id: 'toc-webhooks', label: 'Webhooks', level: 2 },
] as const;

const FILLER = Array.from({ length: 4 }, (_, i) => i);

function Article() {
  return (
    <Stack gap="xl">
      {SECTIONS.map((s) => (
        <Stack key={s.id} gap="sm">
          <Title order={s.level} size={s.level === 2 ? 'lg' : 'md'} id={s.id}>
            {s.label}
          </Title>
          {FILLER.map((i) => (
            <Text key={i} tone="muted">
              {s.label} explained at length: requests are authenticated with a bearer token, lists
              are cursor-paginated, and failures return a stable error envelope with a machine
              readable code.
            </Text>
          ))}
        </Stack>
      ))}
    </Stack>
  );
}

function WithRail() {
  const [narrow, setNarrow] = useState(false);
  return (
    <Split
      side="end"
      asideWidth="200px"
      gap="2xl"
      align="stretch"
      collapseBelow="sm"
      onCollapsedChange={setNarrow}
      aside={
        narrow ? null : (
          <Sticky top="topbar">
            <TableOfContents items={SECTIONS} />
          </Sticky>
        )
      }
    >
      <Stack gap="xl">
        {narrow && <TableOfContents items={SECTIONS} collapsed />}
        <Article />
      </Stack>
    </Split>
  );
}

const RAIL_CODE = `const [narrow, setNarrow] = useState(false);

<Split
  side="end"
  collapseBelow="sm"
  onCollapsedChange={setNarrow}
  aside={narrow ? null : <Sticky top="topbar"><TableOfContents items={toc} /></Sticky>}
>
  {narrow && <TableOfContents items={toc} collapsed />}
  <article>{/* headings with matching ids */}</article>
</Split>`;

export function TableOfContentsDemo() {
  return (
    <DemoLayout
      name="TableOfContents"
      componentName="TableOfContents"
      description="In-page 'On this page' navigation: lists a long page's h2/h3 headings, highlights the one being read, and scrolls clear of the pinned top bar."
      files={getComponentFiles('TableOfContents')}
    >
      <Example
        title="Sticky rail beside a long article"
        description="Scroll the page: the highlight follows the heading in view. Once the demo column is narrower than the sm breakpoint the rail is replaced by the collapsed disclosure above the content, so only one TOC exists."
        code={RAIL_CODE}
      >
        <WithRail />
      </Example>

      <Example
        title="Collapsed"
        description="A disclosure for narrow layouts. The summary shows the active heading; choosing an entry closes it."
        code={`<TableOfContents items={toc} collapsed />`}
      >
        <TableOfContents items={SECTIONS} collapsed />
      </Example>

      <Example
        title="Item with a missing id"
        description="The entry renders but never becomes active, and clicking it falls back to the native jump (no top-bar offset). Keep ids in sync with the headings."
        code={`<TableOfContents items={[{ id: 'does-not-exist', label: 'Missing heading', level: 2 }]} />`}
      >
        <TableOfContents
          aria-label="On this page (missing id)"
          items={[{ id: 'does-not-exist', label: 'Missing heading', level: 2 }]}
        />
      </Example>
    </DemoLayout>
  );
}
