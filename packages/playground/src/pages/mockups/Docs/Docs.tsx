import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, Link as RouterLink, useLocation } from 'react-router';
import {
  ArrowLeft,
  Bot,
  Braces,
  Building2,
  CalendarDays,
  FileJson,
  Handshake,
  Home,
  KeyRound,
  ListChecks,
  Users,
} from 'lucide-react';
import {
  Alert,
  AppLayout,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Cluster,
  Code,
  Field,
  FormRow,
  Grid,
  Input,
  Link,
  LinkCard,
  LiveRegion,
  Logo,
  Page,
  PageHeader,
  PasswordInput,
  Rail,
  Split,
  Stack,
  Sticky,
  Table,
  Tabs,
  Text,
  Title,
  TopBar,
  type PaletteColor,
} from '@eocrm/design-system';
import eocrmLogo from '../../../assets/eocrm-logo.svg';
import eocrmLogoTealPine from '../../../assets/eocrm-logo-tealpine.svg';
import { useAccent } from '../../../layout/AppShell/accent';

// Public developer docs (docs.eocrm.io) — a standalone site, not a CRM screen,
// so it renders outside the playground chrome (see SELF_CHROMED_PREFIX in AppShell).

const BASE = '/mockups/docs';
const HOST = 'https://acme.eocrm.io/api/v1';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const METHOD_COLOR: Record<Method, PaletteColor> = {
  GET: 'blue',
  POST: 'green',
  PUT: 'amber',
  PATCH: 'amber',
  DELETE: 'red',
};

const RESOURCE_ICONS: Record<string, ReactNode> = {
  contacts: <Users size={16} />,
  companies: <Building2 size={16} />,
  deals: <Handshake size={16} />,
  tasks: <ListChecks size={16} />,
  appointments: <CalendarDays size={16} />,
};

const OP_SLUGS = ['list', 'create', 'get', 'update', 'delete'];

const RESOURCES: {
  slug: string;
  label: string;
  ops: { method: Method; path: string; summary: string }[];
}[] = Object.keys(RESOURCE_ICONS).map((slug) => {
  const label = slug[0].toUpperCase() + slug.slice(1);
  const one = label.replace(/ies$/, 'y').replace(/s$/, '').toLowerCase();
  const id = slug === 'tasks' ? '{taskKey}' : '{id}';
  return {
    slug,
    label,
    ops: [
      { method: 'GET', path: `/${slug}`, summary: `List ${slug}` },
      {
        method: 'POST',
        path: `/${slug}`,
        summary: `Create a${/^[aeiou]/.test(one) ? 'n' : ''} ${one}`,
      },
      {
        method: 'GET',
        path: `/${slug}/${id}`,
        summary: `Get a${/^[aeiou]/.test(one) ? 'n' : ''} ${one}`,
      },
      {
        method: slug === 'appointments' ? 'PATCH' : 'PUT',
        path: `/${slug}/${id}`,
        summary: `Update a${/^[aeiou]/.test(one) ? 'n' : ''} ${one}`,
      },
      {
        method: 'DELETE',
        path: `/${slug}/${id}`,
        summary: `Delete a${/^[aeiou]/.test(one) ? 'n' : ''} ${one}`,
      },
    ],
  };
});

function MethodBadge({ method }: { method: Method }) {
  return (
    <Badge color={METHOD_COLOR[method]} size="sm">
      {method}
    </Badge>
  );
}

function CodeSample({ children }: { children: string }) {
  return (
    <>
      {/* TODO: replace when CodeBlock ships — see packages/playground/TODO.md */}
      <pre
        style={{
          margin: 0,
          padding: 'var(--space-4)',
          background: 'var(--color-bg-sunken)',
          border: 'var(--border-width) solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-family-mono)',
          fontSize: 'var(--font-size-code)',
          lineHeight: 'var(--line-height-normal)',
          overflowX: 'auto',
        }}
      >
        <code>{children}</code>
      </pre>
    </>
  );
}

const SAMPLES = {
  curl: `curl ${HOST}/contacts?search=ana&per_page=25 \\
  -H "Authorization: Bearer $EOCRM_API_KEY"`,
  js: `const res = await fetch('${HOST}/contacts?search=ana&per_page=25', {
  headers: { Authorization: \`Bearer \${process.env.EOCRM_API_KEY}\` },
});
const { data, meta } = await res.json();`,
  python: `import os, requests

res = requests.get(
    "${HOST}/contacts",
    params={"search": "ana", "per_page": 25},
    headers={"Authorization": f"Bearer {os.environ['EOCRM_API_KEY']}"},
)
contacts = res.json()["data"]`,
};

function LanguageTabs() {
  const [lang, setLang] = useState<keyof typeof SAMPLES>('curl');
  return (
    <Stack gap="sm">
      <Tabs
        items={[
          { id: 'curl', label: 'cURL' },
          { id: 'js', label: 'JavaScript' },
          { id: 'python', label: 'Python' },
        ]}
        activeId={lang}
        onChange={(id) => setLang(id as keyof typeof SAMPLES)}
        panelIdPrefix="lang"
      />
      <Stack role="tabpanel" id={`lang-${lang}-panel`} aria-labelledby={`lang-${lang}-tab`}>
        <CodeSample>{SAMPLES[lang]}</CodeSample>
      </Stack>
    </Stack>
  );
}

/** Article + right-hand "On this page" column. */
function Article({ toc, children }: { toc: { id: string; label: string }[]; children: ReactNode }) {
  return (
    <Split
      side="end"
      asideWidth="200px"
      gap="2xl"
      collapseBelow="lg"
      aside={
        // TODO: replace when TableOfContents ships — see packages/playground/TODO.md
        <Sticky top="topbar">
          <Stack gap="xs">
            <Text size="xs" weight="semibold" tone="muted">
              On this page
            </Text>
            {toc.map((t) => (
              <Link key={t.id} href={`#${t.id}`} variant="muted">
                <Text as="span" size="sm">
                  {t.label}
                </Text>
              </Link>
            ))}
          </Stack>
        </Sticky>
      }
    >
      <Page gap="xl">{children}</Page>
    </Split>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Stack gap="md">
      <Title order={2} size="lg" id={id}>
        {title}
      </Title>
      {children}
    </Stack>
  );
}

function HomePage() {
  return (
    <Page gap="2xl">
      <Stack gap="md">
        <Title order={1} size="3xl">
          Build on eocrm
        </Title>
        <Text size="lg" tone="muted">
          A REST API for your contacts, companies, deals, tasks and appointments — and an MCP server
          that lets AI assistants work in your workspace.
        </Text>
      </Stack>

      <Grid minColumnWidth="240px" gap="lg">
        <LinkCard as={RouterLink} to={`${BASE}/api`} padding="lg">
          <Stack gap="sm">
            <Braces size={20} aria-hidden="true" />
            <Text weight="semibold">API reference</Text>
            <Text size="sm" tone="muted">
              Authentication, rate limits, errors and every endpoint with examples.
            </Text>
          </Stack>
        </LinkCard>
        <LinkCard as={RouterLink} to={`${BASE}/ai-assistants`} padding="lg">
          <Stack gap="sm">
            <Bot size={20} aria-hidden="true" />
            <Text weight="semibold">AI assistants (MCP)</Text>
            <Text size="sm" tone="muted">
              Connect ChatGPT, Claude, Claude Code or Codex to your workspace.
            </Text>
          </Stack>
        </LinkCard>
        <LinkCard href="https://docs.eocrm.io/openapi-public.json" download padding="lg">
          <Stack gap="sm">
            <FileJson size={20} aria-hidden="true" />
            <Text weight="semibold">OpenAPI spec</Text>
            <Text size="sm" tone="muted">
              Generate a client or import into Postman / Insomnia.
            </Text>
          </Stack>
        </LinkCard>
      </Grid>

      <Stack gap="md">
        <Title order={2} size="lg">
          Make your first request
        </Title>
        <Text tone="muted">
          Create an API key under{' '}
          <Text as="span" weight="medium">
            Settings → API keys
          </Text>
          , then:
        </Text>
        <LanguageTabs />
      </Stack>
    </Page>
  );
}

function ApiOverviewPage() {
  return (
    <Article
      toc={[
        { id: 'base-url', label: 'Base URL' },
        { id: 'auth', label: 'Authentication' },
        { id: 'rate-limits', label: 'Rate limits' },
        { id: 'errors', label: 'Errors' },
      ]}
    >
      <PageHeader borderBottom={false}>
        <PageHeader.Title>API reference</PageHeader.Title>
        <PageHeader.Subtitle>
          Authentication, rate limits, errors and versioning of the eocrm public API.
        </PageHeader.Subtitle>
      </PageHeader>

      <Section id="base-url" title="Base URL">
        <Text>
          Every workspace has its own host. Replace <Code>acme</Code> with your workspace slug.
        </Text>
        <CodeSample>{HOST}</CodeSample>
      </Section>

      <Section id="auth" title="Authentication">
        <Text>
          Send a tenant API key as a bearer token. Keys start with <Code>eok_</Code> followed by 48
          letters and digits.
        </Text>
        <CodeSample>{'Authorization: Bearer eok_…'}</CodeSample>
        <Alert tone="warning" title="Keep keys server-side">
          A key acts with the permissions of the role it was issued for. Never ship it in browser or
          mobile code.
        </Alert>
      </Section>

      <Section id="rate-limits" title="Rate limits">
        <Text>
          Limits apply per key. When you exceed one the API answers <Code>429</Code> with a{' '}
          <Code>Retry-After</Code> header.
        </Text>
      </Section>

      <Section id="errors" title="Errors">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Meaning</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {[
              ['401', 'Missing or invalid API key.'],
              ['403', 'The key’s role lacks the permission.'],
              ['404', 'The record doesn’t exist or isn’t visible to the key.'],
              ['422', 'Validation failed — see the errors object.'],
              ['429', 'Rate limit exceeded.'],
            ].map(([code, meaning]) => (
              <Table.Row key={code}>
                <Table.Cell>
                  <Code>{code}</Code>
                </Table.Cell>
                <Table.Cell>{meaning}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Section>
    </Article>
  );
}

const CONTACT_PARAMS: [string, string, string][] = [
  ['search', 'string', 'Free-text search, max 255 characters.'],
  ['owner_id', 'string', 'Only contacts owned by this member.'],
  ['company_id', 'string', 'Only contacts linked to this company.'],
  ['tags[]', 'string[]', 'Match any of these tags.'],
  ['active', 'boolean', 'Only open records: drops those in a won, lost or done stage.'],
  ['sort', 'enum', 'first_name, last_name, email, created_at, updated_at, …'],
  ['page / per_page', 'integer', 'Pagination.'],
];

const SAMPLE_RESPONSE = `{
  "data": [
    {
      "id": "c_8f2k1",
      "first_name": "Ana",
      "last_name": "Kovač",
      "email": "ana@northwind.io",
      "company_id": "co_31x9",
      "workflow_status": "qualified",
      "created_at": "2026-09-14T08:12:33Z"
    }
  ],
  "meta": { "page": 1, "per_page": 25, "total": 1 }
}`;

/** Interactive console — fills the request from the form and shows a (mocked) response. */
function TryIt() {
  const [workspace, setWorkspace] = useState('acme');
  const [apiKey, setApiKey] = useState('');
  const [search, setSearch] = useState('ana');
  const [perPage, setPerPage] = useState('25');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [result, setResult] = useState<{ status: number; ms: number; body: string } | null>(null);

  const query = new URLSearchParams({ ...(search && { search }), per_page: perPage }).toString();
  const url = `https://${workspace || 'acme'}.eocrm.io/api/v1/contacts?${query}`;

  const perPageNum = Number(perPage);
  const perPageError =
    Number.isInteger(perPageNum) && perPageNum >= 1 && perPageNum <= 100
      ? undefined
      : 'Enter a whole number from 1 to 100.';
  const workspaceError = /^[a-z0-9-]+$/.test(workspace)
    ? undefined
    : 'Lowercase letters, digits and hyphens only.';
  const blocked = state === 'sending' || !apiKey || !!perPageError || !!workspaceError;

  // ponytail: canned response after a fake delay; the real site would fetch `url`.
  const send = () => {
    if (blocked) return;
    setState('sending');
    window.setTimeout(() => {
      setResult(
        apiKey.startsWith('eok_')
          ? { status: 200, ms: 142, body: SAMPLE_RESPONSE }
          : {
              status: 401,
              ms: 38,
              body: '{\n  "message": "Unauthenticated."\n}',
            },
      );
      setState('done');
    }, 600);
  };

  return (
    <Card padding="lg">
      <Stack gap="lg">
        <Cluster gap="sm">
          <MethodBadge method="GET" />
          <Code>{url}</Code>
        </Cluster>
        <FormRow>
          <Field label="Workspace" description="Your workspace slug." error={workspaceError}>
            <Input value={workspace} onChange={(e) => setWorkspace(e.target.value)} />
          </Field>
          <Field label="API key" description="Used only for this request; never stored." required>
            <PasswordInput
              value={apiKey}
              placeholder="eok_…"
              onChange={(e) => setApiKey(e.target.value)}
            />
          </Field>
        </FormRow>
        <FormRow>
          <Field label="search" optional>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} />
          </Field>
          <Field label="per_page" optional error={perPageError}>
            <Input
              type="number"
              min={1}
              max={100}
              value={perPage}
              onChange={(e) => setPerPage(e.target.value)}
            />
          </Field>
        </FormRow>
        <Cluster gap="md">
          <Button onClick={send} aria-disabled={blocked || undefined}>
            {state === 'sending' ? 'Sending…' : 'Send request'}
          </Button>
          {result && state === 'done' && (
            <Cluster gap="sm">
              <Badge tone={result.status < 300 ? 'success' : 'danger'} size="sm">
                {result.status}
              </Badge>
              <Text as="span" size="sm" tone="muted">
                {result.ms} ms
              </Text>
            </Cluster>
          )}
        </Cluster>
        <LiveRegion>
          {state === 'sending'
            ? 'Sending request'
            : result && `Response ${result.status} in ${result.ms} milliseconds`}
        </LiveRegion>
        {result && <CodeSample>{result.body}</CodeSample>}
      </Stack>
    </Card>
  );
}

function ListContactsPage() {
  return (
    <Article
      toc={[
        { id: 'params', label: 'Query parameters' },
        { id: 'request', label: 'Request' },
        { id: 'try-it', label: 'Try it' },
        { id: 'response', label: 'Response' },
      ]}
    >
      <PageHeader borderBottom={false}>
        <PageHeader.Breadcrumb>
          <Breadcrumb>
            <Breadcrumb.Item as={RouterLink} to={`${BASE}/api`}>
              API reference
            </Breadcrumb.Item>
            <Breadcrumb.Item>Contacts</Breadcrumb.Item>
          </Breadcrumb>
        </PageHeader.Breadcrumb>
        <PageHeader.Title>List contacts</PageHeader.Title>
        <PageHeader.Meta>
          <Cluster gap="sm">
            <MethodBadge method="GET" />
            <Code>/contacts</Code>
          </Cluster>
        </PageHeader.Meta>
      </PageHeader>

      <Text>
        Filter by owner, company, tag and custom-field values, search free text, sort, and paginate.
        Sensitive custom fields are returned only when the key holds{' '}
        <Code>contacts.view_sensitive</Code>.
      </Text>

      <Section id="params" title="Query parameters">
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Name</Table.HeaderCell>
              <Table.HeaderCell>Type</Table.HeaderCell>
              <Table.HeaderCell>Description</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {CONTACT_PARAMS.map(([name, type, desc]) => (
              <Table.Row key={name}>
                <Table.Cell>
                  <Code>{name}</Code>
                </Table.Cell>
                <Table.Cell>
                  <Text as="span" size="sm" tone="muted">
                    {type}
                  </Text>
                </Table.Cell>
                <Table.Cell>{desc}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </Section>

      <Section id="request" title="Request">
        <LanguageTabs />
      </Section>

      <Section id="try-it" title="Try it">
        <TryIt />
      </Section>

      <Section id="response" title="Response">
        <Cluster gap="sm">
          <Badge tone="success" size="sm">
            200
          </Badge>
          <Text as="span" size="sm" tone="muted">
            application/json
          </Text>
        </Cluster>
        <CodeSample>{SAMPLE_RESPONSE}</CodeSample>
      </Section>
    </Article>
  );
}

const CLIENTS = {
  claude: {
    label: 'Claude',
    steps: [
      'Open Settings → Connectors → Add custom connector.',
      'Paste the server URL below and click Add.',
      'Sign in to eocrm when prompted and approve access.',
    ],
    snippet: 'https://acme.eocrm.io/mcp',
  },
  chatgpt: {
    label: 'ChatGPT',
    steps: [
      'Open Settings → Connectors → Create.',
      'Paste the server URL below.',
      'Sign in to eocrm when prompted and approve access.',
    ],
    snippet: 'https://acme.eocrm.io/mcp',
  },
  'claude-code': {
    label: 'Claude Code',
    steps: ['Run this in your terminal, then /mcp to sign in.'],
    snippet: 'claude mcp add --transport http eocrm https://acme.eocrm.io/mcp',
  },
  codex: {
    label: 'Codex',
    steps: ['Add this to ~/.codex/config.toml, then restart Codex.'],
    snippet: `[mcp_servers.eocrm]
url = "https://acme.eocrm.io/mcp"`,
  },
};

function AiAssistantsPage() {
  const [client, setClient] = useState<keyof typeof CLIENTS>('claude');
  const c = CLIENTS[client];
  return (
    <Article
      toc={[
        { id: 'connect', label: 'Connect' },
        { id: 'ask', label: 'What you can ask' },
      ]}
    >
      <PageHeader borderBottom={false}>
        <PageHeader.Title>AI assistants (MCP)</PageHeader.Title>
        <PageHeader.Subtitle>
          Connect ChatGPT, Claude, Claude Code or Codex to your eocrm workspace.
        </PageHeader.Subtitle>
      </PageHeader>

      <Section id="connect" title="Connect">
        <Tabs
          items={Object.entries(CLIENTS).map(([id, v]) => ({ id, label: v.label }))}
          activeId={client}
          onChange={(id) => setClient(id as keyof typeof CLIENTS)}
          panelIdPrefix="client"
        />
        <Stack
          gap="md"
          role="tabpanel"
          id={`client-${client}-panel`}
          aria-labelledby={`client-${client}-tab`}
        >
          <Stack gap="sm">
            {c.steps.map((s, i) => (
              <Cluster key={s} gap="sm" wrap={false} align="start">
                <Badge color="teal" size="sm">
                  {i + 1}
                </Badge>
                <Text>{s}</Text>
              </Cluster>
            ))}
          </Stack>
          <CodeSample>{c.snippet}</CodeSample>
        </Stack>
        <Alert tone="info">
          The assistant acts as you: it sees and changes only what your role allows.
        </Alert>
      </Section>

      <Section id="ask" title="What you can ask">
        <Grid minColumnWidth="220px" gap="md">
          {[
            'Which deals closing this month have no next action?',
            'Create a follow-up task for every contact I met at the Expo.',
            'Book a 30-minute call with Ana Kovač next Tuesday.',
            'Summarise everything we know about Northwind.',
          ].map((q) => (
            <Card key={q} padding="md">
              <Text size="sm">“{q}”</Text>
            </Card>
          ))}
        </Grid>
      </Section>
    </Article>
  );
}

/** Endpoint pages other than List contacts: header only, body not mocked. */
function EndpointStubPage({ resource, opSlug }: { resource?: string; opSlug?: string }) {
  const r = RESOURCES.find((x) => x.slug === resource);
  const op = r?.ops[OP_SLUGS.indexOf(opSlug ?? '')];
  return (
    <Page>
      <PageHeader borderBottom={false}>
        {r && (
          <PageHeader.Breadcrumb>
            <Breadcrumb>
              <Breadcrumb.Item as={RouterLink} to={`${BASE}/api`}>
                API reference
              </Breadcrumb.Item>
              <Breadcrumb.Item>{r.label}</Breadcrumb.Item>
            </Breadcrumb>
          </PageHeader.Breadcrumb>
        )}
        <PageHeader.Title>{op?.summary ?? 'Page not found'}</PageHeader.Title>
        {op && (
          <PageHeader.Meta>
            <Cluster gap="sm">
              <MethodBadge method={op.method} />
              <Code>{op.path}</Code>
            </Cluster>
          </PageHeader.Meta>
        )}
        <PageHeader.Subtitle>
          This mockup only fills in{' '}
          <Link as={RouterLink} to={`${BASE}/api/contacts/list`}>
            List contacts
          </Link>
          ; every endpoint page follows the same layout.
        </PageHeader.Subtitle>
      </PageHeader>
    </Page>
  );
}

const railItem = (to: string, label: string, icon?: ReactNode, badge?: ReactNode) => (
  <Rail.Item key={to} as={NavLink} to={to} end icon={icon} badge={badge}>
    {label}
  </Rail.Item>
);

export function Docs() {
  const { pathname } = useLocation();
  const accent = useAccent();
  const searchRef = useRef<HTMLInputElement>(null);
  const activeGroup = pathname.split('/')[4]; // /mockups/docs/api/<resource>/…
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set([activeGroup]));
  // Navigating into a resource opens its group (e.g. from a breadcrumb or link).
  useEffect(() => {
    if (activeGroup)
      setOpenGroups((prev) => (prev.has(activeGroup) ? prev : new Set(prev).add(activeGroup)));
  }, [activeGroup]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const sub = pathname.slice(BASE.length).replace(/\/$/, '');

  let content: ReactNode;
  if (sub === '') content = <HomePage />;
  else if (sub === '/api') content = <ApiOverviewPage />;
  else if (sub === '/api/contacts/list') content = <ListContactsPage />;
  else if (sub === '/ai-assistants') content = <AiAssistantsPage />;
  else {
    const [, , resource, opSlug] = sub.split('/');
    content = <EndpointStubPage resource={resource} opSlug={opSlug} />;
  }

  return (
    <AppLayout
      sidebarPinned
      sidebar={
        <Rail aria-label="Documentation" collapseBelow="md">
          <Rail.Header>
            <Logo
              src={accent === 'tealpine' ? eocrmLogoTealPine : eocrmLogo}
              text="eocrm"
              subtext="Developers"
              size="sm"
            />
          </Rail.Header>
          <Rail.Section>
            {railItem(BASE, 'Overview', <Home size={16} />)}
            {railItem(`${BASE}/ai-assistants`, 'AI assistants', <Bot size={16} />)}
          </Rail.Section>
          <Rail.Section title="API reference">
            {railItem(`${BASE}/api`, 'Introduction', <KeyRound size={16} />)}
            {RESOURCES.map((r) => (
              <Rail.Group
                key={r.slug}
                icon={RESOURCE_ICONS[r.slug]}
                label={r.label}
                open={openGroups.has(r.slug)}
                onOpenChange={(open) =>
                  setOpenGroups((prev) => {
                    const next = new Set(prev);
                    if (open) next.add(r.slug);
                    else next.delete(r.slug);
                    return next;
                  })
                }
              >
                {r.ops.map((op, i) =>
                  railItem(
                    `${BASE}/api/${r.slug}/${OP_SLUGS[i]}`,
                    op.summary,
                    undefined,
                    <MethodBadge method={op.method} />,
                  ),
                )}
              </Rail.Group>
            ))}
          </Rail.Section>
          <Rail.Footer>
            <Rail.Item as={RouterLink} to="/mockups" icon={<ArrowLeft size={16} />}>
              Back to mockups
            </Rail.Item>
          </Rail.Footer>
        </Rail>
      }
      topBar={
        <TopBar>
          <TopBar.Start>
            <TopBar.Search
              ref={searchRef}
              placeholder="Search docs…"
              hotkey={['⌘', 'K']}
              aria-label="Search docs"
            />
          </TopBar.Start>
          <TopBar.End>
            <Link href="https://status.eocrm.io" variant="muted">
              Status
            </Link>
            <Link href="https://app.eocrm.io" variant="muted">
              Sign in
            </Link>
          </TopBar.End>
        </TopBar>
      }
    >
      {/* TODO: replace when AppLayout can own the main landmark — see packages/playground/TODO.md */}
      <main>{content}</main>
    </AppLayout>
  );
}
