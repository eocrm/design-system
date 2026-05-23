// packages/playground/src/pages/mockups/registry.ts

export type ComponentName =
  | 'Avatar'
  | 'Badge'
  | 'Breadcrumb'
  | 'Button'
  | 'ButtonGroup'
  | 'Calendar'
  | 'Card'
  | 'Checkbox'
  | 'Cluster'
  | 'ConfirmationPopover'
  | 'CursorPagination'
  | 'DataTable'
  | 'DatePicker'
  | 'DateRangePicker'
  | 'Drawer'
  | 'DropdownMenu'
  | 'EmptyState'
  | 'Grid'
  | 'InlineDatePicker'
  | 'InlineDateRangePicker'
  | 'Input'
  | 'Link'
  | 'Modal'
  | 'Pagination'
  | 'PasswordInput'
  | 'PasswordStrengthMeter'
  | 'Popover'
  | 'Radio'
  | 'RadioGroup'
  | 'Select'
  | 'Skeleton'
  | 'Stack'
  | 'Switch'
  | 'Table'
  | 'Tabs'
  | 'Textarea'
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
    usesComponents: ['Card', 'Stack', 'Cluster', 'Avatar', 'Badge', 'Button'],
  },
  {
    slug: 'deals',
    title: 'Deals',
    path: '/mockups/deals',
    blurb: 'Kanban-style pipeline grouped by stage.',
    usesComponents: ['Card', 'Stack', 'Cluster', 'Badge', 'Avatar', 'DropdownMenu'],
  },
  {
    slug: 'contacts',
    title: 'Contacts',
    path: '/mockups/contacts',
    blurb: 'Tabular contact list with status chips and quick filters.',
    usesComponents: [
      'Card',
      'Stack',
      'Cluster',
      'Input',
      'Avatar',
      'Badge',
      'Tabs',
      'DropdownMenu',
    ],
  },
  {
    slug: 'contact-detail',
    title: 'Contact detail',
    path: '/mockups/contacts/:id',
    blurb: 'Single contact view with tabs and activity feed.',
    usesComponents: [
      'Card',
      'Stack',
      'Cluster',
      'Avatar',
      'Badge',
      'Button',
      'Tabs',
      'DropdownMenu',
    ],
  },
  {
    slug: 'members',
    title: 'Members',
    path: '/mockups/members',
    blurb: 'Team & seat management — roles, invites, seat usage.',
    usesComponents: [
      'Card',
      'Stack',
      'Cluster',
      'Avatar',
      'Badge',
      'Button',
      'Input',
      'DropdownMenu',
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
