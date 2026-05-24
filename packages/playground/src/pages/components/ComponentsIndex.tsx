import { Link } from 'react-router-dom';
import { ArrowRight, Inbox } from 'lucide-react';
import { Accordion } from '@eocrm/design-system';
import { Alert } from '@eocrm/design-system';
import { Avatar } from '@eocrm/design-system';
import { Badge } from '@eocrm/design-system';
import { Breadcrumb } from '@eocrm/design-system';
import { Link as DSLink } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { ButtonGroup } from '@eocrm/design-system';
import { Card } from '@eocrm/design-system';
import { CircularProgress } from '@eocrm/design-system';
import { Progress } from '@eocrm/design-system';
import { Code } from '@eocrm/design-system';
import { Text } from '@eocrm/design-system';
import { Title } from '@eocrm/design-system';
import { Checkbox } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Divider } from '@eocrm/design-system';
import { Grid } from '@eocrm/design-system';
import { Input } from '@eocrm/design-system';
import { PasswordInput } from '@eocrm/design-system';
import { PasswordStrengthMeter } from '@eocrm/design-system';
import { Select } from '@eocrm/design-system';
import { Skeleton } from '@eocrm/design-system';
import { Slider } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Switch } from '@eocrm/design-system';
import { Table } from '@eocrm/design-system';
import { Tabs } from '@eocrm/design-system';
import { Textarea } from '@eocrm/design-system';
import { DropdownMenu } from '@eocrm/design-system';
import { Tooltip } from '@eocrm/design-system';
import { Calendar } from '@eocrm/design-system';
import { DatePicker } from '@eocrm/design-system';
import { ConfirmationPopover, Popover } from '@eocrm/design-system';
import { DataTable, useDataTable, type ColumnDef } from '@eocrm/design-system';
import { EmptyState } from '@eocrm/design-system';
import { FileUpload } from '@eocrm/design-system';
import { Pagination } from '@eocrm/design-system';
import { Radio, RadioGroup } from '@eocrm/design-system';
import { toast } from '@eocrm/design-system';
import styles from './ComponentsIndex.module.scss';

type _PreviewRow = { id: string; name: string; stage: string; amount: string };
const _previewCols: ColumnDef<_PreviewRow>[] = [
  { id: 'name', header: 'Deal', cell: (r) => r.name, size: 120 },
  { id: 'stage', header: 'Stage', cell: (r) => r.stage, size: 90 },
  { id: 'amount', header: 'Amount', cell: (r) => r.amount, align: 'end', size: 80 },
];
const _previewData: _PreviewRow[] = [
  { id: '1', name: 'Acme', stage: 'Won', amount: '$12k' },
  { id: '2', name: 'Globex', stage: 'Lead', amount: '$4.5k' },
];
function DataTablePreview() {
  const instance = useDataTable<_PreviewRow>({
    data: _previewData,
    columns: _previewCols,
    getRowId: (r) => r.id,
  });
  return (
    <div style={{ width: 220, pointerEvents: 'none' }}>
      <DataTable instance={instance} aria-label="Preview" />
    </div>
  );
}

const items: { to: string; name: string; description: string; preview: React.ReactNode }[] = [
  {
    to: '/components/accordion',
    name: 'Accordion',
    description: 'Stacked collapsible panels. Single-open or multi-open mode.',
    preview: (
      <div style={{ width: '100%', maxWidth: '260px' }}>
        <Accordion type="single" collapsible defaultValue="a">
          <Accordion.Item value="a">
            <Accordion.Trigger>Section</Accordion.Trigger>
            <Accordion.Content>Body</Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </div>
    ),
  },
  {
    to: '/components/alert',
    name: 'Alert',
    description: 'Persistent in-flow notification with four tones.',
    preview: <Alert tone="info" title="Synced 5 minutes ago" />,
  },
  {
    to: '/components/button',
    name: 'Button',
    description: 'Action triggers with variants and sizes.',
    preview: (
      <Cluster gap="sm" justify="center">
        <Button size="sm">Primary</Button>
        <Button size="sm" variant="secondary">
          Secondary
        </Button>
      </Cluster>
    ),
  },
  {
    to: '/components/button-group',
    name: 'ButtonGroup',
    description:
      'Joined Buttons (toolbar action group) or single-select segmented control with arrow-key navigation.',
    preview: (
      <Cluster gap="sm" justify="center">
        <ButtonGroup aria-label="Preview">
          <Button size="sm" variant="secondary">
            Cut
          </Button>
          <Button size="sm" variant="secondary">
            Copy
          </Button>
          <Button size="sm" variant="secondary">
            Paste
          </Button>
        </ButtonGroup>
      </Cluster>
    ),
  },
  {
    to: '/components/datepickers',
    name: 'Date pickers',
    description:
      'Four variants of the same month grid — DatePicker, DateRangePicker, and inline counterparts.',
    preview: (
      <div style={{ width: 200 }}>
        <DatePicker defaultValue={new Date(2026, 4, 21)} aria-label="Preview" />
      </div>
    ),
  },
  {
    to: '/components/empty-state',
    name: 'EmptyState',
    description:
      'Opinionated "nothing here" container — icon, title, description, actions. Three sizes for inline / card / hero use.',
    preview: (
      <EmptyState
        size="sm"
        icon={<Inbox size={24} />}
        title="No results"
        description="Try clearing filters."
      />
    ),
  },
  {
    to: '/components/file-upload',
    name: 'FileUpload',
    description:
      'Controlled dropzone-style file picker with built-in validation, drag/click both supported, per-row Progress for uploading status.',
    preview: (
      <div style={{ width: '100%', maxWidth: 220 }}>
        <FileUpload
          files={[]}
          onFilesAdded={() => {}}
          onFileRemove={() => {}}
          dropzoneLabel="Drop or click"
        />
      </div>
    ),
  },
  {
    to: '/components/input',
    name: 'Input',
    description: 'Single-line text field with focus + invalid states.',
    preview: (
      <div style={{ width: 200 }}>
        <Input placeholder="Type here…" />
      </div>
    ),
  },
  {
    to: '/components/pagination',
    name: 'Pagination',
    description:
      'Numbered nav with windowing, plus a cursor variant for streams without total. Both controlled, no built-in page size.',
    preview: <Pagination currentPage={3} pageCount={10} onPageChange={() => {}} size="sm" />,
  },
  {
    to: '/components/password-input',
    name: 'PasswordInput',
    description:
      'Password field with eye toggle, opt-in caps-lock + wrong-keyboard-layout warnings.',
    preview: (
      <div style={{ width: 200 }}>
        <PasswordInput defaultValue="hunter2" aria-label="Preview" />
      </div>
    ),
  },
  {
    to: '/components/password-strength-meter',
    name: 'PasswordStrengthMeter',
    description:
      '4-segment strength visualization. Default heuristic for prototypes; pass `score` for production scoring.',
    preview: (
      <div style={{ width: 200 }}>
        <PasswordStrengthMeter value="Hunter2!@#" />
      </div>
    ),
  },
  {
    to: '/components/progress',
    name: 'Progress',
    description:
      'Linear progress bar — determinate via value/max, indeterminate when value is omitted. Sizes / tones / optional label.',
    preview: (
      <Stack gap="xs">
        <Progress value={45} />
        <Progress value={85} tone="warning" />
      </Stack>
    ),
  },
  {
    to: '/components/radio',
    name: 'Radio',
    description:
      'Native-input-backed radio with custom paint, plus a RadioGroup wrapper for fieldset/legend semantics and group state propagation.',
    preview: (
      <RadioGroup name="preview" defaultValue="b">
        <Radio value="a" label="Option A" />
        <Radio value="b" label="Option B" />
      </RadioGroup>
    ),
  },
  {
    to: '/components/select',
    name: 'Select',
    description:
      'Value picker — single, multi (chips and summary), searchable, async, creatable. The generalist.',
    preview: (
      <div style={{ width: 200 }}>
        <Select
          options={[
            { value: 'active', label: 'Active' },
            { value: 'pending', label: 'Pending' },
            { value: 'archived', label: 'Archived' },
          ]}
          placeholder="Pick a status"
        />
      </div>
    ),
  },
  {
    to: '/components/switch',
    name: 'Switch',
    description: 'Binary on/off toggle. Three tones + async loading state.',
    preview: <Switch defaultChecked tone="success" aria-label="Preview" />,
  },
  {
    to: '/components/skeleton',
    name: 'Skeleton',
    description:
      'Placeholder rectangle for loading states. Three variants (text / circular / rectangular), pulse animation respects prefers-reduced-motion.',
    preview: (
      <Stack gap="xs" style={{ width: 200 }}>
        <Skeleton width="80%" />
        <Skeleton width="60%" />
        <Skeleton width="40%" />
      </Stack>
    ),
  },
  {
    to: '/components/slider',
    name: 'Slider',
    description: 'Controlled slider: single-thumb or range (two-thumb), horizontal or vertical. Custom-painted with marks + value bubble.',
    preview: (
      <div style={{ width: '100%', maxWidth: 220 }}>
        <Slider value={42} onChange={() => {}} aria-label="preview" />
      </div>
    ),
  },
  {
    to: '/components/datatable',
    name: 'DataTable',
    description: 'Tabular data with sortable / resizable / reorderable columns and row selection.',
    preview: <DataTablePreview />,
  },
  {
    to: '/components/table',
    name: 'Table',
    description:
      'Tabular data primitive — compound subcomponents over native HTML semantics with density, hover, striped, and sortable-header visuals.',
    preview: (
      <div style={{ width: 220 }}>
        <Table density="dense" scroll={false}>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Name</Table.HeaderCell>
              <Table.HeaderCell align="end">Total</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <Table.Row>
              <Table.Cell>Acme</Table.Cell>
              <Table.Cell align="end">12.5K</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell>Beanstalk</Table.Cell>
              <Table.Cell align="end">4.2K</Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      </div>
    ),
  },
  {
    to: '/components/card',
    name: 'Card',
    description: 'Bordered container that groups related content.',
    preview: (
      <Card padding="md" style={{ width: 160 }}>
        <Stack gap="xs">
          <div className={styles.skeleton} style={{ width: '60%' }} />
          <div className={styles.skeleton} />
          <div className={styles.skeleton} style={{ width: '80%' }} />
        </Stack>
      </Card>
    ),
  },
  {
    to: '/components/checkbox',
    name: 'Checkbox',
    description:
      'Native-input-backed checkbox with custom paint — sizes, indeterminate, label, invalid, full form integration.',
    preview: (
      <Stack gap="xs">
        <Checkbox defaultChecked label="Checked" />
        <Checkbox indeterminate label="Indeterminate" />
        <Checkbox label="Unchecked" />
      </Stack>
    ),
  },
  {
    to: '/components/stack',
    name: 'Stack',
    description: 'Vertical layout with consistent gap.',
    preview: (
      <Stack gap="xs">
        <div className={styles.bar} />
        <div className={styles.bar} />
        <div className={styles.bar} />
      </Stack>
    ),
  },
  {
    to: '/components/cluster',
    name: 'Cluster',
    description: 'Horizontal wrapping layout with gap + alignment.',
    preview: (
      <Cluster gap="xs">
        <div className={styles.tile} />
        <div className={styles.tile} />
        <div className={styles.tile} />
        <div className={styles.tile} />
      </Cluster>
    ),
  },
  {
    to: '/components/code',
    name: 'Code',
    description:
      'Inline <code> chip — monospace text with subtle bg. Use for inline identifiers / snippets.',
    preview: (
      <Cluster gap="sm" justify="center">
        <Code>userId</Code>
        <Code tone="danger">--no-verify</Code>
      </Cluster>
    ),
  },
  {
    to: '/components/divider',
    name: 'Divider',
    description: 'Thin separator. Horizontal/vertical, solid/dashed, optional label.',
    preview: (
      <div style={{ width: '100%', maxWidth: '200px' }}>
        <Divider>OR</Divider>
      </div>
    ),
  },
  {
    to: '/components/grid',
    name: 'Grid',
    description:
      '2D layout primitive with token-driven gap, auto-fit responsive columns, and equal-width fixed columns.',
    preview: (
      <Grid gap="xs">
        <div className={styles.tile} />
        <div className={styles.tile} />
        <div className={styles.tile} />
        <div className={styles.tile} />
      </Grid>
    ),
  },
  {
    to: '/components/avatar',
    name: 'Avatar',
    description: 'Profile circle with image or auto-colored initials.',
    preview: (
      <Cluster gap="sm">
        <Avatar name="Alex Rivera" />
        <Avatar name="Maya Owens" />
        <Avatar name="Sam Chen" />
      </Cluster>
    ),
  },
  {
    to: '/components/badge',
    name: 'Badge',
    description: 'Small status/category pill with semantic tones.',
    preview: (
      <Cluster gap="xs">
        <Badge tone="info">New</Badge>
        <Badge tone="success">Active</Badge>
        <Badge tone="warning">Pending</Badge>
      </Cluster>
    ),
  },
  {
    to: '/components/breadcrumb',
    name: 'Breadcrumb',
    description: 'Navigation trail with auto-current on the last item.',
    preview: (
      <Breadcrumb>
        <Breadcrumb.Item href="#a" onClick={(e) => e.preventDefault()}>
          Workspace
        </Breadcrumb.Item>
        <Breadcrumb.Item href="#b" onClick={(e) => e.preventDefault()}>
          Contacts
        </Breadcrumb.Item>
        <Breadcrumb.Item>Acme</Breadcrumb.Item>
      </Breadcrumb>
    ),
  },
  {
    to: '/components/link',
    name: 'Link',
    description: 'Polymorphic styled anchor with three visual variants.',
    preview: (
      <DSLink href="#" onClick={(e) => e.preventDefault()}>
        View details →
      </DSLink>
    ),
  },
  {
    to: '/components/tabs',
    name: 'Tabs',
    description: 'Horizontal tab strip with optional count chips.',
    preview: (
      <div style={{ width: '100%', maxWidth: 240 }}>
        <Tabs
          items={[
            { id: 'a', label: 'Overview' },
            { id: 'b', label: 'Activity', count: 4 },
          ]}
          activeId="a"
          onChange={() => undefined}
        />
      </div>
    ),
  },
  {
    to: '/components/text',
    name: 'Text',
    description:
      'Body / inline text primitive with size/tone/weight/align/truncate/lineClamp props.',
    preview: (
      <Stack gap="xs" align="center">
        <Text size="sm" tone="muted">
          12 minutes ago
        </Text>
        <Text weight="medium">Acme Inc</Text>
      </Stack>
    ),
  },
  {
    to: '/components/title',
    name: 'Title',
    description: 'Semantic heading primitive — renders h1-h6 from the required `order` prop.',
    preview: (
      <Stack gap="xs" align="center">
        <Title order={3}>Dashboard</Title>
        <Title order={5} tone="muted">
          Subtitle
        </Title>
      </Stack>
    ),
  },
  {
    to: '/components/dropdown-menu',
    name: 'DropdownMenu',
    description: 'Action menu opened from a trigger button. Compound API.',
    preview: (
      <Cluster gap="sm" justify="center">
        <DropdownMenu>
          <DropdownMenu.Trigger>
            <Button size="sm" variant="secondary">
              Actions ▾
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item onSelect={() => {}}>Edit</DropdownMenu.Item>
            <DropdownMenu.Item onSelect={() => {}}>Duplicate</DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </Cluster>
    ),
  },
  {
    to: '/components/textarea',
    name: 'Textarea',
    description: 'Multi-line text with auto-grow + character counter.',
    preview: (
      <Textarea minRows={2} autoGrow={false} defaultValue="Multi-line text…" aria-label="Preview" />
    ),
  },
  {
    to: '/components/toast',
    name: 'Toast',
    description: 'Imperative transient notifications.',
    preview: (
      <Button size="sm" onClick={() => toast.success('Saved')}>
        Fire toast
      </Button>
    ),
  },
  {
    to: '/components/tooltip',
    name: 'Tooltip',
    description: 'Small floating label on hover/focus, with a pointer arrow.',
    preview: (
      <Cluster gap="sm" justify="center">
        <Tooltip content="Save (⌘S)" defaultOpen>
          <Button size="sm" variant="secondary">
            Save
          </Button>
        </Tooltip>
      </Cluster>
    ),
  },
  {
    to: '/components/modal',
    name: 'Modal',
    description: 'Focus-locked dialog with header / body / footer slots and overlay variants.',
    preview: (
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: 180,
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--color-border)',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          >
            Dialog title
          </div>
          <div style={{ padding: '8px 12px', fontSize: '0.7rem', color: 'var(--color-fg-muted)' }}>
            Dialog content goes here.
          </div>
          <div
            style={{
              padding: '8px 12px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 6,
            }}
          >
            <Button size="sm" variant="secondary">
              Cancel
            </Button>
            <Button size="sm">OK</Button>
          </div>
        </div>
      </div>
    ),
  },
  {
    to: '/components/drawer',
    name: 'Drawer',
    description: 'Edge-anchored slide-in panel with drag-to-close on mobile.',
    preview: (
      <div
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'flex-end',
          height: 110,
          pointerEvents: 'none',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--color-bg-overlay)',
            opacity: 0.4,
          }}
        />
        {/* Drawer panel */}
        <div
          style={{
            width: 130,
            borderLeft: '1px solid var(--color-border)',
            background: 'var(--color-bg)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--color-border)',
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          >
            Filters
          </div>
          <div
            style={{
              padding: '8px 12px',
              fontSize: '0.7rem',
              color: 'var(--color-fg-muted)',
              flex: 1,
            }}
          >
            Filter content here.
          </div>
          <div
            style={{
              padding: '8px 12px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 6,
            }}
          >
            <Button size="sm" variant="secondary">
              Cancel
            </Button>
            <Button size="sm">Apply</Button>
          </div>
        </div>
      </div>
    ),
  },
  {
    to: '/components/popover',
    name: 'Popover',
    description: 'Non-modal floating panel for arbitrary small surfaces.',
    preview: (
      <Cluster gap="sm" justify="center">
        <Popover defaultOpen>
          <Popover.Trigger>
            <Button size="sm" variant="secondary">
              Filters
            </Button>
          </Popover.Trigger>
          <Popover.Content>
            <Stack gap="xs">
              <Popover.Heading>Filters</Popover.Heading>
              <div>(controls)</div>
            </Stack>
          </Popover.Content>
        </Popover>
      </Cluster>
    ),
  },
  {
    to: '/components/calendar',
    name: 'Calendar',
    description:
      'Month view with continuous multi-day event bars, overflow chips, and locale-aware weekday grids.',
    preview: (
      <div
        style={{
          width: '100%',
          maxWidth: 220,
          height: 100,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '250%',
            transform: 'scale(0.4)',
            transformOrigin: 'top left',
          }}
        >
          <Calendar defaultValue={new Date(2026, 4, 15)} />
        </div>
      </div>
    ),
  },
  {
    to: '/components/circular-progress',
    name: 'CircularProgress',
    description:
      'Circular progress / loading spinner — donut shape for tracked progress, or spinning arc when value is omitted.',
    preview: (
      <Cluster gap="sm" justify="center">
        <CircularProgress size="sm" />
        <CircularProgress size="md" value={65} label />
      </Cluster>
    ),
  },
  {
    to: '/components/confirmation-popover',
    name: 'ConfirmationPopover',
    description: '"Are you sure?" preset on top of Popover, with async-aware Confirm.',
    preview: (
      <Cluster gap="sm" justify="center">
        <ConfirmationPopover
          defaultOpen
          title="Delete?"
          description="Cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => undefined}
        >
          <Button size="sm" variant="danger">
            Delete
          </Button>
        </ConfirmationPopover>
      </Cluster>
    ),
  },
];

export function ComponentsIndex() {
  return (
    <Stack gap="lg">
      <header>
        <span className={styles.eyebrow}>Components</span>
        <h1 className={styles.title}>Component library</h1>
        <p className={styles.description}>
          Every component shipped with this design system. Each page shows the live component, the
          source of <code>.tsx</code> and <code>.module.scss</code>, and usage snippets you can
          copy.
        </p>
      </header>

      <div className={styles.grid}>
        {items.map((item) => (
          <Link key={item.to} to={item.to} className={styles.card}>
            <div className={styles.cardPreview}>{item.preview}</div>
            <div className={styles.cardBody}>
              <div className={styles.cardHeader}>
                <span className={styles.cardName}>{item.name}</span>
                <ArrowRight size={14} className={styles.cardArrow} />
              </div>
              <p className={styles.cardDescription}>{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </Stack>
  );
}
