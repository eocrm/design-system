import { useState } from 'react';
import {
  Button,
  Cluster,
  PillMenu,
  Stack,
  StagePath,
  type StagePathTone,
} from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

const DEAL = [
  { id: 'lead', label: 'Lead' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'negotiation', label: 'Negotiation' },
];

const PROJECT = [
  { id: 'planned', label: 'Planned' },
  { id: 'active', label: 'Active' },
  { id: 'review', label: 'Review' },
  { id: 'done', label: 'Done' },
];

export function StagePathDemo() {
  const [stage, setStage] = useState('proposal');
  const [tone, setTone] = useState<StagePathTone>('default');

  return (
    <DemoLayout
      name="StagePath"
      componentName="StagePath"
      description="Chevron row of a record's ordered stages: done, current, upcoming. Read-only by default; pass onValueChange to make the other stages clickable. tone recolours done + current for a won / lost outcome."
      files={getComponentFiles('StagePath')}
    >
      <Example
        title="Record header"
        description="Stage chip, the path and outcome actions in a non-wrapping Cluster; the path takes the remaining width. Click a stage to move; Won / Lost switch the tone."
        code={`const [stage, setStage] = useState('proposal');
const [tone, setTone] = useState<StagePathTone>('default');

<Cluster wrap={false}>
  <PillMenu label="pipeline" current={{ id: 'ent', name: 'Enterprise', color: 'slate' }} />
  <StagePath
    aria-label="Deal stage"
    stages={DEAL}
    value={stage}
    tone={tone}
    onValueChange={(id) => { setStage(id); setTone('default'); }}
  />
  <Button variant="success" onClick={() => setTone('success')}>Won</Button>
  <Button variant="danger-outline" onClick={() => setTone('danger')}>Lost</Button>
</Cluster>`}
      >
        <Cluster wrap={false}>
          <PillMenu label="pipeline" current={{ id: 'ent', name: 'Enterprise', color: 'slate' }} />
          <StagePath
            aria-label="Deal stage"
            stages={DEAL}
            value={stage}
            tone={tone}
            onValueChange={(id) => {
              setStage(id);
              setTone('default');
            }}
          />
          <Button variant="success" onClick={() => setTone('success')}>
            Won
          </Button>
          <Button variant="danger-outline" onClick={() => setTone('danger')}>
            Lost
          </Button>
        </Cluster>
      </Example>

      <Example
        title="Read-only"
        description="No onValueChange: no buttons, no hover. For list rows, previews, and users without permission to move the record."
        code={`<StagePath aria-label="Project stage" stages={PROJECT} value="done" />`}
      >
        <StagePath aria-label="Project stage" stages={PROJECT} value="done" />
      </Example>

      <Example
        title="Tones"
        description="default (in progress) / success (won) / danger (lost). Upcoming stages stay neutral."
        code={`<StagePath aria-label="Default tone" stages={DEAL} value="proposal" />
<StagePath aria-label="Success tone" stages={DEAL} value="proposal" tone="success" />
<StagePath aria-label="Danger tone" stages={DEAL} value="proposal" tone="danger" />`}
      >
        <Stack gap="sm">
          <StagePath aria-label="Default tone" stages={DEAL} value="proposal" />
          <StagePath aria-label="Success tone" stages={DEAL} value="proposal" tone="success" />
          <StagePath aria-label="Danger tone" stages={DEAL} value="proposal" tone="danger" />
        </Stack>
      </Example>

      <Example
        title="Narrow width"
        description="Stages share the width equally; labels ellipsize and show the full name in a tooltip on hover or keyboard focus."
        code={`<div style={{ maxWidth: 300 }}>
  <StagePath aria-label="Narrow" stages={DEAL} value="proposal" onValueChange={() => {}} />
</div>`}
      >
        <div style={{ maxWidth: 300 }}>
          <StagePath aria-label="Narrow" stages={DEAL} value="proposal" onValueChange={() => {}} />
        </div>
      </Example>

      <Example
        title="Right-to-left"
        description="Chevrons mirror under dir='rtl'."
        code={`<div dir="rtl"><StagePath aria-label="RTL" stages={DEAL} value="proposal" onValueChange={() => {}} /></div>`}
      >
        <div dir="rtl">
          <StagePath aria-label="RTL" stages={DEAL} value="proposal" onValueChange={() => {}} />
        </div>
      </Example>
    </DemoLayout>
  );
}
