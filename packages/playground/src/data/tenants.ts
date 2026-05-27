import type { BadgeTone } from '@eocrm/design-system';

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
