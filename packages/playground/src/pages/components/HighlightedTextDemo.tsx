import { HighlightedText, Stack, Text } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const EXCERPT =
  'Customer reports the invoice PDF is blank after export. Re-sending the invoice from the billing page did not help; the export works for other tenants.';

export function HighlightedTextDemo() {
  return (
    <DemoLayout
      name="HighlightedText"
      description="Text with matched runs wrapped in <mark> — for search-result excerpts. Takes Text's props plus text and ranges (UTF-16 offsets)."
      files={getComponentFiles('HighlightedText')}
      componentName="HighlightedText"
    >
      <Example
        title="Search result excerpt"
        description="The typical shape: a title, then a muted, clamped excerpt with the API's match ranges highlighted."
        code={`import { HighlightedText, Stack, Text } from '@eocrm/design-system';

export function Demo() {
  return (
    <Stack gap="xs">
      <Text weight="semibold">Ticket #4821 — Blank PDF on export</Text>
      <HighlightedText
        text={excerpt}
        ranges={[
          { start: 21, length: 7 },
          { start: 71, length: 7 },
        ]}
        size="sm"
        tone="muted"
        lineClamp={2}
      />
    </Stack>
  );
}`}
      >
        <Stack gap="xs">
          <Text weight="semibold">Ticket #4821 — Blank PDF on export</Text>
          <HighlightedText
            text={EXCERPT}
            ranges={[
              { start: 21, length: 7 },
              { start: 71, length: 7 },
            ]}
            size="sm"
            tone="muted"
            lineClamp={2}
          />
        </Stack>
      </Example>

      <Example
        title="Forgiving ranges"
        description="Unsorted, overlapping and out-of-range ranges are merged and clamped — no pre-processing needed."
        code={`<HighlightedText
  text="export works for other tenants"
  ranges={[
    { start: 23, length: 99 },
    { start: 0, length: 4 },
    { start: 2, length: 4 },
  ]}
/>`}
      >
        <HighlightedText
          text="export works for other tenants"
          ranges={[
            { start: 23, length: 99 },
            { start: 0, length: 4 },
            { start: 2, length: 4 },
          ]}
        />
      </Example>

      <Example
        title="Tones and sizes"
        description="Matched runs always use full-strength foreground on the mark (muted / danger fail contrast on the dark-theme yellow); the rest keeps the tone."
        code={`<Stack gap="xs">
  <HighlightedText text="Default tone, md" ranges={[{ start: 0, length: 7 }]} />
  <HighlightedText text="Muted tone, sm" ranges={[{ start: 0, length: 5 }]} tone="muted" size="sm" />
  <HighlightedText text="Danger tone, xs" ranges={[{ start: 0, length: 6 }]} tone="danger" size="xs" />
</Stack>`}
      >
        <Stack gap="xs">
          <HighlightedText text="Default tone, md" ranges={[{ start: 0, length: 7 }]} />
          <HighlightedText
            text="Muted tone, sm"
            ranges={[{ start: 0, length: 5 }]}
            tone="muted"
            size="sm"
          />
          <HighlightedText
            text="Danger tone, xs"
            ranges={[{ start: 0, length: 6 }]}
            tone="danger"
            size="xs"
          />
        </Stack>
      </Example>
    </DemoLayout>
  );
}
