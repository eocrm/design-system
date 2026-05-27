import { useRef, useState } from 'react';
import { Button, Cluster, Drawer, Input, Modal, Stack } from '@eocrm/design-system';
import { DemoLayout } from './DemoLayout';
import { Example } from './Example';
import { getComponentFiles } from '../../lib/componentFiles';

export function DrawerDemo() {
  return (
    <DemoLayout
      name="Drawer"
      componentName="Drawer"
      description="Edge-anchored slide-in panel. Four sides (left/right/top/bottom), three sizes, overlay variants, drag-to-close on mobile, and cross-component stacking with Modal."
      files={getComponentFiles('Drawer')}
    >
      <BasicExample />
      <SidesExample />
      <SizesExample />
      <OverlayVariantsExample />
      <ForcedStepExample />
      <FormExample />
      <StackedExample />
      <ModalInteropExample />
      <NoHeaderExample />
    </DemoLayout>
  );
}

function BasicExample() {
  const [open, setOpen] = useState(false);
  return (
    <Example
      title="Basic (right, md)"
      description="Default: right side, medium size. Header wires aria-labelledby. Esc + overlay click + × all dismiss. Touch users can also swipe the Header right to close."
      code={`<Drawer open={open} onOpenChange={setOpen}>
  <Drawer.Header>Filters</Drawer.Header>
  <Drawer.Body>...</Drawer.Body>
  <Drawer.Footer>...</Drawer.Footer>
</Drawer>`}
    >
      <Cluster>
        <Button onClick={() => setOpen(true)}>Show filters</Button>
      </Cluster>
      <Drawer open={open} onOpenChange={setOpen}>
        <Drawer.Header>Filters</Drawer.Header>
        <Drawer.Body>Filter content here. Swipe the header to close on touch devices.</Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close>
            <Button variant="secondary">Cancel</Button>
          </Drawer.Close>
          <Button onClick={() => setOpen(false)}>Apply</Button>
        </Drawer.Footer>
      </Drawer>
    </Example>
  );
}

function SidesExample() {
  const [side, setSide] = useState<null | 'left' | 'right' | 'top' | 'bottom'>(null);
  return (
    <Example
      title="Sides"
      description="`side='left' | 'right' | 'top' | 'bottom'`. Default is 'right'."
      code={`<Drawer side="left" ...>...</Drawer>`}
    >
      <Cluster gap="sm">
        <Button variant="secondary" size="sm" onClick={() => setSide('left')}>
          Left
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setSide('right')}>
          Right
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setSide('top')}>
          Top
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setSide('bottom')}>
          Bottom
        </Button>
      </Cluster>
      <Drawer open={side !== null} onOpenChange={(n) => !n && setSide(null)} side={side ?? 'right'}>
        <Drawer.Header>Side: {side ?? 'right'}</Drawer.Header>
        <Drawer.Body>This drawer slid in from the {side} edge.</Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close>
            <Button>Close</Button>
          </Drawer.Close>
        </Drawer.Footer>
      </Drawer>
    </Example>
  );
}

function SizesExample() {
  const [size, setSize] = useState<null | 'sm' | 'md' | 'lg'>(null);
  return (
    <Example
      title="Sizes (right side)"
      description='`size="sm"` (320px) / `"md"` (440px, default) / `"lg"` (640px). Capped to viewport - 32px on narrow viewports.'
      code={`<Drawer size="sm" ...>...</Drawer>`}
    >
      <Cluster gap="sm">
        <Button variant="secondary" size="sm" onClick={() => setSize('sm')}>
          Small
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setSize('md')}>
          Medium
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setSize('lg')}>
          Large
        </Button>
      </Cluster>
      <Drawer open={size !== null} onOpenChange={(n) => !n && setSize(null)} size={size ?? 'md'}>
        <Drawer.Header>Size: {size ?? 'md'}</Drawer.Header>
        <Drawer.Body>Width determined by the `size` prop.</Drawer.Body>
      </Drawer>
    </Example>
  );
}

function OverlayVariantsExample() {
  const [variant, setVariant] = useState<null | 'solid' | 'blur'>(null);
  return (
    <Example
      title="Overlay variants"
      description='`overlay="solid"` (default, dim) / `"blur"` (frosted glass, backdrop-filter: blur(4px)).'
      code={`<Drawer overlay="blur" ...>...</Drawer>`}
    >
      <Cluster gap="sm">
        <Button variant="secondary" size="sm" onClick={() => setVariant('solid')}>
          Solid overlay
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setVariant('blur')}>
          Blur overlay
        </Button>
      </Cluster>
      <Drawer
        open={variant !== null}
        onOpenChange={(n) => !n && setVariant(null)}
        overlay={variant ?? 'solid'}
      >
        <Drawer.Header>{variant === 'blur' ? 'Frosted glass' : 'Solid dim'}</Drawer.Header>
        <Drawer.Body>
          {variant === 'blur' ? 'Backdrop is blurred.' : 'Standard dimming overlay.'}
        </Drawer.Body>
      </Drawer>
    </Example>
  );
}

function ForcedStepExample() {
  const [open, setOpen] = useState(false);
  return (
    <Example
      title="Forced step (non-dismissible)"
      description="`disableEscapeClose + dismissOnOverlayClick={false} + dragToClose={false} + closeButton={false}` + no Close = user must use the in-drawer action."
      code={`<Drawer disableEscapeClose dismissOnOverlayClick={false} dragToClose={false} ...>...</Drawer>`}
    >
      <Cluster>
        <Button variant="danger" onClick={() => setOpen(true)}>
          Trigger forced step
        </Button>
      </Cluster>
      <Drawer
        open={open}
        onOpenChange={() => {}}
        disableEscapeClose
        dismissOnOverlayClick={false}
        dragToClose={false}
        size="sm"
        aria-label="Confirm action"
      >
        <Drawer.Header closeButton={false}>Confirm action</Drawer.Header>
        <Drawer.Body>This drawer cannot be dismissed by Esc, overlay click, or swipe.</Drawer.Body>
        <Drawer.Footer>
          <Button onClick={() => setOpen(false)}>Confirm</Button>
        </Drawer.Footer>
      </Drawer>
    </Example>
  );
}

function FormExample() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('Acme Inc.');
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <Example
      title="Form drawer with initial focus"
      description="`initialFocusRef` focuses the first input on open."
      code={`const inputRef = useRef<HTMLInputElement>(null);
<Drawer open={open} onOpenChange={setOpen} initialFocusRef={inputRef}>
  <Drawer.Header>Edit contact</Drawer.Header>
  <Drawer.Body>
    <label>
      Company
      <Input ref={inputRef} value={name} onChange={...} />
    </label>
  </Drawer.Body>
  <Drawer.Footer>...</Drawer.Footer>
</Drawer>`}
    >
      <Cluster>
        <Button onClick={() => setOpen(true)}>Edit contact</Button>
      </Cluster>
      <Drawer open={open} onOpenChange={setOpen} initialFocusRef={inputRef}>
        <Drawer.Header>Edit contact</Drawer.Header>
        <Drawer.Body>
          <Stack gap="md">
            <label>
              Company
              <Input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Inc."
              />
            </label>
          </Stack>
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close>
            <Button variant="secondary">Cancel</Button>
          </Drawer.Close>
          <Button onClick={() => setOpen(false)}>Save</Button>
        </Drawer.Footer>
      </Drawer>
    </Example>
  );
}

function StackedExample() {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <Example
      title="Stacked drawers"
      description="Open a drawer from inside another drawer. Default stackMode='overlay' keeps the parent visible; inner overlay is transparent. Esc closes the topmost."
      code={`<Drawer open={editOpen} ...>
  <Drawer.Footer>
    <Button variant="danger" onClick={() => setConfirmOpen(true)}>Delete</Button>
  </Drawer.Footer>
</Drawer>
<Drawer open={confirmOpen} ...>...</Drawer>`}
    >
      <Cluster>
        <Button onClick={() => setEditOpen(true)}>Edit (with delete inside)</Button>
      </Cluster>
      <Drawer open={editOpen} onOpenChange={setEditOpen}>
        <Drawer.Header>Edit</Drawer.Header>
        <Drawer.Body>Content of the edit drawer.</Drawer.Body>
        <Drawer.Footer align="space-between">
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Delete
          </Button>
          <Cluster gap="sm">
            <Drawer.Close>
              <Button variant="secondary">Cancel</Button>
            </Drawer.Close>
            <Button onClick={() => setEditOpen(false)}>Save</Button>
          </Cluster>
        </Drawer.Footer>
      </Drawer>
      <Drawer open={confirmOpen} onOpenChange={setConfirmOpen} size="sm">
        <Drawer.Header>Delete?</Drawer.Header>
        <Drawer.Body>This cannot be undone.</Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close>
            <Button variant="secondary">Cancel</Button>
          </Drawer.Close>
          <Button
            variant="danger"
            onClick={() => {
              setConfirmOpen(false);
              setEditOpen(false);
            }}
          >
            Delete
          </Button>
        </Drawer.Footer>
      </Drawer>
    </Example>
  );
}

function ModalInteropExample() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <Example
      title="Modal from inside Drawer"
      description="Drawer and Modal share the same overlay registry. A Modal opened from inside a Drawer stacks on top. Esc routes to the Modal first."
      code={`<Drawer ...>
  <Drawer.Footer>
    <Button onClick={() => setModalOpen(true)}>Open modal</Button>
  </Drawer.Footer>
</Drawer>
<Modal open={modalOpen} ...>...</Modal>`}
    >
      <Cluster>
        <Button onClick={() => setDrawerOpen(true)}>Open drawer</Button>
      </Cluster>
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Header>Drawer with a modal inside</Drawer.Header>
        <Drawer.Body>Press the button below to open a modal from inside this drawer.</Drawer.Body>
        <Drawer.Footer>
          <Button onClick={() => setModalOpen(true)}>Open modal</Button>
        </Drawer.Footer>
      </Drawer>
      <Modal open={modalOpen} onOpenChange={setModalOpen} size="sm">
        <Modal.Header>Hello from a modal</Modal.Header>
        <Modal.Body>The drawer stays open underneath.</Modal.Body>
        <Modal.Footer>
          <Modal.Close>
            <Button>OK</Button>
          </Modal.Close>
        </Modal.Footer>
      </Modal>
    </Example>
  );
}

function NoHeaderExample() {
  const [open, setOpen] = useState(false);
  return (
    <Example
      title="No Header (aria-label fallback)"
      description="Omit `<Drawer.Header>` and pass `aria-label` for the accessible name."
      code={`<Drawer aria-label="Confirm action" ...>...</Drawer>`}
    >
      <Cluster>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open (no Header)
        </Button>
      </Cluster>
      <Drawer open={open} onOpenChange={setOpen} aria-label="Confirm action" size="sm">
        <Drawer.Body>
          <p style={{ margin: 0 }}>Are you sure?</p>
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close>
            <Button variant="secondary">Cancel</Button>
          </Drawer.Close>
          <Button onClick={() => setOpen(false)}>Continue</Button>
        </Drawer.Footer>
      </Drawer>
    </Example>
  );
}
