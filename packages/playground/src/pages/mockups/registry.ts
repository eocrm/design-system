// packages/playground/src/pages/mockups/registry.ts

export type ComponentName =
  | 'Accordion'
  | 'Alert'
  | 'Avatar'
  | 'Badge'
  | 'Breadcrumb'
  | 'Button'
  | 'ButtonGroup'
  | 'Calendar'
  | 'Card'
  | 'Checkbox'
  | 'CircularProgress'
  | 'Cluster'
  | 'Code'
  | 'ColorPicker'
  | 'ConfirmationPopover'
  | 'CursorPagination'
  | 'DataTable'
  | 'DatePicker'
  | 'DateRangePicker'
  | 'DefinitionList'
  | 'Divider'
  | 'Drawer'
  | 'DropdownMenu'
  | 'EmptyState'
  | 'FilterChip'
  | 'FileUpload'
  | 'ImageCrop'
  | 'Grid'
  | 'InlineDatePicker'
  | 'InlineDateRangePicker'
  | 'Input'
  | 'Kanban'
  | 'Link'
  | 'Modal'
  | 'OptionsPicker'
  | 'PageHeader'
  | 'Pagination'
  | 'PasswordInput'
  | 'PasswordStrengthMeter'
  | 'Popover'
  | 'Progress'
  | 'Radio'
  | 'RadioGroup'
  | 'Select'
  | 'Skeleton'
  | 'Slider'
  | 'Sortable'
  | 'Stack'
  | 'Switch'
  | 'Table'
  | 'Tabs'
  | 'Text'
  | 'Textarea'
  | 'Title'
  | 'Toast'
  | 'Tooltip';

export interface MockupEntry {
  slug: string;
  title: string;
  path: string;
  blurb: string;
  usesComponents: ComponentName[];
}

export const MOCKUPS = [
  {
    slug: 'dashboard',
    title: 'Dashboard',
    path: '/mockups/dashboard',
    blurb: 'CRM home — KPI cards, pipeline summary, recent activity.',
    usesComponents: [
      'Avatar',
      'Badge',
      'Button',
      'Card',
      'Cluster',
      'Grid',
      'Link',
      'Stack',
      'Text',
      'Title',
    ],
  },
  {
    slug: 'deals',
    title: 'Deals',
    path: '/mockups/deals',
    blurb: 'Kanban-style pipeline grouped by stage.',
    usesComponents: [
      'Avatar',
      'Badge',
      'Button',
      'Card',
      'Cluster',
      'Code',
      'DropdownMenu',
      'Kanban',
      'Stack',
      'Text',
      'Title',
    ],
  },
  {
    slug: 'contacts',
    title: 'Contacts',
    path: '/mockups/contacts',
    blurb: 'Tabular contact list with status chips and quick filters.',
    usesComponents: [
      'Avatar',
      'Badge',
      'Button',
      'Card',
      'Checkbox',
      'Cluster',
      'DropdownMenu',
      'Input',
      'Link',
      'Stack',
      'Table',
      'Text',
      'Title',
    ],
  },
  {
    slug: 'contact-detail',
    title: 'Contact detail',
    path: '/mockups/contacts/:id',
    blurb: 'Single contact view with tabs and activity feed.',
    usesComponents: [
      'Avatar',
      'Badge',
      'Breadcrumb',
      'Button',
      'Card',
      'Cluster',
      'DefinitionList',
      'DropdownMenu',
      'Grid',
      'Link',
      'PageHeader',
      'Stack',
      'Tabs',
      'Text',
      'Title',
    ],
  },
  {
    slug: 'members',
    title: 'Members',
    path: '/mockups/members',
    blurb: 'Team & seat management — roles, invites, seat usage.',
    usesComponents: [
      'Avatar',
      'Badge',
      'Button',
      'Card',
      'Cluster',
      'DropdownMenu',
      'Input',
      'Progress',
      'Stack',
      'Table',
      'Tabs',
      'Text',
      'Title',
    ],
  },
  {
    slug: 'audit',
    title: 'Audit log',
    path: '/mockups/audit',
    blurb: 'Tenant-wide event log with filter chips and expandable detail rows.',
    usesComponents: [
      'Avatar',
      'Badge',
      'Button',
      'Cluster',
      'Code',
      'DataTable',
      'DefinitionList',
      'Divider',
      'FilterChip',
      'OptionsPicker',
      'PageHeader',
      'Stack',
      'Text',
      'Tooltip',
    ],
  },
] as const satisfies readonly MockupEntry[];

export type MockupSlug = (typeof MOCKUPS)[number]['slug'];

export function getMockup(slug: MockupSlug): MockupEntry | undefined {
  return MOCKUPS.find((m) => m.slug === slug);
}

export function mockupsUsing(component: ComponentName): readonly MockupEntry[] {
  return MOCKUPS.filter((m) => (m.usesComponents as readonly ComponentName[]).includes(component));
}
