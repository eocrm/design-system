import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Home, Inbox, Settings as SettingsIcon, Users } from 'lucide-react';
import { Accordion } from '@eocrm/design-system';
import { Alert } from '@eocrm/design-system';
import { Avatar } from '@eocrm/design-system';
import { Badge } from '@eocrm/design-system';
import { Dot } from '@eocrm/design-system';
import { BrandIcon } from '@eocrm/design-system';
import { Logo } from '@eocrm/design-system';
import eocrmLogo from '../../assets/eocrm-logo.svg';
import { Breadcrumb } from '@eocrm/design-system';
import { Link as DSLink } from '@eocrm/design-system';
import { LinkCard } from '@eocrm/design-system';
import { Button } from '@eocrm/design-system';
import { SocialButton } from '@eocrm/design-system';
import { ButtonGroup } from '@eocrm/design-system';
import { Card } from '@eocrm/design-system';
import { CircularProgress } from '@eocrm/design-system';
import { Progress } from '@eocrm/design-system';
import { Code } from '@eocrm/design-system';
import { RichText, createBlock } from '@eocrm/design-system';
import { RichTextEditor, docFromText } from '@eocrm/design-system';
import { Text } from '@eocrm/design-system';
import { Title } from '@eocrm/design-system';
import { Checkbox } from '@eocrm/design-system';
import { ColorPicker } from '@eocrm/design-system';
import { Cluster } from '@eocrm/design-system';
import { Constrain } from '@eocrm/design-system';
import { Indent } from '@eocrm/design-system';
import { Divider } from '@eocrm/design-system';
import { Grid } from '@eocrm/design-system';
import { Split } from '@eocrm/design-system';
import { Sticky } from '@eocrm/design-system';
import { Masonry } from '@eocrm/design-system';
import { Field } from '@eocrm/design-system';
import { FormRow } from '@eocrm/design-system';
import { FormSection } from '@eocrm/design-system';
import { Input } from '@eocrm/design-system';
import { LiquidEditor } from '@eocrm/design-system';
import { Kbd } from '@eocrm/design-system';
import { PasswordInput } from '@eocrm/design-system';
import { PasswordStrengthMeter } from '@eocrm/design-system';
import { PhoneInput } from '@eocrm/design-system';
import { Select } from '@eocrm/design-system';
import { Skeleton } from '@eocrm/design-system';
import { Slider } from '@eocrm/design-system';
import { Kanban } from '@eocrm/design-system';
import { Rail } from '@eocrm/design-system';
import { TopBar } from '@eocrm/design-system';
import { Sortable } from '@eocrm/design-system';
import { Stack } from '@eocrm/design-system';
import { Switch } from '@eocrm/design-system';
import { Table } from '@eocrm/design-system';
import { Tabs } from '@eocrm/design-system';
import { Textarea } from '@eocrm/design-system';
import { TimeField } from '@eocrm/design-system';
import { DropdownMenu } from '@eocrm/design-system';
import { Tooltip } from '@eocrm/design-system';
import { Calendar } from '@eocrm/design-system';
import { DatePicker } from '@eocrm/design-system';
import { ConfirmationPopover, Popover } from '@eocrm/design-system';
import { DataTable, useDataTable, type ColumnDef } from '@eocrm/design-system';
import { DefinitionList } from '@eocrm/design-system';
import { EmptyState } from '@eocrm/design-system';
import { ErrorState } from '@eocrm/design-system';
import { Screen } from '@eocrm/design-system';
import { Compass } from 'lucide-react';
import { FileUpload } from '@eocrm/design-system';
import { FilterChip } from '@eocrm/design-system';
import { IconTile } from '@eocrm/design-system';
import { Shapes } from 'lucide-react';
import { Image } from '@eocrm/design-system';
import { MediaTile } from '@eocrm/design-system';
import { ImageCrop } from '@eocrm/design-system';
import { OptionsPicker } from '@eocrm/design-system';
import { PALETTE_COLORS, paletteTokens } from '@eocrm/design-system';
import { Pagination } from '@eocrm/design-system';
import { PersonDisplay } from '@eocrm/design-system';
import { Radio, RadioGroup } from '@eocrm/design-system';
import { Page } from '@eocrm/design-system';
import { PageHeader } from '@eocrm/design-system';
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
    to: '/components/social-button',
    name: 'SocialButton',
    description: 'Provider sign-in button — brand mark + label.',
    preview: <SocialButton provider="google" label="Continue with Google" />,
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
    to: '/components/error-state',
    name: 'ErrorState',
    description: 'Page-level 404 / error status block — icon, title, actions, error ID.',
    preview: (
      <div style={{ width: '100%', maxWidth: '260px' }}>
        <ErrorState
          size="sm"
          icon={<Compass size={24} aria-hidden="true" />}
          title="Page not found"
        />
      </div>
    ),
  },
  {
    to: '/components/screen',
    name: 'Screen',
    description: 'Full-bleed / centered screen layout for auth, 404, and error pages.',
    preview: (
      <div style={{ width: '100%', maxWidth: '260px', height: '96px' }}>
        <Screen fill="block" backdrop="accent">
          <Text size="sm" tone="muted">
            Full-bleed screen
          </Text>
        </Screen>
      </div>
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
    to: '/components/image-crop',
    name: 'ImageCrop',
    description:
      'Controlled image-crop primitive on <canvas>. Pattern-A drag (centered box, draggable image, slider-controlled zoom). Top-level extractCropBlob utility for the Save handler.',
    preview: (
      <div
        style={{
          width: '100%',
          maxWidth: 220,
          height: 120,
          overflow: 'hidden',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <ImageCrop
          src="https://picsum.photos/seed/eocrm-card/400/300"
          value={{ x: 50, y: 25, width: 200, height: 200 }}
          onChange={() => {}}
          aspectRatio={1}
          showZoomControl={false}
          style={{ pointerEvents: 'none' }}
        />
      </div>
    ),
  },
  {
    to: '/components/icon-tile',
    name: 'IconTile',
    description: 'Decorative tile framing an icon, tinted by a Palette color.',
    preview: (
      <Cluster gap="sm">
        <IconTile color="blue" icon={<Shapes size={16} />} />
        <IconTile color="amber" shape="circle" icon={<Shapes size={16} />} />
        <IconTile color="green" icon={<Shapes size={16} />} />
      </Cluster>
    ),
  },
  {
    to: '/components/image',
    name: 'Image',
    description:
      'Remote image with Skeleton loading state, fade-in on load, and an accessible broken-image placeholder with retry.',
    preview: (
      <div style={{ maxWidth: 220, width: '100%' }}>
        <Image
          src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&q=80"
          alt=""
          aspectRatio="16 / 9"
        />
      </div>
    ),
  },
  {
    to: '/components/media-tile',
    name: 'MediaTile',
    description: 'Media tile — image/icon body with hover-revealed name/size + controls bars.',
    preview: (
      <div style={{ width: '100%', maxWidth: 140 }}>
        <MediaTile
          revealOn="visible"
          media={
            <Image
              src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=200&q=60"
              alt=""
              aspectRatio={1}
              objectFit="cover"
            />
          }
          title="lake.jpg"
          meta="2.4 MB"
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
    to: '/components/liquid-editor',
    name: 'LiquidEditor',
    description: 'Liquid template editor with highlighting, autocomplete, and a preview pane.',
    preview: (
      <LiquidEditor
        value="{{ first_name }}"
        onChange={() => {}}
        showToolbar={false}
        showLineNumbers={false}
        minRows={1}
      />
    ),
  },
  {
    to: '/components/kbd',
    name: 'Kbd',
    description:
      'Inline keyboard-shortcut chip: one <kbd> per key joined by a faint + separator. Two sizes (sm matches TopBar, md for command palettes).',
    preview: (
      <Cluster gap="sm" justify="center">
        <Kbd keys={['⌘', 'K']} />
        <Kbd keys={['Ctrl', 'Shift', 'P']} size="md" />
      </Cluster>
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
    to: '/components/palette',
    name: 'Palette',
    description: '30 categorical bg + fg color pairs for consumer-defined domain → color mappings.',
    preview: (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gap: 2,
          width: '100%',
        }}
        aria-hidden
      >
        {PALETTE_COLORS.map((color) => {
          const { bg } = paletteTokens(color);
          return (
            <div
              key={color}
              style={{
                background: bg,
                aspectRatio: '1 / 1',
                borderRadius: 2,
              }}
            />
          );
        })}
      </div>
    ),
  },
  {
    to: '/components/person-display',
    name: 'PersonDisplay',
    description:
      'Avatar + name (+ optional description lines). Three sizes drive Avatar + Text scales.',
    preview: (
      <PersonDisplay size="md">
        <PersonDisplay.Avatar name="Sarah Chen" />
        <PersonDisplay.Name>Sarah Chen</PersonDisplay.Name>
        <PersonDisplay.Description>sarah@acme.com</PersonDisplay.Description>
      </PersonDisplay>
    ),
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
    to: '/components/phone-input',
    name: 'PhoneInput',
    description: 'International phone field — country picker + national number, emitting E.164.',
    preview: (
      <div style={{ width: 240 }}>
        <PhoneInput value="+12025550123" onChange={() => {}} aria-label="Preview" />
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
    description:
      'Controlled slider: single-thumb or range (two-thumb), horizontal or vertical. Custom-painted with marks + value bubble.',
    preview: (
      <div style={{ width: '100%', maxWidth: 220 }}>
        <Slider value={42} onChange={() => {}} aria-label="preview" />
      </div>
    ),
  },
  {
    to: '/components/kanban',
    name: 'Kanban',
    description: 'Multi-column board with live cross-column drag.',
    preview: (
      <div style={{ width: '100%', maxWidth: 220, pointerEvents: 'none' }}>
        <Kanban>
          <Kanban.Column id="a">
            <Kanban.Card id="card-a">
              <Card padding="sm">A</Card>
            </Kanban.Card>
          </Kanban.Column>
          <Kanban.Column id="b">
            <Kanban.Card id="card-b">
              <Card padding="sm">B</Card>
            </Kanban.Card>
          </Kanban.Column>
        </Kanban>
      </div>
    ),
  },
  {
    to: '/components/sortable',
    name: 'Sortable',
    description: 'Drag-to-reorder list with optional keyboard handle.',
    preview: (
      <div style={{ width: '100%', maxWidth: 220, pointerEvents: 'none' }}>
        <Sortable onReorder={() => {}}>
          <Sortable.Item id="a">
            <Card padding="sm">First</Card>
          </Sortable.Item>
          <Sortable.Item id="b">
            <Card padding="sm">Second</Card>
          </Sortable.Item>
        </Sortable>
      </div>
    ),
  },
  {
    to: '/components/sortable-group',
    name: 'SortableGroup',
    description:
      'Drag items between multiple sortable lists (cross-container), with a live handoff.',
    preview: (
      <div style={{ width: '100%', maxWidth: 220, pointerEvents: 'none', display: 'flex', gap: 8 }}>
        <Card padding="sm" style={{ flex: 1 }}>
          <Stack gap="xs">
            <Text size="sm">First</Text>
            <Text size="sm">Second</Text>
          </Stack>
        </Card>
        <Card padding="sm" style={{ flex: 1 }}>
          <Stack gap="xs">
            <Text size="sm">Third</Text>
          </Stack>
        </Card>
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
    to: '/components/definition-list',
    name: 'DefinitionList',
    description: 'Semantic key/value pairs with optional icon on the value.',
    preview: (
      <DefinitionList>
        <DefinitionList.Item>
          <DefinitionList.Term>Email</DefinitionList.Term>
          <DefinitionList.Description>ada@example.com</DefinitionList.Description>
        </DefinitionList.Item>
        <DefinitionList.Item>
          <DefinitionList.Term>Phone</DefinitionList.Term>
          <DefinitionList.Description>+1 (415) 555-0142</DefinitionList.Description>
        </DefinitionList.Item>
      </DefinitionList>
    ),
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
    to: '/components/field',
    name: 'Field',
    description: 'Labeled-control unit — label, help, error, required, a11y wiring.',
    preview: (
      <Field label="Email" description="We only use this for sign-in.">
        <Input placeholder="you@company.com" />
      </Field>
    ),
  },
  {
    to: '/components/form-row',
    name: 'FormRow',
    description: 'Fields side by side; reflows to stacked when narrow.',
    preview: (
      <FormRow>
        <Field label="First">
          <Input placeholder="Ada" />
        </Field>
        <Field label="Last">
          <Input placeholder="Lovelace" />
        </Field>
      </FormRow>
    ),
  },
  {
    to: '/components/form-section',
    name: 'FormSection',
    description: 'Titled group of fields with heading + description.',
    preview: (
      <FormSection title="Profile" description="Public details">
        <Field label="Name">
          <Input placeholder="Ada Lovelace" />
        </Field>
      </FormSection>
    ),
  },
  {
    to: '/components/color-picker',
    name: 'ColorPicker',
    description:
      'Controlled HEX color picker with two shapes — popover trigger for form fields and an inline <ColorPicker.Panel> for theme builders. SV square + hue slider + HEX input + optional presets.',
    preview: (
      <div
        style={{
          width: '100%',
          maxWidth: 220,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <ColorPicker.Panel
          value="#4F46E5"
          onChange={() => {}}
          presets={['#4F46E5', '#10B981', '#F59E0B', '#EF4444']}
        />
      </div>
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
    to: '/components/app-layout',
    name: 'AppLayout',
    description: 'Viewport-filling app shell — topBar + sidebar + content.',
    preview: (
      <Stack gap="xs">
        <div className={styles.bar} />
        <Cluster gap="xs" wrap={false}>
          <div className={styles.tile} />
          <Stack gap="xs">
            <div className={styles.bar} />
            <div className={styles.bar} />
          </Stack>
        </Cluster>
      </Stack>
    ),
  },
  {
    to: '/components/constrain',
    name: 'Constrain',
    description: 'Width / flex constraint — cap a width or fill a flex row.',
    preview: (
      <Stack gap="xs">
        <Constrain maxWidth="xs">
          <div className={styles.bar} />
        </Constrain>
        <Constrain maxWidth="sm">
          <div className={styles.bar} />
        </Constrain>
      </Stack>
    ),
  },
  {
    to: '/components/indent',
    name: 'Indent',
    description:
      'Indent nested content by level × gutter — token-based, RTL-aware. For tree/thread depth.',
    preview: (
      <Stack gap="xs">
        <Indent level={0}>
          <div className={styles.bar} />
        </Indent>
        <Indent level={1}>
          <div className={styles.bar} />
        </Indent>
        <Indent level={2}>
          <div className={styles.bar} />
        </Indent>
      </Stack>
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
    to: '/components/split',
    name: 'Split',
    description:
      'Master–detail layout: an intrinsic-width aside beside a filling main pane (CSS grid auto 1fr). For a vertical Tabs rail + detail panel.',
    preview: (
      <div style={{ width: '100%', maxWidth: 220 }}>
        <Split gap="sm" aside={<div className={styles.tile} style={{ width: 28 }} />}>
          <div className={styles.tile} style={{ width: '100%' }} />
        </Split>
      </div>
    ),
  },
  {
    to: '/components/sticky',
    name: 'Sticky',
    description:
      'Pins its box to the top of the scroll container while the page scrolls — for a record-detail sidebar that stays in view.',
    preview: (
      <div
        style={{
          width: '100%',
          maxWidth: 220,
          maxHeight: 88,
          overflowY: 'auto',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          padding: 6,
        }}
      >
        <Split
          gap="sm"
          side="end"
          asideWidth="56px"
          align="stretch"
          aside={
            <Sticky top="none">
              <div className={styles.tile} style={{ height: 22 }} />
            </Sticky>
          }
        >
          <div style={{ display: 'grid', gap: 4 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={styles.tile} style={{ height: 16, width: '100%' }} />
            ))}
          </div>
        </Split>
      </div>
    ),
  },
  {
    to: '/components/masonry',
    name: 'Masonry',
    description: 'Height-balanced columns for variable-height items.',
    preview: (
      <div style={{ width: '100%', maxWidth: '260px' }}>
        <Masonry columns={3} gap="sm">
          {[40, 64, 28, 52, 36, 48].map((h, i) => (
            <div
              key={i}
              style={{
                height: h,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-accent-subtle-bg)',
              }}
            />
          ))}
        </Masonry>
      </div>
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
    to: '/components/dot',
    name: 'Dot',
    description: 'Bare palette/tone colored circle for color-coding affordances.',
    preview: (
      <Cluster gap="sm" align="center">
        <Dot color="violet" />
        <Dot color="teal" />
        <Dot tone="success" />
        <Dot tone="danger" />
      </Cluster>
    ),
  },
  {
    to: '/components/rich-text',
    name: 'RichText',
    description: 'Read-only renderer for the in-house rich-text model.',
    preview: (
      <RichText
        value={{
          blocks: [
            createBlock('heading', 'Notes', { level: 3, id: 'pi-h' }),
            createBlock('bullet_item', 'Rich content', { id: 'pi-l' }),
          ],
        }}
      />
    ),
  },
  {
    to: '/components/rich-text-editor',
    name: 'RichTextEditor',
    description: 'Controlled contentEditable rich-text editor over the in-house engine.',
    preview: (
      <RichTextEditor value={docFromText('Editable rich text')} onChange={() => {}} readOnly />
    ),
  },
  {
    to: '/components/brand-icon',
    name: 'BrandIcon',
    description: 'Full-color brand marks (Google, Yandex) for SSO buttons.',
    preview: (
      <Cluster gap="md" justify="center">
        <BrandIcon name="google" size={28} />
        <BrandIcon name="yandex" size={28} />
      </Cluster>
    ),
  },
  {
    to: '/components/logo',
    name: 'Logo',
    description: 'The eocrm brand logo — mark + optional wordmark.',
    preview: <Logo src={eocrmLogo} text="eocrm" size="md" />,
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
    to: '/components/link-card',
    name: 'LinkCard',
    description: 'A clickable Card — the whole surface navigates or acts.',
    preview: (
      <div style={{ width: '100%', maxWidth: '220px' }}>
        <LinkCard as="div" padding="sm">
          <Text size="sm" weight="semibold">
            Dashboard
          </Text>
        </LinkCard>
      </div>
    ),
  },
  {
    to: '/components/rail',
    name: 'Rail',
    description:
      'Collapsible left-side nav with sections, items, groups, and hover-popover for collapsed groups.',
    preview: (
      <div style={{ width: 240, height: 180, overflow: 'hidden', pointerEvents: 'none' }}>
        <Rail>
          <Rail.Section title="Main">
            <Rail.Item icon={<Home size={14} />} href="#">
              Dashboard
            </Rail.Item>
            <Rail.Item icon={<Users size={14} />} href="#" aria-current="page">
              Contacts
            </Rail.Item>
            <Rail.Item icon={<SettingsIcon size={14} />} href="#">
              Settings
            </Rail.Item>
          </Rail.Section>
        </Rail>
      </div>
    ),
  },
  {
    to: '/components/topbar',
    name: 'TopBar',
    description:
      'Sticky application top-bar primitive. Compound API with Start/End clusters, a styled Search input, and an IconButton with optional notification dot.',
    preview: (
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          height: 80,
          overflow: 'hidden',
          pointerEvents: 'none',
          borderRadius: 'var(--radius-md)',
          border: 'var(--border-width) solid var(--color-border)',
        }}
      >
        <TopBar>
          <TopBar.Start>
            <TopBar.Search placeholder="Search…" hotkey={['⌘', 'K']} />
          </TopBar.Start>
          <TopBar.End>
            <TopBar.IconButton aria-label="Notifications" indicator>
              <Bell size={14} />
            </TopBar.IconButton>
          </TopBar.End>
        </TopBar>
      </div>
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
    to: '/components/timefield',
    name: 'TimeField',
    description:
      'Standalone time-of-day input — text + popover with hour / minute (+ AM/PM in 12h locales) lists and a Now button. Powers the picker family when granularity="minute".',
    preview: (
      <div style={{ width: 140 }}>
        <TimeField value={{ hours: 9, minutes: 30 }} onChange={() => {}} aria-label="Preview" />
      </div>
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
    to: '/components/lightbox',
    name: 'Lightbox',
    description: 'Full-screen image gallery overlay — large image, prev/next, thumbnails, caption.',
    preview: (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4,
          width: '100%',
          maxWidth: 120,
        }}
      >
        <Image
          src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=120&q=60"
          alt=""
          size="md"
          objectFit="cover"
        />
        <Image
          src="https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=120&q=60"
          alt=""
          size="md"
          objectFit="cover"
        />
      </div>
    ),
  },
  {
    to: '/components/filter-chip',
    name: 'FilterChip',
    description:
      'Dismissible "active filter" pill — Label + tone-dotted Value + auto-rendered × dismiss button.',
    preview: (
      <div style={{ pointerEvents: 'none' }}>
        <FilterChip onDismiss={() => {}}>
          <FilterChip.Label>Event</FilterChip.Label>
          <FilterChip.Value tone="info">auth.*</FilterChip.Value>
        </FilterChip>
      </div>
    ),
  },
  {
    to: '/components/options-picker',
    name: 'OptionsPicker',
    description:
      'Filter-picker UX: popover with search, optional grouping, multi/single select, draft-then-Apply commit.',
    preview: (
      <div style={{ pointerEvents: 'none' }}>
        <OptionsPicker
          selected={['lead', 'won']}
          onApply={() => {}}
          open={false}
          onOpenChange={() => {}}
        >
          <OptionsPicker.Trigger>
            <Button size="sm" variant="secondary">
              Stage (2) ▾
            </Button>
          </OptionsPicker.Trigger>
          <OptionsPicker.Content
            label="Filter stage"
            options={[
              { value: 'lead', label: 'Lead' },
              { value: 'won', label: 'Won' },
            ]}
          />
        </OptionsPicker>
      </div>
    ),
  },
  {
    to: '/components/page',
    name: 'Page',
    description:
      'Page-root layout primitive. Wraps top-level sections with the canonical CRM rhythm (gap="lg").',
    preview: (
      <Page>
        <Card padding="sm">
          <Text size="sm">Header</Text>
        </Card>
        <Card padding="sm">
          <Text size="sm">Body</Text>
        </Card>
      </Page>
    ),
  },
  {
    to: '/components/page-header',
    name: 'PageHeader',
    description:
      'Compound layout primitive for top-of-page headers. Breadcrumb + BackButton + Aside (Avatar) + Title + Subtitle + Meta + Actions.',
    preview: (
      <div style={{ width: '100%', pointerEvents: 'none' }}>
        <PageHeader borderBottom={false}>
          <PageHeader.Title order={2}>Acme Corp</PageHeader.Title>
          <PageHeader.Subtitle>230 employees</PageHeader.Subtitle>
          <PageHeader.Actions>
            <Button size="sm" variant="secondary">
              Edit
            </Button>
          </PageHeader.Actions>
        </PageHeader>
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
