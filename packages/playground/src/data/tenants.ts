import type { BadgeTone, OptionsPickerOption } from '@eocrm/design-system';

export type TenantState = 'pending' | 'queued' | 'provisioning' | 'active' | 'failed' | 'suspended';

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  state: TenantState;
  stateReason: string | null;
  appVersion: string | null;
  lastMigrationAt: string | null;
  activatedAt: string | null;
  membersCount: number;
  pendingInvitesCount: number;
  lastMemberActiveAt: string | null;
  createdAt: string;
  /** Per-tenant database quota in GB. Null while the DB hasn't been provisioned yet. */
  dbSizeGb: number | null;
  /** Actual storage consumed in GB. Null while no DB exists. */
  usedSpaceGb: number | null;
}

export const stateTone: Record<TenantState, BadgeTone> = {
  active: 'success',
  pending: 'neutral',
  queued: 'info',
  provisioning: 'info',
  failed: 'danger',
  suspended: 'warning',
};

export const stateLabel: Record<TenantState, string> = {
  active: 'Active',
  pending: 'Pending',
  queued: 'Queued',
  provisioning: 'Provisioning',
  failed: 'Failed',
  suspended: 'Suspended',
};

export const stateOptions: OptionsPickerOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'queued', label: 'Queued' },
  { value: 'provisioning', label: 'Provisioning' },
  { value: 'failed', label: 'Failed' },
  { value: 'suspended', label: 'Suspended' },
];

export const sortOptions: OptionsPickerOption[] = [
  { value: 'last-active', label: 'Last active' },
  { value: 'name', label: 'Name (A→Z)' },
  { value: 'created', label: 'Created (newest)' },
  { value: 'members', label: 'Members' },
];

export const sortLabel: Record<string, string> = {
  'last-active': 'Last active',
  name: 'Name',
  created: 'Created',
  members: 'Members',
};

export const tenants: Tenant[] = [
  {
    id: '01HX1ACME0000000000000000',
    slug: 'acme',
    name: 'Acme Inc.',
    state: 'active',
    stateReason: null,
    appVersion: '2026.5.12',
    lastMigrationAt: '2026-05-12T10:14:00Z',
    activatedAt: '2025-09-04T12:00:00Z',
    membersCount: 24,
    pendingInvitesCount: 0,
    lastMemberActiveAt: '2026-05-27T13:52:00Z', // 8 min ago at 14:00 UTC anchor
    createdAt: '2025-09-04T12:00:00Z',
    dbSizeGb: 2,
    usedSpaceGb: 0.48,
  },
  {
    id: '01HX1UMBR0000000000000001',
    slug: 'umbrella-corp',
    name: 'Umbrella Corporation',
    state: 'active',
    stateReason: null,
    appVersion: '2026.5.12',
    lastMigrationAt: '2026-05-12T10:14:00Z',
    activatedAt: '2024-11-21T09:30:00Z',
    membersCount: 142,
    pendingInvitesCount: 3,
    lastMemberActiveAt: '2026-05-27T12:00:00Z',
    createdAt: '2024-11-21T09:30:00Z',
    dbSizeGb: 10,
    usedSpaceGb: 8.2,
  },
  {
    id: '01HX1NORW0000000000000002',
    slug: 'northwind-trading',
    name: 'Northwind Trading',
    state: 'suspended',
    stateReason: 'Manual suspension — billing issue (2026-05-23)',
    appVersion: '2026.5.04',
    lastMigrationAt: '2026-05-04T08:42:00Z',
    activatedAt: '2025-03-12T14:11:00Z',
    membersCount: 8,
    pendingInvitesCount: 0,
    lastMemberActiveAt: '2026-05-23T18:00:00Z',
    createdAt: '2025-03-12T14:11:00Z',
    dbSizeGb: 1,
    usedSpaceGb: 0.145,
  },
  {
    id: '01HX1INIT0000000000000003',
    slug: 'initech',
    name: 'Initech',
    state: 'failed',
    stateReason:
      'Database migration timeout on `add_audit_index` step (last attempt 2026-05-26 14:22 UTC)',
    appVersion: null,
    lastMigrationAt: null,
    activatedAt: null,
    membersCount: 0,
    pendingInvitesCount: 1,
    lastMemberActiveAt: null,
    createdAt: '2026-05-26T14:00:00Z',
    dbSizeGb: null,
    usedSpaceGb: null,
  },
  {
    id: '01HX1GLOB0000000000000004',
    slug: 'globex',
    name: 'Globex Corp',
    state: 'provisioning',
    stateReason: null,
    appVersion: null,
    lastMigrationAt: null,
    activatedAt: null,
    membersCount: 0,
    pendingInvitesCount: 5,
    lastMemberActiveAt: null,
    createdAt: '2026-05-27T13:40:00Z',
    dbSizeGb: null,
    usedSpaceGb: null,
  },
  {
    id: '01HX1HOOL0000000000000005',
    slug: 'hooli',
    name: 'Hooli',
    state: 'active',
    stateReason: null,
    appVersion: '2026.5.12',
    lastMigrationAt: '2026-05-12T10:14:00Z',
    activatedAt: '2025-07-01T10:00:00Z',
    membersCount: 67,
    pendingInvitesCount: 2,
    lastMemberActiveAt: '2026-05-27T13:38:00Z',
    createdAt: '2025-07-01T10:00:00Z',
    dbSizeGb: 5,
    usedSpaceGb: 3.1,
  },
  {
    id: '01HX1VAND0000000000000006',
    slug: 'vandelay',
    name: 'Vandelay Industries',
    state: 'queued',
    stateReason: null,
    appVersion: null,
    lastMigrationAt: null,
    activatedAt: null,
    membersCount: 0,
    pendingInvitesCount: 1,
    lastMemberActiveAt: null,
    createdAt: '2026-05-27T13:55:00Z',
    dbSizeGb: null,
    usedSpaceGb: null,
  },
  {
    id: '01HX1STRK0000000000000007',
    slug: 'stark-industries',
    name: 'Stark Industries',
    state: 'pending',
    stateReason: null,
    appVersion: null,
    lastMigrationAt: null,
    activatedAt: null,
    membersCount: 0,
    pendingInvitesCount: 4,
    lastMemberActiveAt: null,
    createdAt: '2026-05-27T13:58:00Z',
    dbSizeGb: null,
    usedSpaceGb: null,
  },
];

// Anchored "now" so the relative timestamps in mock data render the same on
// every visit (Today = 2026-05-27T14:00:00Z). Without this the rows would
// drift over real time and break the demo's intent.
const NOW = new Date('2026-05-27T14:00:00Z').getTime();

export function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const delta = Math.max(0, NOW - new Date(iso).getTime());
  const m = Math.round(delta / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getTenant(slug: string): Tenant | undefined {
  return tenants.find((t) => t.slug === slug);
}

// ─── Members ──────────────────────────────────────────────────────────────
//
// Per-tenant membership snapshot (truncated — real tenants have many more;
// the detail page shows "Showing 5 of N" + a stub pagination).

export type TenantRole = 'owner' | 'admin' | 'member';

export interface TenantMember {
  id: string;
  name: string;
  email: string;
  role: TenantRole;
  acceptedAt: string | null;
  lastActiveAt: string | null;
}

export const roleLabel: Record<TenantRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

export const roleTone: Record<TenantRole, BadgeTone> = {
  owner: 'purple',
  admin: 'info',
  member: 'neutral',
};

const tenantMembers: Record<string, TenantMember[]> = {
  acme: [
    {
      id: 'u-acme-1',
      name: 'Olivia Chen',
      email: 'olivia@acme.com',
      role: 'owner',
      acceptedAt: '2025-09-04T12:05:00Z',
      lastActiveAt: '2026-05-27T13:52:00Z',
    },
    {
      id: 'u-acme-2',
      name: 'Marcus Hale',
      email: 'marcus@acme.com',
      role: 'admin',
      acceptedAt: '2025-09-10T09:14:00Z',
      lastActiveAt: '2026-05-27T11:20:00Z',
    },
    {
      id: 'u-acme-3',
      name: 'Priya Shah',
      email: 'priya@acme.com',
      role: 'member',
      acceptedAt: '2025-10-22T16:30:00Z',
      lastActiveAt: '2026-05-26T18:00:00Z',
    },
    {
      id: 'u-acme-4',
      name: 'Jonas Weber',
      email: 'jonas@acme.com',
      role: 'member',
      acceptedAt: '2026-01-15T08:05:00Z',
      lastActiveAt: '2026-05-25T09:30:00Z',
    },
    {
      id: 'u-acme-5',
      name: 'Sara Lindgren',
      email: 'sara@acme.com',
      role: 'member',
      acceptedAt: '2026-03-08T11:00:00Z',
      lastActiveAt: '2026-05-27T08:11:00Z',
    },
  ],
  'umbrella-corp': [
    {
      id: 'u-umb-1',
      name: 'Albert Wesker',
      email: 'a.wesker@umbrella.com',
      role: 'owner',
      acceptedAt: '2024-11-21T09:35:00Z',
      lastActiveAt: '2026-05-27T12:00:00Z',
    },
    {
      id: 'u-umb-2',
      name: 'Ada Wong',
      email: 'ada@umbrella.com',
      role: 'admin',
      acceptedAt: '2024-11-22T10:00:00Z',
      lastActiveAt: '2026-05-27T09:48:00Z',
    },
    {
      id: 'u-umb-3',
      name: 'Leon Kennedy',
      email: 'l.kennedy@umbrella.com',
      role: 'member',
      acceptedAt: '2024-12-04T14:22:00Z',
      lastActiveAt: '2026-05-27T07:10:00Z',
    },
    {
      id: 'u-umb-4',
      name: 'Jill Valentine',
      email: 'jill@umbrella.com',
      role: 'member',
      acceptedAt: '2025-01-17T08:00:00Z',
      lastActiveAt: '2026-05-26T16:45:00Z',
    },
    {
      id: 'u-umb-5',
      name: 'Chris Redfield',
      email: 'chris@umbrella.com',
      role: 'member',
      acceptedAt: null, // invited but never accepted — NOT counted toward membersCount
      lastActiveAt: null,
    },
  ],
  'northwind-trading': [
    {
      id: 'u-nw-1',
      name: 'Margaret Peacock',
      email: 'margaret@northwind.com',
      role: 'owner',
      acceptedAt: '2025-03-12T14:15:00Z',
      lastActiveAt: '2026-05-23T18:00:00Z',
    },
    {
      id: 'u-nw-2',
      name: 'Nancy Davolio',
      email: 'nancy@northwind.com',
      role: 'admin',
      acceptedAt: '2025-03-13T10:00:00Z',
      lastActiveAt: '2026-05-22T15:30:00Z',
    },
    {
      id: 'u-nw-3',
      name: 'Andrew Fuller',
      email: 'andrew@northwind.com',
      role: 'member',
      acceptedAt: '2025-04-01T09:00:00Z',
      lastActiveAt: '2026-05-20T11:15:00Z',
    },
  ],
  hooli: [
    {
      id: 'u-hooli-1',
      name: 'Gavin Belson',
      email: 'gavin@hooli.io',
      role: 'owner',
      acceptedAt: '2025-07-01T10:05:00Z',
      lastActiveAt: '2026-05-27T13:38:00Z',
    },
    {
      id: 'u-hooli-2',
      name: 'Hoover',
      email: 'hoover@hooli.io',
      role: 'admin',
      acceptedAt: '2025-07-02T08:30:00Z',
      lastActiveAt: '2026-05-27T12:50:00Z',
    },
    {
      id: 'u-hooli-3',
      name: 'Patrice Smith',
      email: 'patrice@hooli.io',
      role: 'member',
      acceptedAt: '2025-08-14T13:00:00Z',
      lastActiveAt: '2026-05-27T10:00:00Z',
    },
  ],
};

export function getTenantMembers(slug: string): TenantMember[] {
  return tenantMembers[slug] ?? [];
}

// ─── Invitations ──────────────────────────────────────────────────────────

export type InvitationState = 'pending' | 'expired';

export interface TenantInvitation {
  id: string;
  email: string;
  role: TenantRole;
  invitedBy: string;
  sentAt: string;
  expiresAt: string;
}

const tenantInvitations: Record<string, TenantInvitation[]> = {
  'umbrella-corp': [
    {
      id: 'inv-umb-1',
      email: 'rebecca@umbrella.com',
      role: 'member',
      invitedBy: 'Ada Wong',
      sentAt: '2026-05-25T10:00:00Z',
      expiresAt: '2026-06-01T10:00:00Z',
    },
    {
      id: 'inv-umb-2',
      email: 'sherry@umbrella.com',
      role: 'member',
      invitedBy: 'Ada Wong',
      sentAt: '2026-05-24T15:30:00Z',
      expiresAt: '2026-05-31T15:30:00Z',
    },
    {
      id: 'inv-umb-3',
      email: 'claire@umbrella.com',
      role: 'admin',
      invitedBy: 'Albert Wesker',
      sentAt: '2026-05-20T09:00:00Z',
      expiresAt: '2026-05-27T09:00:00Z', // expires today
    },
  ],
  hooli: [
    {
      id: 'inv-hooli-1',
      email: 'jared@hooli.io',
      role: 'member',
      invitedBy: 'Gavin Belson',
      sentAt: '2026-05-26T11:00:00Z',
      expiresAt: '2026-06-02T11:00:00Z',
    },
    {
      id: 'inv-hooli-2',
      email: 'big-head@hooli.io',
      role: 'member',
      invitedBy: 'Hoover',
      sentAt: '2026-05-22T16:00:00Z',
      expiresAt: '2026-05-29T16:00:00Z',
    },
  ],
  initech: [
    {
      id: 'inv-init-1',
      email: 'peter@initech.co',
      role: 'owner',
      invitedBy: 'platform-admin',
      sentAt: '2026-05-26T14:05:00Z',
      expiresAt: '2026-06-02T14:05:00Z',
    },
  ],
  globex: [
    {
      id: 'inv-glob-1',
      email: 'hank@globex.com',
      role: 'owner',
      invitedBy: 'platform-admin',
      sentAt: '2026-05-27T13:40:00Z',
      expiresAt: '2026-06-03T13:40:00Z',
    },
    {
      id: 'inv-glob-2',
      email: 'tina@globex.com',
      role: 'admin',
      invitedBy: 'platform-admin',
      sentAt: '2026-05-27T13:41:00Z',
      expiresAt: '2026-06-03T13:41:00Z',
    },
    {
      id: 'inv-glob-3',
      email: 'milhouse@globex.com',
      role: 'member',
      invitedBy: 'platform-admin',
      sentAt: '2026-05-27T13:42:00Z',
      expiresAt: '2026-06-03T13:42:00Z',
    },
    {
      id: 'inv-glob-4',
      email: 'apu@globex.com',
      role: 'member',
      invitedBy: 'platform-admin',
      sentAt: '2026-05-27T13:43:00Z',
      expiresAt: '2026-06-03T13:43:00Z',
    },
    {
      id: 'inv-glob-5',
      email: 'moe@globex.com',
      role: 'member',
      invitedBy: 'platform-admin',
      sentAt: '2026-05-27T13:44:00Z',
      expiresAt: '2026-06-03T13:44:00Z',
    },
  ],
  vandelay: [
    {
      id: 'inv-van-1',
      email: 'george@vandelay.com',
      role: 'owner',
      invitedBy: 'platform-admin',
      sentAt: '2026-05-27T13:55:00Z',
      expiresAt: '2026-06-03T13:55:00Z',
    },
  ],
  'stark-industries': [
    {
      id: 'inv-stark-1',
      email: 'tony@stark.com',
      role: 'owner',
      invitedBy: 'platform-admin',
      sentAt: '2026-05-27T13:58:00Z',
      expiresAt: '2026-06-03T13:58:00Z',
    },
    {
      id: 'inv-stark-2',
      email: 'pepper@stark.com',
      role: 'admin',
      invitedBy: 'platform-admin',
      sentAt: '2026-05-27T13:59:00Z',
      expiresAt: '2026-06-03T13:59:00Z',
    },
    {
      id: 'inv-stark-3',
      email: 'happy@stark.com',
      role: 'member',
      invitedBy: 'platform-admin',
      sentAt: '2026-05-27T14:00:00Z',
      expiresAt: '2026-06-03T14:00:00Z',
    },
    {
      id: 'inv-stark-4',
      email: 'rhodey@stark.com',
      role: 'member',
      invitedBy: 'platform-admin',
      sentAt: '2026-05-27T14:01:00Z',
      expiresAt: '2026-06-03T14:01:00Z',
    },
  ],
};

export function getTenantInvitations(slug: string): TenantInvitation[] {
  return tenantInvitations[slug] ?? [];
}

export function invitationState(iso: string): InvitationState {
  return new Date(iso).getTime() <= NOW ? 'expired' : 'pending';
}

/** Format a GB number for display ("0.48 GB", "10 GB"). Returns "—" for null. */
export function formatGb(gb: number | null): string {
  if (gb == null) return '—';
  if (gb >= 1) return `${gb.toLocaleString('en-US', { maximumFractionDigits: 1 })} GB`;
  return `${Math.round(gb * 1024)} MB`;
}

/** Used-space tone for a Progress bar: warning at >75%, danger at >90%. */
export function usagePercent(used: number | null, total: number | null): number | null {
  if (used == null || total == null || total <= 0) return null;
  return Math.round((used / total) * 100);
}

export type TenantAction =
  | 'view'
  | 'suspend'
  | 'unsuspend'
  | 'retry'
  | 'edit'
  | 'cancel'
  | 'view-error';

export function tenantActions(state: TenantState): TenantAction[] {
  switch (state) {
    case 'active':
      return ['view', 'suspend', 'edit'];
    case 'suspended':
      return ['view', 'unsuspend', 'edit'];
    case 'failed':
      return ['view', 'retry', 'view-error'];
    case 'pending':
    case 'queued':
      return ['view', 'retry', 'cancel'];
    case 'provisioning':
      return ['view'];
  }
}

export const actionLabel: Record<TenantAction, string> = {
  view: 'View',
  suspend: 'Suspend',
  unsuspend: 'Unsuspend',
  retry: 'Retry provisioning',
  edit: 'Edit metadata',
  cancel: 'Cancel',
  'view-error': 'View error details',
};
