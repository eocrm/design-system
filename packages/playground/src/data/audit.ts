import type { PaletteColor } from '@eocrm/design-system';

export type AuditActorRef = { id: string; name: string; email: string };
export type AuditTenantRef = { id: string; slug: string; name: string };

export type AuditEntry = {
  id: string;
  occurred_at: string; // ISO 8601
  actor: AuditActorRef | null;
  impersonator: AuditActorRef | null;
  tenant: AuditTenantRef | null;
  event: string; // dotted: 'role.assigned'
  entity_type: string | null;
  entity_id: string | null;
  changes: Record<string, { from: unknown; to: unknown }> | null;
  context: Record<string, unknown>;
};

const sarah: AuditActorRef = { id: 'u_super', name: 'Sarah Lin', email: 'sarah.lin@eocrm.io' };
const mei: AuditActorRef = { id: 'u_mei', name: 'Mei Kim', email: 'mei.kim@eocrm.io' };
const alex: AuditActorRef = { id: 'u_alex', name: 'Alex Rivera', email: 'alex.rivera@acme.io' };
const jordan: AuditActorRef = {
  id: 'u_jordan',
  name: 'Jordan Park',
  email: 'jordan.park@northwind.io',
};
const sam: AuditActorRef = { id: 'u_sam', name: 'Sam Chen', email: 'sam.chen@hooli.com' };
const maya: AuditActorRef = { id: 'u_maya', name: 'Maya Owens', email: 'maya.owens@stark.co' };

const acme: AuditTenantRef = { id: 't_acme', slug: 'acme', name: 'Acme Inc.' };
const beta: AuditTenantRef = { id: 't_beta', slug: 'beta', name: 'Beta Logistics' };
const hooli: AuditTenantRef = { id: 't_hooli', slug: 'hooli', name: 'Hooli' };
const stark: AuditTenantRef = { id: 't_stark', slug: 'stark', name: 'Stark Industries' };

export const auditEntries: AuditEntry[] = [
  {
    id: 'evt_01HZQ8XK3F2N9G7M4P5R6S7T8U',
    occurred_at: '2026-05-26T11:42:18Z',
    actor: sarah,
    impersonator: null,
    tenant: acme,
    event: 'role.assigned',
    entity_type: 'membership',
    entity_id: 'm_8X3K2P',
    changes: { role: { from: 'member', to: 'admin' } },
    context: { target_user_id: 'u_mei', target_email: 'mei.kim@eocrm.io', via: 'web' },
  },
  {
    id: 'evt_01HZQ8VR9Y8Z7X6W5V4U3T2S1R',
    occurred_at: '2026-05-26T10:21:04Z',
    actor: mei,
    impersonator: sarah,
    tenant: acme,
    event: 'user.created',
    entity_type: 'user',
    entity_id: 'u_8K2P9D',
    changes: {
      email: { from: null, to: 'diego.alvarez@acme.io' },
      name: { from: null, to: 'Diego Alvarez' },
      locale: { from: null, to: 'en-US' },
    },
    context: { source: 'admin_create', email_sent: true },
  },
  {
    id: 'evt_01HZQ8Q8K1L2M3N4P5Q6R7S8T9',
    occurred_at: '2026-05-26T09:48:55Z',
    actor: sarah,
    impersonator: null,
    tenant: acme,
    event: 'role.updated',
    entity_type: 'role',
    entity_id: 'r_admin',
    changes: {
      permissions: {
        from: ['contacts.view', 'contacts.edit', 'deals.view'],
        to: [
          'contacts.view',
          'contacts.edit',
          'contacts.delete',
          'deals.view',
          'deals.edit',
          'audit.view',
        ],
      },
    },
    context: { role_name: 'Admin' },
  },
  {
    id: 'evt_01HZQ8T1B7C2D8E3F9G4H0J5K6',
    occurred_at: '2026-05-26T08:47:11Z',
    actor: alex,
    impersonator: null,
    tenant: acme,
    event: 'auth.login_succeeded',
    entity_type: 'user',
    entity_id: 'u_alex',
    changes: null,
    context: { ip: '203.0.113.44', user_agent: 'Chrome/124 macOS', mfa: true, via: 'password' },
  },
  {
    id: 'evt_01HZQ8U4M3N2P1Q0R9S8T7U6V5',
    occurred_at: '2026-05-26T07:58:42Z',
    actor: null,
    impersonator: null,
    tenant: beta,
    event: 'invitation.expired',
    entity_type: 'invitation',
    entity_id: 'inv_9X2K3M',
    changes: { status: { from: 'pending', to: 'expired' } },
    context: { reason: 'ttl_elapsed', email: 'pending@beta.io', expired_after_hours: 168 },
  },
  {
    id: 'evt_01HZQ8R9Z8Y7X6W5V4U3T2S1Q0',
    occurred_at: '2026-05-26T06:15:03Z',
    actor: null,
    impersonator: null,
    tenant: null,
    event: 'system_setting.updated',
    entity_type: 'system_setting',
    entity_id: 'feature_flags',
    changes: { 'flags.audit_v2': { from: false, to: true } },
    context: { via: 'cli', operator: 'deploy@bot' },
  },
  {
    id: 'evt_01HZQ7P3K8N9M2L4Q5R6T7Y8V0',
    occurred_at: '2026-05-25T22:14:09Z',
    actor: jordan,
    impersonator: null,
    tenant: hooli,
    event: 'contact.deleted',
    entity_type: 'contact',
    entity_id: 'c_4F2G7H',
    changes: { deleted_at: { from: null, to: '2026-05-25T22:14:09Z' } },
    context: { reason: 'requested_by_subject', contact_name: 'Russ Hanneman' },
  },
  {
    id: 'evt_01HZQ7M2L8K9N3P4Q5R6T7Y8U1',
    occurred_at: '2026-05-25T18:03:21Z',
    actor: sam,
    impersonator: null,
    tenant: hooli,
    event: 'deal.won',
    entity_type: 'deal',
    entity_id: 'd_9P2K8X',
    changes: { stage: { from: 'proposal', to: 'won' }, amount: { from: 24000, to: 28500 } },
    context: { contact_id: 'c_2K4L9M', deal_name: 'Q3 expansion — analytics seats' },
  },
  {
    id: 'evt_01HZQ7K9N1M2P3Q4R5T6U7V8W0',
    occurred_at: '2026-05-25T15:42:55Z',
    actor: maya,
    impersonator: null,
    tenant: stark,
    event: 'auth.mfa_enabled',
    entity_type: 'user',
    entity_id: 'u_maya',
    changes: { mfa_enabled: { from: false, to: true } },
    context: { method: 'totp', backup_codes_generated: 8 },
  },
  {
    id: 'evt_01HZQ7H8J7K6L5M4N3P2Q1R0S9',
    occurred_at: '2026-05-25T11:11:48Z',
    actor: { id: 'u_sys', name: 'System', email: 'system@eocrm.io' },
    impersonator: null,
    tenant: stark,
    event: 'auth.login_failed',
    entity_type: 'user',
    entity_id: 'u_unknown',
    changes: null,
    context: {
      ip: '198.51.100.7',
      user_agent: 'curl/7.88',
      reason: 'invalid_credentials',
      attempts_last_hour: 14,
    },
  },
];

import type { OptionsPickerGroup, OptionsPickerOption } from '@eocrm/design-system';

/**
 * Hand-rolled audit event catalog for the mockup's Event picker. Covers the
 * namespaces present in `auditEntries` plus a couple of common siblings to
 * make the picker feel populated.
 */
/**
 * Single source of truth: event namespace → palette color. Used in BOTH
 * the Event-filter OptionsPicker (group header dot + checkbox fills) AND
 * the DataTable Event-column badges (stripe color), so a given namespace
 * reads as the same color everywhere on the page. Add a new namespace
 * here when introducing new events.
 */
export const EVENT_NAMESPACE_COLOR: Record<string, PaletteColor> = {
  auth: 'blue',
  role: 'violet',
  user: 'teal',
  invitation: 'amber',
  contact: 'emerald',
  deal: 'gold',
  system_setting: 'slate',
};

/**
 * Looks up the palette color for an event name (`auth.login_succeeded` →
 * `'blue'`). Falls back to `stone` for unknown namespaces so the badge
 * still renders something legible. Replaces the older tone-based
 * `eventTone()` — per-event tone variation traded for cross-page
 * namespace consistency.
 */
export function eventColor(event: string): PaletteColor {
  const namespace = event.split('.')[0] ?? '';
  return EVENT_NAMESPACE_COLOR[namespace] ?? 'stone';
}

export const eventCatalog: OptionsPickerGroup[] = [
  {
    id: 'auth',
    label: 'Authentication',
    color: EVENT_NAMESPACE_COLOR.auth,
    hint: 'auth.*',
    options: [
      { value: 'auth.login_succeeded', label: 'login_succeeded' },
      { value: 'auth.login_failed', label: 'login_failed' },
      { value: 'auth.logout', label: 'logout' },
      { value: 'auth.mfa_enabled', label: 'mfa_enabled' },
      { value: 'auth.mfa_disabled', label: 'mfa_disabled' },
      { value: 'auth.password_reset_requested', label: 'password_reset_requested' },
      { value: 'auth.password_reset_completed', label: 'password_reset_completed' },
    ],
  },
  {
    id: 'role',
    label: 'Roles',
    color: EVENT_NAMESPACE_COLOR.role,
    hint: 'role.*',
    options: [
      { value: 'role.assigned', label: 'assigned' },
      { value: 'role.updated', label: 'updated' },
      { value: 'role.revoked', label: 'revoked' },
    ],
  },
  {
    id: 'user',
    label: 'Users',
    color: EVENT_NAMESPACE_COLOR.user,
    hint: 'user.*',
    options: [
      { value: 'user.created', label: 'created' },
      { value: 'user.updated', label: 'updated' },
      { value: 'user.deleted', label: 'deleted' },
    ],
  },
  {
    id: 'invitation',
    label: 'Invitations',
    color: EVENT_NAMESPACE_COLOR.invitation,
    hint: 'invitation.*',
    options: [
      { value: 'invitation.sent', label: 'sent' },
      { value: 'invitation.accepted', label: 'accepted' },
      { value: 'invitation.expired', label: 'expired' },
    ],
  },
  {
    id: 'contact',
    label: 'Contacts',
    color: EVENT_NAMESPACE_COLOR.contact,
    hint: 'contact.*',
    options: [
      { value: 'contact.created', label: 'created' },
      { value: 'contact.updated', label: 'updated' },
      { value: 'contact.deleted', label: 'deleted' },
    ],
  },
  {
    id: 'deal',
    label: 'Deals',
    color: EVENT_NAMESPACE_COLOR.deal,
    hint: 'deal.*',
    options: [
      { value: 'deal.created', label: 'created' },
      { value: 'deal.stage_changed', label: 'stage_changed' },
      { value: 'deal.won', label: 'won' },
      { value: 'deal.lost', label: 'lost' },
    ],
  },
  {
    id: 'system_setting',
    label: 'System settings',
    color: EVENT_NAMESPACE_COLOR.system_setting,
    hint: 'system_setting.*',
    options: [{ value: 'system_setting.updated', label: 'updated' }],
  },
];

export const tenantOptions: OptionsPickerOption[] = [
  { value: 'acme', label: 'acme' },
  { value: 'beta', label: 'beta' },
  { value: 'hooli', label: 'hooli' },
  { value: 'stark', label: 'stark' },
];
