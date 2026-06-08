// Control-plane RBAC permissions for the "Edit role" mockup. Mirrors the eocrm
// control-plane permission catalogue (identities / operators / roles / tenants).

export interface Permission {
  id: string;
  label: string;
}

export interface PermissionGroup {
  id: string;
  label: string;
  permissions: Permission[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'identities',
    label: 'Identities',
    permissions: [{ id: 'identities.view', label: 'View identities (users).' }],
  },
  {
    id: 'operators',
    label: 'Operators',
    permissions: [
      {
        id: 'operators.manage',
        label: 'Add, change roles for, and remove control-plane operators.',
      },
      { id: 'operators.view', label: 'View control-plane operators.' },
    ],
  },
  {
    id: 'roles',
    label: 'Roles',
    permissions: [{ id: 'roles.manage', label: 'Create, edit, and delete roles.' }],
  },
  {
    id: 'tenants',
    label: 'Tenants',
    permissions: [
      { id: 'tenants.provision', label: 'Provision new tenants.' },
      { id: 'tenants.delete', label: 'Soft-delete tenants.' },
      { id: 'tenants.suspend', label: 'Suspend / reactivate tenants.' },
      { id: 'tenants.view', label: 'List and view tenants.' },
    ],
  },
];

/** The Support role ships with the tenant provision / suspend / view grants. */
export const INITIAL_SELECTED: readonly string[] = [
  'tenants.provision',
  'tenants.suspend',
  'tenants.view',
];
