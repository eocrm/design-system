import { useEffect, useRef, useState } from 'react';
import { Check, Plus, Search, Trash2 } from 'lucide-react';
import { Button, Cluster } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import tsxSource from '@lib-source/components/Button/Button.tsx?raw';
import scssSource from '@lib-source/components/Button/Button.module.scss?raw';

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

export function ButtonDemo() {
  return (
    <DemoLayout
      name="Button"
      description="Renders a <button>. The action element you reach for first — submit a form, open a modal, delete a row, navigate within the app."
      tsxSource={tsxSource}
      scssSource={scssSource}
      tsxFilename="Button.tsx"
      scssFilename="Button.module.scss"
      componentName="Button"
    >
      <Example
        title="Variants"
        description="Five visual variants. Use primary for the page's main action, secondary for supporting actions, ghost for tertiary actions in dense UIs, danger for destructive operations. The success variant is a transient confirmation state — see the next example."
        code={`<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>
<Button variant="success">Success</Button>`}
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
        code={`function SaveWithSuccessFlash() {
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
        {saved ? <><Check size={14} /> Saved!</> : 'Save'}
      </Button>
    </Cluster>
  );
}`}
      >
        <SaveWithSuccessFlash />
      </Example>

      <Example
        title="Sizes"
        description="Three sizes. sm for dense toolbars/tables, md (default) for most contexts, lg for emphasis."
        code={`<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>`}
      >
        <Cluster gap="sm" align="center">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </Cluster>
      </Example>

      <Example
        title="With icons"
        description="Pass icons (from lucide-react or any source) as children. The button handles spacing via gap."
        code={`<Button><Plus size={14} /> Add contact</Button>
<Button variant="secondary"><Search size={14} /> Search</Button>
<Button variant="danger"><Trash2 size={14} /> Delete</Button>`}
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
        code={`<Button disabled>Primary</Button>
<Button variant="secondary" disabled>Secondary</Button>`}
      >
        <Cluster gap="sm">
          <Button disabled>Primary</Button>
          <Button variant="secondary" disabled>
            Secondary
          </Button>
          <Button variant="danger" disabled>
            Danger
          </Button>
        </Cluster>
      </Example>
    </DemoLayout>
  );
}
