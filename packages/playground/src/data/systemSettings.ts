// System-level settings for the EOCRM platform. Two real keys come from
// EOCRM (audit.retention_days, notification.retention_days — see
// `/Users/dpws/projects/eocrm/api/app/Modules/Platform/Settings/Services/DefaultSettings.php`);
// the rest are plausible additions for a richer superadmin mockup.

export interface NumberSetting {
  key: string;
  label: string;
  description: string;
  type: 'number';
  defaultValue: number;
  currentValue: number;
  unit?: string;
  min?: number;
  max?: number;
}

export interface BooleanSetting {
  key: string;
  label: string;
  description: string;
  type: 'boolean';
  defaultValue: boolean;
  currentValue: boolean;
}

export interface StringSetting {
  key: string;
  label: string;
  description: string;
  type: 'string';
  defaultValue: string;
  currentValue: string;
  placeholder?: string;
}

export interface SelectSetting {
  key: string;
  label: string;
  description: string;
  type: 'select';
  defaultValue: string;
  currentValue: string;
  options: { value: string; label: string }[];
}

export type SettingDef = NumberSetting | BooleanSetting | StringSetting | SelectSetting;

export interface SettingsSection {
  id: string;
  title: string;
  description: string;
  settings: SettingDef[];
}

export const settingsSections: SettingsSection[] = [
  {
    id: 'retention',
    title: 'Data retention',
    description:
      'How long the platform keeps logs and notifications before nightly cleanup deletes them.',
    settings: [
      {
        key: 'audit.retention_days',
        label: 'Audit log retention',
        description:
          'Days to retain audit log entries. Cleanup runs nightly at 03:00 UTC. Minimum 7 days, maximum 10 years.',
        type: 'number',
        defaultValue: 180,
        currentValue: 365,
        unit: 'days',
        min: 7,
        max: 3650,
      },
      {
        key: 'notification.retention_days',
        label: 'Notification retention',
        description: 'Days to retain delivered in-app notifications before they’re purged.',
        type: 'number',
        defaultValue: 90,
        currentValue: 90,
        unit: 'days',
        min: 7,
        max: 3650,
      },
      {
        key: 'tenant.archive_grace_days',
        label: 'Tenant archive grace period',
        description:
          'When a tenant is archived, this many days must pass before its database is permanently destroyed.',
        type: 'number',
        defaultValue: 30,
        currentValue: 60,
        unit: 'days',
        min: 7,
        max: 180,
      },
    ],
  },
  {
    id: 'provisioning',
    title: 'Tenant provisioning defaults',
    description: 'Applied to new tenants at creation time. Existing tenants are unaffected.',
    settings: [
      {
        key: 'tenant.default_db_quota_gb',
        label: 'Default DB quota',
        description: 'Starting database quota for newly provisioned tenants.',
        type: 'number',
        defaultValue: 5,
        currentValue: 10,
        unit: 'GB',
        min: 1,
        max: 500,
      },
      {
        key: 'tenant.default_seat_limit',
        label: 'Default seat limit',
        description: 'Maximum active members included in the default plan.',
        type: 'number',
        defaultValue: 10,
        currentValue: 25,
        unit: 'seats',
        min: 1,
        max: 10000,
      },
      {
        key: 'tenant.auto_approve_provisioning',
        label: 'Auto-approve new tenants',
        description:
          'When enabled, provisioning starts immediately after signup. When disabled, a superadmin must manually approve each tenant.',
        type: 'boolean',
        defaultValue: true,
        currentValue: true,
      },
      {
        key: 'tenant.default_region',
        label: 'Default data region',
        description: 'Which regional cluster new tenants are provisioned into by default.',
        type: 'select',
        defaultValue: 'eu-west-1',
        currentValue: 'eu-west-1',
        options: [
          { value: 'eu-west-1', label: 'Europe (Ireland)' },
          { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
          { value: 'us-east-1', label: 'US East (Virginia)' },
          { value: 'us-west-2', label: 'US West (Oregon)' },
          { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
        ],
      },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Authentication, session, and password policy applied across all tenants.',
    settings: [
      {
        key: 'security.session_timeout_minutes',
        label: 'Session timeout',
        description: 'Idle minutes before an authenticated session is invalidated.',
        type: 'number',
        defaultValue: 60,
        currentValue: 30,
        unit: 'minutes',
        min: 5,
        max: 1440,
      },
      {
        key: 'security.password_min_length',
        label: 'Password minimum length',
        description:
          'Enforced on signup and password change. Existing passwords are not re-validated until next change.',
        type: 'number',
        defaultValue: 8,
        currentValue: 12,
        unit: 'characters',
        min: 8,
        max: 64,
      },
      {
        key: 'security.enforce_mfa_owners',
        label: 'Enforce MFA for tenant owners',
        description:
          'When enabled, tenant owners must enroll an authenticator app before accessing their workspace. Other members are unaffected.',
        type: 'boolean',
        defaultValue: false,
        currentValue: true,
      },
    ],
  },
  {
    id: 'maintenance',
    title: 'Maintenance & notifications',
    description: 'Platform-wide operational toggles and the sender identity used for system email.',
    settings: [
      {
        key: 'maintenance.read_only',
        label: 'Read-only mode',
        description:
          'When enabled, every tenant is forced into read-only state regardless of plan. Use during major migrations or incidents. Tenant users see a banner explaining the freeze.',
        type: 'boolean',
        defaultValue: false,
        currentValue: false,
      },
      {
        key: 'notification.sender_email',
        label: 'Notification sender',
        description:
          'From-address used for system email (invitations, password resets, provisioning notifications).',
        type: 'string',
        defaultValue: 'noreply@eocrm.example',
        currentValue: 'platform@eocrm.example',
        placeholder: 'noreply@example.com',
      },
    ],
  },
];

export const lastUpdatedBy = 'Olivia Chen';
export const lastUpdatedAt = '2026-05-23T14:22:00Z';
