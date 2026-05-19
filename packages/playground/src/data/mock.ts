import type { BadgeTone } from '@eocrm/design-system';

export type DealStage = 'lead' | 'qualified' | 'proposal' | 'won';

export interface Deal {
  id: string;
  title: string;
  company: string;
  amount: number;
  stage: DealStage;
  owner: string;
  tags: { label: string; tone: BadgeTone }[];
}

export const dealStages: { id: DealStage; label: string }[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'won', label: 'Won' },
];

export const deals: Deal[] = [
  {
    id: 'D-201',
    title: 'Acme team plan upgrade',
    company: 'Acme Inc.',
    amount: 12000,
    stage: 'lead',
    owner: 'Alex Rivera',
    tags: [{ label: 'Enterprise', tone: 'purple' }],
  },
  {
    id: 'D-202',
    title: 'Q3 expansion — analytics seats',
    company: 'Northwind',
    amount: 4800,
    stage: 'lead',
    owner: 'Jordan Park',
    tags: [{ label: 'Expansion', tone: 'info' }],
  },
  {
    id: 'D-203',
    title: 'Pilot conversion',
    company: 'Globex',
    amount: 2400,
    stage: 'qualified',
    owner: 'Sam Chen',
    tags: [{ label: 'SMB', tone: 'neutral' }],
  },
  {
    id: 'D-204',
    title: 'Annual renewal',
    company: 'Initech',
    amount: 18000,
    stage: 'qualified',
    owner: 'Alex Rivera',
    tags: [
      { label: 'Renewal', tone: 'success' },
      { label: 'Priority', tone: 'warning' },
    ],
  },
  {
    id: 'D-205',
    title: 'Proposal — multi-region rollout',
    company: 'Stark Industries',
    amount: 36000,
    stage: 'proposal',
    owner: 'Maya Owens',
    tags: [{ label: 'Enterprise', tone: 'purple' }],
  },
  {
    id: 'D-206',
    title: 'Add-on: API gateway',
    company: 'Wayne Co.',
    amount: 5600,
    stage: 'proposal',
    owner: 'Jordan Park',
    tags: [{ label: 'Upsell', tone: 'info' }],
  },
  {
    id: 'D-207',
    title: 'Contract signed',
    company: 'Hooli',
    amount: 9400,
    stage: 'won',
    owner: 'Sam Chen',
    tags: [{ label: 'New logo', tone: 'success' }],
  },
];

export type ContactStatus = 'active' | 'lead' | 'churned';

export interface Contact {
  id: string;
  name: string;
  email: string;
  company: string;
  title: string;
  status: ContactStatus;
  lastActivity: string;
  owner: string;
}

export const statusTone: Record<ContactStatus, BadgeTone> = {
  active: 'success',
  lead: 'info',
  churned: 'danger',
};

export const statusLabel: Record<ContactStatus, string> = {
  active: 'Active',
  lead: 'Lead',
  churned: 'Churned',
};

export const contacts: Contact[] = [
  {
    id: 'c-1001',
    name: 'Priya Shah',
    email: 'priya@acme.com',
    company: 'Acme Inc.',
    title: 'VP Engineering',
    status: 'active',
    lastActivity: '2h ago',
    owner: 'Alex Rivera',
  },
  {
    id: 'c-1002',
    name: 'Marcus Lin',
    email: 'm.lin@northwind.co',
    company: 'Northwind',
    title: 'Head of Ops',
    status: 'lead',
    lastActivity: 'Yesterday',
    owner: 'Jordan Park',
  },
  {
    id: 'c-1003',
    name: 'Diana Okafor',
    email: 'diana@globex.io',
    company: 'Globex',
    title: 'Founder',
    status: 'active',
    lastActivity: '3d ago',
    owner: 'Sam Chen',
  },
  {
    id: 'c-1004',
    name: 'Tomás Reyes',
    email: 'tomas@initech.com',
    company: 'Initech',
    title: 'CTO',
    status: 'active',
    lastActivity: '1w ago',
    owner: 'Alex Rivera',
  },
  {
    id: 'c-1005',
    name: 'Ola Berg',
    email: 'ola.b@stark.com',
    company: 'Stark Industries',
    title: 'Director, IT',
    status: 'lead',
    lastActivity: '2w ago',
    owner: 'Maya Owens',
  },
  {
    id: 'c-1006',
    name: 'Hideo Tanaka',
    email: 'h.tanaka@wayne.co',
    company: 'Wayne Co.',
    title: 'Procurement Lead',
    status: 'churned',
    lastActivity: '2mo ago',
    owner: 'Jordan Park',
  },
];

export function getContact(id: string) {
  return contacts.find((c) => c.id === id);
}

export type MemberRole = 'admin' | 'member' | 'guest';

export interface Member {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  role: MemberRole;
  lastActive: string;
  online: boolean;
}

export const roleTone: Record<MemberRole, BadgeTone> = {
  admin: 'purple',
  member: 'info',
  guest: 'neutral',
};

export const roleLabel: Record<MemberRole, string> = {
  admin: 'Admin',
  member: 'Member',
  guest: 'Guest',
};

export const members: Member[] = [
  {
    id: 'u-1',
    name: 'Alex Rivera',
    email: 'alex@orbit.app',
    jobTitle: 'Account Executive',
    role: 'admin',
    lastActive: 'Active now',
    online: true,
  },
  {
    id: 'u-2',
    name: 'Aki Tanaka',
    email: 'aki@orbit.app',
    jobTitle: 'Sales Manager',
    role: 'admin',
    lastActive: 'Active now',
    online: true,
  },
  {
    id: 'u-3',
    name: 'Jordan Park',
    email: 'jordan@orbit.app',
    jobTitle: 'Account Executive',
    role: 'member',
    lastActive: '5m ago',
    online: false,
  },
  {
    id: 'u-4',
    name: 'Sam Chen',
    email: 'sam@orbit.app',
    jobTitle: 'Solutions Engineer',
    role: 'member',
    lastActive: '1h ago',
    online: false,
  },
  {
    id: 'u-5',
    name: 'Maya Owens',
    email: 'maya@orbit.app',
    jobTitle: 'Account Executive',
    role: 'member',
    lastActive: 'Yesterday',
    online: false,
  },
  {
    id: 'u-6',
    name: 'Lena Ivanova',
    email: 'lena@orbit.app',
    jobTitle: 'SDR',
    role: 'member',
    lastActive: '3d ago',
    online: false,
  },
  {
    id: 'u-7',
    name: 'Chris Park',
    email: 'chris@external.io',
    jobTitle: 'Contractor',
    role: 'guest',
    lastActive: '1w ago',
    online: false,
  },
];

export interface PendingInvite {
  id: string;
  email: string;
  role: MemberRole;
  invitedBy: string;
  invitedAt: string;
}

export const pendingInvites: PendingInvite[] = [
  {
    id: 'i-1',
    email: 'noah@orbit.app',
    role: 'member',
    invitedBy: 'Alex Rivera',
    invitedAt: '2d ago',
  },
  {
    id: 'i-2',
    email: 'emma@orbit.app',
    role: 'admin',
    invitedBy: 'Aki Tanaka',
    invitedAt: 'Yesterday',
  },
  {
    id: 'i-3',
    email: 'kai@partner.co',
    role: 'guest',
    invitedBy: 'Sam Chen',
    invitedAt: '4h ago',
  },
];

export const seatLimit = 10;
