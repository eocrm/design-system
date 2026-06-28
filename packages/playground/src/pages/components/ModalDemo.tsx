import { useRef, useState } from 'react';
import { Badge, Button, Cluster, Input, Modal, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function ModalDemo() {
  return (
    <DemoLayout
      name="Modal"
      componentName="Modal"
      description="Focus-locked, scroll-locked dialog with a compound API (Header / Body / Footer / Close). Three size presets, solid + blur overlay variants, fullscreen on mobile. Stacked-modal support: overlay mode (default) keeps the parent visible; replace mode hides it."
      files={getComponentFiles('Modal')}
    >
      <BasicExample />
      <SizesExample />
      <OverlayVariantsExample />
      <FormExample />
      <ForcedStepExample />
      <StackedExample />
      <NoHeaderExample />
    </DemoLayout>
  );
}

function BasicExample() {
  const [open, setOpen] = useState(false);
  return (
    <Example
      title="Basic"
      description="Controlled open state. Header wires aria-labelledby automatically. Built-in × close button + Esc + overlay click all dismiss."
      code={`import { useState } from 'react';
import { Button, Cluster, Modal } from '@eocrm/design-system';

export function BasicExample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Cluster>
        <Button onClick={() => setOpen(true)}>Open modal</Button>
      </Cluster>
      <Modal open={open} onOpenChange={setOpen}>
        <Modal.Header>Hello</Modal.Header>
        <Modal.Body>This is a modal. Click outside, press Esc, or use the × to close.</Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="secondary">Cancel</Button>
          </Modal.Close>
          <Button onClick={() => setOpen(false)}>OK</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}`}
    >
      <Cluster>
        <Button onClick={() => setOpen(true)}>Open modal</Button>
      </Cluster>
      <Modal open={open} onOpenChange={setOpen}>
        <Modal.Header>Hello</Modal.Header>
        <Modal.Body>This is a modal. Click outside, press Esc, or use the × to close.</Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="secondary">Cancel</Button>
          </Modal.Close>
          <Button onClick={() => setOpen(false)}>OK</Button>
        </Modal.Footer>
      </Modal>
    </Example>
  );
}

function SizesExample() {
  const [openSize, setOpenSize] = useState<'sm' | 'md' | 'lg' | null>(null);
  return (
    <Example
      title="Sizes"
      description='`size="sm"` (400px) / `"md"` (560px, default) / `"lg"` (800px). Below 640px viewport width the modal goes fullscreen regardless.'
      code={`import { useState } from 'react';
import { Button, Cluster, Modal } from '@eocrm/design-system';

export function SizesExample() {
  const [openSize, setOpenSize] = useState<'sm' | 'md' | 'lg' | null>(null);
  return (
    <>
      <Cluster gap="sm">
        <Button variant="secondary" size="sm" onClick={() => setOpenSize('sm')}>
          Small
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setOpenSize('md')}>
          Medium
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setOpenSize('lg')}>
          Large
        </Button>
      </Cluster>
      <Modal
        open={openSize !== null}
        onOpenChange={(next) => !next && setOpenSize(null)}
        size={openSize ?? 'md'}
      >
        <Modal.Header>Size: {openSize ?? 'md'}</Modal.Header>
        <Modal.Body>The width is determined by the \`size\` prop.</Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button>Close</Button>
          </Modal.Close>
        </Modal.Footer>
      </Modal>
    </>
  );
}`}
    >
      <Cluster gap="sm">
        <Button variant="secondary" size="sm" onClick={() => setOpenSize('sm')}>
          Small
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setOpenSize('md')}>
          Medium
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setOpenSize('lg')}>
          Large
        </Button>
      </Cluster>
      <Modal
        open={openSize !== null}
        onOpenChange={(next) => !next && setOpenSize(null)}
        size={openSize ?? 'md'}
      >
        <Modal.Header>Size: {openSize ?? 'md'}</Modal.Header>
        <Modal.Body>The width is determined by the `size` prop.</Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button>Close</Button>
          </Modal.Close>
        </Modal.Footer>
      </Modal>
    </Example>
  );
}

function OverlayVariantsExample() {
  const [variant, setVariant] = useState<'solid' | 'blur' | null>(null);
  return (
    <Example
      title="Overlay variants"
      description='`overlay="solid"` (default) paints the standard dark dim. `overlay="blur"` paints a light frosted-glass effect (`backdrop-filter: blur(4px)`). Open both with rich content visible behind to compare.'
      code={`import { useState } from 'react';
import { Button, Cluster, Modal } from '@eocrm/design-system';

export function OverlayVariantsExample() {
  const [variant, setVariant] = useState<'solid' | 'blur' | null>(null);
  return (
    <>
      <Cluster gap="sm">
        <Button variant="secondary" size="sm" onClick={() => setVariant('solid')}>
          Solid overlay
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setVariant('blur')}>
          Blur overlay
        </Button>
      </Cluster>
      <Modal
        open={variant !== null}
        onOpenChange={(next) => !next && setVariant(null)}
        overlay={variant ?? 'solid'}
        size="sm"
      >
        <Modal.Header>{variant === 'blur' ? 'Frosted glass' : 'Solid dim'}</Modal.Header>
        <Modal.Body>
          {variant === 'blur'
            ? 'Backdrop is blurred. Try opening this on a page with rich content behind to see it best.'
            : 'Standard dark dimming. Default variant.'}
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button>Close</Button>
          </Modal.Close>
        </Modal.Footer>
      </Modal>
    </>
  );
}`}
    >
      <Cluster gap="sm">
        <Button variant="secondary" size="sm" onClick={() => setVariant('solid')}>
          Solid overlay
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setVariant('blur')}>
          Blur overlay
        </Button>
      </Cluster>
      <Modal
        open={variant !== null}
        onOpenChange={(next) => !next && setVariant(null)}
        overlay={variant ?? 'solid'}
        size="sm"
      >
        <Modal.Header>{variant === 'blur' ? 'Frosted glass' : 'Solid dim'}</Modal.Header>
        <Modal.Body>
          {variant === 'blur'
            ? 'Backdrop is blurred. Try opening this on a page with rich content behind to see it best.'
            : 'Standard dark dimming. Default variant.'}
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button>Close</Button>
          </Modal.Close>
        </Modal.Footer>
      </Modal>
    </Example>
  );
}

function FormExample() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('Acme Inc.');
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <Example
      title="Form modal with initial focus"
      description="Use `initialFocusRef` to focus the first input on open. Body content stays in a Stack."
      code={`import { useRef, useState } from 'react';
import { Button, Cluster, Input, Modal, Stack } from '@eocrm/design-system';

export function FormExample() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('Acme Inc.');
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <>
      <Cluster>
        <Button onClick={() => setOpen(true)}>Edit contact</Button>
      </Cluster>
      <Modal open={open} onOpenChange={setOpen} initialFocusRef={inputRef}>
        <Modal.Header>Edit contact</Modal.Header>
        <Modal.Body>
          <Stack gap="md">
            <label>
              Company name
              <Input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Inc."
              />
            </label>
            <label>
              Owner
              <Input placeholder="Sara" />
            </label>
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="secondary">Cancel</Button>
          </Modal.Close>
          <Button onClick={() => setOpen(false)}>Save</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}`}
    >
      <Cluster>
        <Button onClick={() => setOpen(true)}>Edit contact</Button>
      </Cluster>
      <Modal open={open} onOpenChange={setOpen} initialFocusRef={inputRef}>
        <Modal.Header>Edit contact</Modal.Header>
        <Modal.Body>
          <Stack gap="md">
            <label>
              Company name
              <Input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Inc."
              />
            </label>
            <label>
              Owner
              <Input placeholder="Sara" />
            </label>
          </Stack>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="secondary">Cancel</Button>
          </Modal.Close>
          <Button onClick={() => setOpen(false)}>Save</Button>
        </Modal.Footer>
      </Modal>
    </Example>
  );
}

function ForcedStepExample() {
  const [open, setOpen] = useState(false);
  return (
    <Example
      title="Forced step (non-dismissible)"
      description="`disableEscapeClose` + `dismissOnOverlayClick={false}` + `<Modal.Header closeButton={false}>` + no `<Modal.Close>` = the user can only resolve via the in-modal action."
      code={`import { useState } from 'react';
import { Button, Cluster, Modal } from '@eocrm/design-system';

export function ForcedStepExample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Cluster>
        <Button variant="danger" onClick={() => setOpen(true)}>
          Trigger forced step
        </Button>
      </Cluster>
      <Modal
        open={open}
        onOpenChange={() => {}}
        size="sm"
        disableEscapeClose
        dismissOnOverlayClick={false}
        aria-label="Session expired"
      >
        <Modal.Header closeButton={false}>Session expired</Modal.Header>
        <Modal.Body>
          This modal can&apos;t be dismissed via Esc or overlay click. Use the button below.
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setOpen(false)}>Sign in again</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}`}
    >
      <Cluster>
        <Button variant="danger" onClick={() => setOpen(true)}>
          Trigger forced step
        </Button>
      </Cluster>
      <Modal
        open={open}
        onOpenChange={() => {}}
        size="sm"
        disableEscapeClose
        dismissOnOverlayClick={false}
        aria-label="Session expired"
      >
        <Modal.Header closeButton={false}>Session expired</Modal.Header>
        <Modal.Body>
          This modal can&apos;t be dismissed via Esc or overlay click. Use the button below.
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setOpen(false)}>Sign in again</Button>
        </Modal.Footer>
      </Modal>
    </Example>
  );
}

function StackedExample() {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <Example
      title="Stacked modals (overlay mode — default)"
      description='Opening a modal from inside another stacks visually. With the default `stackMode="overlay"`, the parent stays visible underneath and the inner overlay is transparent — one effective dim layer for the whole stack, parent context stays in view. Use `stackMode="replace"` to hide the parent via `display: none` (React state preserved) — best for forced steps where parent context is irrelevant. Escape closes only the topmost; body scroll stays locked across the whole stack.'
      code={`import { useState } from 'react';
import { Badge, Button, Cluster, Input, Modal, Stack } from '@eocrm/design-system';

export function StackedExample() {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <Cluster>
        <Button onClick={() => setEditOpen(true)}>Edit (with delete inside)</Button>
      </Cluster>
      <Modal open={editOpen} onOpenChange={setEditOpen} size="md">
        <Modal.Header>Edit contact</Modal.Header>
        <Modal.Body>
          <Stack gap="md">
            <label>
              Company
              <Input defaultValue="Acme Inc." />
            </label>
            <Cluster gap="sm" align="center">
              <Badge tone="success">Active</Badge>
            </Cluster>
          </Stack>
        </Modal.Body>
        <Modal.Footer align="space-between">
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Delete
          </Button>
          <Cluster gap="sm">
            <Modal.Close>
              <Button variant="secondary">Cancel</Button>
            </Modal.Close>
            <Button onClick={() => setEditOpen(false)}>Save</Button>
          </Cluster>
        </Modal.Footer>
      </Modal>
      <Modal open={confirmOpen} onOpenChange={setConfirmOpen} size="sm">
        <Modal.Header>Delete contact?</Modal.Header>
        <Modal.Body>This cannot be undone.</Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="secondary">Cancel</Button>
          </Modal.Close>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmOpen(false);
              setEditOpen(false);
            }}
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}`}
    >
      <Cluster>
        <Button onClick={() => setEditOpen(true)}>Edit (with delete inside)</Button>
      </Cluster>
      <Modal open={editOpen} onOpenChange={setEditOpen} size="md">
        <Modal.Header>Edit contact</Modal.Header>
        <Modal.Body>
          <Stack gap="md">
            <label>
              Company
              <Input defaultValue="Acme Inc." />
            </label>
            <Cluster gap="sm" align="center">
              <Badge tone="success">Active</Badge>
            </Cluster>
          </Stack>
        </Modal.Body>
        <Modal.Footer align="space-between">
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Delete
          </Button>
          <Cluster gap="sm">
            <Modal.Close>
              <Button variant="secondary">Cancel</Button>
            </Modal.Close>
            <Button onClick={() => setEditOpen(false)}>Save</Button>
          </Cluster>
        </Modal.Footer>
      </Modal>
      <Modal open={confirmOpen} onOpenChange={setConfirmOpen} size="sm">
        <Modal.Header>Delete contact?</Modal.Header>
        <Modal.Body>This cannot be undone.</Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="secondary">Cancel</Button>
          </Modal.Close>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmOpen(false);
              setEditOpen(false);
            }}
          >
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </Example>
  );
}

function NoHeaderExample() {
  return (
    <Example
      title="No Header (aria-label fallback)"
      description="Omit `<Modal.Header>` and pass `aria-label` for the dialog's accessible name."
      code={`import { useState } from 'react';
import { Button, Cluster, Modal } from '@eocrm/design-system';

export function NoHeaderInline() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Cluster>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open (no Header)
        </Button>
      </Cluster>
      <Modal open={open} onOpenChange={setOpen} aria-label="Confirm action">
        <Modal.Body>
          <p style={{ margin: 0 }}>Are you sure you want to continue?</p>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="secondary">Cancel</Button>
          </Modal.Close>
          <Button onClick={() => setOpen(false)}>Continue</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}`}
    >
      <NoHeaderInline />
    </Example>
  );
}

function NoHeaderInline() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Cluster>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open (no Header)
        </Button>
      </Cluster>
      <Modal open={open} onOpenChange={setOpen} aria-label="Confirm action">
        <Modal.Body>
          <p style={{ margin: 0 }}>Are you sure you want to continue?</p>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button variant="secondary">Cancel</Button>
          </Modal.Close>
          <Button onClick={() => setOpen(false)}>Continue</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
