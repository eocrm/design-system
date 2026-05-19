// packages/playground/src/pages/mockups/registry.ts

export type ComponentName =
  | 'Button'
  | 'Input'
  | 'Card'
  | 'Stack'
  | 'Cluster'
  | 'Avatar'
  | 'Badge'
  | 'Tabs';

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
    usesComponents: ['Card', 'Stack', 'Cluster', 'Badge', 'Avatar'],
  },
  {
    slug: 'contacts',
    title: 'Contacts',
    path: '/mockups/contacts',
    blurb: 'Tabular contact list with status chips and quick filters.',
    usesComponents: ['Card', 'Stack', 'Cluster', 'Input', 'Avatar', 'Badge', 'Tabs'],
  },
  {
    slug: 'contact-detail',
    title: 'Contact detail',
    path: '/mockups/contacts/:id',
    blurb: 'Single contact view with tabs and activity feed.',
    usesComponents: ['Card', 'Stack', 'Cluster', 'Avatar', 'Badge', 'Button', 'Tabs'],
  },
  {
    slug: 'members',
    title: 'Members',
    path: '/mockups/members',
    blurb: 'Team & seat management — roles, invites, seat usage.',
    usesComponents: ['Card', 'Stack', 'Cluster', 'Avatar', 'Badge', 'Button', 'Input'],
  },
] as const satisfies readonly MockupEntry[];

export type MockupSlug = (typeof MOCKUPS)[number]['slug'];

export function getMockup(slug: MockupSlug): MockupEntry | undefined {
  return MOCKUPS.find((m) => m.slug === slug);
}

export function mockupsUsing(component: ComponentName): MockupEntry[] {
  return MOCKUPS.filter((m) => m.usesComponents.includes(component as any)) as MockupEntry[];
}
