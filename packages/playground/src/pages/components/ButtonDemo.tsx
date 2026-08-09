import { useEffect, useRef, useState } from 'react';
import { Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { Button, Cluster } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

function SaveWithSuccessFlash() {
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleClick = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaved(true);
    timerRef.current = setTimeout(() => setSaved(false), 1500);
  };

  return (
    <Cluster gap="sm">
      <Button variant={saved ? 'success' : 'primary'} onClick={handleClick}>
        {saved ? (
          <>
            <Check size={14} /> Saved!
          </>
        ) : (
          'Save'
        )}
      </Button>
    </Cluster>
  );
}

function AppliedFilters() {
  const [statusApplied, setStatusApplied] = useState(true);
  const [ownerApplied, setOwnerApplied] = useState(false);

  return (
    <Cluster gap="sm">
      <Button
        variant="secondary"
        selected={statusApplied}
        aria-pressed={statusApplied}
        onClick={() => setStatusApplied((value) => !value)}
      >
        Status: Active
      </Button>
      <Button
        variant="ghost"
        selected={ownerApplied}
        aria-pressed={ownerApplied}
        onClick={() => setOwnerApplied((value) => !value)}
      >
        Owner: Alex Rivera
      </Button>
    </Cluster>
  );
}

export function ButtonDemo() {
  return (
    <DemoLayout
      name="Button"
      description="Renders a <button>. The action element you reach for first — submit a form, open a modal, delete a row, navigate within the app."
      files={getComponentFiles('Button')}
      componentName="Button"
    >
      <Example
        title="Variants"
        description="Five visual variants. Use primary for the page's main action, secondary for supporting actions, ghost for tertiary actions in dense UIs, danger for destructive operations. The success variant is a transient confirmation state — see the next example."
        code={`import { Button, Cluster } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="sm">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="success">Success</Button>
    </Cluster>
  );
}`}
      >
        <Cluster gap="sm">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="success">Success</Button>
        </Cluster>
      </Example>

      <Example
        title="Success flash (transient confirmation)"
        description="Use the success variant for ~1.5s after an action resolves, then flip back. The timer lives in the consumer, not in Button — this keeps Button stateless and lets you pick any duration. Click Save to try it."
        code={`import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Button, Cluster } from '@eocrm/design-system';

export function SaveWithSuccessFlash() {
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleClick = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSaved(true);
    timerRef.current = setTimeout(() => setSaved(false), 1500);
  };

  return (
    <Cluster gap="sm">
      <Button variant={saved ? 'success' : 'primary'} onClick={handleClick}>
        {saved ? (
          <>
            <Check size={14} /> Saved!
          </>
        ) : (
          'Save'
        )}
      </Button>
    </Cluster>
  );
}`}
      >
        <SaveWithSuccessFlash />
      </Example>

      <Example
        title="Applied filters (persistent state)"
        description="Use selected for durable applied-value paint on secondary and ghost Buttons. It is visual only; these examples also pass aria-pressed because clicking each Button directly toggles its state. Menu and disclosure triggers keep their own semantics. For transient success feedback use the success variant; for mutually exclusive choices use ButtonGroup."
        code={`import { useState } from 'react';
import { Button, Cluster } from '@eocrm/design-system';

export function AppliedFilters() {
  const [statusApplied, setStatusApplied] = useState(true);
  const [ownerApplied, setOwnerApplied] = useState(false);

  return (
    <Cluster gap="sm">
      <Button
        variant="secondary"
        selected={statusApplied}
        aria-pressed={statusApplied}
        onClick={() => setStatusApplied((value) => !value)}
      >
        Status: Active
      </Button>
      <Button
        variant="ghost"
        selected={ownerApplied}
        aria-pressed={ownerApplied}
        onClick={() => setOwnerApplied((value) => !value)}
      >
        Owner: Alex Rivera
      </Button>
    </Cluster>
  );
}`}
      >
        <AppliedFilters />
      </Example>

      <Example
        title="Sizes"
        description="Four sizes. xs for icon-only or very dense inline actions, sm for dense toolbars/tables, md (default) for most contexts, lg for emphasis."
        code={`import { Button, Cluster } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="sm" align="center">
      <Button size="xs">Extra small</Button>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </Cluster>
  );
}`}
      >
        <Cluster gap="sm" align="center">
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </Cluster>
      </Example>

      <Example
        title="Icon-only (square)"
        description="Pass iconOnly for a square shape that tracks the size's height — 20×20 at xs, 32×32 at md. Always pair iconOnly with aria-label."
        code={`import { Pencil, Search, X } from 'lucide-react';
import { Button, Cluster } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="sm" align="center">
      <Button size="xs" variant="ghost" iconOnly aria-label="Remove">
        <X size={12} />
      </Button>
      <Button size="xs" variant="secondary" iconOnly aria-label="Edit">
        <Pencil size={12} />
      </Button>
      <Button size="md" variant="secondary" iconOnly aria-label="Search">
        <Search size={16} />
      </Button>
    </Cluster>
  );
}`}
      >
        <Cluster gap="sm" align="center">
          <Button size="xs" variant="ghost" iconOnly aria-label="Remove">
            <X size={12} />
          </Button>
          <Button size="xs" variant="secondary" iconOnly aria-label="Edit">
            <Pencil size={12} />
          </Button>
          <Button size="md" variant="secondary" iconOnly aria-label="Search">
            <Search size={16} />
          </Button>
        </Cluster>
      </Example>

      <Example
        title="With icons"
        description="Pass icons (from lucide-react or any source) as children. The button handles spacing via gap."
        code={`import { Plus, Search, Trash2 } from 'lucide-react';
import { Button, Cluster } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="sm">
      <Button>
        <Plus size={14} /> Add contact
      </Button>
      <Button variant="secondary">
        <Search size={14} /> Search
      </Button>
      <Button variant="danger">
        <Trash2 size={14} /> Delete
      </Button>
    </Cluster>
  );
}`}
      >
        <Cluster gap="sm">
          <Button>
            <Plus size={14} /> Add contact
          </Button>
          <Button variant="secondary">
            <Search size={14} /> Search
          </Button>
          <Button variant="danger">
            <Trash2 size={14} /> Delete
          </Button>
        </Cluster>
      </Example>

      <Example
        title="Disabled"
        description="Native disabled attribute. Visually muted, pointer-events disabled."
        code={`import { X } from 'lucide-react';
import { Button, Cluster } from '@eocrm/design-system';

export function Demo() {
  return (
    <Cluster gap="sm" align="center">
      <Button disabled>Primary</Button>
      <Button variant="secondary" disabled>
        Secondary
      </Button>
      <Button variant="danger" disabled>
        Danger
      </Button>
      <Button size="xs" variant="ghost" iconOnly disabled aria-label="Remove">
        <X size={12} />
      </Button>
    </Cluster>
  );
}`}
      >
        <Cluster gap="sm" align="center">
          <Button disabled>Primary</Button>
          <Button variant="secondary" disabled>
            Secondary
          </Button>
          <Button variant="danger" disabled>
            Danger
          </Button>
          <Button size="xs" variant="ghost" iconOnly disabled aria-label="Remove">
            <X size={12} />
          </Button>
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
