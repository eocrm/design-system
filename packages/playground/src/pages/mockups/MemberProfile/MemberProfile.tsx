import { useState } from 'react';
import { Link as RouterLink, Navigate, useParams } from 'react-router';
import { Mail, Phone, Clock, Languages, Camera } from 'lucide-react';
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Cluster,
  DefinitionList,
  Drawer,
  Field,
  FormRow,
  FormSection,
  Input,
  Page,
  PageHeader,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  toast,
} from '@eocrm/design-system';
import { members, roleLabel, roleTone, type Member, type MemberRole } from '../../../data/mock';
import { CrossLinks } from '../../shared/CrossLinks';

// The editable profile shape. Richer than the shared `Member` type (which we do
// NOT modify) — the extra fields live only in this mockup's local state.
interface ProfileData {
  firstName: string;
  lastName: string;
  jobTitle: string;
  bio: string;
  email: string;
  phone: string;
  timezone: string;
  language: string;
  role: MemberRole;
  active: boolean;
  notifications: boolean;
}

type ProfileErrors = Partial<Record<'firstName' | 'lastName' | 'email', string>>;

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'guest', label: 'Guest' },
];

const TIMEZONE_OPTIONS = [
  { value: 'europe-london', label: 'Europe/London (GMT+1)' },
  { value: 'america-new_york', label: 'America/New York (GMT−4)' },
  { value: 'asia-tokyo', label: 'Asia/Tokyo (GMT+9)' },
  { value: 'australia-sydney', label: 'Australia/Sydney (GMT+10)' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ja', label: '日本語' },
];

const labelOf = (opts: { value: string; label: string }[], value: string) =>
  opts.find((o) => o.value === value)?.label ?? value;

// Seed the editable profile from a member; split the single `name` into first/last.
const seed = (m: Member): ProfileData => {
  const [first, ...rest] = m.name.split(' ');
  return {
    firstName: first,
    lastName: rest.join(' '),
    jobTitle: m.jobTitle,
    bio: 'Closes mid-market deals across EMEA. Joined eocrm in 2024.',
    email: `${first}.${rest.join('')}@eocrm.app`.toLowerCase(),
    phone: '+44 20 7946 0142',
    timezone: 'europe-london',
    language: 'en',
    role: m.role,
    active: true,
    notifications: false,
  };
};

const fullName = (p: ProfileData) => `${p.firstName} ${p.lastName}`.trim();

const validate = (d: ProfileData): ProfileErrors => {
  const errors: ProfileErrors = {};
  if (!d.firstName.trim()) errors.firstName = 'First name is required.';
  if (!d.lastName.trim()) errors.lastName = 'Last name is required.';
  if (!d.email.trim()) errors.email = 'Email is required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))
    errors.email = 'Enter a valid email address.';
  return errors;
};

export function MemberProfile() {
  const { id } = useParams<{ id: string }>();
  const member = members.find((m) => m.id === id);
  const [profile, setProfile] = useState<ProfileData>(() => seed(member ?? members[0]));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ProfileData>(profile);
  const [errors, setErrors] = useState<ProfileErrors>({});

  if (!member) return <Navigate to="/mockups/members" replace />;

  const openEdit = () => {
    setDraft(profile);
    setErrors({});
    setOpen(true);
  };

  const set = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    // Clear this field's error if one is showing. Return the same object when
    // there's nothing to clear so React skips a redundant re-render.
    setErrors((e) => {
      if (!(key in e)) return e;
      const next = { ...e };
      delete next[key as keyof ProfileErrors];
      return next;
    });
  };

  const save = () => {
    const next = validate(draft);
    if (Object.values(next).some(Boolean)) {
      setErrors(next);
      return;
    }
    setProfile(draft);
    setOpen(false);
    toast.success('Profile updated', { description: `Saved changes to ${fullName(draft)}.` });
  };

  return (
    <Page>
      <PageHeader borderBottom={false}>
        <PageHeader.Breadcrumb>
          <Breadcrumb>
            <Breadcrumb.Item as={RouterLink} to="/mockups/members">
              Members
            </Breadcrumb.Item>
            <Breadcrumb.Item>{fullName(profile)}</Breadcrumb.Item>
          </Breadcrumb>
        </PageHeader.Breadcrumb>
        <PageHeader.Aside>
          <Avatar name={fullName(profile)} size="lg" />
        </PageHeader.Aside>
        <PageHeader.Title>{fullName(profile)}</PageHeader.Title>
        <PageHeader.Subtitle>{profile.jobTitle}</PageHeader.Subtitle>
        <PageHeader.Meta>
          <Cluster gap="xs" align="center">
            <Badge tone={roleTone[profile.role]}>{roleLabel[profile.role]}</Badge>
            <Text as="span" size="sm" tone="muted">
              {profile.active ? 'Active' : 'Suspended'}
            </Text>
          </Cluster>
        </PageHeader.Meta>
        <PageHeader.Actions>
          <Button onClick={openEdit}>Edit profile</Button>
        </PageHeader.Actions>
      </PageHeader>

      <Stack gap="lg">
        <Card>
          <Card.Header headerLevel="h2">Profile</Card.Header>
          <DefinitionList dividers>
            <DefinitionList.Item>
              <DefinitionList.Term>Name</DefinitionList.Term>
              <DefinitionList.Description>{fullName(profile)}</DefinitionList.Description>
            </DefinitionList.Item>
            <DefinitionList.Item>
              <DefinitionList.Term>Job title</DefinitionList.Term>
              <DefinitionList.Description>{profile.jobTitle}</DefinitionList.Description>
            </DefinitionList.Item>
            <DefinitionList.Item>
              <DefinitionList.Term>Bio</DefinitionList.Term>
              <DefinitionList.Description>{profile.bio}</DefinitionList.Description>
            </DefinitionList.Item>
          </DefinitionList>
        </Card>

        <Card>
          <Card.Header headerLevel="h2">Contact</Card.Header>
          <DefinitionList dividers>
            <DefinitionList.Item>
              <DefinitionList.Term>Email</DefinitionList.Term>
              <DefinitionList.Description icon={<Mail size={14} />}>
                {profile.email}
              </DefinitionList.Description>
            </DefinitionList.Item>
            <DefinitionList.Item>
              <DefinitionList.Term>Phone</DefinitionList.Term>
              <DefinitionList.Description icon={<Phone size={14} />}>
                {profile.phone}
              </DefinitionList.Description>
            </DefinitionList.Item>
            <DefinitionList.Item>
              <DefinitionList.Term>Timezone</DefinitionList.Term>
              <DefinitionList.Description icon={<Clock size={14} />}>
                {labelOf(TIMEZONE_OPTIONS, profile.timezone)}
              </DefinitionList.Description>
            </DefinitionList.Item>
            <DefinitionList.Item>
              <DefinitionList.Term>Language</DefinitionList.Term>
              <DefinitionList.Description icon={<Languages size={14} />}>
                {labelOf(LANGUAGE_OPTIONS, profile.language)}
              </DefinitionList.Description>
            </DefinitionList.Item>
          </DefinitionList>
        </Card>

        <Card>
          <Card.Header headerLevel="h2">Role &amp; access</Card.Header>
          <DefinitionList dividers>
            <DefinitionList.Item>
              <DefinitionList.Term>Role</DefinitionList.Term>
              <DefinitionList.Description>
                <Badge tone={roleTone[profile.role]}>{roleLabel[profile.role]}</Badge>
              </DefinitionList.Description>
            </DefinitionList.Item>
            <DefinitionList.Item>
              <DefinitionList.Term>Status</DefinitionList.Term>
              <DefinitionList.Description>
                {profile.active ? 'Active' : 'Suspended'}
              </DefinitionList.Description>
            </DefinitionList.Item>
            <DefinitionList.Item>
              <DefinitionList.Term>Email notifications</DefinitionList.Term>
              <DefinitionList.Description>
                {profile.notifications ? 'On' : 'Off'}
              </DefinitionList.Description>
            </DefinitionList.Item>
          </DefinitionList>
        </Card>
      </Stack>

      <Drawer open={open} onOpenChange={setOpen} side="right" size="md">
        <Drawer.Header>Edit profile</Drawer.Header>
        <Drawer.Body>
          <Stack gap="xl">
            <Cluster gap="md" align="center">
              <Avatar name={fullName(draft)} size="lg" />
              <Stack gap="xs">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => toast.info('Photo upload is out of scope for this mockup.')}
                >
                  <Camera size={14} /> Change photo
                </Button>
                <Text size="sm" tone="muted">
                  JPG or PNG, up to 2 MB.
                </Text>
              </Stack>
            </Cluster>

            <FormSection
              title="Profile"
              description="Name and how this person appears across eocrm."
            >
              <FormRow>
                <Field label="First name" required error={errors.firstName}>
                  <Input
                    value={draft.firstName}
                    onChange={(e) => set('firstName', e.target.value)}
                  />
                </Field>
                <Field label="Last name" required error={errors.lastName}>
                  <Input value={draft.lastName} onChange={(e) => set('lastName', e.target.value)} />
                </Field>
              </FormRow>
              <Field label="Job title">
                <Input value={draft.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} />
              </Field>
              <Field label="Bio" optional>
                <Textarea
                  value={draft.bio}
                  onChange={(e) => set('bio', e.target.value)}
                  minRows={3}
                />
              </Field>
            </FormSection>

            <FormSection title="Contact" description="How teammates reach this person.">
              <Field label="Email" required error={errors.email}>
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(e) => set('email', e.target.value)}
                />
              </Field>
              <FormRow>
                <Field label="Phone" optional>
                  <Input
                    type="tel"
                    value={draft.phone}
                    onChange={(e) => set('phone', e.target.value)}
                  />
                </Field>
                <Field label="Timezone">
                  <Select
                    options={TIMEZONE_OPTIONS}
                    value={draft.timezone}
                    onChange={(value) => set('timezone', value as string)}
                  />
                </Field>
              </FormRow>
              <Field label="Language">
                <Select
                  options={LANGUAGE_OPTIONS}
                  value={draft.language}
                  onChange={(value) => set('language', value as string)}
                />
              </Field>
            </FormSection>

            <FormSection title="Role &amp; access" description="Controls what this member can do.">
              <Field label="Role">
                <Select
                  options={ROLE_OPTIONS}
                  value={draft.role}
                  onChange={(value) => set('role', value as MemberRole)}
                />
              </Field>
              <Field
                orientation="horizontal"
                label="Active"
                description="Can sign in and access the workspace."
              >
                <Switch checked={draft.active} onChange={(checked) => set('active', checked)} />
              </Field>
              <Field
                orientation="horizontal"
                label="Email notifications"
                description="Product and activity emails."
              >
                <Switch
                  checked={draft.notifications}
                  onChange={(checked) => set('notifications', checked)}
                />
              </Field>
            </FormSection>
          </Stack>
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close>
            <Button variant="secondary">Cancel</Button>
          </Drawer.Close>
          <Button onClick={save}>Save changes</Button>
        </Drawer.Footer>
      </Drawer>

      <CrossLinks kind="mockup" slug="member-profile" />
    </Page>
  );
}
