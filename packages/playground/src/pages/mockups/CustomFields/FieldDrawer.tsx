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
      options:
        isChoiceType(value) && d.options.length === 0 ? [{ id: uid('o'), label: '' }] : d.options,
    }));

  const addOption = () =>
    setDraft((d) => ({ ...d, options: [...d.options, { id: uid('o'), label: '' }] }));
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
          <FormSection
            title="Field"
            description="What this field is called and how it stores data."
          >
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
              <Input
                value={draft.key}
                onChange={(e) => onKey(e.target.value)}
                placeholder="industry"
              />
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
