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
