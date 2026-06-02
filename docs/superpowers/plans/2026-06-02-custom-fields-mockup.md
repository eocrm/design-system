# Custom Fields Configuration Mockup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/mockups/custom-fields` playground mockup — an admin screen to define custom fields per entity (Contacts/Deals/Companies/Tickets): entity `Tabs`, a reorderable `Sortable` field list, and an Add/Edit field `Drawer` built from `Field`/`FormRow`/`FormSection` + `Select`/`Switch`/`Input` with a conditional options editor.

**Architecture:** Three focused files in `pages/mockups/CustomFields/`: `fields.ts` (types/constants/helpers, no JSX), `FieldDrawer.tsx` (the add/edit drawer — owns its draft + validation), and `CustomFields.tsx` (the page — entity tabs, the Sortable field list, all field state). All state is mockup-local; built exclusively from `@eocrm/design-system` components (Hard rule 6). The in-drawer Type `Select` relies on the merged overlay z-fix to render above the drawer.

**Tech Stack:** React (`useState`/`useEffect`), TypeScript, `@eocrm/design-system`, lucide-react icons, the `toast` helper. Branch: `mockup/custom-fields` (off `main`). Spec: `docs/superpowers/specs/2026-06-02-custom-fields-mockup-design.md`.

**Testing note:** Playground mockups are NOT unit-tested (no `.test.tsx`). Per-task verification is `npm run typecheck` / `make build` / `make lint` / `prettier --check`; final verification adds the playground Hard-rule-7 mockup review loop + manual smoke. No failing-test-first steps.

---

## File map

**Create:**
- `packages/playground/src/pages/mockups/CustomFields/fields.ts` — `EntityKey`/`FieldType`/`CustomField`/`FieldOption` types; `ENTITIES`, `FIELD_TYPE_LABEL`, `FIELD_TYPE_TONE`, `TYPE_OPTIONS`; `isChoiceType`, `uid`, `slugify`, `blankField`, `SEED`.
- `packages/playground/src/pages/mockups/CustomFields/FieldDrawer.tsx` — the Add/Edit field `Drawer` (draft + validation + options editor).
- `packages/playground/src/pages/mockups/CustomFields/CustomFields.tsx` — the page (tabs, Sortable field list, EmptyState, state, mounts `FieldDrawer`).

**Modify (Rule 4 wiring):**
- `packages/playground/src/App.tsx` — import + `<Route path="/mockups/custom-fields" …>`
- `packages/playground/src/layout/AppShell/AppShell.tsx` — `SquarePen` lucide import + a `mockupItems` entry
- `packages/playground/src/pages/mockups/registry.ts` — a `MOCKUPS` entry (auto-feeds `MockupsIndex` + `CrossLinks`; no `ComponentName` additions — all used names already in the union)

---

## Task 0: Pre-flight

**Files:** none (git only)

- [ ] **Step 1: Confirm branch + hooks + merged deps**

Run:
```bash
cd /Users/dpws/projects/design-system
git branch --show-current        # expect: mockup/custom-fields
git config --get core.hooksPath  # expect: .husky/_
test -f packages/design-system/src/components/_internal/overlay/useInOverlay.ts && echo "overlay fix present ✓"
```
Expect the branch + hooks + the overlay fix (so the in-drawer Type Select renders above the drawer). If not on the branch, `git checkout mockup/custom-fields` (branched off `main`).

---

## Task 1: `fields.ts` — types, constants, helpers

**Files:**
- Create: `packages/playground/src/pages/mockups/CustomFields/fields.ts`

- [ ] **Step 1: Write the module**

Create `packages/playground/src/pages/mockups/CustomFields/fields.ts`:

```ts
import type { BadgeTone } from '@eocrm/design-system';

/** The entities a custom field can be attached to (mockup-local; names only — no records). */
export type EntityKey = 'contacts' | 'deals' | 'companies' | 'tickets';

export const ENTITIES: { id: EntityKey; label: string }[] = [
  { id: 'contacts', label: 'Contacts' },
  { id: 'deals', label: 'Deals' },
  { id: 'companies', label: 'Companies' },
  { id: 'tickets', label: 'Tickets' },
];

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'checkbox'
  | 'dropdown'
  | 'multiselect'
  | 'email'
  | 'url'
  | 'phone';

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: 'Text',
  textarea: 'Text area',
  number: 'Number',
  date: 'Date',
  checkbox: 'Checkbox',
  dropdown: 'Dropdown',
  multiselect: 'Multi-select',
  email: 'Email',
  url: 'URL',
  phone: 'Phone',
};

// Only 6 BadgeTones exist, so related types share a tone (grouped, not 1:1).
export const FIELD_TYPE_TONE: Record<FieldType, BadgeTone> = {
  text: 'neutral',
  textarea: 'neutral',
  number: 'info',
  date: 'info',
  checkbox: 'success',
  dropdown: 'purple',
  multiselect: 'purple',
  email: 'warning',
  url: 'warning',
  phone: 'warning',
};

/** Options for the Type <Select>. */
export const TYPE_OPTIONS: { value: FieldType; label: string }[] = (
  Object.keys(FIELD_TYPE_LABEL) as FieldType[]
).map((t) => ({ value: t, label: FIELD_TYPE_LABEL[t] }));

export interface FieldOption {
  id: string;
  label: string;
}

export interface CustomField {
  id: string;
  label: string;
  key: string;
  type: FieldType;
  helpText: string;
  required: boolean;
  showInTable: boolean;
  options: FieldOption[]; // empty unless a choice type
}

export const isChoiceType = (t: FieldType): boolean => t === 'dropdown' || t === 'multiselect';

// Monotonic id generator — deterministic (no Date.now / Math.random), unique per session.
let nextId = 1;
export const uid = (prefix = 'f'): string => `${prefix}${nextId++}`;

/** label -> snake_case key (lowercase, non-alphanumeric -> _, trimmed). */
export const slugify = (label: string): string =>
  label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const blankField = (): CustomField => ({
  id: '',
  label: '',
  key: '',
  type: 'text',
  helpText: '',
  required: false,
  showInTable: false,
  options: [],
});

/** Seed definitions per entity. Tickets is intentionally empty to show the EmptyState. */
export const SEED: Record<EntityKey, CustomField[]> = {
  contacts: [
    {
      id: uid(),
      label: 'Industry',
      key: 'industry',
      type: 'dropdown',
      helpText: '',
      required: false,
      showInTable: true,
      options: [
        { id: uid('o'), label: 'SaaS' },
        { id: uid('o'), label: 'Fintech' },
        { id: uid('o'), label: 'Healthcare' },
      ],
    },
    {
      id: uid(),
      label: 'LinkedIn',
      key: 'linkedin',
      type: 'url',
      helpText: 'Public profile URL.',
      required: false,
      showInTable: false,
      options: [],
    },
    {
      id: uid(),
      label: 'Lifetime value',
      key: 'lifetime_value',
      type: 'number',
      helpText: '',
      required: false,
      showInTable: true,
      options: [],
    },
  ],
  deals: [
    {
      id: uid(),
      label: 'Forecast category',
      key: 'forecast_category',
      type: 'dropdown',
      helpText: '',
      required: true,
      showInTable: true,
      options: [
        { id: uid('o'), label: 'Commit' },
        { id: uid('o'), label: 'Best case' },
        { id: uid('o'), label: 'Pipeline' },
      ],
    },
    {
      id: uid(),
      label: 'Contract value',
      key: 'contract_value',
      type: 'number',
      helpText: '',
      required: true,
      showInTable: true,
      options: [],
    },
    {
      id: uid(),
      label: 'Renewal date',
      key: 'renewal_date',
      type: 'date',
      helpText: '',
      required: false,
      showInTable: false,
      options: [],
    },
  ],
  companies: [
    {
      id: uid(),
      label: 'Employees',
      key: 'employees',
      type: 'number',
      helpText: '',
      required: false,
      showInTable: true,
      options: [],
    },
    {
      id: uid(),
      label: 'Headquarters',
      key: 'headquarters',
      type: 'text',
      helpText: '',
      required: false,
      showInTable: false,
      options: [],
    },
  ],
  tickets: [],
};
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/dpws/projects/design-system/packages/playground && npx tsc --noEmit`
Expected: clean (this module is types/constants only; it imports `BadgeTone` as a type from the package root).

- [ ] **Step 3: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/pages/mockups/CustomFields/fields.ts
git commit -m "$(cat <<'EOF'
feat(mockup): custom-fields types, constants, and seed data

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `FieldDrawer.tsx` — the Add/Edit field drawer

**Files:**
- Create: `packages/playground/src/pages/mockups/CustomFields/FieldDrawer.tsx`

- [ ] **Step 1: Write the component**

Create `packages/playground/src/pages/mockups/CustomFields/FieldDrawer.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { GripVertical, Plus, X } from 'lucide-react';
import {
  Button,
  Cluster,
  Constrain,
  Drawer,
  Field,
  FormSection,
  Input,
  Select,
  Sortable,
  Stack,
  Switch,
  Text,
} from '@eocrm/design-system';
import {
  blankField,
  isChoiceType,
  slugify,
  TYPE_OPTIONS,
  uid,
  type CustomField,
  type FieldType,
} from './fields';

interface FieldDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityLabel: string;
  /** The field being edited, or null when adding. */
  field: CustomField | null;
  /** Keys already used by OTHER fields on this entity (for uniqueness validation). */
  existingKeys: string[];
  onSave: (field: CustomField) => void;
}

interface DrawerErrors {
  label?: string;
  key?: string;
  options?: string;
}

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

export function FieldDrawer({
  open,
  onOpenChange,
  entityLabel,
  field,
  existingKeys,
  onSave,
}: FieldDrawerProps) {
  const [draft, setDraft] = useState<CustomField>(blankField);
  const [errors, setErrors] = useState<DrawerErrors>({});
  // Once the user edits the key by hand, stop auto-deriving it from the label.
  const [keyEdited, setKeyEdited] = useState(false);

  // Seed the draft each time the drawer opens (add = blank, edit = a copy).
  useEffect(() => {
    if (!open) return;
    setDraft(field ? { ...field, options: field.options.map((o) => ({ ...o })) } : blankField());
    setErrors({});
    setKeyEdited(Boolean(field));
  }, [open, field]);

  const choice = isChoiceType(draft.type);

  const onLabel = (value: string) =>
    setDraft((d) => ({ ...d, label: value, key: keyEdited ? d.key : slugify(value) }));

  const onKey = (value: string) => {
    setKeyEdited(true);
    setDraft((d) => ({ ...d, key: value }));
  };

  const onType = (value: FieldType) =>
    setDraft((d) => ({
      ...d,
      type: value,
      // Give choice types a first empty option row to edit.
      options: isChoiceType(value) && d.options.length === 0 ? [{ id: uid('o'), label: '' }] : d.options,
    }));

  const addOption = () => setDraft((d) => ({ ...d, options: [...d.options, { id: uid('o'), label: '' }] }));
  const setOption = (id: string, label: string) =>
    setDraft((d) => ({ ...d, options: d.options.map((o) => (o.id === id ? { ...o, label } : o)) }));
  const removeOption = (id: string) =>
    setDraft((d) => ({ ...d, options: d.options.filter((o) => o.id !== id) }));
  const reorderOptions = (from: number, to: number) =>
    setDraft((d) => {
      const next = d.options.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...d, options: next };
    });

  const save = () => {
    const next: DrawerErrors = {};
    if (!draft.label.trim()) next.label = 'Label is required.';
    if (!draft.key.trim()) next.key = 'Key is required.';
    else if (!KEY_PATTERN.test(draft.key))
      next.key = 'Lowercase letters, numbers, and underscores; must start with a letter.';
    else if (existingKeys.includes(draft.key)) next.key = 'A field with this key already exists.';
    if (choice && draft.options.filter((o) => o.label.trim()).length === 0)
      next.options = 'Add at least one option.';

    if (next.label || next.key || next.options) {
      setErrors(next);
      return;
    }

    onSave({
      ...draft,
      id: draft.id || uid(),
      options: choice ? draft.options.filter((o) => o.label.trim()) : [],
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} side="right" size="md">
      <Drawer.Header>{`${field ? 'Edit field' : 'Add field'} · ${entityLabel}`}</Drawer.Header>
      <Drawer.Body>
        <Stack gap="xl">
          <FormSection title="Field" description="What this field is called and how it stores data.">
            <Field label="Label" required error={errors.label}>
              <Input
                value={draft.label}
                onChange={(e) => onLabel(e.target.value)}
                placeholder="e.g. Industry"
              />
            </Field>
            <Field
              label="Field key"
              error={errors.key}
              description="Used in the API and imports. Auto-generated from the label."
            >
              <Input value={draft.key} onChange={(e) => onKey(e.target.value)} placeholder="industry" />
            </Field>
            <Field label="Type" required>
              <Select
                options={TYPE_OPTIONS}
                value={draft.type}
                onChange={(value) => onType(value as FieldType)}
              />
            </Field>
          </FormSection>

          {choice && (
            <FormSection title="Options" description="Choices for this field — drag to reorder.">
              <Sortable onReorder={({ from, to }) => reorderOptions(from, to)}>
                {draft.options.map((o) => (
                  <Sortable.Item key={o.id} id={o.id}>
                    <Cluster gap="sm" align="center" wrap={false}>
                      <Sortable.Handle aria-label={`Reorder ${o.label || 'option'}`}>
                        <GripVertical size={14} />
                      </Sortable.Handle>
                      <Constrain flex="grow">
                        <Input
                          value={o.label}
                          onChange={(e) => setOption(o.id, e.target.value)}
                          placeholder="Option label"
                        />
                      </Constrain>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        aria-label="Remove option"
                        onClick={() => removeOption(o.id)}
                      >
                        <X size={14} />
                      </Button>
                    </Cluster>
                  </Sortable.Item>
                ))}
              </Sortable>
              <Cluster gap="sm" align="center">
                <Button variant="secondary" size="sm" onClick={addOption}>
                  <Plus size={14} /> Add option
                </Button>
                {errors.options && (
                  <Text size="sm" tone="danger">
                    {errors.options}
                  </Text>
                )}
              </Cluster>
            </FormSection>
          )}

          <FormSection title="Behavior" description="How the field shows up for users.">
            <Field label="Help text" optional>
              <Input
                value={draft.helpText}
                onChange={(e) => setDraft((d) => ({ ...d, helpText: e.target.value }))}
                placeholder="Shown under the field on forms"
              />
            </Field>
            <Field orientation="horizontal" label="Required" description="Users must fill this in.">
              <Switch
                checked={draft.required}
                onChange={(checked) => setDraft((d) => ({ ...d, required: checked }))}
              />
            </Field>
            <Field
              orientation="horizontal"
              label="Show in table"
              description={`Add a column on the ${entityLabel} list.`}
            >
              <Switch
                checked={draft.showInTable}
                onChange={(checked) => setDraft((d) => ({ ...d, showInTable: checked }))}
              />
            </Field>
          </FormSection>
        </Stack>
      </Drawer.Body>
      <Drawer.Footer>
        <Drawer.Close>
          <Button variant="secondary">Cancel</Button>
        </Drawer.Close>
        <Button onClick={save}>Save field</Button>
      </Drawer.Footer>
    </Drawer>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/dpws/projects/design-system/packages/playground && npx tsc --noEmit`
Expected: clean. If `Select`'s `onChange` value type, `Drawer`/`Field`/`Switch` props, or `Cluster`/`Constrain` props differ from the assumptions, read the component source under `packages/design-system/src/components/<Name>/` and fix the call site (do NOT add raw HTML or inline styles to work around anything — Hard rule 6).

- [ ] **Step 3: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/pages/mockups/CustomFields/FieldDrawer.tsx
git commit -m "$(cat <<'EOF'
feat(mockup): custom-fields add/edit Drawer with options editor

Drawer form (Field/FormSection + Input/Select/Switch) with label->key slug
derivation, validation (label/key/options), and a Sortable options editor for
choice types. The Type Select renders above the drawer (overlay z-fix).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `CustomFields.tsx` page + wiring

**Files:**
- Create: `packages/playground/src/pages/mockups/CustomFields/CustomFields.tsx`
- Modify: `packages/playground/src/App.tsx`, `.../layout/AppShell/AppShell.tsx`, `.../pages/mockups/registry.ts`

- [ ] **Step 1: Write the page**

Create `packages/playground/src/pages/mockups/CustomFields/CustomFields.tsx`:

```tsx
import { useState } from 'react';
import { GripVertical, ListPlus, MoreHorizontal } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Cluster,
  Code,
  ConfirmationPopover,
  DropdownMenu,
  EmptyState,
  Page,
  PageHeader,
  Sortable,
  Stack,
  Tabs,
  Text,
  toast,
  type TabItem,
} from '@eocrm/design-system';
import {
  ENTITIES,
  FIELD_TYPE_LABEL,
  FIELD_TYPE_TONE,
  SEED,
  type CustomField,
  type EntityKey,
} from './fields';
import { FieldDrawer } from './FieldDrawer';
import { CrossLinks } from '../../shared/CrossLinks';

export function CustomFields() {
  const [fieldsByEntity, setFieldsByEntity] = useState<Record<EntityKey, CustomField[]>>(SEED);
  const [activeEntity, setActiveEntity] = useState<EntityKey>('contacts');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CustomField | null>(null);

  const fields = fieldsByEntity[activeEntity];
  const entityLabel = ENTITIES.find((e) => e.id === activeEntity)!.label;

  const tabs: TabItem[] = ENTITIES.map((e) => ({
    id: e.id,
    label: e.label,
    count: fieldsByEntity[e.id].length,
  }));

  const openAdd = () => {
    setEditing(null);
    setDrawerOpen(true);
  };
  const openEdit = (f: CustomField) => {
    setEditing(f);
    setDrawerOpen(true);
  };

  const saveField = (field: CustomField) => {
    setFieldsByEntity((prev) => {
      const list = prev[activeEntity];
      const exists = list.some((f) => f.id === field.id);
      const nextList = exists ? list.map((f) => (f.id === field.id ? field : f)) : [...list, field];
      return { ...prev, [activeEntity]: nextList };
    });
    setDrawerOpen(false);
    toast.success('Field saved', { description: `“${field.label}” on ${entityLabel}.` });
  };

  const deleteField = (id: string) => {
    setFieldsByEntity((prev) => ({
      ...prev,
      [activeEntity]: prev[activeEntity].filter((f) => f.id !== id),
    }));
    toast.success('Field deleted');
  };

  const reorder = (from: number, to: number) =>
    setFieldsByEntity((prev) => {
      const next = prev[activeEntity].slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...prev, [activeEntity]: next };
    });

  const existingKeys = fields.filter((f) => f.id !== editing?.id).map((f) => f.key);

  return (
    <Page>
      <PageHeader>
        <PageHeader.Title>Custom fields</PageHeader.Title>
        <PageHeader.Subtitle>
          Define extra fields to capture data unique to your eocrm workspace.
        </PageHeader.Subtitle>
        <PageHeader.Actions>
          <Button onClick={openAdd}>Add field</Button>
        </PageHeader.Actions>
      </PageHeader>

      <Tabs items={tabs} activeId={activeEntity} onChange={(id) => setActiveEntity(id as EntityKey)} />

      {fields.length === 0 ? (
        <EmptyState
          icon={<ListPlus size={32} aria-hidden="true" />}
          title={`No custom fields for ${entityLabel}`}
          description="Add a custom field to capture data unique to your workflow."
          actions={<Button onClick={openAdd}>Add field</Button>}
        />
      ) : (
        <Sortable onReorder={({ from, to }) => reorder(from, to)}>
          {fields.map((f) => (
            <Sortable.Item key={f.id} id={f.id}>
              <Card padding="sm">
                <Cluster justify="between" align="center" wrap={false} gap="sm">
                  <Cluster gap="sm" align="center" wrap={false}>
                    <Sortable.Handle aria-label={`Reorder ${f.label}`}>
                      <GripVertical size={14} />
                    </Sortable.Handle>
                    <Stack gap="xs">
                      <Text weight="medium">{f.label}</Text>
                      <Code tone="muted">{f.key}</Code>
                    </Stack>
                  </Cluster>
                  <Cluster gap="sm" align="center" wrap={false}>
                    <Badge tone={FIELD_TYPE_TONE[f.type]} size="sm">
                      {FIELD_TYPE_LABEL[f.type]}
                    </Badge>
                    {f.required && (
                      <Badge tone="neutral" size="sm">
                        Required
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenu.Trigger>
                        <Button variant="ghost" size="sm" iconOnly aria-label={`Actions for ${f.label}`}>
                          <MoreHorizontal size={16} />
                        </Button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content align="end">
                        <DropdownMenu.Item onSelect={() => openEdit(f)}>Edit</DropdownMenu.Item>
                        <DropdownMenu.Separator />
                        <ConfirmationPopover
                          title="Delete field?"
                          description={`“${f.label}” and its data mapping will be removed.`}
                          variant="danger"
                          confirmLabel="Delete field"
                          onConfirm={() => deleteField(f.id)}
                        >
                          <DropdownMenu.Item closeOnSelect={false} onSelect={() => {}} tone="danger">
                            Delete field
                          </DropdownMenu.Item>
                        </ConfirmationPopover>
                      </DropdownMenu.Content>
                    </DropdownMenu>
                  </Cluster>
                </Cluster>
              </Card>
            </Sortable.Item>
          ))}
        </Sortable>
      )}

      <FieldDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        entityLabel={entityLabel}
        field={editing}
        existingKeys={existingKeys}
        onSave={saveField}
      />

      <CrossLinks kind="mockup" slug="custom-fields" />
    </Page>
  );
}
```

- [ ] **Step 2: Wire the route (App.tsx)**

In `packages/playground/src/App.tsx`:
1. Add the import next to the other mockup imports (after the `Settings` mockup import):
   ```tsx
   import { CustomFields } from './pages/mockups/CustomFields/CustomFields';
   ```
2. Add the route right after the `system-settings` route:
   ```tsx
   <Route path="/mockups/custom-fields" element={<CustomFields />} />
   ```

- [ ] **Step 3: Wire the nav (AppShell.tsx)**

In `packages/playground/src/layout/AppShell/AppShell.tsx`:
1. Add `SquarePen` to the existing `from 'lucide-react'` import block (it isn't imported yet and isn't used by any other `mockupItems` entry).
2. Add to the `mockupItems` array, right after the System settings entry:
   ```tsx
   { to: '/mockups/custom-fields', label: 'Custom fields', icon: SquarePen, end: false },
   ```

- [ ] **Step 4: Wire the registry (registry.ts)**

In `packages/playground/src/pages/mockups/registry.ts`, add to the `MOCKUPS` array right after the `system-settings` entry (no `ComponentName` additions needed — all used names are already in the union):
```ts
  {
    slug: 'custom-fields',
    title: 'Custom fields',
    path: '/mockups/custom-fields',
    blurb: 'Admin screen to define custom fields per entity — types, options, reorder.',
    usesComponents: [
      'Badge',
      'Button',
      'Card',
      'Cluster',
      'Code',
      'ConfirmationPopover',
      'Constrain',
      'Drawer',
      'DropdownMenu',
      'EmptyState',
      'Field',
      'FormSection',
      'Input',
      'Page',
      'PageHeader',
      'Select',
      'Sortable',
      'Stack',
      'Switch',
      'Tabs',
      'Text',
    ],
  },
```
> This 21-item array is the exact union of `@eocrm/design-system` imports across `CustomFields.tsx` + `FieldDrawer.tsx` (Rule 7's registry-sync check requires an exact match — `Cluster` and `Constrain` are included). `toast` and the type-only imports (`TabItem`, `BadgeTone`) are not components and are correctly excluded. Paste as-is.

- [ ] **Step 5: Typecheck + build + lint**

Run:
```bash
cd /Users/dpws/projects/design-system
cd packages/playground && npm run typecheck
cd /Users/dpws/projects/design-system && make build && make lint
```
Expected: clean typecheck, clean playground bundle, clean stylelint. The page is now reachable at `/mockups/custom-fields`, listed on the Mockups overview (registry-driven), and cross-linked.

- [ ] **Step 6: Commit**

```bash
cd /Users/dpws/projects/design-system
git add packages/playground/src/pages/mockups/CustomFields/CustomFields.tsx \
        packages/playground/src/App.tsx \
        packages/playground/src/layout/AppShell/AppShell.tsx \
        packages/playground/src/pages/mockups/registry.ts
git commit -m "$(cat <<'EOF'
feat(mockup): custom-fields page (entity tabs + reorderable field list)

Entity Tabs, a Sortable per-entity field list (handle · label/key · type badge ·
required · row actions), EmptyState, and the Add/Edit Drawer. Delete via
ConfirmationPopover. Wired into route, nav, and registry.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Verify + Rule 7 review + PR

**Files:** none (verification + git)

- [ ] **Step 1: Full gates**

Run:
```bash
cd /Users/dpws/projects/design-system
make test          # full vitest suite (library) — no regression
make build         # typecheck + bundle playground
make lint          # stylelint
npm run format:check
```
Expected: all green. If `prettier --check` flags the new files, run `npx prettier --write` on them and amend/commit.

- [ ] **Step 2: Playground Hard rule 7 — mockup review-fix loop**

This touches `pages/mockups/**` + `registry.ts`, so run the mockup pre-push review cycle. Dispatch a fresh-context `general-purpose` reviewer over `CustomFields/*.tsx` + the wiring diff, briefed on the 10 categories (Hard-rule-6 compliance: no inline `style`/raw HTML/co-located SCSS; registry sync incl. `Cluster`/`Constrain`; imports from `@eocrm/design-system` only; realism; a11y incl. Sortable handle labels + DropdownMenu/ConfirmationPopover nesting; keyboard/focus; layout discipline; component coverage; state realism; no stale TODOs). Fix every Critical/Important; document skips; re-run gates; re-review until "clean enough to stop".

- [ ] **Step 3: Manual smoke (recommended)**

`make dev`, visit `http://localhost:8080/mockups/custom-fields`:
- Switch entity tabs; counts match; **Tickets** shows the `EmptyState`.
- "Add field" → drawer opens; type a Label → the Key auto-fills (snake_case); pick **Dropdown** → the **Options** editor appears and the **Type Select opens ABOVE the drawer** (overlay z-fix); add/reorder/remove options.
- Save with an empty label, or a dropdown with no options → `Field` errors block save and keep the drawer open.
- Fix → Save → row appears + success toast; drag-reorder rows via the handle.
- Row ⋯ → Edit reopens the drawer pre-filled (key does not re-derive); Delete → `ConfirmationPopover` confirms → row removed + toast.

- [ ] **Step 4: Push + open PR**

```bash
cd /Users/dpws/projects/design-system
git push -u origin mockup/custom-fields
gh pr create --base main --head mockup/custom-fields \
  --title "feat(mockup): custom fields configuration page" \
  --body "$(cat <<'EOF'
## Summary
Adds `/mockups/custom-fields` — an admin screen to define custom fields per entity (Contacts / Deals / Companies / Tickets). Entity `Tabs`, a reorderable `Sortable` field list (drag handle · label+key · type `Badge` · required · row actions), an `EmptyState` for entities with no fields, and an Add/Edit field `Drawer` built from `Field`/`FormSection` + `Input`/`Select`/`Switch` with a conditional `Sortable` options editor. Label→key slug derivation; validation (label, key format/uniqueness, ≥1 option for choice types); delete via `ConfirmationPopover`; success toasts. All mockup-local state.

Exercises the merged overlay z-fix — the in-drawer Type `Select` renders above the drawer.

## Test plan
- [x] `make test` / `make build` / `make lint` / `prettier --check` green
- [x] Playground Rule 7 mockup review loop clean
- [ ] CI `Quality / check`
- [ ] Manual: tabs + counts, EmptyState (Tickets), add/edit with auto-key + conditional options, Type Select above drawer, validation, reorder, delete-confirm

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
Expected: PR created; wait for `Quality / check`.

---

## Self-review (against the spec)

**Spec coverage:** ✅ `/mockups/custom-fields` reachable from Mockups nav (Task 3). ✅ Entity Tabs + counts (Task 3). ✅ Reorderable `Sortable` field list with handle/label/key/type-badge/required/actions; `EmptyState` when empty (Task 3). ✅ Add/Edit `Drawer`: Field/Options(conditional)/Behavior `FormSection`s; Type `Select` in-drawer (Task 2). ✅ Field types incl. tone map (Task 1). ✅ Key slug derivation + stop-on-manual-edit (Task 2). ✅ Validation: label required, key required/format/unique, choice ≥1 option (Task 2). ✅ Reorder via plain splice (no `arrayMove`); delete via `ConfirmationPopover` + `closeOnSelect={false}` Item; toasts (Tasks 2–3). ✅ Mockup-local state, no `mock.ts`/entity-record changes. ✅ Built only from library components; lucide + toast allowed. ✅ Wiring incl. registry (no `ComponentName` additions). ✅ Non-goals respected (no persistence/preview/unit-test).

**Placeholder scan:** none — full code for all three files + exact wiring edits + commands. The `registry.ts` `usesComponents` literal is the exact 21-item import union (incl. `Cluster` + `Constrain`) — paste as-is.

**Deliberate spec drift:** the spec's narrative mentions `FormRow`, but the drawer's fields don't pair naturally side-by-side, so `FormRow` is intentionally **not** used (and correctly absent from `usesComponents`). The form still showcases `Field` + `FormSection`. No action needed.

**API verification:** every `@eocrm/design-system` component usage in this plan's code was checked against the real component source (adversarial review, 2026-06-02) — APIs confirmed correct (Sortable `onReorder({from,to})` + plain-splice reorder, `Tabs` controlled `items`/`activeId`/`onChange`, `ConfirmationPopover` wrapping a `closeOnSelect={false}` danger `DropdownMenu.Item`, `Field` auto-clone onto Input/Select/Switch, `Cluster justify="between"`, `Card padding="sm"`, `Button iconOnly`, Badge tones, `Code tone="muted"`).

**Type consistency:** `CustomField`/`FieldOption`/`FieldType`/`EntityKey` used consistently across `fields.ts`, `FieldDrawer.tsx`, `CustomFields.tsx`. `FieldDrawer` props (`open`/`onOpenChange`/`entityLabel`/`field`/`existingKeys`/`onSave`) match the page's call site. `Sortable` `onReorder({from,to})` + plain-splice reorder used identically in both the field list and the options editor. `Select onChange(value)` cast to `FieldType`. `Switch onChange(checked)`. `Tabs onChange(id)` cast to `EntityKey`.

## Follow-ups (out of scope)
- Live preview of how a field renders on an entity form; default value & placeholder per field.
- Import/export field definitions.
- A reusable `Sortable`-backed data-list / sortable-table primitive in the library (would replace the hand-laid `Card`+`Cluster` rows).
```
