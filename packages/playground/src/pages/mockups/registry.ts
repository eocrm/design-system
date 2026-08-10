// packages/playground/src/pages/mockups/registry.ts

export type ComponentName =
  | 'Accordion'
  | 'Alert'
  | 'Avatar'
  | 'Badge'
  | 'BrandIcon'
  | 'Breadcrumb'
  | 'Button'
  | 'SocialButton'
  | 'ButtonGroup'
  | 'Calendar'
  | 'Card'
  | 'Checkbox'
  | 'CircularProgress'
  | 'Cluster'
  | 'Code'
  | 'ColorPicker'
  | 'ConfirmationPopover'
  | 'Constrain'
  | 'CursorPagination'
  | 'DashboardCanvas'
  | 'DataTable'
  | 'DatePicker'
  | 'DateRangePicker'
  | 'DefinitionList'
  | 'Divider'
  | 'Dot'
  | 'Drawer'
  | 'DropdownMenu'
  | 'EmojiPicker'
  | 'EmptyState'
  | 'EntityChip'
  | 'ErrorState'
  | 'Field'
  | 'FileUpload'
  | 'FilterChip'
  | 'FlowCanvas'
  | 'FormRow'
  | 'FormSection'
  | 'IconPicker'
  | 'IconTile'
  | 'Image'
  | 'ImageCrop'
  | 'Indent'
  | 'Grid'
  | 'Masonry'
  | 'MediaTile'
  | 'InlineDatePicker'
  | 'InlineDateRangePicker'
  | 'Input'
  | 'Kanban'
  | 'Kbd'
  | 'Lightbox'
  | 'LiquidEditor'
  | 'Link'
  | 'LinkCard'
  | 'Logo'
  | 'Modal'
  | 'OptionsPicker'
  | 'Page'
  | 'PageHeader'
  | 'Pagination'
  | 'Palette'
  | 'PasswordInput'
  | 'PasswordStrengthMeter'
  | 'PhoneInput'
  | 'PersonDisplay'
  | 'Popover'
  | 'Progress'
  | 'Radio'
  | 'RadioGroup'
  | 'Rail'
  | 'RichText'
  | 'RichTextEditor'
  | 'Screen'
  | 'Select'
  | 'Skeleton'
  | 'Slider'
  | 'Sortable'
  | 'SortableGroup'
  | 'Split'
  | 'Stack'
  | 'StatusMenu'
  | 'Sticky'
  | 'Switch'
  | 'Table'
  | 'Tabs'
  | 'Text'
  | 'Textarea'
  | 'Thread'
  | 'TimeField'
  | 'Timeline'
  | 'Title'
  | 'Toast'
  | 'Tooltip'
  | 'TopBar';

export interface MockupEntry {
  slug: string;
  title: string;
  path: string;
  /** Concrete href for cross-links when `path` is parameterized (e.g. has `:id`). */
  examplePath?: string;
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
      'IconTile',
      'Link',
      'Page',
      'PageHeader',
      'PersonDisplay',
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
      'Page',
      'PageHeader',
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
      'Badge',
      'Button',
      'Card',
      'Checkbox',
      'Cluster',
      'Constrain',
      'DropdownMenu',
      'EmptyState',
      'Input',
      'Link',
      'Page',
      'PageHeader',
      'PersonDisplay',
      'Stack',
      'Table',
      'Text',
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
      'Page',
      'PageHeader',
      'PersonDisplay',
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
      'Badge',
      'Button',
      'Card',
      'Cluster',
      'Constrain',
      'DropdownMenu',
      'IconTile',
      'Input',
      'Link',
      'Page',
      'PageHeader',
      'PersonDisplay',
      'Progress',
      'Stack',
      'Table',
      'Tabs',
      'Text',
    ],
  },
  {
    slug: 'member-profile',
    title: 'Member profile',
    path: '/mockups/members/:id',
    examplePath: '/mockups/members/u-1',
    blurb: 'Member profile with a drawer-based edit form (Field / FormRow / FormSection).',
    usesComponents: [
      'Avatar',
      'Badge',
      'Breadcrumb',
      'Button',
      'Card',
      'Cluster',
      'DefinitionList',
      'Drawer',
      'Field',
      'FormRow',
      'FormSection',
      'Input',
      'Page',
      'PageHeader',
      'Select',
      'Stack',
      'Switch',
      'Text',
      'Textarea',
    ],
  },
  {
    slug: 'audit',
    title: 'Audit log',
    path: '/mockups/audit',
    blurb: 'Tenant-wide event log with filter chips and expandable detail rows.',
    usesComponents: [
      'Badge',
      'Button',
      'Cluster',
      'Code',
      'DataTable',
      'DefinitionList',
      'Divider',
      'FilterChip',
      'OptionsPicker',
      'Page',
      'PageHeader',
      'PersonDisplay',
      'Stack',
      'Text',
      'Tooltip',
    ],
  },
  {
    slug: 'tenants',
    title: 'Tenants',
    path: '/mockups/tenants',
    blurb:
      'Superadmin list of platform tenants — state, members, app version, storage usage, row actions.',
    usesComponents: [
      'Badge',
      'Button',
      'Card',
      'Cluster',
      'Code',
      'DropdownMenu',
      'EmptyState',
      'Input',
      'Link',
      'OptionsPicker',
      'Page',
      'PageHeader',
      'Pagination',
      'PersonDisplay',
      'Progress',
      'Stack',
      'Table',
      'Text',
      'Tooltip',
    ],
  },
  {
    slug: 'tenant-detail',
    title: 'Tenant detail',
    path: '/mockups/tenants/:slug',
    blurb:
      'Single tenant view with tabs — system info, members, invitations. State, storage, system metadata, per-member actions.',
    usesComponents: [
      'Avatar',
      'Badge',
      'Breadcrumb',
      'Button',
      'Card',
      'Cluster',
      'Code',
      'DefinitionList',
      'DropdownMenu',
      'EmptyState',
      'Grid',
      'Page',
      'PageHeader',
      'PersonDisplay',
      'Progress',
      'Stack',
      'Table',
      'Tabs',
      'Text',
      'Title',
      'Tooltip',
    ],
  },
  {
    slug: 'system-settings',
    title: 'System settings',
    path: '/mockups/system-settings',
    blurb:
      'Superadmin global settings — data retention, tenant provisioning defaults, security policy, maintenance toggles.',
    usesComponents: [
      'Badge',
      'Button',
      'Card',
      'Cluster',
      'Code',
      'Divider',
      'Input',
      'Page',
      'PageHeader',
      'Select',
      'Stack',
      'Switch',
      'Text',
      'Title',
      'Tooltip',
    ],
  },
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
  {
    slug: 'roles',
    title: 'Edit role',
    path: '/mockups/roles',
    blurb:
      'Control-plane RBAC role editor — name, tabbed Permissions / Assigned operators, searchable grouped permission checkboxes with per-group select-all.',
    usesComponents: [
      'Badge',
      'Breadcrumb',
      'Button',
      'Card',
      'Checkbox',
      'Cluster',
      'ConfirmationPopover',
      'Constrain',
      'Divider',
      'EmptyState',
      'Field',
      'Masonry',
      'Input',
      'Page',
      'PageHeader',
      'Stack',
      'Tabs',
      'Text',
    ],
  },
  {
    slug: 'login',
    title: 'Login',
    path: '/mockups/login',
    blurb:
      'Full-screen eocrm sign-in — identifier-first two-step (email → password) morphing card, Google SSO, error states.',
    usesComponents: [
      'Alert',
      'Button',
      'Card',
      'Checkbox',
      'Cluster',
      'Constrain',
      'Divider',
      'Input',
      'Link',
      'Logo',
      'PasswordInput',
      'Screen',
      'SocialButton',
      'Stack',
      'Text',
      'Title',
    ],
  },
  {
    slug: '404',
    title: 'Not found',
    path: '/mockups/404',
    blurb: '404 page — the not-found state, shown in-app and as a standalone full-bleed page.',
    usesComponents: ['Button', 'Cluster', 'ErrorState', 'Link', 'Screen', 'Stack', 'Text'],
  },
  {
    slug: 'error',
    title: 'Error',
    path: '/mockups/error',
    blurb:
      'Error-boundary fallback — "something went wrong", shown in-app and as a standalone page.',
    usesComponents: ['Button', 'Cluster', 'ErrorState', 'Link', 'Screen', 'Stack', 'Text'],
  },
] as const satisfies readonly MockupEntry[];

export type MockupSlug = (typeof MOCKUPS)[number]['slug'];

export function getMockup(slug: MockupSlug): MockupEntry | undefined {
  return MOCKUPS.find((m) => m.slug === slug);
}

export function mockupsUsing(component: ComponentName): readonly MockupEntry[] {
  return MOCKUPS.filter((m) => (m.usesComponents as readonly ComponentName[]).includes(component));
}
